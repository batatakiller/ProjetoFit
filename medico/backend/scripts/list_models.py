import os
from google import genai
from dotenv import load_dotenv

load_dotenv(dotenv_path="../../.env")

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

try:
    for m in client.models.list():
        if "embed" in m.name:
            print(m.name)
except Exception as e:
    print(f"Error: {e}")
