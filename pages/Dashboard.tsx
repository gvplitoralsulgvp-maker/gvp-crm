
import React, { useState, useMemo } from 'react';
import { AppState, VisitRoute, VisitSlot, UserRole, Member, Hospital, Notification, Patient, VisitStatus } from '../types';
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

  // Filtro inteligente: Visitas onde o usuário participa, que não foram finalizadas e são de hoje ou futuro
  const myUpcomingVisits = useMemo(() => {
    if (!state.currentUser) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return state.visits
      .filter(v => v.memberIds.includes(state.currentUser!.id))
      .filter(v => {
          const visitDate = new Date(v.date + 'T12:00:00');
          // Mostra se for hoje ou futuro E não tiver relatório concluído
          return visitDate >= today && !v.report;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [state.visits, state.currentUser]);

  const handleSaveSlotMembers = (newMemberIds: string[], targetDate: string, route: VisitRoute, slot?: VisitSlot) => {
    if (!state.currentUser) return;
    let newVisits = [...state.visits];
    
    if (slot) {
        if (newMemberIds.length === 0) {
            newVisits = newVisits.filter(v => v.id !== slot.id);
        } else {
            newVisits = newVisits.map(v => v.id === slot.id ? { ...v, memberIds: [...newMemberIds], routeId: route.id, status: v.status || 'PENDING' } : v);
        }
    } else if (newMemberIds.length > 0) {
        newVisits.push({ 
            id: crypto.randomUUID(), 
            routeId: route.id, 
            date: targetDate, 
            memberIds: [...newMemberIds],
            status: 'PENDING'
        });
    }
    
    onUpdateState({ ...state, visits: newVisits });
    setSelectionModalData(null);
    setIsQuickScaleOpen(false);
  };

  // Fixed status parameter type to VisitStatus to ensure correct inference in state updates
  const handleStatusUpdate = (visitId: string, status: VisitStatus) => {
    const updatedVisits = state.visits.map(v => v.id === visitId ? { ...v, status } : v);
    onUpdateState({ ...state, visits: updatedVisits });
  };

  const handleFinishVisit = (generalNote: string, patientUpdates: Record<string, any>) => {
      if (!finishVisitSlot || !state.currentUser) return;
      let compiledNote = generalNote;
      let newPatients = [...state.patients];
      
      Object.entries(patientUpdates).forEach(([patientId, update]) => {
          const patientIdx = newPatients.findIndex(p => p.id === patientId);
          if (patientIdx >= 0) {
              const patient = newPatients[patientIdx];
              if (update.performed) {
                  compiledNote += `\n- Visita em ${patient.name}: ${update.notes || 'OK'}`;
                  newPatients[patientIdx] = { 
                    ...patient, 
                    hasDirectivesCard: update.hasDirectivesCard, 
                    hasS55: update.hasS55, 
                    formsConsidered: update.formsConsidered, 
                    agentsNotified: update.agentsNotified 
                  };
              } else if (update.notPerformedReason === 'alta') {
                  // LÓGICA DE ALTA NO RELATÓRIO
                  newPatients[patientIdx] = { ...patient, active: false };
                  compiledNote += `\n- ALTA CONFIRMADA: ${patient.name}`;
              } else if (update.notPerformedReason) {
                  compiledNote += `\n- Não visitado (${patient.name}): ${update.notPerformedReason}`;
              }
          }
      });

      // Fixed updatedVisits type inference by explicitly casting 'FINISHED' to VisitStatus and declaring the array type
      const updatedVisits: VisitSlot[] = state.visits.map(v => 
        v.id === finishVisitSlot.id 
          ? { 
              ...v, 
              status: 'FINISHED' as VisitStatus,
              report: { 
                doctorName: state.currentUser!.name, 
                notes: compiledNote, 
                followUpNeeded: false, 
                createdAt: new Date().toISOString() 
              } 
            } 
          : v
      );
      
      onUpdateState({ ...state, visits: updatedVisits, patients: newPatients });
      setFinishVisitSlot(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Minha Agenda</h1>
            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Gerencie seus compromissos e pacientes.</p>
          </div>
          <Button onClick={() => setIsQuickScaleOpen(true)} variant="primary" size="sm" className="rounded-full px-6 shadow-blue-500/20">Agendar Nova Visita</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {myUpcomingVisits.length === 0 ? (
             <div className={`col-span-full text-center py-16 border-2 border-dashed rounded-3xl ${isHospitalMode ? 'border-gray-800 text-gray-600' : 'border-gray-100 text-gray-400'}`}>
                <svg className="w-12 h-12 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="font-medium">Você não tem visitas agendadas.</p>
                <button onClick={() => setIsQuickScaleOpen(true)} className="mt-2 text-blue-600 hover:underline text-sm font-bold">Clique aqui para entrar em uma rota</button>
             </div>
         ) : (
             myUpcomingVisits.map(visit => {
                 const route = state.routes.find(r => r.id === visit.routeId) || state.routes[0];
                 const partnerId = visit.memberIds.find(id => id !== state.currentUser?.id);
                 const partner = partnerId ? state.members.find(m => m.id === partnerId) : null;
                 const visitDateObj = new Date(visit.date + 'T12:00:00');
                 const isToday = new Date().toISOString().split('T')[0] === visit.date;

                 return (
                     <div 
                        key={visit.id} 
                        onClick={() => {
                            if (route) {
                                setMyVisitDetails({ 
                                    visit, route, partner: partner || null, 
                                    hospitals: state.hospitals.filter(h => route.hospitals?.includes(h.name)) 
                                });
                            }
                        }}
                        className={`group relative overflow-hidden rounded-3xl border transition-all cursor-pointer hover:-translate-y-1 hover:shadow-2xl ${
                          isToday 
                            ? (isHospitalMode ? 'bg-blue-900/10 border-blue-500/50' : 'bg-blue-50 border-blue-200 shadow-blue-100') 
                            : (isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100')
                        }`}
                     >
                        <div className="p-6">
                           <div className="flex justify-between items-start mb-6">
                              <div>
                                <p className={`text-2xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{visitDateObj.getDate()}</p>
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                  {visitDateObj.toLocaleDateString('pt-BR', { month: 'short' })}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${isToday ? 'bg-blue-600 text-white animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                                  {isToday ? 'Hoje' : visitDateObj.toLocaleDateString('pt-BR', { weekday: 'short' })}
                                </span>
                                <p className={`text-xs font-bold mt-2 ${isHospitalMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                    {route?.name || 'Rota'}
                                </p>
                              </div>
                           </div>
                           
                           <div className={`flex items-center gap-3 p-3 rounded-2xl ${isHospitalMode ? 'bg-black/20' : 'bg-gray-50'}`}>
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white bg-gradient-to-br from-blue-500 to-blue-700 shadow-inner">
                                 {partner ? partner.name.substring(0,2).toUpperCase() : '?'}
                              </div>
                              <div className="flex-grow min-w-0">
                                <p className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-1">Parceiro</p>
                                <p className={`text-sm font-bold truncate ${isPrivacyMode ? 'blur-sm select-none' : ''} ${isHospitalMode ? 'text-gray-300' : 'text-gray-800'}`}>
                                  {partner ? partner.name : 'Vaga Aberta'}
                                </p>
                              </div>
                           </div>
                        </div>

                        <div className={`flex border-t overflow-hidden ${isHospitalMode ? 'border-gray-800' : 'border-gray-100'}`}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setFinishVisitSlot(visit); }}
                                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-green-600 hover:bg-green-600 hover:text-white transition-all"
                            >
                                Finalizar
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); if(route) downloadIcsFile(visit.date, route); }}
                                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-all"
                            >
                                iCal
                            </button>
                        </div>
                     </div>
                 );
             })
         )}
      </div>

      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800 shadow-black' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-3xl border`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-lg font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Calendário de Cobertura</h2>
            <div className="flex gap-4">
               <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Completa
               </div>
               <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Parcial
               </div>
            </div>
          </div>
          <FullCalendar selectedDate={selectedDate} onChange={(date) => { setSelectedDate(date); setIsDailyAgendaOpen(true); }} visits={state.visits} routes={state.routes} isHospitalMode={isHospitalMode} />
      </div>

      {isDailyAgendaOpen && (
          <DailyAgendaModal isOpen={isDailyAgendaOpen} onClose={() => setIsDailyAgendaOpen(false)} date={selectedDate} routes={state.routes} visits={state.visits} members={state.members} patients={state.patients} currentUser={state.currentUser} isPrivacyMode={isPrivacyMode} isHospitalMode={isHospitalMode} onRouteClick={(route, slot) => { setIsDailyAgendaOpen(false); setSelectionModalData({ route, slot }); }} onReportClick={(slot) => { setIsDailyAgendaOpen(false); setReportSlot(slot); }} onPatientClick={(p) => setDetailPatient(p)} />
      )}
      {isQuickScaleOpen && <QuickScaleModal isOpen={isQuickScaleOpen} onClose={() => setIsQuickScaleOpen(false)} state={state} onSave={handleSaveSlotMembers} isHospitalMode={isHospitalMode} />}
      {selectionModalData && <SlotModal isOpen={true} onClose={() => setSelectionModalData(null)} route={selectionModalData.route} currentMemberIds={selectionModalData.slot?.memberIds || []} allMembers={state.members} currentUser={state.currentUser} onSave={(ids) => handleSaveSlotMembers(ids, selectedDate, selectionModalData.route, selectionModalData.slot)} isHospitalMode={isHospitalMode} />}
      {myVisitDetails && (
          <MyVisitModal 
            isOpen={true} onClose={() => setMyVisitDetails(null)} 
            date={myVisitDetails.visit.date} route={myVisitDetails.route} 
            partner={myVisitDetails.partner} hospitalDetails={myVisitDetails.hospitals} 
            patients={state.patients} recentHistory={[]} 
            isHospitalMode={isHospitalMode} isPrivacyMode={isPrivacyMode} 
            onSwapRequest={() => { setSwapVisitSlot(myVisitDetails.visit); setMyVisitDetails(null); }} 
            onCancelVisit={() => { setCancelVisitSlot(myVisitDetails.visit); setMyVisitDetails(null); }} 
            onOnTheWay={() => handleStatusUpdate(myVisitDetails.visit.id, 'ON_THE_WAY')} 
            onFinishVisit={() => { setFinishVisitSlot(myVisitDetails.visit); setMyVisitDetails(null); }} 
            onPatientClick={(p) => setDetailPatient(p)} 
          />
      )}
      {swapVisitSlot && <SwapRequestModal isOpen={true} onClose={() => setSwapVisitSlot(null)} currentDate={swapVisitSlot.date} onConfirm={() => setSwapVisitSlot(null)} isHospitalMode={isHospitalMode} />}
      {cancelVisitSlot && <CancelVisitModal isOpen={true} onClose={() => setCancelVisitSlot(null)} onConfirm={() => setCancelVisitSlot(null)} isHospitalMode={isHospitalMode} />}
      {finishVisitSlot && <FinishVisitModal isOpen={true} onClose={() => setFinishVisitSlot(null)} onConfirm={handleFinishVisit} patients={state.patients.filter(p => p.active && (state.routes.find(r => r.id === finishVisitSlot.routeId)?.hospitals.includes(p.hospitalName)))} isHospitalMode={isHospitalMode} />}
      {detailPatient && <PatientDetailModal isOpen={true} onClose={() => setDetailPatient(null)} patient={detailPatient} lastVisit={null} members={state.members} isHospitalMode={isHospitalMode} onDischarge={(id) => {
          const updated = state.patients.map(p => p.id === id ? { ...p, active: false } : p);
          onUpdateState({ ...state, patients: updated });
          setDetailPatient(null);
      }} />}
    </div>
  );
};
