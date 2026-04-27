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

# Import routers after app initialization to avoid circular dependencies if routers import from main
import routers.medications as medications
import routers.trainer as trainer

app.include_router(medications.router)
app.include_router(trainer.router)

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
    collection_date: str             # YYYY-MM-DD
    parent_name: Optional[str] = None  # Ex: "Hemograma", "Coagulograma"
    sub_category: Optional[str] = None # Ex: "Série Vermelha", "Série Branca"
    raw_value: Optional[str] = None    # Valor textual original (ex: "< 0,20")
    is_abnormal: bool = False          # True se o laudo marcar como fora do normal
    tuss_code: Optional[str] = None
    sip_group: Optional[str] = None
    observations: Optional[str] = None

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
    # 3. Use Gemini to extract data
    prompt = """
    Você é um Especialista em Extração de Dados Clínicos e Estruturação de Dados para banco de dados.

    Analise o PDF em anexo e retorne:
    1. `summary`: Resumo clínico geral do paciente.
    2. `clean_text`: Texto completo limpo do laudo, para busca vetorial.
    3. `biomarkers`: Lista estruturada dos exames conforme regras abaixo.

    ═══════════════════════════════════════════════
    REGRAS OBRIGATÓRIAS DE EXTRAÇÃO:
    ═══════════════════════════════════════════════

    📅 DATA DE COLETA:
    - Identifique a data principal de coleta do laudo (campo "Data de Coleta" ou equivalente).
    - Use essa data para TODOS os biomarcadores (formato YYYY-MM-DD).
    - NÃO use a data de hoje. NÃO invente datas.

    🎯 FOCO NO RESULTADO ATUAL APENAS:
    - Capture SOMENTE o valor da coluna "Resultado" do exame atual.
    - IGNORE completamente seções de "Histórico", "Evolução" ou tabelas com datas anteriores.
    - IGNORE "Valores de Referência", faixas normais e comentários interpretativos.
    - IGNORE gráficos de evolução.

    ✅ NUNCA IGNORE — MARCADORES OBRIGATÓRIOS:
    Estes marcadores são OBRIGATÓRIOS e devem ser sempre extraídos, mesmo que pareçam estar em seções secundárias do laudo:
    - "Resultado HBA1C" e "Glicose Média Estimada" (sub-itens de Hemoglobina Glicada)
    - "DHT - Dihidrotestosterona"
    - "Estradiol"
    - "PSA Total", "PSA Livre" e "Relação PSA Livre/Total" → sempre com `parent_name = "PSA Livre / Total"`
    - "Vitamina C"
    - "Índice de Saturação da Transferrina"
    - "Ácido Fólico"
    - Todos os sub-itens de exames compostos (Hemograma, Coagulograma, Colesterol e Frações)

    🔬 CAMPOS POR BIOMARCADOR:
    - `name`: Nome exato do exame (ex: "Ferro Sérico", "Hemoglobina").
    - `value`: Valor numérico do resultado atual (float). Extraia apenas os números, mesmo que o laudo contenha prefixos como "<", ">", "Superior a" ou "Inferior a". (Ex: "Superior a 24,80" vira 24.80). Se for puramente textual sem números (ex: "Negativo"), use 0.0.
    - `unit`: Unidade de medida (ex: "µg/dL", "g/dL").
    - `category`: Uma das opções: hormonal | bioquimica | vitaminas | hemograma | coagulacao | outros.
    - `collection_date`: Data de coleta do laudo (YYYY-MM-DD).
    - `parent_name`: Grupo pai, quando o exame é sub-item (ex: "Hemograma", "Coagulograma", "Colesterol Total e Frações"). Null se for exame independente.
    - `sub_category`: Sub-grupo dentro do pai (ex: "Série Vermelha", "Série Branca"). Null se não se aplicar.
    - `raw_value`: Valor textual original se não for puramente numérico (ex: "< 0,20", "Negativo", "158.000"). Null se o valor já é numérico simples.
    - `is_abnormal`: true se o laudo marcar explicitamente o resultado como Alto, Baixo, Alterado ou fora da referência (⚠️). false caso contrário.

    🧪 NORMALIZAÇÃO PADRÃO (TABELA MESTRA/TUSS):
    Siga RIGOROSAMENTE os nomes abaixo para evitar duplicidade:
    - "Hemoglobina glicada (Fração A1c)" (Use este para HbA1c)
    - "Antígeno específico prostático total (PSA)"
    - "Antígeno específico prostático livre (PSA livre)"
    - "Dehidrotestosterona (DHT)"
    - "Somatomedina C (IGF1)"
    - "Folículo estimulante, hormônio (FSH)"
    - "Hormônio luteinizante (LH)"
    - "Testosterona total" e "Testosterona livre"
    - "Estradiol" e "Prolactina"
    - "Ferritina" e "Transferrina"
    - "Ácido fólico" e "Vitamina B12"
    - "Vitamina D-25 Hidroxi"
    - "Insulina" e "Glicose"
    
    ✅ AGRUPAMENTO DE EXAMES COMPOSTOS:
    - "PSA Livre / Total": Agrupe "Antígeno específico prostático total (PSA)", "Antígeno específico prostático livre (PSA livre)" e a "Relação" sob este `parent_name`.
    - "Hemoglobina Glicada (HbA1c)": Agrupe "Hemoglobina glicada (Fração A1c)" e "Glicose Média Estimada" sob este `parent_name`.
    - "Hemograma": Divida em "Série Vermelha", "Série Branca" e "Plaquetas" conforme sub_category.
    - "Colesterol Total e Frações": Agrupe "Colesterol Total", "HDL", "LDL", "VLDL" e "Triglicérides" sob este `parent_name`.
    - "Função Hepática": Agrupe "TGO (AST)", "TGP (ALT)", "Gama GT", "Fosfatase Alcalina" sob este `parent_name`.
    - "Função Renal": Agrupe "Creatinina", "Ureia", "TFG (CKD-EPI)" sob este `parent_name`.
    - "Bilirrubina Total e Frações": Agrupe "Bilirrubina Total", "Direta" e "Indireta" sob este `parent_name`.
    - "Tireoide": Agrupe "TSH", "T3 Total", "T3 Livre", "T4 Total", "T4 Livre" e Anticorpos (Anti-TPO, etc) sob este `parent_name`.
    - "Função Pancreática": Agrupe "Amilase Total", "Lipase" sob este `parent_name`.

    ✅ NUNCA IGNORE — MARCADORES OBRIGATÓRIOS:
    Estes marcadores são OBRIGATÓRIOS e devem ser sempre extraídos:
    - HbA1c e Glicose Média
    - DHT, Estradiol, Testosterona (Total/Livre), Prolactina
    - PSA (Total/Livre) e Relação
    - Vitamina C, Vitamina D, Vitamina B12, Ácido Fólico
    - Ferritina, Ferro Sérico, Transferrina, IST
    - Todos os sub-itens do Hemograma e Perfil Lipídico

    🩸 REGRA ESPECIAL — HEMOGRAMA:
    - Divida obrigatoriamente em dois grupos:
      * Série Vermelha: Eritrócitos, Hemoglobina, Hematócrito, VCM, HCM, CHCM, RDW → `parent_name = "Hemograma"`, `sub_category = "Série Vermelha"`
      * Série Branca: Leucócitos, Neutrófilos, Segmentados, Bastonetes, Linfócitos, Monócitos, Eosinófilos, Basófilos → `parent_name = "Hemograma"`, `sub_category = "Série Branca"`
    - Plaquetas e VPM: `parent_name = "Hemograma"`, `sub_category = "Plaquetas"`
    """
    
    try:
        response = ai_client.models.generate_content(
            model='gemini-2.5-flash-lite',
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
        
        def force_canonical_name(name: str):
            n = name.lower()
            if 'tsh' in n or 'tireoestimulante' in n: return "TSH", "Tireoide"
            if 't4 livre' in n or 'tiroxina livre' in n: return "T4 Livre", "Tireoide"
            if 't4 total' in n or 'tiroxina total' in n: return "T4 Total", "Tireoide"
            if 't3 livre' in n: return "T3 Livre", "Tireoide"
            if 't3' in n or 'triiodotironina' in n: return "T3", "Tireoide"
            if 'dhea' in n or 'dehidroepiandrosterona' in n: return "DHEA", None
            if 'dht' in n or 'dihidrotestosterona' in n or 'dehidrotestosterona' in n: return "DHT", None
            if 'fsh' in n or 'folículo estimulante' in n or 'foliculo estimulante' in n: return "FSH", None
            if 'lh' in n or 'luteinizante' in n: return "LH", None
            if 'shbg' in n or 'globulina ligadora' in n or 'globulina de ligação' in n: return "SHBG", None
            if 'cortisol' in n: return "Cortisol", None
            if 'insulina livre' in n: return "Insulina Livre", None
            if 'insulina' in n: return "Insulina", None
            if 'gama gt' in n or 'glutamil transferase' in n: return "Gama GT", "Função Hepática"
            if 'tgo' in n or 'oxalacética' in n or 'aspartato' in n: return "TGO (AST)", "Função Hepática"
            if 'tgp' in n or 'pirúvica' in n or 'alanina' in n: return "TGP (ALT)", "Função Hepática"
            if 'proteína c reativa' in n or 'proteina c reativa' in n: return "Proteína C Reativa", None
            if 'ácido fólico' in n or 'acido folico' in n: return "Ácido Fólico", None
            if 'vitamina b12' in n: return "Vitamina B12", None
            if 'vitamina d' in n: return "Vitamina D", None
            if 'vitamina c' in n or 'ácido ascórbico' in n or 'acido ascorbico' in n: return "Vitamina C", None
            if 'hba1c' in n or 'glicada' in n or 'fração a1c' in n: return "Hemoglobina Glicada (HbA1c)", "Glicemia e Insulina"
            if 'glicose média' in n or 'glicose media' in n: return "Glicose Média Estimada", "Glicemia e Insulina"
            if 'glicose' in n and 'média' not in n and 'media' not in n: return "Glicose", "Glicemia e Insulina"
            if 'estrona' in n: return "Estrona", None
            if 'estradiol' in n: return "Estradiol", None
            if 'prolactina' in n: return "Prolactina", None
            if 'progesterona' in n: return "Progesterona", None
            if 'testosterona livre' in n: return "Testosterona Livre", None
            if 'testosterona total' in n: return "Testosterona Total", None
            if 'zinco' in n: return "Zinco", None
            if 'magnésio' in n or 'magnesio' in n: return "Magnésio", None
            if 'cálcio iônico' in n or 'cálcio lônico' in n or 'calcio ionico' in n: return "Cálcio Iônico", None
            if 'cálcio' in n or 'calcio' in n: return "Cálcio", None
            if 'sódio' in n or 'sodio' in n: return "Sódio", None
            if 'potássio' in n or 'potassio' in n: return "Potássio", None
            if 'ferro' in n: return "Ferro", None
            if 'ferritina' in n: return "Ferritina", None
            if 'homocisteína' in n or 'homocistina' in n or 'homocisteina' in n: return "Homocisteína", None
            if 'psa livre' in n: return "PSA Livre", "PSA Livre / Total"
            if 'psa total' in n: return "PSA Total", "PSA Livre / Total"
            if 'relação psa' in n or 'relacao psa' in n: return "Relação PSA Livre/Total", "PSA Livre / Total"
            if 'ureia' in n or 'uréia' in n: return "Ureia", "Função Renal"
            if 'creatinina' in n and 'clearance' not in n: return "Creatinina", "Função Renal"
            if 'taxa de filtração' in n or 'taxa de filtracao' in n or 'filtração glomerular' in n: return "Taxa de Filtração Glomerular", "Função Renal"
            if 'ck' in n or 'fosfoquinase' in n: return "CK (Creatina Fosfoquinase)", None
            if 'colesterol total' in n: return "Colesterol Total", "Colesterol Total e Frações"
            if 'hdl' in n: return "Colesterol HDL", "Colesterol Total e Frações"
            if 'ldl' in n: return "Colesterol LDL", "Colesterol Total e Frações"
            if 'vldl' in n: return "Colesterol VLDL", "Colesterol Total e Frações"
            if 'triglicérides' in n or 'triglicerideos' in n or 'triglicerídeos' in n: return "Triglicérides", "Colesterol Total e Frações"
            if 'ttpa' in n or 'tromboplastina' in n: return "TTPA", "Coagulograma"
            if 'tap' in n or 'atividade da protrombina' in n: return "TAP", "Coagulograma"
            if 'tempo de sangramento' in n: return "Tempo de Sangramento", "Coagulograma"
            if 'albumina' in n: return "Albumina", None
            return None, None

        for b in extraction.biomarkers:
            # --- TABELA MESTRA DE INTERCEPTAÇÃO ---
            canonical_name, canonical_group = force_canonical_name(b.name)
            if canonical_name:
                b.name = canonical_name
            if canonical_group:
                b.parent_name = canonical_group

            # --- NORMALIZAÇÃO VETORIAL (TUSS) ---
            try:
                # 1. Gerar embedding do nome extraído
                emb_res = ai_client.models.embed_content(
                    model='models/gemini-embedding-001',
                    contents=[b.name]
                )
                query_vector = emb_res.embeddings[0].values
                
                # 2. Buscar no catálogo via RPC (Similaridade Vetorial)
                catalog_match = supabase.rpc("match_exams", {
                    "query_embedding": query_vector,
                    "match_threshold": 0.5, # 50% de similaridade (menos rigoroso para capturar sinônimos)
                    "match_count": 1
                }).execute()
                
                if catalog_match.data:
                    match = catalog_match.data[0]
                    # REMOVIDO: b.name = match["name"] -> Mantém o nome limpo extraído pelo Gemini!
                    b.tuss_code = match["tuss_code"]
                    b.sip_group = match["sip_group"]
                    b.observations = match["observations"]
            except Exception as e:
                print(f"Erro na busca vetorial para {b.name}: {e}")
                # Fallback: tentar busca por texto exato se o vetor falhar
                catalog_match = supabase.table("exam_catalog").select("*").ilike("name", b.name).execute()
                if catalog_match.data:
                    match = catalog_match.data[0]
                    # REMOVIDO: b.name = match["name"]

                    b.tuss_code = match["tuss_code"]
                    b.sip_group = match["sip_group"]
                    b.observations = match["observations"]

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
                    "collection_date": b.collection_date,
                    "parent_name": b.parent_name,
                    "sub_category": b.sub_category,
                    "raw_value": b.raw_value,
                    "is_abnormal": b.is_abnormal,
                    "tuss_code": b.tuss_code,
                    "sip_group": b.sip_group,
                    "observations": b.observations,
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
