import os
import torch
import json
import re
import uuid
import base64
import io
from PIL import Image
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from transformers import AutoProcessor, AutoModelForImageTextToText, BitsAndBytesConfig

# =====================================================================
# Global AI Engine State
# =====================================================================
# We store the model and processor globally so they only load ONCE at startup.
ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event to load the MedGemma model into VRAM when the server boots.
    This prevents the model from reloading on every single API request.
    """
    print("[-] Booting MedGemma AI Engine... Please wait.")
    
    # Hardware Optimization for RTX 3050 (4GB VRAM) or similar
    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4"
    )
    model_id = "google/medgemma-1.5-4b-it"

    # Load Processor and Model
    processor = AutoProcessor.from_pretrained(model_id)
    model = AutoModelForImageTextToText.from_pretrained(
        model_id, 
        quantization_config=quantization_config, 
        device_map="cuda"
    )
    
    # Store in global dictionary
    ml_models["processor"] = processor
    ml_models["model"] = model
    
    print("[-] MedGemma AI Ready. Server is now accepting multimodal requests.")
    yield
    
    # Cleanup on shutdown
    ml_models.clear()
    print("[-] Server shutting down. AI models cleared from memory.")

# Initialize FastAPI with the lifespan context manager
app = FastAPI(title="Healthbox Medical AI API (Multimodal MedGemma Edition)", lifespan=lifespan)

# Enable CORS to allow external connections (like Ngrok and your React app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# Helper Function: Base64 to Image
# =====================================================================
def decode_base64_image(base64_string: str) -> Image.Image:
    """Decodes a base64 string (with or without data URI prefix) into a PIL Image."""
    if "," in base64_string:
        # Strip the prefix like "data:image/jpeg;base64,"
        base64_string = base64_string.split(",")[1]
    
    image_data = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_data))
    return image.convert("RGB") # Ensure it's in RGB format for the model

# =====================================================================
# 1. INPUT SCHEMAS (Matches your updated JSON exactly)
# =====================================================================
class Vitals(BaseModel):
    body_temperature: str
    heart_rate: str
    spo2: str
    blood_pressure: str

class PatientProfile(BaseModel):
    gender: str
    age: str
    vitals: Vitals

class MedicalBackground(BaseModel):
    pre_existing_conditions: List[str]
    current_medications: str
    known_allergies: str

class LifestyleEnvironment(BaseModel):
    social_habits: List[str]
    recent_travel: str
    drinking_water_source: str

class SymptomChronology(BaseModel):
    onset: str
    location: str
    quality: str
    aggravating_alleviating: str
    severity_scale: int

class UploadsScans(BaseModel):
    # These fields expect Base64 encoded strings of the images
    photo: Optional[str] = Field(None, description="Base64 encoded string of the disease photo")
    reports: Optional[str] = Field(None, description="Base64 encoded string of previous reports")

class ComprehensiveIntake(BaseModel):
    patient_profile: PatientProfile
    medical_background: MedicalBackground
    lifestyle_environment: LifestyleEnvironment
    symptom_chronology: SymptomChronology
    associated_symptoms: List[str]
    free_form_transcript: str
    uploads_scans: Optional[UploadsScans] = None

# =====================================================================
# 2. OUTPUT SCHEMA (Matches your requested structured Triage Report)
# =====================================================================
class TriageReport(BaseModel):
    report_id: str
    emergency_level: str
    primary_diagnosis: str
    confidence_percentage: str
    condition_stage: str
    clinical_evidence: List[str]
    approved_protocols: List[str]
    contraindicated_actions: List[str]
    precautions: List[str]


# =====================================================================
# 3. PREDICT ROUTE (Processing One Request at a Time via MedGemma)
# =====================================================================
@app.post("/predict", response_model=TriageReport)
async def analyze_patient_health(intake: ComprehensiveIntake):
    try:
        # 1. Retrieve the pre-loaded AI models
        processor = ml_models.get("processor")
        model = ml_models.get("model")
        
        if not processor or not model:
            raise HTTPException(status_code=503, detail="AI Engine is still booting. Try again in a moment.")

        # 2. Extract Data (Omit the massive base64 strings from the JSON context to save tokens)
        # We make a copy of the dict to drop the base64 strings before dumping to JSON
        intake_dict = intake.model_dump()
        if 'uploads_scans' in intake_dict:
            del intake_dict['uploads_scans']
            
        intake_json = json.dumps(intake_dict, indent=2)
        report_uuid = f"HB-2026-{uuid.uuid4().hex[:4].upper()}"

        # 3. Build a strict JSON-enforced prompt for MedGemma
        clinical_prompt = f"""
        You are an advanced clinical triage engine. Analyze this patient intake data (and attached images if any) and generate a professional clinical summary report.
        
        Patient Data:
        {intake_json}
        
        Task: Generate a strictly formatted JSON object based on the patient data and visual evidence. DO NOT write any other text, warnings, or conversational filler.
        
        The JSON object MUST match this exact schema:
        {{
          "report_id": "{report_uuid}",
          "emergency_level": "low/moderate/high/critical",
          "primary_diagnosis": "Disease Name",
          "confidence_percentage": "XX%",
          "condition_stage": "Acute/Chronic/etc",
          "clinical_evidence": ["evidence 1", "evidence 2"],
          "approved_protocols": ["protocol 1", "protocol 2"],
          "contraindicated_actions": ["action 1", "action 2"],
          "precautions": ["precaution 1", "precaution 2"]
        }}
        """

        # 4. Handle Multimodal Input (Images)
        message_content = []
        pil_images = []

        if intake.uploads_scans:
            if intake.uploads_scans.photo:
                try:
                    pil_images.append(decode_base64_image(intake.uploads_scans.photo))
                    message_content.append({"type": "image"})
                except Exception as e:
                    print(f"Failed to decode photo: {e}")
            if intake.uploads_scans.reports:
                try:
                    pil_images.append(decode_base64_image(intake.uploads_scans.reports))
                    message_content.append({"type": "image"})
                except Exception as e:
                    print(f"Failed to decode report: {e}")

        # Always append the text prompt at the end of the content array
        message_content.append({"type": "text", "text": clinical_prompt})
        messages = [{"role": "user", "content": message_content}]

        # 5. Format for MedGemma and map to GPU
        formatted_prompt = processor.apply_chat_template(messages, add_generation_prompt=True)
        
        if pil_images:
            # Send both text and images to the model
            inputs = processor(text=formatted_prompt, images=pil_images, return_tensors="pt").to("cuda")
        else:
            # Fallback for text-only processing
            inputs = processor(text=formatted_prompt, return_tensors="pt").to("cuda")

        # 6. Generate Inference
        with torch.no_grad():
            outputs = model.generate(
                **inputs, 
                max_new_tokens=1024,
                do_sample=False,
                use_cache=True
            )
        
        # 7. Decode and isolate the AI's response
        generated_ids = outputs[0][inputs["input_ids"].shape[-1]:]
        ai_response_raw = processor.decode(generated_ids, skip_special_tokens=True).strip()

        # 8. Safely extract JSON (Handles cases where MedGemma wraps output in ```json ... ```)
        json_match = re.search(r'\{.*\}', ai_response_raw, re.DOTALL)
        if not json_match:
            raise ValueError(f"Could not extract JSON from model output. Raw output: {ai_response_raw[:100]}...")
        
        clean_json_str = json_match.group(0)
        parsed_data = json.loads(clean_json_str)

        # 9. Return data packaged neatly into the Pydantic model
        return TriageReport(**parsed_data)

    except json.JSONDecodeError as e:
        print(f"Failed to parse MedGemma JSON: {e}")
        raise HTTPException(status_code=500, detail="AI returned invalid JSON formatting. Please try again.")
    except Exception as e:
        print(f"Error during AI processing: {e}")
        raise HTTPException(status_code=500, detail=f"MedGemma Inference Error: {str(e)}")

"""------------------------------------------------------------------------------------------------------------------------------"""

import os
import torch
import json
import re
import uuid
import base64
import io
import pypdf
from PIL import Image
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from transformers import AutoProcessor, AutoModelForImageTextToText, BitsAndBytesConfig
import google.generativeai as genai

# =====================================================================
# Global AI Engine State & Configurations
# =====================================================================
# 1. Configure Gemini (Used for fast PDF Report Extraction)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_API_KEY_HERE")
genai.configure(api_key=GEMINI_API_KEY)

# 2. Store Local MedGemma Models globally
ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event to load the local MedGemma model into VRAM when the server boots."""
    print("[-] Booting MedGemma AI Engine... Please wait.")
    
    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4"
    )
    model_id = "google/medgemma-1.5-4b-it"

    processor = AutoProcessor.from_pretrained(model_id)
    model = AutoModelForImageTextToText.from_pretrained(
        model_id, 
        quantization_config=quantization_config, 
        device_map="cuda"
    )
    
    ml_models["processor"] = processor
    ml_models["model"] = model
    
    print("[-] MedGemma AI Ready. Server is now accepting multimodal requests.")
    yield
    ml_models.clear()
    print("[-] Server shutting down. AI models cleared from memory.")

