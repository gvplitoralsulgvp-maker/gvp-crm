
import React, { useEffect, useState, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { loadState, saveState } from './services/storageService';
import { AppState, UserRole, Member } from './types';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/AdminPanel';
import { PatientRegistry } from './pages/PatientRegistry';
import { PatientHistory } from './pages/PatientHistory';
import { StatsReport } from './pages/StatsReport';
import { LogsPage } from './pages/LogsPage';
import { Welcome } from './pages/Welcome';
import { LoginPage } from './pages/LoginPage';
import { MapPage } from './pages/MapPage';
import { NotificationCenter } from './components/NotificationCenter';
import { GlobalSearch } from './components/GlobalSearch';
import { supabase } from './services/supabaseClient';

// Helper for highlighting active link
const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
        isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
};

const Layout: React.FC<{ 
  state: AppState; 
  onUpdateState: (s: AppState) => void; 
  children: React.ReactNode;
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
}> = ({ state, onUpdateState, children, isPrivacyMode, onTogglePrivacy }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isOnline = !!supabase;
  
  // Auth Check
  if (!state.currentUser) {
      return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Notification Handlers
  const myNotifications = state.notifications.filter(n => n.userId === state.currentUser?.id);

  const handleMarkAsRead = (id: string) => {
    const newNotifs = state.notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    onUpdateState({ ...state, notifications: newNotifs });
  };

  const handleClearAll = () => {
    const newNotifs = state.notifications.filter(n => n.userId !== state.currentUser?.id);
    onUpdateState({ ...state, notifications: newNotifs });
  };
  
  const handleLogout = () => {
      onUpdateState({ ...state, currentUser: null });
  };

  return (
      <div className="min-h-screen flex flex-col bg-gray-50 relative">
        {/* Navigation Bar */}
        <header className="bg-white shadow-sm sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center overflow-hidden flex-grow">
                <Link to="/dashboard" className="flex-shrink-0 flex items-center gap-2 mr-4 group">
                   <div className="bg-blue-600 text-white p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                     </svg>
                   </div>
                   <div className="flex flex-col">
                       <span className="font-bold text-lg text-gray-800 tracking-tight leading-none">GVP CRM</span>
                       <span className="text-xs sm:text-[10px] text-blue-600 font-bold uppercase tracking-wide">
                         Bem vindo, {state.currentUser.name.split(' ')[0]}
                       </span>
                   </div>
                </Link>
                
                <GlobalSearch state={state} />

                <div className="hidden md:flex md:space-x-1 overflow-x-auto ml-2">
                  <NavLink to="/dashboard">Agenda</NavLink>
                  <NavLink to="/patients">Pacientes</NavLink>
                  <NavLink to="/map">Mapa</NavLink>
                  <NavLink to="/stats">Relatórios</NavLink>
                  <NavLink to="/logs">Logs</NavLink>
                  {state.currentUser?.role === UserRole.ADMIN && (
                    <NavLink to="/admin">Admin</NavLink>
                  )}
                </div>
              </div>

              {/* Right Side: Privacy, Notifications & User */}
              <div className="flex items-center gap-4 flex-shrink-0">
                 
                 {/* Privacy Toggle */}
                 <button
                    onClick={onTogglePrivacy}
                    className={`p-2 rounded-full transition-colors ${isPrivacyMode ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-100'}`}
                    title={isPrivacyMode ? "Modo Privacidade Ativo" : "Ativar Modo Privacidade"}
                 >
                    {isPrivacyMode ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                            <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                    )}
                 </button>

                 <NotificationCenter 
                    notifications={myNotifications.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())} 
                    onMarkAsRead={handleMarkAsRead}
                    onClearAll={handleClearAll}
                 />

                 <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

                 <div className="hidden sm:flex items-center gap-3">
                    <button 
                        onClick={handleLogout}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors"
                        title="Sair"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                    </button>
                 </div>
                 
                 <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-gray-500 hover:text-gray-700">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                    </svg>
                 </button>
              </div>
            </div>
          </div>
          
          {isMenuOpen && (
            <div className="md:hidden bg-white border-t border-gray-100 pb-4 shadow-lg">
               <div className="px-4 py-2 flex flex-col space-y-1">
                  <Link to="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>Agenda</Link>
                  <Link to="/patients" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>Pacientes</Link>
                  <Link to="/map" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>Mapa</Link>
                  <Link to="/stats" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>Relatórios</Link>
                  <Link to="/logs" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>Logs</Link>
                  {state.currentUser?.role === UserRole.ADMIN && (
                    <Link to="/admin" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>Administração</Link>
                  )}
                  <div className="border-t border-gray-100 pt-3 mt-2 px-3">
                     <p className="text-sm font-bold text-gray-800">{state.currentUser.name}</p>
                     <p className="text-xs text-gray-500 mb-3">{state.currentUser.role}</p>
                     <button 
                        onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                        className="w-full text-center text-sm bg-red-50 text-red-600 font-medium py-2 rounded hover:bg-red-100"
                     >
                         Sair do Sistema
                     </button>
                  </div>
               </div>
            </div>
          )}
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow">
           {children}
        </main>

        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
             <p className="text-center text-sm text-gray-500">
               &copy; {new Date().getFullYear()} Grupo GVP. Soft-CRM Enterprise.
             </p>
          </div>
        </footer>

        {/* CONNECTION STATUS BADGE */}
        <div className="fixed bottom-4 left-4 z-50 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-3 transition-all hover:shadow-xl group cursor-help">
            <span className="relative flex h-3 w-3">
              {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            </span>
            <div className="flex flex-col leading-none">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'text-green-700' : 'text-gray-500'}`}>
                    {isOnline ? 'Sistema Online' : 'Modo Offline'}
                </span>
                <span className="text-[9px] text-gray-500 group-hover:text-blue-600 transition-colors">
                    {isOnline ? 'Sincronizado na Nuvem' : 'Dados no Dispositivo'}
                </span>
            </div>
        </div>
      </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null); // Null initially
  const [isLoading, setIsLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  
  // Initialize Data
  useEffect(() => {
    async function init() {
        const data = await loadState();
        setState(data);
        setIsLoading(false);
    }
    init();
  }, []);

  // Auto Logout Logic
  const logoutTimerRef = useRef<any>(null);
  const AUTO_LOGOUT_TIME = 15 * 60 * 1000; // 15 minutes

  const resetLogoutTimer = () => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (state?.currentUser) {
        logoutTimerRef.current = setTimeout(() => {
            alert("Sessão expirada por inatividade.");
            setState(prev => prev ? ({ ...prev, currentUser: null }) : null);
        }, AUTO_LOGOUT_TIME);
    }
  };

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => resetLogoutTimer();

    events.forEach(event => document.addEventListener(event, handleActivity));
    resetLogoutTimer(); 

    return () => {
        events.forEach(event => document.removeEventListener(event, handleActivity));
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [state?.currentUser]);

  useEffect(() => {
    if (state && !isLoading) {
        saveState(state);
    }
  }, [state, isLoading]);

  const handleLogin = (user: Member) => {
      if (state) {
        setState({ ...state, currentUser: user });
      }
  };

  if (isLoading || !state) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 font-medium">Conectando ao banco de dados...</p>
          </div>
      );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<LoginPage state={state} onLogin={handleLogin} />} />
        
        <Route path="/dashboard" element={
            <Layout state={state} onUpdateState={setState} isPrivacyMode={isPrivacyMode} onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}>
                <Dashboard state={state} onUpdateState={setState} isPrivacyMode={isPrivacyMode} />
            </Layout>
        } />
        <Route path="/patients" element={
            <Layout state={state} onUpdateState={setState} isPrivacyMode={isPrivacyMode} onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}>
                <PatientRegistry state={state} onUpdateState={setState} isPrivacyMode={isPrivacyMode} />
            </Layout>
        } />
        <Route path="/history" element={
            <Layout state={state} onUpdateState={setState} isPrivacyMode={isPrivacyMode} onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}>
                <PatientHistory state={state} />
            </Layout>
        } />
        <Route path="/map" element={
            <Layout state={state} onUpdateState={setState} isPrivacyMode={isPrivacyMode} onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}>
                <MapPage state={state} />
            </Layout>
        } />
        <Route path="/stats" element={
            <Layout state={state} onUpdateState={setState} isPrivacyMode={isPrivacyMode} onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}>
                <StatsReport state={state} />
            </Layout>
        } />
        <Route path="/logs" element={
            <Layout state={state} onUpdateState={setState} isPrivacyMode={isPrivacyMode} onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}>
                <LogsPage state={state} />
            </Layout>
        } />
        <Route path="/admin" element={
            <Layout state={state} onUpdateState={setState} isPrivacyMode={isPrivacyMode} onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}>
                <AdminPanel state={state} onUpdateState={setState} />
            </Layout>
        } />
      </Routes>
    </Router>
  );
};

export default App;
