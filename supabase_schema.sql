
-- ... (código existente acima mantido) ...

-- TABELA DE PACIENTES
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    hospital_name TEXT,
    treatment TEXT,
    admission_date DATE DEFAULT CURRENT_DATE,
    estimated_discharge_date DATE,
    active BOOLEAN DEFAULT true,
    floor TEXT,
    wing TEXT,
    bed TEXT,
    room TEXT,
    phone TEXT,
    email TEXT,
    age TEXT,
    gender TEXT,
    companion_name TEXT,
    companion_phone TEXT,
    congregation TEXT,
    spiritual_status TEXT,
    local_elder TEXT,
    elder_phone TEXT,
    non_witness_family BOOLEAN DEFAULT false,
    visit_time TEXT,
    is_surgical BOOLEAN DEFAULT false,
    surgery_date DATE,
    clinical_status TEXT,
    is_isolation BOOLEAN DEFAULT false,
    isolation_type TEXT,
    notes TEXT,
    is_external_request BOOLEAN DEFAULT false,
    needs_accommodation BOOLEAN DEFAULT false,
    has_directives_card BOOLEAN DEFAULT false,
    agents_notified BOOLEAN DEFAULT false,
    forms_considered BOOLEAN DEFAULT false,
    has_s55 BOOLEAN DEFAULT false,
    gvp_request_pending BOOLEAN DEFAULT false,
    assigned_colih_ids TEXT[], -- Array de UUIDs dos membros COLIH
    created_at TIMESTAMPTZ DEFAULT now()
);

-- MIGRAÇÃO: Adicionar colunas novas se não existirem
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'email') THEN 
        ALTER TABLE public.patients ADD COLUMN email TEXT; 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'congregation') THEN 
        ALTER TABLE public.patients ADD COLUMN congregation TEXT; 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'elder_phone') THEN 
        ALTER TABLE public.patients ADD COLUMN elder_phone TEXT; 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'non_witness_family') THEN 
        ALTER TABLE public.patients ADD COLUMN non_witness_family BOOLEAN DEFAULT false; 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'gvp_request_pending') THEN 
        ALTER TABLE public.patients ADD COLUMN gvp_request_pending BOOLEAN DEFAULT false; 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'assigned_colih_ids') THEN 
        ALTER TABLE public.patients ADD COLUMN assigned_colih_ids TEXT[]; 
    END IF;
END $$;

-- ... (restante do código mantido) ...
