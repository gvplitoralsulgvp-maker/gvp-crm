
import React, { useState } from 'react';
import { AppState, Member, VisitRoute, UserRole, LogEntry, Hospital } from '../types';
import { Button } from '../components/Button';
import { MapPicker } from '../components/MapPicker';
import { supabase } from '../services/supabaseClient';

interface AdminPanelProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ state, onUpdateState }) => {
  const [activeTab, setActiveTab] = useState<'members' | 'hospitals' | 'routes' | 'permissions'>('members');
  
  // Member Form State
  const [editingMember, setEditingMember] = useState<Partial<Member> | null>(null);
  
  // Route Form State
  const [editingRoute, setEditingRoute] = useState<Partial<VisitRoute> | null>(null);
  const [tempHospital, setTempHospital] = useState('');

  // Hospital Form State
  const [editingHospital, setEditingHospital] = useState<Partial<Hospital> | null>(null);

  const isOnline = !!supabase;

  // Helper to create Log
  const addLog = (action: string, details: string, currentLogs: LogEntry[]): LogEntry[] => {
    return [{
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userId: state.currentUser?.id || 'admin',
        userName: state.currentUser?.name || 'Admin',
        action,
        details
    }, ...currentLogs];
  };

  // --- Member Handlers ---
  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember?.name || !editingMember?.email) return;

    const newMembers = [...state.members];
    let logs = state.logs;
    
    // Default password for new users if not set
    const memberToSave = {
        ...editingMember,
        password: editingMember.password || '123456'
    };

    if (memberToSave.id) {
      // Update
      const index = newMembers.findIndex(m => m.id === memberToSave.id);
      if (index >= 0) {
        newMembers[index] = { ...newMembers[index], ...memberToSave } as Member;
        logs = addLog('Edição de Membro', `Alterou dados de ${memberToSave.name}`, logs);
      }
    } else {
      // Create
      newMembers.push({
        id: crypto.randomUUID(),
        active: true,
        role: UserRole.MEMBER,
        ...memberToSave
      } as Member);
      logs = addLog('Novo Membro', `Cadastrou membro ${memberToSave.name}`, logs);
    }

    onUpdateState({ ...state, members: newMembers, logs });
    setEditingMember(null);
  };

  const handleDeleteMember = (id: string, name: string) => {
    if (!confirm(`ATENÇÃO: Tem certeza que deseja excluir o membro ${name}? Esta ação não pode ser desfeita.`)) return;

    const newMembers = state.members.filter(m => m.id !== id);
    
    const logs = addLog('Exclusão de Membro', `Excluiu membro ${name} (ID: ${id})`, state.logs);
    onUpdateState({ ...state, members: newMembers, logs });
  };

  const handleToggleMemberActive = (id: string) => {
    const member = state.members.find(m => m.id === id);
    if (!member) return;

    const newMembers = state.members.map(m => 
      m.id === id ? { ...m, active: !m.active } : m
    );
    const logs = addLog('Status Membro', `${member.active ? 'Desativou' : 'Ativou'} membro ${member.name}`, state.logs);
    
    onUpdateState({ ...state, members: newMembers, logs });
  };

  // --- Permission Handlers ---
  const handleRoleChange = (memberId: string, newRole: UserRole) => {
     const member = state.members.find(m => m.id === memberId);
     if(!member) return;

     const newMembers = state.members.map(m => m.id === memberId ? { ...m, role: newRole } : m);
     const logs = addLog('Permissão Alterada', `Alterou função de ${member.name} para ${newRole}`, state.logs);
     
     onUpdateState({ ...state, members: newMembers, logs });
  };

  // --- Hospital Handlers ---
  const handleSaveHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHospital?.name) return;

    let newHospitals = [...state.hospitals];
    let logs = state.logs;

    if (editingHospital.id) {
        // Edit
        const index = newHospitals.findIndex(h => h.id === editingHospital.id);
        if (index >= 0) {
            newHospitals[index] = { ...newHospitals[index], ...editingHospital } as Hospital;
            logs = addLog('Edição Hospital', `Alterou dados do hospital ${editingHospital.name}`, logs);
        }
    } else {
        // Create
        newHospitals.push({
            id: crypto.randomUUID(),
            lat: -23.9608, // Default if not picked
            lng: -46.3331,
            address: '',
            city: 'Santos',
            ...editingHospital
        } as Hospital);
        logs = addLog('Novo Hospital', `Cadastrou hospital ${editingHospital.name}`, logs);
    }

    onUpdateState({ ...state, hospitals: newHospitals, logs });
    setEditingHospital(null);
  };

  const handleDeleteHospital = (id: string, name: string) => {
      if(!confirm(`Deseja excluir o hospital ${name}?`)) return;
      const newHospitals = state.hospitals.filter(h => h.id !== id);
      const logs = addLog('Exclusão Hospital', `Excluiu hospital ${name}`, state.logs);
      onUpdateState({ ...state, hospitals: newHospitals, logs });
  };

  // --- Route Handlers ---
  const handleAddHospitalToRoute = () => {
    if (!tempHospital.trim()) return;
    const currentHospitals = editingRoute?.hospitals || [];
    if (!currentHospitals.includes(tempHospital.trim())) {
        setEditingRoute({
          ...editingRoute,
          hospitals: [...currentHospitals, tempHospital.trim()]
        });
    }
    setTempHospital('');
  };

  const handleRemoveHospitalFromRoute = (index: number) => {
    const currentHospitals = editingRoute?.hospitals || [];
    setEditingRoute({
      ...editingRoute,
      hospitals: currentHospitals.filter((_, i) => i !== index)
    });
  };

  const handleSaveRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute?.name) return;

    const newRoutes = [...state.routes];
    let logs = state.logs;

    if (editingRoute.id) {
      const index = newRoutes.findIndex(r => r.id === editingRoute.id);
      if (index >= 0) {
        newRoutes[index] = { ...newRoutes[index], ...editingRoute } as VisitRoute;
        logs = addLog('Edição Rota', `Atualizou grupo/rota "${editingRoute.name}"`, logs);
      }
    } else {
      newRoutes.push({
        id: crypto.randomUUID(),
        active: true,
        hospitals: [],
        ...editingRoute
      } as VisitRoute);
      logs = addLog('Nova Rota', `Criou grupo/rota "${editingRoute.name}"`, logs);
    }

    onUpdateState({ ...state, routes: newRoutes, logs });
    setEditingRoute(null);
  };

  const handleToggleRouteActive = (id: string) => {
    const route = state.routes.find(r => r.id === id);
    if (!route) return;

    const newRoutes = state.routes.map(r => 
      r.id === id ? { ...r, active: !r.active } : r
    );
    const logs = addLog('Status Rota', `${route.active ? 'Desativou' : 'Ativou'} rota "${route.name}"`, state.logs);
    
    onUpdateState({ ...state, routes: newRoutes, logs });
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
         <div>
             <h2 className="text-xl font-bold text-gray-800">Painel Administrativo</h2>
             <p className="text-sm text-gray-500">Gerenciamento do sistema.</p>
         </div>
         <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 ${isOnline ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            {isOnline ? 'Sistema Online (Supabase)' : 'Modo Offline (LocalStorage)'}
         </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'members' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('members')}
        >
          Membros
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'hospitals' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('hospitals')}
        >
          Hospitais (Mapa)
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'routes' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('routes')}
        >
          Grupos de Visita
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'permissions' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('permissions')}
        >
          Permissões
        </button>
      </div>

      {activeTab === 'members' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
             <div>
                <h3 className="text-lg font-bold text-gray-800">Equipe de Visitas</h3>
                <p className="text-sm text-gray-500">Adicione ou edite os membros do GVP.</p>
             </div>
             <Button size="sm" onClick={() => setEditingMember({ name: '', role: UserRole.MEMBER, active: true })}>+ Novo Membro</Button>
          </div>
          
          {editingMember && (
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 mb-6 shadow-sm">
              <h4 className="font-semibold text-blue-900 mb-4">{editingMember.id ? 'Editar Membro' : 'Cadastrar Novo Membro'}</h4>
              <form onSubmit={handleSaveMember} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Nome Completo</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Ex: João da Silva"
                      className="w-full border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                      value={editingMember.name || ''} 
                      onChange={e => setEditingMember({...editingMember, name: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Telefone / WhatsApp</label>
                    <input 
                      type="text" 
                      placeholder="(11) 99999-9999"
                      className="w-full border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                      value={editingMember.phone || ''} 
                      onChange={e => setEditingMember({...editingMember, phone: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Email (Login)</label>
                    <input 
                      type="email" 
                      required
                      placeholder="email@exemplo.com"
                      className="w-full border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                      value={editingMember.email || ''} 
                      onChange={e => setEditingMember({...editingMember, email: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Senha</label>
                    <input 
                      type="text" 
                      placeholder="Padrão: 123456"
                      className="w-full border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                      value={editingMember.password || ''} 
                      onChange={e => setEditingMember({...editingMember, password: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Congregação</label>
                    <input 
                      type="text" 
                      placeholder="Nome da Congregação"
                      className="w-full border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                      value={editingMember.congregation || ''} 
                      onChange={e => setEditingMember({...editingMember, congregation: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Circuito</label>
                    <input 
                      type="text" 
                      placeholder="Ex: SP-10"
                      className="w-full border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                      value={editingMember.circuit || ''} 
                      onChange={e => setEditingMember({...editingMember, circuit: e.target.value})} 
                    />
                  </div>
                   <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-blue-800 mb-1">Endereço</label>
                        <input 
                          type="text" 
                          placeholder="Rua, Número, Bairro, Cidade"
                          className="w-full border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                          value={editingMember.address || ''} 
                          onChange={e => setEditingMember({...editingMember, address: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-blue-800 mb-1">CEP</label>
                        <input 
                          type="text" 
                          placeholder="00000-000"
                          className="w-full border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                          value={editingMember.cep || ''} 
                          onChange={e => setEditingMember({...editingMember, cep: e.target.value})} 
                        />
                      </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                    <input 
                        type="checkbox" 
                        id="activeCheck"
                        className="rounded text-blue-600 focus:ring-blue-500"
                        checked={editingMember.active ?? true}
                        onChange={e => setEditingMember({...editingMember, active: e.target.checked})}
                    />
                    <label htmlFor="activeCheck" className="text-sm text-gray-700">Membro Ativo</label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setEditingMember(null)}>Cancelar</Button>
                  <Button type="submit">Salvar Informações</Button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {state.members.sort((a,b) => a.name.localeCompare(b.name)).map(member => (
                <li key={member.id} className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors ${!member.active ? 'bg-gray-50' : ''}`}>
                  <div className={`flex items-center gap-3 ${!member.active ? 'opacity-50 grayscale' : ''}`}>
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
                        {member.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                            {member.name}
                            {!member.active && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Inativo</span>}
                        </p>
                        <p className="text-xs text-gray-500">
                          {member.email} • CEP: {member.cep || 'N/A'}
                        </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 sm:mt-0 pl-12 sm:pl-0">
                    <button 
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50" 
                        onClick={() => setEditingMember(member)}
                    >
                        Editar
                    </button>
                    <div className="w-px h-4 bg-gray-300 self-center"></div>
                    <button 
                        className={`${member.active ? 'text-gray-500 hover:text-gray-700' : 'text-green-600 hover:text-green-800'} text-sm font-medium px-2 py-1 rounded hover:bg-gray-100`} 
                        onClick={() => handleToggleMemberActive(member.id)}
                    >
                      {member.active ? 'Desativar' : 'Reativar'}
                    </button>
                    <div className="w-px h-4 bg-gray-300 self-center"></div>
                    <button 
                        className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50"
                        onClick={() => handleDeleteMember(member.id, member.name)}
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'hospitals' && (
          <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Gerenciar Hospitais</h3>
                    <p className="text-sm text-gray-500">Cadastre a localização dos hospitais para o mapa.</p>
                </div>
                <Button size="sm" onClick={() => setEditingHospital({ name: '', city: 'Santos' })}>+ Novo Hospital</Button>
            </div>

            {editingHospital && (
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 mb-6 shadow-sm">
                   <h4 className="font-semibold text-blue-900 mb-4">{editingHospital.id ? 'Editar Hospital' : 'Novo Hospital'}</h4>
                   <form onSubmit={handleSaveHospital} className="space-y-4">
                        <div>
                           <label className="block text-xs font-semibold text-blue-800 mb-1">Nome do Hospital</label>
                           <input type="text" required className="w-full border-gray-300 rounded p-2 text-sm" 
                             value={editingHospital.name || ''} onChange={e => setEditingHospital({...editingHospital, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-blue-800 mb-1">Endereço</label>
                                <input type="text" className="w-full border-gray-300 rounded p-2 text-sm" 
                                value={editingHospital.address || ''} onChange={e => setEditingHospital({...editingHospital, address: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-blue-800 mb-1">Cidade</label>
                                <input type="text" className="w-full border-gray-300 rounded p-2 text-sm" 
                                value={editingHospital.city || ''} onChange={e => setEditingHospital({...editingHospital, city: e.target.value})} />
                            </div>
                        </div>
                        
                        <div>
                             <label className="block text-xs font-semibold text-blue-800 mb-2">Localização no Mapa</label>
                             <MapPicker 
                                key={editingHospital.id || 'new'}
                                initialLat={editingHospital.lat} 
                                initialLng={editingHospital.lng}
                                onLocationSelect={(lat, lng) => setEditingHospital({...editingHospital, lat, lng})} 
                             />
                             {editingHospital.lat && <p className="text-xs text-gray-500 mt-1">Coordenadas: {editingHospital.lat.toFixed(4)}, {editingHospital.lng?.toFixed(4)}</p>}
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                           <Button type="button" variant="secondary" onClick={() => setEditingHospital(null)}>Cancelar</Button>
                           <Button type="submit">Salvar Hospital</Button>
                        </div>
                   </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.hospitals.map(h => (
                    <div key={h.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
                        <div>
                            <h4 className="font-bold text-gray-800">{h.name}</h4>
                            <p className="text-sm text-gray-600">{h.address}</p>
                            <p className="text-xs text-gray-500">{h.city}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                           <button className="text-blue-600 text-sm hover:underline" onClick={() => setEditingHospital(h)}>Editar</button>
                           <button className="text-red-600 text-sm hover:underline" onClick={() => handleDeleteHospital(h.id, h.name)}>Excluir</button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
      )}

      {activeTab === 'routes' && (
        <div className="animate-fade-in">
           <div className="flex justify-between items-center mb-6">
             <div>
                <h3 className="text-lg font-bold text-gray-800">Grupos e Hospitais</h3>
                <p className="text-sm text-gray-500">Agrupe os hospitais em rotas de visitação.</p>
             </div>
             <Button size="sm" onClick={() => setEditingRoute({ name: '', hospitals: [], active: true })}>+ Novo Grupo</Button>
          </div>

          {editingRoute && (
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 mb-6 shadow-sm">
              <h4 className="font-semibold text-blue-900 mb-4">{editingRoute.id ? 'Editar Grupo/Rota' : 'Criar Novo Grupo/Rota'}</h4>
              <form onSubmit={handleSaveRoute} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1">Nome do Grupo (Ex: Rota Centro, Grupo A)</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Nome de identificação do grupo"
                    className="w-full border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                    value={editingRoute.name || ''} 
                    onChange={e => setEditingRoute({...editingRoute, name: e.target.value})} 
                  />
                </div>
                
                <div className="bg-white p-4 rounded border border-blue-100">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Hospitais neste grupo</label>
                  <div className="flex gap-2 mb-3">
                     {/* Suggestion List from actual Hospitals */}
                    <input 
                      list="hospital-suggestions"
                      type="text" 
                      className="flex-grow border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                      placeholder="Digite o nome do hospital" 
                      value={tempHospital} 
                      onChange={e => setTempHospital(e.target.value)}
                      onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddHospitalToRoute(); }}}
                    />
                    <datalist id="hospital-suggestions">
                        {state.hospitals.map(h => (
                            <option key={h.id} value={h.name} />
                        ))}
                    </datalist>
                    <Button type="button" size="sm" variant="secondary" onClick={handleAddHospitalToRoute}>Adicionar</Button>
                  </div>
                  
                  {(!editingRoute.hospitals || editingRoute.hospitals.length === 0) && (
                      <p className="text-sm text-gray-400 italic text-center py-2">Nenhum hospital adicionado a este grupo ainda.</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {editingRoute.hospitals?.map((h, idx) => (
                      <span key={idx} className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full flex items-center gap-2 shadow-sm">
                        {h}
                        <button 
                            type="button" 
                            onClick={() => handleRemoveHospitalFromRoute(idx)} 
                            className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors text-xs"
                            title="Remover hospital"
                        >
                            &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setEditingRoute(null)}>Cancelar</Button>
                  <Button type="submit">Salvar Grupo</Button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
             {state.routes.map(route => (
               <div key={route.id} className={`bg-white border rounded-lg p-5 shadow-sm transition-all ${!route.active ? 'bg-gray-50 border-gray-200' : 'border-gray-200 hover:border-blue-300'}`}>
                  <div className="flex justify-between items-start">
                      <div className={!route.active ? 'opacity-50' : ''}>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-800 text-lg">{route.name}</h4>
                            {!route.active && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold uppercase tracking-wide">Inativo</span>}
                        </div>
                        <div className="mt-2">
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Hospitais atendidos:</p>
                            <div className="flex flex-wrap gap-1">
                                {route.hospitals.length > 0 ? route.hospitals.map((h, i) => (
                                    <span key={i} className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">{h}</span>
                                )) : <span className="text-sm text-gray-400 italic">Nenhum hospital cadastrado</span>}
                            </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button 
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:bg-blue-50 px-3 py-1.5 rounded text-right" 
                            onClick={() => setEditingRoute(route)}
                        >
                            Editar
                        </button>
                        <button 
                             className={`${route.active ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-800 hover:bg-green-50'} text-sm font-medium px-3 py-1.5 rounded text-right`} 
                             onClick={() => handleToggleRouteActive(route.id)}
                        >
                            {route.active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                  </div>
               </div>
             ))}
             {state.routes.length === 0 && (
                 <p className="text-center text-gray-500 py-8 italic">Nenhum grupo de hospitais criado.</p>
             )}
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Permissões de Acesso</h3>
            <p className="text-sm text-gray-500 mb-6 bg-yellow-50 p-3 rounded border border-yellow-100 text-yellow-800">
                <span className="font-bold">Atenção:</span> Administradores têm acesso total ao sistema, incluindo edição de agenda de outros membros e gerenciamento de configurações.
            </p>
            
            <div className="bg-white shadow-sm overflow-hidden rounded-lg border border-gray-200">
               <div className="grid grid-cols-1 divide-y divide-gray-100">
                  {state.members.filter(m => m.active).sort((a,b) => a.name.localeCompare(b.name)).map(member => (
                    <div key={member.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${member.role === UserRole.ADMIN ? 'bg-purple-600' : 'bg-gray-400'}`}>
                              {member.role === UserRole.ADMIN ? 'A' : 'M'}
                           </div>
                           <div>
                               <p className="font-bold text-gray-800">{member.name}</p>
                               <p className="text-xs text-gray-500">ID: {member.id}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                           <button 
                             onClick={() => handleRoleChange(member.id, UserRole.MEMBER)}
                             className={`text-sm px-4 py-1.5 rounded-md transition-all font-medium ${member.role === UserRole.MEMBER ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                           >
                              Membro
                           </button>
                           <button 
                             onClick={() => handleRoleChange(member.id, UserRole.ADMIN)}
                             className={`text-sm px-4 py-1.5 rounded-md transition-all font-medium ${member.role === UserRole.ADMIN ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-purple-700'}`}
                           >
                              Admin
                           </button>
                        </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
      )}
    </div>
  );
};