app = FastAPI(title="Healthbox Medical AI API (Dual-Model Edition)", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# Helper Functions: Base64 Decoders (Image & PDF)
# =====================================================================
def decode_base64_image(base64_string: str) -> Image.Image:
    """Decodes a base64 string into a PIL Image for MedGemma."""
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    image_data = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_data))
    return image.convert("RGB") 

def extract_text_from_base64_pdf(base64_string: str) -> str:
    """Decodes a base64 PDF and extracts its text for Gemini to read."""
    try:
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
        pdf_data = base64.b64decode(base64_string)
        
        # Check if the decoded file is actually a PDF
        if not pdf_data.startswith(b'%PDF'):
            return ""
            
        pdf_file = io.BytesIO(pdf_data)
        reader = pypdf.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text.strip()
    except Exception as e:
        print(f"Failed to extract PDF text: {e}")
        return ""

# =====================================================================
# 1. INPUT & OUTPUT SCHEMAS
# =====================================================================
class Vitals(BaseModel):
    body_temperature: str
    heart_rate: str
    spo2: str
    blood_pressure: str

class PatientProfile(BaseModel):
    gender: str
    age: str
    vitals: Vitals

class MedicalBackground(BaseModel):
    pre_existing_conditions: List[str]
    current_medications: str
    known_allergies: str

