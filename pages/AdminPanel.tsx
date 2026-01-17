
import React, { useState, useMemo } from 'react';
import { AppState, Member, VisitRoute, UserRole, Hospital } from '../types';
import { Button } from '../components/Button';

export const AdminPanel: React.FC<{ state: AppState, onUpdateState: (newState: AppState) => void, isHospitalMode?: boolean }> = ({ state, onUpdateState, isHospitalMode }) => {
  const [activeTab, setActiveTab] = useState<'members' | 'hospitals' | 'routes' | 'reports' | 'balance'>('members');
  const [editingHospital, setEditingHospital] = useState<Partial<Hospital> | null>(null);
  const [editingRoute, setEditingRoute] = useState<Partial<VisitRoute> | null>(null);
  const [editingMember, setEditingMember] = useState<Partial<Member> | null>(null);

  // --- MEMBER LOGIC ---
  const handleToggleMember = (id: string) => {
    const updated = state.members.map(m => m.id === id ? { ...m, active: !m.active } : m);
    onUpdateState({ ...state, members: updated });
  };

  const handleUpdateMemberRole = (id: string, role: UserRole) => {
    const updated = state.members.map(m => m.id === id ? { ...m, role } : m);
    onUpdateState({ ...state, members: updated });
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember?.name || !editingMember?.email) return;

    let updatedMembers = [...state.members];
    if (editingMember.id) {
        updatedMembers = updatedMembers.map(m => m.id === editingMember.id ? { ...m, ...editingMember } as Member : m);
    } else {
        const newMember: Member = {
            ...editingMember,
            id: crypto.randomUUID(),
            role: editingMember.role || UserRole.MEMBER,
            active: true,
            password: editingMember.password || '123456',
            hasSeenOnboarding: false
        } as Member;
        updatedMembers.push(newMember);
    }
    onUpdateState({ ...state, members: updatedMembers });
    setEditingMember(null);
  };

  // --- HOSPITAL LOGIC ---
  const handleSaveHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHospital?.name) return;

    let updatedHospitals = [...state.hospitals];
    if (editingHospital.id) {
        updatedHospitals = updatedHospitals.map(h => h.id === editingHospital.id ? { ...h, ...editingHospital } as Hospital : h);
    } else {
        const newHosp: Hospital = {
            ...editingHospital,
            id: crypto.randomUUID(),
            address: editingHospital.address || '',
            city: editingHospital.city || '',
            lat: editingHospital.lat || -23.9608,
            lng: editingHospital.lng || -46.3331,
        } as Hospital;
        updatedHospitals.push(newHosp);
    }
    onUpdateState({ ...state, hospitals: updatedHospitals });
    setEditingHospital(null);
  };

  const handleDeleteHospital = (id: string) => {
    if (window.confirm("Deseja realmente excluir este hospital?")) {
        onUpdateState({ ...state, hospitals: state.hospitals.filter(h => h.id !== id) });
    }
  };

  // --- ROUTE LOGIC ---
  const handleSaveRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute?.name) return;

    let updatedRoutes = [...state.routes];
    if (editingRoute.id) {
        updatedRoutes = updatedRoutes.map(r => r.id === editingRoute.id ? { ...r, ...editingRoute } as VisitRoute : r);
    } else {
        const newRoute: VisitRoute = {
            ...editingRoute,
            id: crypto.randomUUID(),
            hospitalIds: editingRoute.hospitalIds || [],
            hospitals: editingRoute.hospitals || [],
            active: true
        } as VisitRoute;
        updatedRoutes.push(newRoute);
    }
    onUpdateState({ ...state, routes: updatedRoutes });
    setEditingRoute(null);
  };

  const toggleHospitalInRoute = (hospital: Hospital) => {
    const currentNames = editingRoute?.hospitals || [];
    const currentIds = editingRoute?.hospitalIds || [];
    
    if (currentIds.includes(hospital.id)) {
        setEditingRoute({ 
          ...editingRoute, 
          hospitalIds: currentIds.filter(id => id !== hospital.id),
          hospitals: currentNames.filter(name => name !== hospital.name) 
        });
    } else {
        setEditingRoute({ 
          ...editingRoute, 
          hospitalIds: [...currentIds, hospital.id],
          hospitals: [...currentNames, hospital.name] 
        });
    }
  };

  // --- BALANCE LOGIC (WORKLOAD) ---
  const memberWorkload = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    state.members.forEach(m => counts[m.id] = 0);
    state.visits.forEach(v => {
        v.memberIds.forEach(mid => {
            if (counts[mid] !== undefined) counts[mid]++;
        });
    });
    return counts;
  }, [state.visits, state.members]);

  const maxVisits = Math.max(...(Object.values(memberWorkload) as number[]), 1);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800 shadow-black' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
         <div>
            <h2 className={`text-xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Painel Administrativo</h2>
            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Gestão central da equipe, rotas e infraestrutura hospitalar.</p>
         </div>
         <div className="flex gap-2">
            {activeTab === 'members' && <Button size="sm" className="rounded-xl px-6" onClick={() => setEditingMember({ active: true, role: UserRole.MEMBER })}>+ Novo Membro</Button>}
            {activeTab === 'hospitals' && <Button size="sm" className="rounded-xl px-6" onClick={() => setEditingHospital({ name: '', city: 'Santos', address: '' })}>+ Novo Hospital</Button>}
            {activeTab === 'routes' && <Button size="sm" className="rounded-xl px-6" onClick={() => setEditingRoute({ name: '', hospitalIds: [], hospitals: [], active: true })}>+ Nova Rota</Button>}
         </div>
      </div>

      {/* Tabs Navigation */}
      <div className={`flex border-b overflow-x-auto custom-scrollbar ${isHospitalMode ? 'border-gray-800' : 'border-gray-200'}`}>
        {[
          { id: 'members', label: 'Equipe' },
          { id: 'hospitals', label: 'Hospitais' },
          { id: 'routes', label: 'Rotas' },
          { id: 'reports', label: 'Logs & Auditoria' },
          { id: 'balance', label: 'Equilíbrio' }
        ].map(tab => (
          <button 
            key={tab.id} 
            className={`px-6 py-4 font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.id 
                ? 'border-blue-600 text-blue-600' 
                : isHospitalMode ? 'border-transparent text-gray-500 hover:text-gray-300' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`} 
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: MEMBERS */}
      {activeTab === 'members' && (
        <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border overflow-hidden`}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className={`${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'} text-[10px] font-black text-gray-400 uppercase tracking-widest`}>
                        <tr>
                            <th className="px-6 py-4 text-left">Membro</th>
                            <th className="px-6 py-4 text-left">Função</th>
                            <th className="px-6 py-4 text-left">Localização</th>
                            <th className="px-6 py-4 text-left">Status</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-100'} text-sm`}>
                        {state.members.map(m => (
                            <tr key={m.id} className={isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                                <td className="px-6 py-4">
                                    <p className={`font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{m.name}</p>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">{m.congregation}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <select 
                                        className={`bg-transparent text-xs font-black border-none p-0 focus:ring-0 ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}
                                        value={m.role}
                                        onChange={(e) => handleUpdateMemberRole(m.id, e.target.value as UserRole)}
                                    >
                                        <option value={UserRole.MEMBER}>Membro</option>
                                        <option value={UserRole.ADMIN}>Admin</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4">
                                   {m.lat && m.lng ? (
                                       <span className="text-[10px] text-green-500 font-black uppercase flex items-center gap-1">📍 Mapeado</span>
                                   ) : (
                                       <span className="text-[10px] text-orange-400 font-black uppercase italic">Pendente</span>
                                   )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${m.active ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                        {m.active ? 'Ativo' : 'Aprovação'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                                    <button onClick={() => setEditingMember(m)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl" title="Editar">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button onClick={() => handleToggleMember(m.id)} className={`text-[10px] font-black uppercase tracking-widest ${m.active ? 'text-orange-500 hover:text-orange-600' : 'text-green-600 hover:text-green-700'}`}>
                                        {m.active ? 'Suspender' : 'Aprovar'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* TAB CONTENT: HOSPITALS */}
      {activeTab === 'hospitals' && (
        <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border overflow-hidden`}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className={`${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'} text-[10px] font-black text-gray-400 uppercase tracking-widest`}>
                        <tr>
                            <th className="px-6 py-4 text-left">Hospital</th>
                            <th className="px-6 py-4 text-left">Endereço / Cidade</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-100'} text-sm`}>
                        {state.hospitals.map(h => (
                            <tr key={h.id} className={isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                                <td className="px-6 py-4">
                                    <p className={`font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{h.name}</p>
                                    {h.importantInfo && <p className="text-[10px] text-blue-500 font-bold uppercase truncate max-w-xs">{h.importantInfo}</p>}
                                </td>
                                <td className="px-6 py-4">
                                    <p className={`${isHospitalMode ? 'text-gray-400' : 'text-gray-600'} text-xs`}>{h.address}</p>
                                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-tighter">{h.city}</p>
                                </td>
                                <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                                    <button onClick={() => setEditingHospital(h)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button onClick={() => handleDeleteHospital(h.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-xl">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* TAB CONTENT: ROUTES */}
      {activeTab === 'routes' && (
        <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border overflow-hidden`}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className={`${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'} text-[10px] font-black text-gray-400 uppercase tracking-widest`}>
                        <tr>
                            <th className="px-6 py-4 text-left">Nome da Rota</th>
                            <th className="px-6 py-4 text-left">Hospitais na Rota</th>
                            <th className="px-6 py-4 text-left">Status</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-100'} text-sm`}>
                        {state.routes.map(r => (
                            <tr key={r.id} className={isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                                <td className="px-6 py-4">
                                    <p className={`font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{r.name}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {r.hospitals?.map(h => (
                                            <span key={h} className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase tracking-tighter">{h}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${r.active ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                        {r.active ? 'Ativa' : 'Pausada'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => setEditingRoute(r)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* TAB CONTENT: REPORTS (LOGS) */}
      {activeTab === 'reports' && (
        <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border overflow-hidden`}>
            <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className={`${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'} sticky top-0 text-[10px] font-black text-gray-400 uppercase tracking-widest z-10`}>
                        <tr>
                            <th className="px-6 py-4 text-left">Data/Hora</th>
                            <th className="px-6 py-4 text-left">Usuário</th>
                            <th className="px-6 py-4 text-left">Ação</th>
                            <th className="px-6 py-4 text-left">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-100'} text-xs`}>
                        {state.logs.sort((a,b) => b.timestamp.localeCompare(a.timestamp)).map(log => (
                            <tr key={log.id} className={isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                                <td className="px-6 py-4 whitespace-nowrap opacity-60">
                                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                                </td>
                                <td className="px-6 py-4 font-bold whitespace-nowrap">
                                    {log.userName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-lg font-black uppercase">{log.action}</span>
                                </td>
                                <td className="px-6 py-4 max-w-xs truncate" title={log.details}>
                                    {log.details}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* TAB CONTENT: BALANCE (WORKLOAD) */}
      {activeTab === 'balance' && (
        <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} p-6 rounded-2xl shadow-sm border`}>
            <h3 className={`text-sm font-black uppercase tracking-widest mb-6 ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Distribuição de Visitas (Impacto Individual)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {state.members.filter(m => m.active).map(m => {
                    const count = memberWorkload[m.id] || 0;
                    const percentage = (count / maxVisits) * 100;
                    return (
                        <div key={m.id} className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className={isHospitalMode ? 'text-gray-200' : 'text-gray-800'}>{m.name}</span>
                                <span className="text-blue-600 font-black uppercase">{count} Visitas</span>
                            </div>
                            <div className={`h-2 rounded-full overflow-hidden ${isHospitalMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                                <div 
                                    className={`h-full rounded-full transition-all duration-700 ${count > (maxVisits * 0.8) ? 'bg-orange-500' : 'bg-blue-600'}`} 
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {/* MODAL: EDIT MEMBER */}
      {editingMember && (
          <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-blue-600 p-6 text-white font-black flex justify-between items-center">
                    <span className="text-lg">{editingMember.id ? 'Editar Membro' : 'Novo Membro'}</span>
                    <button onClick={() => setEditingMember(null)} className="text-3xl leading-none">&times;</button>
                </div>
                <form onSubmit={handleSaveMember} className="p-8 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Completo</label>
                        <input required type="text" className={`w-full p-3 border-2 rounded-xl focus:border-blue-600 outline-none transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.name || ''} onChange={e => setEditingMember({...editingMember, name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Email Principal</label>
                        <input required type="email" className={`w-full p-3 border-2 rounded-xl focus:border-blue-600 outline-none transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.email || ''} onChange={e => setEditingMember({...editingMember, email: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Função</label>
                            <select className={`w-full p-3 border-2 rounded-xl focus:border-blue-600 outline-none transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.role || UserRole.MEMBER} onChange={e => setEditingMember({...editingMember, role: e.target.value as UserRole})}>
                                <option value={UserRole.MEMBER}>Membro</option>
                                <option value={UserRole.ADMIN}>Administrador</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Status</label>
                            <select className={`w-full p-3 border-2 rounded-xl focus:border-blue-600 outline-none transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.active ? 'true' : 'false'} onChange={e => setEditingMember({...editingMember, active: e.target.value === 'true'})}>
                                <option value="true">Ativo</option>
                                <option value="false">Pendente / Inativo</option>
                            </select>
                        </div>
                    </div>
                    <div className="pt-6 flex gap-3">
                        <Button variant="secondary" className="flex-1 rounded-xl" type="button" onClick={() => setEditingMember(null)}>Cancelar</Button>
                        <Button className="flex-1 rounded-xl" type="submit">Salvar Alterações</Button>
                    </div>
                </form>
             </div>
          </div>
      )}

      {/* MODAL: EDIT HOSPITAL */}
      {editingHospital && (
          <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-blue-600 p-6 text-white font-black flex justify-between items-center">
                    <span className="text-lg">{editingHospital.id ? 'Editar Hospital' : 'Novo Hospital'}</span>
                    <button onClick={() => setEditingHospital(null)} className="text-3xl leading-none">&times;</button>
                </div>
                <form onSubmit={handleSaveHospital} className="p-8 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome da Instituição</label>
                        <input required type="text" className={`w-full p-3 border-2 rounded-xl focus:border-blue-600 outline-none transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.name || ''} onChange={e => setEditingHospital({...editingHospital, name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Endereço Completo</label>
                        <input required type="text" className={`w-full p-3 border-2 rounded-xl focus:border-blue-600 outline-none transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.address || ''} onChange={e => setEditingHospital({...editingHospital, address: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Cidade</label>
                            <input required type="text" className={`w-full p-3 border-2 rounded-xl focus:border-blue-600 outline-none transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.city || ''} onChange={e => setEditingHospital({...editingHospital, city: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Info Importante (GVP)</label>
                            <input type="text" className={`w-full p-3 border-2 rounded-xl focus:border-blue-600 outline-none transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.importantInfo || ''} onChange={e => setEditingHospital({...editingHospital, importantInfo: e.target.value})} />
                        </div>
                    </div>
                    <div className="pt-6 flex gap-3">
                        <Button variant="secondary" className="flex-1 rounded-xl" type="button" onClick={() => setEditingHospital(null)}>Cancelar</Button>
                        <Button className="flex-1 rounded-xl" type="submit">Salvar Hospital</Button>
                    </div>
                </form>
             </div>
          </div>
      )}

      {/* MODAL: EDIT ROUTE */}
      {editingRoute && (
          <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-blue-600 p-6 text-white font-black flex justify-between items-center">
                    <span className="text-lg">{editingRoute.id ? 'Editar Rota' : 'Nova Rota'}</span>
                    <button onClick={() => setEditingRoute(null)} className="text-3xl leading-none">&times;</button>
                </div>
                <form onSubmit={handleSaveRoute} className="p-8 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome da Rota</label>
                        <input required type="text" placeholder="Ex: Rota Centro" className={`w-full p-3 border-2 rounded-xl focus:border-blue-600 outline-none transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingRoute.name || ''} onChange={e => setEditingRoute({...editingRoute, name: e.target.value})} />
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2 block">Vincular Hospitais</label>
                        <div className={`max-h-40 overflow-y-auto border-2 rounded-xl p-2 space-y-1 custom-scrollbar ${isHospitalMode ? 'border-gray-800' : 'border-gray-100'}`}>
                            {state.hospitals.map(h => {
                                const isSelected = editingRoute.hospitalIds?.includes(h.id);
                                return (
                                    <button 
                                        key={h.id} type="button" 
                                        onClick={() => toggleHospitalInRoute(h)}
                                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all ${isSelected ? 'bg-blue-600 text-white' : isHospitalMode ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-600'}`}
                                    >
                                        {h.name}
                                        {isSelected && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                        <input 
                            type="checkbox" 
                            id="route-active" 
                            className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-0" 
                            checked={editingRoute.active} 
                            onChange={e => setEditingRoute({...editingRoute, active: e.target.checked})} 
                        />
                        <label htmlFor="route-active" className={`text-xs font-black uppercase tracking-widest ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>Rota Ativa e Disponível</label>
                    </div>

                    <div className="pt-6 flex gap-3">
                        <Button variant="secondary" className="flex-1 rounded-xl" type="button" onClick={() => setEditingRoute(null)}>Cancelar</Button>
                        <Button className="flex-1 rounded-xl" type="submit">Salvar Rota</Button>
                    </div>
                </form>
             </div>
          </div>
      )}
    </div>
  );
};
