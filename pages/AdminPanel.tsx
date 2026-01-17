
import React, { useState, useMemo } from 'react';
import { AppState, Member, VisitRoute, UserRole, Hospital, VisitSlot } from '../types';
import { Button } from '../components/Button';
import { atomicUpdate, loadState, atomicDelete } from '../services/storageService';

export const AdminPanel: React.FC<{ state: AppState, onUpdateState: (newState: AppState) => void, isHospitalMode?: boolean }> = ({ state, onUpdateState, isHospitalMode }) => {
  const [activeTab, setActiveTab] = useState<'members' | 'hospitals' | 'routes' | 'reports' | 'balance'>('members');
  const [editingHospital, setEditingHospital] = useState<Partial<Hospital> | null>(null);
  const [editingRoute, setEditingRoute] = useState<Partial<VisitRoute> | null>(null);
  const [editingMember, setEditingMember] = useState<Partial<Member> | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleRefreshData = async () => {
    setIsSyncing(true);
    try {
      const newState = await loadState();
      onUpdateState(newState);
    } catch (err) {
      alert("Erro ao sincronizar dados.");
    } finally {
      setIsSyncing(false);
    }
  };

  // --- LOGICA DE MEMBROS ---
  const sortedMembers = useMemo(() => {
    return [...state.members].sort((a, b) => {
      if (a.active === b.active) return a.name.localeCompare(b.name);
      return a.active ? 1 : -1;
    });
  }, [state.members]);

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember?.name || !editingMember.email) return;
    const newMember: Member = {
      id: editingMember.id || crypto.randomUUID(),
      name: editingMember.name,
      email: editingMember.email,
      role: editingMember.role || UserRole.MEMBER,
      active: editingMember.active === true,
      phone: editingMember.phone || '',
      congregation: editingMember.congregation || '',
      hasSeenOnboarding: editingMember.hasSeenOnboarding || false
    };
    try {
      await atomicUpdate('members', newMember);
      const updated = editingMember.id 
        ? state.members.map(m => m.id === editingMember.id ? newMember : m)
        : [...state.members, newMember];
      onUpdateState({ ...state, members: updated });
      setEditingMember(null);
    } catch (err) { alert("Erro ao salvar membro."); }
  };

  // --- LOGICA DE HOSPITAIS ---
  const handleSaveHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHospital?.name) return;
    const newHospital: Hospital = {
      id: editingHospital.id || crypto.randomUUID(),
      name: editingHospital.name,
      city: editingHospital.city || 'Santos',
      address: editingHospital.address || '',
      lat: editingHospital.lat || -23.9608,
      lng: editingHospital.lng || -46.3331,
      importantInfo: editingHospital.importantInfo || ''
    };
    try {
      await atomicUpdate('hospitals', newHospital);
      const updated = editingHospital.id 
        ? state.hospitals.map(h => h.id === editingHospital.id ? newHospital : h)
        : [...state.hospitals, newHospital];
      onUpdateState({ ...state, hospitals: updated });
      setEditingHospital(null);
    } catch (err) { alert("Erro ao salvar hospital."); }
  };

  // --- LOGICA DE ROTAS ---
  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute?.name) return;
    const newRoute: VisitRoute = {
      id: editingRoute.id || crypto.randomUUID(),
      name: editingRoute.name,
      hospitals: editingRoute.hospitals || [],
      active: editingRoute.active ?? true
    };
    try {
      await atomicUpdate('routes', newRoute);
      const updated = editingRoute.id 
        ? state.routes.map(r => r.id === editingRoute.id ? newRoute : r)
        : [...state.routes, newRoute];
      onUpdateState({ ...state, routes: updated });
      setEditingRoute(null);
    } catch (err) { alert("Erro ao salvar rota."); }
  };

  // --- LOGICA DE BALANÇO ---
  const memberStats = useMemo(() => {
    const stats = state.members.map(m => {
      const visitCount = state.visits.filter(v => v.memberIds.includes(m.id) && v.status === 'FINISHED').length;
      return { ...m, visitCount };
    });
    return stats.sort((a, b) => b.visitCount - a.visitCount);
  }, [state.members, state.visits]);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Header Admin */}
      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
         <div>
            <h2 className={`text-xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Gestão Enterprise</h2>
            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Supervisão técnica do Grupo GVP Litoral Sul.</p>
         </div>
         <div className="flex gap-2">
            <button onClick={handleRefreshData} disabled={isSyncing} className={`p-2.5 rounded-xl border-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isHospitalMode ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
              <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {isSyncing ? 'Sync...' : 'Sincronizar'}
            </button>
            <Button size="sm" className="rounded-xl px-6" onClick={() => {
              if (activeTab === 'members') setEditingMember({ active: true, role: UserRole.MEMBER });
              if (activeTab === 'hospitals') setEditingHospital({ city: 'Santos' });
              if (activeTab === 'routes') setEditingRoute({ active: true, hospitals: [] });
            }}>
              + Adicionar Novo
            </Button>
         </div>
      </div>

      {/* Navegação de Abas */}
      <div className={`flex border-b overflow-x-auto custom-scrollbar no-scrollbar ${isHospitalMode ? 'border-gray-800' : 'border-gray-200'}`}>
        {[
          { id: 'members', label: 'Equipe' },
          { id: 'hospitals', label: 'Unidades' },
          { id: 'routes', label: 'Logística' },
          { id: 'reports', label: 'Relatórios' },
          { id: 'balance', label: 'Balanço' }
        ].map(tab => (
          <button 
            key={tab.id} 
            className={`px-8 py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`} 
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO: EQUIPE */}
      {activeTab === 'members' && (
        <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border overflow-hidden`}>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className={`${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'} text-[10px] font-black text-gray-400 uppercase tracking-widest`}>
                    <tr>
                      <th className="px-6 py-4 text-left">Membro</th>
                      <th className="px-6 py-4 text-left">Função</th>
                      <th className="px-6 py-4 text-left">Status</th>
                      <th className="px-6 py-4 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-100'} text-sm`}>
                    {sortedMembers.map(m => (
                        <tr key={m.id} className={`${isHospitalMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                            <td className="px-6 py-4">
                              <p className="font-bold">{m.name}</p>
                              <p className="text-[10px] text-gray-500">{m.email}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${m.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{m.role}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${m.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                <span className="font-bold text-[11px]">{m.active ? 'ATIVO' : 'PENDENTE'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button onClick={() => setEditingMember(m)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">Editar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {/* CONTEÚDO: HOSPITAIS */}
      {activeTab === 'hospitals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.hospitals.map(h => (
              <div key={h.id} className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-2xl border flex flex-col`}>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className={`font-black text-lg ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{h.name}</h3>
                    <span className="text-[10px] font-black text-blue-600 uppercase">{h.city}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">{h.address}</p>
                  {h.importantInfo && (
                    <div className="bg-orange-500/10 p-3 rounded-xl mb-4 border border-orange-500/20">
                      <p className="text-[9px] font-black text-orange-600 uppercase mb-1">Briefing IA:</p>
                      <p className="text-[10px] text-orange-700 italic line-clamp-2">"{h.importantInfo}"</p>
                    </div>
                  )}
                  <button onClick={() => setEditingHospital(h)} className="mt-auto w-full py-2 bg-gray-50 hover:bg-gray-100 text-[10px] font-black uppercase text-gray-500 rounded-xl transition-all">Configurar Unidade</button>
              </div>
            ))}
        </div>
      )}

      {/* CONTEÚDO: ROTAS */}
      {activeTab === 'routes' && (
        <div className="space-y-4">
            {state.routes.map(r => (
              <div key={r.id} className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-center gap-4`}>
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                       <h3 className={`font-black text-lg ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{r.name}</h3>
                       <span className={`px-2 py-0.5 rounded text-[9px] font-black ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.active ? 'ATIVA' : 'SUSPENSA'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {r.hospitals?.map(hName => (
                         <span key={hName} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold border border-blue-100">{hName}</span>
                       ))}
                    </div>
                  </div>
                  <button onClick={() => setEditingRoute(r)} className="px-6 py-2 border-2 border-gray-100 hover:border-blue-500 text-[10px] font-black uppercase text-gray-400 hover:text-blue-600 rounded-xl transition-all">Editar Rota</button>
              </div>
            ))}
        </div>
      )}

      {/* CONTEÚDO: RELATÓRIOS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
           {state.visits.filter(v => !!v.report).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 20).map(v => (
             <div key={v.id} className={`${isHospitalMode ? 'bg-[#212327] border-gray-800 text-gray-300' : 'bg-white border-gray-100 shadow-sm text-gray-700'} p-6 rounded-2xl border`}>
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">{v.report?.doctorName.substring(0,2).toUpperCase()}</div>
                      <div>
                        <p className="font-black text-sm">{v.report?.doctorName}</p>
                        <p className="text-[10px] text-blue-600 font-bold uppercase">{new Date(v.date + 'T12:00:00').toLocaleDateString()}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Unidade</p>
                      <p className="text-xs font-bold">{state.routes.find(r => r.id === v.routeId)?.name || 'Rota Geral'}</p>
                   </div>
                </div>
                <div className={`p-4 rounded-xl italic text-sm leading-relaxed ${isHospitalMode ? 'bg-black/20' : 'bg-gray-50 border border-gray-100'}`}>
                  "{v.report?.notes}"
                </div>
                {v.report?.followUpNeeded && <div className="mt-3 px-3 py-1 bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest inline-block rounded-lg border border-red-500/20">Acompanhamento Crítico Solicitado</div>}
             </div>
           ))}
        </div>
      )}

      {/* CONTEÚDO: BALANÇO */}
      {activeTab === 'balance' && (
        <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-2xl border shadow-sm p-6`}>
           <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-8 px-2">Engajamento Total da Equipe</h3>
           <div className="space-y-6">
              {memberStats.map(m => (
                <div key={m.id} className="group">
                  <div className="flex justify-between items-end mb-2 px-2">
                     <span className={`text-sm font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{m.name}</span>
                     <span className="text-xs font-black text-blue-600">{m.visitCount} Visitas</span>
                  </div>
                  <div className={`w-full h-3 rounded-full overflow-hidden ${isHospitalMode ? 'bg-black/40' : 'bg-gray-100'}`}>
                     <div 
                        className="h-full bg-blue-600 transition-all duration-1000 group-hover:bg-blue-400" 
                        style={{ width: `${Math.min((m.visitCount / 10) * 100, 100)}%` }}
                     />
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* MODAL: EDITAR MEMBRO */}
      {editingMember && (
          <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-blue-600 p-6 text-white font-black flex justify-between items-center">
                    <span className="text-lg">Configurar Voluntário</span>
                    <button onClick={() => setEditingMember(null)} className="text-3xl leading-none">&times;</button>
                </div>
                <form onSubmit={handleSaveMember} className="p-8 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Completo</label>
                      <input required type="text" className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.name || ''} onChange={e => setEditingMember({...editingMember, name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">E-mail</label>
                      <input required type="email" className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.email || ''} onChange={e => setEditingMember({...editingMember, email: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Role</label>
                        <select className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value as UserRole})}>
                          <option value={UserRole.MEMBER}>Voluntário</option>
                          <option value={UserRole.ADMIN}>Administrador</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Status</label>
                        <select className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.active ? 'true' : 'false'} onChange={e => setEditingMember({...editingMember, active: e.target.value === 'true'})}>
                          <option value="true">Ativo</option>
                          <option value="false">Bloqueado</option>
                        </select>
                      </div>
                    </div>
                    <Button className="w-full rounded-xl py-4" type="submit">Salvar Alterações</Button>
                </form>
             </div>
          </div>
      )}

      {/* MODAL: EDITAR HOSPITAL */}
      {editingHospital && (
          <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-blue-600 p-6 text-white font-black flex justify-between items-center">
                    <span className="text-lg">Configurar Unidade</span>
                    <button onClick={() => setEditingHospital(null)} className="text-3xl leading-none">&times;</button>
                </div>
                <form onSubmit={handleSaveHospital} className="p-8 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome da Instituição</label>
                      <input required type="text" className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.name || ''} onChange={e => setEditingHospital({...editingHospital, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Cidade</label>
                        <input required type="text" className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.city || ''} onChange={e => setEditingHospital({...editingHospital, city: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Endereço</label>
                        <input required type="text" className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.address || ''} onChange={e => setEditingHospital({...editingHospital, address: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Informações para IA (Briefing)</label>
                      <textarea rows={4} className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} placeholder="Ex: Regras de crachá, pacientes cirúrgicos as terças, estacionamento no fundo..." value={editingHospital.importantInfo || ''} onChange={e => setEditingHospital({...editingHospital, importantInfo: e.target.value})} />
                    </div>
                    <Button className="w-full rounded-xl py-4" type="submit">Atualizar Unidade</Button>
                </form>
             </div>
          </div>
      )}

      {/* MODAL: EDITAR ROTA */}
      {editingRoute && (
          <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-blue-600 p-6 text-white font-black flex justify-between items-center">
                    <span className="text-lg">Configurar Rota</span>
                    <button onClick={() => setEditingRoute(null)} className="text-3xl leading-none">&times;</button>
                </div>
                <form onSubmit={handleSaveRoute} className="p-8 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome da Rota Logística</label>
                      <input required type="text" className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingRoute.name || ''} onChange={e => setEditingRoute({...editingRoute, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block mb-2">Unidades Vinculadas</label>
                       <div className="max-h-40 overflow-y-auto p-2 border-2 rounded-xl border-gray-800/10 custom-scrollbar space-y-2">
                          {state.hospitals.map(h => (
                            <label key={h.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                               <input 
                                 type="checkbox" 
                                 className="rounded text-blue-600 focus:ring-0" 
                                 checked={editingRoute.hospitals?.includes(h.name)} 
                                 onChange={(e) => {
                                   const current = editingRoute.hospitals || [];
                                   const updated = e.target.checked ? [...current, h.name] : current.filter(name => name !== h.name);
                                   setEditingRoute({...editingRoute, hospitals: updated});
                                 }} 
                               />
                               <span className="text-xs font-bold">{h.name}</span>
                            </label>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Status Operacional</label>
                      <select className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingRoute.active ? 'true' : 'false'} onChange={e => setEditingRoute({...editingRoute, active: e.target.value === 'true'})}>
                          <option value="true">Rota Ativa</option>
                          <option value="false">Rota Suspensa</option>
                      </select>
                    </div>
                    <Button className="w-full rounded-xl py-4" type="submit">Salvar Rota</Button>
                </form>
             </div>
          </div>
      )}
    </div>
  );
};