class LifestyleEnvironment(BaseModel):
    social_habits: List[str]
    recent_travel: str
    drinking_water_source: str

class SymptomChronology(BaseModel):
    onset: str
    location: str
    quality: str
    aggravating_alleviating: str
    severity_scale: int

class UploadsScans(BaseModel):
    photo: Optional[str] = Field(None, description="Base64 encoded string of the disease photo")
    reports: Optional[str] = Field(None, description="Base64 encoded string of previous reports (PDF or Image)")

class ComprehensiveIntake(BaseModel):
    patient_profile: PatientProfile
    medical_background: MedicalBackground
    lifestyle_environment: LifestyleEnvironment
    symptom_chronology: SymptomChronology
    associated_symptoms: List[str]
    free_form_transcript: str
    uploads_scans: Optional[UploadsScans] = None

class TriageReport(BaseModel):
    report_id: str
    emergency_level: str
    primary_diagnosis: str
    confidence_percentage: str
    condition_stage: str
    clinical_evidence: List[str]
    approved_protocols: List[str]
    contraindicated_actions: List[str]
    precautions: List[str]

# Schema used to force Gemini to decide if a disease is actually in the PDF
class GeminiExtractionResult(BaseModel):
    disease_found_in_report: bool
    extracted_triage_report: Optional[TriageReport] = None

