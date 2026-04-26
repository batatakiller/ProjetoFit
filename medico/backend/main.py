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

class Biomarker(BaseModel):
    name: str
    value: float
    unit: str
    category: str
    collection_date: str # YYYY-MM-DD

class ExamExtraction(BaseModel):
    summary: str
    clean_text: str # For RAG
    biomarkers: List[Biomarker]

@app.post("/upload")
async def upload_exam(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são permitidos.")
    
    if not supabase or not ai_client:
        raise HTTPException(status_code=500, detail="Supabase ou Gemini não configurados.")

    file_bytes = await file.read()
    bucket_name = "patient-exams"
    file_path = f"exams/{file.filename}"
    
    # 1. Upload to Supabase Storage
    try:
        supabase.storage.from_(bucket_name).upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": "application/pdf"}
        )
    except Exception as e:
        print(f"Storage Error (might already exist): {e}")
    
    url = supabase.storage.from_(bucket_name).get_public_url(file_path)
    
    # 2. Get or create a default patient
    patients_res = supabase.table("patients").select("id").limit(1).execute()
    if not patients_res.data:
        new_patient = supabase.table("patients").insert({"name": "Paciente Teste", "email": "teste@exemplo.com"}).execute()
        patient_id = new_patient.data[0]["id"]
    else:
        patient_id = patients_res.data[0]["id"]

    # --- VERIFICAÇÃO DE DUPLICIDADE ---
    existing_exam = supabase.table("exams").select("id").eq("file_path", file_path).eq("patient_id", patient_id).execute()
    if existing_exam.data:
        return {
            "status": "warning",
            "file_url": url,
            "message": "Este exame já foi processado anteriormente. Duplicidade evitada."
        }
    # -------------------------------    # 3. Use Gemini to extract data
    prompt = """
    Você é um assistente médico especialista em análise laboratorial com precisão cirúrgica em extração de dados.
    Analise o laudo PDF em anexo e extraia TODOS os dados disponíveis.
    
    1. Um resumo geral das condições do paciente (summary).
    2. O texto completo do exame de forma limpa, adequado para busca vetorial (clean_text).
    3. Uma lista EXAUSTIVA de TODOS os biomarcadores encontrados. 
    
    ⚠️ REGRAS CRÍTICAS DE DATA:
    - Verifique a data de cada página e de cada seção. 
    - Se o arquivo contiver exames de datas diferentes (evolução histórica), você DEVE extrair a data correta para cada medição.
    - O campo `collection_date` deve ser a data em que o sangue/amostra foi coletado (YYYY-MM-DD).
    - Não use a data de hoje. Se não houver data, tente inferir do contexto ou use a data de emissão do laudo.
    
    Para cada biomarcador:
       - name: Nome exato (ex: "Ferro Sérico")
       - value: Valor numérico (float)
       - unit: Unidade (ex: "µg/dL")
       - category: hormonal, bioquimica, vitaminas, hemograma ou outros.
       - collection_date: Data específica daquela medição (YYYY-MM-DD).
    """
    
    try:
        response = ai_client.models.generate_content(
            model='gemini-2.0-flash',
            contents=[
                types.Part.from_bytes(data=file_bytes, mime_type='application/pdf'),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ExamExtraction,
                temperature=0.1
            ),
        )
        extraction: ExamExtraction = response.parsed
    except Exception as e:
        print(f"Gemini Extraction Error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro na extração com Gemini: {str(e)}")

    # 4. Save to Database
    # Insert Exam
    exam_res = supabase.table("exams").insert({
        "patient_id": patient_id,
        "file_path": file_path,
        "status": "completed",
        "summary": extraction.summary
    }).execute()
    exam_id = exam_res.data[0]["id"]

    # Insert Biomarkers with Deduplication Check
    if extraction.biomarkers:
        new_biomarkers = []
        for b in extraction.biomarkers:
            # Verificar se já existe um biomarcador idêntico para este paciente
            existing = supabase.table("biomarkers").select("id").match({
                "patient_id": patient_id,
                "name": b.name,
                "value": b.value,
                "unit": b.unit,
                "collection_date": b.collection_date
            }).execute()
            
            if not existing.data:
                new_biomarkers.append({
                    "exam_id": exam_id,
                    "patient_id": patient_id,
                    "name": b.name,
                    "value": b.value,
                    "unit": b.unit,
                    "category": b.category,
                    "collection_date": b.collection_date
                })
        
        if new_biomarkers:
            supabase.table("biomarkers").insert(new_biomarkers).execute()

    # 5. Generate and save Embedding for RAG
    try:
        embed_res = ai_client.models.embed_content(
            model='models/gemini-embedding-2',
            contents=extraction.clean_text
        )
        embedding = embed_res.embeddings[0].values
        
        supabase.table("exam_embeddings").insert({
            "exam_id": exam_id,
            "content": extraction.clean_text,
            "embedding": embedding,
            "metadata": {"source": file.filename}
        }).execute()
    except Exception as e:
        print(f"Embedding error: {e}")

    return {
        "status": "success",
        "file_url": url,
        "message": f"Upload processado com sucesso. {len(extraction.biomarkers)} biomarcadores encontrados."
    }

@app.get("/biomarkers")
def get_biomarkers(patient_id: Optional[str] = None):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    try:
        # Se não enviou patient_id, pegar o primeiro (default)
        if not patient_id:
            patients_res = supabase.table("patients").select("id").limit(1).execute()
            if not patients_res.data:
                return {"data": []}
            patient_id = patients_res.data[0]["id"]
            
        res = supabase.table("biomarkers").select("*").eq("patient_id", patient_id).execute()
        return {"data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_agent(req: ChatRequest):
    if not ai_client or not supabase:
        return {"response": "Erro: Gemini API Key ou Supabase não configurados."}

    try:
        # 1. Embed the user's query
        embed_res = ai_client.models.embed_content(
            model='models/gemini-embedding-2',
            contents=req.message
        )
        query_embedding = embed_res.embeddings[0].values

        # 2. Search for similar exam context in Supabase
        # Call the RPC function we created: match_exams
        match_response = supabase.rpc(
            'match_exams',
            {
                'query_embedding': query_embedding,
                'match_threshold': 0.5, # adjust as needed
                'match_count': 3
            }
        ).execute()

        context_texts = []
        if match_response.data:
            for match in match_response.data:
                context_texts.append(match.get('content', ''))

        context_block = "\n\n---\n\n".join(context_texts)

        # 3. Build the prompt with context
        system_prompt = """
        Você é o assistente virtual do ProjetoFit, especialista em saúde e análises laboratoriais.
        Use os trechos de laudos médicos fornecidos abaixo como contexto para responder à pergunta do paciente.
        Se a resposta não estiver no contexto, diga que não tem informações suficientes no laudo atual, 
        mas você pode dar explicações gerais se for seguro. Sempre recomende que o paciente consulte um médico.
        """

        full_prompt = f"{system_prompt}\n\nCONTEXTO DOS LAUDOS:\n{context_block}\n\nPERGUNTA DO PACIENTE:\n{req.message}"

        # 4. Generate answer
        response = ai_client.models.generate_content(
            model='gemini-flash-latest',
            contents=full_prompt,
            config=types.GenerateContentConfig(
                temperature=0.4
            )
        )
        answer = response.text

    except Exception as e:
        answer = f"Error processing chat: {e}"

    return {"response": answer}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
