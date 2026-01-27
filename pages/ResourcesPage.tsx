
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AppState, AppDocument, UserRole } from '../types';
import { Button } from '../components/Button';
import { atomicUpdate, atomicDelete, uploadFile, deleteFile } from '../services/storageService';
import { ConfirmModal } from '../components/ConfirmModal';

export const ResourcesPage: React.FC<{ state: AppState, onUpdateState: (s: AppState) => void, isHospitalMode?: boolean }> = ({ state, onUpdateState, isHospitalMode }) => {
  const [activeTab, setActiveTab] = useState<'protocol' | 'training' | 'pauta'>('protocol');
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // Modal de Confirmação
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, description: string, onConfirm: () => void} | null>(null);

  // Upload Form State
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'protocol' | 'training' | 'pauta'>('protocol');

  const isAdmin = state.currentUser?.role === UserRole.ADMIN;

  const filteredDocs = state.documents.filter(d => d.category === activeTab);

  const handleUpload = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file || !title) {
          alert("Por favor, preencha o título e selecione um arquivo.");
          return;
      }
      
      setIsUploading(true);
      try {
          const { path, url } = await uploadFile(file, category);
          
          const newDoc: AppDocument = {
              id: crypto.randomUUID(),
              title,
              category,
              url,
              filePath: path,
              contentType: file.type,
              createdAt: new Date().toISOString()
          };

          await atomicUpdate('documents', newDoc);
          onUpdateState({ ...state, documents: [...state.documents, newDoc] });
          
          setIsModalOpen(false);
          setFile(null);
          setTitle('');
          alert("Upload realizado com sucesso!");
      } catch (err: any) {
          console.error(err);
          // Se erro de permissão, sugerir ajuda
          if (err.message && err.message.includes("403")) {
              if (confirm("Erro de Permissão (403). Deseja ver como corrigir isso no Supabase?")) {
                  setIsHelpOpen(true);
              }
          } else {
              alert("Erro no upload: " + (err.message || "Erro desconhecido"));
          }
      } finally {
          setIsUploading(false);
      }
  };

  const handleDelete = (doc: AppDocument) => {
      setConfirmConfig({
          isOpen: true,
          title: 'Excluir Documento',
          description: `Tem certeza que deseja excluir o documento "${doc.title}"? Esta ação é irreversível.`,
          onConfirm: async () => {
              try {
                  await deleteFile(doc.filePath);
                  await atomicDelete('documents', doc.id);
                  onUpdateState({ ...state, documents: state.documents.filter(d => d.id !== doc.id) });
                  setConfirmConfig(null);
              } catch (err) {
                  alert("Erro ao excluir.");
              }
          }
      });
  };

  // SQL ATUALIZADO: Inclui ALTER TABLE para patients e colih_visits
  const sqlCode = `
-- Execute este bloco COMPLETO no SQL Editor do Supabase.
-- Ele corrige permissões de upload e cria/atualiza as tabelas necessárias.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE VISITAS COLIH (Garante que existe e tem as colunas)
CREATE TABLE IF NOT EXISTS public.colih_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID,
    hospital_id UUID,
    date DATE NOT NULL,
    member_ids TEXT[] DEFAULT '{}',
    notes TEXT,
    interaction_type TEXT,
    status TEXT DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- CORREÇÃO DE COLUNAS FALTANTES (Erro "Could not find column")
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS hospital_id UUID;
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS doctor_id UUID;
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS hlc38_presented BOOLEAN DEFAULT FALSE;
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS collaborator_interest BOOLEAN DEFAULT FALSE;
ALTER TABLE public.colih_visits ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'SCHEDULED';

-- CORREÇÃO PARA PACIENTES (Erro PGRST204 em patients)
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS regional TEXT;

-- 2. CONFIGURAÇÃO DE STORAGE (Corrige erro 403 no upload)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resources', 'resources', true, 52428800, null)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Limpeza de Policies antigas
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;

-- Policies Permissivas
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'resources' );
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT TO public WITH CHECK ( bucket_id = 'resources' );
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE TO public USING ( bucket_id = 'resources' );
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE TO public USING ( bucket_id = 'resources' );
`;

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
        <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
            <div>
                <h2 className={`text-xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Central de Recursos</h2>
                <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Documentação oficial e materiais de treinamento.</p>
            </div>
            {isAdmin && (
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsHelpOpen(true)} 
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase border transition-all ${isHospitalMode ? 'border-gray-700 text-gray-400 hover:text-white hover:border-white' : 'border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400'}`}
                    >
                        ⚙️ Configurar BD/Storage
                    </button>
                    <Button onClick={() => setIsModalOpen(true)} className="rounded-xl shadow-lg bg-blue-600 text-white">
                        + Enviar Arquivo
                    </Button>
                </div>
            )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200/20 overflow-x-auto custom-scrollbar">
            <button 
                onClick={() => setActiveTab('protocol')} 
                className={`pb-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'protocol' ? 'border-b-2 border-purple-500 text-purple-500' : 'text-gray-400 hover:text-gray-300'}`}
            >
                Protocolos & HLC
            </button>
            <button 
                onClick={() => setActiveTab('training')} 
                className={`pb-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'training' ? 'border-b-2 border-teal-500 text-teal-500' : 'text-gray-400 hover:text-gray-300'}`}
            >
                Treinamento & Vídeos
            </button>
            <button 
                onClick={() => setActiveTab('pauta')} 
                className={`pb-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'pauta' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-400 hover:text-gray-300'}`}
            >
                Pautas & Atas
            </button>
        </div>

        {/* Lista de Documentos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map(doc => (
                <div key={doc.id} className={`group relative p-5 rounded-2xl border transition-all hover:shadow-lg ${isHospitalMode ? 'bg-[#212327] border-gray-800 hover:border-gray-700' : 'bg-white border-gray-100 hover:border-blue-200'}`}>
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl shrink-0 ${doc.contentType?.includes('pdf') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {doc.contentType?.includes('pdf') 
                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                }
                            </svg>
                        </div>
                        <div className="flex-grow min-w-0">
                            <h3 className={`font-bold text-sm truncate ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{doc.title}</h3>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tight">
                                {new Date(doc.createdAt || '').toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                        <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex-grow py-2 rounded-lg text-center text-xs font-bold uppercase transition-all ${isHospitalMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
                        >
                            Visualizar / Baixar
                        </a>
                        {isAdmin && (
                            <button 
                                onClick={() => handleDelete(doc)}
                                className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        )}
                    </div>
                </div>
            ))}
            {filteredDocs.length === 0 && (
                <div className="col-span-full py-12 text-center opacity-50">
                    <p className={`text-sm ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Nenhum documento nesta categoria.</p>
                </div>
            )}
        </div>

        {/* Modal de Upload */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                    <div className="bg-blue-600 px-6 py-5 flex justify-between items-center">
                        <h3 className="text-white font-bold">Upload de Material</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-white text-2xl leading-none">&times;</button>
                    </div>
                    <form onSubmit={handleUpload} className="p-6 space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Título do Documento</label>
                            <input 
                                required 
                                className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`}
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Ex: Pauta Reunião Abril"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Categoria</label>
                            <select 
                                className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`}
                                value={category}
                                onChange={e => setCategory(e.target.value as any)}
                            >
                                <option value="protocol">Protocolos / Formulários</option>
                                <option value="training">Treinamento</option>
                                <option value="pauta">Pautas & Atas</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Arquivo (PDF, Imagem)</label>
                            <input 
                                required 
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.png"
                                className={`w-full p-2 border rounded-xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-gray-400' : 'bg-gray-50'}`}
                                onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                            />
                        </div>
                        <div className="pt-4 flex gap-3">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button" className="flex-1">Cancelar</Button>
                            <Button disabled={isUploading} type="submit" className="flex-1">
                                {isUploading ? 'Enviando...' : 'Fazer Upload'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Modal de Confirmação */}
        {confirmConfig && (
            <ConfirmModal 
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(null)}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                description={confirmConfig.description}
                isDestructive={true}
                isHospitalMode={isHospitalMode}
            />
        )}

        {/* Modal de Ajuda Configuração SQL */}
        {isHelpOpen && createPortal(
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                <div className={`w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                    <div className="bg-gray-800 px-6 py-5 flex justify-between items-center text-white">
                        <div>
                            <h3 className="font-bold text-lg">Configuração do Banco de Dados</h3>
                            <p className="text-gray-400 text-xs uppercase tracking-widest">Correção de Tabelas e Permissões</p>
                        </div>
                        <button onClick={() => setIsHelpOpen(false)} className="text-white hover:text-gray-300 text-2xl leading-none">&times;</button>
                    </div>
                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-sm text-yellow-800">
                            <p className="font-bold mb-1">Instruções:</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Copie o código SQL abaixo.</li>
                                <li>Vá ao seu painel do Supabase.</li>
                                <li>Clique em <strong>SQL Editor</strong> no menu lateral.</li>
                                <li>Cole o código e clique em <strong>Run</strong>.</li>
                            </ol>
                        </div>
                        <div className="relative">
                            <pre className="bg-black text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-gray-700">
                                {sqlCode}
                            </pre>
                            <button 
                                onClick={() => { navigator.clipboard.writeText(sqlCode); alert("Código copiado!"); }}
                                className="absolute top-2 right-2 bg-white text-black px-3 py-1 text-[10px] font-bold uppercase rounded shadow hover:bg-gray-200"
                            >
                                Copiar SQL
                            </button>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => setIsHelpOpen(false)}>Fechar</Button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )}
    </div>
  );
};
