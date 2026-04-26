import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(dotenv_path="../../.env")

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

pdf_path = "/Users/daniel/ProjetoFit/medico/Exames/labiexames15:04:2025.pdf"
with open(pdf_path, "rb") as f:
    file_bytes = f.read()

response = client.models.generate_content(
    model='gemini-2.5-flash-lite',
    contents=[
        types.Part.from_bytes(data=file_bytes, mime_type='application/pdf'),
        "Procure no laudo pelo exame DHT - Dihidrotestosterona. Ele está presente? Se sim, qual o valor e unidade? Responda de forma direta."
    ]
)
print(response.text)
