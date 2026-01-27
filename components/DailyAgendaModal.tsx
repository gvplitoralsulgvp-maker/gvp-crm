
import React from 'react';
import { createPortal } from 'react-dom';
import { VisitRoute, VisitSlot, Member, Patient, UserRole, Hospital } from '../types';
import { Button } from './Button';

interface DailyAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  routes: VisitRoute[];
  visits: VisitSlot[];
  members: Member[];
  patients: Patient[];
  currentUser: Member | null;
  isPrivacyMode: boolean;
  isHospitalMode?: boolean;
  onRouteClick: (route: VisitRoute, slot: VisitSlot | undefined) => void;
  onReportClick: (slot: VisitSlot) => void;
  onPatientClick: (patient: Patient) => void;
  hospitals?: Hospital[];
}

export const DailyAgendaModal: React.FC<DailyAgendaModalProps> = ({
  isOpen, onClose, date, routes, visits, members, patients, currentUser, isPrivacyMode, isHospitalMode, onRouteClick, onReportClick, onPatientClick, hospitals
}) => {
  if (!isOpen) return null;

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { 
    weekday: 'long', day: 'numeric', month: 'long' 
  });

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Desconhecido';

  // Feature 1: Share via WhatsApp Helper
  const handleShareWhatsApp = (route: VisitRoute, memberIds: string[]) => {
      if (memberIds.length === 0) return;
      
      const names = memberIds.map(id => getMemberName(id)).join(' & ');
      const hospitalList = route.hospitals?.join(', ') || 'Hospitais da rota';
      
      const text = `*ESCALA GVP - ${formattedDate}*\n\n` +
                   `🏥 *Rota:* ${route.name}\n` +
                   `👥 *Dupla:* ${names}\n` +
                   `📍 *Locais:* ${hospitalList}\n\n` +
                   `Bom trabalho e boa visita!`;
                   
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
        <div className="bg-blue-600 px-6 py-5 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-white font-bold text-xl capitalize">{formattedDate}</h3>
            <p className="text-blue-100 text-xs">Escala de grupos para este dia</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-500 p-2 rounded-lg text-2xl leading-none">&times;</button>
        </div>

        <div className={`flex-grow overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar ${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'}`}>
          {routes.filter(r => r.active).map(route => {
            const slot = visits.find(v => v.routeId === route.id && v.date === date);
            const memberIds = slot?.memberIds || [];
            const count = memberIds.length;
            const hasReport = !!slot?.report;
            
            const routePatients = patients.filter(p => {
              const isActive = p.active;
              const hName = p.hospitalName;
              const rHospitals = route.hospitals;
              
              if (!isActive || typeof hName !== 'string' || !Array.isArray(rHospitals)) return false;
              
              return rHospitals.includes(hName);
            });

            const isUserInRoute = currentUser && memberIds.includes(currentUser.id);
            const canManage = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.COORDINATOR;
            
            let buttonLabel = 'Entrar na Rota';
            let isButtonDisabled = false;
            let buttonClass = 'bg-blue-600 text-white hover:bg-blue-700';

            if (canManage) {
                buttonLabel = 'Gerenciar Dupla';
                buttonClass = isHospitalMode 
                    ? 'bg-[#1a1c1e] text-gray-300 border border-gray-700 hover:bg-gray-800' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50';
                isButtonDisabled = false; // Always enabled for managers
            } else {
                if (isUserInRoute) {
                    buttonLabel = 'Escalado';
                    isButtonDisabled = true;
                    buttonClass = isHospitalMode
                        ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed';
                } else if (count >= 2) {
                    buttonLabel = 'Rota Cheia';
                    isButtonDisabled = true;
                    buttonClass = isHospitalMode
                        ? 'bg-gray-800/50 text-gray-600 border border-gray-800 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-400 border border-gray-100 cursor-not-allowed';
                }
            }

            return (
              <div key={route.id} className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-xl shadow-sm border overflow-hidden p-5 flex flex-col gap-4`}>
                <div className="flex flex-col gap-4">
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <h4 className={`font-bold text-lg ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{route.name}</h4>
                            {/* WhatsApp Share Button for Managers */}
                            {canManage && count > 0 && (
                                <button 
                                    onClick={() => handleShareWhatsApp(route, memberIds)}
                                    className="p-1 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm"
                                    title="Enviar Escala no WhatsApp"
                                >
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                                </button>
                            )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                          count === 2 ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                          count === 1 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {count}/2
                        </span>
                    </div>
                    <p className={`text-[10px] uppercase font-bold tracking-tight mb-3 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {route.hospitals?.join(' • ') || 'Sem hospitais vinculados'}
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 bg-gray-50/5 p-3 rounded-lg border border-gray-500/10">
                       <div className="space-y-1">
                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Membros Escalados</p>
                          {count === 0 ? (
                            <p className="text-[10px] text-gray-400 italic">Vaga aberta para dupla</p>
                          ) : (
                            memberIds.map(id => (
                              <div key={id} className={`flex items-center gap-2 text-xs font-medium ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                <span className={isPrivacyMode ? 'blur-sm select-none' : ''}>{getMemberName(id)}</span>
                              </div>
                            ))
                          )}
                       </div>

                       <div className="space-y-1">
                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Pacientes ({routePatients.length})</p>
                          {routePatients.length === 0 ? (
                            <p className="text-[10px] text-gray-400 italic">Nenhum paciente.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {routePatients.map(p => (
                                <button 
                                  key={p.id} 
                                  onClick={() => onPatientClick(p)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded border transition-all truncate max-w-[100px] ${
                                    isHospitalMode 
                                      ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' 
                                      : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600'
                                  } ${isPrivacyMode ? 'blur-[2px]' : ''}`}
                                >
                                  {p.name.split(' ')[0]}
                                </button>
                              ))}
                            </div>
                          )}
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-500/10">
                      {slot && hasReport && (
                          <button onClick={() => onReportClick(slot)} className={`flex-1 py-3 sm:py-2 text-[11px] font-bold rounded-xl border transition-all ${isHospitalMode ? 'bg-blue-950/20 border-blue-900/50 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>Ver Relatório</button>
                      )}
                      <button 
                        onClick={() => onRouteClick(route, slot)}
                        disabled={isButtonDisabled}
                        className={`flex-1 py-3 sm:py-2 text-[11px] font-bold rounded-xl transition-all shadow-sm ${buttonClass}`}
                      >
                          {buttonLabel}
                      </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={`p-4 border-t shrink-0 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} flex justify-end`}>
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">Fechar Agenda</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
