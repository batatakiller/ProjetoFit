import pandas as pd
from supabase import create_client
import os
from dotenv import load_dotenv
import time

load_dotenv(dotenv_path="../../.env")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

EXCEL_PATH = "../Exames/mestra.xlsx"

def populate():
    print(f"Lendo {EXCEL_PATH}...")
    df = pd.read_excel(EXCEL_PATH)
    
    # Mapear colunas
    df = df.rename(columns={
        'Código do Termo\n(Tab 22 - TUSS)': 'tuss_code',
        'Termo\n(Tab 22 - TUSS)': 'name',
        'Item do SIP (grandes grupos)': 'sip_group',
        'Observações': 'observations'
    })
    
    # Converter para JSON e de volta para garantir conformidade
    import json
    records_json = df[['tuss_code', 'name', 'sip_group', 'observations']].to_json(orient='records')
    records = json.loads(records_json)
    total = len(records)
    print(f"Total de registros para importar: {total}")
    
    batch_size = 500
    for i in range(0, total, batch_size):
        batch = records[i:i + batch_size]
        print(f"Importando lote {i//batch_size + 1} ({i} a {min(i+batch_size, total)})...")
        
        try:
            # Usar upsert para evitar erros se rodar o script duas vezes
            supabase.table("exam_catalog").upsert(batch, on_conflict="tuss_code").execute()
        except Exception as e:
            print(f"Erro no lote {i}: {e}")
            # Se a tabela não existir, o script vai parar aqui com erro claro
            break
        
        time.sleep(0.5) # Pequeno delay para respeitar limites de rate limit se houver

    print("✅ População concluída!")

if __name__ == "__main__":
    populate()
