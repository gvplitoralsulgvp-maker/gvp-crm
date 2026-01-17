-- 1. LIMPEZA TOTAL (Execute isso para evitar erros de tipo em tabelas existentes)
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.logs;
DROP TABLE IF EXISTS public.social_worker_visits;
DROP TABLE IF EXISTS public.visits;
DROP TABLE IF EXISTS public.patients;
DROP TABLE IF EXISTS public.routes;
DROP TABLE IF EXISTS public.hospitals;
DROP TABLE IF EXISTS public.members;

-- 2. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. TABELA DE MEMBROS (id como TEXT para aceitar 'm1' e UUIDs do Auth)
CREATE TABLE public.members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'MEMBER',
    phone TEXT,
    congregation TEXT,
    active BOOLEAN DEFAULT true,
    address TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    has_seen_onboarding BOOLEAN DEFAULT false,
    circuit TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA DE HOSPITAIS
CREATE TABLE public.hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    important_info TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABELA DE ROTAS
CREATE TABLE public.routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    hospital_ids JSONB DEFAULT '[]'::jsonb,
    hospitals JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABELA DE PACIENTES
CREATE TABLE public.patients (
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
    age TEXT,
    gender TEXT,
    companion_name TEXT,
    companion_phone TEXT,
    spiritual_status TEXT,
    local_elder TEXT,
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
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABELA DE VISITAS (Agenda)
CREATE TABLE public.visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    member_ids JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'PENDING',
    report JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TABELA DE ASSISTÊNCIA SOCIAL
CREATE TABLE public.social_worker_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    member_ids JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'PENDING',
    report JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TABELA DE LOGS
CREATE TABLE public.logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT now(),
    user_id TEXT,
    user_name TEXT,
    action TEXT,
    details TEXT
);

