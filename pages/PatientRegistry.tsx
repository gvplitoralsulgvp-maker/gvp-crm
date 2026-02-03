
import React, { useState, useMemo } from 'react';
import { AppState, Patient, UserRole, LogEntry, AppNotification } from '../types';
import { Button } from '../components/Button';
import { PatientDetailModal } from '../components/PatientDetailModal';
import { atomicUpdate, atomicInsert } from '../services/storageService';

interface PatientRegistryProps {
  state: AppState;
  onUpdateState: React.Dispatch<React.SetStateAction<AppState>>;
  isPrivacyMode: boolean;
  isHospitalMode?: boolean;
}

export const PatientRegistry: React.FC<PatientRegistryProps> = ({ state, onUpdateState, isPrivacyMode, isHospitalMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  
  // New Patient Form State
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientHospital, setNewPatientHospital] = useState('');
  const [newPatientFloor, setNewPatientFloor] = useState('');
  const [newPatientBed, setNewPatientBed] = useState('');

  const activePatients = useMemo(() => {
      let list = state.patients.filter(p => p.active);
      if (searchTerm) {
          list = list.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.hospitalName?.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      // Sort by hospital then name
      return list.sort((a,b) => (a.hospitalName || '').localeCompare(b.hospitalName || '') || a.name.localeCompare(b.name));
  }, [state.patients, searchTerm]);

  const handleAddPatient = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPatientName || !newPatientHospital) return;

      const newPatient: Patient = {
          id: crypto.randomUUID(),
          name: newPatientName,
          hospitalName: newPatientHospital,
          floor: newPatientFloor,
          bed: newPatientBed,
          active: true,
          admissionDate: new Date().toISOString().split('T')[0],
          treatment: 'Em avaliação',
          gvpRequestPending: false
      };

      await atomicInsert('patients', newPatient);
      onUpdateState({ ...state, patients: [...state.patients, newPatient] });
      
      setIsAdding(false);
      setNewPatientName('');
      setNewPatientHospital('');
      setNewPatientFloor('');
      setNewPatientBed('');
  };

  const handleDischarge = async (id: string, name: string) => {
      const p = state.patients.find(pt => pt.id === id);
      if (!p) return;
      const updated = { ...p, active: false, isMedicalDischarge: true };
      await atomicUpdate('patients', updated);
      onUpdateState({ ...state, patients: state.patients.map(pt => pt.id === id ? updated : pt) });
  };

  const handleToggleGvp = async (patient: Patient) => {
      const updated = { ...patient, gvpRequestPending: !patient.gvpRequestPending };
      await atomicUpdate('patients', updated);
      onUpdateState({ ...state, patients: state.patients.map(p => p.id === patient.id ? updated : p) });
  };

  const handleAssignColih = async (patientId: string, memberIds: string[]) => {
      const patient = state.patients.find(p => p.id === patientId);
      if (!patient) return;
      const updated = { ...patient, assignedColihIds: memberIds };
      await atomicUpdate('patients', updated);
      onUpdateState({ ...state, patients: state.patients.map(p => p.id === patientId ? updated : p) });
  };

  const handleUpdatePatient = async (updatedPatient: Patient) => {
      await atomicUpdate('patients', updatedPatient);
      onUpdateState({ ...state, patients: state.patients.map(p => p.id === updatedPatient.id ? updatedPatient : p) });
      if (viewingPatient && viewingPatient.id === updatedPatient.id) {
          setViewingPatient(updatedPatient);
      }
  };

  const getAssignedNames = (ids: string[] | undefined) => {
      if (!ids || ids.length === 0) return null;
      return ids.map(id => state.members.find(m => m.id === id)?.name.split(' ')[0]).filter(Boolean).join(', ');
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
         <div>
            <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Censo de Pacientes</h2>
            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Gestão de internados e solicitações.</p>
         </div>
         <Button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white shadow-lg rounded-xl">
             {isAdding ? 'Cancelar' : '+ Novo Paciente'}
         </Button>
      </div>

      {isAdding && (
          <div className={`p-6 rounded-2xl border animate-fade-in ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-white border-gray-100'}`}>
              <form onSubmit={handleAddPatient} className="space-y-4">
                  <div>
                      <label className={`text-[10px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Nome Completo</label>
                      <input required className={`w-full p-3 border-2 rounded-xl mt-1 ${isHospitalMode ? 'bg-[#212327] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={newPatientName} onChange={e => setNewPatientName(e.target.value)} />
                  </div>
                  <div>
                      <label className={`text-[10px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Hospital</label>
                      <select required className={`w-full p-3 border-2 rounded-xl mt-1 ${isHospitalMode ? 'bg-[#212327] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={newPatientHospital} onChange={e => setNewPatientHospital(e.target.value)}>
                          <option value="">Selecione...</option>
                          {state.hospitals.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                      </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className={`text-[10px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Andar</label>
                          <input className={`w-full p-3 border-2 rounded-xl mt-1 ${isHospitalMode ? 'bg-[#212327] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={newPatientFloor} onChange={e => setNewPatientFloor(e.target.value)} />
                      </div>
                      <div>
                          <label className={`text-[10px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Leito</label>
                          <input className={`w-full p-3 border-2 rounded-xl mt-1 ${isHospitalMode ? 'bg-[#212327] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={newPatientBed} onChange={e => setNewPatientBed(e.target.value)} />
                      </div>
                  </div>
                  <Button type="submit" className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold">Cadastrar</Button>
              </form>
          </div>
      )}

      <div className="relative">
          <input 
            type="text" 
            placeholder="Buscar paciente..." 
            className={`w-full p-3 pl-10 border-2 rounded-xl outline-none focus:border-blue-500 transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-white border-gray-100'}`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activePatients.map(patient => {
              const assignedNames = getAssignedNames(patient.assignedColihIds);
              return (
                  <div 
                    key={patient.id} 
                    onClick={() => setViewingPatient(patient)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md active:scale-95 relative overflow-hidden ${
                        isHospitalMode ? 'bg-[#212327] border-gray-800 hover:border-blue-900' : 'bg-white border-gray-100 hover:border-blue-200'
                    }`}
                  >
                      {patient.isIsolation && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-bl-lg"></div>}
                      
                      <div className="flex justify-between items-start">
                          <div>
                              <h4 className={`font-bold text-lg ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'} ${isPrivacyMode ? 'blur-md select-none' : ''}`}>{patient.name}</h4>
                              <p className={`text-xs uppercase font-bold tracking-tight ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>{patient.hospitalName}</p>
                          </div>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isHospitalMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                              {patient.name.substring(0,2).toUpperCase()}
                          </div>
                      </div>
                      
                      <div className="mt-3 flex gap-2">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${isHospitalMode ? 'bg-black/20 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                              {patient.floor ? `Andar ${patient.floor}` : '-'}
                          </span>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${isHospitalMode ? 'bg-black/20 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                              {patient.bed ? `Leito ${patient.bed}` : '-'}
                          </span>
                          {patient.gvpRequestPending && (
                              <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-orange-100 text-orange-700 animate-pulse">
                                  Solicitação GVP
                              </span>
                          )}
                      </div>

                      {/* Exibe membros designados no card */}
                      {assignedNames && (
                          <div className="mt-3 pt-2 border-t border-dashed border-gray-200/50">
                              <p className="text-[9px] font-bold uppercase text-teal-600 mb-1">Designados:</p>
                              <p className={`text-xs font-medium ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{assignedNames}</p>
                          </div>
                      )}
                  </div>
              );
          })}
          {activePatients.length === 0 && (
              <p className={`col-span-full text-center py-10 italic ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Nenhum paciente ativo encontrado.</p>
          )}
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
              onToggleGvp={handleToggleGvp}
              onAssignColih={handleAssignColih}
              onUpdatePatient={handleUpdatePatient}
              isHospitalMode={isHospitalMode}
              canEdit={state.currentUser?.role === UserRole.ADMIN || state.currentUser?.role === UserRole.COORDINATOR || state.currentUser?.isColih}
              canDischarge={true}
              isColihUser={state.currentUser?.isColih}
              currentUser={state.currentUser} 
          />
      )}
    </div>
  );
};
