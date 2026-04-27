-- ═══════════════════════════════════════════════════════════════
-- ProjetoFit — Plataforma Multi-Portal de Saúde Integrada
-- Migration 001: Platform Schema
-- Tabelas novas para Medicamentos, Treino, Nutrição e Auth
-- ═══════════════════════════════════════════════════════════════

-- Extensão para busca por similaridade textual (autocomplete)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────
-- 1. AUTENTICAÇÃO E PERFIS PROFISSIONAIS
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS professional_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('medico', 'treinador', 'nutricionista')),
    registration_number TEXT,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS professional_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(professional_id, patient_id)
);

-- ─────────────────────────────────────────────────
-- 2. MEDICAMENTOS (Portal Médico)
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

    -- Identificação (Normalização RxNorm)
    rxnorm_id TEXT,
    official_name TEXT,
    brand_name TEXT,
    active_ingredient TEXT,
    name TEXT NOT NULL,

    -- Uso
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    purpose TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,

    -- Metadados farmacológicos (cache APIs)
    pharmacological_class TEXT,
    adverse_effects_summary JSONB DEFAULT '{}',
    food_interactions JSONB DEFAULT '{}',
    last_sync_at TIMESTAMPTZ,

    -- Relações
    prescribed_by UUID REFERENCES professional_profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_active ON medications(patient_id, is_active);
CREATE INDEX IF NOT EXISTS idx_medications_rxnorm ON medications(rxnorm_id);

-- ─────────────────────────────────────────────────
-- 3. TREINO (Portal Treinador)
-- ─────────────────────────────────────────────────

