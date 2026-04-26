import os
from supabase import create_client
from collections import defaultdict

SUPABASE_URL = "http://supabasekong-roockg08kwkoc8w00k8s8k88.147.15.99.72.sslip.io"
SUPABASE_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NzE2MjI2MCwiZXhwIjo0OTMyODM1ODYwLCJyb2xlIjoiYW5vbiJ9.k7d4Ta_Uh40FTlFwirumU2pfu7j2XL2cWQcQYxunhqA"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 70)
print("🔍 DIAGNÓSTICO DA TABELA BIOMARKERS")
print("=" * 70)

# ── 1. Todos os exams
exams_res = supabase.table("exams").select("id, file_path, created_at, summary").order("created_at").execute()
exams = exams_res.data or []
print(f"\n📁 EXAMES REGISTRADOS ({len(exams)} total):")
for e in exams:
    print(f"   exam_id: {e['id']}")
    print(f"   arquivo: {e['file_path']}")
    print(f"   criado:  {e['created_at'][:19]}")
    print()

# ── 2. Todos os biomarkers
bm_res = supabase.table("biomarkers").select("*").order("name, collection_date").execute()
biomarkers = bm_res.data or []
print(f"\n🧬 TOTAL DE BIOMARCADORES: {len(biomarkers)}")

# ── 3. Duplicatas exatas (mesmo name + collection_date + value + patient_id)
print("\n" + "=" * 70)
print("⚠️  DUPLICATAS (mesmo nome + data + valor):")
print("=" * 70)

seen = defaultdict(list)
for b in biomarkers:
    key = (b['patient_id'], b['name'], str(b['collection_date']), str(b['value']))
    seen[key].append(b)

duplicates_found = False
for key, entries in seen.items():
    if len(entries) > 1:
        duplicates_found = True
        patient_id, name, date, value = key
        print(f"\n  🔴 '{name}' | data: {date} | valor: {value}")
        for e in entries:
            print(f"     → id: {e['id']} | exam_id: {e['exam_id']} | unit: {e['unit']}")

if not duplicates_found:
    print("  ✅ Nenhuma duplicata exata encontrada.")

# ── 4. Biomarkers por exam_id
print("\n" + "=" * 70)
print("📊 BIOMARCADORES POR EXAM_ID:")
print("=" * 70)
by_exam = defaultdict(list)
for b in biomarkers:
    by_exam[b['exam_id']].append(b)

for exam_id, items in by_exam.items():
    dates = sorted(set(b['collection_date'] for b in items))
    print(f"\n  exam_id: {exam_id}")
    print(f"  Total de biomarcadores: {len(items)}")
    print(f"  Datas de coleta únicas: {dates}")
    # Mostrar primeiros 5 nomes
    names = [b['name'] for b in items[:5]]
    print(f"  Exemplos: {', '.join(names)}{'...' if len(items) > 5 else ''}")

# ── 5. Biomarcadores por data
print("\n" + "=" * 70)
print("📅 BIOMARCADORES POR DATA DE COLETA:")
print("=" * 70)
by_date = defaultdict(list)
for b in biomarkers:
    by_date[b['collection_date']].append(b)

for date in sorted(by_date.keys()):
    items = by_date[date]
    exam_ids = set(b['exam_id'] for b in items)
    print(f"\n  Data: {date} → {len(items)} biomarcadores | exam_ids: {len(exam_ids)}")
    if len(exam_ids) > 1:
        print(f"  ⚠️  Múltiplos exam_ids para a mesma data: {exam_ids}")

print("\n" + "=" * 70)
print("✅ Diagnóstico concluído.")
print("=" * 70)
