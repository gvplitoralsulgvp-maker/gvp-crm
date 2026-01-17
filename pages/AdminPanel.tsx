
import React, { useState, useMemo } from 'react';
import { AppState, Member, VisitRoute, UserRole, Hospital } from '../types';
import { Button } from '../components/Button';
import { atomicUpdate, loadState } from '../services/storageService';
import { getCoordsFromCep } from '../services/geoService';

export const AdminPanel: React.FC<{ state: AppState, onUpdateState: (newState: AppState) => void, isHospitalMode?: boolean }> = ({ state, onUpdateState, isHospitalMode }) => {
  const [activeTab, setActiveTab] = useState<'members' | 'hospitals' | 'routes' | 'reports' | 'balance'>('members');
  const [editingHospital, setEditingHospital] = useState<Partial<Hospital> | null>(null);
  const [editingRoute, setEditingRoute] = useState<Partial<VisitRoute> | null>(null);
  const [editingMember, setEditingMember] = useState<Partial<Member> | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [memberCep, setMemberCep] = useState('');

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

  const sortedMembers = useMemo(() => {
    return [...state.members].sort((a, b) => {
      if (a.active === b.active) {
        return a.name.localeCompare(b.name);
      }
      return a.active ? 1 : -1;
    });
  }, [state.members]);

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember?.name || !editingMember.email) return;

    const finalLat = (editingMember.lat !== undefined && Number.isFinite(Number(editingMember.lat))) ? Number(editingMember.lat) : undefined;
    const finalLng = (editingMember.lng !== undefined && Number.isFinite(Number(editingMember.lng))) ? Number(editingMember.lng) : undefined;

    const newMember: Member = {
      id: editingMember.id || crypto.randomUUID(),
      name: editingMember.name,
      email: editingMember.email,
      role: editingMember.role || UserRole.MEMBER,
      active: editingMember.active === true,
      phone: editingMember.phone || '',
      congregation: editingMember.congregation || '',
      address: editingMember.address || '',
      lat: finalLat,
      lng: finalLng,
      hasSeenOnboarding: editingMember.hasSeenOnboarding || false
    };

    try {
      await atomicUpdate('members', newMember);
      let updatedMembers = [...state.members];
      if (editingMember.id) {
        updatedMembers = updatedMembers.map(m => m.id === editingMember.id ? newMember : m);
      } else {
        updatedMembers.push(newMember);
      }
      onUpdateState({ ...state, members: updatedMembers });
      setEditingMember(null);
      setMemberCep('');
      alert("Membro atualizado com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar no banco de dados.");
    }
  };

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
      let updatedHospitals = [...state.hospitals];
      if (editingHospital.id) {
        updatedHospitals = updatedHospitals.map(h => h.id === editingHospital.id ? newHospital : h);
      } else {
        updatedHospitals.push(newHospital);
      }
      onUpdateState({ ...state, hospitals: updatedHospitals });
      setEditingHospital(null);
    } catch (err) {
      alert("Erro ao salvar hospital.");
    }
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute?.name) return;

    const newRoute: VisitRoute = {
        id: editingRoute.id || crypto.randomUUID(),
        name: editingRoute.name,
        hospitalIds: editingRoute.hospitalIds || [],
        hospitals: editingRoute.hospitals || [],
        active: editingRoute.active ?? true
    };

    try {
        await atomicUpdate('routes', newRoute);
        let updatedRoutes = [...state.routes];
        if (editingRoute.id) {
            updatedRoutes = updatedRoutes.map(r => r.id === editingRoute.id ? newRoute : r);
        } else {
            updatedRoutes.push(newRoute);
        }
        onUpdateState({ ...state, routes: updatedRoutes });
        setEditingRoute(null);
    } catch (err) {
        alert("Erro ao salvar rota.");
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800 shadow-black' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
         <div>
            <h2 className={`text-xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Painel Administrativo</h2>
            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Gestão da equipe, rotas e infraestrutura hospitalar.</p>
         </div>
         <div className="flex gap-2">
            <button 
              onClick={handleRefreshData} 
              disabled={isSyncing}
              className={`p-2 rounded-xl border-2 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${
                isHospitalMode ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'
              } ${isSyncing ? 'animate-pulse' : 'hover:border-blue-500 hover:text-blue-500'}`}
            >
              <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
            {activeTab === 'members' && <Button size="sm" className="rounded-xl px-6" onClick={() => { setEditingMember({ active: true, role: UserRole.MEMBER }); setMemberCep(''); }}>+ Novo Membro</Button>}
         </div>
      </div>

      <div className={`flex border-b overflow-x-auto custom-scrollbar ${isHospitalMode ? 'border-gray-800' : 'border-gray-200'}`}>
        {[
          { id: 'members', label: 'Membros' },
          { id: 'hospitals', label: 'Hospitais' },
          { id: 'routes', label: 'Rotas' },
          { id: 'reports', label: 'Relatórios' },
          { id: 'balance', label: 'Balanço' }
        ].map(tab => (
          <button 
            key={tab.id} 
            className={`px-6 py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`} 
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'members' && (
        <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border overflow-hidden`}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className={`${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'} text-[10px] font-black text-gray-400 uppercase tracking-widest`}>
                        <tr>
                          <th className="px-6 py-4 text-left">Membro</th>
                          <th className="px-6 py-4 text-left">Localização</th>
                          <th className="px-6 py-4 text-left">Role</th>
                          <th className="px-6 py-4 text-left">Status</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-100'} text-sm`}>
                        {sortedMembers.map(m => (
                            <tr key={m.id} className={`${!m.active ? 'bg-orange-500/5' : ''} ${isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                <td className="px-6 py-4">
                                  <p className="font-bold">{m.name}</p>
                                  <p className="text-[10px] text-gray-400">{m.email}</p>
                                </td>
                                <td className="px-6 py-4">
                                  {m.lat != null && m.lng != null ? (
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1 text-blue-600">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                        <span className="text-[10px] font-black uppercase">Mapeado</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] font-bold text-gray-300 uppercase">Não localizado</span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black ${m.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {m.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${m.active ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
                                    <span className={`font-bold ${!m.active ? 'text-red-600 uppercase text-[10px]' : ''}`}>
                                      {m.active ? 'Ativo' : 'Pendente'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => setEditingMember(m)} className={`p-2 rounded-xl transition-all ${!m.active ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-blue-50 text-blue-600'}`}>
                                      {!m.active ? (
                                        <span className="text-[9px] font-black uppercase px-2">Liberar</span>
                                      ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      )}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {editingMember && (
          <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-blue-600 p-6 text-white font-black flex justify-between items-center">
                    <span className="text-lg">{editingMember.id ? 'Editar Membro' : 'Novo Membro'}</span>
                    <button onClick={() => setEditingMember(null)} className="text-3xl leading-none">&times;</button>
                </div>
                <form onSubmit={handleSaveMember} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Completo</label>
                      <input required type="text" className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.name || ''} onChange={e => setEditingMember({...editingMember, name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">E-mail</label>
                      <input required type="email" readOnly className="w-full p-3 border-2 rounded-xl outline-none opacity-50 bg-gray-100" value={editingMember.email || ''} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Role</label>
                        <select className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value as UserRole})}>
                          <option value={UserRole.MEMBER}>Voluntário</option>
                          <option value={UserRole.ADMIN}>Administrador</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Status</label>
                        <select className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.active ? 'true' : 'false'} onChange={e => setEditingMember({...editingMember, active: e.target.value === 'true'})}>
                          <option value="true">Ativo (Liberado)</option>
                          <option value="false">Inativo/Pendente</option>
                        </select>
                      </div>
                    </div>
                    <Button className="w-full rounded-xl py-4" type="submit">Salvar Alterações</Button>
                </form>
             </div>
          </div>
      )}
    </div>
  );
};