# =====================================================================
# CORE LOGIC: MedGemma Inference Engine
# =====================================================================
async def run_medgemma_inference(intake: ComprehensiveIntake) -> TriageReport:
    """Runs the robust multimodal MedGemma engine on patient data and images."""
    processor = ml_models.get("processor")
    model = ml_models.get("model")
    
    if not processor or not model:
        raise HTTPException(status_code=503, detail="AI Engine is booting.")

    intake_dict = intake.model_dump()
    if 'uploads_scans' in intake_dict:
        del intake_dict['uploads_scans']
        
    intake_json = json.dumps(intake_dict, indent=2)
    report_uuid = f"HB-2026-{uuid.uuid4().hex[:4].upper()}"

    clinical_prompt = f"""
    You are an advanced clinical triage engine. Analyze this patient intake data (and attached images if any) and generate a professional clinical summary report.
    
    Patient Data:
    {intake_json}
    
    Task: Generate a strictly formatted JSON object based on the patient data and visual evidence. DO NOT write any other text.
    
    The JSON object MUST match this exact schema:
    {{
      "report_id": "{report_uuid}",
      "emergency_level": "low/moderate/high/critical",
      "primary_diagnosis": "Disease Name",
      "confidence_percentage": "XX%",
      "condition_stage": "Acute/Chronic/etc",
      "clinical_evidence": ["evidence 1", "evidence 2"],
      "approved_protocols": ["protocol 1", "protocol 2"],
      "contraindicated_actions": ["action 1", "action 2"],
      "precautions": ["precaution 1", "precaution 2"]
    }}
    """

    message_content = []
    pil_images = []

    if intake.uploads_scans:
        if intake.uploads_scans.photo:
            try:
                pil_images.append(decode_base64_image(intake.uploads_scans.photo))
                message_content.append({"type": "image"})
            except: pass
        if intake.uploads_scans.reports: # If PDF extraction failed, we still try to pass it to MedGemma as an image
            try:
                pil_images.append(decode_base64_image(intake.uploads_scans.reports))
                message_content.append({"type": "image"})
            except: pass

    message_content.append({"type": "text", "text": clinical_prompt})
    messages = [{"role": "user", "content": message_content}]

    formatted_prompt = processor.apply_chat_template(messages, add_generation_prompt=True)
    
    if pil_images:
        inputs = processor(text=formatted_prompt, images=pil_images, return_tensors="pt").to("cuda")
    else:
        inputs = processor(text=formatted_prompt, return_tensors="pt").to("cuda")

    with torch.no_grad():
        outputs = model.generate(**inputs, max_new_tokens=1024, do_sample=False, use_cache=True)
    
    generated_ids = outputs[0][inputs["input_ids"].shape[-1]:]
    ai_response_raw = processor.decode(generated_ids, skip_special_tokens=True).strip()

    json_match = re.search(r'\{.*\}', ai_response_raw, re.DOTALL)
    if not json_match:
        raise ValueError("Could not extract JSON from model output.")
    
    return TriageReport(**json.loads(json_match.group(0)))


# =====================================================================
# ROUTES
# =====================================================================

@app.post("/predict", response_model=TriageReport)
async def analyze_patient_health(intake: ComprehensiveIntake):
    """Standard endpoint: Forwards directly to MedGemma."""
    try:
        return await run_medgemma_inference(intake)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict_with_report", response_model=TriageReport)
async def analyze_with_hospital_report(intake: ComprehensiveIntake):
    """
    Intelligent routing endpoint: 
    Attempts to rapidly extract diagnosis from a PDF report using Gemini. 
    If no diagnosis is present, falls back to MedGemma.
    """
    report_text = ""
    
    # 1. Check if a report exists and attempt to read it as a PDF
    if intake.uploads_scans and intake.uploads_scans.reports:
        report_text = extract_text_from_base64_pdf(intake.uploads_scans.reports)

    # 2. If PDF Text was found, ask Gemini to parse it
    if report_text:
        try:
            intake_dict = intake.model_dump()
            if 'uploads_scans' in intake_dict:
                del intake_dict['uploads_scans']
                
            report_uuid = f"HB-2026-{uuid.uuid4().hex[:4].upper()}"
            prompt = f"""
            You are a clinical report analyzer. Read the patient intake data and the extracted text from their hospital PDF report.
            
            INTAKE DATA: {json.dumps(intake_dict, indent=2)}
            
            HOSPITAL REPORT TEXT:
            {report_text}
            
            Task: Does the Hospital Report Text contain a clear, definitive primary diagnosis?
            If YES: Set 'disease_found_in_report' to true, and generate the 'extracted_triage_report' matching the schema. Set report_id to '{report_uuid}'.
            If NO: Set 'disease_found_in_report' to false, and leave 'extracted_triage_report' null.
            """

            gemini_model = genai.GenerativeModel('gemini-1.5-flash')
            response = gemini_model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=GeminiExtractionResult
                )
            )
            
            result_dict = json.loads(response.text)
            
            # If Gemini successfully pulled a disease from the PDF, return it immediately!
            if result_dict.get("disease_found_in_report") and result_dict.get("extracted_triage_report"):
                print("[-] Gemini successfully extracted diagnosis from PDF. Bypassing MedGemma.")
                return TriageReport(**result_dict["extracted_triage_report"])
            else:
                print("[-] No clear diagnosis in PDF. Falling back to MedGemma.")
                
        except Exception as e:
            print(f"[-] Gemini PDF extraction failed or timed out: {e}. Falling back to MedGemma.")

    # 3. Fallback: If no PDF was attached, or the PDF had no disease, process normally via MedGemma
    try:
        print("[-] Running MedGemma Inference engine...")
        return await run_medgemma_inference(intake)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))