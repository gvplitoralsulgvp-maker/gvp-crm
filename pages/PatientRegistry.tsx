
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppState, Patient, Member, AppNotification, UserRole, ALL_REGIONALS } from '../types';
import { Button } from '../components/Button';
import { PatientDetailModal } from '../components/PatientDetailModal';
import { atomicUpdate } from '../services/storageService';
import { useLocation } from 'react-router-dom';

interface PatientRegistryProps {
  state: AppState;
  onUpdateState: (state: AppState) => void;
  isPrivacyMode: boolean;
  isHospitalMode?: boolean;
}

export const PatientRegistry: React.FC<PatientRegistryProps> = ({ state, onUpdateState, isPrivacyMode, isHospitalMode }) => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingPatientId, setViewingPatientId] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<Partial<Patient> | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Lista local para remover pacientes da tela INSTANTANEAMENTE (Optimistic UI)
  const [optimisticArchived, setOptimisticArchived] = useState<Set<string>>(new Set());

  useEffect(() => {
      if (location.state && location.state.searchQuery) {
          setSearchQuery(location.state.searchQuery);
      }
  }, [location.state]);

  const activePatients = useMemo(() => {
      // Filtra pacientes ativos que NÃO foram arquivados localmente nesta sessão
      return state.patients
        .filter(p => p.active && !optimisticArchived.has(p.id))
        .sort((a,b) => a.name.localeCompare(b.name));
  }, [state.patients, optimisticArchived]);

  const filteredPatients = useMemo(() => {
      if (!searchQuery) return activePatients;
      const lower = searchQuery.toLowerCase();
      return activePatients.filter(p => 
          p.name.toLowerCase().includes(lower) || 
          p.hospitalName?.toLowerCase().includes(lower) ||
          p.treatment?.toLowerCase().includes(lower)
      );
  }, [activePatients, searchQuery]);

  const handleDischarge = async (id: string, name: string) => { 
      const isColih = state.currentUser?.isColih || state.currentUser?.role === UserRole.ADMIN;
      
      // Fluxo 1: Confirmação Básica de Alta Médica
      if (!window.confirm(`Confirmar que ${name} teve ALTA MÉDICA do hospital?`)) {
          return;
      }

      let shouldArchive = true;

      // Fluxo 2: Verificação Específica COLIH (HLC-7)
      if (isColih) {
          // Pergunta explícita sobre o formulário
          if (window.confirm(`[PROTOCOLO COLIH]\n\nO formulário HLC-7 já foi enviado/concluído para o caso de ${name}?`)) {
              // Sim, HLC-7 enviado -> Arquivar completamente
              shouldArchive = true;
          } else {
              // Não, HLC-7 pendente -> Manter na lista mas marcar como Alta Médica
              shouldArchive = false;
              alert(`O paciente ${name} permanecerá na lista ativa com a marcação de 'Alta Médica'.\n\nIsso permite que você finalize o HLC-7 posteriormente clicando no botão roxo.`);
          }
      }

      // Se for arquivar, adiciona ao Set otimista IMEDIATAMENTE para sumir da tela
      if (shouldArchive) {
          setOptimisticArchived(prev => new Set(prev).add(id));
      }

      // Atualização do Estado Global
      const updatedPatients = state.patients.map(p => p.id === id ? { 
          ...p, 
          active: !shouldArchive, 
          isMedicalDischarge: true, // Sempre true pois teve alta médica
          gvpRequestPending: false, 
          estimatedDischargeDate: new Date().toISOString() 
      } : p); 
      
      // Atualiza estado global (mesmo com delay do servidor, o optimismo segura a UI)
      onUpdateState({ ...state, patients: updatedPatients }); 
      setViewingPatientId(null); 

      // Persistência em background
      const p = updatedPatients.find(p => p.id === id); 
      if (p) await atomicUpdate('patients', p); 
  };

  const handleHlc7Archive = async (id: string, name: string) => { 
      if (window.confirm(`Confirma o envio do HLC-7 para o caso de ${name}?\n\nIsso irá arquivar o paciente definitivamente no histórico.`)) { 
          // Otimismo: Remove da tela agora
          setOptimisticArchived(prev => new Set(prev).add(id));

          const updatedPatients = state.patients.map(p => p.id === id ? { ...p, active: false } : p); 
          onUpdateState({ ...state, patients: updatedPatients }); 
          setViewingPatientId(null); 

          const p = updatedPatients.find(p => p.id === id); 
          if (p) await atomicUpdate('patients', p); 
      } 
  };

  const handleToggleGvpRequest = async (patient: Patient) => { 
      const willEnable = !patient.gvpRequestPending; 
      const confirmMessage = willEnable ? `Deseja marcar a BANDEIRA DE SOLICITAÇÃO para ${patient.name}?\n\nIsso alertará os coordenadores.` : `Deseja remover a solicitação de visita para ${patient.name}?`; 
      if (!window.confirm(confirmMessage)) return; 
      try { 
          const updatedPatient = { ...patient, gvpRequestPending: willEnable }; 
          const updatedList = state.patients.map(p => p.id === patient.id ? updatedPatient : p); 
          let newNotifications: AppNotification[] = []; 
          if (willEnable) { 
              const adminIds = state.members.filter(m => m.role === UserRole.ADMIN).map(m => m.id); 
              newNotifications = adminIds.map(adminId => ({ id: crypto.randomUUID(), userId: adminId, message: `🆘 Solicitação COLIH: Paciente ${patient.name} precisa de visita GVP.`, type: 'warning', read: false, timestamp: new Date().toISOString() })); 
          } 
          onUpdateState({ ...state, patients: updatedList, notifications: [...newNotifications, ...state.notifications] }); 
          await atomicUpdate('patients', updatedPatient); 
          if (willEnable) { 
              await Promise.all(newNotifications.map(n => atomicUpdate('notifications', n))); 
          } 
      } catch (e) { 
          console.error(e); 
          alert("Erro ao atualizar solicitação. Verifique sua conexão."); 
      } 
  };

  const toggleAssignedColih = (memberId: string) => { 
      if (!editingPatient) return;
      const current = editingPatient.assignedColihIds || []; 
      if (current.includes(memberId)) { 
          setEditingPatient({ ...editingPatient, assignedColihIds: current.filter(id => id !== memberId) }); 
      } else { 
          setEditingPatient({ ...editingPatient, assignedColihIds: [...current, memberId] }); 
      } 
  };

  const handleSavePatient = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingPatient || !editingPatient.name) return;
      
      const newPatient: Patient = {
          ...editingPatient,
          id: editingPatient.id || crypto.randomUUID(),
          active: editingPatient.active !== undefined ? editingPatient.active : true,
          hospitalId: editingPatient.hospitalId || '',
          hospitalName: state.hospitals.find(h => h.id === editingPatient.hospitalId)?.name || 'Desconhecido',
          admissionDate: editingPatient.admissionDate || new Date().toISOString().split('T')[0],
          treatment: editingPatient.treatment || '',
      } as Patient;

      try {
          await atomicUpdate('patients', newPatient);
          const updatedPatients = state.patients.some(p => p.id === newPatient.id) 
            ? state.patients.map(p => p.id === newPatient.id ? newPatient : p)
            : [...state.patients, newPatient];
          
          onUpdateState({ ...state, patients: updatedPatients });
          setIsEditModalOpen(false);
          setEditingPatient(null);
      } catch (err) {
          alert("Erro ao salvar paciente.");
      }
  };

  const viewingPatient = viewingPatientId ? state.patients.find(p => p.id === viewingPatientId) : null;

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
        <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-2xl border flex flex-col gap-4`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className={`text-xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Pacientes Ativos</h2>
                    <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Gestão de internados e solicitações.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <input 
                        type="text" 
                        placeholder="Buscar paciente ou hospital..." 
                        className={`flex-grow md:w-64 p-2.5 rounded-xl border-2 text-sm outline-none focus:border-blue-500 transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`} 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                    />
                    <Button 
                        className="bg-blue-600 hover:bg-blue-700 rounded-xl" 
                        onClick={() => { 
                            setEditingPatient({ active: true, spiritualStatus: 'Sim' }); 
                            setIsEditModalOpen(true); 
                        }}
                    >
                        + Novo
                    </Button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map(patient => (
                <div 
                    key={patient.id} 
                    onClick={() => setViewingPatientId(patient.id)}
                    className={`relative p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md flex flex-col cursor-pointer ${isHospitalMode ? 'bg-[#212327] border-gray-800 hover:border-gray-700' : 'bg-white border-gray-100 hover:border-blue-200'}`}
                >
                    {patient.gvpRequestPending && !patient.isMedicalDischarge && (
                        <div className="absolute top-4 right-4 animate-pulse">
                            <span className="text-[9px] font-black uppercase bg-orange-100 text-orange-600 px-2 py-1 rounded border border-orange-200">Solicitação</span>
                        </div>
                    )}
                    {patient.isMedicalDischarge && (
                        <div className="absolute top-4 right-4">
                            <span className="text-[9px] font-black uppercase bg-purple-100 text-purple-600 px-2 py-1 rounded border border-purple-200">Alta / HLC-7 Pendente</span>
                        </div>
                    )}
                    
                    <div className="mb-4 pr-16">
                        <h3 className={`font-bold text-lg leading-tight ${isHospitalMode ? 'text-gray-100' : 'text-gray-800'} ${isPrivacyMode ? 'blur-sm select-none' : ''}`}>
                            {patient.name}
                        </h3>
                        <p className="text-blue-500 font-bold text-xs uppercase tracking-widest mt-1">
                            {patient.hospitalName}
                        </p>
                    </div>

                    <div className={`p-3 rounded-xl mb-4 space-y-2 ${isHospitalMode ? 'bg-black/20' : 'bg-gray-50'}`}>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 font-bold uppercase">Internação</span>
                            <span className={`font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {new Date(patient.admissionDate).toLocaleDateString()}
                            </span>
                        </div>
                        {patient.treatment && (
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500 font-bold uppercase">Tratamento</span>
                                <span className={`font-bold truncate max-w-[120px] ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {patient.treatment}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setEditingPatient(patient); setIsEditModalOpen(true); }}
                            className={`py-2 rounded-lg text-xs font-bold uppercase border ${isHospitalMode ? 'border-gray-700 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                        >
                            Editar
                        </button>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                if (patient.isMedicalDischarge) {
                                    handleHlc7Archive(patient.id, patient.name);
                                } else {
                                    handleDischarge(patient.id, patient.name);
                                }
                            }}
                            className={`py-2 rounded-lg text-xs font-bold uppercase text-white hover:opacity-90 ${patient.isMedicalDischarge ? 'bg-purple-600' : 'bg-green-600'}`}
                        >
                            {patient.isMedicalDischarge ? 'Finalizar HLC-7' : 'Alta'}
                        </button>
                    </div>
                </div>
            ))}
            {filteredPatients.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400">
                    <p className="text-sm font-bold uppercase tracking-widest">Nenhum paciente encontrado</p>
                </div>
            )}
        </div>

        {/* DETAILS MODAL */}
        {viewingPatient && (
            <PatientDetailModal 
                isOpen={true}
                onClose={() => setViewingPatientId(null)}
                patient={viewingPatient}
                lastVisit={null} // Could populate from visits array if needed
                members={state.members}
                onDischarge={handleDischarge}
                onHlc7Confirm={handleHlc7Archive}
                onToggleGvp={handleToggleGvpRequest}
                isHospitalMode={isHospitalMode}
                canEdit={true}
                canDischarge={true}
                isColihUser={state.currentUser?.isColih}
            />
        )}

        {/* EDIT MODAL */}
        {isEditModalOpen && editingPatient && createPortal(
            <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className={`w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                    <div className="bg-blue-600 px-6 py-5 flex justify-between items-center shrink-0">
                        <h3 className="text-white font-bold text-lg">{editingPatient.id ? 'Editar Paciente' : 'Novo Paciente'}</h3>
                        <button onClick={() => { setIsEditModalOpen(false); setEditingPatient(null); }} className="text-white hover:text-blue-200 text-2xl leading-none">&times;</button>
                    </div>
                    <form onSubmit={handleSavePatient} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-gray-500">Nome Completo</label>
                            <input required className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.name || ''} onChange={e => setEditingPatient({...editingPatient, name: e.target.value})} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-500">Hospital</label>
                                <select required className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.hospitalId || ''} onChange={e => setEditingPatient({...editingPatient, hospitalId: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {state.hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-500">Regional</label>
                                <select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.regional || ''} onChange={e => setEditingPatient({...editingPatient, regional: e.target.value})}>
                                    <option value="">Automática</option>
                                    {ALL_REGIONALS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-500">Quarto/Leito</label>
                                <div className="flex gap-2">
                                    <input placeholder="Quarto" className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.room || ''} onChange={e => setEditingPatient({...editingPatient, room: e.target.value})} />
                                    <input placeholder="Leito" className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.bed || ''} onChange={e => setEditingPatient({...editingPatient, bed: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-500">Admissão</label>
                                <input type="date" required className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.admissionDate || ''} onChange={e => setEditingPatient({...editingPatient, admissionDate: e.target.value})} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-gray-500">Tratamento / Diagnóstico</label>
                            <input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.treatment || ''} onChange={e => setEditingPatient({...editingPatient, treatment: e.target.value})} />
                        </div>

                        <div className="space-y-2 pt-2 border-t border-gray-200/20">
                            <label className="text-[10px] font-bold uppercase text-gray-500">Designar Membros COLIH</label>
                            <div className={`border rounded-xl max-h-40 overflow-y-auto custom-scrollbar p-2 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50'}`}>
                                {state.members.filter(m => m.isColih && m.active).sort((a,b) => a.name.localeCompare(b.name)).map(m => (
                                    <label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 cursor-pointer transition-all ${editingPatient.assignedColihIds?.includes(m.id) ? 'bg-blue-100' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            checked={editingPatient.assignedColihIds?.includes(m.id) || false}
                                            onChange={() => toggleAssignedColih(m.id)}
                                        />
                                        <div>
                                            <span className={`text-xs font-bold block ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.name}</span>
                                            <span className="text-[8px] font-bold uppercase text-gray-400 tracking-wider">{m.colihClassification || 'Membro'}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="secondary" onClick={() => { setIsEditModalOpen(false); setEditingPatient(null); }}>Cancelar</Button>
                            <Button type="submit">Salvar Paciente</Button>
                        </div>
                    </form>
                </div>
            </div>,
            document.body
        )}
    </div>
  );
};
