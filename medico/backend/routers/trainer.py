import os
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from datetime import date
import tempfile
from pathlib import Path

router = APIRouter(prefix="/trainer", tags=["trainer"])

def get_services():
    import main
    return main.supabase, main.ai_client

class TrainingProgramCreate(BaseModel):
    patient_id: str
    name: str
    is_active: bool = True

class ExerciseSessionCreate(BaseModel):
    patient_id: str
    program_id: Optional[str] = None
    session_date: str
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    exercises: List[Dict[str, Any]]

class BodyMeasurementCreate(BaseModel):
    patient_id: str
    measurement_date: str
    weight_kg: float
    height_cm: Optional[float] = None
    body_fat_pct: Optional[float] = None
    muscle_mass_kg: Optional[float] = None
    source: str = "manual"

@router.get("/training-programs")
def get_training_programs(patient_id: str):
    supabase, _ = get_services()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    try:
        res = supabase.table("training_programs").select("*").eq("patient_id", patient_id).execute()
        return {"data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/training-programs")
def create_training_program(prog: TrainingProgramCreate):
    supabase, _ = get_services()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    try:
        data = {
            "patient_id": prog.patient_id,
            "name": prog.name,
            "is_active": prog.is_active
        }
        res = supabase.table("training_programs").insert(data).execute()
        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exercise-sessions")
def create_exercise_session(session: ExerciseSessionCreate):
    supabase, _ = get_services()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    try:
        session_data = {
            "patient_id": session.patient_id,
            "program_id": session.program_id,
            "session_date": session.session_date,
            "duration_minutes": session.duration_minutes,
            "notes": session.notes
        }
        res = supabase.table("exercise_sessions").insert(session_data).execute()
        session_id = res.data[0]["id"]
        
        # Inserir exercícios da sessão
        for idx, ex in enumerate(session.exercises):
            ex_data = {
                "session_id": session_id,
                "exercise_name": ex.get("name"),
                "sets": ex.get("sets", 0),
                "reps": ex.get("reps", 0),
                "weight_kg": ex.get("weight_kg", 0.0),
                "order_index": idx
            }
            supabase.table("exercise_entries").insert(ex_data).execute()
            
        return {"status": "success", "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/body-measurements")
def get_body_measurements(patient_id: str):
    supabase, _ = get_services()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    try:
        res = supabase.table("body_measurements").select("*").eq("patient_id", patient_id).order("measurement_date", desc=True).execute()
        return {"data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/body-measurements")
def create_body_measurement(measure: BodyMeasurementCreate):
    supabase, _ = get_services()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    try:
        data = {
            "patient_id": measure.patient_id,
            "measurement_date": measure.measurement_date,
            "weight_kg": measure.weight_kg,
            "height_cm": measure.height_cm,
            "body_fat_pct": measure.body_fat_pct,
            "muscle_mass_kg": measure.muscle_mass_kg,
            "source": measure.source
        }
        res = supabase.table("body_measurements").insert(data).execute()
        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _process_inbody_pdf(patient_id: str, file_path: str):
    supabase, ai_client = get_services()
    if not supabase or not ai_client:
        print("Serviços não configurados para processar InBody")
        return
        
    try:
        print(f"Processando InBody para paciente {patient_id}")
        uploaded_file = ai_client.files.upload(file=file_path)
        
        prompt = """
        Extraia as seguintes métricas desta folha de resultados do InBody (Bioimpedância). 
        Retorne APENAS um JSON estrito, sem markdown, com as seguintes chaves numéricas (use float com ponto, ou null se não encontrar):
        - weight_kg (Peso)
        - muscle_mass_kg (Massa Muscular Esquelética - MME)
        - body_fat_pct (Percentual de Gordura Corporal - PGC)
        - lean_mass_kg (Massa Magra)
        - bmr_kcal (Taxa Metabólica Basal)
        - water_pct (Água Corporal Total / Peso) -> se não tiver, retorne null
        """
        
        res = ai_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[uploaded_file, prompt]
        )
        
        # Limpar o JSON retornado
        raw_text = res.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:-3]
            
        import json
        extracted = json.loads(raw_text)
        print("InBody extraído:", extracted)
        
        # Inserir no Supabase
        measurement_data = {
            "patient_id": patient_id,
            "measurement_date": date.today().isoformat(),
            "source": "bioimpedancia",
            **extracted
        }
        
        supabase.table("body_measurements").insert(measurement_data).execute()
        print("Medida InBody salva com sucesso no Supabase")
        
    except Exception as e:
        print(f"Erro ao processar InBody: {e}")
    finally:
        # Delete temp file
        if os.path.exists(file_path):
            os.remove(file_path)

@router.post("/body-measurements/import-inbody")
async def import_inbody(patient_id: str, background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Somente arquivos PDF são aceitos.")
        
    try:
        # Save temp file
        suffix = Path(file.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
            
        # Run extraction in background to avoid blocking
        background_tasks.add_task(_process_inbody_pdf, patient_id, tmp_path)
        
        return {
            "status": "processing", 
            "message": "PDF recebido. A extração via Gemini está rodando em background."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
