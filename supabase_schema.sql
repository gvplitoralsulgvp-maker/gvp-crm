
-- Garante que a extensão de UUID esteja habilitada (necessária para uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABELA DE DOCUMENTOS E MATERIAIS
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'protocol' (HLC-7 etc), 'training' (Treinamentos) ou 'pauta'
    url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA DE EVENTOS (Reuniões, Assembleias, Treinamentos)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TEXT,
    location TEXT,
    target_group TEXT NOT NULL DEFAULT 'ALL', -- 'GVP', 'COLIH', 'ALL'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA DE VISITAS DE ASSISTÊNCIA SOCIAL (AS)
CREATE TABLE IF NOT EXISTS public.social_worker_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL, -- Referência ao hospital
    date DATE NOT NULL,
    member_ids TEXT[] DEFAULT '{}', -- Lista de IDs dos membros designados
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'FINISHED'
    report JSONB, -- Objeto JSON com detalhes do relatório { notes, doctorName, etc }
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA DE VISITAS COLIH (Apresentações e Visitas Médicas)
CREATE TABLE IF NOT EXISTS public.colih_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID, -- Pode ser nulo se for visita institucional
    hospital_id UUID, -- Pode ser nulo se for visita a consultório
    date DATE NOT NULL,
    member_ids TEXT[] DEFAULT '{}',
    notes TEXT,
    interaction_type TEXT, -- 'visit', 'presentation', 'material_delivery', 'email_phone'
    status TEXT DEFAULT 'SCHEDULED',
    hlc38_presented BOOLEAN DEFAULT FALSE,
    collaborator_interest BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- CORREÇÃO: Garante que colunas críticas existam (Correção do erro PGRST204)
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS hospital_id UUID;
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS doctor_id UUID;
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS hlc38_presented BOOLEAN DEFAULT FALSE;
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS collaborator_interest BOOLEAN DEFAULT FALSE;
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'SCHEDULED';

-- CORREÇÃO: Adiciona coluna has_seen_onboarding na tabela members se não existir
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS has_seen_onboarding BOOLEAN DEFAULT FALSE;

-- CORREÇÃO: Adiciona coluna regional na tabela patients (Correção do erro atual)
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS regional TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS is_external_request BOOLEAN DEFAULT FALSE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS request_date TIMESTAMPTZ;

-- ==========================================
-- CONFIGURAÇÃO DO STORAGE (Execute no SQL Editor do Supabase)
-- ==========================================

-- 1. Garante que o bucket 'resources' existe e é público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resources', 'resources', true, 52428800, null) -- Limite 50MB
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Limpeza: Remove políticas antigas para evitar conflitos/duplicação
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'resources' );
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT TO public WITH CHECK ( bucket_id = 'resources' );
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE TO public USING ( bucket_id = 'resources' );
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE TO public USING ( bucket_id = 'resources' );

-- 4. CORREÇÃO DE PERMISSÕES PARA TABELAS (RLS)
-- Garante que o App consiga LER, EDITAR e EXCLUIR dados, não apenas INSERIR
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Insert Patients" ON public.patients;
DROP POLICY IF EXISTS "Public Insert Logs" ON public.logs;
DROP POLICY IF EXISTS "Public Insert Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow All Patients" ON public.patients;
DROP POLICY IF EXISTS "Allow All Logs" ON public.logs;
DROP POLICY IF EXISTS "Allow All Notifications" ON public.notifications;

-- Cria políticas permissivas (CRUD Completo)
CREATE POLICY "Allow All Patients" ON public.patients FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Logs" ON public.logs FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Notifications" ON public.notifications FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
