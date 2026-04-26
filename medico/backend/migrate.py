import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# SQL to be executed
sql_query = """
create extension if not exists vector;

create table if not exists patients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists exams (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references patients(id) on delete cascade,
  file_path text not null,
  status text default 'processing',
  summary text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists biomarkers (
  id uuid default gen_random_uuid() primary key,
  exam_id uuid references exams(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  name text not null,
  value numeric not null,
  unit text,
  category text,
  collection_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists exam_embeddings (
  id uuid default gen_random_uuid() primary key,
  exam_id uuid references exams(id) on delete cascade,
  content text,
  embedding vector(768),
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
"""

def run_sql(sql):
    # Supabase doesn't expose a public SQL endpoint for the anon key.
    # Usually, we need the service_role key to use the administrative API.
    # I will try to see if I can find the service_role key or if there's another way.
    print(f"Tentando criar tabelas no Supabase: {SUPABASE_URL}")
    print("Nota: A 'anon key' normalmente não permite criar tabelas via API por segurança.")
    print("O método recomendado é usar o SQL Editor no painel do Supabase.")

if __name__ == "__main__":
    run_sql(sql_query)
