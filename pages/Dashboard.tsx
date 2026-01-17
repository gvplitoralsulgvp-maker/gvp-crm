
import React, { useState, useMemo } from 'react';
import { AppState, VisitRoute, VisitSlot, VisitStatus, VisitReport, Patient, Notification, UserRole } from '../types';
import { FullCalendar } from '../components/FullCalendar';
import { DailyAgendaModal } from '../components/DailyAgendaModal';
import { FinishVisitModal } from '../components/FinishVisitModal';
import { SlotModal } from '../components/SlotModal';
import { MyVisitModal } from '../components/MyVisitModal';
import { SwapRequestModal } from '../components/SwapRequestModal';
import { CancelVisitModal } from '../components/CancelVisitModal';
import { ViewReportModal } from '../components/ViewReportModal';
import { atomicUpdate } from '../services/storageService';

interface DashboardProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  isPrivacyMode: boolean;
  isHospitalMode: boolean;
}

interface SelectionData {
  route: VisitRoute;
  slot: VisitSlot | undefined;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onUpdateState, isPrivacyMode, isHospitalMode }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isDailyAgendaOpen, setIsDailyAgendaOpen] = useState(false);
  const [finishVisitSlot, setFinishVisitSlot] = useState<VisitSlot | null>(null);
  const [selectionModalData, setSelectionModalData] = useState<SelectionData | null>(null);
  const [viewReportData, setViewReportData] = useState<{ slot: VisitSlot, route: VisitRoute } | null>(null);
  
  // Novos estados para gestão de visita do próprio usuário
  const [myVisitModalData, setMyVisitModalData] = useState<VisitSlot | null>(null);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const pendingReports = useMemo(() => {
    if (!state.currentUser) return [];
    const userId = state.currentUser.id;
    return state.visits.filter(v => 
      v.date < todayStr && 
      v.memberIds.includes(userId) && 
      !v.report && 
      v.status !== 'FINISHED'
    );
  }, [state.visits, state.currentUser, todayStr]);

  const myUpcomingVisits = useMemo(() => {
    if (!state.currentUser) return [];
    return state.visits
      .filter(v => v.memberIds.includes(state.currentUser!.id) && v.date >= todayStr && v.status !== 'FINISHED')
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [state.visits, state.currentUser, todayStr]);

  const handleFinishVisit = async (generalNote: string, patientOutcomes: Record<string, any>) => {
    if (!finishVisitSlot || !state.currentUser) return;

    let consolidatedNotes = generalNote;
    const patientsToUpdate: Patient[] = [];

    Object.entries(patientOutcomes).forEach(([patientId, outcome]: [string, any]) => {
        const patient = state.patients.find(p => p.id === patientId);
        if (!patient) return;

        if (outcome.notes && outcome.notes.trim()) {
            consolidatedNotes += `\n\n[${patient.name}]: ${outcome.notes}`;
        }
        
        if (!outcome.performed && outcome.notPerformedReason) {
             consolidatedNotes += `\n\n[${patient.name}]: Visita não realizada (${outcome.notPerformedReason})`;
        }

        patientsToUpdate.push({
            ...patient,
            hasDirectivesCard: outcome.hasDirectivesCard,
            hasS55: outcome.hasS55,
            agentsNotified: outcome.agentsNotified,
            formsConsidered: outcome.formsConsidered
        });
    });

    const report: VisitReport = {
      doctorName: state.currentUser.name,
      notes: consolidatedNotes,
      followUpNeeded: false,
      createdAt: new Date().toISOString()
    };

    const updatedVisit: VisitSlot = { 
      ...finishVisitSlot, 
      status: 'FINISHED' as VisitStatus, 
      report 
    };
    
    try {
      await atomicUpdate('visits', updatedVisit);
      await Promise.all(patientsToUpdate.map(p => atomicUpdate('patients', p)));

      const updatedVisits = state.visits.map(v => v.id === updatedVisit.id ? updatedVisit : v);
      const updatedPatients = state.patients.map(p => {
          const found = patientsToUpdate.find(u => u.id === p.id);
          return found || p; 
      });

      onUpdateState({ 
          ...state, 
          visits: updatedVisits,
          patients: updatedPatients 
      });
      
      setFinishVisitSlot(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar relatório. Verifique sua conexão.");
    }
  };

  const handleSlotSave = async (newMemberIds: string[]) => {
    if (!selectionModalData) return;
    const { route, slot } = selectionModalData;

    try {
        const visitData: VisitSlot = slot ? { ...slot, memberIds: newMemberIds } : {
            id: crypto.randomUUID(),
            routeId: route.id,
            date: selectedDate,
            memberIds: newMemberIds,
            status: 'PENDING'
        };

        await atomicUpdate('visits', visitData);
        
        const otherVisits = state.visits.filter(v => v.id !== visitData.id);
        onUpdateState({ ...state, visits: [...otherVisits, visitData] });
        
        setSelectionModalData(null);
    } catch (error) {
        alert("Erro ao salvar a escala. Tente novamente.");
    }
  };

  const handleRouteAction = async (route: VisitRoute, slot: VisitSlot | undefined) => {
    if (!state.currentUser) return;

    const isAdmin = state.currentUser.role === UserRole.ADMIN;
    const currentMemberIds = slot?.memberIds || [];
    const isAlreadyIn = currentMemberIds.includes(state.currentUser.id);

    // Se for Admin OU se o usuário já estiver na rota (para permitir sair), abre o modal de gestão
    if (isAdmin || isAlreadyIn) {
        setSelectionModalData({ route, slot });
        return;
    }

    // Se for Membro, não estiver na rota e houver vaga -> Entra Automaticamente
    if (currentMemberIds.length < 2) {
        try {
            const newMemberIds = [...currentMemberIds, state.currentUser.id];
            
            const visitData: VisitSlot = slot ? { ...slot, memberIds: newMemberIds } : {
                id: crypto.randomUUID(),
                routeId: route.id,
                date: selectedDate,
                memberIds: newMemberIds,
                status: 'PENDING'
            };

            await atomicUpdate('visits', visitData);
            
            const otherVisits = state.visits.filter(v => v.id !== visitData.id);
            onUpdateState({ ...state, visits: [...otherVisits, visitData] });
            
            // Feedback visual sutil pode ser adicionado aqui se necessário, mas a UI já atualiza
        } catch (error) {
            alert("Erro ao entrar na rota. Tente novamente.");
        }
    } else {
        alert("Esta rota já está cheia.");
    }
  };

  const handleSwapRequest = async (newDate: string, note: string) => {
    if (!state.currentUser || !myVisitModalData) return;
    
    const route = state.routes.find(r => r.id === myVisitModalData.routeId);
    const admins = state.members.filter(m => m.role === UserRole.ADMIN);
    
    const notifications: Notification[] = admins.map(admin => ({
        id: crypto.randomUUID(),
        userId: admin.id,
        message: `🔄 Solicitação de Troca: ${state.currentUser!.name} pede para trocar a visita do dia ${new Date(myVisitModalData.date + 'T12:00:00').toLocaleDateString()} (${route?.name}). Motivo: ${note}. Sugere: ${newDate ? new Date(newDate + 'T12:00:00').toLocaleDateString() : 'Sem data'}.`,
        type: 'warning',
        read: false,
        timestamp: new Date().toISOString()
    }));

    await Promise.all(notifications.map(n => atomicUpdate('notifications', n)));
    onUpdateState({ ...state, notifications: [...notifications, ...state.notifications] });
    
    alert("Solicitação enviada aos administradores.");
    setIsSwapModalOpen(false);
  };

  const handleCancelVisit = async (justification: string) => {
    if (!state.currentUser || !myVisitModalData) return;

    const route = state.routes.find(r => r.id === myVisitModalData.routeId);
    const updatedMemberIds = myVisitModalData.memberIds.filter(id => id !== state.currentUser!.id);
    const updatedVisit = { ...myVisitModalData, memberIds: updatedMemberIds };

    try {
        await atomicUpdate('visits', updatedVisit);

        const admins = state.members.filter(m => m.role === UserRole.ADMIN);
        const notifications: Notification[] = admins.map(admin => ({
            id: crypto.randomUUID(),
            userId: admin.id,
            message: `❌ Cancelamento: ${state.currentUser!.name} saiu da visita do dia ${new Date(myVisitModalData.date + 'T12:00:00').toLocaleDateString()} (${route?.name}). Motivo: ${justification}`,
            type: 'warning',
            read: false,
            timestamp: new Date().toISOString()
        }));

        await Promise.all(notifications.map(n => atomicUpdate('notifications', n)));

        const updatedVisits = state.visits.map(v => v.id === updatedVisit.id ? updatedVisit : v);
        onUpdateState({ 
            ...state, 
            visits: updatedVisits,
            notifications: [...notifications, ...state.notifications]
        });

        setIsCancelModalOpen(false);
        setMyVisitModalData(null);
    } catch (error) {
        alert("Erro ao cancelar visita.");
    }
  };

  const handleOnTheWay = async () => {
      // Opcional: Atualizar status para 'ON_THE_WAY' se desejar
      alert("Boa visita! Dirija com cuidado.");
  };

  // Dados computados para o modal MyVisitModal
  const myVisitRoute = myVisitModalData ? state.routes.find(r => r.id === myVisitModalData.routeId) : null;
  const myVisitPartner = myVisitModalData && state.currentUser 
      ? state.members.find(m => myVisitModalData.memberIds.includes(m.id) && m.id !== state.currentUser!.id) || null
      : null;
  
  const myVisitHospitals = useMemo(() => {
      if (!myVisitRoute) return [];
      const names = myVisitRoute.hospitals || [];
      return state.hospitals.filter(h => names.includes(h.name));
  }, [myVisitRoute, state.hospitals]);

  const myVisitHistory = useMemo(() => {
      if (!myVisitRoute) return [];
      // Pega as últimas 5 visitas FINALIZADAS desta rota
      return state.visits
          .filter(v => v.routeId === myVisitRoute.id && v.status === 'FINISHED' && v.report)
          .sort((a,b) => b.date.localeCompare(a.date))
          .slice(0, 5)
          .map(v => ({
              date: v.date,
              notes: v.report!.notes,
              visitorNames: v.report!.doctorName
          }));
  }, [myVisitRoute, state.visits]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Minha Agenda</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-500">Grupo de Visita a Pacientes</p>
        </div>
      </div>

      {/* Seção Minhas Próximas Visitas */}
      {myUpcomingVisits.length > 0 && (
        <div className="space-y-3">
            <h3 className={`text-xs font-black uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Minhas Designações</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myUpcomingVisits.map(visit => {
                    const route = state.routes.find(r => r.id === visit.routeId);
                    const partnerId = visit.memberIds.find(id => id !== state.currentUser?.id);
                    const partner = state.members.find(m => m.id === partnerId);
                    const isToday = visit.date === todayStr;

                    return (
                        <div 
                            key={visit.id} 
                            onClick={() => setMyVisitModalData(visit)}
                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-sm ${
                                isToday 
                                ? (isHospitalMode ? 'bg-blue-900/20 border-blue-500/50' : 'bg-blue-50 border-blue-200') 
                                : (isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100')
                            }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className={`font-black text-lg ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{route?.name}</p>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-blue-500' : 'text-gray-400'}`}>
                                        {isToday ? 'HOJE' : new Date(visit.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </p>
                                </div>
                                <div className={`p-2 rounded-full ${isToday ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm">
                                        {state.currentUser?.name.substring(0,2).toUpperCase()}
                                    </div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm ${partner ? 'bg-indigo-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
                                        {partner ? partner.name.substring(0,2).toUpperCase() : '?'}
                                    </div>
                                </div>
                                <span className={`text-xs font-medium ${isHospitalMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    com {partner ? partner.name.split(' ')[0] : 'Parceiro pendente'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {pendingReports.length > 0 && (
        <div className="bg-red-500/10 border-2 border-red-500/20 p-4 rounded-2xl animate-pulse">
          <p className="text-sm font-black text-red-600 uppercase flex items-center gap-2">
            ⚠️ Você tem {pendingReports.length} relatórios pendentes!
          </p>
          <div className="mt-2 space-y-2">
            {pendingReports.map(v => (
              <div key={v.id} className="flex justify-between items-center bg-white/50 p-2 rounded-xl">
                <span className="text-xs font-bold">{new Date(v.date + 'T12:00:00').toLocaleDateString()}</span>
                <button onClick={() => setFinishVisitSlot(v)} className="text-[10px] font-black text-red-600 underline">RELATAR AGORA</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} p-6 rounded-3xl border shadow-sm`}>
        <FullCalendar 
          selectedDate={selectedDate} 
          onChange={(date) => { setSelectedDate(date); setIsDailyAgendaOpen(true); }} 
          visits={state.visits} 
          routes={state.routes} 
          members={state.members}
          currentUser={state.currentUser}
          isHospitalMode={isHospitalMode} 
        />
      </div>

      {/* Modal Principal de Agenda do Dia */}
      <DailyAgendaModal 
        isOpen={isDailyAgendaOpen} 
        onClose={() => setIsDailyAgendaOpen(false)} 
        date={selectedDate} 
        routes={state.routes} 
        visits={state.visits} 
        members={state.members} 
        patients={state.patients} 
        currentUser={state.currentUser} 
        isPrivacyMode={isPrivacyMode} 
        isHospitalMode={isHospitalMode} 
        onRouteClick={handleRouteAction}
        onReportClick={(slot) => {
            const route = state.routes.find(r => r.id === slot.routeId);
            if (route) setViewReportData({ slot, route });
        }}
        onPatientClick={() => {}} 
      />

      {/* Modal de Seleção de Dupla */}
      {selectionModalData && (
        <SlotModal
            isOpen={true}
            onClose={() => setSelectionModalData(null)}
            route={selectionModalData.route}
            currentMemberIds={selectionModalData.slot?.memberIds || []}
            allMembers={state.members}
            onSave={handleSlotSave}
            currentUser={state.currentUser}
            isHospitalMode={isHospitalMode}
        />
      )}

      {/* Modal de Detalhes da Minha Visita */}
      {myVisitModalData && myVisitRoute && (
          <MyVisitModal 
              isOpen={true}
              onClose={() => setMyVisitModalData(null)}
              date={myVisitModalData.date}
              route={myVisitRoute}
              partner={myVisitPartner}
              hospitalDetails={myVisitHospitals}
              patients={state.patients}
              recentHistory={myVisitHistory}
              isHospitalMode={isHospitalMode}
              isPrivacyMode={isPrivacyMode}
              onFinishVisit={() => {
                  setFinishVisitSlot(myVisitModalData);
                  setMyVisitModalData(null);
              }}
              onSwapRequest={() => setIsSwapModalOpen(true)}
              onCancelVisit={() => setIsCancelModalOpen(true)}
              onOnTheWay={handleOnTheWay}
              onPatientClick={(p) => {}} // Pode abrir o prontuário se necessário
          />
      )}

      {/* Modais de Ação (Troca/Cancelamento) */}
      <SwapRequestModal 
          isOpen={isSwapModalOpen}
          onClose={() => setIsSwapModalOpen(false)}
          currentDate={myVisitModalData?.date || ''}
          onConfirm={handleSwapRequest}
          isHospitalMode={isHospitalMode}
      />

      <CancelVisitModal 
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          onConfirm={handleCancelVisit}
          isHospitalMode={isHospitalMode}
      />

      {/* Modal de Visualização de Relatório */}
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

      {/* Modal de Finalização de Visita */}
      {finishVisitSlot && (
        <FinishVisitModal 
          isOpen={true} 
          onClose={() => setFinishVisitSlot(null)} 
          onConfirm={handleFinishVisit} 
          patients={state.patients.filter(p => {
              if (!finishVisitSlot) return false;
              const route = state.routes.find(r => r.id === finishVisitSlot.routeId);
              const hospitalIds = route?.hospitalIds || [];
              
              return p.active && (
                  (p.hospitalId && hospitalIds.includes(p.hospitalId)) || 
                  (p.hospitalName && route?.hospitals?.includes(p.hospitalName))
              );
          })}
          isHospitalMode={isHospitalMode} 
        />
      )}
    </div>
  );
};
