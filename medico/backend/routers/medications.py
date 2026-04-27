import os
from typing import List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import requests
from datetime import date
import json

router = APIRouter(prefix="/medications", tags=["medications"])

# We will import supabase and ai_client locally inside the functions to avoid circular dependencies
def get_services():
    import main
    return main.supabase, main.ai_client

class MedicationCreate(BaseModel):
    patient_id: str
    name: str
    brand_name: Optional[str] = None
    dosage: str
    frequency: str
    purpose: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    is_active: bool = True
    notes: Optional[str] = None

class MedicationUpdate(BaseModel):
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    purpose: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

def fetch_rxnorm_and_openfda(med_id: str, name: str):
    """Background task to fetch RxNorm ID and OpenFDA adverse effects"""
    supabase, ai_client = get_services()
    if not supabase:
        return

    rxnorm_id = None
    active_ingredient = None
    
    # 1. Gemini translation to English (since RxNorm is US-centric)
    try:
        if ai_client:
            prompt = f"Traduza o nome do seguinte medicamento/princípio ativo para o nome oficial genérico em inglês. Retorne APENAS o nome em inglês, sem pontuação ou explicações: '{name}'"
            response = ai_client.models.generate_content(
                model='gemini-2.5-flash-lite',
                contents=prompt
            )
            english_name = response.text.strip()
            print(f"[{name}] Traduzido para: {english_name}")
        else:
            english_name = name
            
        # 2. RxNorm API
        rxnav_url = f"https://rxnav.nlm.nih.gov/REST/rxcui.json?name={english_name}"
        res = requests.get(rxnav_url)
        if res.status_code == 200:
            data = res.json()
            id_group = data.get("idGroup", {})
            rxcuis = id_group.get("rxnormId", [])
            if rxcuis:
                rxnorm_id = rxcuis[0]
                active_ingredient = english_name
                print(f"[{name}] RxNorm ID: {rxnorm_id}")
    except Exception as e:
        print(f"Erro no RxNorm para {name}: {e}")

    # 3. OpenFDA API (if we got the active ingredient)
    adverse_effects = {}
    if active_ingredient:
        try:
            # Query OpenFDA for adverse events
            fda_url = f'https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"{active_ingredient}"&count=patient.reaction.reactionmeddrapt.exact'
            res = requests.get(fda_url)
            if res.status_code == 200:
                fda_data = res.json()
                results = fda_data.get("results", [])
                # Get top 5 adverse effects
                top_effects = {r["term"]: r["count"] for r in results[:5]}
                adverse_effects = top_effects
                print(f"[{name}] OpenFDA Efeitos: {top_effects}")
        except Exception as e:
            print(f"Erro no OpenFDA para {name}: {e}")

    # 4. Update Database
    if rxnorm_id or adverse_effects:
        try:
            supabase.table("medications").update({
                "rxnorm_id": rxnorm_id,
                "active_ingredient": active_ingredient,
                "official_name": active_ingredient,
                "adverse_effects_summary": adverse_effects
            }).eq("id", med_id).execute()
        except Exception as e:
            print(f"Erro ao atualizar medicamento no Supabase: {e}")

@router.post("")
def create_medication(med: MedicationCreate, background_tasks: BackgroundTasks):
    supabase, _ = get_services()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        data = {
            "patient_id": med.patient_id,
            "name": med.name,
            "brand_name": med.brand_name,
            "dosage": med.dosage,
            "frequency": med.frequency,
            "purpose": med.purpose,
            "start_date": med.start_date,
            "end_date": med.end_date,
            "is_active": med.is_active,
            "notes": med.notes
        }
        res = supabase.table("medications").insert(data).execute()
        med_id = res.data[0]["id"]
        
        # Trigger background enrichment
        background_tasks.add_task(fetch_rxnorm_and_openfda, med_id, med.name)
        
        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
def get_medications(patient_id: str):
    supabase, _ = get_services()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    try:
        res = supabase.table("medications").select("*").eq("patient_id", patient_id).order("start_date", desc=True).execute()
        return {"data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{med_id}")
def update_medication(med_id: str, med: MedicationUpdate):
    supabase, _ = get_services()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    try:
        update_data = {k: v for k, v in med.model_dump().items() if v is not None}
        if not update_data:
            return {"status": "no_changes"}
            
        res = supabase.table("medications").update(update_data).eq("id", med_id).execute()
        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{med_id}")
def delete_medication(med_id: str):
    supabase, _ = get_services()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    try:
        supabase.table("medications").delete().eq("id", med_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-interactions")
def check_interactions(patient_id: str):
    """
    Checks interactions between active medications using Gemini as a clinical pharmacist.
    """
    supabase, ai_client = get_services()
    if not supabase or not ai_client:
        raise HTTPException(status_code=500, detail="Services not configured")

    try:
        # Get active medications
        meds_res = supabase.table("medications").select("name, dosage, purpose").eq("patient_id", patient_id).eq("is_active", True).execute()
        meds = meds_res.data
        
        if len(meds) < 2:
            return {"interactions": "Não há medicamentos suficientes para checar interação."}
            
        med_list_str = "\n".join([f"- {m['name']} ({m['dosage']})" for m in meds])
        
        prompt = f"""
        Como um farmacologista clínico, analise a seguinte lista de medicamentos ativos do paciente 
        e relate se existe alguma interação medicamentosa importante, ou interação significativa com alimentos.
        
        Lista de medicamentos:
        {med_list_str}
        
        Responda de forma concisa e direta, destacando apenas interações REAIS e RELEVANTES clinicamente. 
        Se não houver interações preocupantes, informe que a combinação parece segura.
        """
        
        response = ai_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        return {"interactions": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
