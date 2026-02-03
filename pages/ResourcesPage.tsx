
import React, { useState, useRef } from 'react';
import { AppState, AppDocument, UserRole } from '../types';
import { Button } from '../components/Button';
import { atomicUpdate, atomicDelete, uploadFile, deleteFile } from '../services/storageService';
import { supabase } from '../services/supabaseClient';

interface ResourcesPageProps {
  state: AppState;
  onUpdateState: React.Dispatch<React.SetStateAction<AppState>>;
  isHospitalMode?: boolean;
}

export const ResourcesPage: React.FC<ResourcesPageProps> = ({ state, onUpdateState, isHospitalMode }) => {
  // FIX: Type mismatch 'protocols' vs 'protocol'
  const [activeTab, setActiveTab] = useState<'protocol' | 'training' | 'pauta'>('protocol');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Admin SQL States
  const [sqlResult, setSqlResult] = useState<string>('');
  const [sqlError, setSqlError] = useState<string>('');
  const [isExecutingSql, setIsExecutingSql] = useState(false);

  const isAdmin = state.currentUser?.role === UserRole.ADMIN;

  const filteredDocs = state.documents.filter(d => d.category === activeTab);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);

    try {
        const { path, url } = await uploadFile(file, activeTab);
        
        const newDoc: AppDocument = {
            id: crypto.randomUUID(),
            title: file.name,
            category: activeTab,
            url: url,
            filePath: path,
            contentType: file.type,
            createdAt: new Date().toISOString()
        };

        await atomicUpdate('documents', newDoc);
        onUpdateState({ ...state, documents: [...state.documents, newDoc] });
    } catch (err: any) {
        alert("Erro no upload: " + err.message);
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (doc: AppDocument) => {
      if (!confirm("Excluir este arquivo?")) return;
      try {
          await deleteFile(doc.filePath);
          await atomicDelete('documents', doc.id);
          onUpdateState({ ...state, documents: state.documents.filter(d => d.id !== doc.id) });
      } catch (err) {
          alert("Erro ao excluir.");
      }
  };

  // SQL ATUALIZADO V8 (Inclui hlc7_file_url)
  const sqlCode = `
-- =======================================================
-- SCRIPT DE CORREÇÃO GERAL (V8)
-- =======================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CORREÇÃO TABELA MEMBERS
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS is_trainer BOOLEAN DEFAULT FALSE;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS has_seen_onboarding BOOLEAN DEFAULT FALSE;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS colih_classification TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS is_colih BOOLEAN DEFAULT FALSE;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS regional TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS city TEXT;

-- 2. CORREÇÃO TABELA DOCTORS
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS regional TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS hospital_ids TEXT[] DEFAULT '{}';
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS last_visit_date DATE;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS cooperation_level TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_consultant BOOLEAN DEFAULT FALSE;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS treats_pediatric BOOLEAN DEFAULT FALSE;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS responsible_member_name TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS assigned_member_ids TEXT[] DEFAULT '{}';

-- 3. CORREÇÃO OUTRAS TABELAS
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS hospital_id UUID;
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS doctor_id UUID;
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'SCHEDULED';

-- CORREÇÃO TABELA PACIENTES (NOVOS CAMPOS ALTA/GVP + ASSIGNMENT)
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS regional TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS is_external_request BOOLEAN DEFAULT FALSE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS request_date TIMESTAMPTZ;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS pending_hlc7 BOOLEAN DEFAULT FALSE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS hlc7_file_url TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS is_medical_discharge BOOLEAN DEFAULT FALSE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS gvp_request_pending BOOLEAN DEFAULT FALSE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS assigned_colih_ids TEXT[] DEFAULT '{}';

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS attendees TEXT[] DEFAULT '{}';

-- 4. HABILITAR RLS E CRIAR POLÍTICAS PERMISSIVAS
-- (Isso corrige erros 401/403 de permissão)

-- Members
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Members" ON public.members;
CREATE POLICY "Allow All Members" ON public.members FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

-- Events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Events" ON public.events;
CREATE POLICY "Allow All Events" ON public.events FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

-- Doctors
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Doctors" ON public.doctors;
CREATE POLICY "Allow All Doctors" ON public.doctors FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

-- Patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Patients" ON public.patients;
CREATE POLICY "Allow All Patients" ON public.patients FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

-- Visits
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Visits" ON public.visits;
CREATE POLICY "Allow All Visits" ON public.visits FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

-- 5. STORAGE
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

-- 6. RECARREGAR CACHE SCHEMA (Importante para o erro PGRST204)
NOTIFY pgrst, 'reload config';
`;

  const handleExecuteSql = async () => {
      if (!supabase) return;
      setIsExecutingSql(true);
      setSqlResult('');
      setSqlError('');
      
      try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: sqlCode });
          
          if (error) {
              // Se a função rpc não existir, tenta criar via REST (Isso geralmente falha se não for superuser, mas tentamos)
              // Em ambiente real, o usuário deve rodar isso no SQL Editor do Supabase Dashboard.
              setSqlError("Erro ao executar. Certifique-se que a função 'exec_sql' existe no banco ou rode este script manualmente no Supabase Dashboard > SQL Editor.\n\nDetalhe: " + error.message);
          } else {
              setSqlResult("Script executado com sucesso! As tabelas e permissões foram atualizadas.");
          }
      } catch (err: any) {
          setSqlError("Erro de conexão: " + err.message);
      } finally {
          setIsExecutingSql(false);
      }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(sqlCode);
      alert("Script copiado! Cole no SQL Editor do Supabase.");
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
        <div className={`p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div>
                <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Biblioteca de Recursos</h2>
                <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Documentos, pautas e materiais de treinamento.</p>
            </div>
            {isAdmin && (
                <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.jpg,.png" />
                    <Button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white rounded-xl shadow-lg" disabled={isUploading}>
                        {isUploading ? 'Enviando...' : 'Upload de Arquivo'}
                    </Button>
                </div>
            )}
        </div>

        <div className="flex gap-2 overflow-x-auto custom-scrollbar">
            {/* FIX: update value from 'protocols' to 'protocol' */}
            <button onClick={() => setActiveTab('protocol')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all ${activeTab === 'protocol' ? 'bg-blue-600 text-white shadow-md' : isHospitalMode ? 'bg-[#212327] text-gray-400 border border-gray-800' : 'bg-white text-gray-500 border border-gray-200'}`}>Protocolos GVP</button>
            <button onClick={() => setActiveTab('training')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all ${activeTab === 'training' ? 'bg-blue-600 text-white shadow-md' : isHospitalMode ? 'bg-[#212327] text-gray-400 border border-gray-800' : 'bg-white text-gray-500 border border-gray-200'}`}>Treinamento</button>
            <button onClick={() => setActiveTab('pauta')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all ${activeTab === 'pauta' ? 'bg-blue-600 text-white shadow-md' : isHospitalMode ? 'bg-[#212327] text-gray-400 border border-gray-800' : 'bg-white text-gray-500 border border-gray-200'}`}>Pautas de Reunião</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.length === 0 ? (
                <div className={`col-span-full py-12 text-center border-2 border-dashed rounded-2xl ${isHospitalMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                    Nenhum documento nesta categoria.
                </div>
            ) : (
                filteredDocs.map(doc => (
                    <div key={doc.id} className={`p-4 rounded-xl border flex justify-between items-center ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-3 bg-red-100 text-red-600 rounded-lg shrink-0">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            </div>
                            <div className="min-w-0">
                                <p className={`font-bold truncate ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{doc.title}</p>
                                <p className="text-[10px] text-gray-500 uppercase">{new Date(doc.createdAt || '').toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <a href={doc.url} target="_blank" rel="noreferrer" className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Download">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </a>
                            {isAdmin && (
                                <button onClick={() => handleDelete(doc)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* ADMIN SECTION: SQL FIXER */}
        {isAdmin && (
            <div className={`mt-8 p-6 rounded-2xl border ${isHospitalMode ? 'bg-yellow-900/10 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}`}>
                <h3 className="text-lg font-bold text-yellow-700 mb-2">⚙️ Configuração de Banco de Dados (Admin)</h3>
                <p className={`text-sm mb-4 ${isHospitalMode ? 'text-yellow-600' : 'text-yellow-800'}`}>
                    Use esta ferramenta para corrigir erros de permissão (403/401) e criar tabelas/colunas faltantes (Schema Drift).
                </p>
                
                <div className="flex gap-3">
                    <Button onClick={handleExecuteSql} disabled={isExecutingSql} className="bg-yellow-600 text-white border-none shadow-md">
                        {isExecutingSql ? 'Executando...' : 'Aplicar Correções (Auto)'}
                    </Button>
                    <Button variant="secondary" onClick={copyToClipboard}>Copiar SQL (Manual)</Button>
                </div>

                {sqlResult && (
                    <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-xl text-xs font-mono border border-green-200">
                        {sqlResult}
                    </div>
                )}
                
                {sqlError && (
                    <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-xl text-xs font-mono border border-red-200 whitespace-pre-wrap">
                        {sqlError}
                    </div>
                )}
            </div>
        )}
    </div>
  );
};
