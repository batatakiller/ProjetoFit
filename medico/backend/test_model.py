import os
from google import genai
from dotenv import load_dotenv

# Load env from root
load_dotenv(dotenv_path="../../.env")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

model_id = "gemini-2.5-flash-lite"

print(f"--- Testando conexão com {model_id} ---")
try:
    response = client.models.generate_content(
        model=model_id,
        contents="oi qual o modelo llm voce é?"
    )
    print(f"Resposta: {response.text}")
except Exception as e:
    print(f"Erro: {e}")
