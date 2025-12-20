
import React from 'react';
import { Patient, VisitSlot, Member } from '../types';
import { Button } from './Button';

interface PatientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  lastVisit: VisitSlot | null;
  members: Member[];
  onDischarge?: (id: string, name: string) => void;
  isHospitalMode?: boolean;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ 
  isOpen, onClose, patient, lastVisit, members, onDischarge, isHospitalMode 
}) => {
  if (!isOpen) return null;

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Desconhecido';

  const checklistItems = [
    { label: 'Cartão de Diretivas', status: patient.hasDirectivesCard },
    { label: 'Procurador Avisado', status: patient.agentsNotified },
    { label: 'Considerou S-55', status: patient.hasS55 },
    { label: 'Considerou S-401 / S-407', status: patient.formsConsidered }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
        <div className="bg-blue-600 px-6 py-5 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-white font-bold text-lg">Prontuário de Visita</h3>
            <p className="text-blue-100 text-xs uppercase font-bold tracking-widest">{patient.hospitalName}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-500 p-2 rounded-lg transition-colors text-2xl leading-none">&times;</button>
        </div>

        <div className={`p-6 overflow-y-auto custom-scrollbar space-y-6 ${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'}`}>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
                <h4 className={`text-2xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{patient.name}</h4>
                <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded-md uppercase border border-blue-500/20">
                    {patient.floor ? `Andar ${patient.floor}` : 'Andar não inf.'} • {patient.bed ? `Leito ${patient.bed}` : 'Leito não inf.'}
                </span>
                {patient.isIsolation && (
                    <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-md uppercase border border-blue-500/20">
                    ⚠️ Isolamento
                    </span>
                )}
                </div>
            </div>
            {patient.active && onDischarge && (
                <button 
                    onClick={() => { onDischarge(patient.id, patient.name); onClose(); }}
                    className="bg-green-600 hover:bg-green-700 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg shadow-sm"
                >
                    Dar Alta
                </button>
            )}
          </div>

          <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Tratamento</p>
              <p className={`text-sm font-medium ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{patient.treatment || 'Não especificado'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Internação</p>
              <p className={`text-sm font-medium ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{new Date(patient.admissionDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-2">
             <p className="text-[10px] font-bold text-gray-500 uppercase px-1">Documentação e Diretivas</p>
             <div className="grid grid-cols-1 gap-2">
                {checklistItems.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <span className={`text-xs font-medium ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.label}</span>
                    {item.status ? (
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    ) : (
                      <span className="text-[9px] font-bold text-red-400 uppercase tracking-tighter">Pendente</span>
                    )}
                  </div>
                ))}
             </div>
          </div>

          <div className={`p-4 rounded-xl border-2 ${isHospitalMode ? 'bg-blue-900/10 border-blue-900/30' : 'bg-blue-50 border-blue-100'}`}>
            <h5 className={`text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              Último Relato de Visita
            </h5>
            {lastVisit?.report ? (
              <div className="space-y-2">
                <p className={`text-xs italic leading-relaxed ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  "{lastVisit.report.notes}"
                </p>
                <div className="flex justify-between items-center pt-2 border-t border-blue-200/20">
                  <span className="text-[9px] font-bold text-blue-500 uppercase">{new Date(lastVisit.date + 'T12:00:00').toLocaleDateString()}</span>
                  <span className="text-[9px] font-medium text-gray-500 truncate max-w-[150px]">{lastVisit.memberIds.map(getMemberName).join(' & ')}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">Sem registros de visitas anteriores.</p>
            )}
          </div>
        </div>

        <div className={`p-4 border-t flex justify-end ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-50'}`}>
          <Button variant="secondary" onClick={onClose} className="w-full">Fechar Prontuário</Button>
        </div>
      </div>
    </div>
  );
};
