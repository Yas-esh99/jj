import os
from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai

from app.config import get_settings

router = APIRouter(prefix="/chat", tags=["chat"])

class Message(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    messages: List[Message]

class ChatResponse(BaseModel):
    reply: str

SYSTEM_PROMPT = """You are the Health Assistant for the Biothon application, a helpful and friendly chatbot designed for rural areas.
Your duties:
1. Provide basic healthcare advice, guidance, and symptom interpretations.
2. Guide users on using the Biothon app (finding pharmacies, navigating to nearby hospitals, booking health camps, scanning Ayushman cards for government schemes, and using the AI diagnostic tool).
3. Speak concisely and use simple language.
4. Disclaimer: You are an AI, not a doctor. Always recommend consulting a local doctor or emergency services for severe cases.
"""

@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    settings = get_settings()
    api_key = settings.gemini_api_key
    if not api_key:
        raise HTTPException(status_code=500, detail="gemini_api_key is not set in Settings/.env file.")
    genai.configure(api_key=api_key)
    
    try:
        # gemini-2.5-flash is fast and perfect for basic chat responses
        model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=SYSTEM_PROMPT)
        
        history = []
        # Exclude the last message, as it is the current prompt
        for msg in request.messages[:-1]:
            # map frontend 'bot'/'user' to gemini 'model'/'user'
            role = "model" if msg.role == "bot" else "user"
            history.append({"role": role, "parts": [msg.text]})
            
        chat_session = model.start_chat(history=history)
        
        last_msg = request.messages[-1].text
        response = chat_session.send_message(last_msg)
        
        return ChatResponse(reply=response.text)
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
