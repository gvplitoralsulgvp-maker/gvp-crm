
-- Garante que a extensão de UUID esteja habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABELA DE DOCUMENTOS E MATERIAIS
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA DE EVENTOS
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TEXT,
    location TEXT,
    target_group TEXT NOT NULL DEFAULT 'ALL',
    attendees TEXT[] DEFAULT '{}', -- Lista de IDs dos presentes
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA DE VISITAS DE ASSISTÊNCIA SOCIAL
CREATE TABLE IF NOT EXISTS public.social_worker_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL,
    date DATE NOT NULL,
    member_ids TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'PENDING',
    report JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA DE VISITAS COLIH
CREATE TABLE IF NOT EXISTS public.colih_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID,
    hospital_id UUID,
    date DATE NOT NULL,
    member_ids TEXT[] DEFAULT '{}',
    notes TEXT,
    interaction_type TEXT,
    status TEXT DEFAULT 'SCHEDULED',
    hlc38_presented BOOLEAN DEFAULT FALSE,
    collaborator_interest BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA DE MÉDICOS
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    specialty TEXT,
    city TEXT,
    regional TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    hospital_ids TEXT[] DEFAULT '{}',
    last_visit_date DATE,
    cooperation_level TEXT,
    is_consultant BOOLEAN DEFAULT FALSE,
    treats_pediatric BOOLEAN DEFAULT FALSE,
    responsible_member_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ATUALIZAÇÕES ESTRUTURAIS (Colunas Novas)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS is_trainer BOOLEAN DEFAULT FALSE; -- CORREÇÃO SOLICITADA
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS has_seen_onboarding BOOLEAN DEFAULT FALSE;

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS attendees TEXT[] DEFAULT '{}';

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS regional TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS is_external_request BOOLEAN DEFAULT FALSE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS request_date TIMESTAMPTZ;

ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS hospital_id UUID;
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS doctor_id UUID;
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS hlc38_presented BOOLEAN DEFAULT FALSE;
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS collaborator_interest BOOLEAN DEFAULT FALSE;
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'SCHEDULED';

ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS hospital_ids TEXT[] DEFAULT '{}';
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS last_visit_date DATE;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS cooperation_level TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_consultant BOOLEAN DEFAULT FALSE;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS treats_pediatric BOOLEAN DEFAULT FALSE;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS responsible_member_name TEXT;

-- PERMISSÕES RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY; -- Garantir que members tenha RLS se necessário, ou políticas abertas

-- Limpeza de políticas antigas
DROP POLICY IF EXISTS "Allow All Patients" ON public.patients;
DROP POLICY IF EXISTS "Allow All Logs" ON public.logs;
DROP POLICY IF EXISTS "Allow All Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow All Doctors" ON public.doctors;
DROP POLICY IF EXISTS "Allow All Members" ON public.members;

-- Recriação de políticas permissivas
CREATE POLICY "Allow All Patients" ON public.patients FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Logs" ON public.logs FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Notifications" ON public.notifications FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Doctors" ON public.doctors FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Members" ON public.members FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

-- CONFIGURAÇÃO DO STORAGE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resources', 'resources', true, 52428800, null)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'resources' );
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT TO public WITH CHECK ( bucket_id = 'resources' );
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE TO public USING ( bucket_id = 'resources' );
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE TO public USING ( bucket_id = 'resources' );
