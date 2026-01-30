
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AppState, UserRole, Hospital, SocialWorkerVisit, AppNotification, LogEntry } from '../types';
import { Button } from '../components/Button';
import { SocialHistoryModal } from '../components/SocialHistoryModal';

export const SocialVisitsPage: React.FC<{ state: AppState, onUpdateState: (newState: AppState) => void, isHospitalMode?: boolean }> = ({ state, onUpdateState, isHospitalMode }) => {
  const [designatingSocial, setDesignatingSocial] = useState<string | null>(null); // hospitalId
  const [designationData, setDesignationData] = useState({ date: new Date().toISOString().split('T')[0], memberIds: [] as string[] });
  
  // Histórico
  const [viewHistoryHospitalId, setViewHistoryHospitalId] = useState<string | null>(null);

  const isAdmin = state.currentUser?.role === UserRole.ADMIN;
  const isCoordinator = state.currentUser?.role === UserRole.COORDINATOR;
  const userRegional = state.currentUser?.regional;

  // --- FILTERING ---
  const visibleHospitals = useMemo(() => {
      if (isCoordinator && userRegional) {
          return state.hospitals.filter(h => !h.regional || h.regional === userRegional);
      }
      return state.hospitals;
  }, [state.hospitals, isCoordinator, userRegional]);

  const visibleVisits = useMemo(() => {
      if (isCoordinator && userRegional) {
          // Filter visits that belong to visible hospitals
          const visibleHospitalIds = visibleHospitals.map(h => h.id);
          return state.socialWorkerVisits.filter(v => visibleHospitalIds.includes(v.hospitalId));
      }
      return state.socialWorkerVisits;
  }, [state.socialWorkerVisits, visibleHospitals, isCoordinator, userRegional]);

  const handleDesignateSocial = () => {
    if (!designatingSocial || designationData.memberIds.length === 0) return;

    const newVisit: SocialWorkerVisit = {
      id: crypto.randomUUID(),
      hospitalId: designatingSocial,
      date: designationData.date,
      memberIds: designationData.memberIds,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    const newNotifications: AppNotification[] = designationData.memberIds.map(mid => ({
      id: crypto.randomUUID(),
      userId: mid,
      message: `Designação: Assistência Social no ${state.hospitals.find(h => h.id === designatingSocial)?.name} dia ${new Date(designationData.date + 'T12:00:00').toLocaleDateString()}.`,
      type: 'warning',
      read: false,
      timestamp: new Date().toISOString()
    }));

    onUpdateState({
      ...state,
      socialWorkerVisits: [...state.socialWorkerVisits, newVisit],
      notifications: [...newNotifications, ...state.notifications]
    });

    setDesignatingSocial(null);
    setDesignationData({ date: new Date().toISOString().split('T')[0], memberIds: [] });
  };

  const getLastSocialVisit = (hospitalId: string) => {
    // Use visibleVisits for consistency
    const finished = visibleVisits.filter(v => v.hospitalId === hospitalId && v.status === 'FINISHED');
    return finished.sort((a,b) => b.date.localeCompare(a.date))[0];
  };

  const getDaysSinceLastSocial = (hospitalId: string) => {
    const last = getLastSocialVisit(hospitalId);
    if (!last) return 999;
    const diff = new Date().getTime() - new Date(last.date + 'T12:00:00').getTime();
    return Math.floor(diff / (1000 * 3600 * 24));
  };

  const myDesignations = state.socialWorkerVisits.filter(v => 
    v.memberIds.includes(state.currentUser?.id || '') && v.status !== 'FINISHED'
  );

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
         <div>
            <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Assistência Social</h2>
            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Relacionamento institucional e parcerias hospitalares.
                {isCoordinator && userRegional && <span className="ml-2 bg-indigo-100 text-indigo-700 px-2 rounded font-bold text-xs uppercase">{userRegional}</span>}
            </p>
         </div>
         <div className="flex gap-2 p-1 bg-indigo-500/10 rounded-xl text-indigo-500 text-[10px] font-bold uppercase tracking-widest items-center px-4 py-2 border border-indigo-500/20">
            Frequência Alvo: 30 Dias
         </div>
      </div>

      {/* Grid Geral de Instituições */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleHospitals.map(h => {
          const days = getDaysSinceLastSocial(h.id);
          const isLate = days > 30;
          const lastVisit = getLastSocialVisit(h.id);
          const hasPending = visibleVisits.some(v => v.hospitalId === h.id && v.status !== 'FINISHED');

          return (
            <div key={h.id} className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} p-5 rounded-2xl border shadow-sm transition-all hover:shadow-lg flex flex-col`}>
                <div className="flex justify-between items-start mb-4">
                   <div className="space-y-1">
                      <p className={`font-bold text-lg leading-tight ${isHospitalMode ? 'text-gray-100' : 'text-gray-800'}`}>{h.name}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest">{h.city}</p>
                   </div>
                   {isLate ? (
                      <div className="bg-red-500/10 text-red-500 p-2 rounded-xl animate-pulse" title="Vencido!">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                   ) : (
                      <div className="bg-green-500/10 text-green-500 p-2 rounded-xl">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                   )}
                </div>

                <div className={`mt-auto p-4 rounded-xl mb-4 ${isHospitalMode ? 'bg-black/20' : 'bg-gray-50'}`}>
                   <p className="text-[9px] text-gray-400 font-bold uppercase mb-2 tracking-widest">Estado da Parceria</p>
                   <div className="flex justify-between items-end">
                      <div>
                        <p className={`text-xs font-bold ${isLate ? 'text-red-500' : 'text-gray-500'}`}>
                          {lastVisit ? `Última: ${new Date(lastVisit.date + 'T12:00:00').toLocaleDateString()}` : 'Nunca visitado'}
                        </p>
                        <p className="text-[10px] opacity-60">
                           {lastVisit ? `${days} dias decorridos` : 'Instituição nova no mapa'}
                        </p>
                      </div>
                      <div className="text-right">
                         <p className={`text-lg font-black ${isLate ? 'text-red-500' : 'text-green-500'}`}>
                            {isLate ? 'URGENTE' : 'EM DIA'}
                         </p>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => setViewHistoryHospitalId(h.id)}
                        className="w-full justify-center rounded-xl text-xs font-bold"
                    >
                        Ver Histórico
                    </Button>
                    {(isAdmin || isCoordinator) && (
                        <Button 
                            size="sm" 
                            variant={hasPending ? 'secondary' : 'primary'}
                            disabled={hasPending}
                            onClick={() => setDesignatingSocial(h.id)}
                            className="w-full justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700"
                        >
                            {hasPending ? 'Designação Ativa' : 'Designar Visita'}
                        </Button>
                    )}
                </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Histórico */}
      {viewHistoryHospitalId && (
          <SocialHistoryModal 
              isOpen={true} 
              onClose={() => setViewHistoryHospitalId(null)} 
              hospital={state.hospitals.find(h => h.id === viewHistoryHospitalId)!}
              visits={visibleVisits.filter(v => v.hospitalId === viewHistoryHospitalId)}
              members={state.members}
              isHospitalMode={isHospitalMode}
          />
      )}

      {/* Modal de Designação Admin (USANDO PORTAL PARA EVITAR BUG DE SCROLL) */}
      {designatingSocial && createPortal(
        <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[85vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
              <div className="bg-indigo-600 p-6 text-white font-bold flex justify-between items-center shrink-0">
                 <span className="text-lg">Designação Assistência Social</span>
                 <button onClick={() => setDesignatingSocial(null)} className="text-3xl leading-none">&times;</button>
              </div>
              <div className="p-8 space-y-6 flex-grow overflow-y-auto custom-scrollbar">
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Instituição Alvo</label>
                    <p className="font-bold text-lg">{state.hospitals.find(h => h.id === designatingSocial)?.name}</p>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Data Sugerida</label>
                    <input type="date" className={`w-full p-3 border-2 rounded-xl focus:border-indigo-500 outline-none transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={designationData.date} onChange={e => setDesignationData({...designationData, date: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Membros Escalados (Dupla)</label>
                    <p className="text-[10px] text-gray-500 mb-2">Selecione membros do GVP ou COLIH.</p>
                    <div className="max-h-56 overflow-y-auto space-y-2 p-3 border-2 rounded-2xl custom-scrollbar border-gray-800/10">
                        {state.members.filter(m => m.active).sort((a,b) => a.name.localeCompare(b.name)).map(m => (
                           <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${designationData.memberIds.includes(m.id) ? 'bg-indigo-500/10' : 'hover:bg-gray-50'}`}>
                              <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded-lg border-2 border-gray-300 text-indigo-600 focus:ring-0"
                                checked={designationData.memberIds.includes(m.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setDesignationData({...designationData, memberIds: [...designationData.memberIds, m.id]});
                                  else setDesignationData({...designationData, memberIds: designationData.memberIds.filter(id => id !== m.id)});
                                }}
                              />
                              <div className="flex-grow">
                                  <span className="text-sm font-bold block">{m.name}</span>
                                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${m.isColih ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                                      {m.isColih ? 'COLIH' : 'GVP'}
                                  </span>
                              </div>
                           </label>
                        ))}
                    </div>
                 </div>
                 <div className="flex gap-3 pt-4">
                    <Button variant="secondary" className="flex-1 rounded-xl" onClick={() => setDesignatingSocial(null)}>Cancelar</Button>
                    <Button className="flex-1 bg-indigo-600 rounded-xl" onClick={handleDesignateSocial} disabled={designationData.memberIds.length === 0}>Confirmar</Button>
                 </div>
              </div>
           </div>
        </div>,
        document.body
      )}
    </div>
  );
};
