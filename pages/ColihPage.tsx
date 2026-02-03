
import React, { useState, useMemo } from 'react';
import { AppState, UserRole, Doctor, ColihVisit, ColihInteractionType, Member, Hospital } from '../types';
import { Button } from '../components/Button';
import { atomicUpdate, atomicDelete } from '../services/storageService';
import { createPortal } from 'react-dom';

interface ColihPageProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  isHospitalMode?: boolean;
  view: 'doctors' | 'facilitators' | 'hospitals' | 'presentations';
}

export const ColihPage: React.FC<ColihPageProps> = ({ state, onUpdateState, isHospitalMode, view }) => {
  const [editingVisit, setEditingVisit] = useState<Partial<ColihVisit> | null>(null);
  const [isExternalVisit, setIsExternalVisit] = useState(false);
  const [customLocationName, setCustomLocationName] = useState('');

  // --- PRESENTATION LOGIC ---
  const handleSaveVisit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingVisit) return;
      
      const newVisit: ColihVisit = {
          id: editingVisit.id || crypto.randomUUID(),
          doctorId: editingVisit.doctorId,
          hospitalId: editingVisit.hospitalId,
          date: editingVisit.date || new Date().toISOString().split('T')[0],
          memberIds: editingVisit.memberIds || [],
          notes: editingVisit.notes || '',
          interactionType: editingVisit.interactionType || 'visit',
          status: editingVisit.status || 'COMPLETED',
          createdAt: editingVisit.createdAt || new Date().toISOString(),
          hlc38Presented: editingVisit.hlc38Presented || false,
          collaboratorInterest: editingVisit.collaboratorInterest || false
      };

      try {
          await atomicUpdate('colih_visits', newVisit);
          // Update last visit date if doctor visit
          if (newVisit.doctorId && newVisit.status === 'COMPLETED') {
              const doctor = state.doctors.find(d => d.id === newVisit.doctorId);
              if (doctor) {
                  const updatedDoc = { ...doctor, lastVisitDate: newVisit.date };
                  await atomicUpdate('doctors', updatedDoc);
                  const updatedDocs = state.doctors.map(d => d.id === doctor.id ? updatedDoc : d);
                  onUpdateState({ ...state, doctors: updatedDocs });
              }
          }
          const updatedVisits = editingVisit.id ? state.colihVisits.map(v => v.id === newVisit.id ? newVisit : v) : [...state.colihVisits, newVisit];
          onUpdateState({ ...state, colihVisits: updatedVisits });
          setEditingVisit(null);
          setIsExternalVisit(false);
          setCustomLocationName('');
      } catch (err) { alert("Erro ao salvar visita."); }
  };

  const handleEditPresentation = (v: ColihVisit) => {
      setEditingVisit(v);
  };

  const handleDeletePresentation = async (id: string) => {
      if(!window.confirm("Excluir registro?")) return;
      try {
          await atomicDelete('colih_visits', id);
          onUpdateState({ ...state, colihVisits: state.colihVisits.filter(v => v.id !== id) });
      } catch (e) { alert("Erro ao excluir."); }
  };

  // --- VIEWS ---

  if (view === 'doctors') {
      return (
          <div className="space-y-6 pb-20 animate-fade-in">
              <div className={`p-6 rounded-2xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Médicos Cooperadores</h2>
                  <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Base de dados de profissionais.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {state.doctors.map(doc => (
                      <div key={doc.id} className={`p-4 rounded-xl border flex flex-col justify-between ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-white border-gray-100'}`}>
                          <div>
                              <h4 className={`font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-900'}`}>{doc.name}</h4>
                              <p className="text-xs text-gray-500 uppercase">{doc.specialty}</p>
                              <div className="mt-2 flex gap-1 flex-wrap">
                                  {doc.isConsultant && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 rounded font-bold">Consultor</span>}
                                  {doc.treatsPediatric && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 rounded font-bold">Pediatria</span>}
                                  <span className={`text-[10px] px-2 rounded font-bold ${doc.cooperationLevel === 'High' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{doc.cooperationLevel === 'High' ? 'Cooperador' : 'Regular'}</span>
                              </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                              <span className="text-[10px] text-gray-400">Última visita: {doc.lastVisitDate ? new Date(doc.lastVisitDate).toLocaleDateString() : 'Nunca'}</span>
                              <button onClick={() => setEditingVisit({ doctorId: doc.id, interactionType: 'visit', date: new Date().toISOString().split('T')[0] })} className="text-blue-600 text-xs font-bold uppercase hover:underline">Registrar Visita</button>
                          </div>
                      </div>
                  ))}
              </div>
              
              {/* Modal Visita Médico */}
              {editingVisit && (
                  createPortal(
                      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
                          <div className={`w-full max-w-md rounded-2xl p-6 ${isHospitalMode ? 'bg-[#212327] text-white' : 'bg-white text-gray-900'}`}>
                              <h3 className="font-bold text-lg mb-4">Registrar Visita Médica</h3>
                              <form onSubmit={handleSaveVisit} className="space-y-4">
                                  <input type="date" required className="w-full p-2 border rounded" value={editingVisit.date} onChange={e => setEditingVisit({...editingVisit, date: e.target.value})} />
                                  <textarea className="w-full p-2 border rounded" placeholder="Notas da visita..." value={editingVisit.notes} onChange={e => setEditingVisit({...editingVisit, notes: e.target.value})} />
                                  <div className="flex gap-2">
                                      <label className="flex items-center gap-2"><input type="checkbox" checked={editingVisit.hlc38Presented || false} onChange={e => setEditingVisit({...editingVisit, hlc38Presented: e.target.checked})} /> <span className="text-xs">Apresentou HLC-38?</span></label>
                                  </div>
                                  <div className="flex justify-end gap-2 mt-4">
                                      <Button variant="secondary" onClick={() => setEditingVisit(null)}>Cancelar</Button>
                                      <Button type="submit">Salvar</Button>
                                  </div>
                              </form>
                          </div>
                      </div>, document.body
                  )
              )}
          </div>
      );
  }

  if (view === 'facilitators') {
      const facilitators = state.members.filter(m => m.colihClassification === 'Facilitator');
      return (
          <div className="space-y-6 pb-20 animate-fade-in">
              <div className={`p-6 rounded-2xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Facilitadores (Ajudantes)</h2>
                  <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Membros designados para auxiliar no GVP.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {facilitators.map(fac => (
                      <div key={fac.id} className={`p-4 rounded-xl border flex items-center gap-4 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-white border-gray-100'}`}>
                          <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold">{fac.name.substring(0,2).toUpperCase()}</div>
                          <div>
                              <h4 className={`font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{fac.name}</h4>
                              <p className="text-xs text-gray-500">{fac.congregation}</p>
                          </div>
                      </div>
                  ))}
                  {facilitators.length === 0 && <p className="text-gray-500 italic p-4">Nenhum facilitador cadastrado.</p>}
              </div>
          </div>
      );
  }

  if (view === 'hospitals') {
      return (
          <div className="space-y-6 pb-20 animate-fade-in">
              <div className={`p-6 rounded-2xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Hospitais Designados</h2>
                  <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Lista de hospitais com cobertura COLIH.</p>
              </div>
              <div className="space-y-4">
                  {state.hospitals.map(h => (
                      <div key={h.id} className={`p-4 rounded-xl border ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-white border-gray-100'}`}>
                          <h4 className={`font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{h.name}</h4>
                          <p className="text-xs text-gray-500">{h.city} • {h.address}</p>
                          {h.responsibleMemberIds && h.responsibleMemberIds.length > 0 && (
                              <div className="mt-2 text-xs">
                                  <span className="font-bold text-gray-500">Responsáveis: </span>
                                  {h.responsibleMemberIds.map(rid => state.members.find(m => m.id === rid)?.name).join(', ')}
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  if (view === 'presentations') {
      const presentations = state.colihVisits.filter(v => v.interactionType === 'presentation');
      return (
          <div className="space-y-6 pb-20 animate-fade-in">
              <div className={`p-6 rounded-2xl border flex justify-between items-center ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <div>
                      <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Apresentações</h2>
                      <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Histórico de apresentações em hospitais/clínicas.</p>
                  </div>
                  <Button onClick={() => setEditingVisit({ interactionType: 'presentation', date: new Date().toISOString().split('T')[0] })} className="bg-teal-600 text-white rounded-xl">+ Nova</Button>
              </div>
              
              <div className="space-y-4">
                  {presentations.map(pres => (
                      <div key={pres.id} className={`p-4 rounded-xl border ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-white border-gray-100'}`}>
                          <div className="flex justify-between">
                              <h4 className={`font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                  {pres.hospitalId ? state.hospitals.find(h => h.id === pres.hospitalId)?.name : 'Local Externo'}
                              </h4>
                              <span className="text-xs font-mono text-gray-500">{new Date(pres.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 italic">{pres.notes}</p>
                          <div className="mt-2 flex justify-end gap-2">
                              <button onClick={() => handleEditPresentation(pres)} className="text-blue-500 text-xs font-bold uppercase hover:underline">Editar</button>
                              <button onClick={() => handleDeletePresentation(pres.id)} className="text-red-500 text-xs font-bold uppercase hover:underline">Excluir</button>
                          </div>
                      </div>
                  ))}
                  {presentations.length === 0 && <p className="text-center py-8 text-gray-500 italic">Nenhuma apresentação registrada.</p>}
              </div>

              {/* Modal Apresentação */}
              {editingVisit && (
                  createPortal(
                      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
                          <div className={`w-full max-w-md rounded-2xl p-6 ${isHospitalMode ? 'bg-[#212327] text-white' : 'bg-white text-gray-900'}`}>
                              <h3 className="font-bold text-lg mb-4">Registrar Apresentação</h3>
                              <form onSubmit={handleSaveVisit} className="space-y-4">
                                  <input type="date" required className="w-full p-2 border rounded" value={editingVisit.date} onChange={e => setEditingVisit({...editingVisit, date: e.target.value})} />
                                  <select className="w-full p-2 border rounded" value={editingVisit.hospitalId || ''} onChange={e => setEditingVisit({...editingVisit, hospitalId: e.target.value})}>
                                      <option value="">Selecione o Hospital (ou deixe vazio)</option>
                                      {state.hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                  </select>
                                  <textarea className="w-full p-2 border rounded" placeholder="Detalhes da apresentação..." value={editingVisit.notes} onChange={e => setEditingVisit({...editingVisit, notes: e.target.value})} />
                                  
                                  <div className="flex justify-end gap-2 mt-4">
                                      <Button variant="secondary" onClick={() => setEditingVisit(null)}>Cancelar</Button>
                                      <Button type="submit">Salvar</Button>
                                  </div>
                              </form>
                          </div>
                      </div>, document.body
                  )
              )}
          </div>
      );
  }

  return <div>Selecione uma visualização.</div>;
};
