
import React, { useState, useMemo } from 'react';
import { AppState, VisitRoute, VisitSlot, VisitStatus, VisitReport, Patient } from '../types';
import { FullCalendar } from '../components/FullCalendar';
import { SlotModal } from '../components/SlotModal';
import { DailyAgendaModal } from '../components/DailyAgendaModal';
import { FinishVisitModal } from '../components/FinishVisitModal';
import { Button } from '../components/Button';
import { atomicUpdate } from '../services/storageService';

interface DashboardProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  isPrivacyMode: boolean;
  isHospitalMode: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onUpdateState, isPrivacyMode, isHospitalMode }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isDailyAgendaOpen, setIsDailyAgendaOpen] = useState(false);
  const [finishVisitSlot, setFinishVisitSlot] = useState<VisitSlot | null>(null);
  const [selectionModalData, setSelectionModalData] = useState<{route: VisitRoute, slot: VisitSlot | undefined} | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Identifica visitas passadas que o usuário participou mas não relatou
  const pendingReports = useMemo(() => {
    if (!state.currentUser) return [];
    return state.visits.filter(v => 
      v.date < todayStr && 
      v.memberIds.includes(state.currentUser!.id) && 
      !v.report && 
      v.status !== 'FINISHED'
    );
  }, [state.visits, state.currentUser, todayStr]);

  const handleFinishVisit = async (notes: string) => {
    if (!finishVisitSlot || !state.currentUser) return;

    const report: VisitReport = {
      doctorName: state.currentUser.name,
      notes,
      followUpNeeded: false,
      createdAt: new Date().toISOString()
    };

    const updatedVisit = { ...finishVisitSlot, status: 'FINISHED' as VisitStatus, report };
    
    try {
      await atomicUpdate('visits', updatedVisit);
      const updatedVisits = state.visits.map(v => v.id === updatedVisit.id ? updatedVisit : v);
      onUpdateState({ ...state, visits: updatedVisits });
      setFinishVisitSlot(null);
    } catch (err) {
      alert("Erro ao salvar relatório. Verifique sua conexão.");
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Minha Agenda</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-500">Grupo de Visita a Pacientes</p>
        </div>
      </div>

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
        onRouteClick={(r, s) => setSelectionModalData({route: r, slot: s})}
        onReportClick={() => {}}
        onPatientClick={() => {}} 
      />

      {finishVisitSlot && (
        <FinishVisitModal 
          isOpen={true} 
          onClose={() => setFinishVisitSlot(null)} 
          onConfirm={handleFinishVisit} 
          patients={state.patients.filter(p => p.active && state.routes.find(r => r.id === finishVisitSlot.routeId)?.hospitalIds.includes(p.hospitalId))}
          isHospitalMode={isHospitalMode} 
        />
      )}
    </div>
  );
};
