
import React, { useEffect, useState, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { loadState, saveState } from './services/storageService';
import { AppState, UserRole, Member, LogEntry } from '@/types';
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
import { ElearningPage } from './pages/ElearningPage';
import { MuralPage } from './pages/MuralPage';
import { NotificationCenter } from './components/NotificationCenter';
import { GlobalSearch } from './components/GlobalSearch';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { supabase } from './services/supabaseClient';

const Layout: React.FC<{ 
  state: AppState; 
  onUpdateState: (s: AppState) => void; 
  children: React.ReactNode;
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
  isHospitalMode: boolean;
  onToggleHospitalMode: () => void;
  isNightMode: boolean;
  onToggleNightMode: () => void;
  onChangePasswordClick: () => void;
}> = ({ state, onUpdateState, children, isPrivacyMode, onTogglePrivacy, isHospitalMode, onToggleHospitalMode, isNightMode, onToggleNightMode, onChangePasswordClick }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifyBanner, setShowNotifyBanner] = useState(false);
  const location = useLocation();
  const isOnline = !!supabase;
  
  // Lembrete automático de visita próxima
  useEffect(() => {
    if (state.currentUser) {
        const today = new Date().toISOString().split('T')[0];
        const myVisitsToday = state.visits.filter(v => v.memberIds.includes(state.currentUser!.id) && v.date === today && !v.report);
        
        if (myVisitsToday.length > 0) {
            const hasNotified = sessionStorage.getItem(`notified_visit_${today}`);
            if (!hasNotified) {
                const route = state.routes.find(r => r.id === myVisitsToday[0].routeId);
                onUpdateState({
                    ...state,
                    notifications: [{
                        id: crypto.randomUUID(),
                        userId: state.currentUser!.id,
                        message: `Lembrete: Você tem uma visita hoje na ${route?.name || 'Rota'}. Começa em breve!`,
                        type: 'info',
                        read: false,
                        timestamp: new Date().toISOString()
                    }, ...state.notifications]
                });
                sessionStorage.setItem(`notified_visit_${today}`, 'true');
            }
        }
    }
  }, [state.currentUser, state.visits]);

  if (!state.currentUser) {
      return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const myNotifications = state.notifications.filter(n => n.userId === state.currentUser?.id);

  const handleLogout = () => {
      onUpdateState({ ...state, currentUser: null });
  };

  const menuItems = [
    { to: "/dashboard", label: "Agenda", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { to: "/patients", label: "Pacientes", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    { to: "/map", label: "Mapa", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> },
    { to: "/elearning", label: "Capacitação", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
    { to: "/mural", label: "Mural", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
    { to: "/stats", label: "Relatórios", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  ];

  if (state.currentUser?.role === UserRole.ADMIN) {
    menuItems.push({ to: "/admin", label: "Admin", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> });
  }

  return (
    <div className={`min-h-screen flex overflow-hidden ${isHospitalMode ? 'bg-[#1a1c1e] text-gray-200' : 'bg-gray-50 text-gray-900'} ${isNightMode ? 'night-shift-filter' : ''}`}>
      <style>{`
        .night-shift-filter { position: relative; }
        .night-shift-filter::after { content: ""; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 100, 0, 0.15); pointer-events: none; z-index: 9999; mix-blend-mode: multiply; }
      `}</style>

      <aside className={`fixed inset-y-0 left-0 shadow-xl z-40 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col ${isHospitalMode ? 'bg-[#212327] border-r border-gray-800' : 'bg-white'}`}>
        <div className={`p-6 border-b flex items-center justify-between ${isHospitalMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
            </div>
            <span className={`font-bold text-lg tracking-tight ${isHospitalMode ? 'text-blue-400' : 'text-gray-800'}`}>GVP Litoral</span>
          </Link>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-3 flex flex-col gap-1 overflow-y-auto flex-grow custom-scrollbar">
          {menuItems.map(item => (
            <Link 
              key={item.to} 
              to={item.to} 
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                location.pathname === item.to 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : isHospitalMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span className={location.pathname === item.to ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        <div className={`p-4 border-t ${isHospitalMode ? 'border-gray-800 bg-[#1a1c1e]' : 'border-gray-100 bg-gray-50/50'}`}>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onChangePasswordClick} className={`flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-semibold ${isHospitalMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-gray-500 border-gray-200'} border hover:bg-opacity-80 transition-colors`}>Senha</button>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-semibold text-red-600 bg-red-50/10 border border-red-900/20 hover:bg-red-900/20 transition-colors">Sair</button>
          </div>
        </div>
      </aside>

      <div className="flex-grow flex flex-col min-w-0">
        <header className={`h-16 shadow-sm flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-20 ${isHospitalMode ? 'bg-[#212327] border-b border-gray-800' : 'bg-white'}`}>
          <div className="flex items-center gap-4 flex-grow">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <GlobalSearch state={state} isHospitalMode={isHospitalMode} />
          </div>

          <div className="flex items-center gap-4">
             <button onClick={onToggleNightMode} className={`p-2 rounded-full transition-colors ${isNightMode ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`} title="Night Shift (Filtro Âmbar)">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
             </button>
             <button onClick={onToggleHospitalMode} className={`p-2 rounded-full transition-colors ${isHospitalMode ? 'bg-blue-900/30 text-blue-400' : 'text-gray-400 hover:bg-gray-100'}`} title="Modo Hospitalar (Dark)">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
             </button>
             <button onClick={onTogglePrivacy} className={`p-2 rounded-full transition-colors ${isPrivacyMode ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-100'}`}>
                {isPrivacyMode ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>}
             </button>
             <NotificationCenter notifications={myNotifications} onMarkAsRead={(id) => onUpdateState({ ...state, notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n) })} onClearAll={() => onUpdateState({ ...state, notifications: state.notifications.filter(n => n.userId !== state.currentUser?.id) })} />
             <div className="h-8 w-px bg-gray-100 hidden sm:block"></div>
             <div className="hidden sm:flex items-center gap-3 pl-2">
                <div className="text-right">
                  <p className={`text-sm font-bold leading-tight ${isHospitalMode ? 'text-gray-200' : 'text-gray-900'}`}>{state.currentUser.name}</p>
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{state.currentUser.role === UserRole.ADMIN ? 'Administrador' : 'Membro'}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm">{state.currentUser.name.substring(0, 2).toUpperCase()}</div>
             </div>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto custom-scrollbar p-4 md:p-8">
           <Routes>
             <Route path="/dashboard" element={<Dashboard state={state} onUpdateState={onUpdateState} isPrivacyMode={isPrivacyMode} isHospitalMode={isHospitalMode} />} />
             <Route path="/patients" element={<PatientRegistry state={state} onUpdateState={onUpdateState} isPrivacyMode={isPrivacyMode} isHospitalMode={isHospitalMode} />} />
             <Route path="/history" element={<PatientHistory state={state} isHospitalMode={isHospitalMode} />} />
             <Route path="/map" element={<MapPage state={state} isHospitalMode={isHospitalMode} />} />
             <Route path="/elearning" element={<ElearningPage state={state} isHospitalMode={isHospitalMode} />} />
             <Route path="/mural" element={<MuralPage state={state} onUpdateState={onUpdateState} isHospitalMode={isHospitalMode} />} />
             <Route path="/stats" element={<StatsReport state={state} isHospitalMode={isHospitalMode} />} />
             <Route path="/logs" element={<LogsPage state={state} isHospitalMode={isHospitalMode} />} />
             <Route path="/admin" element={<AdminPanel state={state} onUpdateState={onUpdateState} isHospitalMode={isHospitalMode} />} />
             <Route path="*" element={<Navigate to="/dashboard" replace />} />
           </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isHospitalMode, setIsHospitalMode] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  
  useEffect(() => {
    async function init() {
        const data = await loadState();
        setState(data);
        setIsLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (state && !isLoading) saveState(state);
  }, [state, isLoading]);

  const handleLogin = (user: Member) => {
      if (state) setState({ ...state, currentUser: user });
  };

  if (isLoading || !state) return <div className="min-h-screen flex items-center justify-center bg-[#1a1c1e]"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<LoginPage state={state} onLogin={handleLogin} />} />
        <Route path="/signup" element={<SignUpPage state={state} onUpdateState={setState} />} />
        <Route path="/*" element={
            <Layout 
                state={state} 
                onUpdateState={setState} 
                isPrivacyMode={isPrivacyMode} 
                onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
                isHospitalMode={isHospitalMode}
                onToggleHospitalMode={() => setIsHospitalMode(!isHospitalMode)}
                isNightMode={isNightMode}
                onToggleNightMode={() => setIsNightMode(!isNightMode)}
                onChangePasswordClick={() => setIsChangePasswordOpen(true)}
            >
                <></>
            </Layout>
        } />
      </Routes>
      {state.currentUser && <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} currentUser={state.currentUser} onConfirm={(newPass) => {
          const updated = state.members.map(m => m.id === state.currentUser!.id ? { ...m, password: newPass } : m);
          setState({ ...state, members: updated, currentUser: { ...state.currentUser!, password: newPass } });
          setIsChangePasswordOpen(false);
      }} isHospitalMode={isHospitalMode} />}
    </Router>
  );
};

export default App;
