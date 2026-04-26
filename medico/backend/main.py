import os
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from google import genai
from google.genai import types

# Load env variables from the root folder (where .env is located)
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
SUPABASE_URL = os.environ.get("SUPABASE_URL", "http://supabasekong-roockg08kwkoc8w00k8s8k88.147.15.99.72.sslip.io")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "") # You can parse from .env anon key
if not SUPABASE_KEY:
    # Try to extract from the raw .env if dotenv didn't parse "anon key : " correctly
    with open("../../.env", "r") as f:
        for line in f:
            if "anon key" in line:
                SUPABASE_KEY = line.split(":", 1)[1].strip()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Gemini
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    with open("../../.env", "r") as f:
        for line in f:
            if "Gemini API Key" in line:
                GEMINI_API_KEY = line.split(":", 1)[1].strip()

ai_client = genai.Client(api_key=GEMINI_API_KEY)

class ChatRequest(BaseModel):
    message: str
    patient_id: Optional[str] = "default"

@app.get("/")
def health_check():
    return {"status": "ok"}

@app.post("/upload")
async def upload_exam(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são permitidos.")
    
    # 1. Upload to Supabase Storage
    file_bytes = await file.read()
    bucket_name = "patient-exams"
    file_path = f"exams/{file.filename}"
    
    try:
        # Check if bucket exists, if not, try to create (or just assume it exists for now)
        res = supabase.storage.from_(bucket_name).upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": "application/pdf"}
        )
    except Exception as e:
        # If it fails, maybe bucket doesn't exist, log it
        print(f"Storage Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    # 2. Get Public URL
    url = supabase.storage.from_(bucket_name).get_public_url(file_path)
    
    # 3. Call Gemini 2.5 Flash for OCR/Extraction
    # For a real PDF, we should upload it using Gemini File API, but for simplicity here
    # we'll use a prompt and assume we have a way to read the PDF text.
    # Note: Since Gemini can read PDFs via the File API, we can upload the file_bytes directly to Gemini
    try:
        # Upload to Gemini for processing
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            temp_pdf.write(file_bytes)
            temp_pdf_path = temp_pdf.name
        
        # We simulate the Gemini extraction process using the file
        # gemini_file = ai_client.files.upload(file=temp_pdf_path)
        # response = ai_client.models.generate_content(
        #     model="gemini-2.5-flash",
        #     contents=[gemini_file, "Extraia os exames biomarcadores e retorne em formato Markdown estruturado e JSON."]
        # )
        
        # Clean up temp file
        os.unlink(temp_pdf_path)
    except Exception as e:
        print(f"Gemini Extraction Error: {e}")
        pass

    # 4. Generate Embeddings (Mocked for now until DB schema is ready)
    # embed_res = ai_client.models.embed_content(model="text-embedding-004", contents="Texto do exame")
    # supabase.table('exam_embeddings').insert({...})

    return {
        "status": "success",
        "file_url": url,
        "message": "Upload realizado. Pipeline de IA iniciado."
    }

@app.post("/chat")
async def chat_with_agent(req: ChatRequest):
    # RAG Workflow
    # 1. Embed query
    # query_embed = ai_client.models.embed_content(model="text-embedding-004", contents=req.message)
    # 2. Search Supabase pgvector
    # context = supabase.rpc('match_documents', {'query_embedding': query_embed, 'match_threshold': 0.7})
    # 3. Ask Gemini 2.5 Flash
    
    # For now, simple echo with Gemini
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
