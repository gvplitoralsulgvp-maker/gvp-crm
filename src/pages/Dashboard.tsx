import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppState, VisitRoute, VisitSlot, UserRole, LogEntry, Notification, Member, Hospital } from '@/types';
import { Button } from '../components/Button';
import { ReportModal, HistoryItem } from '../components/ReportModal';
import { FullCalendar } from '../components/FullCalendar';
import { SlotModal } from '../components/SlotModal';
import { MyVisitModal } from '../components/MyVisitModal';
import { FinishVisitModal } from '../components/FinishVisitModal';
import { CancelVisitModal } from '../components/CancelVisitModal';
import { SwapRequestModal } from '../components/SwapRequestModal';

interface DashboardProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  isPrivacyMode: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onUpdateState, isPrivacyMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterMemberId, setFilterMemberId] = useState<string>('');
  
  // Modal States
  const [reportSlot, setReportSlot] = useState<VisitSlot | null>(null);
  const [selectionModalData, setSelectionModalData] = useState<{route: VisitRoute, slot: VisitSlot | undefined} | null>(null);
  const [finishVisitSlot, setFinishVisitSlot] = useState<VisitSlot | null>(null);
  const [cancelVisitSlot, setCancelVisitSlot] = useState<VisitSlot | null>(null);
  const [swapVisitSlot, setSwapVisitSlot] = useState<VisitSlot | null>(null);
  
  const [myVisitDetails, setMyVisitDetails] = useState<{
      visit: VisitSlot,
      route: VisitRoute,
      partner: Member | null,
      hospitals: Hospital[]
  } | null>(null);

  // Check for navigation state
  useEffect(() => {
    if (location.state && location.state.filterMemberId) {
        setFilterMemberId(location.state.filterMemberId);
    }
  }, [location.state]);

  const getSlot = (routeId: string): VisitSlot | undefined => {
    return state.visits.find(v => v.routeId === routeId && v.date === selectedDate);
  };

  const getMemberName = (id: string) => {
    return state.members.find(m => m.id === id)?.name || 'Desconhecido';
  };

  const getSlotMemberNames = (slot: VisitSlot | null): string => {
    if (!slot) return '';
    return slot.memberIds.map(id => getMemberName(id)).join(', ');
  };

  const getRouteHistory = (routeId: string): HistoryItem[] => {
      const pastVisits = state.visits
        .filter(v => v.routeId === routeId && v.report && v.date < selectedDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
      return pastVisits.map(v => ({
          date: v.date,
          notes: v.report!.notes,
          visitorNames: v.memberIds.map(id => getMemberName(id)).join(', ')
      }));
  };

  // --- ACTIONS ---

  const handleSaveSlotMembers = (newMemberIds: string[]) => {
    if (!selectionModalData || !state.currentUser) return;
    const { route, slot } = selectionModalData;
    let newVisits = [...state.visits];
    let newNotifications = [...state.notifications];

    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId: state.currentUser.id,
      userName: state.currentUser.name,
      action: slot ? 'Atualizou Visita' : 'Agendou Visita',
      details: `Alterou visita na rota "${route.name}" para o dia ${selectedDate}.`
    };

    const oldMemberIds = slot ? slot.memberIds : [];
    const addedMembers = newMemberIds.filter(id => !oldMemberIds.includes(id));
    
    addedMembers.forEach(addedId => {
       const existingMemberIds = newMemberIds.filter(id => id !== addedId);
       existingMemberIds.forEach(existingId => {
           if (existingId !== state.currentUser?.id) {
               newNotifications.unshift({
                   id: crypto.randomUUID(),
                   userId: existingId,
                   message: `${getMemberName(addedId)} confirmou presença na sua dupla para o dia ${new Date(selectedDate).toLocaleDateString('pt-BR')} (${route.name}).`,
                   type: 'success',
                   read: false,
                   timestamp: new Date().toISOString()
               });
           }
       });
       if (state.currentUser?.id !== addedId) {
           newNotifications.unshift({
                id: crypto.randomUUID(),
                userId: addedId,
                message: `Você foi escalado para visita no dia ${new Date(selectedDate).toLocaleDateString('pt-BR')} em ${route.name}.`,
                type: 'info',
                read: false,
                timestamp: new Date().toISOString()
           });
       }
    });

    if (slot) {
        if (newMemberIds.length === 0) {
            newVisits = newVisits.filter(v => v.id !== slot.id);
            newLog.action = 'Cancelou Visita';
            newLog.details = `Removeu agendamento da rota "${route.name}" no dia ${selectedDate}.`;
        } else {
            newVisits = newVisits.map(v => v.id === slot.id ? { ...v, memberIds: newMemberIds } : v);
        }
    } else if (newMemberIds.length > 0) {
        newVisits.push({
            id: crypto.randomUUID(),
            routeId: route.id,
            date: selectedDate,
            memberIds: newMemberIds
        });
    }

    onUpdateState({ 
      ...state, 
      visits: newVisits,
      logs: [newLog, ...state.logs],
      notifications: newNotifications
    });
    setSelectionModalData(null);
  };

  const handleFinishVisitConfirm = (note: string) => {
    if (!finishVisitSlot || !state.currentUser) return;
    const report = {
        doctorName: getSlotMemberNames(finishVisitSlot),
        notes: note,
        followUpNeeded: false,
        createdAt: new Date().toISOString()
    };
    const newVisits = state.visits.map(v => v.id === finishVisitSlot.id ? { ...v, report } : v);
    const newLog: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userId: state.currentUser.id,
        userName: state.currentUser.name,
        action: 'Concluiu Visita',
        details: `Finalizou visita da rota na data ${finishVisitSlot.date}`
    };
    onUpdateState({ ...state, visits: newVisits, logs: [newLog, ...state.logs] });
    setFinishVisitSlot(null);
  };

  const handleOpenMyVisit = (visit: VisitSlot) => {
      const route = state.routes.find(r => r.id === visit.routeId);
      if (!route) return;
      const partnerId = visit.memberIds.find(id => id !== state.currentUser?.id);
      const partner = partnerId ? state.members.find(m => m.id === partnerId) || null : null;
      const routeHospitalDetails = state.hospitals.filter(h => route.hospitals.includes(h.name));

      setMyVisitDetails({ visit, route, partner, hospitals: routeHospitalDetails });
  };

  const handlePatientClick = (e: React.MouseEvent, patientId: string) => {
    e.stopPropagation(); 
    navigate('/patients', { state: { targetPatientId: patientId } });
  };

  // --- NEW FEATURES ---

  const handleOnMyWay = (e: React.MouseEvent, partnerId?: string) => {
      e.stopPropagation();
      if (!partnerId) return;
      
      const newNotif: Notification = {
          id: crypto.randomUUID(),
          userId: partnerId,
          message: `${state.currentUser?.name} está a caminho da visita!`,
          type: 'info',
          read: false,
          timestamp: new Date().toISOString()
      };
      
      onUpdateState({ ...state, notifications: [newNotif, ...state.notifications] });
      alert("Seu parceiro foi avisado que você está a caminho!");
  };

  // --- SWAP LOGIC ---
  const handleSwapConfirm = (newDate: string, note: string) => {
      if (!swapVisitSlot || !state.currentUser) return;
      const routeName = state.routes.find(r => r.id === swapVisitSlot.routeId)?.name || 'Rota';
      
      // Notify admins
      const admins = state.members.filter(m => m.role === UserRole.ADMIN && m.active);
      const newNotifications = [...state.notifications];
      
      const details = newDate 
        ? `Sugere trocar para: ${new Date(newDate).toLocaleDateString('pt-BR')}. ${note}` 
        : `Apenas solicitou troca. ${note}`;

      admins.forEach(a => {
          newNotifications.unshift({
              id: crypto.randomUUID(),
              userId: a.id,
              message: `TROCA: ${state.currentUser?.name} deseja trocar a visita do dia ${new Date(swapVisitSlot.date).toLocaleDateString()} (${routeName}). ${details}`,
              type: 'warning',
              read: false,
              timestamp: new Date().toISOString()
          });
      });
      
      onUpdateState({ ...state, notifications: newNotifications });
      setSwapVisitSlot(null);
      alert("Solicitação de troca enviada aos administradores.");
  };

  // --- CANCEL LOGIC ---
  const handleCancelConfirm = (justification: string) => {
      if (!cancelVisitSlot || !state.currentUser) return;

      // 1. Remove current user from slot
      const newMemberIds = cancelVisitSlot.memberIds.filter(id => id !== state.currentUser?.id);
      
      // 2. Update Visits State (Delete if empty or Update if partner remains)
      let newVisits;
      if (newMemberIds.length === 0) {
           newVisits = state.visits.filter(v => v.id !== cancelVisitSlot.id);
      } else {
           newVisits = state.visits.map(v => v.id === cancelVisitSlot.id ? { ...v, memberIds: newMemberIds } : v);
      }

      // 3. Notifications (Partner + Admins)
      let newNotifications = [...state.notifications];
      const routeName = state.routes.find(r => r.id === cancelVisitSlot.routeId)?.name || 'Rota';
      const formattedDate = new Date(cancelVisitSlot.date).toLocaleDateString('pt-BR');

      // Notify Partner
      const partnerId = cancelVisitSlot.memberIds.find(id => id !== state.currentUser?.id);
      if (partnerId) {
          newNotifications.unshift({
             id: crypto.randomUUID(),
             userId: partnerId,
             message: `AVISO: ${state.currentUser.name} cancelou a visita do dia ${formattedDate} (${routeName}). Motivo: ${justification}`,
             type: 'warning',
             read: false,
             timestamp: new Date().toISOString()
          });
      }

      // Notify Admins
      const admins = state.members.filter(m => m.role === UserRole.ADMIN && m.active);
      admins.forEach(a => {
         if (a.id !== partnerId) { // Avoid double notif if admin is partner
            newNotifications.unshift({
                id: crypto.randomUUID(),
                userId: a.id,
                message: `CANCELAMENTO: ${state.currentUser?.name} saiu da visita de ${formattedDate}. Vaga aberta! Motivo: ${justification}`,
                type: 'warning',
                read: false,
                timestamp: new Date().toISOString()
             });
         }
      });

      // 4. Log
      const newLog: LogEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          action: 'Cancelou Visita',
          details: `Cancelou visita dia ${formattedDate}. Justificativa: ${justification}`
      };

      onUpdateState({ 
          ...state, 
          visits: newVisits, 
          notifications: newNotifications, 
          logs: [newLog, ...state.logs] 
      });
      setCancelVisitSlot(null);
  };

  const formattedDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { 
    weekday: 'long', day: 'numeric', month: 'long' 
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const myUpcomingVisits = state.visits
    .filter(v => v.memberIds.includes(state.currentUser?.id || ''))
    .filter(v => v.date >= todayStr)
    .filter(v => !v.report)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-8">
      
      {/* --- SEÇÃO MINHAS VISITAS --- */}
      <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-lg border border-blue-100 shadow-sm">
         <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
            </span>
            Minhas Próximas Visitas
         </h2>
         
         {myUpcomingVisits.length === 0 ? (
             <p className="text-gray-500 italic text-sm">Você não possui visitas pendentes a partir de hoje.</p>
         ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {myUpcomingVisits.map(visit => {
                     const route = state.routes.find(r => r.id === visit.routeId);
                     const partnerId = visit.memberIds.find(id => id !== state.currentUser?.id);
                     const partner = partnerId ? state.members.find(m => m.id === partnerId) : null;
                     const isToday = visit.date === todayStr;

                     const patientsInRoute = state.patients.filter(p => p.active && route && route.hospitals.includes(p.hospitalName));

                     return (
                         <div 
                           key={visit.id} 
                           onClick={() => handleOpenMyVisit(visit)}
                           className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md group bg-white relative flex flex-col justify-between ${isToday ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'}`}
                         >
                             <div>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className={`text-sm font-bold ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                                            {new Date(visit.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            {isToday && <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold uppercase">Hoje</span>}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">{route?.name || 'Rota Desconhecida'}</p>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-2 items-end z-10">
                                         {/* Conclude Button only if Today */}
                                         <button
                                             onClick={(e) => { e.stopPropagation(); setFinishVisitSlot(visit); }}
                                             className="w-full text-center text-xs bg-green-600 text-white px-3 py-1.5 rounded shadow-sm hover:bg-green-700 font-bold transition-colors"
                                         >
                                             ✅ Concluir Visita
                                         </button>
                                         
                                         <div className="flex gap-2">
                                             {/* Swap Button */}
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); setSwapVisitSlot(visit); }}
                                                className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-1.5 rounded hover:bg-yellow-100 transition-colors font-medium"
                                                title="Solicitar troca de turno"
                                             >
                                                Trocar
                                             </button>

                                             {/* Cancel Button - Always Available */}
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); setCancelVisitSlot(visit); }}
                                                className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1.5 rounded hover:bg-red-100 transition-colors font-medium"
                                                title="Cancelar minha participação"
                                             >
                                                Cancelar
                                             </button>
                                         </div>
                                    </div>
                                </div>
                                
                                <div className="mt-3 bg-gray-50 p-2 rounded mb-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                            {partner ? partner.name.substring(0,2).toUpperCase() : '?'}
                                        </div>
                                        <div className="overflow-hidden flex-grow">
                                            <p className="text-xs text-gray-500">Seu parceiro:</p>
                                            <p className={`text-sm font-medium text-gray-900 truncate ${isPrivacyMode ? 'blur-sm' : ''}`}>
                                                {partner ? partner.name : <span className="text-yellow-600 font-normal italic">Aguardando dupla</span>}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Partner Actions */}
                                    {partner && (
                                        <div className="flex gap-2 justify-end">
                                            {partner.phone && (
                                                <a 
                                                    href={`https://wa.me/${partner.phone}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={e => e.stopPropagation()}
                                                    className="flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                                                >
                                                    WhatsApp
                                                </a>
                                            )}
                                            {isToday && (
                                                <button 
                                                    onClick={(e) => handleOnMyWay(e, partner.id)}
                                                    className="flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                                >
                                                    Estou a caminho
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                             </div>

                             {patientsInRoute.length > 0 && (
                                <div className="border-t border-gray-100 pt-2">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Pacientes Internados</p>
                                    <div className="flex flex-wrap gap-2">
                                        {patientsInRoute.map(p => (
                                            <button 
                                                key={p.id}
                                                onClick={(e) => handlePatientClick(e, p.id)}
                                                className={`text-xs px-2 py-1 rounded hover:bg-opacity-80 transition-colors flex items-center gap-1 border
                                                    ${p.isIsolation 
                                                        ? 'bg-red-50 text-red-700 border-red-200' 
                                                        : 'bg-green-50 text-green-700 border-green-200'
                                                    }`}
                                                title={p.isIsolation ? "Paciente em Isolamento" : "Clique para detalhes"}
                                            >
                                                {p.isIsolation && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-red-600">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                                <span className={isPrivacyMode ? 'blur-sm select-none' : ''}>{p.name.split(' ')[0]}</span>
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

      {/* Calendar & Filters */}
      <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
             <h2 className="text-xl font-bold text-gray-800">Agenda Geral</h2>
             <div className="w-full sm:w-64">
                <select 
                    value={filterMemberId}
                    onChange={(e) => setFilterMemberId(e.target.value)}
                    className="w-full border-gray-300 rounded-md text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                >
                    <option value="">Status Geral (Semáforo)</option>
                    <optgroup label="Filtrar por Membro">
                        {state.members
                            .filter(m => m.active)
                            .sort((a,b) => a.name.localeCompare(b.name))
                            .map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))
                        }
                    </optgroup>
                </select>
             </div>
          </div>

          <FullCalendar 
            selectedDate={selectedDate} 
            onChange={setSelectedDate} 
            visits={state.visits}
            routes={state.routes}
            filterMemberId={filterMemberId}
          />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
           <h3 className="text-xl font-bold text-gray-800 capitalize">{formattedDate}</h3>
           {filterMemberId && (
               <span className={`text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium ${isPrivacyMode ? 'blur-sm' : ''}`}>
                   Filtrando: {getMemberName(filterMemberId)}
               </span>
           )}
        </div>
        
        {state.routes.filter(r => r.active).map(route => {
          const slot = getSlot(route.id);
          const memberIds = slot?.memberIds || [];
          const count = memberIds.length;
          
          let borderClass = "border-l-4 ";
          let statusBg = "";
          
          const isUserInSlot = filterMemberId && slot?.memberIds.includes(filterMemberId);

          if (filterMemberId) {
             if (isUserInSlot) {
                 borderClass += "border-blue-500 border-blue-200 ring-1 ring-blue-300";
                 statusBg = "bg-blue-50";
             } else {
                 borderClass += "border-gray-300 border-gray-200 opacity-60";
                 statusBg = "bg-white";
             }
          } else {
              if (count === 0) {
                borderClass += "border-red-500 border-gray-200"; 
                statusBg = "bg-red-50";
              } else if (count === 1) {
                borderClass += "border-yellow-400 border-gray-200"; 
                statusBg = "bg-yellow-50";
              } else {
                borderClass += "border-green-500 border-green-200"; 
                statusBg = "bg-green-50";
              }
          }

          const hasReport = !!slot?.report;
          const isMySlot = slot?.memberIds.includes(state.currentUser?.id || '');
          const canEditReport = isMySlot || state.currentUser?.role === UserRole.ADMIN;

          return (
            <div key={route.id} className={`bg-white rounded-lg shadow-sm border ${borderClass} overflow-hidden transition-all hover:shadow-md`}>
              <div 
                className={`p-4 cursor-pointer ${statusBg}`}
                onClick={() => setSelectionModalData({ route, slot })}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">{route.name}</h4>
                    <p className="text-sm text-gray-500 mb-2">
                        {route.hospitals.join(' + ')}
                    </p>
                  </div>
                  <div className="text-right">
                     {!filterMemberId && (
                         <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${
                        count === 2 ? 'bg-green-100 text-green-700' : 
                        count === 1 ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-red-100 text-red-700'
                        }`}>
                        {count}/2 Confirmados
                        </span>
                     )}
                     {filterMemberId && isUserInSlot && (
                         <span className="text-xs font-bold px-2 py-1 rounded-full uppercase bg-blue-100 text-blue-700">
                             Escalado
                         </span>
                     )}
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  {count === 0 ? (
                    <p className="text-sm text-gray-400 italic">Toque para agendar visita</p>
                  ) : (
                    memberIds.map(id => (
                      <div key={id} className={`flex items-center gap-2 font-medium ${filterMemberId && id === filterMemberId ? 'text-blue-700 font-bold' : 'text-gray-800'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${filterMemberId && id === filterMemberId ? 'text-blue-600' : 'text-gray-500'}`}>
                           <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                        </svg>
                        <span className={isPrivacyMode ? 'blur-sm select-none' : ''}>{getMemberName(id)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {(count > 0) && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-end">
                   {hasReport ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setReportSlot(slot!); }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                         </svg>
                         Ver Relatório
                      </button>
                   ) : (
                      canEditReport && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); setReportSlot(slot!); }}
                        >
                          + Adicionar Relatório
                        </Button>
                      )
                   )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectionModalData && (
        <SlotModal 
          isOpen={true}
          onClose={() => setSelectionModalData(null)}
          route={selectionModalData.route}
          currentMemberIds={selectionModalData.slot?.memberIds || []}
          allMembers={state.members}
          currentUser={state.currentUser}
          onSave={handleSaveSlotMembers}
        />
      )}

      {myVisitDetails && (
          <MyVisitModal
             isOpen={true}
             onClose={() => setMyVisitDetails(null)}
             date={myVisitDetails.visit.date}
             route={myVisitDetails.route}
             partner={myVisitDetails.partner}
             hospitalDetails={myVisitDetails.hospitals}
             recentHistory={getRouteHistory(myVisitDetails.visit.routeId)}
          />
      )}
      
      {finishVisitSlot && (
        <FinishVisitModal
          isOpen={true}
          onClose={() => setFinishVisitSlot(null)}
          onConfirm={handleFinishVisitConfirm}
        />
      )}

      {cancelVisitSlot && (
        <CancelVisitModal
          isOpen={true}
          onClose={() => setCancelVisitSlot(null)}
          onConfirm={handleCancelConfirm}
        />
      )}

      {swapVisitSlot && (
        <SwapRequestModal
          isOpen={true}
          currentDate={swapVisitSlot.date}
          onClose={() => setSwapVisitSlot(null)}
          onConfirm={handleSwapConfirm}
        />
      )}

      {reportSlot && (
        <ReportModal
          isOpen={true}
          hospitalName={state.routes.find(r => r.id === reportSlot.routeId)?.name || ''}
          visitParticipants={getSlotMemberNames(reportSlot)}
          recentHistory={getRouteHistory(reportSlot.routeId)}
          initialReport={reportSlot.report}
          onClose={() => setReportSlot(null)}
          onSave={(report) => {
            const newVisits = state.visits.map(v => v.id === reportSlot.id ? { ...v, report } : v);
            
            let newNotifications = [...state.notifications];
            if (report.followUpNeeded) {
               const admins = state.members.filter(m => m.role === UserRole.ADMIN && m.active);
               const routeName = state.routes.find(r => r.id === reportSlot.routeId)?.name || 'Rota';
               admins.forEach(admin => {
                  newNotifications.unshift({
                     id: crypto.randomUUID(),
                     userId: admin.id,
                     message: `URGENTE: Relatório da ${routeName} requer atenção imediata! (Data: ${new Date(reportSlot.date).toLocaleDateString()})`,
                     type: 'warning',
                     read: false,
                     timestamp: new Date().toISOString()
                  });
               });
            }

            const newLog: LogEntry = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                userId: state.currentUser?.id || 'sys',
                userName: state.currentUser?.name || 'System',
                action: 'Relatório',
                details: `Adicionou/Editou relatório para a rota.`
            };
            onUpdateState({ ...state, visits: newVisits, logs: [newLog, ...state.logs], notifications: newNotifications });
          }}
        />
      )}
    </div>
  );
};