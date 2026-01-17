
// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { loadState, saveState, createDefaultState, atomicUpdate } from './services/storageService';
import { AppState, UserRole, Member, Notification } from './types';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/AdminPanel';
import { PatientRegistry } from './pages/PatientRegistry';
import { PatientHistory } from './pages/PatientHistory';
import { StatsReport } from './pages/StatsReport';
import { LogsPage } from './pages/LogsPage';
import { Welcome } from './pages/Welcome';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { MapPage } from './pages/MapPage';
import { SocialVisitsPage } from './pages/SocialVisitsPage';
import { PublicRequestPage } from './pages/PublicRequestPage';
import { TutorialPage } from './pages/TutorialPage';
import { GlobalSearch } from './components/GlobalSearch';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { OnboardingModal } from './components/OnboardingModal';
import { NotificationCenter } from './components/NotificationCenter';
import { supabase } from './services/supabaseClient';

const Layout: React.FC<{ 
  state: AppState; 
  onUpdateState: (s: AppState) => void; 
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
  isHospitalMode: boolean;
  onToggleHospitalMode: () => void;
  isNightMode: boolean;
  onToggleNightMode: () => void;
  onChangePasswordClick: () => void;
  isSyncing?: boolean;
}> = ({ state, onUpdateState, isPrivacyMode, onTogglePrivacy, isHospitalMode, onToggleHospitalMode, isNightMode, onToggleNightMode, onChangePasswordClick, isSyncing }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const location = useLocation();
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- NOTIFICAÇÕES E REALTIME ---
  
  // 1. Pedir Permissão ao Carregar
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    // Preload audio
    notificationAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  // 2. Helper para Disparar Notificação do Sistema
  const sendSystemNotification = (title: string, body: string) => {
    // Tocar som
    if (notificationAudioRef.current) {
        notificationAudioRef.current.play().catch(e => console.log("Audio play blocked", e));
    }

    // Mostrar Push Nativo
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        // Tenta usar ServiceWorker se disponível (melhor para mobile), senão fallback para new Notification
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    body,
                    icon: '/vite.svg', // Icone padrao
                    vibrate: [200, 100, 200]
                });
            });
        } else {
            new Notification(title, { body, icon: '/vite.svg' });
        }
      } catch (e) {
        console.error("Erro ao enviar notificação nativa", e);
      }
    }
  };

  // 3. Supabase Realtime Listener (Ouvindo novas notificações do servidor)
  useEffect(() => {
    if (!state.currentUser || !supabase) return;

    const channel = supabase
      .channel('realtime:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as Notification;
          
          // Verifica se a notificação é para o usuário logado
          if (newNotif.userId === state.currentUser?.id) {
            // Atualiza estado local
            onUpdateState({
                ...state,
                notifications: [newNotif, ...state.notifications]
            });

            // Dispara Push Nativo
            const title = newNotif.type === 'warning' ? '⚠️ Atenção GVP' : 'Nova Mensagem GVP';
            sendSystemNotification(title, newNotif.message);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.currentUser, state.notifications]); // Dependência cuidadosa para evitar loops

  // 4. Verificação Agendada de Visitas (Lembrete Diário)
  useEffect(() => {
    if (!state.currentUser) return;

    const checkUpcomingVisits = () => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const upcoming = state.visits.filter(v => {
        const isTomorrow = v.date === tomorrowStr;
        const isMine = v.memberIds.includes(state.currentUser!.id);
        // Evita notificar se já existir notificação de hoje sobre isso
        const alreadyNotified = state.notifications.some(n => 
          n.userId === state.currentUser!.id && 
          n.message.includes(v.date) && 
          new Date(n.timestamp).toDateString() === now.toDateString()
        );
        return isTomorrow && isMine && !alreadyNotified && !v.report;
      });

      if (upcoming.length > 0) {
        const newNotifications: Notification[] = upcoming.map(v => ({
          id: crypto.randomUUID(),
          userId: state.currentUser!.id,
          message: `📅 Lembrete: Você tem uma visita agendada para AMANHÃ (${v.date}). Prepare-se!`,
          type: 'warning',
          read: false,
          timestamp: new Date().toISOString()
        }));

        // Salva no banco (o Realtime vai pegar e disparar o push, ou atualizamos local direto)
        // Aqui atualizamos local e disparamos push direto para garantir
        Promise.all(newNotifications.map(n => atomicUpdate('notifications', n)));
        
        onUpdateState({
          ...state,
          notifications: [...newNotifications, ...state.notifications]
        });

        sendSystemNotification("Lembrete de Visita", `Você tem visita amanhã! Verifique o app.`);
      }
    };

    // Roda verificação 5s após carregar o app
    const timer = setTimeout(checkUpcomingVisits, 5000);
    return () => clearTimeout(timer);
  }, [state.visits, state.currentUser]); 
  // Removida dependência de state.notifications para evitar loop infinito na atualização

  useEffect(() => {
    if (state.currentUser && state.currentUser.hasSeenOnboarding === false) {
      setIsOnboardingOpen(true);
    }
  }, [state.currentUser]);

  if (!state.currentUser) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
      if (supabase) await supabase.auth.signOut();
      onUpdateState({ ...state, currentUser: null });
  };

  const handleCloseOnboarding = () => {
    if (state.currentUser) {
      const updatedMembers = state.members.map(m => 
        m.id === state.currentUser?.id ? { ...m, hasSeenOnboarding: true } : m
      );
      
      atomicUpdate('members', { ...state.currentUser, hasSeenOnboarding: true });
      
      onUpdateState({
        ...state,
        members: updatedMembers,
        currentUser: { ...state.currentUser, hasSeenOnboarding: true }
      });
    }
    setIsOnboardingOpen(false);
  };

  const handleMarkAsRead = (id: string) => {
    const updated = state.notifications.map(n => n.id === id ? { ...n, read: true } : n);
    const notif = updated.find(n => n.id === id);
    if(notif) atomicUpdate('notifications', notif);
    onUpdateState({ ...state, notifications: updated });
  };

  const handleClearNotifications = () => {
    // Marca todas como lidas no banco
    state.notifications.forEach(n => {
        if(!n.read) atomicUpdate('notifications', { ...n, read: true });
    });
    onUpdateState({ ...state, notifications: [] });
  };

  const menuItems = [
    { to: "/dashboard", label: "Agenda", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { to: "/patients", label: "Pacientes", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { to: "/social-visits", label: "AS", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    { to: "/map", label: "Mapa", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
    { to: "/stats", label: "KPIs", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  ];

  if (state.currentUser.role === UserRole.ADMIN) {
    menuItems.push({ to: "/admin", label: "Admin", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" });
  }

  return (
    <div className={`h-[100dvh] flex overflow-hidden ${isHospitalMode ? 'bg-[#1a1c1e] text-gray-200' : 'bg-gray-50 text-gray-900'} ${isNightMode ? 'night-shift' : ''}`}>
      
      {/* Sidebar Desktop - Escondida no Mobile */}
      <aside className={`hidden md:flex flex-col w-64 ${isHospitalMode ? 'bg-[#212327] border-r border-gray-800' : 'bg-white shadow-xl'}`}>
        <div className="p-6 border-b flex items-center justify-between border-gray-800/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="font-bold text-lg">SOFT-CRM GVP</span>
          </div>
        </div>

        <nav className="flex-grow p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map(item => (
            <Link 
              key={item.to} to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${location.pathname === item.to ? 'bg-blue-600 text-white shadow-lg' : isHospitalMode ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-blue-50'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800/10 space-y-2 shrink-0">
          <button onClick={() => Notification.requestPermission()} className="w-full text-left px-4 py-2 text-xs font-bold uppercase text-blue-500 hover:bg-blue-50 rounded-lg flex items-center gap-2">
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
             Ativar Notificações
          </button>
          <button onClick={onChangePasswordClick} className="w-full text-left px-4 py-2 text-xs font-bold uppercase text-gray-400 hover:text-blue-500">Alterar Senha</button>
          <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs font-bold uppercase text-red-500 hover:bg-red-500/10 rounded-lg">Sair</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0 h-full relative overflow-hidden pb-16 md:pb-0">
        {isSyncing && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600/30 overflow-hidden z-[100]">
            <div className="h-full bg-blue-600 animate-[loading_1.5s_infinite_linear]" style={{ width: '30%' }}></div>
          </div>
        )}

        <header className={`h-16 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-30 ${isHospitalMode ? 'bg-[#212327] border-b border-gray-800' : 'bg-white shadow-sm'}`}>
          <div className="flex items-center gap-2 md:gap-4 flex-grow">
            <div className="md:hidden flex items-center gap-2">
               <div className="bg-blue-600 p-1 rounded-md text-white">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               </div>
               <span className={`font-black text-sm tracking-tight ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>GVP</span>
            </div>
            <div className="hidden sm:block flex-grow">
              <GlobalSearch state={state} isHospitalMode={isHospitalMode} />
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <NotificationCenter 
              notifications={state.notifications.filter(n => n.userId === state.currentUser?.id)} 
              onMarkAsRead={handleMarkAsRead} 
              onClearAll={handleClearNotifications} 
            />

            <button onClick={onToggleHospitalMode} className={`p-2 rounded-full transition-all ${isHospitalMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>
              {isHospitalMode ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
            </button>

            <button onClick={onToggleNightMode} className={`p-2 rounded-full transition-all ${isNightMode ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>

            <button onClick={onTogglePrivacy} className={`p-2 rounded-full transition-colors ${isPrivacyMode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
            
            <div className={`flex items-center gap-3 border-l pl-3 md:pl-4 ${isHospitalMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="w-8 h-8 md:w-9 md:h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg select-none">
                {state.currentUser.name.substring(0,2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto custom-scrollbar p-4 md:p-6 bg-transparent">
          <Routes>
            <Route path="/dashboard" element={<Dashboard state={state} onUpdateState={onUpdateState} isPrivacyMode={isPrivacyMode} isHospitalMode={isHospitalMode} />} />
            <Route path="/patients" element={<PatientRegistry state={state} onUpdateState={onUpdateState} isPrivacyMode={isPrivacyMode} isHospitalMode={isHospitalMode} />} />
            <Route path="/social-visits" element={<SocialVisitsPage state={state} onUpdateState={onUpdateState} isHospitalMode={isHospitalMode} />} />
            <Route path="/history" element={<PatientHistory state={state} isHospitalMode={isHospitalMode} />} />
            <Route path="/map" element={<MapPage state={state} isHospitalMode={isHospitalMode} />} />
            <Route path="/stats" element={<StatsReport state={state} isHospitalMode={isHospitalMode} />} />
            <Route path="/logs" element={<LogsPage state={state} isHospitalMode={isHospitalMode} />} />
            <Route path="/admin" element={<AdminPanel state={state} onUpdateState={onUpdateState} isHospitalMode={isHospitalMode} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* Bottom Navigation Bar (Mobile Only) */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 h-16 ${isHospitalMode ? 'bg-[#212327] border-t border-gray-800' : 'bg-white border-t border-gray-200'} z-50 flex justify-around items-center px-2 pb-safe`}>
        {menuItems.slice(0, 4).map(item => (
          <Link 
            key={item.to} 
            to={item.to}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname === item.to ? 'text-blue-600' : isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
            <span className="text-[9px] font-bold uppercase tracking-wide">{item.label}</span>
          </Link>
        ))}
        {/* Botão Mais para Admin/Extras */}
        <button 
            onClick={() => setIsSidebarOpen(true)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isSidebarOpen ? 'text-blue-600' : isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}
        >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            <span className="text-[9px] font-bold uppercase tracking-wide">Menu</span>
        </button>
      </nav>

      {/* Mobile Drawer (Menu Extras) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
            <div className={`absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 pb-24 animate-fade-in ${isHospitalMode ? 'bg-[#212327] border-t border-gray-800' : 'bg-white'}`}>
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6 opacity-30"></div>
                <div className="space-y-2">
                    {state.currentUser.role === UserRole.ADMIN && (
                        <Link to="/admin" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-4 p-4 rounded-xl ${isHospitalMode ? 'bg-[#1a1c1e] text-white' : 'bg-gray-50 text-gray-800'}`}>
                            <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg></div>
                            <span className="font-bold">Painel Admin</span>
                        </Link>
                    )}
                    <Link to="/stats" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-4 p-4 rounded-xl ${isHospitalMode ? 'bg-[#1a1c1e] text-white' : 'bg-gray-50 text-gray-800'}`}>
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></div>
                        <span className="font-bold">Relatórios KPI</span>
                    </Link>
                    <button onClick={() => Notification.requestPermission()} className={`w-full flex items-center gap-4 p-4 rounded-xl text-left ${isHospitalMode ? 'bg-[#1a1c1e] text-white' : 'bg-gray-50 text-gray-800'}`}>
                        <div className="bg-green-100 p-2 rounded-lg text-green-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg></div>
                        <span className="font-bold">Ativar Alertas</span>
                    </button>
                    <button onClick={onChangePasswordClick} className={`w-full flex items-center gap-4 p-4 rounded-xl text-left ${isHospitalMode ? 'bg-[#1a1c1e] text-white' : 'bg-gray-50 text-gray-800'}`}>
                        <div className="bg-gray-200 p-2 rounded-lg text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 14l-1 1-1 1H6v-1l-4-4 1-1 1-1h1v-1h1v-1a6 6 0 016-6z" /></svg></div>
                        <span className="font-bold">Alterar Senha</span>
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-xl text-left bg-red-50 text-red-600">
                        <div className="bg-red-100 p-2 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></div>
                        <span className="font-bold">Sair da Conta</span>
                    </button>
                </div>
            </div>
        </div>
      )}

      <OnboardingModal isOpen={isOnboardingOpen} onClose={handleCloseOnboarding} isHospitalMode={isHospitalMode} />
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(createDefaultState());
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isHospitalMode, setIsHospitalMode] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  useEffect(() => {
    loadState().then(loaded => {
      setState(loaded);
      setIsSyncing(false);
    });
  }, []);

  const handleUpdateState = (newState: AppState) => {
    setState(newState);
    saveState(newState);
  };

  const handleLogin = (user: Member) => {
    handleUpdateState({ ...state, currentUser: user });
  };
  
  const handleChangePassword = async (newPass: string) => {
      if (state.currentUser) {
          try {
              if (supabase) {
                  const { error } = await supabase.auth.updateUser({ password: newPass });
                  if (error) throw error;
                  alert("Senha alterada com sucesso!");
                  setIsChangePasswordOpen(false);
              } else {
                  // Fallback if supabase not available (mock)
                  alert("Senha alterada (simulação).");
                  setIsChangePasswordOpen(false);
              }
          } catch (e: any) {
              alert("Erro ao alterar senha: " + e.message);
          }
      }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/welcome" replace />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<LoginPage state={state} onLogin={handleLogin} />} />
        <Route path="/signup" element={<SignUpPage state={state} onUpdateState={handleUpdateState} />} />
        <Route path="/solicitar-visita" element={<PublicRequestPage state={state} onUpdateState={handleUpdateState} />} />
        <Route path="/tutorial" element={<TutorialPage isHospitalMode={isHospitalMode} />} />
        
        <Route path="/*" element={
            <Layout 
                state={state} 
                onUpdateState={handleUpdateState} 
                isPrivacyMode={isPrivacyMode} 
                onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
                isHospitalMode={isHospitalMode}
                onToggleHospitalMode={() => setIsHospitalMode(!isHospitalMode)}
                isNightMode={isNightMode}
                onToggleNightMode={() => setIsNightMode(!isNightMode)}
                onChangePasswordClick={() => setIsChangePasswordOpen(true)}
                isSyncing={isSyncing}
            />
        } />
      </Routes>
      
      {state.currentUser && (
          <ChangePasswordModal 
              isOpen={isChangePasswordOpen}
              onClose={() => setIsChangePasswordOpen(false)}
              currentUser={state.currentUser}
              onConfirm={handleChangePassword}
              isHospitalMode={isHospitalMode}
          />
      )}
    </Router>
  );
};

export default App;
