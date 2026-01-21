
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
  onHlc7Confirm?: (id: string, name: string) => void;
  onToggleGvp?: (patient: Patient) => void;
  isHospitalMode?: boolean;
  canEdit?: boolean;
  isColihUser?: boolean;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ 
  isOpen, onClose, patient, lastVisit, members, onDischarge, onHlc7Confirm, onToggleGvp, isHospitalMode, canEdit, isColihUser 
}) => {
  if (!isOpen) return null;

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Desconhecido';

  const assignedColihMembers = patient.assignedColihIds 
    ? members.filter(m => patient.assignedColihIds?.includes(m.id)) 
    : [];

  const checklistItems = [
    { label: 'Cartão de Diretivas', status: patient.hasDirectivesCard },
    { label: 'Procurador Avisado', status: patient.agentsNotified },
    { label: 'Considerou S-55', status: patient.hasS55 },
    { label: 'Família Não TJ Envolvida', status: patient.nonWitnessFamily, warn: true }
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
          
          {/* Banner de Alta Médica (Para COLIH) */}
          {patient.isMedicalDischarge && isColihUser && (
              <div className="bg-purple-100 border border-purple-200 p-4 rounded-xl text-purple-800 flex flex-col gap-2">
                  <p className="font-bold text-sm">🏥 Paciente com Alta Médica Informada</p>
                  <p className="text-xs">O paciente já saiu do hospital, mas o caso permanece aberto para controle do HLC-7.</p>
              </div>
          )}

          <div className="flex justify-between items-start">
            <div className="space-y-1">
                <h4 className={`text-2xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{patient.name}</h4>
                <p className={`text-xs ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>{patient.email || 'Sem e-mail'}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded-md uppercase border border-blue-500/20">
                    {patient.floor ? `Andar ${patient.floor}` : 'Andar não inf.'} • {patient.bed ? `Leito ${patient.bed}` : 'Leito não inf.'}
                </span>
                {patient.needsAccommodation && (
                    <span className="px-2 py-1 bg-orange-500/10 text-orange-600 text-[10px] font-bold rounded-md uppercase border border-orange-500/20">
                    🏠 Hospedagem Necessária
                    </span>
                )}
                </div>
            </div>
            {/* Botão de Alta Comum */}
            {patient.active && !patient.isMedicalDischarge && onDischarge && canEdit && (
                <button 
                    onClick={() => { onDischarge(patient.id, patient.name); onClose(); }}
                    className="bg-green-600 hover:bg-green-700 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg shadow-sm"
                >
                    Informar Alta
                </button>
            )}
          </div>

          {/* Botão Especial HLC-7 (Só aparece para COLIH se tiver alta médica) */}
          {patient.active && patient.isMedicalDischarge && isColihUser && onHlc7Confirm && (
              <div className="p-4 bg-white rounded-xl border border-purple-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-700 mb-2">Ação Pendente COLIH</p>
                  <button 
                      onClick={() => { onHlc7Confirm(patient.id, patient.name); onClose(); }}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-widest py-3 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                  >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Você já enviou o HLC-7 deste caso?
                  </button>
                  <p className="text-[10px] text-gray-400 mt-2 text-center">Ao clicar, o caso será arquivado definitivamente.</p>
              </div>
          )}

          {/* NOVA LÓGICA DO BOTÃO DE BANDEIRA (GVP REQUEST) */}
          {patient.active && canEdit && onToggleGvp && !patient.isMedicalDischarge && (
             <div className="pt-2">
                <button 
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleGvp(patient);
                    }}
                    className={`w-full py-4 px-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-sm ${
                        patient.gvpRequestPending 
                        ? 'bg-orange-600 border-orange-600 text-white shadow-lg' 
                        : isHospitalMode 
                            ? 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200' 
                            : 'bg-white border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                    }`}
                >
                    {patient.gvpRequestPending ? (
                        <>
                            <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M3 2a1 1 0 00-1 1v18a1 1 0 102 0v-2.25h10.5a.75.75 0 00.513-1.301l-1.928-1.714 1.928-1.714A.75.75 0 0014.5 12H4.5V4.5h9.25a.75.75 0 00.513-1.301l-1.928-1.714 1.928-1.714A.75.75 0 0014.5 1.5H3z" clipRule="evenodd" /></svg>
                            <span className="font-black text-sm tracking-widest uppercase">SOLICITAÇÃO ATIVA</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8a2 2 0 01-2-18h10a2 2 0 012 18v8" /><path d="M4 4h9v8H4z" /></svg>
                            <span className="font-bold text-sm tracking-widest uppercase">Marcar para Visita GVP</span>
                        </>
                    )}
                </button>
                <p className="text-[10px] text-center mt-2 text-gray-400 leading-tight">
                    {patient.gvpRequestPending 
                        ? "Os coordenadores foram notificados. Clique novamente para cancelar." 
                        : "Clique na bandeira para alertar os coordenadores sobre a necessidade de visita."}
                </p>
             </div>
          )}

          {patient.isIsolation && (
             <div className="p-4 bg-red-500 text-white rounded-xl shadow-lg border border-red-400 flex items-center gap-4">
                <div className="p-2 bg-white/20 rounded-full">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                    <p className="text-xs font-black uppercase tracking-widest opacity-80">Alerta de Risco</p>
                    <p className="font-bold text-lg">ISOLAMENTO: {patient.isolationType || 'Geral'}</p>
                </div>
             </div>
          )}

          {/* Dados do Acompanhante e Tratamento */}
          <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="col-span-2 space-y-1 border-b border-gray-200/10 pb-2 mb-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Acompanhante</p>
              <div className="flex justify-between items-center">
                  <p className={`text-sm font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{patient.companionName || 'Não informado'}</p>
                  <p className={`text-xs ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{patient.companionPhone}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Tratamento</p>
              <p className={`text-sm font-medium ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{patient.treatment || 'Não especificado'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Internação</p>
              <p className={`text-sm font-medium ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{new Date(patient.admissionDate).toLocaleDateString()}</p>
            </div>
            <div className="col-span-2 pt-2 border-t border-gray-200/10 space-y-1">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Ancião / Congregação</p>
                <div className="flex justify-between">
                    <span className={`text-xs ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{patient.localElder || '-'}</span>
                    <span className={`text-xs ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{patient.elderPhone || ''}</span>
                </div>
                {patient.congregation && <p className="text-[10px] text-blue-500 font-bold uppercase">{patient.congregation}</p>}
            </div>
          </div>

          {/* Equipe COLIH Designada */}
          {assignedColihMembers.length > 0 && (
              <div className={`p-4 rounded-xl border ${isHospitalMode ? 'bg-teal-900/10 border-teal-900/30' : 'bg-teal-50 border-teal-100'}`}>
                  <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-2">Equipe COLIH Responsável</p>
                  <div className="flex flex-wrap gap-2">
                      {assignedColihMembers.map(m => (
                          <span key={m.id} className="text-[10px] font-bold px-2 py-1 rounded bg-white text-teal-700 shadow-sm border border-teal-200">
                              {m.name}
                          </span>
                      ))}
                  </div>
              </div>
          )}

          <div className="space-y-2">
             <p className="text-[10px] font-bold text-gray-500 uppercase px-1">Documentação e Diretivas</p>
             <div className="grid grid-cols-1 gap-2">
                {checklistItems.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <span className={`text-xs font-medium ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.label}</span>
                    {item.status ? (
                      <div className={`flex items-center gap-1 ${item.warn ? 'text-orange-500' : 'text-green-500'}`}>
                          <span className="text-[10px] font-bold uppercase">Sim</span>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      </div>
                    ) : (
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Não</span>
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
