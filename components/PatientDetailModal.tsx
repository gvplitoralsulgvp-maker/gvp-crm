
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Patient, VisitSlot, Member, LogEntry } from '../types';
import { Button } from './Button';

interface PatientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  lastVisit: VisitSlot | null;
  members: Member[];
  logs?: LogEntry[]; // Novo prop para auditoria
  onDischarge?: (id: string, name: string) => void;
  onHlc7Confirm?: (id: string, name: string) => void;
  onToggleGvp?: (patient: Patient) => void;
  isHospitalMode?: boolean;
  canEdit?: boolean;
  canDischarge?: boolean;
  isColihUser?: boolean;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ 
  isOpen, onClose, patient, lastVisit, members, logs = [], onDischarge, onHlc7Confirm, onToggleGvp, isHospitalMode, canEdit, canDischarge, isColihUser 
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

  // Feature 1: WhatsApp Helper
  const openWhatsApp = (phone: string | undefined, message: string) => {
      if (!phone) return;
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
          alert("Número de telefone inválido para WhatsApp.");
          return;
      }
      // Adiciona 55 se não tiver
      const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Feature 5: Filter Logs for this Patient
  const patientLogs = logs
    .filter(l => l.details.includes(patient.name) || l.details.includes(patient.hospitalName || ''))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5); // Show last 5 entries

  return createPortal(
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
          {patient.isMedicalDischarge && (
              <div className="bg-purple-100 border border-purple-200 p-4 rounded-xl text-purple-800 flex flex-col gap-2">
                  <p className="font-bold text-sm">🏥 Paciente com Alta Médica Informada</p>
                  <p className="text-xs">O paciente já saiu do hospital. A solicitação GVP foi encerrada automaticamente.</p>
                  <p className="text-xs font-bold mt-1">{isColihUser ? 'Ação Pendente: Confirmar HLC-7' : 'Aguardando fechamento administrativo pela COLIH.'}</p>
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
            
            {/* BOTÃO DE ALTA MÉDICA (FASE 1) - Disponível se ainda não teve alta */}
            {patient.active && !patient.isMedicalDischarge && onDischarge && (canEdit || canDischarge) && (
                <button 
                    onClick={() => { onDischarge(patient.id, patient.name); onClose(); }}
                    className="bg-green-600 hover:bg-green-700 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg shadow-sm"
                >
                    Informar Alta
                </button>
            )}
          </div>

          {/* BOTÃO DE ARQUIVAMENTO HLC-7 (FASE 2) - Exclusivo COLIH se já teve alta */}
          {patient.active && patient.isMedicalDischarge && isColihUser && onDischarge && (
              <div className="p-4 bg-white rounded-xl border border-purple-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-700 mb-2">Encerrar Caso (Protocolo COLIH)</p>
                  <button 
                      onClick={() => { onDischarge(patient.id, patient.name); onClose(); }}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-widest py-3 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                  >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Finalizar e Arquivar (HLC-7)
                  </button>
                  <p className="text-[10px] text-gray-400 mt-2 text-center">Isso confirmará que o formulário foi enviado e o caso está concluído.</p>
              </div>
          )}

          {/* BOTÃO DE BANDEIRA (GVP REQUEST) - Só aparece se NÃO teve alta médica */}
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
                  <div className="flex items-center gap-2">
                      <p className={`text-xs ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{patient.companionPhone}</p>
                      {patient.companionPhone && (
                          <button 
                            onClick={() => openWhatsApp(patient.companionPhone, `Olá, sou do Grupo de Visitas (GVP). Gostaria de saber notícias sobre o paciente ${patient.name}.`)}
                            className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                            title="Conversar no WhatsApp"
                          >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                          </button>
                      )}
                  </div>
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
                <div className="flex justify-between items-center">
                    <span className={`text-xs ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{patient.localElder || '-'}</span>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{patient.elderPhone || ''}</span>
                        {patient.elderPhone && (
                          <button 
                            onClick={() => openWhatsApp(patient.elderPhone, `Prezado irmão ${patient.localElder}, sou do GVP. Estamos acompanhando o paciente ${patient.name} e gostaríamos de manter contato.`)}
                            className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                            title="Conversar no WhatsApp"
                          >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                          </button>
                        )}
                    </div>
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

          {/* Feature 5: Audit Logs Section */}
          {patientLogs.length > 0 && (
              <div className={`p-4 rounded-xl border ${isHospitalMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <h5 className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Auditoria do Prontuário
                  </h5>
                  <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                      {patientLogs.map(log => (
                          <div key={log.id} className="text-xs border-l-2 border-gray-300 pl-3">
                              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                                  <span>{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  <span className="font-bold">{log.userName}</span>
                              </div>
                              <p className={`${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{log.action}</p>
                          </div>
                      ))}
                  </div>
              </div>
          )}
        </div>

        <div className={`p-4 border-t flex justify-end ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-50'}`}>
          <Button variant="secondary" onClick={onClose} className="w-full">Fechar Prontuário</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
