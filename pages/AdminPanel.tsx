
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AppState, Member, VisitRoute, UserRole, Hospital, VisitSlot, CityMapping, ColihVisit, Doctor, ColihInteractionType } from '../types';
import { Button } from '../components/Button';
import { atomicUpdate, loadState, atomicDelete } from '../services/storageService';
import { getCoordsFromCep, getRegionalByCity } from '../services/geoService';
import { supabase } from '../services/supabaseClient';

const INTERACTION_TYPES: { id: ColihInteractionType, label: string }[] = [
    { id: 'visit', label: 'Visita de Rotina' },
    { id: 'presentation', label: 'Apresentação Formal' },
    { id: 'material_delivery', label: 'Entrega de Material' },
    { id: 'email_phone', label: 'Contato Tel/Email' }
];

export const AdminPanel: React.FC<{ state: AppState, onUpdateState: (newState: AppState) => void, isHospitalMode?: boolean }> = ({ state, onUpdateState, isHospitalMode }) => {
  const [activeTab, setActiveTab] = useState<'members' | 'hospitals' | 'cities' | 'routes' | 'reports' | 'balance'>('members');
  const [editingHospital, setEditingHospital] = useState<Partial<Hospital> | null>(null);
  const [editingRoute, setEditingRoute] = useState<Partial<VisitRoute> | null>(null);
  const [editingMember, setEditingMember] = useState<Partial<Member> | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  // Estados para Cidades e Regionais
  const [newCityRegional, setNewCityRegional] = useState('');
  const [newCityName, setNewCityName] = useState('');
  const [newRegionalName, setNewRegionalName] = useState('');
  const [editingRegional, setEditingRegional] = useState<string | null>(null);
  
  const [memberFilter, setMemberFilter] = useState<'ALL' | 'GVP' | 'COLIH' | 'FACILITATOR' | 'ADMIN'>('ALL');
  const [reportType, setReportType] = useState<'gvp' | 'colih'>('gvp');

  const availableRegionals = useMemo(() => {
      const set = new Set(state.cityMappings.map(c => c.regional));
      return Array.from(set).sort();
  }, [state.cityMappings]);

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

  const handleGeocodeHospital = async () => {
    if (!editingHospital?.address) {
      alert("Digite o endereço ou CEP do hospital primeiro.");
      return;
    }
    setIsGeocoding(true);
    try {
      const result = await getCoordsFromCep(editingHospital.address);
      const detectedRegional = getRegionalByCity(result.city, state.cityMappings);

      setEditingHospital({
        ...editingHospital,
        lat: result.lat,
        lng: result.lng,
        city: result.city,
        address: result.address,
        regional: detectedRegional || editingHospital.regional
      });
      alert(`Localização encontrada! Cidade: ${result.city} -> Regional: ${detectedRegional || 'Manual'}`);
    } catch (err) {
      alert("Não foi possível localizar este endereço automaticamente. Verifique os dados.");
    } finally {
      setIsGeocoding(false);
    }
  };

  // --- LOGICA DE MEMBROS ---
  const filteredMembers = useMemo(() => {
    let result = [...state.members];
    if (memberFilter === 'GVP') {
        result = result.filter(m => !m.isColih && m.role !== UserRole.ADMIN);
    } else if (memberFilter === 'COLIH') {
        result = result.filter(m => m.isColih && m.colihClassification !== 'Facilitator' && m.role !== UserRole.ADMIN);
    } else if (memberFilter === 'FACILITATOR') {
        result = result.filter(m => m.colihClassification === 'Facilitator');
    } else if (memberFilter === 'ADMIN') {
        result = result.filter(m => m.role === UserRole.ADMIN);
    }
    return result.sort((a, b) => {
      if (a.active === b.active) return a.name.localeCompare(b.name);
      return a.active ? 1 : -1;
    });
  }, [state.members, memberFilter]);

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
      hasSeenOnboarding: editingMember.hasSeenOnboarding || false,
      address: editingMember.address,
      city: editingMember.city,
      lat: editingMember.lat,
      lng: editingMember.lng,
      isColih: editingMember.isColih || false, 
      colihClassification: editingMember.colihClassification,
      regional: editingMember.regional
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

  const getProfileType = (m: Partial<Member>) => {
    if (m.role === UserRole.ADMIN) return 'ADMIN';
    if (m.colihClassification === 'Facilitator') return 'FACILITATOR';
    if (m.isColih) return 'COLIH';
    return 'GVP';
  };

  // --- LOGICA DE CIDADES E REGIONAIS ---
  const handleAddCity = async (regional: string, city: string) => {
      if (!city || !regional) return;
      const normalizedCity = city.trim();
      
      if (state.cityMappings.some(c => c.city.toLowerCase() === normalizedCity.toLowerCase())) {
          alert(`A cidade "${normalizedCity}" já está cadastrada em uma regional.`);
          return;
      }

      const newMapping: CityMapping = {
          id: crypto.randomUUID(),
          city: normalizedCity,
          regional: regional
      };

      try {
          await atomicUpdate('city_mappings', newMapping);
          onUpdateState({
              ...state,
              cityMappings: [...state.cityMappings, newMapping]
          });
      } catch (e) {
          alert("Erro ao adicionar cidade.");
      }
  };

  const handleDeleteCity = async (id: string) => {
      if(!window.confirm("Remover esta cidade da regional?")) return;
      try {
          await atomicDelete('city_mappings', id);
          onUpdateState({
              ...state,
              cityMappings: state.cityMappings.filter(c => c.id !== id)
          });
      } catch (e) {
          alert("Erro ao remover.");
      }
  };

  const handleAddRegional = () => {
      if (!newRegionalName) return;
      setNewCityRegional(newRegionalName);
      setNewRegionalName('');
      setNewCityName(''); // Reset city input for the new regional
  };

  const handleRenameRegional = async (oldName: string, newName: string) => {
      if (!newName || !oldName || newName === oldName) return;
      if (!supabase) return alert("Erro de conexão.");

      try {
          const { error } = await supabase
              .from('city_mappings')
              .update({ regional: newName })
              .eq('regional', oldName);

          if (error) throw error;

          const updatedMappings = state.cityMappings.map(c => 
              c.regional === oldName ? { ...c, regional: newName } : c
          );

          onUpdateState({ ...state, cityMappings: updatedMappings });
          setEditingRegional(null);
      } catch (e) {
          console.error(e);
          alert("Erro ao renomear regional.");
      }
  };

  const handleDeleteRegionalWhole = async (regionalName: string) => {
      if (!window.confirm(`ATENÇÃO: Deseja excluir a regional "${regionalName}" e TODAS as suas cidades vinculadas?\n\nEsta ação não pode ser desfeita.`)) return;
      if (!supabase) return;

      try {
          const { error } = await supabase
              .from('city_mappings')
              .delete()
              .eq('regional', regionalName);

          if (error) throw error;

          const updatedMappings = state.cityMappings.filter(c => c.regional !== regionalName);
          onUpdateState({ ...state, cityMappings: updatedMappings });
          setEditingRegional(null);
      } catch (e) {
          console.error(e);
          alert("Erro ao excluir regional.");
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
      lat: editingHospital.lat || 0,
      lng: editingHospital.lng || 0,
      importantInfo: editingHospital.importantInfo || '',
      regional: editingHospital.regional
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

  const handleDeleteRoute = async (id: string) => {
      if (!window.confirm("Tem certeza que deseja EXCLUIR esta rota? Isso não pode ser desfeito.")) return;
      try {
          await atomicDelete('routes', id);
          const updated = state.routes.filter(r => r.id !== id);
          onUpdateState({ ...state, routes: updated });
          setEditingRoute(null);
      } catch (err) {
          alert("Erro ao excluir rota.");
      }
  };

  const sortedColihVisits = useMemo(() => {
      return [...state.colihVisits].sort((a,b) => b.date.localeCompare(a.date));
  }, [state.colihVisits]);

  const { gvpStats, colihStats } = useMemo(() => {
    const stats = state.members.map(m => {
      const gvpVisits = state.visits.filter(v => v.memberIds.includes(m.id) && v.status === 'FINISHED').length;
      const colihVisits = state.colihVisits.filter(v => v.memberIds.includes(m.id)).length;
      return { ...m, visitCount: gvpVisits + colihVisits };
    });

    const colihMembers = stats
        .filter(m => m.isColih && m.colihClassification !== 'Facilitator')
        .sort((a, b) => b.visitCount - a.visitCount);

    const gvpMembers = stats
        .filter(m => !m.isColih && m.role !== UserRole.ADMIN) 
        .sort((a, b) => b.visitCount - a.visitCount);

    return { gvpStats: gvpMembers, colihStats: colihMembers };
  }, [state.members, state.visits, state.colihVisits]);

  const handleMemberCityChange = (city: string) => {
      const regional = getRegionalByCity(city, state.cityMappings);
      setEditingMember(prev => ({ ...prev, city, regional: regional || prev?.regional }));
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
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
              if (activeTab === 'members') setEditingMember({ active: true, role: UserRole.MEMBER, isColih: false });
              if (activeTab === 'hospitals') setEditingHospital({ city: 'Santos' });
              if (activeTab === 'routes') setEditingRoute({ active: true, hospitals: [] });
            }}>
              + Adicionar Novo
            </Button>
         </div>
      </div>

      <div className={`flex border-b overflow-x-auto custom-scrollbar no-scrollbar ${isHospitalMode ? 'border-gray-800' : 'border-gray-200'}`}>
        {[
          { id: 'members', label: 'Membros' },
          { id: 'hospitals', label: 'Unidades' },
          { id: 'cities', label: 'Cidades' },
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

      {activeTab === 'members' && (
        <div className="space-y-4">
            <div className={`p-1 rounded-xl inline-flex overflow-x-auto ${isHospitalMode ? 'bg-black/30' : 'bg-gray-100'}`}>
                {[
                    { id: 'ALL', label: 'Todos' },
                    { id: 'GVP', label: 'GVP' },
                    { id: 'COLIH', label: 'Colih' },
                    { id: 'FACILITATOR', label: 'Facilitadores' },
                    { id: 'ADMIN', label: 'Admins' }
                ].map(filter => (
                    <button 
                        key={filter.id}
                        onClick={() => setMemberFilter(filter.id as any)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${
                            memberFilter === filter.id 
                            ? (isHospitalMode ? 'bg-gray-700 text-white shadow' : 'bg-white text-blue-600 shadow-sm') 
                            : 'text-gray-500 hover:text-gray-400'
                        }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border overflow-hidden`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className={`${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'} text-[10px] font-black text-gray-400 uppercase tracking-widest`}>
                            <tr>
                            <th className="px-6 py-4 text-left">Membro</th>
                            <th className="px-6 py-4 text-left">Função</th>
                            <th className="px-6 py-4 text-left">Regional</th>
                            <th className="px-6 py-4 text-left">Status</th>
                            <th className="px-6 py-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-100'} text-sm`}>
                            {filteredMembers.map(m => (
                                <tr key={m.id} className={`${isHospitalMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                                    <td className="px-6 py-4">
                                    <p className="font-bold">{m.name}</p>
                                    <p className="text-[10px] text-gray-500">{m.email}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        {m.role === UserRole.ADMIN ? (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-700">ADMIN</span>
                                        ) : m.colihClassification === 'Facilitator' ? (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-teal-100 text-teal-700">FACILITADOR</span>
                                        ) : m.isColih ? (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-teal-100 text-teal-700">COLIH</span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-700">GVP</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-bold uppercase text-gray-500">{m.regional || '-'}</span>
                                        <p className="text-[9px] text-gray-400">{m.city}</p>
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
            </div>
        </div>
      )}

      {activeTab === 'cities' && (
          <div className="space-y-6">
              <div className="flex gap-4 items-end">
                  <div className="flex-grow">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Criar Nova Regional</label>
                      <div className="flex gap-2">
                          <input 
                              type="text" 
                              placeholder="Nome da Regional (ex: Litoral Sul 4)" 
                              className={`flex-grow p-3 rounded-xl border-2 text-sm outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-white border-gray-100'}`}
                              value={newRegionalName}
                              onChange={e => setNewRegionalName(e.target.value)}
                          />
                          <button onClick={handleAddRegional} className="px-6 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors">Criar</button>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableRegionals.map(regional => {
                      const cities = state.cityMappings.filter(c => c.regional === regional);
                      return (
                          <div key={regional} className={`p-5 rounded-2xl border flex flex-col gap-4 ${isHospitalMode ? 'bg-[#212327] border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                              <div className="flex justify-between items-center">
                                  <h4 className={`font-black text-lg ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{regional}</h4>
                                  <button 
                                    onClick={() => setEditingRegional(regional)}
                                    className={`p-2 rounded-lg transition-colors ${isHospitalMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                                    title="Configurar Regional"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                  </button>
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                  {cities.map(c => (
                                      <div key={c.id} className={`flex items-center gap-2 px-2 py-1 rounded-lg border text-[11px] font-bold ${isHospitalMode ? 'bg-black/20 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                          {c.city}
                                          <button 
                                            onClick={() => handleDeleteCity(c.id)} 
                                            className="ml-1 text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-full p-0.5 transition-colors"
                                            title="Remover cidade"
                                          >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                          </button>
                                      </div>
                                  ))}
                                  {cities.length === 0 && <p className="text-[10px] text-gray-400 italic">Nenhuma cidade vinculada.</p>}
                              </div>

                              <form 
                                  onSubmit={(e) => {
                                      e.preventDefault();
                                      const input = (e.target as any).elements.namedItem('cityInput');
                                      if(input && input.value) {
                                          handleAddCity(regional, input.value);
                                          input.value = '';
                                      }
                                  }}
                                  className="mt-auto pt-4 border-t border-dashed border-gray-200/20"
                              >
                                  <p className="text-[9px] font-bold uppercase text-gray-500 mb-1">Adicionar Cidade</p>
                                  <div className="flex gap-2">
                                      <input 
                                          type="text" 
                                          name="cityInput"
                                          className={`flex-grow p-2 rounded-lg border text-xs outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                                          placeholder="Nome da Cidade"
                                      />
                                      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg text-xs font-bold transition-colors">
                                          +
                                      </button>
                                  </div>
                              </form>
                          </div>
                      );
                  })}
                  
                  {/* Card para adicionar em regional nova (rascunho) */}
                  {newCityRegional && !availableRegionals.includes(newCityRegional) && (
                      <div className={`p-5 rounded-2xl border-2 border-dashed flex flex-col gap-4 ${isHospitalMode ? 'border-gray-700 bg-white/5' : 'border-blue-200 bg-blue-50'}`}>
                          <h4 className={`font-black text-lg ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}>{newCityRegional} (Nova)</h4>
                          <p className="text-xs text-gray-500">Adicione a primeira cidade para confirmar a criação desta regional.</p>
                          <div className="flex gap-2 mt-auto">
                              <input 
                                  type="text" 
                                  className={`flex-grow p-2 rounded-lg border text-xs outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-white border-gray-200'}`}
                                  placeholder="Nome da Cidade"
                                  value={newCityName}
                                  onChange={e => setNewCityName(e.target.value)}
                              />
                              <button onClick={() => { handleAddCity(newCityRegional, newCityName); setNewCityRegional(''); setNewCityName(''); }} className="bg-blue-600 text-white px-3 rounded-lg text-xs font-bold">Add</button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {activeTab === 'hospitals' && (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.hospitals.map(h => (
                <div key={h.id} className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-2xl border flex flex-col`}>
                    <div className="flex justify-between items-start mb-4">
                        <h3 className={`font-black text-lg ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{h.name}</h3>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-blue-600 uppercase block">{h.city}</span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">{h.regional}</span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2">{h.address}</p>
                    
                    <div className="flex gap-2 mb-4">
                        {h.lat && h.lng ? (
                        <span className="text-[9px] font-black text-green-600 uppercase bg-green-50 px-2 py-1 rounded">Vínculo GPS OK</span>
                        ) : (
                        <span className="text-[9px] font-black text-red-600 uppercase bg-red-50 px-2 py-1 rounded">Sem Localização</span>
                        )}
                    </div>

                    <button onClick={() => setEditingHospital(h)} className="mt-auto w-full py-2 bg-gray-50 hover:bg-gray-100 text-[10px] font-black uppercase text-gray-500 rounded-xl transition-all">Configurar Unidade</button>
                </div>
                ))}
            </div>
        </div>
      )}

      {activeTab === 'routes' && (
        <div className="space-y-4">
            {[...state.routes]
              .sort((a, b) => {
                  if (a.active === b.active) return a.name.localeCompare(b.name);
                  return a.active ? -1 : 1;
              })
              .map(r => (
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

      {activeTab === 'reports' && (
        <div className="space-y-6">
           <div className={`p-1 rounded-xl inline-flex ${isHospitalMode ? 'bg-black/30' : 'bg-gray-100'}`}>
                <button onClick={() => setReportType('gvp')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${reportType === 'gvp' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>Visitas Hospitalares</button>
                <button onClick={() => setReportType('colih')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${reportType === 'colih' ? 'bg-teal-600 text-white' : 'text-gray-500'}`}>Interações Médicas</button>
           </div>
           
           {reportType === 'gvp' && state.visits.filter(v => !!v.report).length === 0 && (
               <div className="text-center py-10 text-gray-400 text-sm font-bold uppercase">Nenhum relatório GVP encontrado.</div>
           )}
           {reportType === 'gvp' && state.visits.filter(v => !!v.report).map(v => (
               <div key={v.id} className={`p-6 rounded-2xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                   <p className="text-xs font-bold mb-2 text-blue-500">{new Date(v.date + 'T12:00:00').toLocaleDateString()}</p>
                   <p className={`text-sm italic ${isHospitalMode ? 'text-gray-300' : 'text-gray-600'}`}>"{v.report?.notes}"</p>
                   <p className="text-[10px] font-bold mt-2 text-gray-400 uppercase">Por: {v.report?.doctorName}</p>
               </div>
           ))}

           {reportType === 'colih' && sortedColihVisits.length === 0 && (
               <div className="text-center py-10 text-gray-400 text-sm font-bold uppercase">Nenhum relatório COLIH encontrado.</div>
           )}
           {reportType === 'colih' && sortedColihVisits.map(visit => {
                const doctor = state.doctors.find(d => d.id === visit.doctorId);
                const hospital = state.hospitals.find(h => h.id === visit.hospitalId);
                const targetName = doctor ? doctor.name : (hospital ? hospital.name : 'Ação Institucional');
                return (
                    <div key={visit.id} className={`p-6 rounded-2xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isHospitalMode ? 'bg-teal-900/50 text-teal-400' : 'bg-teal-100 text-teal-700'}`}>
                                    {visit.interactionType === 'presentation' ? 'AP' : 'VS'}
                                </div>
                                <div>
                                    <h4 className={`font-bold text-sm ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{targetName}</h4>
                                    <p className={`text-xs ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {new Date(visit.date + 'T12:00:00').toLocaleDateString()} • {INTERACTION_TYPES.find(t => t.id === visit.interactionType)?.label}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className={`p-4 rounded-xl text-sm italic ${isHospitalMode ? 'bg-black/20 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                            "{visit.notes}"
                        </div>
                        <div className="mt-3 flex justify-end">
                            <p className={`text-[10px] uppercase font-bold tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                Por: {visit.memberIds.map(id => state.members.find(m => m.id === id)?.name.split(' ')[0]).join(', ')}
                            </p>
                        </div>
                    </div>
                );
           })}
        </div>
      )}

      {activeTab === 'balance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-2xl border shadow-sm p-6`}>
               <h3 className="text-sm font-black uppercase tracking-widest text-teal-600 mb-6">Equipe COLIH</h3>
               <div className="space-y-4">{colihStats.map(m => (<div key={m.id} className="flex justify-between text-xs border-b border-gray-100 pb-2"><span>{m.name} <span className="text-gray-400">({m.regional || 'Geral'})</span></span><span className="font-bold">{m.visitCount}</span></div>))}</div>
            </div>
            <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-2xl border shadow-sm p-6`}>
               <h3 className="text-sm font-black uppercase tracking-widest text-blue-600 mb-6">Voluntários GVP</h3>
               <div className="space-y-4">{gvpStats.map(m => (<div key={m.id} className="flex justify-between text-xs border-b border-gray-100 pb-2"><span>{m.name}</span><span className="font-bold">{m.visitCount}</span></div>))}</div>
            </div>
        </div>
      )}

      {/* MODAL: EDITAR REGIONAL (NOVO) */}
      {editingRegional && createPortal(
          <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className={`w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-blue-600 px-6 py-5 flex justify-between items-center shrink-0">
                    <h3 className="text-white font-bold text-lg">Configurar Regional</h3>
                    <button onClick={() => setEditingRegional(null)} className="text-white hover:text-blue-200 text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Renomear Grupo</label>
                        <input 
                            type="text" 
                            className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`}
                            defaultValue={editingRegional}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameRegional(editingRegional, e.currentTarget.value);
                            }}
                            onBlur={(e) => handleRenameRegional(editingRegional, e.target.value)}
                        />
                        <p className="text-[9px] text-gray-400">Pressione Enter para salvar o novo nome.</p>
                    </div>

                    <div className={`p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-3`}>
                        <div className="flex items-center gap-2 text-red-500">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            <span className="text-xs font-bold uppercase">Zona de Perigo</span>
                        </div>
                        <p className={`text-[10px] ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Excluir esta regional removerá todas as cidades vinculadas e desfará grupos logísticos.
                        </p>
                        <button 
                            onClick={() => handleDeleteRegionalWhole(editingRegional)}
                            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase shadow-lg"
                        >
                            Excluir Regional Inteira
                        </button>
                    </div>
                </div>
             </div>
          </div>,
          document.body
      )}

      {/* MODAL: EDITAR MEMBRO (Com createPortal) - ATUALIZADO */}
      {editingMember && createPortal(
          <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[85vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-blue-600 p-6 text-white font-black flex justify-between items-center shrink-0">
                    <span className="text-lg">Configurar Voluntário</span>
                    <button onClick={() => setEditingMember(null)} className="text-3xl leading-none">&times;</button>
                </div>
                <form onSubmit={handleSaveMember} className="p-8 space-y-4 flex-grow overflow-y-auto custom-scrollbar">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Completo</label>
                      <input required type="text" className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.name || ''} onChange={e => setEditingMember({...editingMember, name: e.target.value})} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Cidade</label>
                            <input 
                                required type="text" 
                                className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} 
                                value={editingMember.city || ''} 
                                onChange={e => handleMemberCityChange(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Regional</label>
                            <select 
                                className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`}
                                value={editingMember.regional || ''}
                                onChange={e => setEditingMember({...editingMember, regional: e.target.value})}
                            >
                                <option value="">Automática</option>
                                {availableRegionals.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Função</label>
                        <select 
                            className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} 
                            value={getProfileType(editingMember)} 
                            onChange={(e) => {
                                const type = e.target.value;
                                let updates: Partial<Member> = {};
                                switch (type) {
                                    case 'ADMIN': updates = { role: UserRole.ADMIN, isColih: true, colihClassification: null }; break;
                                    case 'FACILITATOR': updates = { role: UserRole.MEMBER, isColih: true, colihClassification: 'Facilitator' }; break;
                                    case 'COLIH': updates = { role: UserRole.MEMBER, isColih: true, colihClassification: 'Member' }; break;
                                    default: updates = { role: UserRole.MEMBER, isColih: false, colihClassification: null }; break;
                                }
                                setEditingMember(prev => ({ ...prev, ...updates }));
                            }}
                        >
                          <option value="GVP">Voluntário GVP</option>
                          <option value="COLIH">Membro COLIH</option>
                          <option value="FACILITATOR">Facilitador</option>
                          <option value="ADMIN">Administrador</option>
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

                    <div className="pt-4">
                        <Button className="w-full rounded-xl py-4" type="submit">Salvar Alterações</Button>
                    </div>
                </form>
             </div>
          </div>,
          document.body
      )}

      {/* MODAL: EDITAR HOSPITAL (Com createPortal) - ATUALIZADO */}
      {editingHospital && createPortal(
          <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[85vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-blue-600 p-6 text-white font-black flex justify-between items-center shrink-0">
                    <span className="text-lg">Configurar Unidade</span>
                    <button onClick={() => setEditingHospital(null)} className="text-3xl leading-none">&times;</button>
                </div>
                <form onSubmit={handleSaveHospital} className="p-8 space-y-4 flex-grow overflow-y-auto custom-scrollbar">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome da Instituição</label>
                      <input required type="text" className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.name || ''} onChange={e => setEditingHospital({...editingHospital, name: e.target.value})} />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Endereço Completo ou CEP</label>
                      <div className="flex gap-2">
                        <input required type="text" className={`flex-grow p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.address || ''} onChange={e => setEditingHospital({...editingHospital, address: e.target.value})} />
                        <button type="button" onClick={handleGeocodeHospital} disabled={isGeocoding} className="bg-blue-100 text-blue-700 px-4 rounded-xl text-[10px] font-black uppercase hover:bg-blue-200 transition-all disabled:opacity-50">
                          {isGeocoding ? '...' : 'Buscar'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Cidade</label>
                        <input 
                            required type="text" 
                            className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} 
                            value={editingHospital.city || ''} 
                            onChange={e => {
                                const city = e.target.value;
                                const detected = getRegionalByCity(city, state.cityMappings);
                                setEditingHospital({...editingHospital, city, regional: detected || editingHospital.regional});
                            }} 
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Regional Designada</label>
                        <select 
                            className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} 
                            value={editingHospital.regional || ''} 
                            onChange={e => setEditingHospital({...editingHospital, regional: e.target.value})}
                        >
                            <option value="">Selecione...</option>
                            {availableRegionals.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="pt-4">
                        <Button className="w-full rounded-xl py-4" type="submit">Atualizar Unidade</Button>
                    </div>
                </form>
             </div>
          </div>,
          document.body
      )}
    </div>
  );
};
