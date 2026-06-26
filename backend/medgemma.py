import os
import torch
import json
import re
import uuid
import base64
import io
import time
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
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    image_data = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_data))
    return image.convert("RGB") 

def extract_text_from_base64_pdf(base64_string: str) -> str:
    try:
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
        pdf_data = base64.b64decode(base64_string)
        
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

    report_uuid = f"HB-2026-{uuid.uuid4().hex[:4].upper()}"

    # FIX 1: FAST DATA INGESTION (Mimicking your old working code!)
    # Convert the massive nested JSON structure into a tight, token-efficient string.
    compressed_patient_data = (
        f"Patient is a {intake.patient_profile.age} yr old {intake.patient_profile.gender}. "
        f"Vitals: Temp {intake.patient_profile.vitals.body_temperature}, HR {intake.patient_profile.vitals.heart_rate}, "
        f"SpO2 {intake.patient_profile.vitals.spo2}, BP {intake.patient_profile.vitals.blood_pressure}. "
        f"History: {', '.join(intake.medical_background.pre_existing_conditions)}. "
        f"Meds: {intake.medical_background.current_medications}. Allergies: {intake.medical_background.known_allergies}. "
        f"Symptoms: {intake.symptom_chronology.onset} {intake.symptom_chronology.location} {intake.symptom_chronology.quality}. "
        f"Severity: {intake.symptom_chronology.severity_scale}/10. "
        f"Additional Notes: {intake.free_form_transcript}"
    )

    # Clean, direct instruction format
    clinical_prompt = f"""You are a clinical triage engine. Analyze this patient data and output ONLY a strict JSON object. No explanations.
    
    PATIENT DATA:
    {compressed_patient_data}
    
    REQUIRED JSON SCHEMA:
    {{
      "report_id": "{report_uuid}",
      "emergency_level": "low/moderate/high/critical",
      "primary_diagnosis": "Disease Name",
      "confidence_percentage": "XX%",
      "condition_stage": "Acute/Chronic",
      "clinical_evidence": ["evidence 1", "evidence 2"],
      "approved_protocols": ["protocol 1"],
      "contraindicated_actions": ["action 1"],
      "precautions": ["precaution 1"]
    }}
    """

    message_content = []
    pil_images = []

    # Handle Multimodal Uploads Safely
    if intake.uploads_scans:
        if intake.uploads_scans.photo:
            try:
                pil_images.append(decode_base64_image(intake.uploads_scans.photo))
                message_content.append({"type": "image"})
            except Exception as e: print(f"Photo decode skipped: {e}")
        if intake.uploads_scans.reports: 
            try:
                pil_images.append(decode_base64_image(intake.uploads_scans.reports))
                message_content.append({"type": "image"})
            except Exception as e: print(f"Report image decode skipped: {e}")

    message_content.append({"type": "text", "text": clinical_prompt})
    messages = [{"role": "user", "content": message_content}]

    formatted_prompt = processor.apply_chat_template(messages, add_generation_prompt=True)
    
    if pil_images:
        inputs = processor(text=formatted_prompt, images=pil_images, return_tensors="pt").to("cuda")
    else:
        inputs = processor(text=formatted_prompt, return_tensors="pt").to("cuda")

    print("[-] Generating Health Output...")
    start_time = time.time()

    # FIX 2: Restored efficient inference parameters
    with torch.no_grad():
        outputs = model.generate(
            **inputs, 
            max_new_tokens=512, # Enough for JSON, small enough to prevent OOM
            do_sample=False, 
            use_cache=True
        )
    
    inference_time = time.time() - start_time
    print(f"[-] Inference Complete in {inference_time:.2f} seconds.")

    generated_ids = outputs[0][inputs["input_ids"].shape[-1]:]
    ai_response_raw = processor.decode(generated_ids, skip_special_tokens=True).strip()

    # FIX 3: Robust JSON Extraction (strips markdown code blocks commonly generated by AI)
    cleaned_response = ai_response_raw.replace("```json", "").replace("```", "").strip()
    json_match = re.search(r'\{.*\}', cleaned_response, re.DOTALL)
    
    if not json_match:
        print(f"Raw Output Failure: {ai_response_raw}")
        raise ValueError("AI failed to format output as JSON.")
    
    try:
        parsed_data = json.loads(json_match.group(0))
        # Ensure report_id matches the one we generated
        parsed_data["report_id"] = report_uuid
        return TriageReport(**parsed_data)
    except Exception as e:
        print(f"JSON Parsing Error: {e}")
        raise ValueError("AI generated malformed JSON.")


# =====================================================================
# ROUTES
# =====================================================================

@app.post("/predict", response_model=TriageReport)
async def analyze_patient_health(intake: ComprehensiveIntake):
    try:
        return await run_medgemma_inference(intake)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict_with_report", response_model=TriageReport)
async def analyze_with_hospital_report(intake: ComprehensiveIntake):
    report_text = ""
    
    if intake.uploads_scans and intake.uploads_scans.reports:
        report_text = extract_text_from_base64_pdf(intake.uploads_scans.reports)

    if report_text:
        try:
            intake_dict = intake.model_dump()
            if 'uploads_scans' in intake_dict:
                del intake_dict['uploads_scans']
                
            report_uuid = f"HB-2026-{uuid.uuid4().hex[:4].upper()}"
            prompt = f"""You are a clinical report analyzer.
            INTAKE DATA: {json.dumps(intake_dict)}
            HOSPITAL REPORT TEXT: {report_text}
            
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
            
            if result_dict.get("disease_found_in_report") and result_dict.get("extracted_triage_report"):
                print("[-] Gemini successfully extracted diagnosis from PDF. Bypassing MedGemma.")
                return TriageReport(**result_dict["extracted_triage_report"])
            else:
                print("[-] No clear diagnosis in PDF. Falling back to MedGemma.")
                
        except Exception as e:
            print(f"[-] Gemini PDF extraction failed: {e}. Falling back to MedGemma.")

    try:
        print("[-] Running MedGemma Inference engine...")
        return await run_medgemma_inference(intake)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))