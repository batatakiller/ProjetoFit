import os
from google import genai
from supabase import create_client
from dotenv import load_dotenv
import time

load_dotenv(dotenv_path="../../.env")

# Configurações
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
ai_client = genai.Client(api_key=GEMINI_API_KEY)

def generate():
    while True:
        # 1. Pegar registros que ainda não têm embedding (limite de 1000 por vez)
        res = supabase.table("exam_catalog").select("id, name").is_("embedding", "null").limit(1000).execute()
        records = res.data
        total = len(records)
        
        if total == 0:
            print("✅ Todos os registros já possuem embeddings!")
            break

        print(f"Gerando embeddings para mais {total} registros...")
        
        batch_size = 50
        for i in range(0, total, batch_size):
            batch = records[i:i + batch_size]
            texts = [r["name"] for r in batch]
            
            print(f"Processando lote {i//batch_size + 1} de {total//batch_size}...")
            
            try:
                # Gerar embeddings via Gemini
                emb_res = ai_client.models.embed_content(
                    model='models/gemini-embedding-001',
                    contents=texts
                )
                
                embeddings = emb_res.embeddings
                
                # Atualizar um por um
                for j, r in enumerate(batch):
                    vector = embeddings[j].values
                    supabase.table("exam_catalog").update({"embedding": vector}).eq("id", r["id"]).execute()
                
            except Exception as e:
                print(f"Erro no lote {i}: {e}")
                return # Sair se der erro grave
            
            time.sleep(1) # Rate limit safety

    print("✅ Geração de embeddings concluída!")

if __name__ == "__main__":
    generate()
