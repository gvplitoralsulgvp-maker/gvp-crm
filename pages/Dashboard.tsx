
import React, { useState } from 'react';
import { AppState, VisitRoute, VisitSlot, Patient, Member, AppNotification, UserRole } from '../types';
import { FullCalendar } from '../components/FullCalendar';
import { DailyAgendaModal } from '../components/DailyAgendaModal';
import { MyVisitModal } from '../components/MyVisitModal';
import { PatientDetailModal } from '../components/PatientDetailModal';
import { SlotModal } from '../components/SlotModal';
import { ViewReportModal } from '../components/ViewReportModal';
import { FinishVisitModal } from '../components/FinishVisitModal';
import { CancelVisitModal } from '../components/CancelVisitModal';
import { SwapRequestModal } from '../components/SwapRequestModal';
import { atomicUpdate } from '../services/storageService';

interface DashboardProps {
  state: AppState;
  onUpdateState: (state: AppState) => void;
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
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

  const handleDischarge = async (id: string, name: string) => {
    const isColih = state.currentUser?.isColih || state.currentUser?.role === UserRole.ADMIN;
    
    // Confirmação Básica
    if (!window.confirm(`Confirmar que ${name} teve ALTA MÉDICA?`)) {
      return;
    }

    let shouldArchive = true;

    // Fluxo COLIH: Verificar HLC-7
    if (isColih) {
        if (window.confirm(`[PROTOCOLO COLIH]\n\nO formulário HLC-7 já foi enviado/concluído para o caso de ${name}?`)) {
            // HLC-7 Enviado -> Arquivar
            shouldArchive = true;
        } else {
            // HLC-7 Pendente -> Manter ativo com flag de alta
            shouldArchive = false;
            alert("O paciente permanecerá na lista ativa com status 'Alta Médica' até que o HLC-7 seja enviado.");
        }
    }

    const updatedPatients = state.patients.map(p => 
      p.id === id ? { 
          ...p, 
          active: !shouldArchive, 
          isMedicalDischarge: true, 
          gvpRequestPending: false, 
          estimatedDischargeDate: new Date().toISOString() 
      } : p
    );
    
    const p = updatedPatients.find(p => p.id === id);
    if (p) await atomicUpdate('patients', p);

    onUpdateState({ ...state, patients: updatedPatients });
    setViewingPatientId(null);
  };

  const handleHlc7Archive = async (id: string, name: string) => {
      if (window.confirm(`Confirma o envio do HLC-7 para o caso de ${name}?\n\nIsso irá arquivar o paciente definitivamente no histórico.`)) {
          const updatedPatients = state.patients.map(p => 
              p.id === id ? { ...p, active: false } : p
          );
          const p = updatedPatients.find(p => p.id === id);
          if (p) await atomicUpdate('patients', p);

          onUpdateState({ ...state, patients: updatedPatients });
          setViewingPatientId(null);
      }
  };

  const handleToggleGvp = async (patient: Patient) => {
      const willEnable = !patient.gvpRequestPending;
      if (!window.confirm(willEnable ? "Marcar solicitação?" : "Remover solicitação?")) return;
      const updated = { ...patient, gvpRequestPending: willEnable };
      await atomicUpdate('patients', updated);
      onUpdateState({
          ...state,
          patients: state.patients.map(p => p.id === patient.id ? updated : p)
      });
  };

  const handleRouteClick = (route: VisitRoute, slot: VisitSlot | undefined) => {
      const isMeInSlot = slot?.memberIds.includes(state.currentUser?.id || '');
      
      if (isMeInSlot && slot) {
          setMyVisitModalData({ slot, route });
      } else {
          setSlotModalData({ route, slot });
      }
  };

  const handleSlotSave = async (newMemberIds: string[]) => {
      if (!slotModalData) return;
      const { route, slot } = slotModalData;
      
      const newSlot: VisitSlot = slot ? { ...slot, memberIds: newMemberIds } : {
          id: crypto.randomUUID(),
          routeId: route.id,
          date: selectedDate,
          memberIds: newMemberIds,
          status: 'PENDING'
      };

      try {
          await atomicUpdate('visits', newSlot);
          const updatedVisits = slot 
            ? state.visits.map(v => v.id === slot.id ? newSlot : v)
            : [...state.visits, newSlot];
          
          onUpdateState({ ...state, visits: updatedVisits });
          setSlotModalData(null);
      } catch (e) {
          alert("Erro ao salvar escala.");
      }
  };

