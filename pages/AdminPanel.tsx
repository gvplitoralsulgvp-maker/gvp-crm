
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AppState, Member, VisitRoute, UserRole, Hospital, VisitSlot, CityMapping, ColihVisit, Doctor, ColihInteractionType, AppEvent } from '../types';
import { Button } from '../components/Button';
import { atomicUpdate, loadState, atomicDelete } from '../services/storageService';
import { getCoordsFromCep, getRegionalByCity } from '../services/geoService';
import { supabase } from '../services/supabaseClient';
import { ConfirmModal } from '../components/ConfirmModal';

export const AdminPanel: React.FC<{ state: AppState, onUpdateState: (newState: AppState) => void, isHospitalMode?: boolean }> = ({ state, onUpdateState, isHospitalMode }) => {
  const [activeTab, setActiveTab] = useState<'members' | 'hospitals' | 'cities' | 'routes' | 'reports' | 'balance' | 'events'>('members');
  const [editingHospital, setEditingHospital] = useState<Partial<Hospital> | null>(null);
  const [editingRoute, setEditingRoute] = useState<Partial<VisitRoute> | null>(null);
  const [editingMember, setEditingMember] = useState<Partial<Member> | null>(null);
  const [editingEvent, setEditingEvent] = useState<Partial<AppEvent> | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  // Modal de Confirmação Genérico
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, description: string, onConfirm: () => void} | null>(null);

  // Estados para Cidades e Regionais
  const [newCityRegional, setNewCityRegional] = useState('');
  const [newCityName, setNewCityName] = useState('');
  
  const [memberFilter, setMemberFilter] = useState<'ALL' | 'GVP' | 'COLIH' | 'FACILITATOR' | 'ADMIN' | 'COORDINATOR'>('ALL');
  
  const isGlobalAdmin = state.currentUser?.role === UserRole.ADMIN;
  const isRegionalCoord = state.currentUser?.role === UserRole.COORDINATOR;
  const userRegional = state.currentUser?.regional;

  // Filtros de Segurança e Regional
  const filteredMembers = useMemo(() => {
    let result = [...state.members];
    
    // Se for Coordenador, filtra apenas membros da sua regional (ou sem regional)
    if (isRegionalCoord && userRegional) {
        result = result.filter(m => m.regional === userRegional || !m.regional);
        // Remove Admins Globais da lista do Coordenador para evitar edição acidental
        result = result.filter(m => m.role !== UserRole.ADMIN);
    }

    const isColih = (m: Member) => m.isColih === true;
    const isFacilitator = (m: Member) => m.colihClassification === 'Facilitator';
    const isAdmin = (m: Member) => m.role === UserRole.ADMIN;
    const isCoord = (m: Member) => m.role === UserRole.COORDINATOR;

    if (memberFilter === 'GVP') {
        result = result.filter(m => !isColih(m) && !isAdmin(m) && !isCoord(m));
    } else if (memberFilter === 'COLIH') {
        result = result.filter(m => isColih(m) && !isFacilitator(m) && !isAdmin(m) && !isCoord(m));
    } else if (memberFilter === 'FACILITATOR') {
        result = result.filter(m => isFacilitator(m));
    } else if (memberFilter === 'ADMIN') {
        result = result.filter(m => isAdmin(m));
    } else if (memberFilter === 'COORDINATOR') {
        result = result.filter(m => isCoord(m));
    }
    
    return result.sort((a, b) => {
      if (a.active === b.active) return a.name.localeCompare(b.name);
      return a.active ? 1 : -1;
    });
  }, [state.members, memberFilter, isRegionalCoord, userRegional]);

  const filteredHospitals = useMemo(() => {
      if (isRegionalCoord && userRegional) {
          return state.hospitals.filter(h => h.regional === userRegional);
      }
      return state.hospitals;
  }, [state.hospitals, isRegionalCoord, userRegional]);

  const filteredRoutes = useMemo(() => {
      if (isRegionalCoord && userRegional) {
          // Mostra rota se pelo menos um hospital da rota pertencer à regional do coordenador
          return state.routes.filter(r => {
              if (!r.hospitals) return false;
              return r.hospitals.some(hName => {
                  const hospital = state.hospitals.find(h => h.name === hName);
                  return hospital && hospital.regional === userRegional;
              });
          });
      }
      return state.routes;
  }, [state.routes, state.hospitals, isRegionalCoord, userRegional]);

  const filteredCityMappings = useMemo(() => {
      if (isRegionalCoord && userRegional) {
          return state.cityMappings.filter(c => c.regional === userRegional);
      }
      return state.cityMappings;
  }, [state.cityMappings, isRegionalCoord, userRegional]);

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

  // ... (Existing geocoding and save handlers: handleGeocodeHospital, handleSaveMember, etc.) ...
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

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember?.name || !editingMember.email) return;
    
    // Coordenadores Regionais não podem alterar papel para ADMIN
    if (isRegionalCoord && editingMember.role === UserRole.ADMIN) {
        alert("Você não tem permissão para criar Administradores Globais.");
        return;
    }

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
    } catch (err: any) { 
        console.error(err);
        alert(`Erro ao salvar membro: ${err.message}`); 
    }
  };

  const getProfileType = (m: Partial<Member>) => {
    if (m.role === UserRole.ADMIN) return 'ADMIN';
    if (m.role === UserRole.COORDINATOR) return 'COORDINATOR_ROLE'; // Distinção do papel
    if (m.colihClassification === 'President') return 'PRESIDENT';
    if (m.colihClassification === 'Coordinator') return 'COORDINATOR'; // Classificação COLIH
    if (m.colihClassification === 'Secretary') return 'SECRETARY';
    if (m.colihClassification === 'Assistant') return 'ASSISTANT';
    if (m.colihClassification === 'Facilitator') return 'FACILITATOR';
    if (m.isColih) return 'COLIH';
    return 'GVP';
  };

  const handleAddCity = async () => {
      if (!newCityName || !newCityRegional) return;
      const normalizedCity = newCityName.trim();
      
      if (state.cityMappings.some(c => c.city.toLowerCase() === normalizedCity.toLowerCase())) {
          alert(`A cidade "${normalizedCity}" já está cadastrada.`);
          return;
      }

      const newMapping: CityMapping = {
          id: crypto.randomUUID(),
          city: normalizedCity,
          regional: newCityRegional
      };

      try {
          await atomicUpdate('city_mappings', newMapping);
          onUpdateState({
              ...state,
              cityMappings: [...state.cityMappings, newMapping]
          });
          setNewCityName('');
      } catch (e) {
          alert("Erro ao adicionar cidade.");
      }
  };

  const handleDeleteCity = (id: string, cityName: string) => {
      setConfirmConfig({
          isOpen: true,
          title: 'Remover Cidade',
          description: `Tem certeza que deseja remover ${cityName} do mapeamento? Isso pode afetar o preenchimento automático de regionais.`,
          onConfirm: async () => {
              try {
                  await atomicDelete('city_mappings', id);
                  onUpdateState({
                      ...state,
                      cityMappings: state.cityMappings.filter(c => c.id !== id)
                  });
              } catch (e) {
                  alert("Erro ao remover.");
              }
          }
      });
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

  const handleDeleteRoute = (id: string) => {
      setConfirmConfig({
          isOpen: true,
          title: 'Excluir Rota',
          description: 'Tem certeza que deseja excluir esta rota? Todos os históricos de visitas associados a ela poderão ficar sem referência.',
          onConfirm: async () => {
              try {
                  await atomicDelete('routes', id);
                  const updated = state.routes.filter(r => r.id !== id);
                  onUpdateState({ ...state, routes: updated });
                  setEditingRoute(null);
              } catch (err) {
                  alert("Erro ao excluir rota.");
              }
          }
      });
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingEvent?.title || !editingEvent.date) return;

      const newEvent: AppEvent = {
          id: editingEvent.id || crypto.randomUUID(),
          title: editingEvent.title,
          description: editingEvent.description || '',
          date: editingEvent.date,
          time: editingEvent.time || '',
          location: editingEvent.location || '',
          targetGroup: editingEvent.targetGroup || 'ALL',
          createdAt: new Date().toISOString()
      };

      try {
          await atomicUpdate('events', newEvent);
          const updatedEvents = editingEvent.id
              ? state.events.map(ev => ev.id === editingEvent.id ? newEvent : ev)
              : [...state.events, newEvent];
          onUpdateState({ ...state, events: updatedEvents });
          setEditingEvent(null);
      } catch (err) {
          alert("Erro ao salvar evento.");
      }
  };

  const handleDeleteEvent = (id: string) => {
      setConfirmConfig({
          isOpen: true,
          title: 'Excluir Evento',
          description: 'Tem certeza que deseja cancelar este evento? Ele desaparecerá da agenda de todos os membros.',
          onConfirm: async () => {
              try {
                  await atomicDelete('events', id);
                  onUpdateState({ ...state, events: state.events.filter(ev => ev.id !== id) });
              } catch (err) {
                  alert("Erro ao excluir evento.");
              }
          }
      });
  };

  const handleMemberCityChange = (city: string) => {
      const regional = getRegionalByCity(city, state.cityMappings);
      setEditingMember(prev => ({ ...prev, city, regional: regional || prev?.regional }));
  };

  // Balanço Stats
  const { gvpStats, colihStats } = useMemo(() => {
    // Filtro inicial para os stats respeitando a regional do coordenador
    let relevantMembers = state.members;
    if (isRegionalCoord && userRegional) {
        relevantMembers = state.members.filter(m => m.regional === userRegional);
    }

    const stats = relevantMembers.map(m => {
      const gvpVisits = state.visits.filter(v => (v.memberIds || []).includes(m.id) && v.status === 'FINISHED').length;
      const colihVisits = state.colihVisits.filter(v => (v.memberIds || []).includes(m.id)).length;
      return { ...m, visitCount: gvpVisits + colihVisits };
    });

    const colihMembers = stats.filter(m => m.isColih && m.colihClassification !== 'Facilitator').sort((a, b) => b.visitCount - a.visitCount);
    const gvpMembers = stats.filter(m => !m.isColih && m.role !== UserRole.ADMIN).sort((a, b) => b.visitCount - a.visitCount);

    return { gvpStats: gvpMembers, colihStats: colihMembers };
  }, [state.members, state.visits, state.colihVisits, isRegionalCoord, userRegional]);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
         <div>
            <h2 className={`text-xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Gestão Enterprise</h2>
            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Supervisão técnica. {isRegionalCoord && userRegional && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase ml-2">{userRegional}</span>}
            </p>
         </div>
         <div className="flex gap-2">
            <button onClick={handleRefreshData} disabled={isSyncing} className={`p-2.5 rounded-xl border-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isHospitalMode ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
              <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {isSyncing ? 'Sync...' : 'Sincronizar'}
            </button>
            <Button size="sm" className="rounded-xl px-6" onClick={() => {
              if (activeTab === 'members') setEditingMember({ active: true, role: UserRole.MEMBER, isColih: false, regional: userRegional || '' });
              if (activeTab === 'hospitals') setEditingHospital({ city: 'Santos', regional: userRegional || '' });
              if (activeTab === 'routes') setEditingRoute({ active: true, hospitals: [] });
              if (activeTab === 'events') setEditingEvent({ targetGroup: 'ALL', date: new Date().toISOString().split('T')[0] });
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
          { id: 'events', label: 'Eventos' },
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

      {/* --- ABA MEMBROS --- */}
      {activeTab === 'members' && (
        <div className="space-y-4">
            <div className={`p-1 rounded-xl inline-flex overflow-x-auto ${isHospitalMode ? 'bg-black/30' : 'bg-gray-100'}`}>
                {[{ id: 'ALL', label: 'Todos' }, { id: 'GVP', label: 'GVP' }, { id: 'COLIH', label: 'Colih' }, { id: 'FACILITATOR', label: 'Facilitadores' }, { id: 'COORDINATOR', label: 'Coordenadores' }, { id: 'ADMIN', label: 'Admins' }].map(filter => (
                    <button key={filter.id} onClick={() => setMemberFilter(filter.id as any)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${memberFilter === filter.id ? (isHospitalMode ? 'bg-gray-700 text-white shadow' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-500 hover:text-gray-400'}`}>{filter.label}</button>
                ))}
            </div>
            <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border overflow-hidden`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200/10">
                        <thead className={`${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'} text-[10px] font-black text-gray-400 uppercase tracking-widest`}>
                            <tr><th className="px-6 py-4 text-left">Membro</th><th className="px-6 py-4 text-left">Função</th><th className="px-6 py-4 text-left">Regional</th><th className="px-6 py-4 text-left">Status</th><th className="px-6 py-4 text-right">Ação</th></tr>
                        </thead>
                        <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-100'} text-sm`}>
                            {filteredMembers.map(m => (
                                <tr key={m.id} className={`${isHospitalMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                                    <td className="px-6 py-4"><p className="font-bold">{m.name}</p><p className="text-[10px] text-gray-500">{m.email}</p></td>
                                    <td className="px-6 py-4">
                                        {m.role === UserRole.ADMIN ? (<span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-700">ADMIN GLOBAL</span>) : 
                                         m.role === UserRole.COORDINATOR ? (<span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-orange-100 text-orange-700">COORDENADOR</span>) :
                                         m.colihClassification ? (<span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-teal-100 text-teal-700">{m.colihClassification}</span>) :
                                         m.isColih ? (<span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-teal-100 text-teal-700">COLIH</span>) : 
                                         (<span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-700">GVP</span>)}
                                    </td>
                                    <td className="px-6 py-4"><span className="text-[10px] font-bold uppercase text-gray-500">{m.regional || '-'}</span><p className="text-[9px] text-gray-400">{m.city}</p></td>
                                    <td className="px-6 py-4"><span className={`w-2 h-2 inline-block rounded-full mr-2 ${m.active ? 'bg-green-500' : 'bg-red-500'}`}></span><span className="font-bold text-[11px]">{m.active ? 'ATIVO' : 'PENDENTE'}</span></td>
                                    <td className="px-6 py-4 text-right"><button onClick={() => setEditingMember(m)} className="text-blue-500 font-bold text-xs hover:underline">EDITAR</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* --- ABA UNIDADES (HOSPITAIS) --- */}
      {activeTab === 'hospitals' && (
        <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border overflow-hidden`}>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200/10">
                    <thead className={`${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'} text-[10px] font-black text-gray-400 uppercase tracking-widest`}>
                        <tr><th className="px-6 py-4 text-left">Instituição</th><th className="px-6 py-4 text-left">Cidade</th><th className="px-6 py-4 text-left">Regional</th><th className="px-6 py-4 text-right">Ação</th></tr>
                    </thead>
                    <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-100'} text-sm`}>
                        {filteredHospitals.sort((a,b) => a.name.localeCompare(b.name)).map(h => (
                            <tr key={h.id} className={`${isHospitalMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                                <td className="px-6 py-4"><p className="font-bold">{h.name}</p><p className="text-[10px] text-gray-500 truncate">{h.address}</p></td>
                                <td className="px-6 py-4">{h.city}</td>
                                <td className="px-6 py-4"><span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[9px] font-bold border uppercase">{h.regional || '-'}</span></td>
                                <td className="px-6 py-4 text-right"><button onClick={() => setEditingHospital(h)} className="text-blue-500 font-bold text-xs hover:underline">EDITAR</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* --- ABA CIDADES --- */}
      {activeTab === 'cities' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isGlobalAdmin && (
                <div className={`p-6 rounded-2xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                    <h3 className={`text-sm font-bold uppercase mb-4 ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Adicionar Mapeamento</h3>
                    <div className="space-y-3">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Cidade</label><input className={`w-full p-2 border rounded-lg outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={newCityName} onChange={e => setNewCityName(e.target.value)} placeholder="Ex: Itanhaém" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Regional</label><input className={`w-full p-2 border rounded-lg outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={newCityRegional} onChange={e => setNewCityRegional(e.target.value)} placeholder="Ex: Litoral Sul" list="regionals-list" />
                            <datalist id="regionals-list">{availableRegionals.map(r => <option key={r} value={r} />)}</datalist>
                        </div>
                        <Button onClick={handleAddCity} className="w-full mt-2">Adicionar</Button>
                    </div>
                </div>
            )}
            <div className={`${isGlobalAdmin ? 'md:col-span-2' : 'col-span-3'} space-y-4`}>
                {availableRegionals.filter(r => !userRegional || r === userRegional).map(regional => (
                    <div key={regional} className={`p-4 rounded-2xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                        <h4 className="text-xs font-black uppercase text-blue-500 mb-3 tracking-widest">{regional}</h4>
                        <div className="flex flex-wrap gap-2">
                            {filteredCityMappings.filter(c => c.regional === regional).map(city => (
                                <div key={city.id} className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 text-xs font-bold ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                    {city.city}
                                    {isGlobalAdmin && <button onClick={() => handleDeleteCity(city.id, city.city)} className="text-red-400 hover:text-red-600">&times;</button>}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* --- ABA EVENTOS --- */}
      {activeTab === 'events' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.events.sort((a,b) => b.date.localeCompare(a.date)).map(event => (
                  <div key={event.id} className={`p-5 rounded-2xl border flex flex-col justify-between ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                      <div>
                          <div className="flex justify-between items-start mb-2">
                              <h3 className={`font-bold text-lg ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{event.title}</h3>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  event.targetGroup === 'GVP' ? 'bg-blue-100 text-blue-700' : 
                                  event.targetGroup === 'COLIH' ? 'bg-teal-100 text-teal-700' : 
                                  'bg-gray-100 text-gray-700'
                              }`}>{event.targetGroup}</span>
                          </div>
                          <p className={`text-xs font-medium mb-1 ${isHospitalMode ? 'text-gray-300' : 'text-gray-600'}`}>{new Date(event.date + 'T12:00:00').toLocaleDateString()} {event.time && `• ${event.time}`}</p>
                          <p className={`text-xs italic mb-2 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>{event.location}</p>
                          <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{event.description}</p>
                      </div>
                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200/10">
                          <button onClick={() => setEditingEvent(event)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border uppercase ${isHospitalMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>Editar</button>
                          <button onClick={() => handleDeleteEvent(event.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                  </div>
              ))}
              {state.events.length === 0 && <p className="text-gray-500 col-span-full text-center py-10">Nenhum evento programado.</p>}
          </div>
      )}

      {/* --- ABA LOGÍSTICA (ROTAS) --- */}
      {activeTab === 'routes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRoutes.map(route => (
                <div key={route.id} className={`p-5 rounded-2xl border flex flex-col justify-between ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                    <div>
                        <h3 className={`font-bold text-lg ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{route.name}</h3>
                        <div className="mt-3 space-y-1">
                            {route.hospitals && route.hospitals.length > 0 ? (
                                route.hospitals.map(h => (
                                    <div key={h} className="text-xs font-medium text-gray-500 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>{h}
                                    </div>
                                ))
                            ) : (<p className="text-xs text-red-400 italic">Sem hospitais vinculados</p>)}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200/10">
                        <button onClick={() => setEditingRoute(route)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border uppercase ${isHospitalMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>Editar</button>
                        <button onClick={() => handleDeleteRoute(route.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* --- ABA RELATÓRIOS (LOGS) --- */}
      {activeTab === 'reports' && (
        <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border overflow-hidden`}>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200/10">
                    <thead className={`${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'} text-[10px] font-black text-gray-400 uppercase tracking-widest`}>
                        <tr><th className="px-6 py-4 text-left">Data</th><th className="px-6 py-4 text-left">Usuário</th><th className="px-6 py-4 text-left">Ação</th><th className="px-6 py-4 text-left">Detalhes</th></tr>
                    </thead>
                    <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-100'} text-xs`}>
                        {state.logs.slice(0, 50).map(log => (
                            <tr key={log.id} className={isHospitalMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}>
                                <td className="px-6 py-4 font-mono text-[10px]">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4 font-bold">{log.userName}</td>
                                <td className="px-6 py-4"><span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold border">{log.action}</span></td>
                                <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{log.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* --- ABA BALANÇO (STATS) --- */}
      {activeTab === 'balance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className={`p-6 rounded-2xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                <h3 className="text-lg font-black text-blue-600 mb-4">Ranking GVP (Visitas)</h3>
                <div className="space-y-3">
                    {gvpStats.slice(0, 10).map((m, idx) => (
                        <div key={m.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-gray-400 font-bold w-4">{idx+1}</span>
                                <span className={`text-sm font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.name}</span>
                            </div>
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{m.visitCount}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className={`p-6 rounded-2xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                <h3 className="text-lg font-black text-teal-600 mb-4">Ranking COLIH (Atividade)</h3>
                <div className="space-y-3">
                    {colihStats.slice(0, 10).map((m, idx) => (
                        <div key={m.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-gray-400 font-bold w-4">{idx+1}</span>
                                <span className={`text-sm font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.name}</span>
                            </div>
                            <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-xs font-bold">{m.visitCount}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmConfig && (
          <ConfirmModal 
              isOpen={confirmConfig.isOpen}
              onClose={() => setConfirmConfig(null)}
              onConfirm={confirmConfig.onConfirm}
              title={confirmConfig.title}
              description={confirmConfig.description}
              isDestructive={true}
              isHospitalMode={isHospitalMode}
          />
      )}

      {/* MODAL: EDITAR EVENTO */}
      {editingEvent && createPortal(
          <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                  <div className="bg-blue-600 px-6 py-5 flex justify-between items-center shrink-0">
                      <h3 className="text-white font-bold text-lg">{editingEvent.id ? 'Editar Evento' : 'Novo Evento'}</h3>
                      <button onClick={() => setEditingEvent(null)} className="text-white hover:text-blue-200 text-2xl leading-none">&times;</button>
                  </div>
                  <form onSubmit={handleSaveEvent} className="p-6 space-y-4 flex-grow overflow-y-auto custom-scrollbar">
                      <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Título</label><input required className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingEvent.title || ''} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} placeholder="Ex: Reunião GVP" /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Data</label><input required type="date" className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingEvent.date || ''} onChange={e => setEditingEvent({...editingEvent, date: e.target.value})} /></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Horário</label><input type="time" className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingEvent.time || ''} onChange={e => setEditingEvent({...editingEvent, time: e.target.value})} /></div>
                      </div>
                      <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Local</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingEvent.location || ''} onChange={e => setEditingEvent({...editingEvent, location: e.target.value})} placeholder="Ex: Salão do Reino Central" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Público Alvo</label><select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingEvent.targetGroup || 'ALL'} onChange={e => setEditingEvent({...editingEvent, targetGroup: e.target.value as any})}><option value="ALL">Todos os Membros</option><option value="GVP">Apenas GVP</option><option value="COLIH">Apenas COLIH</option></select></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Descrição</label><textarea rows={3} className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingEvent.description || ''} onChange={e => setEditingEvent({...editingEvent, description: e.target.value})} placeholder="Detalhes do evento..." /></div>
                      <div className="pt-4 flex justify-end gap-3"><Button variant="secondary" onClick={() => setEditingEvent(null)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
                  </form>
              </div>
          </div>, document.body
      )}

      {/* MODAL: EDITAR MEMBRO */}
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
                        <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Cidade</label><input required type="text" className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.city || ''} onChange={e => handleMemberCityChange(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Regional</label><select className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.regional || ''} onChange={e => setEditingMember({...editingMember, regional: e.target.value})}><option value="">Automática</option>{availableRegionals.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Função / Cargo</label><select className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={getProfileType(editingMember)} onChange={(e) => { const type = e.target.value; let updates: Partial<Member> = {}; const baseColih = { role: UserRole.MEMBER, isColih: true }; switch (type) { case 'ADMIN': updates = { role: UserRole.ADMIN, isColih: true, colihClassification: null }; break; case 'COORDINATOR_ROLE': updates = { role: UserRole.COORDINATOR, isColih: false, colihClassification: null }; break; case 'PRESIDENT': updates = { ...baseColih, colihClassification: 'President' }; break; case 'COORDINATOR': updates = { ...baseColih, colihClassification: 'Coordinator' }; break; case 'SECRETARY': updates = { ...baseColih, colihClassification: 'Secretary' }; break; case 'ASSISTANT': updates = { ...baseColih, colihClassification: 'Assistant' }; break; case 'FACILITATOR': updates = { ...baseColih, colihClassification: 'Facilitator' }; break; case 'COLIH': updates = { ...baseColih, colihClassification: 'Member' }; break; default: updates = { role: UserRole.MEMBER, isColih: false, colihClassification: null }; break; } setEditingMember(prev => ({ ...prev, ...updates })); }} > <option value="GVP">Voluntário GVP</option> <option value="COLIH">Membro COLIH</option> <option value="FACILITATOR">Facilitador</option> <option value="ASSISTANT">Ajudante/Assistente</option> <option value="SECRETARY">Secretário</option> <option value="COORDINATOR">Coordenador COLIH</option> <option value="PRESIDENT">Presidente</option> {isGlobalAdmin && <option value="COORDINATOR_ROLE">Coordenador Regional</option>} {isGlobalAdmin && <option value="ADMIN">Administrador</option>} </select></div>
                      <div className="col-span-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Status</label><select className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.active ? 'true' : 'false'} onChange={e => setEditingMember({...editingMember, active: e.target.value === 'true'})}> <option value="true">Ativo</option> <option value="false">Bloqueado</option> </select></div>
                    </div>
                    <div className="pt-4"><Button className="w-full rounded-xl py-4" type="submit">Salvar Alterações</Button></div>
                </form>
             </div>
          </div>, document.body
      )}

      {/* MODAL: EDITAR HOSPITAL */}
      {editingHospital && createPortal(
          <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[85vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-blue-600 p-6 text-white font-black flex justify-between items-center shrink-0"><span className="text-lg">Configurar Unidade</span><button onClick={() => setEditingHospital(null)} className="text-3xl leading-none">&times;</button></div>
                <form onSubmit={handleSaveHospital} className="p-8 space-y-4 flex-grow overflow-y-auto custom-scrollbar">
                    <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome da Instituição</label><input required type="text" className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.name || ''} onChange={e => setEditingHospital({...editingHospital, name: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Endereço Completo</label><div className="flex gap-2"><input required type="text" className={`flex-grow p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.address || ''} onChange={e => setEditingHospital({...editingHospital, address: e.target.value})} /><button type="button" onClick={handleGeocodeHospital} disabled={isGeocoding} className="bg-blue-100 text-blue-700 px-4 rounded-xl text-[10px] font-black uppercase hover:bg-blue-200 transition-all disabled:opacity-50">{isGeocoding ? '...' : 'Buscar'}</button></div></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Cidade</label><input required type="text" className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.city || ''} onChange={e => { const city = e.target.value; const detected = getRegionalByCity(city, state.cityMappings); setEditingHospital({...editingHospital, city, regional: detected || editingHospital.regional}); }} /></div>
                      <div className="col-span-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Regional</label><select className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingHospital.regional || ''} onChange={e => setEditingHospital({...editingHospital, regional: e.target.value})}><option value="">Selecione...</option>{availableRegionals.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    </div>
                    <div className="pt-4"><Button className="w-full rounded-xl py-4" type="submit">Atualizar Unidade</Button></div>
                </form>
             </div>
          </div>, document.body
      )}

      {/* MODAL: EDITAR ROTA */}
      {editingRoute && createPortal(
          <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[85vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-blue-600 p-6 text-white font-black flex justify-between items-center shrink-0"><span className="text-lg">Configurar Rota</span><button onClick={() => setEditingRoute(null)} className="text-3xl leading-none">&times;</button></div>
                <form onSubmit={handleSaveRoute} className="p-8 space-y-4 flex-grow overflow-y-auto custom-scrollbar">
                    <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome da Rota (Ex: Rota 1)</label><input required type="text" className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingRoute.name || ''} onChange={e => setEditingRoute({...editingRoute, name: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Hospitais na Rota</label><div className={`border-2 rounded-xl p-4 max-h-40 overflow-y-auto custom-scrollbar ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>{filteredHospitals.map(h => (<label key={h.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-white'}`}><input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={editingRoute.hospitals?.includes(h.name)} onChange={e => { const current = editingRoute.hospitals || []; if (e.target.checked) setEditingRoute({...editingRoute, hospitals: [...current, h.name]}); else setEditingRoute({...editingRoute, hospitals: current.filter(name => name !== h.name)}); }} /><span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{h.name}</span></label>))}</div></div>
                    <div className="pt-4"><Button className="w-full rounded-xl py-4" type="submit">Salvar Rota</Button></div>
                </form>
             </div>
          </div>, document.body
      )}
    </div>
  );
};
