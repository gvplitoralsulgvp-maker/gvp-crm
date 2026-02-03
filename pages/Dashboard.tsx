
import React, { useState, useMemo } from 'react';
import { AppState, VisitRoute, VisitSlot, Patient, VisitReport, Member, UserRole, AppEvent } from '../types';
import { CalendarWidget } from '../components/CalendarWidget';
import { FullCalendar } from '../components/FullCalendar';
import { DailyAgendaModal } from '../components/DailyAgendaModal';
import { MyVisitModal } from '../components/MyVisitModal';
import { ReportModal } from '../components/ReportModal';
import { SlotModal } from '../components/SlotModal';
import { QuickScaleModal } from '../components/QuickScaleModal';
import { ViewReportModal } from '../components/ViewReportModal';
import { SwapRequestModal } from '../components/SwapRequestModal';
import { CancelVisitModal } from '../components/CancelVisitModal';
import { PatientDetailModal } from '../components/PatientDetailModal';
import { EventDetailModal } from '../components/EventDetailModal';
import { AttendanceModal } from '../components/AttendanceModal';
import { atomicUpdate, atomicInsert } from '../services/storageService';

interface DashboardProps {
  state: AppState;
  onUpdateState: React.Dispatch<React.SetStateAction<AppState>>;
  isPrivacyMode: boolean;
  isHospitalMode?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onUpdateState, isPrivacyMode, isHospitalMode }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Modal States
  const [isDailyAgendaOpen, setIsDailyAgendaOpen] = useState(false);
  const [selectedRouteForSlot, setSelectedRouteForSlot] = useState<VisitRoute | null>(null);
  const [slotToEdit, setSlotToEdit] = useState<VisitSlot | null>(null); 
  
  const [myVisitData, setMyVisitData] = useState<{route: VisitRoute, slot: VisitSlot} | null>(null);
  const [reportData, setReportData] = useState<{slot: VisitSlot, route: VisitRoute} | null>(null);
  const [viewReportData, setViewReportData] = useState<{slot: VisitSlot, route: VisitRoute} | null>(null);
  
  const [isQuickScaleOpen, setIsQuickScaleOpen] = useState(false);
  const [swapRequestData, setSwapRequestData] = useState<{date: string} | null>(null);
  const [cancelVisitData, setCancelVisitData] = useState<{slot: VisitSlot, memberId: string} | null>(null);
  
  const [viewingPatientId, setViewingPatientId] = useState<string | null>(null);

  // Event & Attendance States
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);

  const viewingPatient = useMemo(() => 
    state.patients.find(p => p.id === viewingPatientId), 
  [state.patients, viewingPatientId]);

  // Derived Data
  const activeRoutes = useMemo(() => state.routes.filter(r => r.active), [state.routes]);
  
  const upcomingEvents = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      return state.events
          .filter(e => e.date >= today)
          .sort((a,b) => a.date.localeCompare(b.date))
          .slice(0, 3);
  }, [state.events]);

  // Filtra casos ativos ou com HLC-7 pendente designados para o membro COLIH atual
  const myActiveColihCases = useMemo(() => {
      if (!state.currentUser?.isColih) return [];
      return state.patients.filter(p => 
          (p.active || (p.isMedicalDischarge && p.pendingHlc7)) && // Mostra Ativos OU Alta Pendente HLC-7
          p.assignedColihIds?.includes(state.currentUser!.id)
      ).sort((a,b) => {
          // Prioriza HLC-7 Pendente
          if (a.pendingHlc7 && !b.pendingHlc7) return -1;
          if (!a.pendingHlc7 && b.pendingHlc7) return 1;
          return a.name.localeCompare(b.name);
      });
  }, [state.patients, state.currentUser]);

  const handleSlotSave = async (newMemberIds: string[]) => {
    if (!selectedRouteForSlot) return;
    
    const routeId = selectedRouteForSlot.id;
    const date = selectedDate;

    const existingSlot = state.visits.find(v => v.date === date && v.routeId === routeId);
    const slotId = existingSlot ? existingSlot.id : crypto.randomUUID();

    const newSlot: VisitSlot = {
        id: slotId,
        routeId: routeId,
        date: date,
        memberIds: newMemberIds,
        status: existingSlot ? existingSlot.status : 'PENDING',
        report: existingSlot ? existingSlot.report : undefined,
        onTheWayMemberIds: existingSlot ? existingSlot.onTheWayMemberIds : []
    };

    await atomicUpdate('visits', newSlot);
    
    onUpdateState(prev => {
        const idx = prev.visits.findIndex(v => v.id === slotId);
        const newVisits = [...prev.visits];
        if (idx >= 0) newVisits[idx] = newSlot;
        else newVisits.push(newSlot);
        return { ...prev, visits: newVisits };
    });
    
    setSelectedRouteForSlot(null);
  };

  const handleQuickScaleSave = async (newMemberIds: string[], date: string, route: VisitRoute, existingSlot?: VisitSlot) => {
      const slotId = existingSlot ? existingSlot.id : crypto.randomUUID();
      const newSlot: VisitSlot = {
          id: slotId,
          routeId: route.id,
          date: date,
          memberIds: newMemberIds,
          status: existingSlot ? existingSlot.status : 'PENDING',
          report: existingSlot ? existingSlot.report : undefined,
          onTheWayMemberIds: existingSlot ? existingSlot.onTheWayMemberIds : []
      };
      
      await atomicUpdate('visits', newSlot);
      
      onUpdateState(prev => {
          const idx = prev.visits.findIndex(v => v.id === slotId);
          const newVisits = [...prev.visits];
          if (idx >= 0) newVisits[idx] = newSlot;
          else newVisits.push(newSlot);
          return { ...prev, visits: newVisits };
      });
  };

  const handleSaveReport = async (report: VisitReport) => {
      if (!reportData) return;
      const { slot } = reportData;
      
      const updatedSlot: VisitSlot = { ...slot, report, status: 'FINISHED' };
      await atomicUpdate('visits', updatedSlot);
      
      onUpdateState(prev => ({
          ...prev,
          visits: prev.visits.map(v => v.id === slot.id ? updatedSlot : v)
      }));
      setReportData(null);
  };

  const handleRouteClick = (route: VisitRoute, slot: VisitSlot | undefined) => {
      const memberIds = slot ? slot.memberIds : [];
      const isMemberInSlot = state.currentUser && memberIds.includes(state.currentUser.id);
      
      if (isMemberInSlot) {
          setSelectedRouteForSlot(route);
          setSlotToEdit(slot || null); 
      } else {
          setSelectedRouteForSlot(route);
          setSlotToEdit(slot || null);
      }
  };

  const handleOpenMyVisit = (route: VisitRoute, slot: VisitSlot) => {
      setMyVisitData({ route, slot });
  };

  const handleCancelVisit = async () => {
      if (!myVisitData || !state.currentUser) return;
      setCancelVisitData({ slot: myVisitData.slot, memberId: state.currentUser.id });
      setMyVisitData(null);
  };

  const handleConfirmCancel = async (justification: string) => {
      if (!cancelVisitData) return;
      const { slot, memberId } = cancelVisitData;
      
      const newMemberIds = slot.memberIds.filter(id => id !== memberId);
      const updatedSlot = { ...slot, memberIds: newMemberIds };
      
      await atomicUpdate('visits', updatedSlot);
      
      const logEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          userId: memberId,
          userName: state.members.find(m => m.id === memberId)?.name || 'Unknown',
          action: 'CANCEL_VISIT',
          details: `Cancelou visita em ${slot.date}. Motivo: ${justification}`
      };
      await atomicInsert('logs', logEntry);

      onUpdateState(prev => ({
          ...prev,
          visits: prev.visits.map(v => v.id === slot.id ? updatedSlot : v),
          logs: [logEntry, ...prev.logs]
      }));
      
      setCancelVisitData(null);
  };

  const handleSwapRequest = () => {
      if (myVisitData) {
          setSwapRequestData({ date: myVisitData.slot.date });
          setMyVisitData(null);
      }
  };

  const handleConfirmSwap = async (newDate: string, note: string) => {
      alert("Solicitação de troca enviada aos coordenadores.");
      setSwapRequestData(null);
  };

  const handleFinishVisit = () => {
      if (myVisitData) {
          setReportData({ slot: myVisitData.slot, route: myVisitData.route });
          setMyVisitData(null);
      }
  };

  const handleDischarge = async (id: string, name: string) => {
      const p = state.patients.find(pt => pt.id === id);
      if (!p) return;
      
      // Lógica HLC-7: Se for GVP, marca como alta (some da lista GVP) e pendente HLC7 (aparece COLIH)
      // O botão no modal já distingue se é GVP ou COLIH realizando a ação.
      // Se essa função é chamada por GVP, é alta médica.
      const updated = { 
          ...p, 
          active: false, 
          isMedicalDischarge: true,
          pendingHlc7: true 
      };
      
      await atomicUpdate('patients', updated);
      onUpdateState(prev => ({
          ...prev,
          patients: prev.patients.map(pt => pt.id === id ? updated : pt)
      }));
  };

  // Nova função para quando o COLIH confirma HLC-7 enviado
  const handleHlc7Confirm = async (id: string, name: string, fileUrl?: string) => {
      const p = state.patients.find(pt => pt.id === id);
      if (!p) return;
      
      const updated = {
          ...p,
          pendingHlc7: false, // Remove pendência
          active: false, // Garante inativo
          isMedicalDischarge: true,
          hlc7FileUrl: fileUrl || p.hlc7FileUrl // Salva URL se fornecida
      };

      await atomicUpdate('patients', updated);
      onUpdateState(prev => ({
          ...prev,
          patients: prev.patients.map(pt => pt.id === id ? updated : pt)
      }));
  };

  const handleToggleGvp = async (patient: Patient) => {
      const updated = { ...patient, gvpRequestPending: !patient.gvpRequestPending };
      await atomicUpdate('patients', updated);
      onUpdateState(prev => ({
          ...prev,
          patients: prev.patients.map(p => p.id === patient.id ? updated : p)
      }));
  };

  const handleAssignColih = async (patientId: string, memberIds: string[]) => {
      const patient = state.patients.find(p => p.id === patientId);
      if (!patient) return;
      const updated = { ...patient, assignedColihIds: memberIds };
      await atomicUpdate('patients', updated);
      onUpdateState(prev => ({
          ...prev,
          patients: prev.patients.map(p => p.id === patientId ? updated : p)
      }));
  };

  const handleUpdatePatient = async (updatedPatient: Patient) => {
      await atomicUpdate('patients', updatedPatient);
      onUpdateState(prev => ({
          ...prev,
          patients: prev.patients.map(p => p.id === updatedPatient.id ? updatedPatient : p)
      }));
  };

  const handleAttendanceConfirm = async (present: boolean) => {
      if (!selectedEvent || !state.currentUser) return;
      
      let attendees = selectedEvent.attendees || [];
      if (present) {
          if (!attendees.includes(state.currentUser.id)) {
              attendees = [...attendees, state.currentUser.id];
          }
      } else {
          attendees = attendees.filter(id => id !== state.currentUser!.id);
      }

      const updatedEvent = { ...selectedEvent, attendees };
      
      try {
          await atomicUpdate('events', updatedEvent);
          onUpdateState(prev => ({
              ...prev,
              events: prev.events.map(e => e.id === updatedEvent.id ? updatedEvent : e)
          }));
      } catch (e) {
          alert("Erro ao atualizar presença.");
      }
      setIsAttendanceOpen(false);
      setSelectedEvent(null);
  };

  const getPartner = (slot: VisitSlot) => {
      const partnerId = slot.memberIds.find(id => id !== state.currentUser?.id);
      return partnerId ? state.members.find(m => m.id === partnerId) || null : null;
  };

  const getRecentHistory = (routeId: string) => {
      return state.visits
        .filter(v => v.routeId === routeId && v.report && v.status === 'FINISHED')
        .sort((a,b) => b.date.localeCompare(a.date))
        .slice(0, 3)
        .map(v => ({
            date: v.date,
            notes: v.report!.notes,
            visitorNames: v.memberIds.map(id => state.members.find(m => m.id === id)?.name).join(', ')
        }));
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
        
        {/* Header Section */}
        <div className={`p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div>
                <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Minha Agenda</h2>
                <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Gerencie suas visitas e escalas.</p>
            </div>
            <button 
                onClick={() => setIsQuickScaleOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all active:scale-95"
            >
                + Agendar Visita
            </button>
        </div>

        {/* Calendar Section - REORDERED FOR MOBILE (Widgets First) */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
            
            {/* Right Column (Widgets) - Order 1 on Mobile, Order 2 on Desktop */}
            <div className="order-1 lg:order-2 lg:col-span-1 space-y-6">
                <CalendarWidget selectedDate={selectedDate} onChange={setSelectedDate} />
                
                {/* WIDGET 1: MEUS CASOS COLIH (NOVO) */}
                {myActiveColihCases.length > 0 && (
                    <div className={`p-4 rounded-xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                        <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isHospitalMode ? 'text-teal-400' : 'text-teal-600'}`}>Meus Casos (COLIH)</h3>
                        <div className="space-y-3">
                            {myActiveColihCases.map(p => (
                                <div 
                                    key={p.id}
                                    onClick={() => setViewingPatientId(p.id)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md group ${isHospitalMode ? 'bg-teal-900/10 border-teal-900/30 hover:border-teal-800' : 'bg-teal-50 border-teal-100 hover:bg-white'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <p className={`text-sm font-bold truncate ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'} ${isPrivacyMode ? 'blur-sm select-none' : ''}`}>{p.name}</p>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${p.pendingHlc7 ? 'bg-red-500 text-white animate-pulse' : (isHospitalMode ? 'bg-teal-900/50 text-teal-300' : 'bg-white text-teal-600 shadow-sm')}`}>
                                            {p.pendingHlc7 ? 'Pendente HLC-7' : 'Ativo'}
                                        </span>
                                    </div>
                                    <p className={`text-[10px] truncate ${isHospitalMode ? 'text-gray-500' : 'text-gray-500'}`}>{p.hospitalName}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Upcoming Events Widget (Always Visible) */}
                <div className={`p-4 rounded-xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Próximos Eventos</h3>
                    {upcomingEvents.length > 0 ? (
                        <div className="space-y-3">
                            {upcomingEvents.map(e => (
                                <div 
                                    key={e.id}
                                    onClick={() => setSelectedEvent(e)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md group ${isHospitalMode ? 'bg-indigo-900/10 border-indigo-900/30 hover:border-indigo-800' : 'bg-indigo-50 border-indigo-100 hover:bg-white'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-xs font-bold ${isHospitalMode ? 'text-indigo-400' : 'text-indigo-700'}`}>{new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${isHospitalMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-white text-indigo-600 shadow-sm'}`}>
                                            {e.targetGroup === 'ALL' ? 'Geral' : e.targetGroup}
                                        </span>
                                    </div>
                                    <p className={`text-sm font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{e.title}</p>
                                    <p className={`text-[10px] mt-1 truncate ${isHospitalMode ? 'text-gray-500' : 'text-gray-500'}`}>{e.location || 'Local não definido'}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={`text-xs italic text-center py-2 ${isHospitalMode ? 'text-gray-600' : 'text-gray-400'}`}>Nenhum evento próximo.</p>
                    )}
                </div>

                {/* Upcoming Visits Widget */}
                <div className={`p-4 rounded-xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Próximas Visitas</h3>
                    <div className="space-y-3">
                        {state.visits
                            .filter(v => v.memberIds.includes(state.currentUser?.id || '') && v.date >= new Date().toISOString().split('T')[0])
                            .sort((a,b) => a.date.localeCompare(b.date))
                            .slice(0, 3)
                            .map(v => {
                                const route = state.routes.find(r => r.id === v.routeId);
                                return (
                                    <div 
                                        key={v.id} 
                                        onClick={() => route && handleOpenMyVisit(route, v)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${isHospitalMode ? 'bg-blue-900/10 border-blue-900/30 hover:border-blue-800' : 'bg-blue-50 border-blue-100 hover:bg-white'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-xs font-bold ${isHospitalMode ? 'text-blue-400' : 'text-blue-700'}`}>{new Date(v.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${v.status === 'FINISHED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {v.status === 'FINISHED' ? 'Realizada' : 'Agendada'}
                                            </span>
                                        </div>
                                        <p className={`text-sm font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{route?.name}</p>
                                    </div>
                                );
                            })
                        }
                        {state.visits.filter(v => v.memberIds.includes(state.currentUser?.id || '') && v.date >= new Date().toISOString().split('T')[0]).length === 0 && (
                            <p className={`text-xs italic text-center py-2 ${isHospitalMode ? 'text-gray-600' : 'text-gray-400'}`}>Nenhuma visita agendada.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Left Column (Main Calendar) - Order 2 on Mobile, Order 1 on Desktop */}
            <div className="order-2 lg:order-1 lg:col-span-2">
                <FullCalendar 
                    selectedDate={selectedDate} 
                    onChange={(d) => { setSelectedDate(d); setIsDailyAgendaOpen(true); }}
                    visits={state.visits}
                    routes={activeRoutes}
                    members={state.members}
                    currentUser={state.currentUser}
                    events={state.events}
                    isHospitalMode={isHospitalMode}
                />
            </div>
        </div>

        {/* MODALS */}
        
        {/* Daily Agenda */}
        <DailyAgendaModal 
            isOpen={isDailyAgendaOpen}
            onClose={() => setIsDailyAgendaOpen(false)}
            date={selectedDate}
            routes={activeRoutes}
            visits={state.visits}
            members={state.members}
            patients={state.patients}
            currentUser={state.currentUser}
            isPrivacyMode={isPrivacyMode}
            isHospitalMode={isHospitalMode}
            onRouteClick={(route, slot) => {
                const memberIds = slot ? slot.memberIds : [];
                if (state.currentUser && memberIds.includes(state.currentUser.id)) {
                    if (slot) handleOpenMyVisit(route, slot);
                } else {
                    handleRouteClick(route, slot);
                }
            }}
            onReportClick={(slot) => {
                const route = state.routes.find(r => r.id === slot.routeId);
                if (route) setViewReportData({ slot, route });
            }}
            onPatientClick={(patient) => setViewingPatientId(patient.id)}
            onEventClick={(event) => {
                setSelectedEvent(event);
                setIsDailyAgendaOpen(false); // Close agenda when viewing event details
            }}
            hospitals={state.hospitals}
            events={state.events}
        />

        {/* Slot Management (Join/Leave) */}
        {selectedRouteForSlot && (
            <SlotModal 
                isOpen={true}
                onClose={() => setSelectedRouteForSlot(null)}
                route={selectedRouteForSlot}
                currentMemberIds={slotToEdit ? slotToEdit.memberIds : []}
                allMembers={state.members}
                onSave={handleSlotSave}
                currentUser={state.currentUser}
                isHospitalMode={isHospitalMode}
                hospitals={state.hospitals}
                allVisits={state.visits}
                currentDate={selectedDate}
            />
        )}

        {/* My Visit Details (Action Center) */}
        {myVisitData && (
            <MyVisitModal 
                isOpen={true}
                onClose={() => setMyVisitData(null)}
                date={myVisitData.slot.date}
                route={myVisitData.route}
                partner={getPartner(myVisitData.slot)}
                hospitalDetails={state.hospitals.filter(h => myVisitData.route.hospitals?.includes(h.name))}
                patients={state.patients}
                recentHistory={getRecentHistory(myVisitData.route.id)}
                isHospitalMode={isHospitalMode}
                isPrivacyMode={isPrivacyMode}
                onSwapRequest={handleSwapRequest}
                onCancelVisit={handleCancelVisit}
                onOnTheWay={() => {}}
                onFinishVisit={handleFinishVisit}
                onPatientClick={(p) => setViewingPatientId(p.id)}
                slot={myVisitData.slot}
                currentUser={state.currentUser}
            />
        )}

        {/* Report Writing */}
        {reportData && (
            <ReportModal 
                isOpen={true}
                onClose={() => setReportData(null)}
                onSave={handleSaveReport}
                hospitalName={reportData.route.hospitals?.join(', ') || ''}
                visitParticipants={reportData.slot.memberIds.map(id => state.members.find(m => m.id === id)?.name).join(' & ')}
                recentHistory={getRecentHistory(reportData.route.id)}
                isHospitalMode={isHospitalMode}
            />
        )}

        {/* View Report */}
        {viewReportData && (
            <ViewReportModal 
                isOpen={true}
                onClose={() => setViewReportData(null)}
                slot={viewReportData.slot}
                route={viewReportData.route}
                members={state.members}
                isHospitalMode={isHospitalMode}
            />
        )}

        {/* Quick Scale */}
        <QuickScaleModal 
            isOpen={isQuickScaleOpen}
            onClose={() => setIsQuickScaleOpen(false)}
            state={state}
            onSave={handleQuickScaleSave}
            isHospitalMode={isHospitalMode}
        />

        {/* Swap Request */}
        {swapRequestData && (
            <SwapRequestModal 
                isOpen={true}
                onClose={() => setSwapRequestData(null)}
                currentDate={swapRequestData.date}
                onConfirm={handleConfirmSwap}
                isHospitalMode={isHospitalMode}
            />
        )}

        {/* Cancel Visit */}
        {cancelVisitData && (
            <CancelVisitModal 
                isOpen={true}
                onClose={() => setCancelVisitData(null)}
                onConfirm={handleConfirmCancel}
                isHospitalMode={isHospitalMode}
            />
        )}

        {/* Patient Detail Modal */}
        {viewingPatient && (
            <PatientDetailModal 
                isOpen={true}
                onClose={() => setViewingPatientId(null)}
                patient={viewingPatient}
                lastVisit={null} 
                members={state.members}
                logs={state.logs} 
                isHospitalMode={isHospitalMode}
                onDischarge={handleDischarge}
                onHlc7Confirm={handleHlc7Confirm}
                onToggleGvp={handleToggleGvp}
                onAssignColih={handleAssignColih}
                onUpdatePatient={handleUpdatePatient}
                canEdit={state.currentUser?.role === 'ADMIN' || state.currentUser?.isColih}
                canDischarge={true}
                isColihUser={state.currentUser?.isColih}
                currentUser={state.currentUser} 
            />
        )}

        {/* Event Details (With Attendance) */}
        {selectedEvent && (
            <EventDetailModal 
                isOpen={true}
                onClose={() => setSelectedEvent(null)}
                event={selectedEvent}
                currentUser={state.currentUser}
                onRegisterAttendance={() => setIsAttendanceOpen(true)}
                isHospitalMode={isHospitalMode}
            />
        )}

        {/* Attendance Confirmation */}
        {isAttendanceOpen && selectedEvent && (
            <AttendanceModal 
                isOpen={true}
                onClose={handleAttendanceConfirm}
                event={selectedEvent}
                isHospitalMode={isHospitalMode}
            />
        )}
    </div>
  );
};
