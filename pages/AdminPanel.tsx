
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AppState, Member, VisitRoute, UserRole, Hospital, VisitSlot, CityMapping, ColihVisit, Doctor, ColihInteractionType, AppEvent, ALL_REGIONALS } from '../types';
import { Button } from '../components/Button';
import { atomicUpdate, loadState, atomicDelete } from '../services/storageService';
import { getCoordsFromCep, getRegionalByCity } from '../services/geoService';
import { supabase } from '../services/supabaseClient';
import { ConfirmModal } from '../components/ConfirmModal';

export const AdminPanel: React.FC<{ state: AppState, onUpdateState: (newState: AppState) => void, isHospitalMode?: boolean }> = ({ state, onUpdateState, isHospitalMode }) => {
  const [activeTab, setActiveTab] = useState<'members' | 'hospitals' | 'cities' | 'routes' | 'reports' | 'balance' | 'events' | 'training'>('members');
  const [editingHospital, setEditingHospital] = useState<Partial<Hospital> | null>(null);
  const [editingRoute, setEditingRoute] = useState<Partial<VisitRoute> | null>(null);
  const [editingMember, setEditingMember] = useState<Partial<Member> | null>(null);
  const [editingEvent, setEditingEvent] = useState<Partial<AppEvent> | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  // States for Training Tab
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<string>('');
  
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

  // Combina as regionais fixas com as dinâmicas para os dropdowns
  const availableRegionals = useMemo(() => {
      const dynamicRegs = state.cityMappings.map(c => c.regional);
      return Array.from(new Set([...ALL_REGIONALS, ...dynamicRegs])).sort();
  }, [state.cityMappings]);

  // --- LOGICA TREINADORES & PRESENÇA ---
  
  const handleToggleTrainer = async (member: Member) => {
      // FIX CRÍTICO: Remover campos calculados da interface (trainingMatrix) antes de salvar no banco
      // Isso evita o erro PGRST204 (coluna não encontrada)
      const { visitsCount, casesCount, attendanceRate, needsHelpScore, ...cleanMember } = member as any;
      
      const updated = { ...cleanMember, isTrainer: !cleanMember.isTrainer };
      
      // Otimistic UI Update
      onUpdateState({ ...state, members: state.members.map(m => m.id === cleanMember.id ? { ...m, isTrainer: updated.isTrainer } : m) });

      try {
          await atomicUpdate('members', updated);
      } catch (err: any) { 
          console.error("Erro ao atualizar treinador:", err);
          alert(`Erro ao atualizar status de treinador: ${err.message || 'Verifique o console'}`); 
          // Revert on error
          onUpdateState({ ...state, members: state.members.map(m => m.id === cleanMember.id ? { ...m, isTrainer: !updated.isTrainer } : m) });
      }
  };

  const handleUpdateAttendance = async (eventId: string, memberId: string, isPresent: boolean) => {
      const event = state.events.find(e => e.id === eventId);
      if (!event) return;
      
      let newAttendees = event.attendees || [];
      if (isPresent) {
          if (!newAttendees.includes(memberId)) newAttendees = [...newAttendees, memberId];
      } else {
          newAttendees = newAttendees.filter(id => id !== memberId);
      }
      
      const updatedEvent = { ...event, attendees: newAttendees };
      
      // Otimistic UI Update
      onUpdateState({ ...state, events: state.events.map(e => e.id === eventId ? updatedEvent : e) });
      
      // Background Update
      try {
          await atomicUpdate('events', updatedEvent);
      } catch (err: any) {
          console.error("Erro ao atualizar presença:", err);
          alert(`Erro ao salvar presença: ${err.message}`);
          onUpdateState({ ...state, events: state.events.map(e => e.id === eventId ? event : e) });
      }
  };

  const trainingMatrix = useMemo(() => {
      // 1. Filtrar Membros COLIH Ativos (EXCLUINDO Facilitadores e GVP)
      // REGRA DE NEGÓCIO: Apenas membros COLIH plenos devem aparecer aqui.
      let targets = state.members.filter(m => 
          m.active && 
          m.isColih === true && 
          m.colihClassification !== 'Facilitator'
      );
      
      if (isRegionalCoord && userRegional) {
          targets = targets.filter(m => m.regional === userRegional);
      }

      // 2. Calcular Métricas
      return targets.map(m => {
          // A. Visitas Médicas (Últimos 6 meses)
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          const visitsCount = state.colihVisits.filter(v => 
              v.memberIds.includes(m.id) && 
              v.status === 'COMPLETED' && 
              new Date(v.date) >= sixMonthsAgo
          ).length;

          // B. Casos Atendidos (Pacientes designados ativos ou recentes)
          const casesCount = state.patients.filter(p => 
              p.assignedColihIds?.includes(m.id) && 
              (p.active || (p.estimatedDischargeDate && new Date(p.estimatedDischargeDate) >= sixMonthsAgo))
          ).length;

          // C. Presença em Reuniões
          // Considera apenas eventos "COLIH" ou "ALL" passados
          const pastEvents = state.events.filter(e => 
              (e.targetGroup === 'COLIH' || e.targetGroup === 'ALL') &&
              new Date(e.date) < new Date()
          );
          const attendedCount = pastEvents.filter(e => e.attendees?.includes(m.id)).length;
          const attendanceRate = pastEvents.length > 0 ? Math.round((attendedCount / pastEvents.length) * 100) : 0;

          // Score Simples (0-3) para identificar quem precisa de ajuda
          // Critérios arbitrários: < 2 visitas, < 1 caso, < 50% presença
          let needsHelpScore = 0;
          if (visitsCount < 2) needsHelpScore++;
          if (casesCount < 1) needsHelpScore++;
          if (attendanceRate < 50) needsHelpScore++;

          return { ...m, visitsCount, casesCount, attendanceRate, needsHelpScore };
      }).sort((a,b) => b.needsHelpScore - a.needsHelpScore); // Quem precisa de mais ajuda no topo
  }, [state.members, state.colihVisits, state.patients, state.events, isRegionalCoord, userRegional]);

  // Lista ordenada alfabeticamente para seleção de treinadores
  const sortedColihMembers = useMemo(() => {
      return trainingMatrix.sort((a,b) => a.name.localeCompare(b.name));
  }, [trainingMatrix]);


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

  // ... (Rest of component functions remain the same)
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
      colihClassification: editingMember.isColih ? (editingMember.colihClassification || 'Member') : null,
      regional: editingMember.regional,
      isTrainer: editingMember.isTrainer || false
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
          createdAt: new Date().toISOString(),
          attendees: editingEvent.attendees || []
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
          { id: 'training', label: 'Treinamento' },
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
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <p className="font-bold">{m.name}</p>
                                                <p className="text-[10px] text-gray-500">{m.email}</p>
                                            </div>
                                            {m.isTrainer && <span className="bg-orange-100 text-orange-700 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-orange-200">Treinador</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start gap-1">
                                            {m.role === UserRole.ADMIN ? (<span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-700">ADMIN GLOBAL</span>) : 
                                             m.role === UserRole.COORDINATOR ? (<span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-orange-100 text-orange-700">COORDENADOR REGIONAL</span>) :
                                             (<span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-700">GVP</span>)}
                                            
                                            {m.isColih && (
                                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-teal-100 text-teal-700">
                                                    {m.colihClassification === 'President' ? 'PRESIDENTE (COLIH)' :
                                                     m.colihClassification === 'Coordinator' ? 'COORDENADOR (COLIH)' :
                                                     m.colihClassification === 'Secretary' ? 'SECRETÁRIO' :
                                                     m.colihClassification === 'Assistant' ? 'ASSISTENTE' :
                                                     m.colihClassification === 'Facilitator' ? 'FACILITADOR' : 'MEMBRO COLIH'}
                                                </span>
                                            )}
                                        </div>
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

      {/* --- ABA TREINAMENTO (NOVA) --- */}
      {activeTab === 'training' && (
          <div className="space-y-8">
              {/* 1. SEÇÃO DE GESTÃO DE TREINADORES */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`p-6 rounded-2xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                      <h3 className={`text-sm font-black uppercase mb-4 ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Designar Treinadores</h3>
                      <p className="text-xs text-gray-500 mb-4">Selecione membros experientes (apenas COLIH plenos) para atuar no programa.</p>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                          {sortedColihMembers.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">Nenhum membro COLIH ativo elegível encontrado.</p>
                          ) : (
                              sortedColihMembers.map(m => (
                                  <label key={m.id} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                      <div className="flex items-center gap-3">
                                          <input 
                                              type="checkbox" 
                                              checked={m.isTrainer || false} 
                                              onChange={() => handleToggleTrainer(m)}
                                              className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                                          />
                                          <span className={`text-sm font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.name}</span>
                                      </div>
                                      {m.isTrainer && <span className="text-[9px] font-black uppercase text-orange-500">Treinador</span>}
                                  </label>
                              ))
                          )}
                      </div>
                  </div>

                  {/* 2. SEÇÃO DE LISTA DE PRESENÇA */}
                  <div className={`col-span-2 p-6 rounded-2xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                      <h3 className={`text-sm font-black uppercase mb-4 ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Registro de Presença em Reuniões</h3>
                      <div className="mb-4">
                          <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Selecione o Evento</label>
                          <select 
                              className={`w-full p-3 border rounded-xl text-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`}
                              value={selectedEventForAttendance}
                              onChange={e => setSelectedEventForAttendance(e.target.value)}
                          >
                              <option value="">Selecione um evento para registrar presença...</option>
                              {state.events
                                  .filter(e => e.targetGroup === 'COLIH' || e.targetGroup === 'ALL')
                                  .sort((a,b) => b.date.localeCompare(a.date))
                                  .map(e => (
                                      <option key={e.id} value={e.id}>{new Date(e.date + 'T12:00:00').toLocaleDateString()} - {e.title}</option>
                                  ))}
                          </select>
                      </div>

                      {selectedEventForAttendance ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto custom-scrollbar">
                              {sortedColihMembers.map(m => {
                                  const evt = state.events.find(e => e.id === selectedEventForAttendance);
                                  const isPresent = evt?.attendees?.includes(m.id) || false;
                                  return (
                                      <label key={m.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${isPresent ? 'bg-green-500/10 border-green-500/30' : 'border-transparent hover:bg-gray-100/10'}`}>
                                          <input 
                                              type="checkbox" 
                                              checked={isPresent} 
                                              onChange={(e) => handleUpdateAttendance(selectedEventForAttendance, m.id, e.target.checked)}
                                              className="w-4 h-4 text-green-600 rounded"
                                          />
                                          <span className={`text-xs font-medium truncate ${isPresent ? 'text-green-600 font-bold' : (isHospitalMode ? 'text-gray-400' : 'text-gray-600')}`}>
                                              {m.name.split(' ')[0]} {m.name.split(' ').pop()?.[0]}.
                                          </span>
                                      </label>
                                  );
                              })}
                          </div>
                      ) : (
                          <p className="text-xs text-gray-400 italic">Selecione um evento acima para marcar presença.</p>
                      )}
                  </div>
              </div>

              {/* 3. MATRIZ DE DESEMPENHO */}
              <div className={`rounded-2xl border overflow-hidden ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                  <div className="p-6 border-b border-gray-800/10 flex justify-between items-center">
                      <h3 className={`text-lg font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Matriz de Acompanhamento (Exclusivo COLIH)</h3>
                      <div className="flex gap-4 text-xs font-bold uppercase text-gray-500">
                          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Requer Atenção</span>
                          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Bom Desempenho</span>
                      </div>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                      <table className="min-w-full divide-y divide-gray-200/10">
                          <thead className={`${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'} text-[10px] font-black text-gray-400 uppercase tracking-widest`}>
                              <tr>
                                  <th className="px-6 py-4 text-left">Membro COLIH</th>
                                  <th className="px-6 py-4 text-center">Visitas Médicas (6m)</th>
                                  <th className="px-6 py-4 text-center">Casos Ativos</th>
                                  <th className="px-6 py-4 text-center">Frequência Reuniões</th>
                                  <th className="px-6 py-4 text-center">Status</th>
                              </tr>
                          </thead>
                          <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-100'} text-sm`}>
                              {trainingMatrix.length === 0 ? (
                                  <tr><td colSpan={5} className="px-6 py-8 text-center text-xs opacity-50">Nenhum dado disponível.</td></tr>
                              ) : (
                                  trainingMatrix.map(m => (
                                      <tr key={m.id} className={`${isHospitalMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                                          <td className="px-6 py-4 font-bold">
                                              {m.name}
                                              {m.isTrainer && <span className="ml-2 text-[8px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200 uppercase font-black">Treinador</span>}
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                              <span className={`font-bold ${m.visitsCount < 2 ? 'text-red-500' : 'text-green-500'}`}>{m.visitsCount}</span>
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                              <span className={`font-bold ${m.casesCount < 1 ? 'text-red-500' : 'text-green-500'}`}>{m.casesCount}</span>
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                              <div className="flex flex-col items-center">
                                                  <span className={`font-bold ${m.attendanceRate < 50 ? 'text-red-500' : 'text-green-500'}`}>{m.attendanceRate}%</span>
                                                  <div className={`w-16 h-1 rounded-full mt-1 ${isHospitalMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                                      <div className={`h-full rounded-full ${m.attendanceRate < 50 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${m.attendanceRate}%` }}></div>
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                              {m.needsHelpScore >= 2 ? (
                                                  <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-[10px] font-black uppercase">Prioridade</span>
                                              ) : m.needsHelpScore === 1 ? (
                                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-[10px] font-black uppercase">Observar</span>
                                              ) : (
                                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-black uppercase">OK</span>
                                              )}
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* --- ABA HOSPITAIS (Conteúdo inalterado) --- */}
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

      {/* --- ABA LOGÍSTICA (ROTAS) --- */}
      {activeTab === 'routes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRoutes.map(route => (
                <div key={route.id} className={`p-5 rounded-2xl border flex flex-col justify-between ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                    <div>
                        <h4 className={`font-bold text-lg ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{route.name}</h4>
                        <div className="mt-2 space-y-1">
                            {route.hospitals?.map(h => (
                                <div key={h} className="text-xs text-gray-500 font-medium flex items-center gap-2">
                                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div> {h}
                                </div>
                            ))}
                            {(!route.hospitals || route.hospitals.length === 0) && <p className="text-xs text-gray-400 italic">Nenhum hospital vinculado.</p>}
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-800/10 flex justify-between items-center">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${route.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {route.active ? 'ATIVA' : 'INATIVA'}
                        </span>
                        <div className="flex gap-2">
                            <button onClick={() => setEditingRoute(route)} className="text-blue-500 font-bold text-xs uppercase hover:underline">Editar</button>
                            <button onClick={() => handleDeleteRoute(route.id)} className="text-red-500 font-bold text-xs uppercase hover:underline">Excluir</button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* --- ABA EVENTOS --- */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {state.events.sort((a,b) => b.date.localeCompare(a.date)).map(event => (
                <div key={event.id} className={`p-5 rounded-2xl border flex justify-between ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${event.targetGroup === 'COLIH' ? 'bg-teal-100 text-teal-700' : event.targetGroup === 'GVP' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{event.targetGroup}</span>
                            <span className={`text-xs font-medium ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(event.date + 'T12:00:00').toLocaleDateString()}</span>
                        </div>
                        <h4 className={`font-bold text-lg ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{event.title}</h4>
                        <p className={`text-sm mt-1 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{event.location} {event.time ? `• ${event.time}` : ''}</p>
                        
                        {/* Attendance Summary */}
                        {event.attendees && event.attendees.length > 0 && (
                            <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {event.attendees.length} presentes confirmados
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col justify-between items-end">
                        <button onClick={() => setEditingEvent(event)} className="text-blue-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => handleDeleteEvent(event.id)} className="text-red-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                </div>
            ))}
            {state.events.length === 0 && <p className="col-span-full text-center py-10 text-gray-400 text-sm">Nenhum evento programado.</p>}
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
                      <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-100'} text-sm`}>
                          {state.logs.slice().sort((a,b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 50).map(log => (
                              <tr key={log.id} className={`${isHospitalMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                                  <td className="px-6 py-4 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                                  <td className="px-6 py-4 font-bold">{log.userName}</td>
                                  <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase">{log.action}</span></td>
                                  <td className="px-6 py-4 text-xs truncate max-w-xs" title={log.details}>{log.details}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- ABA BALANÇO --- */}
      {activeTab === 'balance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className={`p-6 rounded-2xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                  <h3 className={`text-sm font-black uppercase mb-4 tracking-widest ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}>Top Visitantes GVP</h3>
                  <div className="space-y-3">
                      {gvpStats.slice(0, 10).map((m, idx) => (
                          <div key={m.id} className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <span className="font-mono text-xs text-gray-400 w-4">{idx + 1}</span>
                                  <span className={`text-sm font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{m.name}</span>
                              </div>
                              <span className="font-black text-blue-500">{m.visitCount}</span>
                          </div>
                      ))}
                  </div>
              </div>
              <div className={`p-6 rounded-2xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                  <h3 className={`text-sm font-black uppercase mb-4 tracking-widest ${isHospitalMode ? 'text-teal-400' : 'text-teal-600'}`}>Atividade COLIH</h3>
                  <div className="space-y-3">
                      {colihStats.slice(0, 10).map((m, idx) => (
                          <div key={m.id} className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <span className="font-mono text-xs text-gray-400 w-4">{idx + 1}</span>
                                  <span className={`text-sm font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{m.name}</span>
                              </div>
                              <span className="font-black text-teal-500">{m.visitCount}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
      
      {/* MODAL: EDITAR EVENTO */}
      {editingEvent && createPortal(
          <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-purple-600 px-6 py-5 flex justify-between items-center shrink-0"><h3 className="text-white font-bold text-lg">{editingEvent.id ? 'Editar Evento' : 'Novo Evento'}</h3><button onClick={() => setEditingEvent(null)} className="text-white hover:text-purple-200 text-2xl leading-none">&times;</button></div>
                <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Título</label><input required className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingEvent.title || ''} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Data</label><input type="date" required className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingEvent.date || ''} onChange={e => setEditingEvent({...editingEvent, date: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Horário</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingEvent.time || ''} onChange={e => setEditingEvent({...editingEvent, time: e.target.value})} placeholder="Ex: 19:30" /></div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Local</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingEvent.location || ''} onChange={e => setEditingEvent({...editingEvent, location: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Público Alvo</label><select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingEvent.targetGroup || 'ALL'} onChange={e => setEditingEvent({...editingEvent, targetGroup: e.target.value as any})}><option value="ALL">Geral (Todos)</option><option value="GVP">Apenas GVP</option><option value="COLIH">Apenas COLIH</option></select></div>
                    <div className="pt-2"><Button className="w-full bg-purple-600 hover:bg-purple-700" type="submit">Salvar Evento</Button></div>
                </form>
             </div>
          </div>, document.body
      )}

      {/* MODAL: EDITAR MEMBRO */}
      {editingMember && createPortal(
        <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[85vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
              <div className="bg-blue-600 p-6 text-white font-black flex justify-between items-center shrink-0"><span className="text-lg">{editingMember.id ? 'Editar Membro' : 'Novo Membro'}</span><button onClick={() => setEditingMember(null)} className="text-3xl leading-none">&times;</button></div>
              <form onSubmit={handleSaveMember} className="p-8 space-y-4 flex-grow overflow-y-auto custom-scrollbar">
                  <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Completo</label><input required type="text" className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.name || ''} onChange={e => setEditingMember({...editingMember, name: e.target.value})} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">E-mail Corporativo</label><input required type="email" className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.email || ''} onChange={e => setEditingMember({...editingMember, email: e.target.value})} /></div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Cidade</label><input type="text" className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.city || ''} onChange={e => handleMemberCityChange(e.target.value)} /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Regional</label><select className={`w-full p-3 border-2 rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.regional || ''} onChange={e => setEditingMember({...editingMember, regional: e.target.value})}><option value="">Selecione...</option>{availableRegionals.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                  </div>

                  <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nível de Acesso</label><select className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value as any})}><option value="MEMBER">Voluntário (GVP)</option><option value="COORDINATOR">Coordenador Regional</option><option value="ADMIN">Administrador Global</option></select></div>
                  
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={editingMember.active || false} onChange={e => setEditingMember({...editingMember, active: e.target.checked})} /><span className="text-sm font-bold text-gray-700">Cadastro Ativo</span></label>
                      
                      <div className="pt-2 border-t border-gray-200">
                          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" className="w-5 h-5 text-teal-600 rounded" checked={editingMember.isColih || false} onChange={e => setEditingMember({...editingMember, isColih: e.target.checked})} /><span className="text-sm font-bold text-gray-700">Membro da COLIH</span></label>
                          {editingMember.isColih && (
                              <div className="pl-8 pt-2 animate-fade-in space-y-2">
                                  <div>
                                      <label className="text-[10px] font-bold text-gray-500 uppercase">Classificação COLIH</label>
                                      <select className="w-full p-2 border rounded-lg text-sm mt-1" value={editingMember.colihClassification || 'Member'} onChange={e => setEditingMember({...editingMember, colihClassification: e.target.value as any})}><option value="Member">Membro Regular</option><option value="Facilitator">Facilitador (Ajudante)</option><option value="Assistant">Assistente</option><option value="Secretary">Secretário</option><option value="Coordinator">Coordenador</option><option value="President">Presidente</option></select>
                                  </div>
                                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                                      <input type="checkbox" className="w-4 h-4 text-orange-500 rounded" checked={editingMember.isTrainer || false} onChange={e => setEditingMember({...editingMember, isTrainer: e.target.checked})} />
                                      <span className="text-xs font-bold text-orange-700 uppercase">Designar como Treinador</span>
                                  </label>
                              </div>
                          )}
                      </div>
                  </div>
                  <div className="pt-4"><Button className="w-full rounded-xl py-4" type="submit">Salvar Dados</Button></div>
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
                    <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome da Rota</label><input required type="text" className={`w-full p-3 border-2 rounded-xl outline-none focus:border-blue-600 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`} value={editingRoute.name || ''} onChange={e => setEditingRoute({...editingRoute, name: e.target.value})} placeholder="Ex: Rota 1 - Litoral" /></div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Hospitais Incluídos</label>
                        <div className={`border-2 rounded-xl p-3 max-h-48 overflow-y-auto custom-scrollbar space-y-2 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            {filteredHospitals.map(h => (
                                <label key={h.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-black/5 rounded-lg transition-all">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 rounded border-2 text-blue-600 focus:ring-blue-500"
                                        checked={editingRoute.hospitals?.includes(h.name) || false}
                                        onChange={e => {
                                            const current = editingRoute.hospitals || [];
                                            if (e.target.checked) setEditingRoute({...editingRoute, hospitals: [...current, h.name]});
                                            else setEditingRoute({...editingRoute, hospitals: current.filter(name => name !== h.name)});
                                        }}
                                    />
                                    <span className={`text-sm font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{h.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                        <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={editingRoute.active !== false} onChange={e => setEditingRoute({...editingRoute, active: e.target.checked})} /><span className="text-sm font-bold text-gray-700">Rota Ativa na Agenda</span></label>
                    </div>
                    <div className="pt-4"><Button className="w-full rounded-xl py-4" type="submit">Salvar Rota</Button></div>
                </form>
             </div>
          </div>, document.body
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
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
    </div>
  );
};
