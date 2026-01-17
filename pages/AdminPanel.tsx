
import React, { useState, useMemo } from 'react';
import { AppState, Member, VisitRoute, UserRole, Hospital } from '../types';
import { Button } from '../components/Button';
import { atomicUpdate } from '../services/storageService';

export const AdminPanel: React.FC<{ state: AppState, onUpdateState: (newState: AppState) => void, isHospitalMode?: boolean }> = ({ state, onUpdateState, isHospitalMode }) => {
  const [activeTab, setActiveTab] = useState<'members' | 'hospitals' | 'routes' | 'reports' | 'balance'>('members');
  const [editingHospital, setEditingHospital] = useState<Partial<Hospital> | null>(null);
  const [editingRoute, setEditingRoute] = useState<Partial<VisitRoute> | null>(null);
  const [editingMember, setEditingMember] = useState<Partial<Member> | null>(null);

  // --- ROUTE LOGIC ---
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

  // Workload memo with type safety
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

      <div className={`flex border-b overflow-x-auto custom-scrollbar ${isHospitalMode ? 'border-gray-800' : 'border-gray-200'}`}>
        {['members', 'hospitals', 'routes', 'reports', 'balance'].map(tab => (
          <button key={tab} className={`px-6 py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`} onClick={() => setActiveTab(tab as any)}>{tab}</button>
        ))}
      </div>

      {activeTab === 'routes' && (
        <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border overflow-hidden`}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className={`${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'} text-[10px] font-black text-gray-400 uppercase tracking-widest`}>
                        <tr><th className="px-6 py-4 text-left">Rota</th><th className="px-6 py-4 text-left">Hospitais</th><th className="px-6 py-4 text-right">Ações</th></tr>
                    </thead>
                    <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-100'} text-sm`}>
                        {state.routes.map(r => (
                            <tr key={r.id}>
                                <td className="px-6 py-4 font-bold">{r.name}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {r.hospitals?.map(h => (
                                            <span key={h} className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase">{h}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => setEditingRoute(r)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {editingRoute && (
          <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-blue-600 p-6 text-white font-black flex justify-between items-center">
                    <span className="text-lg">Editar Rota</span>
                    <button onClick={() => setEditingRoute(null)} className="text-3xl leading-none">&times;</button>
                </div>
                <form onSubmit={handleSaveRoute} className="p-8 space-y-4">
                    <input required type="text" className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingRoute.name || ''} onChange={e => setEditingRoute({...editingRoute, name: e.target.value})} />
                    <div className="max-h-40 overflow-y-auto border-2 rounded-xl p-2 custom-scrollbar">
                        {state.hospitals.map(h => {
                            const isSelected = editingRoute.hospitalIds?.includes(h.id);
                            return (
                                <button key={h.id} type="button" onClick={() => toggleHospitalInRoute(h)} className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold mb-1 ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>
                                    {h.name} {isSelected && '✓'}
                                </button>
                            );
                        })}
                    </div>
                    <Button className="w-full rounded-xl" type="submit">Salvar Rota</Button>
                </form>
             </div>
          </div>
      )}
    </div>
  );
};
