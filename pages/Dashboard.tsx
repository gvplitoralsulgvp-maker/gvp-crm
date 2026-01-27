
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, VisitRoute, VisitSlot, Patient, Member, AppNotification, UserRole, AppEvent, SocialWorkerVisit, Hospital } from '../types';
import { FullCalendar } from '../components/FullCalendar';
import { DailyAgendaModal } from '../components/DailyAgendaModal';
import { MyVisitModal } from '../components/MyVisitModal';
import { PatientDetailModal } from '../components/PatientDetailModal';
import { SlotModal } from '../components/SlotModal';
import { ViewReportModal } from '../components/ViewReportModal';
import { FinishVisitModal } from '../components/FinishVisitModal';
import { FinishSocialVisitModal } from '../components/FinishSocialVisitModal';
import { CancelVisitModal } from '../components/CancelVisitModal';
import { SwapRequestModal } from '../components/SwapRequestModal';
import { atomicUpdate } from '../services/storageService';

const KpiCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; colorBg: string; colorText: string; isHospitalMode?: boolean }> = ({ title, value, icon, colorBg, colorText, isHospitalMode }) => (
  <div className={`p-4 rounded-2xl border shadow-sm flex items-center gap-4 transition-all hover:shadow-md ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
    <div className={`p-3 rounded-xl ${colorBg} ${colorText}`}>
      {icon}
    </div>
    <div>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
      <p className={`text-2xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{value}</p>
    </div>
  </div>
);

const ActivityChart: React.FC<{ data: number[]; isHospitalMode?: boolean }> = ({ data, isHospitalMode }) => {
  const max = Math.max(...data, 1);
  return (
    <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-end h-40 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
      <div className="flex justify-between items-end h-24 gap-1">
        {data.map((val, idx) => (
          <div key={idx} className="flex-1 flex flex-col justify-end items-center gap-1 group">
             <div 
                className={`w-full rounded-t-sm transition-all relative ${val > 0 ? (isHospitalMode ? 'bg-blue-600' : 'bg-blue-500') : (isHospitalMode ? 'bg-gray-800' : 'bg-gray-100')}`}
                style={{ height: `${(val / max) * 100}%`, minHeight: val > 0 ? '4px' : '2px' }}
             >
                {/* Tooltip simples */}
                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-10">
                    {val} visitas
                </div>
             </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 pt-2 border-t border-gray-800/10">
         <span className="text-[9px] font-bold text-gray-400">Dia 1</span>
         <span className="text-[9px] font-bold text-gray-400">Atividade do Mês Atual</span>
         <span className="text-[9px] font-bold text-gray-400">Dia {data.length}</span>
      </div>
    </div>
  );
};

interface DashboardProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  isPrivacyMode: boolean;
  isHospitalMode?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onUpdateState, isPrivacyMode, isHospitalMode }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDailyOpen, setIsDailyOpen] = useState(false);
  
  // Modals State
  const [viewingPatientId, setViewingPatientId] = useState<string | null>(null);
  const [slotModalData, setSlotModalData] = useState<{ route: VisitRoute; slot?: VisitSlot } | null>(null);
  const [reportModalSlot, setReportModalSlot] = useState<{ slot: VisitSlot, route: VisitRoute } | null>(null);
  const [myVisitModalData, setMyVisitModalData] = useState<{ slot: VisitSlot, route: VisitRoute } | null>(null);
  const [finishSocialVisit, setFinishSocialVisit] = useState<SocialWorkerVisit | null>(null);
  
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

  // Optimistic tracking
  const [optimisticArchived, setOptimisticArchived] = useState<Set<string>>(new Set());

  // Derived data
  const activePatients = state.patients.filter((p: Patient) => p.active && !optimisticArchived.has(p.id));

  // --- CÁLCULO DE KPIS (useMemo) ...
  const { kpis, chartData } = useMemo(() => {
      const now = new Date();
      const currentMonthStr = now.toISOString().slice(0, 7); // YYYY-MM
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      
      const monthVisits = state.visits.filter((v: VisitSlot) => v.date.startsWith(currentMonthStr));
      const finishedCount = monthVisits.filter((v: VisitSlot) => v.status === 'FINISHED').length;
      const scheduledCount = monthVisits.filter((v: VisitSlot) => v.status !== 'FINISHED' && v.memberIds.length > 0).length;
      
      const activeP = state.patients.filter((p: Patient) => p.active && !p.isMedicalDischarge).length;
      
      const visitedHospitalIds = new Set();
      monthVisits.filter((v: VisitSlot) => v.status === 'FINISHED').forEach((v: VisitSlot) => {
          const route = state.routes.find((r: VisitRoute) => r.id === v.routeId);
          route?.hospitals?.forEach((h: string) => visitedHospitalIds.add(h));
      });

      const data = new Array(daysInMonth).fill(0);
      monthVisits.filter((v: VisitSlot) => v.status === 'FINISHED').forEach((v: VisitSlot) => {
          const day = parseInt(v.date.split('-')[2]);
          if(day >= 1 && day <= daysInMonth) data[day-1]++;
      });
      
      return { kpis: { finished: finishedCount, scheduled: scheduledCount, activePatients: activeP, hospitalsVisited: visitedHospitalIds.size }, chartData: data };
  }, [state.visits, state.patients, state.routes]);

  // --- MEUS AGENDAMENTOS (Visitas Regulares) ---
  const myUpcomingVisits = useMemo(() => {
      if (!state.currentUser) return [];
      const today = new Date().toISOString().split('T')[0];
      return state.visits.filter((v: VisitSlot) => v.memberIds.includes(state.currentUser!.id) && v.status !== 'FINISHED' && v.date >= today).sort((a: VisitSlot, b: VisitSlot) => a.date.localeCompare(b.date));
  }, [state.visits, state.currentUser]);

  // --- MINHAS VISITAS SOCIAIS PENDENTES ---
  const mySocialVisits = useMemo(() => {
      if (!state.currentUser) return [];
      return state.socialWorkerVisits.filter((v: SocialWorkerVisit) => v.memberIds.includes(state.currentUser!.id) && v.status !== 'FINISHED').sort((a: SocialWorkerVisit, b: SocialWorkerVisit) => a.date.localeCompare(b.date));
  }, [state.socialWorkerVisits, state.currentUser]);

  // --- FILTRO DE EVENTOS ---
  const myEvents = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      const isColih = state.currentUser?.isColih;
      const isAdmin = state.currentUser?.role === UserRole.ADMIN;
      const isCoordinator = state.currentUser?.role === UserRole.COORDINATOR;
      return state.events.filter((e: AppEvent) => e.date >= today).filter((e: AppEvent) => {
          if (isAdmin || isCoordinator) return true;
          if (e.targetGroup === 'ALL') return true;
          if (isColih && e.targetGroup === 'COLIH') return true;
          if (!isColih && e.targetGroup === 'GVP') return true;
          return false;
      }).sort((a: AppEvent, b: AppEvent) => a.date.localeCompare(b.date)).slice(0, 3);
  }, [state.events, state.currentUser]);

  // Lógica refatorada: Separação Alta Médica vs Arquivamento HLC-7
  const handleDischarge = async (id: string, name: string) => { 
      const patient = state.patients.find((p: Patient) => p.id === id);
      if (!patient) return;
      const isColihUser = state.currentUser?.isColih || state.currentUser?.role === UserRole.ADMIN;
      try {
          if (patient.isMedicalDischarge) {
              if (!isColihUser) { alert("Apenas membros da COLIH podem realizar o arquivamento definitivo (HLC-7)."); return; }
              if (window.confirm(`[PROTOCOLO COLIH]\n\nConfirma o envio do formulário HLC-7 para o caso de ${name}?\n\nIsso arquivará o paciente definitivamente.`)) {
                  setOptimisticArchived(prev => new Set(prev).add(id));
                  const archivedPatient = { ...patient, active: false, gvpRequestPending: false, isMedicalDischarge: true };
                  const updatedPatients = state.patients.map((p: Patient) => p.id === id ? archivedPatient : p);
                  onUpdateState({ ...state, patients: updatedPatients });
                  setViewingPatientId(null);
                  await atomicUpdate('patients', archivedPatient);
              }
              return;
          }
          if (window.confirm(`Confirmar que ${name} teve ALTA MÉDICA do hospital?\n\nIsso removerá a solicitação de visita GVP, mas manterá o caso aberto para a COLIH (HLC-7).`)) {
              const dischargedPatient = { ...patient, isMedicalDischarge: true, gvpRequestPending: false, active: true, estimatedDischargeDate: new Date().toISOString() };
              const updatedPatients = state.patients.map((p: Patient) => p.id === id ? dischargedPatient : p); 
              onUpdateState({ ...state, patients: updatedPatients });
              setViewingPatientId(null);
              await atomicUpdate('patients', dischargedPatient);
          }
      } catch (err: any) { console.error(err); alert(`Erro ao processar alta: ${err.message}`); }
  };

  const handleToggleGvp = async (patient: Patient) => {
      const willEnable = !patient.gvpRequestPending;
      if (!window.confirm(willEnable ? "Marcar solicitação?" : "Remover solicitação?")) return;
      const updated = { ...patient, gvpRequestPending: willEnable };
      await atomicUpdate('patients', updated);
      onUpdateState({ ...state, patients: state.patients.map((p: Patient) => p.id === patient.id ? updated : p) });
  };

  const handleRouteClick = (route: VisitRoute, slot: VisitSlot | undefined) => {
      const isMeInSlot = slot?.memberIds.includes(state.currentUser?.id || '');
      if (isMeInSlot && slot) { setMyVisitModalData({ slot, route }); } else { setSlotModalData({ route, slot }); }
  };

  const handleOpenMyVisit = (visit: VisitSlot) => {
      const route = state.routes.find((r: VisitRoute) => r.id === visit.routeId);
      if (route) { setMyVisitModalData({ slot: visit, route }); }
  };

  const handleSlotSave = async (newMemberIds: string[]) => {
      if (!slotModalData) return;
      const { route, slot } = slotModalData;
      const newSlot: VisitSlot = slot ? { ...slot, memberIds: newMemberIds } : { id: crypto.randomUUID(), routeId: route.id, date: selectedDate, memberIds: newMemberIds, status: 'PENDING' };
      try {
          await atomicUpdate('visits', newSlot);
          const updatedVisits = slot ? state.visits.map((v: VisitSlot) => v.id === slot.id ? newSlot : v) : [...state.visits, newSlot];
          onUpdateState({ ...state, visits: updatedVisits });
          setSlotModalData(null);
      } catch (e) { alert("Erro ao salvar escala."); }
  };

  const handleCancelVisit = async (justification: string) => {
      if (!myVisitModalData || !state.currentUser) return;
      const { slot } = myVisitModalData;
      const newMemberIds = slot.memberIds.filter(id => id !== state.currentUser?.id);
      const updatedSlot = { ...slot, memberIds: newMemberIds };
      const logEntry = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), userId: state.currentUser.id, userName: state.currentUser.name, action: 'Cancelamento', details: `Cancelou visita dia ${slot.date}. Motivo: ${justification}` };
      try {
          await atomicUpdate('visits', updatedSlot);
          await atomicUpdate('logs', logEntry);
          const updatedVisits = state.visits.map((v: VisitSlot) => v.id === slot.id ? updatedSlot : v);
          onUpdateState({ ...state, visits: updatedVisits, logs: [...state.logs, logEntry] });
          setIsCancelModalOpen(false);
          setMyVisitModalData(null);
      } catch (e) { alert("Erro ao cancelar."); }
  };

  const handleFinishVisit = async (generalNote: string, patientUpdates: any) => {
      if (!myVisitModalData || !state.currentUser) return;
      const { slot } = myVisitModalData;
      const report = { doctorName: state.currentUser.name, notes: generalNote, followUpNeeded: false, createdAt: new Date().toISOString() };
      const updatedSlot: VisitSlot = { ...slot, status: 'FINISHED', report };
      const updatedPatients = [...state.patients];
      for (const [pid, data] of Object.entries(patientUpdates)) {
          const idx = updatedPatients.findIndex(p => p.id === pid);
          if (idx !== -1) {
              updatedPatients[idx] = { ...updatedPatients[idx], hasDirectivesCard: (data as any).hasDirectivesCard, agentsNotified: (data as any).agentsNotified, hasS55: (data as any).hasS55, formsConsidered: (data as any).formsConsidered };
              await atomicUpdate('patients', updatedPatients[idx]);
          }
      }
      try {
          await atomicUpdate('visits', updatedSlot);
          const updatedVisits = state.visits.map((v: VisitSlot) => v.id === slot.id ? updatedSlot : v);
          onUpdateState({ ...state, visits: updatedVisits, patients: updatedPatients });
          setIsFinishModalOpen(false);
          setMyVisitModalData(null);
      } catch (e) { alert("Erro ao finalizar visita."); }
  };

  const handleFinishSocialVisit = async (notes: string) => {
      if (!finishSocialVisit || !state.currentUser) return;
      const updatedVisit: SocialWorkerVisit = { ...finishSocialVisit, status: 'FINISHED', report: { doctorName: state.currentUser.name, notes: notes, followUpNeeded: false, createdAt: new Date().toISOString() } };
      try {
          await atomicUpdate('social_worker_visits', updatedVisit);
          const updatedList = state.socialWorkerVisits.map((v: SocialWorkerVisit) => v.id === updatedVisit.id ? updatedVisit : v);
          onUpdateState({ ...state, socialWorkerVisits: updatedList });
          setFinishSocialVisit(null);
      } catch (e) { alert("Erro ao finalizar visita social."); }
  };

  const viewingPatient = viewingPatientId ? activePatients.find((p: Patient) => p.id === viewingPatientId) : null;
  const myVisitSlot = myVisitModalData?.slot;
  const myVisitRoute = myVisitModalData?.route;
  const myVisitPatients = myVisitRoute && myVisitRoute.hospitals ? activePatients.filter((p: Patient) => myVisitRoute.hospitals?.includes(p.hospitalName || '')) : [];
  const partnerId = myVisitSlot?.memberIds.find(id => id !== state.currentUser?.id);
  const partner = partnerId ? state.members.find(m => m.id === partnerId) : null;
  const hospitalDetails = myVisitRoute?.hospitals ? state.hospitals.filter((h: Hospital) => myVisitRoute.hospitals?.includes(h.name)) : [];

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
        {/* KPI DASHBOARD SECTION */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Visitas (Mês)" value={kpis.finished} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} colorBg={isHospitalMode ? 'bg-green-900/30' : 'bg-green-100'} colorText={isHospitalMode ? 'text-green-400' : 'text-green-600'} isHospitalMode={isHospitalMode} />
            <KpiCard title="Pacientes Ativos" value={kpis.activePatients} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} colorBg={isHospitalMode ? 'bg-blue-900/30' : 'bg-blue-100'} colorText={isHospitalMode ? 'text-blue-400' : 'text-blue-600'} isHospitalMode={isHospitalMode} />
            <KpiCard title="Hospitais (Mês)" value={kpis.hospitalsVisited} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} colorBg={isHospitalMode ? 'bg-purple-900/30' : 'bg-purple-100'} colorText={isHospitalMode ? 'text-purple-400' : 'text-purple-600'} isHospitalMode={isHospitalMode} />
            <KpiCard title="Agendamentos" value={kpis.scheduled} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} colorBg={isHospitalMode ? 'bg-orange-900/30' : 'bg-orange-100'} colorText={isHospitalMode ? 'text-orange-400' : 'text-orange-600'} isHospitalMode={isHospitalMode} />
        </div>

        <ActivityChart data={chartData} isHospitalMode={isHospitalMode} />

        {myUpcomingVisits.length > 0 && (
            <div className={`p-6 rounded-2xl shadow-lg relative overflow-hidden ${isHospitalMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'}`}>
                <div className={`absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full blur-3xl opacity-20 ${isHospitalMode ? 'bg-blue-500' : 'bg-white'}`}></div>
                <h3 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isHospitalMode ? 'text-blue-300' : 'text-blue-100'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Meus Agendamentos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
                    {myUpcomingVisits.map((visit: VisitSlot) => {
                        const route = state.routes.find((r: VisitRoute) => r.id === visit.routeId);
                        const partnerId = visit.memberIds.find(id => id !== state.currentUser?.id);
                        const partner = state.members.find(m => m.id === partnerId);
                        const isToday = visit.date === new Date().toISOString().split('T')[0];
                        return (
                            <button key={visit.id} onClick={() => handleOpenMyVisit(visit)} className={`text-left p-4 rounded-xl backdrop-blur-md border transition-all active:scale-95 group ${isHospitalMode ? 'bg-black/30 border-white/10 hover:bg-black/50' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}>
                                <div className="flex justify-between items-start">
                                    <div><p className={`font-bold text-lg ${isHospitalMode ? 'text-white' : 'text-white'}`}>{route?.name}</p><p className={`text-xs mt-1 ${isHospitalMode ? 'text-gray-300' : 'text-blue-100'}`}>{route?.hospitals?.join(', ')}</p></div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${isToday ? 'bg-white text-blue-700 shadow-sm' : (isHospitalMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-800/50 text-blue-100')}`}>{new Date(visit.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-xs font-medium opacity-80 group-hover:opacity-100 transition-opacity"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" /></svg> Dupla: {partner ? partner.name : 'Aguardando parceiro'}</div>
                            </button>
                        );
                    })}
                </div>
            </div>
        )}

        {mySocialVisits.length > 0 && (
            <div className={`p-4 rounded-2xl border-2 border-indigo-500/30 ${isHospitalMode ? 'bg-indigo-900/10' : 'bg-indigo-50'}`}>
                <h3 className="text-xs font-black uppercase text-indigo-600 tracking-widest mb-3">Designações de Assistência Social</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {mySocialVisits.map((v: SocialWorkerVisit) => {
                        const hospital = state.hospitals.find((h: Hospital) => h.id === v.hospitalId);
                        const partnerId = v.memberIds.find(id => id !== state.currentUser?.id);
                        const partner = state.members.find(m => m.id === partnerId);
                        return (
                            <div key={v.id} className={`p-4 rounded-xl shadow-sm flex flex-col justify-between ${isHospitalMode ? 'bg-[#212327] border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                <div className="mb-3">
                                    <div className="flex justify-between items-start">
                                        <h4 className={`font-bold ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{hospital?.name}</h4>
                                        <span className="text-xs font-black text-indigo-500">{new Date(v.date + 'T12:00:00').toLocaleDateString()}</span>
                                    </div>
                                    <p className={`text-xs mt-1 ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Dupla: {partner ? partner.name : 'Você'}</p>
                                </div>
                                <button onClick={() => setFinishSocialVisit(v)} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-indigo-700 transition-colors shadow-md">Relatar & Finalizar</button>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {myEvents.length > 0 && (
            <div className={`p-4 rounded-2xl border shadow-sm ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'}`}>
                <h3 className={`text-xs font-black uppercase tracking-widest mb-3 ${isHospitalMode ? 'text-gray-400' : 'text-blue-600'}`}>Próximos Eventos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myEvents.map((event: AppEvent) => (
                        <div key={event.id} className={`p-3 rounded-xl border flex flex-col justify-between ${isHospitalMode ? 'bg-black/20 border-gray-700' : 'bg-white border-blue-100 shadow-sm'}`}>
                            <div>
                                <div className="flex justify-between items-start">
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${event.targetGroup === 'GVP' ? 'bg-blue-100 text-blue-700' : event.targetGroup === 'COLIH' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-700'}`}>{event.targetGroup === 'ALL' ? 'Geral' : event.targetGroup}</span>
                                    <span className={`text-xs font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{new Date(event.date + 'T12:00:00').toLocaleDateString()}</span>
                                </div>
                                <h4 className={`font-bold mt-1 ${isHospitalMode ? 'text-gray-200' : 'text-gray-900'}`}>{event.title}</h4>
                                <p className={`text-xs mt-1 truncate ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>{event.location} {event.time ? `• ${event.time}` : ''}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <FullCalendar 
            selectedDate={selectedDate}
            onChange={(d) => { setSelectedDate(d); setIsDailyOpen(true); }}
            visits={state.visits}
            routes={state.routes}
            members={state.members}
            currentUser={state.currentUser}
            events={state.events}
            isHospitalMode={isHospitalMode}
        />

        <DailyAgendaModal 
            isOpen={isDailyOpen}
            onClose={() => setIsDailyOpen(false)}
            date={selectedDate}
            routes={state.routes}
            visits={state.visits}
            members={state.members}
            patients={activePatients}
            currentUser={state.currentUser}
            isPrivacyMode={isPrivacyMode}
            isHospitalMode={isHospitalMode}
            onRouteClick={handleRouteClick}
            onReportClick={(slot) => { const route = state.routes.find((r: VisitRoute) => r.id === slot.routeId); if (route) setReportModalSlot({ slot, route }); }}
            onPatientClick={(p) => setViewingPatientId(p.id)}
            hospitals={state.hospitals}
        />

        {slotModalData && (
            <SlotModal 
                isOpen={true}
                onClose={() => setSlotModalData(null)}
                route={slotModalData.route}
                currentMemberIds={slotModalData.slot?.memberIds || []}
                allMembers={state.members}
                currentUser={state.currentUser}
                onSave={handleSlotSave}
                isHospitalMode={isHospitalMode}
                hospitals={state.hospitals}
            />
        )}

        {reportModalSlot && (
            <ViewReportModal 
                isOpen={true}
                onClose={() => setReportModalSlot(null)}
                slot={reportModalSlot.slot}
                route={reportModalSlot.route}
                members={state.members}
                isHospitalMode={isHospitalMode}
            />
        )}

        {myVisitModalData && myVisitRoute && (
            <MyVisitModal 
                isOpen={true}
                onClose={() => setMyVisitModalData(null)}
                date={myVisitModalData.slot.date}
                route={myVisitRoute}
                partner={partner || null}
                hospitalDetails={hospitalDetails}
                patients={activePatients}
                recentHistory={[]} 
                isHospitalMode={isHospitalMode}
                isPrivacyMode={isPrivacyMode}
                onSwapRequest={() => setIsSwapModalOpen(true)}
                onCancelVisit={() => setIsCancelModalOpen(true)}
                onFinishVisit={() => setIsFinishModalOpen(true)}
                onPatientClick={(p) => setViewingPatientId(p.id)}
            />
        )}

        {viewingPatient && (
            <PatientDetailModal 
                isOpen={true}
                onClose={() => setViewingPatientId(null)}
                patient={viewingPatient}
                lastVisit={null} 
                members={state.members}
                logs={state.logs} // PASSED LOGS HERE
                isHospitalMode={isHospitalMode}
                onDischarge={handleDischarge}
                onToggleGvp={handleToggleGvp}
                canEdit={state.currentUser?.role === 'ADMIN' || state.currentUser?.isColih}
                canDischarge={true}
                isColihUser={state.currentUser?.isColih}
            />
        )}

        <FinishVisitModal 
            isOpen={isFinishModalOpen}
            onClose={() => setIsFinishModalOpen(false)}
            onConfirm={handleFinishVisit}
            patients={myVisitPatients}
            isHospitalMode={isHospitalMode}
        />

        {finishSocialVisit && (
            <FinishSocialVisitModal 
                isOpen={true}
                onClose={() => setFinishSocialVisit(null)}
                onConfirm={handleFinishSocialVisit}
                hospitalName={state.hospitals.find((h: Hospital) => h.id === finishSocialVisit.hospitalId)?.name || ''}
                isHospitalMode={isHospitalMode}
            />
        )}

        <CancelVisitModal 
            isOpen={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            onConfirm={handleCancelVisit}
            isHospitalMode={isHospitalMode}
        />

        <SwapRequestModal 
            isOpen={isSwapModalOpen}
            onClose={() => setIsSwapModalOpen(false)}
            currentDate={selectedDate}
            onConfirm={(newDate, note) => { alert("Solicitação enviada ao coordenador."); setIsSwapModalOpen(false); }}
            isHospitalMode={isHospitalMode}
        />
    </div>
  );
};
