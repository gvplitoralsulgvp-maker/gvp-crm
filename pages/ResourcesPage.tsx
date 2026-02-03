
import React, { useState, useRef } from 'react';
import { AppState, AppDocument } from '../types';
import { Button } from '../components/Button';
import { uploadFile, atomicUpdate, atomicDelete } from '../services/storageService';

interface ResourcesPageProps {
  state: AppState;
  onUpdateState: React.Dispatch<React.SetStateAction<AppState>>;
  isHospitalMode?: boolean;
}

export const ResourcesPage: React.FC<ResourcesPageProps> = ({ state, onUpdateState, isHospitalMode }) => {
  const [activeTab, setActiveTab] = useState<'protocol' | 'training' | 'pauta'>('protocol');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if(!window.confirm("Deseja excluir este arquivo?")) return;
      try {
          await atomicDelete('documents', doc.id);
          // Note: In a real app we might also want to delete from storage, but atomicDelete only deletes from DB row.
          // We can add deleteFile(doc.filePath) if needed, but let's stick to state update.
          onUpdateState({ ...state, documents: state.documents.filter(d => d.id !== doc.id) });
      } catch(e) {
          alert("Erro ao excluir.");
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className={`p-6 rounded-2xl border flex justify-between items-center ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div>
                <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Central de Recursos</h2>
                <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Documentos e materiais de apoio.</p>
            </div>
            <div>
                <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept=".pdf,.doc,.docx,.jpg,.png" />
                <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-blue-600 text-white rounded-xl shadow-lg">
                    {isUploading ? 'Enviando...' : 'Upload Arquivo'}
                </Button>
            </div>
        </div>

        <div className="flex gap-2 overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveTab('protocol')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all ${activeTab === 'protocol' ? 'bg-blue-600 text-white shadow-md' : isHospitalMode ? 'bg-[#212327] text-gray-400 border border-gray-800' : 'bg-white text-gray-500 border border-gray-200'}`}>Protocolos GVP</button>
            <button onClick={() => setActiveTab('training')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all ${activeTab === 'training' ? 'bg-blue-600 text-white shadow-md' : isHospitalMode ? 'bg-[#212327] text-gray-400 border border-gray-800' : 'bg-white text-gray-500 border border-gray-200'}`}>Treinamento</button>
            <button onClick={() => setActiveTab('pauta')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all ${activeTab === 'pauta' ? 'bg-blue-600 text-white shadow-md' : isHospitalMode ? 'bg-[#212327] text-gray-400 border border-gray-800' : 'bg-white text-gray-500 border border-gray-200'}`}>Pautas de Reunião</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map(doc => (
                <div key={doc.id} className={`p-4 rounded-xl border flex flex-col justify-between group ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-white border-gray-100 hover:border-blue-200'}`}>
                    <div className="flex items-start gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div className="min-w-0">
                            <h4 className={`font-bold text-sm truncate ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`} title={doc.title}>{doc.title}</h4>
                            <p className="text-[10px] text-gray-500 uppercase">{new Date(doc.createdAt || '').toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <a href={doc.url} target="_blank" rel="noreferrer" className="flex-1 text-center py-2 rounded-lg bg-blue-600 text-white text-xs font-bold uppercase hover:bg-blue-700 transition-colors">Abrir</a>
                        <button onClick={() => handleDelete(doc)} className="px-3 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>
            ))}
            {filteredDocs.length === 0 && (
                <div className={`col-span-full py-12 text-center text-sm italic ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Nenhum documento encontrado nesta categoria.
                </div>
            )}
        </div>
    </div>
  );
};
