
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, Patient, UserRole, AppNotification } from '../types';
import { Button } from '../components/Button';
import { PatientDetailModal } from '../components/PatientDetailModal';
import { atomicUpdate } from '../services/storageService';

interface PatientRegistryProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  isPrivacyMode: boolean;
  isHospitalMode?: boolean;
}

export const PatientRegistry: React.FC<PatientRegistryProps> = ({ state, onUpdateState, isPrivacyMode, isHospitalMode }) => {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Partial<Patient>>({});
  
  // CORREÇÃO: Usar ID para garantir que o Modal sempre leia o dado mais atual da lista 'state.patients'
  const [viewingPatientId, setViewingPatientId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHospital, setFilterHospital] = useState('');

  // PERMISSÃO: Apenas Admins e Membros COLIH podem Editar/Adicionar
  const canEdit = state.currentUser?.role === UserRole.ADMIN || state.currentUser?.isColih;
  const isColihOrAdmin = state.currentUser?.role === UserRole.ADMIN || state.currentUser?.isColih;

  // Deriva o objeto do paciente em tempo real
  const viewingPatient = useMemo(() => {
      return state.patients.find(p => p.id === viewingPatientId) || null;
  }, [state.patients, viewingPatientId]);

  // Lista de membros COLIH para designação (Exclui Facilitadores)
  const colihMembers = useMemo(() => {
      return state.members.filter(m => 
        m.active && 
        (m.isColih || m.role === UserRole.ADMIN) && 
        m.colihClassification !== 'Facilitator'
      );
  }, [state.members]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient.name || !editingPatient.hospitalName) return;
    
    let newPatients = [...state.patients];
    let isNew = false;
    let savedPatient = null;

    if (editingPatient.id) {
      const idx = newPatients.findIndex(p => p.id === editingPatient.id);
      if (idx >= 0) {
          newPatients[idx] = { ...newPatients[idx], ...editingPatient } as Patient;
          savedPatient = newPatients[idx];
      }
    } else {
      isNew = true;
      savedPatient = { 
        id: crypto.randomUUID(), 
        active: true, 
        admissionDate: new Date().toISOString().split('T')[0],
        ...editingPatient 
      } as Patient;
      newPatients.push(savedPatient);
    }
    
    // Atualiza BD e Estado Local
    try {
        if (savedPatient) {
            await atomicUpdate('patients', savedPatient);
            
            // Se for novo, notifica os admins
            if (isNew) {
                const adminIds = state.members.filter(m => m.role === UserRole.ADMIN).map(m => m.id);
                const notifications: AppNotification[] = adminIds.map(adminId => ({
                    id: crypto.randomUUID(),
                    userId: adminId,
                    message: `🏥 Paciente Internado: ${savedPatient?.name} em ${savedPatient?.hospitalName}.`,
                    type: 'info',
                    read: false,
                    timestamp: new Date().toISOString()
                }));
                
                await Promise.all(notifications.map(n => atomicUpdate('notifications', n)));
                onUpdateState({ 
                    ...state, 
                    patients: newPatients,
                    notifications: [...notifications, ...state.notifications]
                });
            } else {
                onUpdateState({ ...state, patients: newPatients });
            }
        }
    } catch (error) {
        console.error("Erro ao salvar paciente:", error);
        alert("Erro ao salvar dados.");
    }
    
    setIsFormOpen(false);
    setEditingPatient({});
  };

  // Esta função agora lida com a "Alta Médica" (física), mas não necessariamente arquiva o caso
  // ATUALIZAÇÃO: Agora também remove a flag gvpRequestPending
  const handleDischarge = (e: React.MouseEvent | null, id: string, name: string) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation(); 
    }
    
    if (window.confirm(`Confirmar que ${name} teve ALTA MÉDICA (saiu do hospital)?\n\nPara membros GVP, o paciente sairá da lista. Para a COLIH, ficará pendente do HLC-7.`)) {
      const updatedPatients = state.patients.map(p => 
        p.id === id ? { 
            ...p, 
            isMedicalDischarge: true, 
            gvpRequestPending: false, // Remove a flag de solicitação para GVP
            estimatedDischargeDate: new Date().toISOString() 
        } : p
      );
      
      const p = updatedPatients.find(p => p.id === id);
      if (p) atomicUpdate('patients', p);

      onUpdateState({ 
        ...state, 
        patients: updatedPatients
      });
      
      // Se estiver vendo no modal, fecha o modal
      setViewingPatientId(null);
    }
  };

  // Nova função exclusiva para COLIH arquivar o caso após HLC-7
  const handleHlc7Archive = (id: string, name: string) => {
      if (window.confirm(`Confirma o envio do HLC-7 para o caso de ${name}?\n\nIsso irá arquivar o paciente definitivamente no histórico.`)) {
          const updatedPatients = state.patients.map(p => 
              p.id === id ? { ...p, active: false } : p
          );
          const p = updatedPatients.find(p => p.id === id);
          if (p) atomicUpdate('patients', p);

          onUpdateState({ ...state, patients: updatedPatients });
          setViewingPatientId(null);
      }
  };

  const handleToggleGvpRequest = async (patient: Patient) => {
      // Confirmação antes de agir
      const willEnable = !patient.gvpRequestPending;
      const confirmMessage = willEnable 
        ? `Deseja marcar a BANDEIRA DE SOLICITAÇÃO para ${patient.name}?\n\nIsso alertará os coordenadores.`
        : `Deseja remover a solicitação de visita para ${patient.name}?`;

      if (!window.confirm(confirmMessage)) return;

      try {
          const updatedPatient = { ...patient, gvpRequestPending: willEnable };
          
          // ATUALIZAÇÃO IMEDIATA DO ESTADO GLOBAL
          // Como o Modal usa 'viewingPatientId', ele vai reagir a essa mudança automaticamente
          const updatedList = state.patients.map(p => p.id === patient.id ? updatedPatient : p);
          
          let newNotifications: AppNotification[] = [];
          if (willEnable) {
              const adminIds = state.members.filter(m => m.role === UserRole.ADMIN).map(m => m.id);
              newNotifications = adminIds.map(adminId => ({
                  id: crypto.randomUUID(),
                  userId: adminId,
                  message: `🆘 Solicitação COLIH: Paciente ${patient.name} precisa de visita GVP.`,
                  type: 'warning',
                  read: false,
                  timestamp: new Date().toISOString()
              }));
          }

          onUpdateState({ 
              ...state, 
              patients: updatedList,
              notifications: [...newNotifications, ...state.notifications] 
          });

          // Persistência Assíncrona
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
      const current = editingPatient.assignedColihIds || [];
      if (current.includes(memberId)) {
          setEditingPatient({ ...editingPatient, assignedColihIds: current.filter(id => id !== memberId) });
      } else {
          setEditingPatient({ ...editingPatient, assignedColihIds: [...current, memberId] });
      }
  };

  const filteredPatients = useMemo(() => {
    // FILTRAGEM RIGOROSA DE ATIVOS
    return state.patients.filter(p => {
        // 1. Deve estar ativo no sistema (active = true)
        if (!p.active) return false;

        // 2. Filtro de Alta Médica (GVP vs COLIH)
        // Se o usuário NÃO for COLIH/Admin, ele não vê pacientes que já tiveram alta médica.
        if (!isColihOrAdmin && p.isMedicalDischarge) return false;

        // 3. Filtros de Texto
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              p.treatment.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesHospital = !filterHospital || p.hospitalName === filterHospital;

        return matchesSearch && matchesHospital;
    });
  }, [state.patients, searchTerm, filterHospital, isColihOrAdmin]);

  const uniqueHospitals = useMemo(() => {
      const fromRoutes = state.routes.flatMap(r => r.hospitals || []);
      const fromList = state.hospitals.map(h => h.name);
      return Array.from(new Set([...fromRoutes, ...fromList])).sort();
  }, [state.routes, state.hospitals]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800 shadow-black' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-3xl border space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Pacientes Internados</h2>
            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Gestão e monitoramento de diretivas.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="rounded-full px-6" onClick={() => navigate('/history')}>Ver Altas</Button>
            {canEdit && (
                <Button className="rounded-full px-6" onClick={() => { setEditingPatient({
                hasDirectivesCard: false,
                agentsNotified: false,
                formsConsidered: false,
                hasS55: false,
                isIsolation: false,
                needsAccommodation: false,
                nonWitnessFamily: false,
                spiritualStatus: 'Sim',
                assignedColihIds: []
                }); setIsFormOpen(true); }}>+ Novo Paciente</Button>
            )}
          </div>
        </div>
        <div className={`pt-4 border-t ${isHospitalMode ? 'border-gray-800' : 'border-gray-100'} grid grid-cols-1 sm:grid-cols-2 gap-4`}>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar por nome ou tratamento..." 
                className={`w-full text-sm rounded-2xl border p-3 pl-10 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100 text-gray-800'}`} 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <select 
              className={`w-full text-sm rounded-2xl border p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100 text-gray-800'}`} 
              value={filterHospital} 
              onChange={(e) => setFilterHospital(e.target.value)}
            >
                <option value="">Todos os Hospitais</option>
                {uniqueHospitals.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
        {filteredPatients.map(patient => (
          <div 
            key={patient.id} 
            onClick={() => setViewingPatientId(patient.id)}
            className={`${isHospitalMode ? 'bg-[#212327] border-gray-800 shadow-black' : 'bg-white border-gray-200 shadow-sm'} rounded-3xl border overflow-hidden flex flex-col relative transition-all hover:shadow-xl cursor-pointer active:scale-95`}
          >
            {patient.isIsolation && <div className="bg-red-600 text-white text-[10px] font-black text-center py-1.5 uppercase tracking-widest">⚠️ Isolamento: {patient.isolationType}</div>}
            
            {patient.isMedicalDischarge ? (
                <div className="bg-purple-600 text-white text-[10px] font-black text-center py-1.5 uppercase tracking-widest">Alta Médica • Pendente HLC-7</div>
            ) : (
                patient.gvpRequestPending && <div className="bg-orange-500 text-white text-[10px] font-black text-center py-1.5 uppercase tracking-widest">Solicitação GVP Ativa</div>
            )}
            
            <div className="p-6 flex-grow pointer-events-none">
              <div className="flex justify-between items-start mb-4">
                 <div>
                   <h3 className={`font-black text-lg leading-tight ${isPrivacyMode ? 'blur-sm select-none' : ''} ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{patient.name}</h3>
                   <p className={`text-[10px] mt-1 font-black uppercase tracking-widest ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}>{patient.hospitalName}</p>
                 </div>
                 {patient.needsAccommodation && <span className="p-1 bg-orange-500 rounded-lg text-white" title="Precisa de Hospedagem"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg></span>}
              </div>
              
              <div className={`p-3 rounded-2xl mb-4 ${isHospitalMode ? 'bg-black/20' : 'bg-gray-50'}`}>
                  <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400 mb-1">
                    <span>Localização</span>
                    <span className={isHospitalMode ? 'text-gray-300' : 'text-gray-900'}>{patient.floor || '-'} / {patient.bed || '-'}</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{patient.treatment}</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                 {patient.hasDirectivesCard && <span className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black uppercase shadow-sm">Diretivas</span>}
                 {patient.agentsNotified && <span className="text-[8px] bg-green-600 text-white px-2 py-0.5 rounded-full font-black uppercase shadow-sm">Procurador</span>}
                 {patient.hasS55 && <span className="text-[8px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-black uppercase shadow-sm">S-55</span>}
              </div>
            </div>

            {/* BOTÕES DE AÇÃO NA LISTA */}
            <div className={`px-6 py-4 border-t flex justify-between items-center gap-2 ${isHospitalMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`} onClick={e => e.stopPropagation()}>
                {patient.isMedicalDischarge ? (
                    canEdit && (
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleHlc7Archive(patient.id, patient.name); }} 
                            className="w-full text-[10px] font-black text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl uppercase tracking-widest transition-all shadow-md"
                        >
                            ✓ Confirmar HLC-7 Enviado
                        </button>
                    )
                ) : (
                    <>
                        {/* Botão Alta - Liberado para todos (simulando canDischarge) */}
                        <button 
                            type="button"
                            onClick={(e) => handleDischarge(e, patient.id, patient.name)} 
                            className="text-[10px] font-black text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl uppercase tracking-widest transition-all flex-1 border border-transparent hover:border-red-200"
                        >
                            Informar Alta
                        </button>
                        
                        {/* Botão Editar - Restrito a Admins/COLIH */}
                        {canEdit && (
                            <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setEditingPatient(patient); setIsFormOpen(true); }} 
                                className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl uppercase tracking-widest transition-all flex-1 border border-transparent hover:border-blue-200"
                            >
                                Editar
                            </button>
                        )}
                    </>
                )}
            </div>
          </div>
        ))}
        {filteredPatients.length === 0 && (
          <div className="col-span-full py-24 text-center">
            <p className="text-gray-400 italic mb-2">Nenhum paciente encontrado.</p>
            <Button variant="ghost" onClick={() => { setSearchTerm(''); setFilterHospital(''); }} className="text-xs font-bold text-blue-600">Limpar Filtros</Button>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Paciente */}
      {viewingPatient && (
        <PatientDetailModal
            isOpen={true}
            onClose={() => setViewingPatientId(null)}
            patient={viewingPatient}
            lastVisit={
                state.visits
                    .filter(v => v.status === 'FINISHED' && v.report)
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .find(v => {
                        const r = state.routes.find(route => route.id === v.routeId);
                        return r && r.hospitals && viewingPatient.hospitalName && r.hospitals.includes(viewingPatient.hospitalName);
                    }) || null
            }
            members={state.members}
            // onDischarge aqui trata da alta médica
            onDischarge={(id, name) => handleDischarge(null, id, name)}
            // Nova prop para o modal lidar com o HLC-7
            onHlc7Confirm={(id, name) => handleHlc7Archive(id, name)}
            onToggleGvp={handleToggleGvpRequest}
            isHospitalMode={isHospitalMode}
            canEdit={canEdit}
            canDischarge={true} // Permite alta para todos que acessam esta tela
            isColihUser={isColihOrAdmin}
        />
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO INTERNO (Mantido igual) */}
      {isFormOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
              <div className={`w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                  <div className="bg-blue-600 p-6 text-white font-black flex justify-between items-center shrink-0">
                      <span className="text-xl">{editingPatient.id ? 'Editar Cadastro' : 'Nova Internação'}</span>
                      <button onClick={() => setIsFormOpen(false)} className="text-4xl leading-none font-light hover:rotate-90 transition-transform">&times;</button>
                  </div>
                  <form onSubmit={handleSave} className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Nome do Paciente</label>
                              <input required type="text" className={`w-full border-2 p-3 rounded-2xl text-sm transition-all focus:border-blue-600 outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingPatient.name || ''} onChange={e => setEditingPatient({...editingPatient, name: e.target.value})} />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Unidade Hospitalar</label>
                              <select required className={`w-full border-2 p-3 rounded-2xl text-sm transition-all focus:border-blue-600 outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingPatient.hospitalName || ''} onChange={e => setEditingPatient({...editingPatient, hospitalName: e.target.value})}>
                                  <option value="">Selecione...</option>
                                  {uniqueHospitals.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                          </div>
                      </div>

                      <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Tratamento / Observação</label>
                          <input type="text" className={`w-full border-2 p-3 rounded-2xl text-sm transition-all focus:border-blue-600 outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingPatient.treatment || ''} onChange={e => setEditingPatient({...editingPatient, treatment: e.target.value})} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-500 uppercase px-1">Email</label>
                              <input type="email" className={`w-full border-2 p-3 rounded-2xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingPatient.email || ''} onChange={e => setEditingPatient({...editingPatient, email: e.target.value})} />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-500 uppercase px-1">Congregação</label>
                              <input type="text" className={`w-full border-2 p-3 rounded-2xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingPatient.congregation || ''} onChange={e => setEditingPatient({...editingPatient, congregation: e.target.value})} />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-500 uppercase px-1">Nome Acompanhante / Parentesco</label>
                              <input type="text" className={`w-full border-2 p-3 rounded-2xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingPatient.companionName || ''} onChange={e => setEditingPatient({...editingPatient, companionName: e.target.value})} placeholder="Ex: Maria (Esposa)" />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-500 uppercase px-1">Telefone Acompanhante</label>
                              <input type="tel" className={`w-full border-2 p-3 rounded-2xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingPatient.companionPhone || ''} onChange={e => setEditingPatient({...editingPatient, companionPhone: e.target.value})} />
                          </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-500 uppercase px-1">Andar</label>
                              <input type="text" className={`w-full border-2 p-3 rounded-2xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingPatient.floor || ''} onChange={e => setEditingPatient({...editingPatient, floor: e.target.value})} />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-500 uppercase px-1">Ala</label>
                              <input type="text" className={`w-full border-2 p-3 rounded-2xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingPatient.wing || ''} onChange={e => setEditingPatient({...editingPatient, wing: e.target.value})} />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-500 uppercase px-1">Leito</label>
                              <input type="text" className={`w-full border-2 p-3 rounded-2xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingPatient.bed || ''} onChange={e => setEditingPatient({...editingPatient, bed: e.target.value})} />
                          </div>
                      </div>

                      <div className={`p-4 rounded-xl border-2 ${isHospitalMode ? 'bg-teal-900/10 border-teal-900/30' : 'bg-teal-50 border-teal-100'}`}>
                          <h4 className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-3">Gestão de Caso COLIH</h4>
                          <p className="text-xs text-gray-500 mb-3">Selecione os membros COLIH designados para acompanhar este caso especificamente.</p>
                          <div className="max-h-40 overflow-y-auto custom-scrollbar border rounded-xl p-2 bg-white/50">
                              {colihMembers.length === 0 ? (
                                  <p className="text-xs text-gray-400 p-2">Nenhum membro COLIH ativo encontrado.</p>
                              ) : (
                                  colihMembers.map(member => (
                                      <label key={member.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
                                          <input 
                                            type="checkbox" 
                                            className="rounded text-teal-600 focus:ring-teal-500"
                                            checked={(editingPatient.assignedColihIds || []).includes(member.id)}
                                            onChange={() => toggleAssignedColih(member.id)}
                                          />
                                          <span className="text-xs font-bold text-gray-700">{member.name}</span>
                                          {member.role === UserRole.ADMIN && <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 rounded font-bold uppercase">Admin</span>}
                                      </label>
                                  ))
                              )}
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-800/20">
                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2 block">Protocolo Ético</label>
                            {[
                                { key: 'hasDirectivesCard', label: 'Cartão de Diretivas' },
                                { key: 'agentsNotified', label: 'Procuradores Cientes' },
                                { key: 'hasS55', label: 'Considerou S-55' },
                                { key: 'nonWitnessFamily', label: 'Família não TJ envolvida?' }
                            ].map(item => (
                                <label key={item.key} className="flex items-center gap-4 cursor-pointer group">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${(editingPatient as any)[item.key] ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                        <input type="checkbox" className="hidden" checked={(editingPatient as any)[item.key]} onChange={e => setEditingPatient({...editingPatient, [item.key]: e.target.checked})} />
                                        {(editingPatient as any)[item.key] && <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                                    </div>
                                    <span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.label}</span>
                                </label>
                            ))}
                         </div>

                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-2 block">Alertas</label>
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${editingPatient.needsAccommodation ? 'bg-orange-600 border-orange-600' : 'border-gray-300'}`}>
                                    <input type="checkbox" className="hidden" checked={editingPatient.needsAccommodation} onChange={e => setEditingPatient({...editingPatient, needsAccommodation: e.target.checked})} />
                                    {editingPatient.needsAccommodation && <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                                </div>
                                <span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>Necessita Hospedagem</span>
                            </label>
                            
                            <div className="pt-2">
                                <label className={`text-[10px] font-bold uppercase mb-2 block ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Precaução / Isolamento</label>
                                <div className="flex gap-2">
                                    <label className={`flex-1 p-2 rounded-lg border text-center cursor-pointer transition-all ${!editingPatient.isIsolation ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-400'}`}>
                                        <input type="radio" name="isolation" className="hidden" checked={!editingPatient.isIsolation} onChange={() => setEditingPatient({...editingPatient, isIsolation: false, isolationType: ''})} />
                                        <span className="text-[10px] font-black uppercase">Padrão</span>
                                    </label>
                                    <label className={`flex-1 p-2 rounded-lg border text-center cursor-pointer transition-all ${editingPatient.isIsolation ? 'bg-red-500 text-white border-red-500' : 'border-gray-300 text-gray-400'}`}>
                                        <input type="radio" name="isolation" className="hidden" checked={editingPatient.isIsolation || false} onChange={() => setEditingPatient({...editingPatient, isIsolation: true, isolationType: 'Contato'})} />
                                        <span className="text-[10px] font-black uppercase">Isolamento</span>
                                    </label>
                                </div>
                                {editingPatient.isIsolation && (
                                    <input 
                                        type="text" 
                                        className={`w-full mt-2 border-2 p-2 rounded-xl text-xs ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`} 
                                        placeholder="Tipo (Ex: Contato, Respiratório...)" 
                                        value={editingPatient.isolationType || ''} 
                                        onChange={e => setEditingPatient({...editingPatient, isolationType: e.target.value})} 
                                    />
                                )}
                            </div>
                         </div>
                      </div>

                      <div className="pt-6">
                          <Button className="w-full rounded-2xl py-4 font-black" type="submit">Salvar Paciente</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
