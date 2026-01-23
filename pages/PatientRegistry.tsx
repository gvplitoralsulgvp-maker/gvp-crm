
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
  
  // Lista local para remover pacientes da tela (Optimistic UI)
  const [optimisticArchived, setOptimisticArchived] = useState<Set<string>>(new Set());
  // Lista para animação de saída
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set());

  const isCoordinator = state.currentUser?.role === UserRole.COORDINATOR;
  const userRegional = state.currentUser?.regional;

  useEffect(() => {
      if (location.state && location.state.searchQuery) {
          setSearchQuery(location.state.searchQuery);
      }
  }, [location.state]);

  const activePatients = useMemo(() => {
      let patients = state.patients
        .filter(p => p.active && !optimisticArchived.has(p.id));

      if (isCoordinator && userRegional) {
          patients = patients.filter(p => p.regional === userRegional);
      }

      return patients.sort((a,b) => a.name.localeCompare(b.name));
  }, [state.patients, optimisticArchived, isCoordinator, userRegional]);

  const filteredPatients = useMemo(() => {
      if (!searchQuery) return activePatients;
      const lower = searchQuery.toLowerCase();
      return activePatients.filter(p => 
          p.name.toLowerCase().includes(lower) || 
          p.hospitalName?.toLowerCase().includes(lower) ||
          p.treatment?.toLowerCase().includes(lower)
      );
  }, [activePatients, searchQuery]);

  const availableHospitals = useMemo(() => {
      if (isCoordinator && userRegional) {
          return state.hospitals.filter(h => h.regional === userRegional);
      }
      return state.hospitals;
  }, [state.hospitals, isCoordinator, userRegional]);

  const animateAndArchive = (id: string, updatedPatients: Patient[]) => {
      setClosingIds(prev => new Set(prev).add(id));
      setTimeout(() => {
          setOptimisticArchived(prev => new Set(prev).add(id));
          onUpdateState({ ...state, patients: updatedPatients });
      }, 500);
  };

  // Lógica refatorada: Separação Alta Médica vs Arquivamento HLC-7
  const handleDischarge = async (id: string, name: string) => { 
      const patient = state.patients.find(p => p.id === id);
      if (!patient) return;

      const isColihUser = state.currentUser?.isColih || state.currentUser?.role === UserRole.ADMIN;

      try {
          // FASE 2: Paciente já teve alta médica, agora é o fechamento COLIH (HLC-7)
          if (patient.isMedicalDischarge) {
              if (!isColihUser) {
                  alert("Apenas membros da COLIH podem realizar o arquivamento definitivo (HLC-7).");
                  return;
              }
              if (window.confirm(`[PROTOCOLO COLIH]\n\nConfirma o envio do formulário HLC-7 para o caso de ${name}?\n\nIsso arquivará o paciente definitivamente.`)) {
                  // Prepara o objeto final atualizado
                  const archivedPatient = { 
                      ...patient, 
                      active: false,
                      gvpRequestPending: false, // Garante que a flag de solicitação seja removida
                      isMedicalDischarge: true  // Mantém histórico
                  };

                  // Atualiza estado local imediatamente (Optimistic)
                  const updatedPatients = state.patients.map(p => p.id === id ? archivedPatient : p);
                  animateAndArchive(id, updatedPatients);
                  setViewingPatientId(null);

                  // Persiste no banco
                  await atomicUpdate('patients', archivedPatient);
              }
              return;
          }

          // FASE 1: Informar Alta Médica (Disponível para GVP e COLIH)
          if (window.confirm(`Confirmar que ${name} teve ALTA MÉDICA do hospital?\n\nIsso removerá a solicitação de visita GVP, mas manterá o caso aberto para a COLIH (HLC-7).`)) {
              const dischargedPatient = { 
                  ...patient, 
                  isMedicalDischarge: true,
                  gvpRequestPending: false, // GVP sai de cena aqui
                  active: true, // Continua ativo aguardando COLIH
                  estimatedDischargeDate: new Date().toISOString() 
              };

              // Atualiza estado local
              const updatedPatients = state.patients.map(p => p.id === id ? dischargedPatient : p); 
              onUpdateState({ ...state, patients: updatedPatients });
              setViewingPatientId(null);

              // Persiste no banco
              await atomicUpdate('patients', dischargedPatient);
          }
      } catch (err: any) {
          console.error("Erro no processo de alta:", err);
          alert(`Erro ao salvar status do paciente: ${err.message}. Verifique se todas as colunas do banco de dados estão atualizadas.`);
          // Reverte o estado otimista se falhar (recarregando a página ou estado anterior seria ideal, mas alerta já ajuda)
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
              const adminIds = state.members.filter(m => m.role === UserRole.ADMIN || m.role === UserRole.COORDINATOR).map(m => m.id); 
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
      } catch (err: any) {
          console.error(err);
          alert(`Erro ao salvar paciente: ${err.message || 'Verifique o banco de dados.'}`);
      }
  };

  const viewingPatient = viewingPatientId ? state.patients.find(p => p.id === viewingPatientId) : null;

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
        <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-2xl border flex flex-col gap-4`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className={`text-xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Pacientes Ativos</h2>
                    <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Gestão de internados. {isCoordinator && userRegional && <span className="bg-purple-100 text-purple-700 px-2 rounded font-bold">{userRegional}</span>}
                    </p>
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
                            setEditingPatient({ active: true, spiritualStatus: 'Sim', regional: userRegional || '' }); 
                            setIsEditModalOpen(true); 
                        }}
                    >
                        + Novo
                    </Button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map(patient => {
                const isClosing = closingIds.has(patient.id);
                // Determina estilo baseado no estado
                const cardBorder = patient.isMedicalDischarge 
                    ? 'border-purple-300 ring-2 ring-purple-100' 
                    : (isHospitalMode ? 'border-gray-800 hover:border-gray-700' : 'border-gray-100 hover:border-blue-200');
                
                const cardBg = patient.isMedicalDischarge 
                    ? (isHospitalMode ? 'bg-purple-900/10' : 'bg-purple-50') 
                    : (isHospitalMode ? 'bg-[#212327]' : 'bg-white');

                return (
                    <div 
                        key={patient.id} 
                        onClick={() => setViewingPatientId(patient.id)}
                        className={`relative p-5 rounded-2xl border shadow-sm transition-all duration-500 cursor-pointer flex flex-col
                            ${cardBorder} ${cardBg}
                            ${isClosing ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}
                        `}
                    >
                        {patient.gvpRequestPending && !patient.isMedicalDischarge && (
                            <div className="absolute top-4 right-4 animate-pulse">
                                <span className="text-[9px] font-black uppercase bg-orange-100 text-orange-600 px-2 py-1 rounded border border-orange-200">Solicitação</span>
                            </div>
                        )}
                        {patient.isMedicalDischarge && (
                            <div className="absolute top-0 right-0 bg-purple-600 text-white px-3 py-1 rounded-bl-xl rounded-tr-xl">
                                <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    Alta Médica
                                </span>
                            </div>
                        )}
                        
                        <div className="mb-4 pr-16 pt-2">
                            <h3 className={`font-bold text-lg leading-tight ${isHospitalMode ? 'text-gray-100' : 'text-gray-800'} ${isPrivacyMode ? 'blur-sm select-none' : ''}`}>
                                {patient.name}
                            </h3>
                            <p className="text-blue-500 font-bold text-xs uppercase tracking-widest mt-1">
                                {patient.hospitalName}
                            </p>
                        </div>

                        {patient.isMedicalDischarge ? (
                            <div className={`p-3 rounded-xl mb-4 border border-dashed border-purple-300 ${isHospitalMode ? 'bg-purple-900/20' : 'bg-white'}`}>
                                <p className={`text-[10px] font-black uppercase text-center ${isHospitalMode ? 'text-purple-300' : 'text-purple-600'}`}>
                                    ⚠️ Pendente HLC-7 (COLIH)
                                </p>
                                <p className={`text-[9px] text-center mt-1 leading-tight ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    GVP encerrado. Aguardando fechamento administrativo.
                                </p>
                            </div>
                        ) : (
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
                        )}

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
                                    handleDischarge(patient.id, patient.name);
                                }}
                                className={`py-2 rounded-lg text-xs font-bold uppercase text-white hover:opacity-90 shadow-md ${patient.isMedicalDischarge ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                {patient.isMedicalDischarge ? 'HLC-7' : 'Alta'}
                            </button>
                        </div>
                    </div>
                );
            })}
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
                lastVisit={null}
                members={state.members}
                onDischarge={handleDischarge}
                onToggleGvp={handleToggleGvpRequest}
                isHospitalMode={isHospitalMode}
                canEdit={true}
                canDischarge={true}
                isColihUser={state.currentUser?.isColih}
            />
        )}

        {/* EDIT MODAL - ATUALIZADO COM AUTO-REGIONAL */}
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
                                <select 
                                    required 
                                    className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} 
                                    value={editingPatient.hospitalId || ''} 
                                    onChange={e => {
                                        const hId = e.target.value;
                                        const hospital = state.hospitals.find(h => h.id === hId);
                                        // AUTO-FILL REGIONAL based on Hospital
                                        setEditingPatient({
                                            ...editingPatient, 
                                            hospitalId: hId,
                                            regional: hospital?.regional || editingPatient.regional
                                        });
                                    }}
                                >
                                    <option value="">Selecione...</option>
                                    {availableHospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
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
