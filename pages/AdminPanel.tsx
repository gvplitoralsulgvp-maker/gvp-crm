
import React, { useState, useMemo } from 'react';
// Fix: Changed AppState to GvpState to match the exported interface in types.ts
import { GvpState, Member, VisitRoute, UserRole, Hospital, TrainingMaterial } from '@/types';
import { Button } from '../components/Button';
import { MapPicker } from '../components/MapPicker';

// Fix: Changed AppState to GvpState
export const AdminPanel: React.FC<{ state: GvpState, onUpdateState: (newState: GvpState) => void, isHospitalMode?: boolean }> = ({ state, onUpdateState, isHospitalMode }) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'members' | 'hospitals' | 'routes' | 'training'>('metrics');
  const [editingHospital, setEditingHospital] = useState<Partial<Hospital> | null>(null);
  const [editingRoute, setEditingRoute] = useState<Partial<VisitRoute> | null>(null);
  const [editingTraining, setEditingTraining] = useState<Partial<TrainingMaterial> | null>(null);
  const [metricRange, setMetricRange] = useState<number>(30);

  // --- CÁLCULO DE MÉTRICAS ---
  const stats = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - metricRange);

    const periodVisits = (state.visits || []).filter(v => new Date(v.date) >= cutoff);
    const activeMembers = (state.members || []).filter(m => m.active);
    
    const participatingMemberIds = new Set(periodVisits.flatMap(v => v.memberIds));
    const participationRate = activeMembers.length > 0 ? (participatingMemberIds.size / activeMembers.length) * 100 : 0;

    const hospitalVisitCounts: Record<string, number> = {};
    periodVisits.forEach(v => {
      const route = (state.routes || []).find(r => r.id === v.routeId);
      route?.hospitals.forEach(hName => {
        hospitalVisitCounts[hName] = (hospitalVisitCounts[hName] || 0) + 1;
      });
    });
    const topVisited = Object.entries(hospitalVisitCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const patientCounts: Record<string, number> = {};
    (state.patients || []).filter(p => p.active).forEach(p => {
      patientCounts[p.hospitalName] = (patientCounts[p.hospitalName] || 0) + 1;
    });
    const topPatients = Object.entries(patientCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      participationRate,
      activeCount: participatingMemberIds.size,
      totalCount: activeMembers.length,
      topVisited,
      topPatients,
      maxVisits: topVisited[0]?.count || 1,
      maxPatients: topPatients[0]?.count || 1
    };
  }, [state, metricRange]);

  // --- HANDLERS ---
  const handleSaveRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute?.name) return;
    const newRoutes = editingRoute.id 
      ? state.routes.map(r => r.id === editingRoute.id ? { ...r, ...editingRoute } as VisitRoute : r)
      : [...state.routes, { id: crypto.randomUUID(), active: true, hospitals: editingRoute.hospitals || [], ...editingRoute } as VisitRoute];
    onUpdateState({ ...state, routes: newRoutes });
    setEditingRoute(null);
  };

  const handleSaveTraining = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTraining?.title) return;
    const newTraining = editingTraining.id
      ? state.trainingMaterials.map(t => t.id === editingTraining.id ? { ...t, ...editingTraining } as TrainingMaterial : t)
      : [...state.trainingMaterials, { id: crypto.randomUUID(), ...editingTraining } as TrainingMaterial];
    onUpdateState({ ...state, trainingMaterials: newTraining });
    setEditingTraining(null);
  };

  const handleToggleMember = (id: string) => {
    onUpdateState({ ...state, members: state.members.map(m => m.id === id ? { ...m, active: !m.active } : m) });
  };

  const handleUpdateMemberRole = (id: string, role: UserRole) => {
    onUpdateState({ ...state, members: state.members.map(m => m.id === id ? { ...m, role } : m) });
  };

  const handleDeleteHospital = (id: string) => {
    if (window.confirm("Deseja excluir esta unidade hospitalar permanentemente?")) {
      onUpdateState({ ...state, hospitals: state.hospitals.filter(h => h.id !== id) });
    }
  };

  const handleDeleteRoute = (id: string) => {
    if (window.confirm("Deseja excluir esta rota?")) {
      onUpdateState({ ...state, routes: state.routes.filter(r => r.id !== id) });
    }
  };

  return (
    <div className="space-y-8 pb-24 animate-fade-in">
      {/* HEADER DINÂMICO */}
      <div className={`p-8 rounded-[2.5rem] border shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 ${
        isHospitalMode ? 'bg-[#212327] border-gray-800 shadow-black' : 'bg-white border-gray-100 shadow-blue-900/5'
      }`}>
         <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-600/40">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
            </div>
            <div>
              <h2 className={`text-2xl font-black tracking-tight ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>Gestão GVP</h2>
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isHospitalMode ? 'text-blue-500' : 'text-blue-600'}`}>Administração Central</p>
            </div>
         </div>
         <div className="flex gap-2">
            {activeTab === 'hospitals' && <Button size="sm" onClick={() => setEditingHospital({ lat: -23.9608, lng: -46.3331 })}>+ Unidade</Button>}
            {activeTab === 'routes' && <Button size="sm" onClick={() => setEditingRoute({ hospitals: [] })}>+ Nova Rota</Button>}
            {activeTab === 'training' && <Button size="sm" onClick={() => setEditingTraining({ category: 'Abordagem', type: 'video', isRestricted: false })}>+ Conteúdo</Button>}
         </div>
      </div>

      {/* TABS DE NAVEGAÇÃO */}
      <div className={`flex gap-1.5 p-1.5 rounded-3xl border ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
        {[
          { id: 'metrics', label: 'Dashboard' },
          { id: 'members', label: 'Equipe' },
          { id: 'hospitals', label: 'Unidades' },
          { id: 'routes', label: 'Rotas' },
          { id: 'training', label: 'Capacitação' }
        ].map(tab => (
          <button 
            key={tab.id} 
            className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-xl' 
                : isHospitalMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
            }`} 
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- ABA 1: MÉTRICAS --- */}
      {activeTab === 'metrics' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between px-4">
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Métricas de Impacto</h3>
            <div className="flex bg-gray-500/10 p-1 rounded-xl border border-gray-500/10">
              {[30, 90, 365].map(d => (
                <button key={d} onClick={() => setMetricRange(d)} className={`px-5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${metricRange === d ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-400'}`}>{d === 365 ? 'Anual' : `${d}d`}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* GRÁFICO CIRCULAR SEM QUADROS */}
            <div className={`p-10 rounded-[2.5rem] border shadow-sm flex flex-col items-center justify-center text-center ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
              <div className="relative w-44 h-44">
                <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" fill="none" className={isHospitalMode ? 'text-gray-800' : 'text-gray-100'} />
                  <circle 
                    cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" fill="none" 
                    strokeDasharray="283" 
                    strokeDashoffset={283 - (283 * stats.participationRate) / 100}
                    strokeLinecap="round"
                    className="text-blue-600 transition-all duration-1000 ease-out" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{Math.round(stats.participationRate)}%</span>
                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">Atuação</span>
                </div>
              </div>
              <p className="mt-8 text-[11px] font-black uppercase text-gray-500 tracking-tighter">{stats.activeCount} membros em campo de {stats.totalCount} ativos</p>
            </div>

            {/* RANKING VISITAS */}
            <div className={`p-10 rounded-[2.5rem] border shadow-sm lg:col-span-2 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-8">Fluxo de Visitas por Unidade</h4>
               <div className="space-y-6">
                 {stats.topVisited.map((h, i) => (
                   <div key={i}>
                      <div className="flex justify-between items-end mb-2 px-1">
                        <span className={`text-[11px] font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{h.name}</span>
                        <span className="text-[10px] font-black text-blue-500">{h.count} Visitas</span>
                      </div>
                      <div className={`h-2.5 rounded-full overflow-hidden ${isHospitalMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${(h.count / stats.maxVisits) * 100}%` }} />
                      </div>
                   </div>
                 ))}
                 {stats.topVisited.length === 0 && <p className="text-center py-12 text-gray-500 italic text-sm">Nenhum registro de visita no período.</p>}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ABA 2: EQUIPE --- */}
      {activeTab === 'members' && (
        <div className={`rounded-[2.5rem] border shadow-xl overflow-hidden ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800/10">
              <thead className={isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'}>
                <tr>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Membro Voluntário</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Acesso</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                {state.members.map(m => (
                  <tr key={m.id} className="hover:bg-blue-500/5 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xl shadow-blue-600/20">{m.name.substring(0, 2).toUpperCase()}</div>
                        <div>
                          <p className={`text-sm font-black ${isHospitalMode ? 'text-gray-100' : 'text-gray-900'}`}>{m.name}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase">{m.congregation || 'GVP Litoral'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <select 
                        className={`bg-transparent text-[11px] font-black border-none p-0 focus:ring-0 cursor-pointer ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}
                        value={m.role}
                        onChange={(e) => handleUpdateMemberRole(m.id, e.target.value as UserRole)}
                      >
                        <option value={UserRole.MEMBER}>Membro GVP</option>
                        <option value={UserRole.ADMIN}>Administrador</option>
                      </select>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${m.active ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                        {m.active ? 'Ativo' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-6">
                        <button onClick={() => handleToggleMember(m.id)} className={`text-[10px] font-black uppercase tracking-[0.1em] ${m.active ? 'text-orange-500' : 'text-green-500'}`}>
                          {m.active ? 'Suspender' : 'Ativar'}
                        </button>
                        <button className="text-red-400 hover:text-red-600 transition-colors">
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ABA 3: UNIDADES --- */}
      {activeTab === 'hospitals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {state.hospitals.map(h => (
            <div key={h.id} className={`p-8 rounded-[2.5rem] border shadow-xl flex flex-col transition-all hover:scale-[1.02] ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => setEditingHospital(h)} className="p-2.5 text-gray-400 hover:text-blue-500 transition-colors bg-gray-500/5 rounded-xl"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                   <button onClick={() => handleDeleteHospital(h.id)} className="p-2.5 text-gray-400 hover:text-red-500 transition-colors bg-gray-500/5 rounded-xl"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              </div>
              <h4 className={`font-black text-lg mb-1 ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{h.name}</h4>
              <p className="text-[11px] font-black text-blue-500 uppercase mb-4 tracking-widest">{h.city}</p>
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-6">{h.address}</p>
              <div className="mt-auto pt-4 border-t border-gray-800/10 flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase">
                <span>COORD: {h.lat.toFixed(4)}, {h.lng.toFixed(4)}</span>
              </div>
            </div>
          ))}
          {state.hospitals.length === 0 && <div className="col-span-full py-24 text-center text-gray-500 italic font-black uppercase tracking-[0.2em] border-2 border-dashed border-gray-800/20 rounded-[2.5rem]">Nenhum hospital cadastrado.</div>}
        </div>
      )}

      {/* --- ABA 4: ROTAS --- */}
      {activeTab === 'routes' && (
        <div className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {state.routes.map(r => (
              <div key={r.id} className={`rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col transition-all hover:shadow-blue-500/10 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                 <div className={`px-8 py-5 border-b flex justify-between items-center ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">{r.name}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingRoute(r)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      <button onClick={() => handleDeleteRoute(r.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                 </div>
                 <div className="p-8 flex-grow space-y-6">
                    <div className="space-y-3">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1">Unidades na Rota</p>
                      <div className="flex flex-wrap gap-2">
                        {r.hospitals.length === 0 ? <p className="text-xs italic text-gray-400 px-1">Nenhum hospital vinculado.</p> : r.hospitals.map(h => (
                          <span key={h} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight ${isHospitalMode ? 'bg-blue-900/20 text-blue-400 border border-blue-900/30' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>{h}</span>
                        ))}
                      </div>
                    </div>
                 </div>
                 <div className={`px-8 py-4 border-t text-[10px] font-black uppercase tracking-[0.2em] ${r.active ? 'text-green-500' : 'text-red-500'} ${isHospitalMode ? 'bg-black/20' : 'bg-gray-50'}`}>
                    {r.active ? '● Rota Ativa' : '○ Rota Pausada'}
                 </div>
              </div>
            ))}
            {state.routes.length === 0 && (
              <div className="col-span-full py-32 text-center rounded-[2.5rem] border-4 border-dashed border-gray-800/20 bg-gray-500/5">
                <div className="mb-6 opacity-20 flex justify-center">
                  <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                </div>
                <h3 className="text-xl font-black text-gray-500 uppercase tracking-widest mb-2">Nenhuma Rota de Visita</h3>
                <p className="text-sm text-gray-400 max-w-sm mx-auto mb-10">Defina os trajetos recomendados para as duplas cobrirem os hospitais da região.</p>
                <Button size="lg" onClick={() => setEditingRoute({ hospitals: [] })}>Configurar Primeira Rota</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ABA 5: CAPACITAÇÃO --- */}
      {activeTab === 'training' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {state.trainingMaterials.map(t => (
            <div key={t.id} className={`p-8 rounded-[2.5rem] border shadow-xl transition-all hover:border-blue-600 group ${isHospitalMode ? 'bg-[#212327] border-gray-800 text-gray-300' : 'bg-white border-gray-100 shadow-sm'}`}>
               <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-blue-50 text-blue-600'}`}>
                    {t.type === 'video' ? '▶️' : t.type === 'pdf' ? '📄' : '📝'}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => setEditingTraining(t)} className="p-2.5 hover:bg-blue-50 rounded-xl text-blue-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                     <button onClick={() => onUpdateState({...state, trainingMaterials: state.trainingMaterials.filter(m => m.id !== t.id)})} className="p-2.5 hover:bg-red-50 rounded-xl text-red-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
               </div>
               <h4 className={`font-black text-lg mb-1 leading-tight ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{t.title}</h4>
               <p className="text-[10px] uppercase font-black text-blue-500 mb-4 tracking-widest">{t.category}</p>
               <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-6">{t.description}</p>
               <div className="mt-auto pt-6 border-t border-gray-800/10 flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>{t.type}</span>
                  {t.isRestricted && <span className="px-3 py-1 bg-orange-500/10 text-orange-500 rounded-lg text-[9px] font-black uppercase border border-orange-500/20 tracking-tighter">Restrito</span>}
               </div>
            </div>
          ))}
          {state.trainingMaterials.length === 0 && <div className="col-span-full py-24 text-center text-gray-500 italic uppercase tracking-[0.2em] font-black border-2 border-dashed border-gray-800/20 rounded-[2.5rem]">Nenhum material de capacitação disponível.</div>}
        </div>
      )}

      {/* --- MODAIS DE GESTÃO --- */}

      {/* MODAL ROTA */}
      {editingRoute && (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className={`w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
            <div className="bg-blue-600 p-8 text-white font-black flex justify-between items-center">
              <span className="text-xl tracking-tight uppercase">Configurar Rota</span>
              <button onClick={() => setEditingRoute(null)} className="text-3xl leading-none hover:rotate-90 transition-transform">&times;</button>
            </div>
            <form onSubmit={handleSaveRoute} className="p-10 space-y-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Nome da Rota</label>
                  <input required type="text" placeholder="Ex: Rota 01 - Litoral Centro" className={`w-full border-2 p-5 rounded-2xl text-sm focus:border-blue-500 focus:ring-0 transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingRoute.name || ''} onChange={e => setEditingRoute({...editingRoute, name: e.target.value})} />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Unidades Inclusas</label>
                  <div className={`max-h-64 overflow-y-auto space-y-2 p-4 border-2 rounded-2xl custom-scrollbar ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 shadow-inner' : 'bg-gray-50 border-gray-100 shadow-inner'}`}>
                      {state.hospitals.map(h => (
                        <label key={h.id} className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border-2 ${editingRoute.hospitals?.includes(h.name) ? 'border-blue-600 bg-blue-600/5' : 'border-transparent hover:bg-gray-500/5'}`}>
                           <input 
                              type="checkbox" 
                              className="w-6 h-6 rounded-lg text-blue-600 focus:ring-0 shadow-sm"
                              checked={editingRoute.hospitals?.includes(h.name)} 
                              onChange={(e) => {
                                  const current = editingRoute.hospitals || [];
                                  const updated = e.target.checked ? [...current, h.name] : current.filter(hn => hn !== h.name);
                                  setEditingRoute({...editingRoute, hospitals: updated});
                              }}
                           />
                           <span className={`text-sm font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{h.name}</span>
                        </label>
                      ))}
                      {state.hospitals.length === 0 && <p className="text-xs text-gray-500 italic p-4 text-center">Cadastre hospitais primeiro.</p>}
                  </div>
               </div>
               <div className="flex justify-end gap-3 pt-6 border-t border-gray-800/10">
                  <Button variant="secondary" type="button" onClick={() => setEditingRoute(null)}>Cancelar</Button>
                  <Button type="submit">Salvar Rota</Button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HOSPITAL */}
      {editingHospital && (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className={`w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
             <div className="bg-blue-600 p-8 text-white font-black flex justify-between items-center">
                <span className="text-xl tracking-tight uppercase">Unidade Hospitalar</span>
                <button onClick={() => setEditingHospital(null)} className="text-3xl leading-none hover:rotate-90 transition-transform">&times;</button>
             </div>
             <div className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Nome</label>
                    <input placeholder="Ex: Santa Casa" className={`w-full border p-4 rounded-2xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.name || ''} onChange={e => setEditingHospital({...editingHospital, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Cidade</label>
                    <input placeholder="Santos / SV / PG" className={`w-full border p-4 rounded-2xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.city || ''} onChange={e => setEditingHospital({...editingHospital, city: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Endereço Completo</label>
                   <input placeholder="Rua, Número, Bairro" className={`w-full border p-4 rounded-2xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.address || ''} onChange={e => setEditingHospital({...editingHospital, address: e.target.value})} />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Geolocalização</label>
                   <MapPicker initialLat={editingHospital.lat} initialLng={editingHospital.lng} onLocationSelect={(lat, lng) => setEditingHospital({...editingHospital, lat, lng})} />
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-800/10">
                   <Button variant="secondary" onClick={() => setEditingHospital(null)}>Cancelar</Button>
                   <Button onClick={() => {
                      const newH = editingHospital.id ? state.hospitals.map(h => h.id === editingHospital.id ? {...h, ...editingHospital} as Hospital : h) : [...state.hospitals, {id: crypto.randomUUID(), ...editingHospital} as Hospital];
                      onUpdateState({...state, hospitals: newH});
                      setEditingHospital(null);
                   }}>Salvar</Button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MODAL TREINAMENTO */}
      {editingTraining && (
          <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
            <div className={`w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
              <div className="bg-blue-600 p-8 text-white font-black flex justify-between items-center">
                <span className="text-xl tracking-tight uppercase">Novo Material</span>
                <button onClick={() => setEditingTraining(null)} className="text-3xl leading-none hover:rotate-90 transition-transform">&times;</button>
              </div>
              <form onSubmit={handleSaveTraining} className="p-10 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Título</label>
                         <input required type="text" className={`w-full border p-4 rounded-2xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingTraining.title || ''} onChange={e => setEditingTraining({...editingTraining, title: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Tipo</label>
                         <select className={`w-full border p-4 rounded-2xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingTraining.type || 'video'} onChange={e => setEditingTraining({...editingTraining, type: e.target.value as any})}>
                            <option value="video">Vídeo</option>
                            <option value="pdf">Documento PDF</option>
                            <option value="texto">Artigo / Texto</option>
                         </select>
                      </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Link URL</label>
                     <input required type="url" placeholder="https://..." className={`w-full border p-4 rounded-2xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingTraining.url || ''} onChange={e => setEditingTraining({...editingTraining, url: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Descrição Curta</label>
                     <textarea rows={3} className={`w-full border p-4 rounded-2xl text-sm resize-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingTraining.description || ''} onChange={e => setEditingTraining({...editingTraining, description: e.target.value})} />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-800/10">
                    <Button variant="secondary" onClick={() => setEditingTraining(null)}>Cancelar</Button>
                    <Button type="submit">Publicar</Button>
                  </div>
              </form>
            </div>
          </div>
      )}
    </div>
  );
};
