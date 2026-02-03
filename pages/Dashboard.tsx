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
  const [slotToEdit, setSlotToEdit] = useState<VisitSlot | null>(null); // For SlotModal
  
  const [myVisitData, setMyVisitData] = useState<{route: VisitRoute, slot: VisitSlot} | null>(null); // For MyVisitModal
  const [reportData, setReportData] = useState<{slot: VisitSlot, route: VisitRoute} | null>(null); // For ReportModal (writing)
  const [viewReportData, setViewReportData] = useState<{slot: VisitSlot, route: VisitRoute} | null>(null); // For ViewReportModal (reading)
  
  const [isQuickScaleOpen, setIsQuickScaleOpen] = useState(false);
  const [swapRequestData, setSwapRequestData] = useState<{date: string} | null>(null);
  const [cancelVisitData, setCancelVisitData] = useState<{slot: VisitSlot, memberId: string} | null>(null);
  
  const [viewingPatientId, setViewingPatientId] = useState<string | null>(null);

  const viewingPatient = useMemo(() => 
    state.patients.find(p => p.id === viewingPatientId), 
  [state.patients, viewingPatientId]);

  // Derived Data
  const activeRoutes = useMemo(() => state.routes.filter(r => r.active), [state.routes]);
  
  const handleSlotSave = async (newMemberIds: string[]) => {
    if (!selectedRouteForSlot) return;
    
    // Check if slot exists for date and route
    const existingSlotIndex = state.visits.findIndex(v => v.date === selectedDate && v.routeId === selectedRouteForSlot.id);
    let newVisits = [...state.visits];
    let slotId = existingSlotIndex >= 0 ? newVisits[existingSlotIndex].id : crypto.randomUUID();

    const newSlot: VisitSlot = {
        id: slotId,
        routeId: selectedRouteForSlot.id,
        date: selectedDate,
        memberIds: newMemberIds,
        status: existingSlotIndex >= 0 ? newVisits[existingSlotIndex].status : 'PENDING',
        report: existingSlotIndex >= 0 ? newVisits[existingSlotIndex].report : undefined,
        onTheWayMemberIds: existingSlotIndex >= 0 ? newVisits[existingSlotIndex].onTheWayMemberIds : []
    };

    if (existingSlotIndex >= 0) {
        newVisits[existingSlotIndex] = newSlot;
    } else {
        newVisits.push(newSlot);
    }

    await atomicUpdate('visits', newSlot);
    onUpdateState({ ...state, visits: newVisits });
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
      // Update local state
      const existingIdx = state.visits.findIndex(v => v.id === slotId);
      let newVisits = [...state.visits];
      if (existingIdx >= 0) {
          newVisits[existingIdx] = newSlot;
      } else {
          newVisits.push(newSlot);
      }
      onUpdateState({ ...state, visits: newVisits });
  };

  const handleSaveReport = async (report: VisitReport) => {
      if (!reportData) return;
      const { slot } = reportData;
      
      const updatedSlot: VisitSlot = { ...slot, report, status: 'FINISHED' };
      await atomicUpdate('visits', updatedSlot);
      
      const updatedVisits = state.visits.map(v => v.id === slot.id ? updatedSlot : v);
      onUpdateState({ ...state, visits: updatedVisits });
      setReportData(null);
  };

  const handleRouteClick = (route: VisitRoute, slot: VisitSlot | undefined) => {
      const memberIds = slot ? slot.memberIds : [];
      const isMemberInSlot = state.currentUser && memberIds.includes(state.currentUser.id);
      
      // If user is part of the slot, open MyVisitModal logic (or details)
      // Actually MyVisitModal is for "My Visit" details.
      // If we are in DailyAgendaModal, clicking "Entrar na Rota" or "Gerenciar" should open SlotModal.
      // But if I am already in the route, maybe I want to see details.
      
      if (isMemberInSlot) {
          // Open MyVisitModal for today or future
          // But wait, the button in DailyAgendaModal says "Entrar na Rota" or "Gerenciar" or "Escalado".
          // If "Escalado", it might be disabled or open details.
          // Let's assume SlotModal is for editing the scale.
          setSelectedRouteForSlot(route);
          // Current members for this slot
          setSlotToEdit(slot || null); 
      } else {
          // Open SlotModal to join/manage
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
      onUpdateState({ ...state, visits: state.visits.map(v => v.id === slot.id ? updatedSlot : v) });
      
      // Log cancellation
      const logEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          userId: memberId,
          userName: state.members.find(m => m.id === memberId)?.name || 'Unknown',
          action: 'CANCEL_VISIT',
          details: `Cancelou visita em ${slot.date}. Motivo: ${justification}`
      };
      await atomicInsert('logs', logEntry);
      onUpdateState(prev => ({ ...prev, logs: [logEntry, ...prev.logs] }));
      
      setCancelVisitData(null);
  };

  const handleSwapRequest = () => {
      if (myVisitData) {
          setSwapRequestData({ date: myVisitData.slot.date });
          setMyVisitData(null);
      }
  };

  const handleConfirmSwap = async (newDate: string, note: string) => {
      // Implement swap logic (notification to admins/coordinators)
      // For now just log or alert
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
      const updated = { ...p, active: false, isMedicalDischarge: true };
      await atomicUpdate('patients', updated);
      onUpdateState({ ...state, patients: state.patients.map(pt => pt.id === id ? updated : pt) });
  };

  const handleToggleGvp = async (patient: Patient) => {
      const updated = { ...patient, gvpRequestPending: !patient.gvpRequestPending };
      await atomicUpdate('patients', updated);
      onUpdateState({ ...state, patients: state.patients.map(p => p.id === patient.id ? updated : p) });
  };

  const handleAssignColih = async (patientId: string, memberIds: string[]) => {
      const patient = state.patients.find(p => p.id === patientId);
      if (!patient) return;
      const updated = { ...patient, assignedColihIds: memberIds };
      await atomicUpdate('patients', updated);
      onUpdateState({ ...state, patients: state.patients.map(p => p.id === patientId ? updated : p) });
  };

  const handleUpdatePatient = async (updatedPatient: Patient) => {
      await atomicUpdate('patients', updatedPatient);
      onUpdateState({ ...state, patients: state.patients.map(p => p.id === updatedPatient.id ? updatedPatient : p) });
      if (viewingPatient && viewingPatient.id === updatedPatient.id) {
          // Update local viewing patient if open
          // But viewingPatient is memoized from state, so it should update automatically
      }
  };

  // Helper to find partner
  const getPartner = (slot: VisitSlot) => {
      const partnerId = slot.memberIds.find(id => id !== state.currentUser?.id);
      return partnerId ? state.members.find(m => m.id === partnerId) || null : null;
  };

  // Helper for recent history
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

        {/* Calendar Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
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
            <div>
                <CalendarWidget selectedDate={selectedDate} onChange={setSelectedDate} />
                
                {/* Upcoming Visits Widget */}
                <div className={`mt-6 p-4 rounded-xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
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
                            <p className="text-xs text-gray-400 italic text-center py-2">Nenhuma visita agendada.</p>
                        )}
                    </div>
                </div>
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
                // If the user is part of the slot, allow them to manage it details (MyVisitModal is accessed via widget or clicking self in logic usually)
                // Here we want to handle the "Action Button" in the modal.
                // If button says "Entrar na Rota", we open SlotModal.
                // If button says "Escalado", it might be disabled in the modal or open MyVisitModal.
                // Let's assume handleRouteClick maps to "Manage Slot" action.
                
                const memberIds = slot ? slot.memberIds : [];
                if (state.currentUser && memberIds.includes(state.currentUser.id)) {
                    // Already escalated.
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
                onOnTheWay={() => {
                    // Force refresh/re-render handled by state update in modal
                }}
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
                lastVisit={null} // Can compute last visit for this patient if needed
                members={state.members}
                logs={state.logs} 
                isHospitalMode={isHospitalMode}
                onDischarge={handleDischarge}
                onToggleGvp={handleToggleGvp}
                onAssignColih={handleAssignColih}
                onUpdatePatient={handleUpdatePatient}
                canEdit={state.currentUser?.role === 'ADMIN' || state.currentUser?.isColih}
                canDischarge={true}
                isColihUser={state.currentUser?.isColih}
                currentUser={state.currentUser} 
            />
        )}
    </div>
  );
};