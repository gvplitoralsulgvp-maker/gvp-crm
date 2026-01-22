import React, { useEffect, useState, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { loadState, createDefaultState, atomicUpdate } from './services/storageService';
import { AppState, UserRole, AppNotification } from './types';
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
import { ColihPage } from './pages/ColihPage';
import { GlobalSearch } from './components/GlobalSearch';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { OnboardingModal } from './components/OnboardingModal';
import { NotificationCenter } from './components/NotificationCenter';
import { supabase } from './services/supabaseClient';

// --- LAYOUT PRINCIPAL ---
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
  const [showNotifPermission, setShowNotifPermission] = useState(false);
  const location = useLocation();
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- NOTIFICAÇÕES E REALTIME ---
  
  // 1. Verificar Permissão ao Carregar
  useEffect(() => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        setShowNotifPermission(true);
      }
      notificationAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    } catch (e) {
      console.warn("Erro ao inicializar audio:", e);
    }
  }, []);

  const handleRequestPermission = () => {
    if (!('Notification' in window)) {
      alert("Este navegador não suporta notificações.");
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        new Notification("COLIH/GVP Litoral Sul", { 
          body: "Notificações ativas! Você será alertado sobre novos pedidos.",
          icon: '/vite.svg' 
        });
      } catch (e) {}
      alert("Permissão já concedida.");
      setShowNotifPermission(false);
      return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            setShowNotifPermission(false);
            new Notification("COLIH/GVP Litoral Sul", { body: "Notificações ativadas!" });
        } else if (permission === 'denied') {
            alert("Você bloqueou as notificações. Para ativar, acesse as configurações do navegador (ícone cadeado) e permita Notificações.");
        }
    });
  };

  const sendSystemNotification = (title: string, body: string) => {
    try {
      // Audio
      if (notificationAudioRef.current) {
          notificationAudioRef.current.play().catch(() => {});
      }
      // Push Visual
      if ('Notification' in window && Notification.permission === 'granted') {
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification(title, { body, icon: '/vite.svg', vibrate: [200, 100, 200] } as any);
              });
          } else {
              new Notification(title, { body, icon: '/vite.svg' });
          }
      }
    } catch (e) {
      console.error("Erro notificação:", e);
    }
  };

  // 2. Listener Realtime (Websocket)
  useEffect(() => {
    const client = supabase;
    if (!state.currentUser || !client) return;

    const channel = client
      .channel('realtime:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as any; // Raw DB record
          // Mapeia para o tipo do app
          const appNotif: AppNotification = {
              id: newNotif.id,
              userId: newNotif.user_id,
              message: newNotif.message,
              type: newNotif.type,
              read: newNotif.read,
              timestamp: newNotif.timestamp
          };

          // Se for para mim
          if (appNotif.userId === state.currentUser?.id) {
            onUpdateState({
                ...state,
                notifications: [appNotif, ...state.notifications]
            });
            const title = appNotif.type === 'warning' ? '⚠️ Atenção Admin' : 'Nova Mensagem';
            sendSystemNotification(title, appNotif.message);
          }
        }
      )
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, [state.currentUser, state.notifications]); 

  // 3. Sync Force (Ao acordar o celular/aba)
  useEffect(() => {
    const handleVisibilityChange = async () => {
        if (document.visibilityState === 'visible' && state.currentUser) {
            console.log("App acordou (foreground). Buscando atualizações...");
            try {
                const client = supabase;
                if (!client) return;
                // Recarrega notificações do servidor
                const { data: serverNotifs } = await client
                    .from('notifications')
                    .select('*')
                    .order('timestamp', { ascending: false });
                
                if (serverNotifs) {
                    const mapped: AppNotification[] = serverNotifs.map((n: any) => ({
                        id: n.id,
                        userId: n.user_id,
                        message: n.message,
                        type: n.type,
                        read: n.read,
                        timestamp: n.timestamp
                    })).filter((n) => n.userId === state.currentUser?.id);

                    // Verifica se tem algo novo comparado ao estado local
                    const localIds = new Set(state.notifications.map(n => n.id));
                    const hasNew = mapped.some((n) => !localIds.has(n.id) && !n.read);

                    if (hasNew) {
                        sendSystemNotification("Atualização", "Novos itens recebidos enquanto você estava ausente.");
                    }

                    onUpdateState({ ...state, notifications: mapped });
                }
            } catch (err) {
                console.error("Erro sync ao acordar:", err);
            }
        }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [state.currentUser, state.notifications]);

  // 4. Lembrete Diário (Agenda)
  useEffect(() => {
    if (!state.currentUser) return;
    const checkUpcomingVisits = () => {
      try {
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const upcoming = state.visits.filter(v => {
          const isTomorrow = v.date === tomorrowStr;
          const isMine = v.memberIds.includes(state.currentUser!.id);
          const alreadyNotified = state.notifications.some(n => 
            n.userId === state.currentUser!.id && 
            n.message.includes(v.date) && 
            new Date(n.timestamp).toDateString() === now.toDateString()
          );
          return isTomorrow && isMine && !alreadyNotified && !v.report;
        });

        if (upcoming.length > 0) {
          const newNotifications: AppNotification[] = upcoming.map(v => ({
            id: crypto.randomUUID(),
            userId: state.currentUser!.id,
            message: `📅 Lembrete: Visita amanhã (${v.date}). Prepare-se!`,
            type: 'warning',
            read: false,
            timestamp: new Date().toISOString()
          }));

          Promise.all(newNotifications.map(n => atomicUpdate('notifications', n)));
          
          onUpdateState({
            ...state,
            notifications: [...newNotifications, ...state.notifications]
          });
          sendSystemNotification("Lembrete de Visita", "Você tem visita amanhã!");
        }
      } catch (err) { console.error(err); }
    };
    const timer = setTimeout(checkUpcomingVisits, 10000);
    return () => clearTimeout(timer);
  }, [state.visits, state.currentUser]); 

  // Onboarding Logic
  useEffect(() => {
    if (state.currentUser && state.currentUser.hasSeenOnboarding === false) {
      setIsOnboardingOpen(true);
    }
  }, [state.currentUser]);

  if (!state.currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage state={state} onLogin={(user) => onUpdateState({ ...state, currentUser: user })} />} />
        <Route path="/signup" element={<SignUpPage state={state} onUpdateState={onUpdateState} />} />
        <Route path="/solicitar-visita" element={<PublicRequestPage state={state} onUpdateState={onUpdateState} />} />
        <Route path="/" element={<Welcome />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  const handleLogout = async () => {
      const client = supabase;
      if (client) await client.auth.signOut();
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
    state.notifications.forEach(n => {
        if(!n.read) atomicUpdate('notifications', { ...n, read: true });
    });
    onUpdateState({ ...state, notifications: [] });
  };

  // --- CONSTRUÇÃO DO MENU (IMUTÁVEL E SEGURA) ---
  const hasColihAccess = state.currentUser.isColih || state.currentUser.role === UserRole.ADMIN;
  const isAdmin = state.currentUser.role === UserRole.ADMIN;

  const menuItems = [
    { to: "/dashboard", label: "Agenda", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    
    // Inserção Condicional dos Itens COLIH Separados
    ...(hasColihAccess ? [
        { to: "/colih/doctors", label: "Médicos", icon: "M20 7h-4v-3c0-1.105-.895-2-2-2h-4c-1.105 0-2 .895-2 2v3h-4c-1.105 0-2 .895-2 2v11c0 1.105.895 2 2 2h16c1.105 0 2-.895 2-2v-11c0-1.105-.895-2-2-2zm-10-3h4v3h-4v-3zm0 0" },
        { to: "/colih/facilitators", label: "Facilitadores", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
        { to: "/colih/hospitals", label: "Hospitais", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
        { to: "/colih/presentations", label: "Apresentações", icon: "M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" }
    ] : []),

    { to: "/patients", label: "Pacientes", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { to: "/social-visits", label: "AS", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    { to: "/map", label: "Mapa", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
    { to: "/stats", label: "KPIs", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    
    // Inserção Condicional da Aba Admin (Última Posição)
    ...(isAdmin ? [{ 
        to: "/admin", 
        label: "Admin", 
        icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
    }] : [])
  ];

  return (
    <div className={`h-[100dvh] flex overflow-hidden ${isHospitalMode ? 'bg-[#1a1c1e] text-gray-200' : 'bg-gray-50 text-gray-900'} ${isNightMode ? 'night-shift' : ''}`}>
      <aside className={`hidden md:flex flex-col w-64 ${isHospitalMode ? 'bg-[#212327] border-r border-gray-800' : 'bg-white shadow-xl'}`}>
        <div className="p-6 border-b flex items-center justify-between border-gray-800/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="font-bold text-sm">COLIH/GVP Litoral Sul</span>
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
          <button onClick={onChangePasswordClick} className="w-full text-left px-4 py-2 text-xs font-bold uppercase text-gray-400 hover:text-blue-500">Alterar Senha</button>
          <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs font-bold uppercase text-red-500 hover:bg-red-500/10 rounded-lg">Sair</button>
        </div>
      </aside>

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
               <span className={`font-black text-sm tracking-tight ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>COLIH/GVP</span>
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

        <main className="flex-grow overflow-y-auto custom-scrollbar p-4 md:p-6 bg-transparent relative">
          {showNotifPermission && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
                <button onClick={handleRequestPermission} className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-xs font-bold uppercase tracking-wide hover:bg-blue-700 transition-all">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    Ativar Notificações
                </button>
            </div>
          )}
          <Routes>
            <Route path="/dashboard" element={<Dashboard state={state} onUpdateState={onUpdateState} isPrivacyMode={isPrivacyMode} isHospitalMode={isHospitalMode} />} />
            <Route path="/patients" element={<PatientRegistry state={state} onUpdateState={onUpdateState} isPrivacyMode={isPrivacyMode} isHospitalMode={isHospitalMode} />} />
            <Route path="/social-visits" element={<SocialVisitsPage state={state} onUpdateState={onUpdateState} isHospitalMode={isHospitalMode} />} />
            <Route path="/history" element={<PatientHistory state={state} isHospitalMode={isHospitalMode} />} />
            <Route path="/map" element={<MapPage state={state} isHospitalMode={isHospitalMode} />} />
            <Route path="/stats" element={<StatsReport state={state} isHospitalMode={isHospitalMode} />} />
            <Route path="/logs" element={<LogsPage state={state} isHospitalMode={isHospitalMode} />} />
            <Route path="/admin" element={<AdminPanel state={state} onUpdateState={onUpdateState} isHospitalMode={isHospitalMode} />} />
            {/* Novas Rotas COLIH */}
            {(state.currentUser.isColih || state.currentUser.role === UserRole.ADMIN) && (
                <>
                    <Route path="/colih/doctors" element={<ColihPage state={state} onUpdateState={onUpdateState} isHospitalMode={isHospitalMode} view="doctors" />} />
                    <Route path="/colih/facilitators" element={<ColihPage state={state} onUpdateState={onUpdateState} isHospitalMode={isHospitalMode} view="facilitators" />} />
                    <Route path="/colih/hospitals" element={<ColihPage state={state} onUpdateState={onUpdateState} isHospitalMode={isHospitalMode} view="hospitals" />} />
                    <Route path="/colih/presentations" element={<ColihPage state={state} onUpdateState={onUpdateState} isHospitalMode={isHospitalMode} view="presentations" />} />
                </>
            )}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      <nav className={`md:hidden fixed bottom-0 left-0 right-0 h-16 ${isHospitalMode ? 'bg-[#212327] border-t border-gray-800' : 'bg-white border-t border-gray-200'} z-50 flex justify-around items-center px-2 pb-safe`}>
        {menuItems.slice(0, 4).map(item => (
          <Link 
            key={item.to} to={item.to}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname === item.to ? 'text-blue-600' : isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
            <span className="text-[9px] font-bold uppercase tracking-wide truncate max-w-[70px]">{item.label}</span>
          </Link>
        ))}
        <button onClick={() => setIsSidebarOpen(true)} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isSidebarOpen ? 'text-blue-600' : isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            <span className="text-[9px] font-bold uppercase tracking-wide">Menu</span>
        </button>
      </nav>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
            <div className={`absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 pb-24 animate-fade-in flex flex-col max-h-[85vh] ${isHospitalMode ? 'bg-[#212327] border-t border-gray-800' : 'bg-white'}`}>
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6 opacity-30 shrink-0"></div>
                <div className="space-y-2 overflow-y-auto custom-scrollbar flex-grow">
                    {/* Renderiza o Menu Completo no Overlay */}
                    {menuItems.map(item => (
                        <Link key={item.to} to={item.to} onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-4 p-4 rounded-xl ${isHospitalMode ? 'bg-[#1a1c1e] text-white' : 'bg-gray-50 text-gray-800'}`}>
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg></div>
                            <span className="font-bold">{item.label}</span>
                        </Link>
                    ))}
                    
                    <button onClick={handleRequestPermission} className={`w-full flex items-center gap-4 p-4 rounded-xl text-left ${isHospitalMode ? 'bg-[#1a1c1e] text-white' : 'bg-gray-50 text-gray-800'}`}>
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
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    const init = async () => {
      setIsSyncing(true);
      try {
        const s = await loadState();
        setState(s);
      } catch (e) {
        console.error("Failed to load state", e);
      } finally {
        setIsSyncing(false);
      }
    };
    init();
  }, []);

  const handleChangePassword = async (newPass: string) => {
    const client = supabase;
    if (!client) return;
    const { error } = await client.auth.updateUser({ password: newPass });
    if (error) {
      alert("Erro ao alterar senha: " + error.message);
    } else {
      alert("Senha alterada com sucesso.");
      setIsChangePasswordModalOpen(false);
    }
  };

  return (
    <Router>
      <Layout 
        state={state}
        onUpdateState={setState}
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacy={() => setIsPrivacyMode(prev => !prev)}
        isHospitalMode={isHospitalMode}
        onToggleHospitalMode={() => setIsHospitalMode(prev => !prev)}
        isNightMode={isNightMode}
        onToggleNightMode={() => setIsNightMode(prev => !prev)}
        onChangePasswordClick={() => setIsChangePasswordModalOpen(true)}
        isSyncing={isSyncing}
      />
      {state.currentUser && (
        <ChangePasswordModal 
          isOpen={isChangePasswordModalOpen}
          onClose={() => setIsChangePasswordModalOpen(false)}
          currentUser={state.currentUser}
          onConfirm={handleChangePassword}
          isHospitalMode={isHospitalMode}
        />
      )}
    </Router>
  );
};

export default App;