-- 10. TABELA DE NOTIFICAÇÕES (user_id como TEXT para referenciar members.id)
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT REFERENCES public.members(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 11. INSERÇÃO DOS 75 MEMBROS (LISTA OFICIAL GVP LITORAL SUL)
INSERT INTO public.members (id, name, email, phone, role, congregation, active)
VALUES 
('m1', 'Francisco Chagas', 'francisco.chagas@gvp.com', '11 95772-3539', 'MEMBER', '', true),
('m2', 'Abel Farias', 'abel.farias@gvp.com', '13 99666-1025', 'MEMBER', '', true),
('m3', 'Celso Xavier', 'celso.xavier@gvp.com', '13 98146-6179', 'MEMBER', '', true),
('m4', 'Felipe Reis', 'felipe.reis@gvp.com', '13 98128-7457', 'MEMBER', 'Itanhaem', true),
('m5', 'Thiago Pereira', 'thiago.pereira@gvp.com', '13 99637-6933', 'MEMBER', '', true),
('m6', 'Tiago Alves de Andrade', 'tiago.andrade@gvp.com', '13 99796-2076', 'MEMBER', '', true),
('m7', 'Wellington Gomes', 'wellington.gomes@gvp.com', '13 99656-2195', 'MEMBER', 'Itariri', true),
('m8', 'Ronevaldo Araújo Sobrinho', 'ronevaldo.araujo@gvp.com', '13 99801-8956', 'MEMBER', '', true),
('m9', 'Jose Ribeiro de São Pedro', 'jose.pedro@gvp.com', '13 99637-3388', 'MEMBER', '', true),
('m10', 'Zenivaldo Andrade Araujo', 'zenivaldo.araujo@gvp.com', '15 99778-5415', 'MEMBER', '', true),
('m11', 'Rubens Rufino de Souza', 'rubens.souza@gvp.com', '13 98170-0028', 'MEMBER', 'Registro', true),
('m12', 'Renato Baldoino dos Reis', '4renatoReis@jwpub.org', '11 98542-7381', 'MEMBER', '', true),
('m13', 'Luiz Antônio de Oliveira Pimentel', 'luiz.pimentel@gvp.com', '13 97422-9367', 'MEMBER', '', true),
('m14', 'Valdirei Pereira de Souza', 'valdireis42@jwpub.org', '11 96905-4837', 'MEMBER', 'Iguape', true),
('m15', 'Cicero Oliveira', 'cicerod61@jwpub.org', '11 96623-4492', 'MEMBER', 'Peruibe', true),
('m16', 'Denis dos Santos Alves', 'denisalves14@jwpub.org', '13 98148-6977', 'MEMBER', 'Peruibe', true),
('m17', 'Fernando Tadeu Lanichek', 'ernandoM3@jwpub.org', '13 99748-8394', 'MEMBER', 'Itanhaem', true),
('m18', 'Thiago Zardo', 'ThiagoZardo49@jwpub.org', '13 98877-0538', 'MEMBER', 'Itanhaem', true),
('m19', 'Aparecido Francisco de Lima', '7AparecidoLima@jwpub.org', '13 974227513', 'MEMBER', 'Peruibe', true),
('m20', 'Marivan Sanches', 'marivans15@jwpub.org', '13 988263341', 'MEMBER', 'Miracatu', true),
('m21', 'João Amauri Pinto', 'Pjoao57@jwpub.org', '13 99710-7914', 'MEMBER', 'Ilha cumprida', true),
('m22', 'João Carvalho', '37sobrinhoJ@jwpub.org', '11 987443989', 'MEMBER', 'Sul de Ilha Cumprida', true),
('m23', 'Carlos Roberto Rosa Rocio', 'RCarlos27@jwpub.org', '1399662-0543', 'MEMBER', 'Iguape', true),
('m24', 'João Teixeira Prado', 'jprado11@jwpub.org', '13 997870627', 'MEMBER', 'Central Registro', true),
('m25', 'Orivaldo Costa', 'orivaldo@jwpub.org', '13 99612-0781', 'MEMBER', 'Central Registro', true),
('m26', 'Helio Baba', '5HelioBaba@jwpub.org', '13 99711-0447', 'MEMBER', 'Sul Regsitro', true),
('m27', 'Marcio Ribeiro', 'RibeiroMarcio@jwpub.org', '13 98187-5349', 'MEMBER', 'Sul de Registro', true),
('m28', 'Gilberto Costa', 'GRCG@jwpub.org', '13 98187-5349', 'MEMBER', 'Sul de Regsitro', true),
('m29', 'Osair Moura Gonzaga', 'omoura@jwpub.org', '13 99635-6430', 'MEMBER', 'Central Cajati', true),
('m30', 'Luiz Roberto Dignazzio', 'LuizRobertoDignazzio@jwpub.org', '11 999757543', 'MEMBER', 'Central Cajati', true),
('m31', 'Marcio Ferreira', 'mferreira@jwpub.org', '11 96952-6211', 'MEMBER', 'Belas Artes', true),
('m32', 'Joel Ribeiro', '47joeld@jwpub.org', '13 99720-1966', 'MEMBER', 'Chacara das Tamaras', true),
('m33', 'Jefeson Baptista', 'JJefson@jwpub.org', '13 97408-5795', 'MEMBER', 'Chacara das Tamaras', true),
('m34', 'Amauri Silva', '3damauri@jwpub.org', '13 982183119', 'MEMBER', 'Chacara das Tamaras', true),
('m35', 'Adelson Silva', 'daSilvaA5@jwpub.org', '13 97411.4545', 'MEMBER', 'Itariri', true),
('m36', 'Joaci Gomes Silva', 'SJoaci@jwpub.org', '11 98315-0303', 'MEMBER', 'Capitão Braz', true),
('m37', 'Helio Polito', '1heliop@jwpub.org', '13 98837-1037', 'MEMBER', 'Praia Grande', true),
('m38', 'Julio Cesar Queiroz de Medeiros', 'julioCesarMedeiros22@jwpub.org', '13 99718-0445', 'MEMBER', '', true),
('m39', 'Luiz Carlos Vieira Junior', 'juniorl50@jwpub.org', '13 99777-9446', 'MEMBER', '', true),
('m40', 'Laércio de Souza', 'laerciosouza2@jwpub.org', '13 98208-7075', 'MEMBER', '', true),
('m41', 'Carlos Leandro Estrela Rodrigues', '10rodriguescarlos@jwpub.org', '13 98166-0463', 'MEMBER', '', true),
('m42', 'Leonardo Manoel Fernandes', 'Leonardo@jwpub.org', '13 98853-1892', 'MEMBER', '', true),
('m43', 'Leonardo Goes de Santana', '39lsantana@jwpub.org', '13 98165-5190', 'MEMBER', '', true),
('m44', 'Luiz Cláudio Martins de Oliveira', '33LuizO@jwpub.org', '13 99644-3282', 'MEMBER', '', true),
('m45', 'Mario Henrique dos Santos R3', 'MarioS12@jwpub.org', '13 97813-4558', 'MEMBER', '', true),
('m46', 'Nelson de Jesus', '2NJESUS@JWPUB.ORG', '13 99669-3125', 'MEMBER', '', true),
('m47', 'Jose Claudio de Novaes', 'deNovaesJose23@jwpub.org', '13 98168-2487', 'MEMBER', 'Praia Grande', true),
('m48', 'Renato Ferreira de Souza', 'SRenato13@jwpub.org', '11 98963-1690', 'MEMBER', 'Mongagua', true),
('m49', 'Ricardo Rio Mardonado', 'rmardonado@jwpub.org', '13 99697-6672', 'MEMBER', 'Tude Bastos', true),
('m50', 'Valdecir Chagas', 'ValdecirChagas16@jwpub.org', '13 99671-8648', 'MEMBER', '', true),
('m51', 'Jaquis Antonio dos Santos', 'JASantos@jwpub.org', '13 99787-7910', 'MEMBER', 'São Vicente', true),
('m52', 'João Batista de Carvalho Junior', 'decarvalhojoao@jwpub.org', '13 99614-9875', 'MEMBER', '', true),
('m53', 'Diogo Santos Ribeiro', 'DiogoR@jwpub.org', '13 99165-1771', 'MEMBER', 'Tupiry', true),
('m54', 'Bartolomeu dos Reis', 'BartolomeuR@jwpub.org', '13 99134-0431', 'MEMBER', '', true),
('m55', 'Michael Moraes dos Santos', 'SMICHAEL9@JWPUB.ORG', '13 98844-8083', 'MEMBER', '', true),
('m56', 'Wesley Vieira Lima', 'WesleyLima9@jwpub.org', '11 96473-4684', 'MEMBER', '', true),
('m57', 'Expedito Oliveira', '31oliveiraexpedito@jwpub.org', '11 99432-3019', 'MEMBER', 'Quietude', true),
('m58', 'Italo Oliveira', 'italooliveira2@jwpub.org', '13 988855-2955', 'MEMBER', 'São Vicente', true),
('m59', 'Sidney Silva Branco', 'SIDINEYSILVA3@jwpub.org', '13 98126-8552', 'MEMBER', 'São Vicente', true),
('m60', 'Luis Roberto Rocha', 'luizrocha2@jwpul.org', '13 99124-8400', 'MEMBER', 'Tupiry', true),
('m61', 'Jalrobson Braga', 'JALrobsonC@jwpub.org', '13 99760-5860', 'MEMBER', 'Praia Grande', true),
('m62', 'Nicolas de Santana Godoy R3', 'nikolassantana17@jwpub.org', '13 97600-2246', 'MEMBER', 'Praia Grande', true),
('m63', 'Wagner Moura R3', 'WagnerMoura10@jwpub.org', '11 93241-3456', 'MEMBER', 'Forte', true),
('m64', 'Marcelo Bispo', '5bispom@jwpub.org', '19 99676-3272', 'MEMBER', 'Tupi', true),
('m65', 'Sidinei Fernandes', 'sidinei.fernandes@gvp.com', '13 99107-1496', 'MEMBER', 'Praia Grande', true),
('m66', 'Gilmar Erasmo de Oliveira', 'gilmar@gvp.com', '13 98163-5401', 'MEMBER', 'Bertioga', true),
('m67', 'Antônio Gois', 'AntonioleiteGoes1@jwpub.org', '13 99746-6767', 'MEMBER', '', true),
('m68', 'Caio Teixeira', 'caio.teixeira@gvp.com', '15 97405-1621', 'MEMBER', 'Bertioga', true),
('m69', 'Danilo Silva Santos', 'danilo.santos@gvp.com', '13 97408-3690', 'MEMBER', '', true),
('m70', 'Wagner Eduardo dos Santos', 'swagner42@jwpub.org', '13 98859-2122', 'MEMBER', 'Cubatão', true),
('m71', 'Fagner Santos', 'santosFagner13@jwpub.org', '13 98802-0752', 'MEMBER', 'Cubatão', true),
('m72', 'Felipe Amaral', 'filipeamaral@jwpub.org', '13 99754-1796', 'MEMBER', 'Santos', true),
('m73', 'Victor Vieira', 'Vitorvieria50@jwpub.org', '13.982.080.577', 'MEMBER', 'Cubatão', true),
('m74', 'Juscelino Barbosa', 'JuscelinoB2@jwpub.org', '13 98873.0356', 'MEMBER', 'Cubatão', true),
('m75', 'Andrews Luiz Santos', 'andrews.santos@gvp.com', '1398171-4532', 'MEMBER', '', true);

-- 12. INSERÇÃO DOS HOSPITAIS
INSERT INTO public.hospitals (name, city, address, lat, lng)
VALUES 
('Santa Casa de Santos', 'Santos', 'Av. Dr. Cláudio Luís da Costa, 50', -23.9452, -46.3345),
('Hospital Guilherme Álvaro', 'Santos', 'Rua Oswaldo Cruz, 197', -23.9575, -46.3236),
('Hospital Ana Costa - Santos', 'Santos', 'Rua Pedro Américo, 60', -23.9541, -46.3332),
('Beneficência Portuguesa de Santos', 'Santos', 'Av. Bernardino de Campos, 47', -23.9515, -46.3312),
('Hospital Irmã Dulce', 'Praia Grande', 'Rua Dair Borges, 550', -24.0102, -46.4111),
('Hospital Santo Amaro', 'Guarujá', 'Rua Israel, 203', -23.9935, -46.2572),
('Hospital Municipal de São Vicente', 'São Vicente', 'Rua Ipiranga, 353', -23.9712, -46.3862),
('Hospital Regional de Itanhaém', 'Itanhaém', 'Rua Rui Barbosa, 541', -24.1842, -46.7905),
('Hospital IGESP - Praia Grande', 'Praia Grande', 'Rua General Marcondes Salgado, 400', -24.0118, -46.4135),
('Hospital Casa de Saúde de Santos', 'Santos', 'Av. Conselheiro Nébias, 644', -23.9592, -46.3235),
('Hospital Regional de Registro', 'Registro', 'Rodovia BR-116, km 443', -24.4947, -47.8461),
('Hospital Infantil Gonzaga', 'Santos', 'Av. Ana Costa, 411', -23.9634, -46.3315),
('Hospital São Lucas - Santos', 'Santos', 'Av. Ana Costa, 168', -23.9502, -46.3325),
('Hosp São Jose - Itariri', 'Itariri', 'Rua Principal, Itariri', -24.2889, -47.1736),
('Hospital Regional Jorge Rossmann', 'Itanhaém', 'Av. Rui Barbosa, 541', -24.185, -46.791);
