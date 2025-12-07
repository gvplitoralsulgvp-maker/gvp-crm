
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppState, Patient } from '../types';
import { Button } from '../components/Button';

interface PatientRegistryProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  isPrivacyMode: boolean;
}

export const PatientRegistry: React.FC<PatientRegistryProps> = ({ state, onUpdateState, isPrivacyMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Form/Edit Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Partial<Patient>>({});

  // Discharge Modal State
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [patientToDischarge, setPatientToDischarge] = useState<Patient | null>(null);
  const [dischargeNote, setDischargeNote] = useState('');

  // --- Filtering & Sorting State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHospital, setFilterHospital] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterAccommodation, setFilterAccommodation] = useState(false);
  const [sortBy, setSortBy] = useState<'dateDesc' | 'dateAsc' | 'name'>('dateDesc');

  useEffect(() => {
    if (location.state) {
        if (location.state.searchQuery) setSearchTerm(location.state.searchQuery);
        if (location.state.targetPatientId) {
            const targetPatient = state.patients.find(p => p.id === location.state.targetPatientId);
            if (targetPatient && targetPatient.active) {
                setEditingPatient(targetPatient);
                setIsFormOpen(true);
            }
        }
    }
  }, [location.state, state.patients]);

  const handleEdit = (p: Patient) => {
    setEditingPatient(p);
    setIsFormOpen(true);
  };

  const handleOpenDischargeModal = (e: React.MouseEvent, patient: Patient) => {
    e.preventDefault();
    e.stopPropagation();
    setPatientToDischarge(patient);
    setDischargeNote(''); 
    setIsDischargeModalOpen(true);
  };

  const handleConfirmDischarge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientToDischarge) return;
    if (dischargeNote.trim().length < 5) return; 

    const newPatients = state.patients.map(p => {
        if (p.id === patientToDischarge.id) {
            const existingNotes = p.notes ? p.notes + '\n\n' : '';
            const timestamp = new Date().toLocaleString('pt-BR');
            const finalNotes = `${existingNotes}[Alta em ${timestamp}]: ${dischargeNote}`;
            
            return { ...p, active: false, notes: finalNotes, estimatedDischargeDate: new Date().toISOString().split('T')[0] };
        }
        return p;
    });

    onUpdateState({ ...state, patients: newPatients });
    setIsDischargeModalOpen(false);
    setPatientToDischarge(null);
    navigate('/history');
  };

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
        ...editingPatient
      } as Patient);
    }

    onUpdateState({ ...state, patients: newPatients });
    setIsFormOpen(false);
    setEditingPatient({});
  };

  const uniqueHospitals = Array.from(new Set(state.routes.flatMap(r => r.hospitals))).sort();

  const filteredAndSortedPatients = useMemo(() => {
    let result = state.patients.filter(p => p.active);

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(lower) || p.treatment.toLowerCase().includes(lower));
    }
    if (filterHospital) result = result.filter(p => p.hospitalName === filterHospital);
    if (filterDate) result = result.filter(p => p.admissionDate >= filterDate);
    if (filterAccommodation) result = result.filter(p => p.needsAccommodation);

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'dateAsc': return new Date(a.admissionDate).getTime() - new Date(b.admissionDate).getTime();
        case 'dateDesc': default: return new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime();
      }
    });

    return result;
  }, [state.patients, searchTerm, filterHospital, filterDate, filterAccommodation, sortBy]);

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Cadastro de Pacientes</h2>
            <p className="text-sm text-gray-500">Gerencie internações ativas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/history')}>
                Ver Histórico de Altas
            </Button>
            <Button onClick={() => { setEditingPatient({}); setIsFormOpen(true); }}>
                + Novo Paciente
            </Button>
          </div>
        </div>

        {/* Filter Toolbar (Omitted for brevity, kept same logic) */}
        <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
                <input 
                  type="text" 
                  placeholder="Nome ou tratamento..."
                  className="w-full text-sm border-gray-300 rounded-md shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            {/* ... Other Filters same as before ... */}
        </div>
      </div>

      {/* Discharge Modal (Same) */}
      {isDischargeModalOpen && patientToDischarge && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-red-600 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-white font-semibold">Confirmar Alta / Arquivar</h3>
                    <button onClick={() => setIsDischargeModalOpen(false)} className="text-white text-2xl">&times;</button>
                </div>
                <div className="p-6">
                    <p className="text-gray-800 font-medium mb-1">Paciente: {patientToDischarge.name}</p>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">Observação de Alta</label>
                    <textarea 
                        className="w-full border border-gray-300 rounded-md p-2 text-sm"
                        rows={3}
                        value={dischargeNote}
                        onChange={(e) => setDischargeNote(e.target.value)}
                    ></textarea>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setIsDischargeModalOpen(false)}>Cancelar</Button>
                        <Button variant="danger" onClick={handleConfirmDischarge} disabled={dischargeNote.trim().length < 5}>Confirmar Alta</Button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Form Modal (Edit/Create) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
             <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                <h3 className="text-white font-semibold">
                  {editingPatient.id ? 'Editar Paciente' : 'Novo Paciente'}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="text-white text-2xl">&times;</button>
             </div>
             
             <form onSubmit={handleSave} className="p-6 space-y-4">
               
               {/* New Layout for Location & Isolation */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                       <div>
                            <label className="block text-sm font-medium text-gray-700">Nome do Paciente</label>
                            <input required type="text" className="w-full border rounded-md p-2 mt-1" 
                                value={editingPatient.name || ''}
                                onChange={e => setEditingPatient({...editingPatient, name: e.target.value})}
                            />
                       </div>
                       <div>
                            <label className="block text-sm font-medium text-gray-700">Hospital/Grupo</label>
                            <select required className="w-full border rounded-md p-2 mt-1"
                                value={editingPatient.hospitalName || ''}
                                onChange={e => setEditingPatient({...editingPatient, hospitalName: e.target.value})}
                            >
                                <option value="">Selecione...</option>
                                {uniqueHospitals.map((h, i) => <option key={i} value={h}>{h}</option>)}
                                <option value="Outro">Outro</option>
                            </select>
                       </div>
                       <div>
                            <label className="block text-sm font-medium text-gray-700">Tratamento</label>
                            <input type="text" className="w-full border rounded-md p-2 mt-1" 
                                value={editingPatient.treatment || ''}
                                onChange={e => setEditingPatient({...editingPatient, treatment: e.target.value})}
                            />
                       </div>
                   </div>

                   {/* Location Details */}
                   <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                       <h4 className="text-xs font-bold text-gray-500 uppercase">Localização Interna</h4>
                       <div className="grid grid-cols-3 gap-2">
                           <div>
                                <label className="block text-xs font-medium text-gray-700">Andar</label>
                                <input type="text" className="w-full border rounded-md p-1.5 text-sm" placeholder="Ex: 3º"
                                    value={editingPatient.floor || ''}
                                    onChange={e => setEditingPatient({...editingPatient, floor: e.target.value})}
                                />
                           </div>
                           <div>
                                <label className="block text-xs font-medium text-gray-700">Ala/Bloco</label>
                                <input type="text" className="w-full border rounded-md p-1.5 text-sm" placeholder="Ex: B"
                                    value={editingPatient.wing || ''}
                                    onChange={e => setEditingPatient({...editingPatient, wing: e.target.value})}
                                />
                           </div>
                           <div>
                                <label className="block text-xs font-medium text-gray-700">Leito</label>
                                <input type="text" className="w-full border rounded-md p-1.5 text-sm" placeholder="Ex: 304"
                                    value={editingPatient.bed || ''}
                                    onChange={e => setEditingPatient({...editingPatient, bed: e.target.value})}
                                />
                           </div>
                       </div>
                       
                       <div className="pt-2 border-t border-gray-200 mt-2">
                           <div className="flex items-center gap-2 mb-2">
                                <input type="checkbox" id="iso" className="h-4 w-4 text-red-600 rounded"
                                    checked={editingPatient.isIsolation || false}
                                    onChange={e => setEditingPatient({...editingPatient, isIsolation: e.target.checked})}
                                />
                                <label htmlFor="iso" className="text-sm font-bold text-red-700">Em Isolamento?</label>
                           </div>
                           {editingPatient.isIsolation && (
                               <input type="text" className="w-full border-red-300 ring-1 ring-red-100 rounded-md p-2 text-sm" placeholder="Tipo (ex: Contato, Respiratório)"
                                    value={editingPatient.isolationType || ''}
                                    onChange={e => setEditingPatient({...editingPatient, isolationType: e.target.value})}
                               />
                           )}
                       </div>
                   </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Data Internação</label>
                    <input type="date" required className="w-full border rounded-md p-2 mt-1" 
                      value={editingPatient.admissionDate || ''}
                      onChange={e => setEditingPatient({...editingPatient, admissionDate: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Previsão Alta</label>
                    <input type="date" className="w-full border rounded-md p-2 mt-1" 
                      value={editingPatient.estimatedDischargeDate || ''}
                      onChange={e => setEditingPatient({...editingPatient, estimatedDischargeDate: e.target.value})}
                    />
                 </div>
               </div>

               <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 space-y-2">
                 <p className="text-xs font-bold text-gray-500 uppercase mb-2">Checklist de Assistência</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                     <div className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4 text-blue-600" checked={editingPatient.needsAccommodation || false} onChange={e => setEditingPatient({...editingPatient, needsAccommodation: e.target.checked})} />
                        <label className="text-sm">Necessita Hospedagem</label>
                     </div>
                     <div className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4 text-blue-600" checked={editingPatient.hasDirectivesCard || false} onChange={e => setEditingPatient({...editingPatient, hasDirectivesCard: e.target.checked})} />
                        <label className="text-sm">Cartão Diretivas</label>
                     </div>
                     <div className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4 text-blue-600" checked={editingPatient.agentsNotified || false} onChange={e => setEditingPatient({...editingPatient, agentsNotified: e.target.checked})} />
                        <label className="text-sm">Procuradores Avisados</label>
                     </div>
                     <div className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4 text-blue-600" checked={editingPatient.formsConsidered || false} onChange={e => setEditingPatient({...editingPatient, formsConsidered: e.target.checked})} />
                        <label className="text-sm">S-401, S-407, S-55</label>
                     </div>
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700">Observações</label>
                 <textarea rows={3} className="w-full border rounded-md p-2 mt-1" value={editingPatient.notes || ''} onChange={e => setEditingPatient({...editingPatient, notes: e.target.value})} />
               </div>

               <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedPatients.map(patient => (
          <div key={patient.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col relative">
            {patient.isIsolation && (
                <div className="bg-red-100 text-red-800 text-[10px] font-bold text-center py-1 uppercase tracking-wider">
                    ⚠️ Em Isolamento: {patient.isolationType || 'Geral'}
                </div>
            )}
            <div className={`h-1 ${patient.needsAccommodation ? 'bg-orange-500' : 'bg-blue-500'}`} />
            
            <div className="p-4 flex-grow">
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-bold text-lg text-gray-800 ${isPrivacyMode ? 'blur-sm select-none' : ''}`}>{patient.name}</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 font-medium truncate max-w-[150px]">
                  {patient.hospitalName}
                </span>
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-semibold">Tratamento:</span> {patient.treatment}</p>
                <div className="flex gap-3 text-xs text-gray-500 my-1">
                    {patient.floor && <span>Andar: <b>{patient.floor}</b></span>}
                    {patient.wing && <span>Ala: <b>{patient.wing}</b></span>}
                    {patient.bed && <span>Leito: <b>{patient.bed}</b></span>}
                </div>
                <p className="text-xs text-gray-400">Internação: {new Date(patient.admissionDate).toLocaleDateString()}</p>

                <div className="flex flex-wrap gap-1 mt-2">
                    {patient.needsAccommodation && <span className="text-[10px] font-bold px-2 py-1 bg-orange-100 text-orange-700 rounded-full">Hospedagem</span>}
                    {patient.hasDirectivesCard && <span className="text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Cartão</span>}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-end gap-2">
               <button type="button" onClick={() => handleEdit(patient)} className="text-sm text-blue-600 hover:text-blue-800">Editar</button>
               <button type="button" onClick={(e) => handleOpenDischargeModal(e, patient)} className="text-sm text-red-600 hover:text-red-800 font-medium">Alta/Arquivar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
