
import React, { useState } from 'react';
import { AppState, Member, VisitRoute, UserRole, Hospital, VisitSlot } from '../types';
import { Button } from '../components/Button';
import { MapPicker } from '../components/MapPicker';
import { getCoordsFromCep } from '../services/geoService';

export const AdminPanel: React.FC<{ state: AppState, onUpdateState: (newState: AppState) => void, isHospitalMode?: boolean }> = ({ state, onUpdateState, isHospitalMode }) => {
  const [activeTab, setActiveTab] = useState<'members' | 'hospitals' | 'routes' | 'reports' | 'balance'>('members');
  const [editingHospital, setEditingHospital] = useState<Partial<Hospital> | null>(null);
  const [editingRoute, setEditingRoute] = useState<Partial<VisitRoute> | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isValidatingMemberCep, setIsValidatingMemberCep] = useState(false);

  // Stats for Balance Tab
  const memberActivity = state.members.map(m => {
      const visitCount = state.visits.filter(v => v.memberIds.includes(m.id)).length;
      return { ...m, visitCount };
  }).sort((a,b) => b.visitCount - a.visitCount);
  const maxVisits = Math.max(...memberActivity.map(m => m.visitCount), 1);

  // Filtered visits with reports for the Reports tab
  const visitsWithReports = state.visits
    .filter(v => !!v.report)
    .sort((a, b) => b.date.localeCompare(a.date));

  // --- MEMBER ACTIONS ---
  const handleToggleMember = (id: string) => {
    const updated = state.members.map(m => m.id === id ? { ...m, active: !m.active } : m);
    onUpdateState({ ...state, members: updated });
  };

  const handleUpdateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    const updated = state.members.map(m => m.id === editingMember.id ? editingMember : m);
    onUpdateState({ ...state, members: updated });
    setEditingMember(null);
  };

  const handleLookupMemberCep = async () => {
    if (!editingMember?.cep) return;
    setIsValidatingMemberCep(true);
    try {
        const result = await getCoordsFromCep(editingMember.cep);
        setEditingMember({
            ...editingMember,
            lat: result.lat,
            lng: result.lng,
            address: result.address
        });
    } catch (e) {
        alert("Falha ao localizar CEP.");
    } finally {
        setIsValidatingMemberCep(false);
    }
  };

  const handleDeleteMember = (id: string, name: string) => {
    if (id === state.currentUser?.id) {
        alert("Você não pode excluir sua própria conta.");
        return;
    }
    if (window.confirm(`Tem certeza que deseja excluir permanentemente o cadastro de ${name}?`)) {
        const updatedMembers = state.members.filter(m => m.id !== id);
        onUpdateState({ ...state, members: updatedMembers });
    }
  };

  const handleUpdateMemberRole = (id: string, role: UserRole) => {
    const updated = state.members.map(m => m.id === id ? { ...m, role } : m);
    onUpdateState({ ...state, members: updated });
  };

  // --- HOSPITAL ACTIONS ---
  const handleSaveHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHospital?.name || !editingHospital?.city) return;
    let newHospitals = [...state.hospitals];
    if (editingHospital.id) {
        newHospitals = newHospitals.map(h => h.id === editingHospital.id ? { ...h, ...editingHospital } as Hospital : h);
    } else {
        newHospitals.push({ id: crypto.randomUUID(), ...editingHospital } as Hospital);
    }
    onUpdateState({ ...state, hospitals: newHospitals });
    setEditingHospital(null);
  };

  // --- ROUTE ACTIONS ---
  const handleSaveRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute?.name) return;
    let newRoutes = [...state.routes];
    if (editingRoute.id) {
        newRoutes = newRoutes.map(r => r.id === editingRoute.id ? { ...r, ...editingRoute } as VisitRoute : r);
    } else {
        newRoutes.push({ id: crypto.randomUUID(), active: true, hospitals: [], ...editingRoute } as VisitRoute);
    }
    onUpdateState({ ...state, routes: newRoutes });
    setEditingRoute(null);
  };

  const getMemberName = (id: string) => state.members.find(m => m.id === id)?.name || 'Desconhecido';

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} p-6 rounded-xl shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
         <div>
            <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Painel Administrativo</h2>
            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Gestão de equipe, infraestrutura hospitalar e auditoria de visitas.</p>
         </div>
         <div className="flex gap-2">
            {activeTab === 'hospitals' && <Button size="sm" onClick={() => setEditingHospital({ lat: -23.9608, lng: -46.3331, city: '', importantInfo: '' })}>+ Novo Hospital</Button>}
            {activeTab === 'routes' && <Button size="sm" onClick={() => setEditingRoute({ hospitals: [] })}>+ Nova Rota</Button>}
         </div>
      </div>

      <div className={`flex border-b overflow-x-auto custom-scrollbar ${isHospitalMode ? 'border-gray-800' : 'border-gray-200'}`}>
        {[
          { id: 'members', label: 'Equipe' },
          { id: 'hospitals', label: 'Hospitais' },
          { id: 'routes', label: 'Rotas' },
          { id: 'reports', label: 'Relatórios' },
          { id: 'balance', label: 'Equilíbrio' }
        ].map(tab => (
          <button 
            key={tab.id} 
            className={`px-6 py-3 font-bold text-xs uppercase tracking-widest whitespace-nowrap transition-all ${
              activeTab === tab.id 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : isHospitalMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
            }`} 
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- ABA EQUIPE --- */}
      {activeTab === 'members' && (
        <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-xl shadow-sm border overflow-hidden`}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className={`${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'} text-[10px] font-bold text-gray-400 uppercase tracking-widest`}>
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
                                    <p className="text-[10px] text-gray-500 font-medium uppercase">{m.congregation}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <select 
                                        className={`bg-transparent text-xs font-bold border-none p-0 focus:ring-0 ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}
                                        value={m.role}
                                        onChange={(e) => handleUpdateMemberRole(m.id, e.target.value as UserRole)}
                                    >
                                        <option value={UserRole.MEMBER}>Membro</option>
                                        <option value={UserRole.ADMIN}>Admin</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4">
                                   {m.lat && m.lng ? (
                                       <span className="text-[10px] text-green-500 font-bold uppercase flex items-center gap-1">📍 Mapeado</span>
                                   ) : (
                                       <span className="text-[10px] text-orange-400 font-bold uppercase italic">Sem Mapa</span>
                                   )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${m.active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {m.active ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                                    <button onClick={() => setEditingMember(m)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg" title="Editar Detalhes">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button onClick={() => handleToggleMember(m.id)} className={`text-xs font-bold underline ${m.active ? 'text-orange-500' : 'text-green-500'}`}>
                                        {m.active ? 'Suspender' : 'Aprovar'}
                                    </button>
                                    <button onClick={() => handleDeleteMember(m.id, m.name)} className="text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors">
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

      {/* --- ABA HOSPITAIS --- */}
      {activeTab === 'hospitals' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.hospitals.map(h => (
                  <div key={h.id} className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} p-5 rounded-xl border shadow-sm flex flex-col transition-all hover:shadow-md`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="space-y-1">
                            <p className={`font-bold text-base ${isHospitalMode ? 'text-gray-100' : 'text-gray-800'}`}>{h.name}</p>
                            <p className="text-xs text-gray-500 leading-tight">{h.address}</p>
                            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">{h.city}</p>
                        </div>
                        <button onClick={() => setEditingHospital(h)} className={`p-2 rounded-lg transition-colors ${isHospitalMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-50 text-gray-500 hover:text-blue-600'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      </div>
                      {h.importantInfo && (
                        <div className={`mt-auto p-3 rounded-lg text-xs italic ${isHospitalMode ? 'bg-blue-900/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                          <p className="font-bold uppercase text-[9px] mb-1">Informações de Visita:</p>
                          {h.importantInfo.length > 80 ? h.importantInfo.substring(0, 80) + '...' : h.importantInfo}
                        </div>
                      )}
                  </div>
              ))}
          </div>
      )}

      {/* --- ABA ROTAS --- */}
      {activeTab === 'routes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.routes.map(r => (
                  <div key={r.id} className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-xl border shadow-sm overflow-hidden flex flex-col`}>
                      <div className={`px-5 py-3 border-b flex justify-between items-center ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                          <p className="font-bold text-xs uppercase tracking-widest text-blue-500">{r.name}</p>
                          <button onClick={() => setEditingRoute(r)} className="text-[10px] font-bold text-gray-500 hover:text-blue-500 uppercase">Editar</button>
                      </div>
                      <div className="p-5 flex-grow space-y-2">
                          {(!r.hospitals || r.hospitals.length === 0) ? (
                              <p className="text-xs text-gray-400 italic">Nenhum hospital vinculado.</p>
                          ) : (
                              r.hospitals.map((h, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500/30"></div>
                                      <p className={`text-xs ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{h}</p>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* --- ABA RELATÓRIOS (AUDITORIA) --- */}
      {activeTab === 'reports' && (
          <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-xl shadow-sm border overflow-hidden`}>
            <div className="p-4 border-b border-gray-800/10 flex justify-between items-center">
              <h3 className={`font-bold text-sm ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>Histórico Consolidado de Relatos</h3>
              <p className="text-[10px] text-gray-500 uppercase font-bold">{visitsWithReports.length} Visitas Concluídas</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className={`${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'} text-[10px] font-bold text-gray-400 uppercase tracking-widest`}>
                  <tr>
                    <th className="px-6 py-4 text-left">Data</th>
                    <th className="px-6 py-4 text-left">Rota / Dupla</th>
                    <th className="px-6 py-4 text-left">Relato Detalhado</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-100'} text-sm`}>
                  {visitsWithReports.map(visit => {
                    const routeName = state.routes.find(r => r.id === visit.routeId)?.name || 'Desconhecida';
                    return (
                      <tr key={visit.id} className={isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className={`font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-800'}`}>{new Date(visit.date + 'T12:00:00').toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`text-xs font-bold uppercase text-blue-500`}>{routeName}</p>
                          <p className="text-[10px] text-gray-500 mt-1">{visit.memberIds.map(getMemberName).join(' & ')}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`p-3 rounded-lg text-xs leading-relaxed max-w-lg ${isHospitalMode ? 'bg-[#1a1c1e] text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                            {visit.report?.notes}
                          </div>
                          {visit.report?.followUpNeeded && (
                            <span className="mt-2 inline-block px-2 py-0.5 bg-red-500/10 text-red-500 text-[8px] font-bold uppercase rounded border border-red-500/20">Urgente</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {visitsWithReports.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-gray-500 italic">Nenhum relatório finalizado até o momento.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
      )}

      {/* --- ABA EQUILÍBRIO --- */}
      {activeTab === 'balance' && (
          <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} p-6 rounded-xl border shadow-sm space-y-6`}>
              <div>
                  <h3 className={`text-lg font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Métricas de Participação</h3>
                  <p className="text-sm text-gray-500">Volume de visitas por membro para garantir uma escala equilibrada.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {memberActivity.map(m => (
                      <div key={m.id} className={`p-4 rounded-xl border ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-gray-50 border-gray-100'} flex items-center gap-4`}>
                          <div className="flex-grow">
                              <div className="flex justify-between items-end mb-1.5">
                                  <p className={`text-sm font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{m.name}</p>
                                  <span className="text-[10px] font-bold text-blue-500">{m.visitCount} visitas</span>
                              </div>
                              <div className={`w-full h-1.5 rounded-full overflow-hidden ${isHospitalMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                  <div 
                                    className="bg-blue-600 h-full rounded-full transition-all duration-1000" 
                                    style={{ width: `${(m.visitCount / maxVisits) * 100}%` }}
                                  ></div>
                              </div>
                          </div>
                          {m.visitCount === 0 && <span className="bg-red-500/10 text-red-500 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border border-red-500/20">Inativo</span>}
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- MODAIS DE EDIÇÃO --- */}
      {editingMember && (
          <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-fade-in`}>
                  <div className="bg-blue-600 p-5 text-white font-bold flex justify-between items-center">
                      <span className="text-lg">Editar Membro</span>
                      <button onClick={() => setEditingMember(null)} className="text-2xl leading-none">&times;</button>
                  </div>
                  <form onSubmit={handleUpdateMember} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nome</label>
                              <input required type="text" className={`w-full border p-3 rounded-xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-white border-gray-200'}`} value={editingMember.name} onChange={e => setEditingMember({...editingMember, name: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Congregação</label>
                              <input required type="text" className={`w-full border p-3 rounded-xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-white border-gray-200'}`} value={editingMember.congregation || ''} onChange={e => setEditingMember({...editingMember, congregation: e.target.value})} />
                          </div>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-800/10">
                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 block">Atualizar Localização (CEP)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" className={`flex-grow border p-3 rounded-xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-white border-gray-200'}`} 
                                value={editingMember.cep || ''} onChange={e => setEditingMember({...editingMember, cep: e.target.value})} 
                                placeholder="00000-000"
                            />
                            <Button type="button" size="sm" variant="secondary" onClick={handleLookupMemberCep} disabled={isValidatingMemberCep}>
                                {isValidatingMemberCep ? '...' : 'Buscar'}
                            </Button>
                        </div>
                        {editingMember.address && <p className="mt-2 text-[10px] text-gray-500 italic">{editingMember.address}</p>}
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Localização Manual</label>
                          <MapPicker 
                            initialLat={editingMember.lat} 
                            initialLng={editingMember.lng} 
                            onLocationSelect={(lat, lng) => setEditingMember({...editingMember, lat, lng})} 
                          />
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-800 mt-2">
                          <Button variant="secondary" type="button" onClick={() => setEditingMember(null)}>Cancelar</Button>
                          <Button type="submit">Salvar Alterações</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {editingHospital && (
          <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800 shadow-black' : 'bg-white border-gray-100'} w-full max-w-lg rounded-2xl overflow-hidden animate-fade-in shadow-2xl`}>
                  <div className="bg-blue-600 p-5 text-white font-bold flex justify-between items-center">
                      <span className="text-lg">{editingHospital.id ? 'Editar Hospital' : 'Novo Hospital'}</span>
                      <button onClick={() => setEditingHospital(null)} className="text-2xl leading-none">&times;</button>
                  </div>
                  <form onSubmit={handleSaveHospital} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nome da Unidade</label>
                              <input required type="text" className={`w-full border p-3 rounded-xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-white border-gray-200'}`} value={editingHospital.name || ''} onChange={e => setEditingHospital({...editingHospital, name: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cidade</label>
                              <input required type="text" placeholder="Ex: Santos, Guarujá..." className={`w-full border p-3 rounded-xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-white border-gray-200'}`} value={editingHospital.city || ''} onChange={e => setEditingHospital({...editingHospital, city: e.target.value})} />
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Endereço Completo</label>
                          <input required type="text" className={`w-full border p-3 rounded-xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-white border-gray-200'}`} value={editingHospital.address || ''} onChange={e => setEditingHospital({...editingHospital, address: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Instruções Importantes (Regras da Instituição)</label>
                          <textarea 
                            rows={3}
                            placeholder="Ex: Entrada pela lateral, estacionamento gratuito no local, exige máscara PFF2..."
                            className={`w-full border p-3 rounded-xl text-sm resize-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-white border-gray-200'}`} 
                            value={editingHospital.importantInfo || ''} 
                            onChange={e => setEditingHospital({...editingHospital, importantInfo: e.target.value})} 
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Localização Geográfica</label>
                          <MapPicker 
                            initialLat={editingHospital.lat} 
                            initialLng={editingHospital.lng} 
                            onLocationSelect={(lat, lng) => setEditingHospital({...editingHospital, lat, lng})} 
                          />
                      </div>
                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-800 mt-2">
                          <Button variant="secondary" type="button" onClick={() => setEditingHospital(null)}>Cancelar</Button>
                          <Button type="submit">Salvar Hospital</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {editingRoute && (
          <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800 shadow-black' : 'bg-white border-gray-100'} w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-fade-in`}>
                  <div className="bg-blue-600 p-5 text-white font-bold flex justify-between items-center">
                      <span className="text-lg">Gestão de Rota</span>
                      <button onClick={() => setEditingRoute(null)} className="text-2xl leading-none">&times;</button>
                  </div>
                  <form onSubmit={handleSaveRoute} className="p-6 space-y-5">
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Identificador da Rota</label>
                          <input required type="text" placeholder="Ex: G1 - Santos Centro" className={`w-full border p-3 rounded-xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-white border-gray-200'}`} value={editingRoute.name || ''} onChange={e => setEditingRoute({...editingRoute, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hospitais Vinculados</label>
                          <div className={`max-h-48 overflow-y-auto space-y-1 p-3 border rounded-xl custom-scrollbar ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                              {state.hospitals.map(h => (
                                  <label key={h.id} className={`flex items-center gap-3 text-sm p-2 rounded-lg cursor-pointer transition-colors ${isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-white shadow-sm border border-transparent hover:border-blue-200'}`}>
                                      <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                        checked={editingRoute.hospitals?.includes(h.name)} 
                                        onChange={(e) => {
                                            const current = editingRoute.hospitals || [];
                                            const updated = e.target.checked ? [...current, h.name] : current.filter(hn => hn !== h.name);
                                            setEditingRoute({...editingRoute, hospitals: updated});
                                        }}
                                      />
                                      <span className={isHospitalMode ? 'text-gray-300' : 'text-gray-700'}>{h.name}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                          <Button variant="secondary" type="button" onClick={() => setEditingRoute(null)}>Cancelar</Button>
                          <Button type="submit">Salvar Rota</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