-- Catálogo de exercícios
CREATE TABLE IF NOT EXISTS exercise_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    secondary_muscles TEXT[],
    equipment TEXT,
    category TEXT CHECK (category IN ('musculacao', 'cardio', 'funcional', 'alongamento', 'outro')),
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_catalog_muscle ON exercise_catalog(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercise_catalog_name ON exercise_catalog(name);

-- Programa de treino
CREATE TABLE IF NOT EXISTS training_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    goal TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES professional_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_programs_patient ON training_programs(patient_id);

-- Sessão de treino realizada
CREATE TABLE IF NOT EXISTS exercise_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    program_id UUID REFERENCES training_programs(id),
    session_date DATE NOT NULL,
    duration_minutes INTEGER,
    perceived_effort INTEGER CHECK (perceived_effort BETWEEN 1 AND 10),
    notes TEXT,
    created_by UUID REFERENCES professional_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_sessions_patient ON exercise_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_date ON exercise_sessions(session_date);

-- Exercícios dentro de uma sessão
CREATE TABLE IF NOT EXISTS exercise_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exercise_sessions(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercise_catalog(id),
    exercise_name TEXT NOT NULL,
    sets INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight_kg NUMERIC(6,2),
    rest_seconds INTEGER,
    tempo TEXT,
    notes TEXT,
    order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_exercise_entries_session ON exercise_entries(session_id);

-- Medidas corporais e bioimpedância
CREATE TABLE IF NOT EXISTS body_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    measurement_date DATE NOT NULL,

    -- Composição corporal
    weight_kg NUMERIC(5,2),
    height_cm NUMERIC(5,1),
    body_fat_pct NUMERIC(4,1),
    lean_mass_kg NUMERIC(5,2),
    muscle_mass_kg NUMERIC(5,2),
    visceral_fat_level INTEGER,
    bmr_kcal INTEGER,
    bone_mass_kg NUMERIC(4,2),
    water_pct NUMERIC(4,1),
    bmi NUMERIC(4,1),

    -- Circunferências
    chest_cm NUMERIC(5,1),
    waist_cm NUMERIC(5,1),
    hip_cm NUMERIC(5,1),
    abdomen_cm NUMERIC(5,1),
    right_arm_cm NUMERIC(5,1),
    left_arm_cm NUMERIC(5,1),
    right_forearm_cm NUMERIC(5,1),
    left_forearm_cm NUMERIC(5,1),
    right_thigh_cm NUMERIC(5,1),
    left_thigh_cm NUMERIC(5,1),
    right_calf_cm NUMERIC(5,1),
    left_calf_cm NUMERIC(5,1),
    neck_cm NUMERIC(5,1),
    shoulder_cm NUMERIC(5,1),

    -- Dados InBody específicos
    inbody_score INTEGER,
    segmental_lean_analysis JSONB DEFAULT '{}',
    segmental_fat_analysis JSONB DEFAULT '{}',

    source TEXT CHECK (source IN ('manual', 'bioimpedancia', 'dexa', 'outro')) DEFAULT 'manual',
    notes TEXT,
    created_by UUID REFERENCES professional_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_measurements_patient ON body_measurements(patient_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_date ON body_measurements(measurement_date);

-- ─────────────────────────────────────────────────
-- 4. NUTRIÇÃO (Portal Nutricionista)
-- ─────────────────────────────────────────────────

-- Base de alimentos (TACO + custom)
CREATE TABLE IF NOT EXISTS food_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    portion_description TEXT DEFAULT '100g',

    -- Macronutrientes (por 100g)
    calories_kcal NUMERIC(7,2),
    protein_g NUMERIC(6,2),
    carbs_g NUMERIC(6,2),
    fat_g NUMERIC(6,2),
    fiber_g NUMERIC(6,2),
    saturated_fat_g NUMERIC(6,2),
    trans_fat_g NUMERIC(6,2),
    cholesterol_mg NUMERIC(7,2),

    -- Micronutrientes (por 100g)
    sodium_mg NUMERIC(7,2),
    calcium_mg NUMERIC(7,2),
    iron_mg NUMERIC(6,2),
    potassium_mg NUMERIC(7,2),
    magnesium_mg NUMERIC(7,2),
    zinc_mg NUMERIC(6,2),
    phosphorus_mg NUMERIC(7,2),
    vitamin_a_mcg NUMERIC(7,2),
    vitamin_c_mg NUMERIC(6,2),
    vitamin_d_mcg NUMERIC(6,2),
    vitamin_b12_mcg NUMERIC(6,2),
    folate_mcg NUMERIC(7,2),

    source TEXT DEFAULT 'TACO',
    taco_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_catalog_name ON food_catalog USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_food_catalog_category ON food_catalog(category);

-- Plano alimentar
CREATE TABLE IF NOT EXISTS diet_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    goal TEXT,
    total_calories_target INTEGER,
    protein_target_g INTEGER,
    carbs_target_g INTEGER,
    fat_target_g INTEGER,
    is_active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_by UUID REFERENCES professional_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diet_plans_patient ON diet_plans(patient_id);

-- Refeições dentro do plano
CREATE TABLE IF NOT EXISTS meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES diet_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    time_suggestion TEXT,
    order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_meals_plan ON meals(plan_id);

-- Itens de cada refeição
CREATE TABLE IF NOT EXISTS meal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    food_id UUID REFERENCES food_catalog(id),
    food_name TEXT NOT NULL,
    quantity_g NUMERIC(7,2) NOT NULL,
    calories_kcal NUMERIC(7,2),
    protein_g NUMERIC(6,2),
    carbs_g NUMERIC(6,2),
    fat_g NUMERIC(6,2),
    notes TEXT,
    order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_meal_items_meal ON meal_items(meal_id);

-- Suplementos
CREATE TABLE IF NOT EXISTS supplements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand TEXT,
    active_ingredient TEXT,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    purpose TEXT,
    timing TEXT,
    is_active BOOLEAN DEFAULT true,
    prescribed_by UUID REFERENCES professional_profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplements_patient ON supplements(patient_id);
CREATE INDEX IF NOT EXISTS idx_supplements_active ON supplements(patient_id, is_active);

-- ─────────────────────────────────────────────────
-- 5. TRACKER DE SINTOMAS (Compartilhado)
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS symptoms_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    symptom_date DATE NOT NULL,
    symptom TEXT NOT NULL,
    severity INTEGER CHECK (severity BETWEEN 1 AND 10),
    category TEXT CHECK (category IN ('hormonal', 'digestivo', 'musculoesqueletico', 'neurologico', 'dermatologico', 'cardiovascular', 'outro')),
    notes TEXT,
    reported_by TEXT CHECK (reported_by IN ('paciente', 'medico', 'treinador', 'nutricionista')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_symptoms_patient ON symptoms_tracker(patient_id);
CREATE INDEX IF NOT EXISTS idx_symptoms_date ON symptoms_tracker(symptom_date);


