
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AppState, Patient, UserRole, Hospital } from '../types';
import { Button } from '../components/Button';
import { atomicUpdate, atomicDelete } from '../services/storageService';
import { ConfirmModal } from '../components/ConfirmModal';
import { PatientDetailModal } from '../components/PatientDetailModal';

interface PatientRegistryProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  isPrivacyMode: boolean;
  isHospitalMode?: boolean;
}

export const PatientRegistry: React.FC<PatientRegistryProps> = ({ state, onUpdateState, isPrivacyMode, isHospitalMode }) => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Partial<Patient>>({});
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, description: string, onConfirm: () => void} | null>(null);

  // Initialize search from location state if available (from GlobalSearch)
  useEffect(() => {
    if (location.state && location.state.searchQuery) {
        setSearchTerm(location.state.searchQuery);
    }
  }, [location.state]);

  const activePatients = useMemo(() => {
    let list = state.patients.filter(p => p.active);
    
    // Filter by Regional for Coordinators
    if (state.currentUser?.role === UserRole.COORDINATOR && state.currentUser.regional) {
        list = list.filter(p => !p.regional || p.regional === state.currentUser?.regional);
    }

    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(lower) || p.hospitalName?.toLowerCase().includes(lower));
    }
    // Sort by name
    return list.sort((a,b) => a.name.localeCompare(b.name));
  }, [state.patients, searchTerm, state.currentUser]);

  const availableHospitals = useMemo(() => {
      let list = state.hospitals;
      if (state.currentUser?.role === UserRole.COORDINATOR && state.currentUser.regional) {
          list = list.filter(h => !h.regional || h.regional === state.currentUser.regional);
      }
      return list.sort((a,b) => a.name.localeCompare(b.name));
  }, [state.hospitals, state.currentUser]);

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingPatient.name || !editingPatient.hospitalId) {
          alert("Nome e Hospital são obrigatórios.");
          return;
      }

      const hospital = state.hospitals.find(h => h.id === editingPatient.hospitalId);
      
      const newPatient: Patient = {
          id: editingPatient.id || crypto.randomUUID(),
          name: editingPatient.name,
          hospitalId: editingPatient.hospitalId,
          hospitalName: hospital ? hospital.name : editingPatient.hospitalName || 'Desconhecido',
          admissionDate: editingPatient.admissionDate || new Date().toISOString().split('T')[0],
          active: editingPatient.active !== undefined ? editingPatient.active : true,
          
          // Optional fields
          room: editingPatient.room || '',
          bed: editingPatient.bed || '',
          floor: editingPatient.floor || '',
          wing: editingPatient.wing || '',
          treatment: editingPatient.treatment || '',
          notes: editingPatient.notes || '',
          
          phone: editingPatient.phone || '',
          email: editingPatient.email || '',
          age: editingPatient.age || '',
          gender: editingPatient.gender || '',
          companionName: editingPatient.companionName || '',
          companionPhone: editingPatient.companionPhone || '',
          localElder: editingPatient.localElder || '',
          elderPhone: editingPatient.elderPhone || '',
          congregation: editingPatient.congregation || '',

          spiritualStatus: editingPatient.spiritualStatus || 'Sim',
          nonWitnessFamily: editingPatient.nonWitnessFamily || false,
          hasDirectivesCard: editingPatient.hasDirectivesCard || false,
          hasS55: editingPatient.hasS55 || false,
          formsConsidered: editingPatient.formsConsidered || false,
          agentsNotified: editingPatient.agentsNotified || false,
          
          visitTime: editingPatient.visitTime || '',
          isSurgical: editingPatient.isSurgical || false,
          surgeryDate: editingPatient.surgeryDate,
          clinicalStatus: editingPatient.clinicalStatus || '',
          
          gvpRequestPending: editingPatient.gvpRequestPending || false,
          isMedicalDischarge: editingPatient.isMedicalDischarge || false,
          estimatedDischargeDate: editingPatient.estimatedDischargeDate,
          needsAccommodation: editingPatient.needsAccommodation || false,
          isExternalRequest: editingPatient.isExternalRequest || false,
          requestDate: editingPatient.requestDate,
          
          isIsolation: editingPatient.isIsolation || false,
          isolationType: editingPatient.isolationType || '',

          assignedColihIds: editingPatient.assignedColihIds || [],
          regional: editingPatient.regional || (hospital ? hospital.regional : undefined)
      };

      try {
          await atomicUpdate('patients', newPatient);
          const updatedList = editingPatient.id 
            ? state.patients.map(p => p.id === newPatient.id ? newPatient : p)
            : [newPatient, ...state.patients];
          
          onUpdateState({ ...state, patients: updatedList });
          setIsModalOpen(false);
          setEditingPatient({});
      } catch (err: any) {
          alert(`Erro ao salvar: ${err.message}`);
      }
  };

  const handleEdit = (p: Patient) => {
      setEditingPatient(p);
      setIsModalOpen(true);
  };

  const handleDelete = (p: Patient) => {
      setConfirmConfig({
          isOpen: true,
          title: 'Excluir Paciente',
          description: `Tem certeza que deseja excluir ${p.name}? Para manter o histórico, use a opção de "Alta" dentro do prontuário. Excluir removerá todos os dados permanentemente.`,
          onConfirm: async () => {
              try {
                  await atomicDelete('patients', p.id);
                  onUpdateState({ ...state, patients: state.patients.filter(pat => pat.id !== p.id) });
              } catch (e) {
                  alert("Erro ao excluir.");
              }
          }
      });
  };

  const handleDischarge = async (id: string, name: string) => {
      const p = state.patients.find(pat => pat.id === id);
      if (!p) return;
      
      const updated = { ...p, active: false, isMedicalDischarge: true, estimatedDischargeDate: new Date().toISOString() };
      
      try {
          await atomicUpdate('patients', updated);
          onUpdateState({ ...state, patients: state.patients.map(pat => pat.id === id ? updated : pat) });
          setViewingPatient(null);
      } catch (e) {
          alert("Erro ao dar alta.");
      }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
         <div>
            <h2 className={`text-xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Cadastro de Pacientes</h2>
            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Pacientes ativos e internados.
                {state.currentUser?.role === UserRole.COORDINATOR && state.currentUser.regional && (
                    <span className="ml-2 bg-blue-100 text-blue-700 px-2 rounded font-bold text-xs uppercase">{state.currentUser.regional}</span>
                )}
            </p>
         </div>
         <div className="flex gap-2">
            <Button onClick={() => { setEditingPatient({ active: true, spiritualStatus: 'Sim', admissionDate: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }} className="rounded-xl shadow-lg">
                + Novo Paciente
            </Button>
         </div>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por nome ou hospital..."
          className={`w-full border-2 rounded-2xl p-4 pl-12 text-sm outline-none transition-all ${
              isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white focus:border-blue-600' : 'bg-white border-gray-100 focus:border-blue-500'
          }`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-800/10">
                  <thead className={`text-[10px] font-black uppercase tracking-widest ${isHospitalMode ? 'bg-[#1a1c1e] text-gray-500' : 'bg-gray-50/50 text-gray-400'}`}>
                      <tr>
                          <th className="px-6 py-4 text-left">Paciente</th>
                          <th className="px-6 py-4 text-left">Hospital / Local</th>
                          <th className="px-6 py-4 text-left">Detalhes</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                  </thead>
                  <tbody className={`divide-y text-sm ${isHospitalMode ? 'divide-gray-800 text-gray-300' : 'divide-gray-100 text-gray-700'}`}>
                      {activePatients.map(p => (
                          <tr key={p.id} className={`${isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'} cursor-pointer`} onClick={() => setViewingPatient(p)}>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${p.isIsolation ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}>
                                          {p.name.substring(0,2).toUpperCase()}
                                      </div>
                                      <div>
                                          <p className={`font-bold ${isPrivacyMode ? 'blur-sm select-none' : ''}`}>{p.name}</p>
                                          <p className="text-[10px] text-gray-500">{p.age ? `${p.age} • ` : ''}{p.congregation || 'Congr. não inf.'}</p>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <p className="font-bold text-xs">{p.hospitalName}</p>
                                  <p className="text-[10px] text-gray-500 uppercase">
                                      {p.floor && `Andar ${p.floor}`} {p.room && `• Quarto ${p.room}`} {p.bed && `• Leito ${p.bed}`}
                                  </p>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-1">
                                      {p.isIsolation && <span className="px-2 py-0.5 rounded bg-red-100 text-red-600 text-[9px] font-black uppercase">Isolamento</span>}
                                      {p.gvpRequestPending && <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-600 text-[9px] font-black uppercase">Solicitação</span>}
                                      {p.needsAccommodation && <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-600 text-[9px] font-black uppercase">Hospedagem</span>}
                                      {(!p.isIsolation && !p.gvpRequestPending && !p.needsAccommodation) && <span className="text-[10px] text-gray-400">-</span>}
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                  <div className="flex justify-end gap-2">
                                      <button onClick={() => handleEdit(p)} className="text-blue-500 hover:text-blue-600 font-bold text-xs uppercase p-2 hover:bg-blue-50 rounded">Editar</button>
                                      {(state.currentUser?.role === UserRole.ADMIN || state.currentUser?.role === UserRole.COORDINATOR) && (
                                          <button onClick={() => handleDelete(p)} className="text-red-500 hover:text-red-600 p-2 hover:bg-red-50 rounded">
                                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                          </button>
                                      )}
                                  </div>
                              </td>
                          </tr>
                      ))}
                      {activePatients.length === 0 && (
                          <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-xs italic">Nenhum paciente encontrado.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {viewingPatient && (
          <PatientDetailModal 
              isOpen={true}
              onClose={() => setViewingPatient(null)}
              patient={viewingPatient}
              lastVisit={null} // Can be improved to find last visit
              members={state.members}
              onDischarge={handleDischarge}
              isHospitalMode={isHospitalMode}
              canEdit={state.currentUser?.role === UserRole.ADMIN || state.currentUser?.role === UserRole.COORDINATOR || state.currentUser?.isColih}
              canDischarge={true}
              isColihUser={state.currentUser?.isColih}
          />
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
             <div className={`w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-blue-600 px-6 py-5 flex justify-between items-center shrink-0">
                    <h3 className="text-white font-bold text-lg">{editingPatient.id ? 'Editar Paciente' : 'Novo Paciente'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-blue-200 text-2xl leading-none">&times;</button>
                </div>
                
                <form onSubmit={handleSave} className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-grow">
                    {/* Basic Info */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-blue-500 tracking-widest border-b border-gray-200/10 pb-1">Identificação & Local</h4>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-gray-500">Nome Completo</label>
                            <input required className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.name || ''} onChange={e => setEditingPatient({...editingPatient, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-500">Hospital</label>
                                <select required className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.hospitalId || ''} onChange={e => setEditingPatient({...editingPatient, hospitalId: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {availableHospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-500">Data Internação</label>
                                <input type="date" className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.admissionDate || ''} onChange={e => setEditingPatient({...editingPatient, admissionDate: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <input placeholder="Andar" className={`p-3 border rounded-xl outline-none text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.floor || ''} onChange={e => setEditingPatient({...editingPatient, floor: e.target.value})} />
                            <input placeholder="Quarto" className={`p-3 border rounded-xl outline-none text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.room || ''} onChange={e => setEditingPatient({...editingPatient, room: e.target.value})} />
                            <input placeholder="Leito" className={`p-3 border rounded-xl outline-none text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.bed || ''} onChange={e => setEditingPatient({...editingPatient, bed: e.target.value})} />
                        </div>
                    </div>

                    {/* Clinical Info */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-blue-500 tracking-widest border-b border-gray-200/10 pb-1">Dados Clínicos</h4>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-gray-500">Diagnóstico / Tratamento</label>
                            <input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.treatment || ''} onChange={e => setEditingPatient({...editingPatient, treatment: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-500">Isolamento?</label>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" className="w-5 h-5" checked={editingPatient.isIsolation || false} onChange={e => setEditingPatient({...editingPatient, isIsolation: e.target.checked})} />
                                    <input placeholder="Tipo (ex: Covid, Bactéria)" className={`flex-grow p-2 border rounded-lg text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} disabled={!editingPatient.isIsolation} value={editingPatient.isolationType || ''} onChange={e => setEditingPatient({...editingPatient, isolationType: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-gray-500">Precisa Hospedagem?</label>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg"><input type="checkbox" className="w-5 h-5" checked={editingPatient.needsAccommodation || false} onChange={e => setEditingPatient({...editingPatient, needsAccommodation: e.target.checked})} /><span className={`text-sm ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>Sim, solicitar</span></label>
                            </div>
                        </div>
                    </div>

                    {/* Spiritual & Contacts - Reusing the snippet logic */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-blue-500 tracking-widest border-b border-gray-200/10 pb-1">Espiritual & Contatos</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Congregação</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.congregation || ''} onChange={e => setEditingPatient({...editingPatient, congregation: e.target.value})} /></div>
                            <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Boa condição?</label><select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.spiritualStatus || 'Sim'} onChange={e => setEditingPatient({...editingPatient, spiritualStatus: e.target.value})}><option value="Sim">Sim</option><option value="Não">Não</option><option value="Desconhecido">Não sei</option></select></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Ancião</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.localElder || ''} onChange={e => setEditingPatient({...editingPatient, localElder: e.target.value})} placeholder="Nome" /></div>
                            <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Tel Ancião</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.elderPhone || ''} onChange={e => setEditingPatient({...editingPatient, elderPhone: e.target.value})} placeholder="Tel" /></div>
                        </div>
                        
                        {/* Contacts */}
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Acompanhante</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.companionName || ''} onChange={e => setEditingPatient({...editingPatient, companionName: e.target.value})} placeholder="Nome (Parentesco)" /></div>
                            <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Tel Acompanhante</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingPatient.companionPhone || ''} onChange={e => setEditingPatient({...editingPatient, companionPhone: e.target.value})} /></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={editingPatient.hasDirectivesCard || false} onChange={e => setEditingPatient({...editingPatient, hasDirectivesCard: e.target.checked})} /><span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>Possui DPA?</span></label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={editingPatient.nonWitnessFamily || false} onChange={e => setEditingPatient({...editingPatient, nonWitnessFamily: e.target.checked})} /><span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>Família não TJ envolvida?</span></label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={editingPatient.hasS55 || false} onChange={e => setEditingPatient({...editingPatient, hasS55: e.target.checked})} /><span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>Considerou S-55?</span></label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={editingPatient.formsConsidered || false} onChange={e => setEditingPatient({...editingPatient, formsConsidered: e.target.checked})} /><span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>Considerou S-401/S-407?</span></label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200/10">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
                        <Button type="submit">Salvar Paciente</Button>
                    </div>
                </form>
             </div>
          </div>,
          document.body
      )}

      {/* CONFIRMATION MODAL */}
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
    </div>
  );
};
