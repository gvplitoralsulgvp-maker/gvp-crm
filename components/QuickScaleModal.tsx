
import React, { useState, useEffect } from 'react';
// Fix: Changed AppState to GvpState to match the exported interface in types.ts
import { GvpState, VisitRoute, VisitSlot, Member, UserRole } from '../types';
import { Button } from './Button';
import { downloadIcsFile, getGoogleCalendarUrl } from '../services/calendarService';

interface QuickScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Fix: Changed AppState to GvpState
  state: GvpState;
  onSave: (newMemberIds: string[], date: string, route: VisitRoute, slot?: VisitSlot) => void;
  isHospitalMode?: boolean;
}

export const QuickScaleModal: React.FC<QuickScaleModalProps> = ({ isOpen, onClose, state, onSave, isHospitalMode }) => {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [tempMemberIds, setTempMemberIds] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const activeRoutes = state.routes.filter(r => r.active);
  const selectedRoute = activeRoutes.find(r => r.id === selectedRouteId);
  
  const existingSlot = selectedRouteId 
    ? state.visits.find(v => v.date === selectedDate && v.routeId === selectedRouteId)
    : undefined;

  useEffect(() => {
    if (existingSlot) {
        setTempMemberIds(existingSlot.memberIds);
    } else {
        if (state.currentUser && state.currentUser.role !== UserRole.ADMIN) {
            setTempMemberIds([state.currentUser.id]);
        } else {
            setTempMemberIds([]);
        }
    }
  }, [existingSlot, selectedRouteId, selectedDate, state.currentUser]);

  const toggleMember = (id: string) => {
    const isAdmin = state.currentUser?.role === UserRole.ADMIN;
    const isMe = id === state.currentUser?.id;

    if (!isAdmin && !isMe) {
        alert("Você só pode gerenciar seu próprio nome na escala.");
        return;
    }

    if (tempMemberIds.includes(id)) {
        setTempMemberIds(tempMemberIds.filter(mid => mid !== id));
    } else {
        if (tempMemberIds.length < 2) {
            setTempMemberIds([...tempMemberIds, id]);
        } else {
            alert("Esta dupla já está completa.");
        }
    }
  };

  const handleConfirm = () => {
    if (!selectedRoute) return;
    onSave(tempMemberIds, selectedDate, selectedRoute, existingSlot);
    setIsSuccess(true);
  };

  const handleAddToGoogle = () => {
    if (selectedRoute) {
      const url = getGoogleCalendarUrl(selectedDate, selectedRoute);
      window.open(url, '_blank');
    }
  };

  const handleDownloadIcs = () => {
    if (selectedRoute) {
      downloadIcsFile(selectedDate, selectedRoute);
    }
  };

  if (isSuccess && selectedRoute) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
        <div className={`rounded-3xl shadow-2xl w-full max-sm overflow-hidden animate-fade-in flex flex-col ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
           <div className="p-8 text-center space-y-4">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-xl shadow-green-500/20 ring-8 ring-green-500/10">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className={`text-2xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>Tudo Pronto!</h3>
              <p className={`text-sm leading-relaxed ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Sua escala para <strong>{new Date(selectedDate + 'T12:00:00').toLocaleDateString()}</strong> foi confirmada. Gostaria de salvar o lembrete?</p>
              
              <div className="pt-6 space-y-3">
                <button 
                  onClick={handleAddToGoogle}
                  className="w-full bg-[#4285F4] hover:bg-[#357ae8] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/></svg>
                  Salvar no Google Agenda
                </button>
                
                <button 
                  onClick={handleDownloadIcs}
                  className={`w-full py-3 rounded-2xl border-2 font-bold text-xs uppercase tracking-widest transition-all active:scale-95 ${
                    isHospitalMode ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Baixar arquivo .ics
                </button>

                <button onClick={onClose} className={`w-full py-2 font-bold text-[10px] uppercase tracking-[0.2em] ${isHospitalMode ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}>Concluído</button>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327]' : 'bg-white'}`}>
        
        {/* Header */}
        <div className="bg-blue-600 px-6 py-5 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-white font-bold text-lg">Agendar Visita</h3>
            <p className="text-blue-100 text-xs">Passo {step} de 2</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-500 p-2 rounded-lg transition-colors">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Steps */}
        <div className="p-6 flex-grow overflow-y-auto custom-scrollbar">
          {step === 1 && (
             <div className="space-y-6 animate-fade-in">
                <div>
                   <label className={`block text-xs font-bold uppercase mb-2 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>1. Escolha a Data</label>
                   <input 
                     type="date" 
                     className={`w-full border-2 rounded-xl p-3 text-sm focus:border-blue-500 focus:ring-0 transition-all font-medium ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'border-gray-100 bg-white'}`}
                     value={selectedDate}
                     min={new Date().toISOString().split('T')[0]}
                     onChange={(e) => setSelectedDate(e.target.value)}
                   />
                </div>

                <div>
                   <label className={`block text-xs font-bold uppercase mb-3 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>2. Selecione a Rota</label>
                   <div className="grid grid-cols-1 gap-2">
                      {activeRoutes.map(route => {
                          const slot = state.visits.find(v => v.date === selectedDate && v.routeId === route.id);
                          const count = slot ? slot.memberIds.length : 0;
                          const isFull = count >= 2;
                          const isSelected = selectedRouteId === route.id;

                          return (
                              <button
                                key={route.id}
                                disabled={isFull && !slot?.memberIds.includes(state.currentUser?.id || '')}
                                onClick={() => setSelectedRouteId(route.id)}
                                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                                    isSelected 
                                    ? 'border-blue-600 bg-blue-500/10' 
                                    : isFull ? 'bg-gray-800/20 border-gray-800/40 opacity-50' : isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 hover:border-blue-900' : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                                }`}
                              >
                                 <div>
                                    <p className={`font-bold text-sm ${isSelected ? 'text-blue-500' : isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{route.name}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">{route.hospitals.join(' • ')}</p>
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                                         count === 2 ? 'bg-red-100 text-red-600' : 
                                         count === 1 ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                                     }`}>
                                         {count}/2
                                     </span>
                                 </div>
                              </button>
                          );
                      })}
                   </div>
                </div>
             </div>
          )}

          {step === 2 && selectedRoute && (
              <div className="space-y-6 animate-fade-in">
                  <div className={`p-4 rounded-xl border ${isHospitalMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
                      <p className={`text-xs font-bold uppercase mb-1 ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}>Rota Selecionada</p>
                      <p className={`font-bold ${isHospitalMode ? 'text-gray-100' : 'text-gray-800'}`}>{selectedRoute.name}</p>
                      <p className="text-xs text-gray-500">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>

                  <div>
                     <label className={`block text-xs font-bold uppercase mb-3 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Gerenciar Dupla ({tempMemberIds.length}/2)</label>
                     <div className="space-y-2">
                        {state.members.filter(m => m.active).sort((a,b) => {
                            if (a.id === state.currentUser?.id) return -1;
                            const aSel = tempMemberIds.includes(a.id);
                            const bSel = tempMemberIds.includes(b.id);
                            if (aSel && !bSel) return -1;
                            if (!aSel && bSel) return 1;
                            return a.name.localeCompare(b.name);
                        }).map(member => {
                            const isMe = member.id === state.currentUser?.id;
                            const isSelected = tempMemberIds.includes(member.id);
                            const canToggle = state.currentUser?.role === UserRole.ADMIN || isMe;

                            return (
                                <div 
                                  key={member.id}
                                  onClick={() => canToggle && toggleMember(member.id)}
                                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                      isSelected ? 'border-blue-500 bg-blue-500/10' : isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'border-gray-100 hover:bg-gray-50'
                                  } ${!canToggle ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                   <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                                          {member.name.substring(0, 2).toUpperCase()}
                                      </div>
                                      <div>
                                          <p className={`text-sm font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{member.name} {isMe && '(Você)'}</p>
                                          {!canToggle && <p className="text-[10px] text-red-500">Apenas Admins gerenciam outros</p>}
                                      </div>
                                   </div>
                                   {isSelected && <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>}
                                </div>
                            );
                        })}
                     </div>
                  </div>
              </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-6 border-t flex justify-between gap-3 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-white border-gray-100'}`}>
          {step === 1 ? (
              <>
                <Button variant="secondary" className="w-full" onClick={onClose}>Cancelar</Button>
                <Button className="w-full" disabled={!selectedRouteId} onClick={() => setStep(2)}>Próximo</Button>
              </>
          ) : (
              <>
                <Button variant="secondary" className="w-full" onClick={() => setStep(1)}>Voltar</Button>
                <Button className="w-full" onClick={handleConfirm}>Confirmar Escala</Button>
              </>
          )}
        </div>
      </div>
    </div>
  );
};
