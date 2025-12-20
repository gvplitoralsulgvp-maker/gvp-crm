
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { loadState, saveState, createDefaultState } from './services/storageService';
import { AppState, UserRole, Member } from './types';
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
import { GlobalSearch } from './components/GlobalSearch';
import { ChangePasswordModal } from './components/ChangePasswordModal';

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
}> = ({ state, onUpdateState, isPrivacyMode, onTogglePrivacy, isHospitalMode, onToggleHospitalMode, isNightMode, onToggleNightMode, onChangePasswordClick }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  if (!state.currentUser) return <Navigate to="/login" replace />;

  const handleLogout = () => onUpdateState({ ...state, currentUser: null });

  const menuItems = [
    { to: "/dashboard", label: "Agenda", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { to: "/patients", label: "Pacientes", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { to: "/map", label: "Mapa", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
    { to: "/stats", label: "KPIs", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  ];

  if (state.currentUser.role === UserRole.ADMIN) {
    menuItems.push({ to: "/admin", label: "Admin", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" });
  }

  return (
    <div className={`h-screen flex overflow-hidden ${isHospitalMode ? 'bg-[#1a1c1e] text-gray-200' : 'bg-gray-50 text-gray-900'} ${isNightMode ? 'night-shift' : ''}`}>
      <style>{`
        .night-shift::after { content: ""; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 120, 0, 0.1); pointer-events: none; z-index: 9999; mix-blend-mode: multiply; }
      `}</style>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col ${isHospitalMode ? 'bg-[#212327] border-r border-gray-800' : 'bg-white shadow-xl'}`}>
        <div className="p-6 border-b flex items-center justify-between border-gray-800/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="font-bold text-lg">SOFT-CRM GVP</span>
          </div>
          <button className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="flex-grow p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map(item => (
            <Link 
              key={item.to} to={item.to} onClick={() => setIsSidebarOpen(false)}
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

      <div className="flex-grow flex flex-col min-w-0 h-full relative overflow-hidden">
        <header className={`h-16 flex items-center justify-between px-6 flex-shrink-0 z-30 ${isHospitalMode ? 'bg-[#212327] border-b border-gray-800' : 'bg-white shadow-sm'}`}>
          <div className="flex items-center gap-4 flex-grow">
            <button className="md:hidden p-2 hover:bg-gray-100 rounded-lg shrink-0" onClick={() => setIsSidebarOpen(true)}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <GlobalSearch state={state} isHospitalMode={isHospitalMode} />
          </div>

          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            <button onClick={onToggleNightMode} title="Modo Noturno" className={`p-2 rounded-full transition-colors ${isNightMode ? 'bg-orange-500 text-white' : isHospitalMode ? 'text-gray-400 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-100'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
            </button>
            <button onClick={onToggleHospitalMode} title="Modo Hospitalar" className={`p-2 rounded-full transition-colors ${isHospitalMode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            </button>
            <button onClick={onTogglePrivacy} title="Modo Privacidade" className={`p-2 rounded-full transition-colors ${isPrivacyMode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs uppercase shadow-lg select-none">
              {state.currentUser.name.substring(0,2)}
            </div>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto custom-scrollbar p-4 md:p-6 bg-transparent">
          <Routes>
            <Route path="/dashboard" element={<Dashboard state={state} onUpdateState={onUpdateState} isPrivacyMode={isPrivacyMode} isHospitalMode={isHospitalMode} />} />
            <Route path="/patients" element={<PatientRegistry state={state} onUpdateState={onUpdateState} isPrivacyMode={isPrivacyMode} isHospitalMode={isHospitalMode} />} />
            <Route path="/history" element={<PatientHistory state={state} isHospitalMode={isHospitalMode} />} />
            <Route path="/map" element={<MapPage state={state} isHospitalMode={isHospitalMode} />} />
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
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isHospitalMode, setIsHospitalMode] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  useEffect(() => { 
    loadState().then(data => {
      setState(data);
    });
  }, []);

  const handleUpdateState = (newState: AppState) => {
    setState(newState);
    saveState(newState);
  };

  if (!state) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <div className="font-bold text-blue-600 text-xl animate-pulse">Carregando SOFT-CRM Enterprise...</div>
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<LoginPage state={state} onLogin={(u) => handleUpdateState({...state, currentUser: u})} />} />
        <Route path="/signup" element={<SignUpPage state={state} onUpdateState={handleUpdateState} />} />
        <Route path="/*" element={
          <Layout 
            state={state} onUpdateState={handleUpdateState}
            isPrivacyMode={isPrivacyMode} onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
            isHospitalMode={isHospitalMode} onToggleHospitalMode={() => setIsHospitalMode(!isHospitalMode)}
            isNightMode={isNightMode} onToggleNightMode={() => setIsNightMode(!isNightMode)}
            onChangePasswordClick={() => setIsChangePasswordOpen(true)}
          />
        } />
      </Routes>
      {isChangePasswordOpen && state.currentUser && (
        <ChangePasswordModal 
          isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} 
          currentUser={state.currentUser} onConfirm={(p) => {
            const updated = state.members.map(m => m.id === state.currentUser?.id ? {...m, password: p} : m);
            handleUpdateState({...state, members: updated, currentUser: {...state.currentUser!, password: p}});
            setIsChangePasswordOpen(false);
          }}
          isHospitalMode={isHospitalMode}
        />
      )}
    </Router>
  );
};

export default App;
