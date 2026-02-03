
import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Patient, VisitSlot, Member, LogEntry, UserRole } from '../types';
import { Button } from './Button';
import { uploadFile } from '../services/storageService';

interface PatientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  lastVisit: VisitSlot | null;
  members: Member[];
  logs?: LogEntry[];
  onDischarge?: (id: string, name: string) => void;
  onHlc7Confirm?: (id: string, name: string, fileUrl?: string) => void;
  onToggleGvp?: (patient: Patient) => void;
  onAssignColih?: (patientId: string, memberIds: string[]) => void;
  onUpdatePatient?: (patient: Patient) => void; 
  isHospitalMode?: boolean;
  canEdit?: boolean;
  canDischarge?: boolean;
  isColihUser?: boolean;
  currentUser?: Member | null;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ 
  isOpen, onClose, patient, lastVisit, members, logs = [], onDischarge, onHlc7Confirm, onToggleGvp, onAssignColih, onUpdatePatient, isHospitalMode, canEdit, canDischarge, isColihUser, currentUser 
}) => {
  // Estado local para a lista de designados
  const [assignedIds, setAssignedIds] = useState<string[]>(patient.assignedColihIds || []);
  const [isSavingAssign, setIsSavingAssign] = useState(false);
  
  // Estado para upload de HLC-7
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedHlc7Url, setUploadedHlc7Url] = useState<string | null>(patient.hlc7FileUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Desconhecido';

  const checklistItems = [
    { key: 'hasDirectivesCard', label: 'Cartão de Diretivas', status: patient.hasDirectivesCard },
    { key: 'agentsNotified', label: 'Procurador Avisado', status: patient.agentsNotified },
    { key: 'hasS55', label: 'Considerou S-55 (Menor)', status: patient.hasS55 },
    { key: 'formsConsidered', label: 'Considerou S-401/407', status: patient.formsConsidered },
    { key: 'nonWitnessFamily', label: 'Família Não TJ Envolvida', status: patient.nonWitnessFamily, warn: true }
  ];

  const handleToggleChecklist = async (key: string, currentStatus: boolean | undefined) => {
      if (!onUpdatePatient || !canEdit) return;
      const updatedPatient = { ...patient, [key]: !currentStatus };
      onUpdatePatient(updatedPatient);
  };

  const openWhatsApp = (phone: string | undefined, message: string) => {
      if (!phone) return;
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
          alert("Número de telefone inválido para WhatsApp.");
          return;
      }
      const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const patientLogs = logs
    .filter(l => l.details.includes(patient.name) || l.details.includes(patient.hospitalName || ''))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const canAssignColih = currentUser && (
      currentUser.role === UserRole.ADMIN || 
      currentUser.role === UserRole.COORDINATOR || 
      (currentUser.isColih && ['Coordinator', 'President', 'Secretary'].includes(currentUser.colihClassification || ''))
  );

  const availableColihMembers = useMemo(() => {
      return members
        .filter(m => m.isColih && m.active && m.colihClassification !== 'Facilitator')
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

  const handleToggleAssign = (memberId: string) => {
      if (assignedIds.includes(memberId)) {
          setAssignedIds(prev => prev.filter(id => id !== memberId));
      } else {
          if (assignedIds.length >= 2) {
              if(!window.confirm("Já existem 2 membros designados. Deseja adicionar um terceiro?")) return;
          }
          setAssignedIds(prev => [...prev, memberId]);
      }
  };

  const handleSaveAssignments = async () => {
      if (!onAssignColih) return;
      setIsSavingAssign(true);
      try {
          await onAssignColih(patient.id, assignedIds);
          alert("Equipe designada atualizada com sucesso!");
      } catch (err) {
          console.error("Erro ao salvar designação", err);
          alert("Erro ao salvar designação.");
      } finally {
          setIsSavingAssign(false);
      }
  };

  // UPLOAD HLC-7
  const handleHlc7Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setIsUploading(true);
      try {
          // Upload para o bucket 'resources' com prefixo 'hlc7'
          const { url } = await uploadFile(file, 'hlc7');
          setUploadedHlc7Url(url);
          
          // Atualiza registro localmente (opcional, pois será salvo ao fechar o caso)
          if (onUpdatePatient) {
              onUpdatePatient({ ...patient, hlc7FileUrl: url });
          }
          
      } catch (err: any) {
          alert("Erro no upload: " + err.message);
      } finally {
          setIsUploading(false);
      }
  };

  // ACTION: CONFIRM & ARCHIVE
  const handleHlc7Action = () => {
      if (!onHlc7Confirm) return;
      
      if (!uploadedHlc7Url) {
          if (!window.confirm("ATENÇÃO: Nenhum arquivo HLC-7 foi anexado. Deseja encerrar o caso mesmo assim?")) return;
      } else {
          if (!window.confirm("O formulário HLC-7 foi anexado. Confirmar encerramento e arquivamento do caso?")) return;
      }
      
      onHlc7Confirm(patient.id, patient.name, uploadedHlc7Url || undefined);
      onClose();
  };

  const hasChanges = JSON.stringify(assignedIds.sort()) !== JSON.stringify((patient.assignedColihIds || []).sort());

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
          
          {/* Banner de Alta Médica */}
          {patient.isMedicalDischarge && (
              <div className="bg-purple-100 border border-purple-200 p-4 rounded-xl text-purple-800 flex flex-col gap-2">
                  <p className="font-bold text-sm">🏥 Paciente com Alta Médica Informada</p>
                  <p className="text-xs">O paciente já saiu do hospital. {patient.pendingHlc7 ? 'Anexe o HLC-7 abaixo para finalizar.' : 'A solicitação GVP foi encerrada automaticamente.'}</p>
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
            
            {/* BOTÃO DE ALTA MÉDICA (GVP) */}
            {/* FIX: Removed onClose() to allow continuous HLC-7 flow */}
            {patient.active && !patient.isMedicalDischarge && onDischarge && (canEdit || canDischarge) && (
                <button 
                    onClick={() => { 
                        if(window.confirm("Confirmar a alta médica deste paciente? A tela de anexo do HLC-7 será exibida em seguida.")) {
                            onDischarge(patient.id, patient.name); 
                        }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg shadow-sm"
                >
                    Informar Alta
                </button>
            )}
          </div>

          {/* BOTÃO DE ARQUIVAMENTO HLC-7 (COLIH) */}
          {/* Aparece automaticamente assim que a alta é informada (pois o modal não fecha mais) */}
          {patient.active && patient.isMedicalDischarge && patient.pendingHlc7 && isColihUser && onHlc7Confirm && (
              <div className="p-4 bg-white rounded-xl border-2 border-purple-200 shadow-sm space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></div>
                      <p className="text-xs font-bold text-gray-700">Encerrar Caso (Protocolo COLIH)</p>
                  </div>
                  
                  {/* SEÇÃO UPLOAD */}
                  <div className="flex flex-col gap-2">
                      {uploadedHlc7Url ? (
                          <div className="flex items-center gap-2 text-xs bg-green-50 p-2 rounded border border-green-200 text-green-700">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              <a href={uploadedHlc7Url} target="_blank" rel="noreferrer" className="underline font-bold">Ver HLC-7 Anexado</a>
                              <button onClick={() => setUploadedHlc7Url(null)} className="text-red-500 font-bold ml-auto">X</button>
                          </div>
                      ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center bg-gray-50">
                              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleHlc7Upload} />
                              <button 
                                  onClick={() => fileInputRef.current?.click()} 
                                  disabled={isUploading}
                                  className="text-xs font-bold text-purple-600 hover:underline uppercase tracking-wide disabled:opacity-50"
                              >
                                  {isUploading ? 'Enviando...' : '📎 Anexar Cópia HLC-7'}
                              </button>
                          </div>
                      )}
                  </div>

                  <button 
                      onClick={handleHlc7Action}
                      disabled={isUploading}
                      className={`w-full text-white text-xs font-bold uppercase tracking-widest py-3 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 ${uploadedHlc7Url ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 cursor-not-allowed'}`}
                  >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Encerrar o Caso
                  </button>
              </div>
          )}

          {/* BOTÃO DE BANDEIRA (GVP REQUEST) */}
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
                {patient.congregation && <p className="text-[10px] text-blue-500 font-bold uppercase">{patient.congregation}</p>}
            </div>
            
            {patient.attendingDoctor && (
                <div className="col-span-2 pt-2 border-t border-gray-200/10 space-y-1">
                    <p className="text-[10px] font-bold text-teal-600 uppercase">Médico Tratante</p>
                    <div className="flex justify-between">
                        <span className={`text-sm font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{patient.attendingDoctor}</span>
                        <span className={`text-xs ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{patient.attendingDoctorContact}</span>
                    </div>
                </div>
            )}

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Tratamento</p>
              <p className={`text-sm font-medium ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{patient.treatment || 'Não especificado'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Internação</p>
              <p className={`text-sm font-medium ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{new Date(patient.admissionDate).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Equipe COLIH Responsável - EDITÁVEL PARA ADMIN/COORD */}
          <div className={`p-4 rounded-xl border transition-all ${isHospitalMode ? 'bg-teal-900/10 border-teal-900/30' : 'bg-teal-50 border-teal-100'}`}>
              <div className="flex justify-between items-center mb-3">
                  <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">
                      Equipe COLIH Responsável
                  </p>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${assignedIds.length === 2 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {assignedIds.length}/2 Designados
                  </span>
              </div>

              {/* LISTA DE MEMBROS (VISUALIZAÇÃO PÚBLICA) */}
              {assignedIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                      {assignedIds.map(mid => (
                          <span key={mid} className={`text-[10px] font-bold px-2 py-1 rounded shadow-sm border flex items-center gap-1 ${isHospitalMode ? 'bg-[#1a1c1e] text-teal-400 border-teal-800' : 'bg-white text-teal-700 border-teal-200'}`}>
                              {getMemberName(mid)}
                              {canAssignColih && (
                                  <button onClick={() => handleToggleAssign(mid)} className="ml-1 text-red-400 hover:text-red-600 font-black">×</button>
                              )}
                          </span>
                      ))}
                  </div>
              )}

              {/* ÁREA DE SELEÇÃO (APENAS ADMIN/COORD) */}
              {canAssignColih ? (
                  <div className={`mt-2 border-t border-teal-200/30 pt-2 ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <p className="text-[9px] font-bold uppercase mb-2 opacity-70">Selecionar Membros da COLIH (Excl. Facilitadores)</p>
                      <div className={`max-h-32 overflow-y-auto custom-scrollbar p-1 border rounded-lg ${isHospitalMode ? 'bg-black/20 border-gray-700' : 'bg-white/50 border-gray-200'}`}>
                          {availableColihMembers.map(m => (
                              <label key={m.id} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-teal-500/10 transition-colors`}>
                                  <input 
                                      type="checkbox" 
                                      className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500"
                                      checked={assignedIds.includes(m.id)}
                                      onChange={() => handleToggleAssign(m.id)}
                                  />
                                  <span className="text-xs font-medium truncate">{m.name}</span>
                              </label>
                          ))}
                          {availableColihMembers.length === 0 && <p className="text-xs italic p-2">Nenhum membro COLIH disponível.</p>}
                      </div>
                      
                      {/* BOTÃO DE SALVAR MANUAL */}
                      {hasChanges && (
                          <div className="mt-3 pt-2 border-t border-dashed border-teal-200/50">
                              <Button 
                                  onClick={handleSaveAssignments} 
                                  disabled={isSavingAssign}
                                  className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs uppercase font-bold shadow-md"
                              >
                                  {isSavingAssign ? 'Salvando...' : 'Salvar Designação'}
                              </Button>
                          </div>
                      )}
                  </div>
              ) : (
                  assignedIds.length === 0 && <p className="text-xs italic text-gray-500">Nenhum membro designado ainda.</p>
              )}
          </div>

          <div className="space-y-2">
             <p className="text-[10px] font-bold text-gray-500 uppercase px-1">Documentação e Diretivas (Clique para Editar)</p>
             <div className="grid grid-cols-1 gap-2">
                {checklistItems.map((item, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => canEdit && handleToggleChecklist(item.key, item.status)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-95 ${
                        isHospitalMode ? 'bg-[#212327] border-gray-800 hover:bg-white/5' : 'bg-white border-gray-100 shadow-sm hover:border-blue-200'
                    } ${!canEdit ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                  >
                    <span className={`text-xs font-medium ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.label}</span>
                    {item.status ? (
                      <div className={`flex items-center gap-1 ${item.warn ? 'text-orange-500' : 'text-green-500'}`}>
                          <span className="text-[10px] font-bold uppercase">Sim</span>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      </div>
                    ) : (
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Não</span>
                    )}
                  </button>
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
