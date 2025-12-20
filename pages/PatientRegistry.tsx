
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

  const filteredPatients = useMemo(() => {
    return state.patients.filter(p => p.active && (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.treatment.toLowerCase().includes(searchTerm.toLowerCase())
    ) && (!filterHospital || p.hospitalName === filterHospital));
  }, [state.patients, searchTerm, filterHospital]);

  const uniqueHospitals = Array.from(new Set(state.routes.flatMap(r => r.hospitals))).sort();

  return (
    <div className="space-y-6">
      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-200'} p-4 rounded-lg shadow-sm border space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Pacientes Internados</h2>
            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Gestão de internações ativas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/history')}>Histórico</Button>
            <Button onClick={() => { setEditingPatient({
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
            <input type="text" placeholder="Buscar por nome..." className={`w-full text-sm rounded-md shadow-sm p-2 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-white border-gray-300'}`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <select className={`w-full text-sm rounded-md shadow-sm p-2 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-white border-gray-300'}`} value={filterHospital} onChange={(e) => setFilterHospital(e.target.value)}>
                <option value="">Todos os Hospitais</option>
                {uniqueHospitals.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map(patient => (
          <div key={patient.id} className={`${isHospitalMode ? 'bg-[#212327] border-gray-800 shadow-black' : 'bg-white border-gray-200 shadow-sm'} rounded-lg border overflow-hidden flex flex-col relative transition-transform hover:scale-[1.02]`}>
            {patient.isIsolation && <div className="bg-red-900/80 text-white text-[10px] font-bold text-center py-1 uppercase">⚠️ Isolamento: {patient.isolationType}</div>}
            <div className={`h-1 ${patient.needsAccommodation ? 'bg-orange-500' : 'bg-blue-500'}`} />
            <div className="p-4 flex-grow">
              <h3 className={`font-bold text-lg ${isPrivacyMode ? 'blur-sm' : ''} ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{patient.name}</h3>
              <p className={`text-xs mt-1 font-bold ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}>{patient.hospitalName}</p>
              <div className="mt-4 space-y-2">
                  <p className={`text-sm ${isHospitalMode ? 'text-gray-300' : 'text-gray-600'}`}><span className="font-semibold">Andar/Leito:</span> {patient.floor} {patient.bed}</p>
                  <p className={`text-sm ${isHospitalMode ? 'text-gray-300' : 'text-gray-600'}`}><span className="font-semibold">Tratamento:</span> {patient.treatment}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-1">
                 {patient.hasDirectivesCard && <span className="text-[8px] bg-green-500/10 text-green-500 px-1 rounded font-bold border border-green-500/20 uppercase">Diretivas</span>}
                 {patient.agentsNotified && <span className="text-[8px] bg-blue-500/10 text-blue-500 px-1 rounded font-bold border border-blue-500/20 uppercase">Procurador</span>}
                 {patient.hasS55 && <span className="text-[8px] bg-purple-500/10 text-purple-500 px-1 rounded font-bold border border-purple-500/20 uppercase">S-55</span>}
              </div>
            </div>
            <div className={`px-4 py-2 border-t flex justify-end gap-2 ${isHospitalMode ? 'bg-[#1a1c1e]/50 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
               <button onClick={() => { setEditingPatient(patient); setIsFormOpen(true); }} className="text-sm text-blue-500 hover:underline">Editar</button>
            </div>
          </div>
        ))}
      </div>

      {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <div className={`w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327]' : 'bg-white'}`}>
                  <div className="bg-blue-600 p-4 text-white font-bold flex justify-between items-center shrink-0">
                      <span>{editingPatient.id ? 'Editar Paciente' : 'Novo Registro'}</span>
                      <button onClick={() => setIsFormOpen(false)} className="text-2xl leading-none">&times;</button>
                  </div>
                  <form onSubmit={handleSave} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Nome Completo</label>
                              <input required type="text" className={`w-full border p-2 rounded-lg text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-white border-gray-200'}`} value={editingPatient.name || ''} onChange={e => setEditingPatient({...editingPatient, name: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Hospital</label>
                              <select required className={`w-full border p-2 rounded-lg text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-white border-gray-200'}`} value={editingPatient.hospitalName || ''} onChange={e => setEditingPatient({...editingPatient, hospitalName: e.target.value})}>
                                  <option value="">Selecione...</option>
                                  {uniqueHospitals.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                          </div>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Tratamento / Diagnóstico</label>
                          <input type="text" className={`w-full border p-2 rounded-lg text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-white border-gray-200'}`} value={editingPatient.treatment || ''} onChange={e => setEditingPatient({...editingPatient, treatment: e.target.value})} />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Andar</label>
                              <input type="text" className={`w-full border p-2 rounded-lg text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-white border-gray-200'}`} value={editingPatient.floor || ''} onChange={e => setEditingPatient({...editingPatient, floor: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Ala/Winge</label>
                              <input type="text" className={`w-full border p-2 rounded-lg text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-white border-gray-200'}`} value={editingPatient.wing || ''} onChange={e => setEditingPatient({...editingPatient, wing: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Leito</label>
                              <input type="text" className={`w-full border p-2 rounded-lg text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-white border-gray-200'}`} value={editingPatient.bed || ''} onChange={e => setEditingPatient({...editingPatient, bed: e.target.value})} />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-800/30">
                         <div className="space-y-3">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status de Documentação</label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600" checked={editingPatient.hasDirectivesCard} onChange={e => setEditingPatient({...editingPatient, hasDirectivesCard: e.target.checked})} />
                                <span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>Tem Cartão de Diretivas?</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600" checked={editingPatient.agentsNotified} onChange={e => setEditingPatient({...editingPatient, agentsNotified: e.target.checked})} />
                                <span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>Procurador Avisado?</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600" checked={editingPatient.hasS55} onChange={e => setEditingPatient({...editingPatient, hasS55: e.target.checked})} />
                                <span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>Considerou S-55?</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600" checked={editingPatient.formsConsidered} onChange={e => setEditingPatient({...editingPatient, formsConsidered: e.target.checked})} />
                                <span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>S-401 / S-407?</span>
                            </label>
                         </div>

                         <div className="space-y-3">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Outros</label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-orange-600" checked={editingPatient.needsAccommodation} onChange={e => setEditingPatient({...editingPatient, needsAccommodation: e.target.checked})} />
                                <span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>Precisa de Hospedagem?</span>
                            </label>
                            <div className="pt-2">
                                <label className="flex items-center gap-3 cursor-pointer group mb-2">
                                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-red-600" checked={editingPatient.isIsolation} onChange={e => setEditingPatient({...editingPatient, isIsolation: e.target.checked})} />
                                    <span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>Em Isolamento?</span>
                                </label>
                                {editingPatient.isIsolation && (
                                    <input type="text" placeholder="Tipo (ex: Contato)" className={`w-full border p-2 rounded-lg text-[10px] uppercase font-bold ${isHospitalMode ? 'bg-red-900/10 border-red-900/40 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`} value={editingPatient.isolationType || ''} onChange={e => setEditingPatient({...editingPatient, isolationType: e.target.value})} />
                                )}
                            </div>
                         </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-6 border-t border-gray-800 shrink-0">
                          <Button variant="secondary" type="button" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                          <Button type="submit">Salvar Paciente</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
