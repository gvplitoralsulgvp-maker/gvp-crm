
import React from 'react';
import { VisitRoute, VisitSlot, Member, UserRole, Patient } from '../types';
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
}

export const DailyAgendaModal: React.FC<DailyAgendaModalProps> = ({
  isOpen, onClose, date, routes, visits, members, patients, currentUser, isPrivacyMode, isHospitalMode, onRouteClick, onReportClick, onPatientClick
}) => {
  if (!isOpen) return null;

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { 
    weekday: 'long', day: 'numeric', month: 'long' 
  });

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Desconhecido';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
        <div className="bg-blue-600 px-6 py-5 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-white font-bold text-xl capitalize">{formattedDate}</h3>
            <p className="text-blue-100 text-xs">Escala de grupos para este dia</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-500 p-2 rounded-lg">&times;</button>
        </div>

        <div className={`flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar ${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'}`}>
          {routes.filter(r => r.active).map(route => {
            const slot = visits.find(v => v.routeId === route.id && v.date === date);
            const memberIds = slot?.memberIds || [];
            const count = memberIds.length;
            const hasReport = !!slot?.report;
            
            // Pacientes nesta rota
            const routePatients = patients.filter(p => p.active && route.hospitals.includes(p.hospitalName));

            return (
              <div key={route.id} className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-xl shadow-sm border overflow-hidden p-5 flex flex-col gap-4`}>
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-grow">
                    <h4 className={`font-bold text-base ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{route.name}</h4>
                    <p className={`text-[10px] uppercase font-bold tracking-tight mb-3 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>{route.hospitals.join(' • ')}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                       {/* Dupla */}
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

                       {/* Pacientes */}
                       <div className="space-y-1">
                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Pacientes na Rota ({routePatients.length})</p>
                          {routePatients.length === 0 ? (
                            <p className="text-[10px] text-gray-400 italic">Nenhum paciente ativo nesta rota.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {routePatients.map(p => (
                                <button 
                                  key={p.id} 
                                  onClick={() => onPatientClick(p)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded border transition-all ${
                                    isHospitalMode 
                                      ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' 
                                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600'
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

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                      count === 2 ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                      count === 1 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      {count}/2 Confirmados
                    </span>
                    <div className="flex gap-2">
                        {slot && hasReport && (
                            <button onClick={() => onReportClick(slot)} className={`text-[10px] font-bold px-3 py-2 rounded-lg border transition-all ${isHospitalMode ? 'bg-blue-950/20 border-blue-900/50 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>Relatório</button>
                        )}
                        <button onClick={() => onRouteClick(route, slot)} className={`text-[10px] font-bold px-4 py-2 rounded-lg transition-all ${count < 2 ? 'bg-blue-600 text-white shadow-sm' : (isHospitalMode ? 'bg-[#1a1c1e] text-gray-400 border-gray-700' : 'bg-white text-gray-600 border-gray-200')}`}>
                            {count < 2 ? 'Entrar na Rota' : 'Gerenciar'}
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={`p-4 border-t ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} flex justify-end`}>
          <Button variant="secondary" onClick={onClose}>Fechar Agenda</Button>
        </div>
      </div>
    </div>
  );
};
