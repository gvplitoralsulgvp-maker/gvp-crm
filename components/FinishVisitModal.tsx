
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Patient } from '../types';

interface PatientOutcome {
  performed: boolean;
  notPerformedReason?: 'indisposto' | 'alta' | 'impedimento' | 'outro';
  hasDirectivesCard: boolean;
  hasS55: boolean;
  formsConsidered: boolean;
  agentsNotified: boolean;
  notes: string;
}

interface FinishVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (generalNote: string, patientUpdates: Record<string, PatientOutcome>) => void;
  patients: Patient[];
  isHospitalMode?: boolean;
}

export const FinishVisitModal: React.FC<FinishVisitModalProps> = ({ isOpen, onClose, onConfirm, patients, isHospitalMode }) => {
  const [generalNote, setGeneralNote] = useState('');
  const [outcomes, setOutcomes] = useState<Record<string, PatientOutcome>>({});

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, PatientOutcome> = {};
      patients.forEach(p => {
        initial[p.id] = {
          performed: false,
          hasDirectivesCard: p.hasDirectivesCard || false,
          hasS55: p.hasS55 || false,
          formsConsidered: p.formsConsidered || false,
          agentsNotified: p.agentsNotified || false,
          notes: ''
        };
      });
      setOutcomes(initial);
      setGeneralNote('');
    }
  }, [isOpen, patients]);

  if (!isOpen) return null;

  const updateOutcome = (id: string, fields: Partial<PatientOutcome>) => {
    setOutcomes(prev => ({
      ...prev,
      [id]: { ...prev[id], ...fields }
    }));
  };

  const handleSubmit = () => {
    onConfirm(generalNote, outcomes);
  };

  const isFormValid = generalNote.trim().length >= 3;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[95vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
        <div className="bg-green-600 px-6 py-4 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-white font-bold text-lg">Conclusão de Visita</h3>
            <p className="text-green-100 text-xs uppercase font-bold tracking-widest">Relatório e Atualização de Status</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-green-500 p-2 rounded-lg transition-colors text-2xl leading-none">&times;</button>
        </div>

        <div className={`p-6 overflow-y-auto custom-scrollbar space-y-8 ${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'}`}>
          {/* General Visit Note */}
          <div className="space-y-2">
            <label className={`block text-[10px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Resumo Geral da Dupla
            </label>
            <textarea
              className={`w-full border-2 rounded-xl p-4 text-sm focus:ring-0 transition-all resize-none ${
                isHospitalMode ? 'bg-[#212327] border-gray-800 text-white focus:border-green-600' : 'bg-white border-gray-100 text-gray-800 focus:border-green-500'
              }`}
              rows={3}
              placeholder="Descreva brevemente como foi a jornada hoje..."
              value={generalNote}
              onChange={(e) => setGeneralNote(e.target.value)}
            />
          </div>

          {/* Patient Specific Outcomes */}
          <div className="space-y-4">
            <h4 className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Status por Paciente
            </h4>
            
            {patients.length === 0 ? (
              <p className="text-xs text-gray-500 italic text-center py-4">Nenhum paciente internado nesta rota.</p>
            ) : (
              <div className="space-y-6">
                {patients.map(patient => {
                  const outcome = outcomes[patient.id] || { performed: false, hasDirectivesCard: false, hasS55: false, formsConsidered: false, agentsNotified: false, notes: '' };
                  return (
                    <div key={patient.id} className={`p-5 rounded-2xl border-2 transition-all ${
                      outcome.performed 
                        ? (isHospitalMode ? 'bg-green-900/10 border-green-900/40 shadow-green-900/10 shadow-lg' : 'bg-green-50 border-green-100 shadow-sm')
                        : (isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100')
                    }`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div>
                          <p className={`font-bold text-base ${isHospitalMode ? 'text-gray-100' : 'text-gray-800'}`}>{patient.name}</p>
                          <p className="text-[10px] text-gray-500 uppercase">{patient.hospitalName}</p>
                        </div>
                        
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${outcome.performed ? 'text-green-500' : 'text-gray-400'}`}>Visita Realizada?</span>
                          <div 
                            onClick={() => updateOutcome(patient.id, { performed: !outcome.performed })}
                            className={`w-12 h-6 rounded-full relative transition-colors ${outcome.performed ? 'bg-green-500' : 'bg-gray-400'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${outcome.performed ? 'left-7' : 'left-1'}`} />
                          </div>
                        </label>
                      </div>

                      {outcome.performed ? (
                        <div className="space-y-4 animate-fade-in">
                          <div className="grid grid-cols-2 gap-3">
                             <label className={`flex items-center gap-2 p-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${outcome.hasDirectivesCard ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                                <input type="checkbox" className="hidden" checked={outcome.hasDirectivesCard} onChange={e => updateOutcome(patient.id, { hasDirectivesCard: e.target.checked })} />
                                Diretivas
                             </label>
                             <label className={`flex items-center gap-2 p-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${outcome.agentsNotified ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                                <input type="checkbox" className="hidden" checked={outcome.agentsNotified} onChange={e => updateOutcome(patient.id, { agentsNotified: e.target.checked })} />
                                Procurador
                             </label>
                             <label className={`flex items-center gap-2 p-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${outcome.hasS55 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                                <input type="checkbox" className="hidden" checked={outcome.hasS55} onChange={e => updateOutcome(patient.id, { hasS55: e.target.checked })} />
                                S-55
                             </label>
                             <label className={`flex items-center gap-2 p-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${outcome.formsConsidered ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                                <input type="checkbox" className="hidden" checked={outcome.formsConsidered} onChange={e => updateOutcome(patient.id, { formsConsidered: e.target.checked })} />
                                S-401/407
                             </label>
                          </div>
                          <textarea
                            className={`w-full border rounded-xl p-3 text-xs italic focus:ring-0 transition-all ${
                              isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white focus:border-green-600' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-green-500'
                            }`}
                            placeholder="Relato individual deste paciente (Passagem de Bastão)..."
                            value={outcome.notes}
                            onChange={(e) => updateOutcome(patient.id, { notes: e.target.value })}
                          />
                        </div>
                      ) : (
                        <div className="animate-fade-in">
                          <label className={`block text-[9px] font-bold uppercase text-gray-500 mb-1.5`}>Por que a visita não foi realizada?</label>
                          <div className="flex flex-wrap gap-2">
                             {[
                               { id: 'indisposto', label: 'Indisposto' },
                               { id: 'alta', label: 'Teve Alta' },
                               { id: 'impedimento', label: 'Impedimento Hospital' },
                               { id: 'outro', label: 'Outro' }
                             ].map(reason => (
                               <button
                                 key={reason.id}
                                 onClick={() => updateOutcome(patient.id, { notPerformedReason: reason.id as any })}
                                 className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                                   outcome.notPerformedReason === reason.id 
                                     ? 'bg-red-600 text-white border-red-600' 
                                     : isHospitalMode ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                                 }`}
                               >
                                 {reason.label}
                               </button>
                             ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={`p-6 border-t flex justify-end gap-3 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button 
            className="bg-green-600 hover:bg-green-700 text-white min-w-[150px] shadow-lg"
            onClick={handleSubmit}
            disabled={!isFormValid}
          >
            Finalizar Visita
          </Button>
        </div>
      </div>
    </div>
  );
};
