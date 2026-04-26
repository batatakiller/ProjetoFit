import os
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from google import genai
from google.genai import types

# Load env variables (useful for local dev)
if os.path.exists("../../.env"):
    load_dotenv(dotenv_path="../../.env")

app = FastAPI(title="Medical AI Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    # Fallback to hardcoded values from your .env for safety if env not loaded
    SUPABASE_URL = "http://supabasekong-roockg08kwkoc8w00k8s8k88.147.15.99.72.sslip.io"
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

if not SUPABASE_KEY:
    print("Warning: SUPABASE_KEY not found in environment")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# Initialize Gemini
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
ai_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

class ChatRequest(BaseModel):
    message: str
    patient_id: Optional[str] = "default"

@app.get("/")
def health_check():
    return {
        "status": "ok", 
        "supabase_connected": supabase is not None,
        "gemini_connected": ai_client is not None
    }

@app.post("/upload")
async def upload_exam(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são permitidos.")
    
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    # 1. Upload to Supabase Storage
    file_bytes = await file.read()
    bucket_name = "patient-exams"
    file_path = f"exams/{file.filename}"
    
    try:
        supabase.storage.from_(bucket_name).upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": "application/pdf"}
        )
    except Exception as e:
        print(f"Storage Error: {e}")
        # Try to continue even if upload fails (might already exist)
    
    # 2. Get Public URL
    url = supabase.storage.from_(bucket_name).get_public_url(file_path)
    
    return {
        "status": "success",
        "file_url": url,
        "message": "Upload realizado (Simulado)."
    }

@app.post("/chat")
async def chat_with_agent(req: ChatRequest):
    if not ai_client:
        return {"response": "Erro: Gemini API Key não configurada no servidor."}

    try:
        response = ai_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=req.message
        )
        answer = response.text
    except Exception as e:
        answer = f"Error calling Gemini: {e}"

    return {"response": answer}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