  const handleCancelVisit = async (justification: string) => {
      if (!myVisitModalData || !state.currentUser) return;
      const { slot } = myVisitModalData;
      const newMemberIds = slot.memberIds.filter(id => id !== state.currentUser?.id);
      
      const updatedSlot = { ...slot, memberIds: newMemberIds };
      
      // Log cancellation
      const logEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          action: 'Cancelamento',
          details: `Cancelou visita dia ${slot.date}. Motivo: ${justification}`
      };

      try {
          await atomicUpdate('visits', updatedSlot);
          await atomicUpdate('logs', logEntry);
          
          const updatedVisits = state.visits.map(v => v.id === slot.id ? updatedSlot : v);
          onUpdateState({ ...state, visits: updatedVisits, logs: [...state.logs, logEntry] });
          
          setIsCancelModalOpen(false);
          setMyVisitModalData(null);
      } catch (e) {
          alert("Erro ao cancelar.");
      }
  };

  const handleFinishVisit = async (generalNote: string, patientUpdates: any) => {
      if (!myVisitModalData || !state.currentUser) return;
      const { slot } = myVisitModalData;

      const report = {
          doctorName: state.currentUser.name, // Using user name as reporter for simplicity or add logic
          notes: generalNote,
          followUpNeeded: false,
          createdAt: new Date().toISOString()
      };

      const updatedSlot: VisitSlot = {
          ...slot,
          status: 'FINISHED',
          report
      };

      // Process patient updates
      const updatedPatients = [...state.patients];
      for (const [pid, data] of Object.entries(patientUpdates)) {
          const idx = updatedPatients.findIndex(p => p.id === pid);
          if (idx !== -1) {
              updatedPatients[idx] = {
                  ...updatedPatients[idx],
                  hasDirectivesCard: (data as any).hasDirectivesCard,
                  agentsNotified: (data as any).agentsNotified,
                  hasS55: (data as any).hasS55,
                  formsConsidered: (data as any).formsConsidered
              };
              await atomicUpdate('patients', updatedPatients[idx]);
          }
      }

      try {
          await atomicUpdate('visits', updatedSlot);
          const updatedVisits = state.visits.map(v => v.id === slot.id ? updatedSlot : v);
          onUpdateState({ ...state, visits: updatedVisits, patients: updatedPatients });
          setIsFinishModalOpen(false);
          setMyVisitModalData(null);
      } catch (e) {
          alert("Erro ao finalizar visita.");
      }
  };

  // Derived data
  const viewingPatient = viewingPatientId ? state.patients.find(p => p.id === viewingPatientId) : null;
  const myVisitSlot = myVisitModalData?.slot;
  const myVisitRoute = myVisitModalData?.route;
  
  const myVisitPatients = myVisitRoute && myVisitRoute.hospitals 
    ? state.patients.filter(p => p.active && myVisitRoute.hospitals?.includes(p.hospitalName || ''))
    : [];

  const partnerId = myVisitSlot?.memberIds.find(id => id !== state.currentUser?.id);
  const partner = partnerId ? state.members.find(m => m.id === partnerId) : null;
  const hospitalDetails = myVisitRoute?.hospitals 
    ? state.hospitals.filter(h => myVisitRoute.hospitals?.includes(h.name))
    : [];

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
        <FullCalendar 
            selectedDate={selectedDate}
            onChange={(d) => { setSelectedDate(d); setIsDailyOpen(true); }}
            visits={state.visits}
            routes={state.routes}
            members={state.members}
            currentUser={state.currentUser}
            isHospitalMode={isHospitalMode}
        />

        <DailyAgendaModal 
            isOpen={isDailyOpen}
            onClose={() => setIsDailyOpen(false)}
            date={selectedDate}
            routes={state.routes}
            visits={state.visits}
            members={state.members}
            patients={state.patients}
            currentUser={state.currentUser}
            isPrivacyMode={isPrivacyMode}
            isHospitalMode={isHospitalMode}
            onRouteClick={handleRouteClick}
            onReportClick={(slot) => {
                const route = state.routes.find(r => r.id === slot.routeId);
                if (route) setReportModalSlot({ slot, route });
            }}
            onPatientClick={(p) => setViewingPatientId(p.id)}
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
                date={selectedDate}
                route={myVisitRoute}
                partner={partner || null}
                hospitalDetails={hospitalDetails}
                patients={state.patients}
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
                isHospitalMode={isHospitalMode}
                onDischarge={handleDischarge}
                onHlc7Confirm={handleHlc7Archive}
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
            onConfirm={(newDate, note) => {
                alert("Solicitação enviada ao coordenador.");
                setIsSwapModalOpen(false);
            }}
            isHospitalMode={isHospitalMode}
        />
    </div>
  );
};
