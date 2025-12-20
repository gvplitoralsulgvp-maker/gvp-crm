
import React, { useState } from 'react';
import { AppState, VisitRoute, VisitSlot, UserRole, Member, Hospital, Notification, Patient } from '@/types';
import { ReportModal, HistoryItem } from '../components/ReportModal';
import { FullCalendar } from '../components/FullCalendar';
import { SlotModal } from '../components/SlotModal';
import { MyVisitModal } from '../components/MyVisitModal';
import { DailyAgendaModal } from '../components/DailyAgendaModal';
import { QuickScaleModal } from '../components/QuickScaleModal';
import { SwapRequestModal } from '../components/SwapRequestModal';
import { CancelVisitModal } from '../components/CancelVisitModal';
import { FinishVisitModal } from '../components/FinishVisitModal';
import { PatientDetailModal } from '../components/PatientDetailModal';
import { Button } from '../components/Button';
import { downloadIcsFile } from '../services/calendarService';

interface DashboardProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  isPrivacyMode: boolean;
  isHospitalMode: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onUpdateState, isPrivacyMode, isHospitalMode }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isDailyAgendaOpen, setIsDailyAgendaOpen] = useState(false);
  const [isQuickScaleOpen, setIsQuickScaleOpen] = useState(false);
  const [reportSlot, setReportSlot] = useState<VisitSlot | null>(null);
  const [selectionModalData, setSelectionModalData] = useState<{route: VisitRoute, slot: VisitSlot | undefined} | null>(null);
  const [swapVisitSlot, setSwapVisitSlot] = useState<VisitSlot | null>(null);
  const [cancelVisitSlot, setCancelVisitSlot] = useState<VisitSlot | null>(null);
  const [finishVisitSlot, setFinishVisitSlot] = useState<VisitSlot | null>(null);
  const [detailPatient, setDetailPatient] = useState<Patient | null>(null);
  const [myVisitDetails, setMyVisitDetails] = useState<{ visit: VisitSlot, route: VisitRoute, partner: Member | null, hospitals: Hospital[] } | null>(null);

  const getMemberName = (id: string) => state.members.find(m => m.id === id)?.name || 'Desconhecido';
  const getSlotMemberNames = (slot: VisitSlot | null): string => slot?.memberIds.map(id => getMemberName(id)).join(', ') || '';

  const getRouteHistory = (routeId: string): HistoryItem[] => {
      return state.visits
        .filter(v => v.routeId === routeId && v.report && v.date < selectedDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map(v => ({ date: v.date, notes: v.report!.notes, visitorNames: v.memberIds.map(id => getMemberName(id)).join(', ') }));
  };

  const getPatientLastVisit = (patient: Patient): VisitSlot | null => {
      // Acha a rota que contém o hospital do paciente
      const route = state.routes.find(r => r.hospitals.includes(patient.hospitalName));
      if (!route) return null;

      // Retorna a visita mais recente desta rota que possui um relato
      const pastVisitsWithReports = state.visits
        .filter(v => v.routeId === route.id && v.report)
        .sort((a,b) => b.date.localeCompare(a.date));
      
      return pastVisitsWithReports.length > 0 ? pastVisitsWithReports[0] : null;
  };

  const handleSaveSlotMembers = (newMemberIds: string[], targetDate: string, route: VisitRoute, slot?: VisitSlot) => {
    if (!state.currentUser) return;
    let newVisits = [...state.visits];
    if (slot) {
        if (newMemberIds.length === 0) newVisits = newVisits.filter(v => v.id !== slot.id);
        else newVisits = newVisits.map(v => v.id === slot.id ? { ...v, memberIds: newMemberIds } : v);
    } else if (newMemberIds.length > 0) {
        newVisits.push({ id: crypto.randomUUID(), routeId: route.id, date: targetDate, memberIds: newMemberIds });
    }
    onUpdateState({ ...state, visits: newVisits });
    setSelectionModalData(null);
    setIsQuickScaleOpen(false);
  };

  const handleFinishVisit = (generalNote: string, patientUpdates: Record<string, any>) => {
      if (!finishVisitSlot || !state.currentUser) return;

      // Append patient-specific info to the general note for the visit record
      let compiledNote = generalNote;
      let newPatients = [...state.patients];

      Object.entries(patientUpdates).forEach(([patientId, update]) => {
          const patient = newPatients.find(p => p.id === patientId);
          if (patient) {
              const patientIdx = newPatients.findIndex(p => p.id === patientId);
              
              if (update.performed) {
                  compiledNote += `\n- Visita Realizada em ${patient.name}: ${update.notes || 'Sem detalhes específicos.'}`;
                  // Update patient flags
                  newPatients[patientIdx] = {
                      ...patient,
                      hasDirectivesCard: update.hasDirectivesCard,
                      hasS55: update.hasS55,
                      formsConsidered: update.formsConsidered,
                      agentsNotified: update.agentsNotified
                  };
              } else {
                  const reasonLabel = {
                    indisposto: 'Indisposto',
                    alta: 'Teve Alta',
                    impedimento: 'Impedimento do Hospital',
                    outro: 'Outro motivo'
                  }[update.notPerformedReason as string] || 'Não especificado';
                  
                  compiledNote += `\n- Visita NÃO Realizada em ${patient.name}. Motivo: ${reasonLabel}`;
                  
                  if (update.notPerformedReason === 'alta') {
                      newPatients[patientIdx] = { ...patient, active: false };
                  }
              }
          }
      });

      const updatedVisits = state.visits.map(v => {
          if (v.id === finishVisitSlot.id) {
              return { 
                  ...v, 
                  report: { 
                      doctorName: state.currentUser!.name, 
                      notes: compiledNote, 
                      followUpNeeded: false, 
                      createdAt: new Date().toISOString() 
                  } 
              };
          }
          return v;
      });

      onUpdateState({ ...state, visits: updatedVisits, patients: newPatients });
      setFinishVisitSlot(null);
      alert("Visita finalizada e dados atualizados!");
  };

  const handleSwapRequest = (newDate: string, note: string) => {
      if (!swapVisitSlot || !state.currentUser) return;
      const routeName = state.routes.find(r => r.id === swapVisitSlot.routeId)?.name || 'Rota';
      const newLog = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          action: 'Troca Solicitada',
          details: `Solicitou troca da visita de ${swapVisitSlot.date} (${routeName}) para ${newDate || 'Indefinida'}. Obs: ${note}`
      };
      onUpdateState({ ...state, logs: [newLog, ...state.logs] });
      setSwapVisitSlot(null);
      alert("Sua solicitação de troca foi registrada.");
  };

  const handleCancelVisit = (justification: string) => {
      if (!cancelVisitSlot || !state.currentUser) return;
      const updatedVisits = state.visits.map(v => {
          if (v.id === cancelVisitSlot.id) {
              return { ...v, memberIds: v.memberIds.filter(id => id !== state.currentUser?.id) };
          }
          return v;
      }).filter(v => v.memberIds.length > 0);

      const routeName = state.routes.find(r => r.id === cancelVisitSlot.routeId)?.name || 'Rota';
      const newLog = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          action: 'Cancelamento',
          details: `Cancelou sua participação na visita de ${cancelVisitSlot.date} (${routeName}). Motivo: ${justification}`
      };

      onUpdateState({ ...state, visits: updatedVisits, logs: [newLog, ...state.logs] });
      setCancelVisitSlot(null);
  };

  const handleOnTheWay = () => {
      if (!myVisitDetails || !state.currentUser || !myVisitDetails.partner) return;
      const partner = myVisitDetails.partner;
      const newNotification: Notification = {
          id: crypto.randomUUID(),
          userId: partner.id,
          message: `${state.currentUser.name} está a caminho da visita hoje!`,
          type: 'info',
          read: false,
          timestamp: new Date().toISOString()
      };
      onUpdateState({ ...state, notifications: [newNotification, ...state.notifications] });
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const myUpcomingVisits = state.visits
    .filter(v => v.memberIds.includes(state.currentUser?.id || ''))
    .filter(v => v.date >= todayStr && !v.report)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getPatientsForVisit = (visit: VisitSlot | null) => {
    if (!visit) return [];
    const route = state.routes.find(r => r.id === visit.routeId);
    if (!route) return [];
    return state.patients.filter(p => p.active && route.hospitals.includes(p.hospitalName));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Escala de Visitas</h1>
            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Gerencie sua escala e acompanhe os pacientes.</p>
          </div>
          <Button onClick={() => setIsQuickScaleOpen(true)} variant="primary" size="sm">Agendar</Button>
      </div>

      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800 shadow-black' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-xl border`}>
         <h2 className={`text-base font-bold mb-4 flex items-center gap-2 ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Minhas Visitas</h2>
         {myUpcomingVisits.length === 0 ? (
             <div className={`text-center py-6 border-2 border-dashed rounded-lg ${isHospitalMode ? 'border-gray-800 text-gray-600' : 'border-gray-100 text-gray-400'}`}>Nenhum agendamento ativo.</div>
         ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {myUpcomingVisits.map(visit => {
                     const route = state.routes.find(r => r.id === visit.routeId);
                     const partnerId = visit.memberIds.find(id => id !== state.currentUser?.id);
                     const partner = partnerId ? state.members.find(m => m.id === partnerId) : null;
                     return (
                         <div key={visit.id} className={`${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 hover:border-blue-900' : 'bg-white border-gray-100 hover:border-blue-300'} border rounded-xl p-4 cursor-pointer transition-all hover:shadow-xl group`}>
                             <div onClick={() => setMyVisitDetails({ visit, route: route!, partner: partner!, hospitals: state.hospitals.filter(h => route?.hospitals.includes(h.name)) })}>
                               <div className="flex justify-between items-start mb-2">
                                  <p className={`text-sm font-bold ${isHospitalMode ? 'text-blue-400' : 'text-blue-700'}`}>{new Date(visit.date + 'T12:00:00').toLocaleDateString()}</p>
                                  <p className="text-[10px] text-gray-500 uppercase font-bold">{route?.name}</p>
                               </div>
                               <div className={`flex items-center gap-2 mt-3 p-2 rounded-lg ${isHospitalMode ? 'bg-[#212327]' : 'bg-gray-50'}`}>
                                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">{partner ? partner.name.substring(0,2).toUpperCase() : '?'}</div>
                                  <p className={`text-xs font-medium truncate ${isPrivacyMode ? 'blur-sm' : ''} ${isHospitalMode ? 'text-gray-300' : 'text-gray-800'}`}>{partner ? partner.name : 'Aguardando dupla'}</p>
                               </div>
                             </div>
                             <div className="mt-3 pt-3 border-t border-gray-800/20 flex justify-between items-center">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setFinishVisitSlot(visit); }}
                                  className={`p-2 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${isHospitalMode ? 'text-green-500 hover:text-green-400' : 'text-green-600 hover:text-green-700'}`}
                                >
                                  Finalizar
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); downloadIcsFile(visit.date, route!); }}
                                  className={`p-2 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${isHospitalMode ? 'text-gray-500 hover:text-blue-400' : 'text-gray-400 hover:text-blue-600'}`}
                                >
                                  Agenda
                                </button>
                             </div>
                         </div>
                     );
                 })}
             </div>
         )}
      </div>

      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800 shadow-black' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-xl border`}>
          <FullCalendar selectedDate={selectedDate} onChange={(date) => { setSelectedDate(date); setIsDailyAgendaOpen(true); }} visits={state.visits} routes={state.routes} isHospitalMode={isHospitalMode} />
      </div>

      {isDailyAgendaOpen && (
          <DailyAgendaModal 
            isOpen={isDailyAgendaOpen} onClose={() => setIsDailyAgendaOpen(false)} 
            date={selectedDate} routes={state.routes} visits={state.visits} 
            members={state.members} patients={state.patients} currentUser={state.currentUser} 
            isPrivacyMode={isPrivacyMode} isHospitalMode={isHospitalMode} 
            onRouteClick={(route, slot) => { setIsDailyAgendaOpen(false); setSelectionModalData({ route, slot }); }} 
            onReportClick={(slot) => { setIsDailyAgendaOpen(false); setReportSlot(slot); }} 
            onPatientClick={(p) => setDetailPatient(p)}
          />
      )}

      {isQuickScaleOpen && <QuickScaleModal isOpen={isQuickScaleOpen} onClose={() => setIsQuickScaleOpen(false)} state={state} onSave={handleSaveSlotMembers} isHospitalMode={isHospitalMode} />}
      {selectionModalData && <SlotModal isOpen={true} onClose={() => setSelectionModalData(null)} route={selectionModalData.route} currentMemberIds={selectionModalData.slot?.memberIds || []} allMembers={state.members} currentUser={state.currentUser} onSave={(ids) => handleSaveSlotMembers(ids, selectedDate, selectionModalData.route, selectionModalData.slot)} isHospitalMode={isHospitalMode} />}
      
      {myVisitDetails && (
          <MyVisitModal 
            isOpen={true} onClose={() => setMyVisitDetails(null)} 
            date={myVisitDetails.visit.date} route={myVisitDetails.route} 
            partner={myVisitDetails.partner} hospitalDetails={myVisitDetails.hospitals} 
            patients={state.patients}
            recentHistory={getRouteHistory(myVisitDetails.visit.routeId)} 
            isHospitalMode={isHospitalMode} isPrivacyMode={isPrivacyMode}
            onSwapRequest={() => { setSwapVisitSlot(myVisitDetails.visit); setMyVisitDetails(null); }}
            onCancelVisit={() => { setCancelVisitSlot(myVisitDetails.visit); setMyVisitDetails(null); }}
            onOnTheWay={handleOnTheWay}
            onFinishVisit={() => { setFinishVisitSlot(myVisitDetails.visit); setMyVisitDetails(null); }}
            onPatientClick={(p) => setDetailPatient(p)}
          />
      )}
      
      {swapVisitSlot && <SwapRequestModal isOpen={true} onClose={() => setSwapVisitSlot(null)} currentDate={swapVisitSlot.date} onConfirm={handleSwapRequest} isHospitalMode={isHospitalMode} />}
      {cancelVisitSlot && <CancelVisitModal isOpen={true} onClose={() => setCancelVisitSlot(null)} onConfirm={handleCancelVisit} isHospitalMode={isHospitalMode} />}
      
      {finishVisitSlot && (
          <FinishVisitModal 
            isOpen={true} 
            onClose={() => setFinishVisitSlot(null)} 
            onConfirm={handleFinishVisit} 
            patients={getPatientsForVisit(finishVisitSlot)}
            isHospitalMode={isHospitalMode}
          />
      )}
      
      {detailPatient && (
        <PatientDetailModal 
          isOpen={true} 
          onClose={() => setDetailPatient(null)} 
          patient={detailPatient} 
          lastVisit={getPatientLastVisit(detailPatient)} 
          members={state.members}
          isHospitalMode={isHospitalMode}
        />
      )}

      {reportSlot && <ReportModal isOpen={true} hospitalName={state.routes.find(r => r.id === reportSlot.routeId)?.name || ''} visitParticipants={getSlotMemberNames(reportSlot)} recentHistory={getRouteHistory(reportSlot.routeId)} initialReport={reportSlot.report} onClose={() => setReportSlot(null)} onSave={(report) => onUpdateState({ ...state, visits: state.visits.map(v => v.id === reportSlot.id ? { ...v, report } : v) })} isHospitalMode={isHospitalMode} />}
    </div>
  );
};
