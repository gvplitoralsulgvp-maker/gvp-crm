
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, Patient } from '../types';
import { Button } from '../components/Button';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHospital, setFilterHospital] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient.name || !editingPatient.hospitalName) return;
    
    let newPatients = [...state.patients];
    if (editingPatient.id) {
      const idx = newPatients.findIndex(p => p.id === editingPatient.id);
      if (idx >= 0) newPatients[idx] = { ...newPatients[idx], ...editingPatient } as Patient;
    } else {
      newPatients.push({ 
        id: crypto.randomUUID(), 
        active: true, 
        admissionDate: new Date().toISOString().split('T')[0],
        ...editingPatient 
      } as Patient);
    }
    
    onUpdateState({ ...state, patients: newPatients });
    setIsFormOpen(false);
    setEditingPatient({});
  };

  const handleDischarge = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (window.confirm(`Deseja confirmar a ALTA HOSPITALAR de ${name}? O registro será movido imediatamente para o histórico.`)) {
      const updatedPatients = state.patients.map(p => 
        p.id === id ? { ...p, active: false } : p
      );
      
      onUpdateState({ 
        ...state, 
        patients: updatedPatients
      });
    }
  };

  const filteredPatients = useMemo(() => {
    // FILTRAGEM RIGOROSA DE ATIVOS
    return state.patients.filter(p => p.active && (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.treatment.toLowerCase().includes(searchTerm.toLowerCase())
    ) && (!filterHospital || p.hospitalName === filterHospital));
  }, [state.patients, searchTerm, filterHospital]);

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
            <Button className="rounded-full px-6" onClick={() => { setEditingPatient({
              hasDirectivesCard: false,
              agentsNotified: false,
              formsConsidered: false,
              hasS55: false,
              isIsolation: false,
              needsAccommodation: false
            }); setIsFormOpen(true); }}>+ Novo Paciente</Button>
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
          <div key={patient.id} className={`${isHospitalMode ? 'bg-[#212327] border-gray-800 shadow-black' : 'bg-white border-gray-200 shadow-sm'} rounded-3xl border overflow-hidden flex flex-col relative transition-all hover:shadow-xl`}>
            {patient.isIsolation && <div className="bg-red-600 text-white text-[10px] font-black text-center py-1.5 uppercase tracking-widest">⚠️ Isolamento: {patient.isolationType}</div>}
            <div className="p-6 flex-grow">
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

            <div className={`px-6 py-4 border-t flex justify-between items-center gap-2 ${isHospitalMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
               <button 
                type="button"
                onClick={(e) => handleDischarge(e, patient.id, patient.name)} 
                className="text-[10px] font-black text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl uppercase tracking-widest transition-all"
               >
                 Dar Alta
               </button>
               <button 
                type="button"
                onClick={() => { setEditingPatient(patient); setIsFormOpen(true); }} 
                className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl uppercase tracking-widest transition-all"
               >
                 Editar
               </button>
            </div>
          </div>
        ))}
        {filteredPatients.length === 0 && (
          <div className="col-span-full py-24 text-center">
            <p className="text-gray-400 italic mb-2">Nenhum paciente internado encontrado.</p>
            <Button variant="ghost" onClick={() => { setSearchTerm(''); setFilterHospital(''); }} className="text-xs font-bold text-blue-600">Limpar Filtros</Button>
          </div>
        )}
      </div>

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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-800/20">
                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2 block">Protocolo Ético</label>
                            {[
                                { key: 'hasDirectivesCard', label: 'Cartão de Diretivas' },
                                { key: 'agentsNotified', label: 'Procuradores Cientes' },
                                { key: 'hasS55', label: 'Considerou S-55' }
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
                                <span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>Precisa de Hospedagem?</span>
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-4 cursor-pointer group">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${editingPatient.isIsolation ? 'bg-red-600 border-red-600' : 'border-gray-300'}`}>
                                        <input type="checkbox" className="hidden" checked={editingPatient.isIsolation} onChange={e => setEditingPatient({...editingPatient, isIsolation: e.target.checked})} />
                                        {editingPatient.isIsolation && <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                                    </div>
                                    <span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>Isolamento?</span>
                                </label>
                                {editingPatient.isIsolation && (
                                    <input type="text" placeholder="Tipo (Ex: Contato)" className={`w-full border-2 p-2.5 rounded-xl text-[10px] font-black uppercase transition-all focus:border-red-600 outline-none ${isHospitalMode ? 'bg-red-900/10 border-red-900/40 text-red-400' : 'bg-red-50 border-red-100 text-red-700'}`} value={editingPatient.isolationType || ''} onChange={e => setEditingPatient({...editingPatient, isolationType: e.target.value})} />
                                )}
                            </div>
                         </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-8 border-t border-gray-800/20 shrink-0">
                          <Button variant="secondary" className="rounded-full px-8" type="button" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                          <Button className="rounded-full px-10 shadow-lg shadow-blue-500/30" type="submit">Salvar Paciente</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
