
import React, { useState, useMemo } from 'react';
import { AppState, UserRole } from '../types';
import { Button } from '../components/Button';
import { KpiDetailModal } from '../components/KpiDetailModal';

// --- COMPONENTES GRÁFICOS AVANÇADOS (SVG PURO) ---

// 1. Gráfico de Tendência (Área com Gradiente)
const TrendChart: React.FC<{ data: number[], isHospitalMode?: boolean }> = ({ data, isHospitalMode }) => {
  const height = 80;
  const width = 300;
  const max = Math.max(...data, 1);
  
  // Pontos da linha
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (val / max) * height; // Invertido pois SVG Y cresce para baixo
    return `${x},${y}`;
  }).join(' ');

  // Pontos para a área fechada (adiciona cantos inferiores)
  const areaPoints = `${points} ${width},${height} 0,${height}`;

  return (
    <div className={`p-6 rounded-3xl border shadow-sm relative overflow-hidden flex flex-col justify-between h-64 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className="flex justify-between items-start z-10">
        <div>
            <h3 className={`text-sm font-black uppercase tracking-widest ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Tendência de Atividade</h3>
            <p className={`text-xs ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Últimos {data.length} dias</p>
        </div>
        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${data[data.length-1] >= data[0] ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {data[data.length-1] >= data[0] ? '▲ Crescimento' : '▼ Queda'}
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-40 w-full">
         <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
            <defs>
               <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
               </linearGradient>
            </defs>
            {/* Grid Lines Horizontais */}
            <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke={isHospitalMode ? "#333" : "#f3f4f6"} strokeWidth="0.5" strokeDasharray="2" />
            <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke={isHospitalMode ? "#333" : "#f3f4f6"} strokeWidth="0.5" strokeDasharray="2" />
            <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke={isHospitalMode ? "#333" : "#f3f4f6"} strokeWidth="0.5" strokeDasharray="2" />

            {/* Área */}
            <path d={`M0,${height} ${points} L${width},${height} Z`} fill="url(#trendGradient)" />
            {/* Linha */}
            <polyline points={points} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
         </svg>
      </div>
    </div>
  );
};

// 2. Anéis de Saúde Hospitalar
const HospitalHealthRing: React.FC<{ hospitalName: string, daysSince: number, isHospitalMode?: boolean }> = ({ hospitalName, daysSince, isHospitalMode }) => {
  // Lógica: 0-7 dias = 100% health, >30 dias = 0% health
  const maxDays = 30;
  const health = Math.max(0, Math.min(100, 100 - ((daysSince / maxDays) * 100)));
  
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (health / 100) * circumference;
  
  const color = daysSince <= 7 ? 'text-green-500' : daysSince <= 15 ? 'text-yellow-500' : 'text-red-500';
  const bgColor = isHospitalMode ? 'text-gray-800' : 'text-gray-100';

  return (
    <div className="flex flex-col items-center gap-3 group cursor-default">
      <div className="relative w-24 h-24 transition-transform group-hover:scale-105">
        <svg className="w-full h-full transform -rotate-90">
           {/* Fundo */}
           <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className={bgColor} />
           {/* Progresso */}
           <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" 
                   strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                   className={`${color} transition-all duration-1000 ease-out`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
           <span className={`text-2xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{daysSince === 999 ? '-' : daysSince}</span>
           <span className="text-[9px] uppercase font-bold text-gray-400">Dias</span>
        </div>
      </div>
      <div className="text-center">
          <p className={`text-[10px] font-bold uppercase truncate max-w-[120px] ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{hospitalName}</p>
          <p className={`text-[9px] ${color} font-black uppercase`}>{daysSince > 30 ? 'Crítico' : daysSince > 7 ? 'Atenção' : 'Em dia'}</p>
      </div>
    </div>
  );
};

// 3. Mapa de Calor (Grid)
const ActivityHeatmap: React.FC<{ data: number[][], isHospitalMode?: boolean }> = ({ data, isHospitalMode }) => {
  // data: Matriz 4 semanas (linhas) x 7 dias (colunas)
  const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  
  const getOpacityClass = (count: number) => {
     if (count === 0) return isHospitalMode ? 'bg-gray-800' : 'bg-gray-100';
     if (count <= 2) return 'bg-blue-300';
     if (count <= 5) return 'bg-blue-500';
     return 'bg-blue-700';
  };

  return (
    <div className={`p-6 rounded-3xl border shadow-sm ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex justify-between items-end mb-4">
            <h3 className={`text-sm font-black uppercase tracking-widest ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Mapa de Calor (Mês)</h3>
            <div className="flex gap-1">
                {[0, 3, 6].map(i => <div key={i} className={`w-2 h-2 rounded-full ${getOpacityClass(i)}`}></div>)}
            </div>
        </div>
        
        <div className="grid grid-cols-8 gap-2">
            <div className="text-[9px] font-bold text-gray-400 uppercase self-center">Sem</div>
            {days.map((d, i) => <div key={i} className="text-[9px] font-bold text-center text-gray-400 uppercase">{d}</div>)}
            
            {data.map((week, wIdx) => (
                <React.Fragment key={wIdx}>
                    <div className="text-[9px] font-bold text-gray-500 uppercase self-center">S{wIdx + 1}</div>
                    {week.map((count, dIdx) => (
                        <div 
                            key={`${wIdx}-${dIdx}`} 
                            className={`h-8 rounded-md transition-all hover:scale-110 cursor-pointer flex items-center justify-center group relative ${getOpacityClass(count)}`}
                        >
                            {count > 0 && <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-white">{count}</span>}
                        </div>
                    ))}
                </React.Fragment>
            ))}
        </div>
    </div>
  );
};

// Componente Cartão de Métrica Simples (Mantido para KPIs numéricos)
const MetricCard: React.FC<{ title: string; value: number | string; colorClass: string; isHospitalMode?: boolean; onClick?: () => void }> = ({ title, value, colorClass, isHospitalMode, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-full p-5 rounded-2xl border shadow-sm flex flex-col justify-between h-28 transition-all hover:shadow-md active:scale-95 text-left ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-200 hover:border-blue-200'}`}
    >
        <span className={`text-[10px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>{title}</span>
        <span className={`text-3xl font-black ${colorClass}`}>{value}</span>
    </button>
);

export const StatsReport: React.FC<{ state: AppState, isHospitalMode?: boolean }> = ({ state, isHospitalMode }) => {
  const [activeTab, setActiveTab] = useState<'kpis' | 'socialWorkers' | 'missed' | 'coverage'>('kpis');
  const [activeRange, setActiveRange] = useState<number>(30);
  const [isPrintMode, setIsPrintMode] = useState(false);
  
  // Estado do Modal de Detalhes
  const [selectedKpiType, setSelectedKpiType] = useState<'visits' | 'new_patients' | 'hospitals' | 'active_patients' | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const isCoordinator = state.currentUser?.role === UserRole.COORDINATOR;
  const userRegional = state.currentUser?.regional;

  // --- FILTERING DATA BASED ON REGION ---
  
  const filteredHospitals = useMemo(() => {
      if (isCoordinator && userRegional) {
          return state.hospitals.filter(h => !h.regional || h.regional === userRegional);
      }
      return state.hospitals;
  }, [state.hospitals, isCoordinator, userRegional]);

  const filteredRoutes = useMemo(() => {
      if (isCoordinator && userRegional) {
          return state.routes.filter(r => {
              if (!r.hospitals) return false;
              return r.hospitals.some(hName => filteredHospitals.some(fh => fh.name === hName));
          });
      }
      return state.routes;
  }, [state.routes, filteredHospitals, isCoordinator, userRegional]);

  const filteredVisits = useMemo(() => {
      if (isCoordinator && userRegional) {
          const visibleRouteIds = filteredRoutes.map(r => r.id);
          return state.visits.filter(v => visibleRouteIds.includes(v.routeId));
      }
      return state.visits;
  }, [state.visits, filteredRoutes, isCoordinator, userRegional]);

  const filteredSocialVisits = useMemo(() => {
      if (isCoordinator && userRegional) {
          const visibleHospitalIds = filteredHospitals.map(h => h.id);
          return state.socialWorkerVisits.filter(v => visibleHospitalIds.includes(v.hospitalId));
      }
      return state.socialWorkerVisits;
  }, [state.socialWorkerVisits, filteredHospitals, isCoordinator, userRegional]);

  const filteredPatients = useMemo(() => {
      if (isCoordinator && userRegional) {
          return state.patients.filter(p => !p.regional || p.regional === userRegional);
      }
      return state.patients;
  }, [state.patients, isCoordinator, userRegional]);

  // --- CALCULATION LOGIC ---

  const cutoffDate = useMemo(() => {
      const d = new Date();
      d.setDate(d.getDate() - activeRange);
      return d;
  }, [activeRange]);

  const currentVisits = useMemo(() => {
    return filteredVisits.filter(v => v.status === 'FINISHED' && new Date(v.date) >= cutoffDate);
  }, [filteredVisits, cutoffDate]);

  // Daily Counts for TrendChart
  const dailyCounts = useMemo(() => {
      const counts = new Array(activeRange).fill(0);
      const now = new Date();
      // Start from oldest
      const start = new Date(now);
      start.setDate(start.getDate() - activeRange + 1);

      currentVisits.forEach(v => {
          const vDate = new Date(v.date + 'T12:00:00');
          const diff = Math.floor((vDate.getTime() - start.getTime()) / (1000 * 3600 * 24));
          if (diff >= 0 && diff < activeRange) {
              counts[diff]++;
          }
      });
      return counts;
  }, [currentVisits, activeRange]);

  // Heatmap Data (4 Weeks x 7 Days)
  const heatMapData = useMemo(() => {
      const matrix = [
          [0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0]
      ];
      const now = new Date();
      const currentMonth = now.getMonth();
      
      currentVisits.forEach(v => {
          const d = new Date(v.date + 'T12:00:00');
          if (d.getMonth() === currentMonth) {
              const day = d.getDay(); // 0-6
              const date = d.getDate();
              const week = Math.min(3, Math.floor((date - 1) / 7));
              matrix[week][day]++;
          }
      });
      return matrix;
  }, [currentVisits]);

  const currentSocialVisits = useMemo(() => {
    return filteredSocialVisits.filter(v => v.status === 'FINISHED' && new Date(v.date) >= cutoffDate);
  }, [filteredSocialVisits, cutoffDate]);

  const missedVisits = useMemo(() => {
    return filteredVisits.filter(v => 
      v.date < todayStr && 
      (v.memberIds?.length || 0) > 0 && 
      v.status !== 'FINISHED' && 
      !v.report
    );
  }, [filteredVisits, todayStr]);

  const newPatientsList = useMemo(() => {
      return filteredPatients.filter(p => new Date(p.admissionDate) >= cutoffDate);
  }, [filteredPatients, cutoffDate]);

  const activePatientsList = useMemo(() => {
      return filteredPatients.filter(p => p.active);
  }, [filteredPatients]);

  const hospitalCoverage = useMemo(() => {
      const today = new Date();
      return filteredHospitals.map(h => {
          const routeIds = filteredRoutes.filter(r => r.hospitals && r.hospitals.includes(h.name)).map(r => r.id);
          const visits = filteredVisits.filter(v => routeIds.includes(v.routeId) && v.status === 'FINISHED');
          const lastVisit = visits.sort((a,b) => b.date.localeCompare(a.date))[0];
          let daysSince = 999;
          if (lastVisit) {
              const lastDate = new Date(lastVisit.date + 'T12:00:00');
              const diffTime = Math.abs(today.getTime() - lastDate.getTime());
              daysSince = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          }
          return { ...h, daysSince, lastVisitDate: lastVisit?.date };
      }).sort((a,b) => b.daysSince - a.daysSince);
  }, [filteredHospitals, filteredRoutes, filteredVisits]);

  const handlePrint = () => {
      setIsPrintMode(true);
      setTimeout(() => { window.print(); setIsPrintMode(false); }, 500);
  };

  const detailedKpiData = useMemo(() => {
      const visitsItems = currentVisits.map(v => {
          const route = filteredRoutes.find(r => r.id === v.routeId);
          const members = v.memberIds.map(id => state.members.find(m => m.id === id)?.name).filter(Boolean).join(', ');
          return {
              id: v.id,
              primaryText: new Date(v.date + 'T12:00:00').toLocaleDateString(),
              secondaryText: route?.name || 'Rota Desconhecida',
              tertiaryText: members,
              tag: 'Realizada',
              tagColor: 'bg-blue-100 text-blue-700'
          };
      });

      const newPatientsItems = newPatientsList.map(p => ({
          id: p.id,
          primaryText: p.name,
          secondaryText: p.hospitalName || 'Hospital não inf.',
          tertiaryText: `Entrada: ${new Date(p.admissionDate).toLocaleDateString()}`,
          tag: 'Novo Caso',
          tagColor: 'bg-green-100 text-green-700'
      }));

      const hospitalItems = filteredHospitals.map(h => ({
          id: h.id,
          primaryText: h.name,
          secondaryText: h.city,
          tertiaryText: h.regional,
          tag: 'Ativo',
          tagColor: 'bg-purple-100 text-purple-700'
      }));

      const activePatientsItems = activePatientsList.map(p => ({
          id: p.id,
          primaryText: p.name,
          secondaryText: p.hospitalName || 'Hospital não inf.',
          tertiaryText: p.congregation,
          tag: 'Em Aberto',
          tagColor: 'bg-orange-100 text-orange-700'
      }));

      return {
          visits: visitsItems,
          new_patients: newPatientsItems,
          hospitals: hospitalItems,
          active_patients: activePatientsItems
      };
  }, [currentVisits, newPatientsList, filteredHospitals, activePatientsList, filteredRoutes, state.members]);

  if (isPrintMode) {
      return (
          <div className="p-10 bg-white min-h-screen text-black space-y-8">
              <div className="border-b-2 border-black pb-4 flex justify-between items-end">
                  <div>
                      <h1 className="text-3xl font-bold uppercase">Relatório GVP Litoral Sul</h1>
                      <p>Período: Últimos {activeRange} dias {isCoordinator && userRegional ? `(${userRegional})` : ''}</p>
                  </div>
                  <p className="text-xs">Gerado em: {new Date().toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="border p-4"><b>Visitas Realizadas:</b> {currentVisits.length}</div>
                <div className="border p-4"><b>Casos Recebidos:</b> {newPatientsList.length}</div>
              </div>
              <h2 className="text-xl font-bold border-b mt-10">Cobertura Hospitalar</h2>
              <table className="w-full border-collapse">
                  <thead><tr className="bg-gray-100 text-left"><th className="border p-2">Hospital</th><th className="border p-2">Cidade</th><th className="border p-2">Última Visita</th><th className="border p-2">Dias sem Visita</th></tr></thead>
                  <tbody>
                      {hospitalCoverage.map(h => (
                          <tr key={h.id}>
                              <td className="border p-2 text-sm">{h.name}</td>
                              <td className="border p-2 text-sm">{h.city}</td>
                              <td className="border p-2 text-sm">{h.lastVisitDate ? new Date(h.lastVisitDate + 'T12:00:00').toLocaleDateString() : 'Nunca'}</td>
                              <td className={`border p-2 text-sm font-bold ${h.daysSince > 30 ? 'text-red-600' : 'text-green-600'}`}>{h.daysSince === 999 ? 'N/A' : h.daysSince}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      );
  }

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      <div className={`p-6 rounded-xl shadow-sm border flex flex-col md:flex-row justify-between gap-4 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
          <div>
              <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Dashboard de Impacto</h2>
              <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Visão geral de métricas. {isCoordinator && userRegional && <span className="ml-1 font-bold">({userRegional})</span>}
              </p>
          </div>
          <Button onClick={handlePrint} className="bg-blue-600 text-white">Exportar PDF</Button>
      </div>
      
      <div className="flex gap-4 border-b border-gray-800/10 overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab('kpis')} className={`pb-3 text-xs font-black uppercase tracking-widest whitespace-nowrap ${activeTab === 'kpis' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400'}`}>Visão Geral (KPIs)</button>
          <button onClick={() => setActiveTab('coverage')} className={`pb-3 text-xs font-black uppercase tracking-widest whitespace-nowrap ${activeTab === 'coverage' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-400'}`}>Cobertura Hospitalar</button>
          <button onClick={() => setActiveTab('socialWorkers')} className={`pb-3 text-xs font-black uppercase tracking-widest whitespace-nowrap ${activeTab === 'socialWorkers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400'}`}>Interações AS</button>
          <button onClick={() => setActiveTab('missed')} className={`pb-3 text-xs font-black uppercase tracking-widest whitespace-nowrap ${activeTab === 'missed' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-400'}`}>Visitas Perdidas</button>
      </div>

      {activeTab === 'kpis' && (
        <div className="space-y-6">
            {/* CARDS NO TOPO */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Total de Atendimentos" value={currentVisits.length} colorClass="text-blue-600" isHospitalMode={isHospitalMode} onClick={() => setSelectedKpiType('visits')} />
                <MetricCard title="Casos Recebidos" value={newPatientsList.length} colorClass="text-green-600" isHospitalMode={isHospitalMode} onClick={() => setSelectedKpiType('new_patients')} />
                <MetricCard title="Hospitais Cadastrados" value={filteredHospitals.length} colorClass="text-purple-600" isHospitalMode={isHospitalMode} onClick={() => setSelectedKpiType('hospitals')} />
                <MetricCard title="Casos em Aberto" value={activePatientsList.length} colorClass="text-orange-600" isHospitalMode={isHospitalMode} onClick={() => setSelectedKpiType('active_patients')} />
            </div>

            {/* GRÁFICOS AVANÇADOS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. TrendChart (Área) */}
                <div className="col-span-1 lg:col-span-2">
                    <TrendChart data={dailyCounts} isHospitalMode={isHospitalMode} />
                </div>

                {/* 2. Heatmap */}
                <div className="col-span-1">
                    <ActivityHeatmap data={heatMapData} isHospitalMode={isHospitalMode} />
                </div>
            </div>
        </div>
      )}

      {activeTab === 'coverage' && (
          <div className="space-y-8">
              {/* SECTION: ANÉIS DE SAÚDE (TOP 4 MAIS CRÍTICOS) */}
              <div className="space-y-4">
                  <h3 className={`text-sm font-black uppercase tracking-widest ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Hospitais Prioritários</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center p-6 rounded-3xl border shadow-sm ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-200'}">
                      {hospitalCoverage.slice(0, 4).map(h => (
                          <HospitalHealthRing key={h.id} hospitalName={h.name} daysSince={h.daysSince} isHospitalMode={isHospitalMode} />
                      ))}
                      {hospitalCoverage.length === 0 && <p className="col-span-4 text-xs text-gray-400 italic">Nenhum hospital cadastrado.</p>}
                  </div>
              </div>

              {/* LISTA COMPLETA */}
              <div className={`rounded-xl border overflow-hidden ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                  <div className="overflow-x-auto custom-scrollbar">
                      <table className="min-w-full divide-y divide-gray-800/10">
                          <thead className="bg-gray-50/5 text-[10px] font-black uppercase text-gray-400">
                              <tr><th className="px-6 py-4 text-left">Hospital</th><th className="px-6 py-4 text-left">Última Visita</th><th className="px-6 py-4 text-left">Dias sem Visita</th><th className="px-6 py-4 text-left">Status</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/10 text-sm">
                              {hospitalCoverage.map(h => {
                                  const isCritical = h.daysSince > 30;
                                  const isWarning = h.daysSince > 7;
                                  return (
                                      <tr key={h.id} className={isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                                          <td className={`px-6 py-4 font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{h.name} <span className="text-[10px] font-normal text-gray-500 block uppercase">{h.city}</span></td>
                                          <td className="px-6 py-4 text-gray-500">{h.lastVisitDate ? new Date(h.lastVisitDate + 'T12:00:00').toLocaleDateString() : 'Nunca'}</td>
                                          <td className="px-6 py-4 font-mono font-bold">{h.daysSince === 999 ? '-' : h.daysSince}</td>
                                          <td className="px-6 py-4">
                                              {isCritical ? (
                                                  <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-[10px] font-black uppercase">Crítico (&gt;30d)</span>
                                              ) : isWarning ? (
                                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-[10px] font-black uppercase">Atenção (&gt;7d)</span>
                                              ) : (
                                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-black uppercase">Em Dia</span>
                                              )}
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'missed' && (
        <div className="space-y-6">
           <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-red-500 text-white rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-red-700">Visitas em Dias Anteriores sem Relatório</p>
                <p className="text-xs text-red-600 opacity-80">Estes agendamentos constam como "Perdidos" pois o dia passou e não houve fechamento.</p>
              </div>
           </div>

           <div className={`rounded-xl border overflow-hidden ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
              <div className="overflow-x-auto custom-scrollbar">
                  <table className="min-w-full divide-y divide-gray-800/10">
                     <thead className="bg-gray-50/5 text-[10px] font-black uppercase text-gray-400">
                        <tr><th className="px-6 py-4 text-left">Data</th><th className="px-6 py-4 text-left">Rota</th><th className="px-6 py-4 text-left">Membros Escalados</th><th className="px-6 py-4 text-left">Ocorrência</th></tr>
                     </thead>
                     <tbody className="divide-y divide-gray-800/10 text-sm">
                        {missedVisits.sort((a,b) => b.date.localeCompare(a.date)).map(v => (
                          <tr key={v.id}>
                            <td className="px-6 py-4 font-bold text-red-500">{new Date(v.date + 'T12:00:00').toLocaleDateString()}</td>
                            <td className="px-6 py-4 font-bold">{filteredRoutes.find(r => r.id === v.routeId)?.name}</td>
                            <td className="px-6 py-4 text-gray-500">{(v.memberIds || []).map(id => state.members.find(m => m.id === id)?.name).join(' & ')}</td>
                            <td className="px-6 py-4">
                               <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-[10px] font-black uppercase">Visita não efetuada</span>
                            </td>
                          </tr>
                        ))}
                        {missedVisits.length === 0 && (
                            <tr><td colSpan={4} className="p-10 text-center text-gray-400 italic">Nenhuma visita perdida registrada. Parabéns à equipe!</td></tr>
                        )}
                     </tbody>
                  </table>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'socialWorkers' && (
        <div className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-indigo-600 p-6 rounded-xl text-white shadow-lg"><p className="text-xs font-bold uppercase opacity-80">Interações Institucionais</p><p className="text-5xl font-bold mt-2">{currentSocialVisits.length}</p></div>
              <div className={`p-6 rounded-xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800 text-white' : 'bg-white border-gray-100 text-gray-800'}`}><p className="text-xs font-bold uppercase text-gray-500">Média de Periodicidade</p><p className="text-4xl font-bold mt-2">28 dias</p></div>
           </div>

           <div className={`rounded-xl border overflow-hidden ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
              <div className="overflow-x-auto custom-scrollbar">
                  <table className="min-w-full divide-y divide-gray-800/10">
                     <thead className="bg-gray-50/5 text-[10px] font-black uppercase text-gray-400">
                        <tr><th className="px-6 py-4 text-left">Data</th><th className="px-6 py-4 text-left">Hospital</th><th className="px-6 py-4 text-left">Relato da Interação</th></tr>
                     </thead>
                     <tbody className="divide-y divide-gray-800/10 text-sm">
                        {currentSocialVisits.sort((a,b) => b.date.localeCompare(a.date)).map(v => (
                          <tr key={v.id}>
                            <td className="px-6 py-4 font-bold">{new Date(v.date + 'T12:00:00').toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-indigo-500 font-bold">{filteredHospitals.find(h => h.id === v.hospitalId)?.name}</td>
                            <td className="px-6 py-4"><p className="text-xs italic text-gray-500 max-w-lg">"{v.report?.notes}"</p><p className="text-[10px] mt-1 text-gray-400">Por: {v.report?.doctorName}</p></td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DETALHES KPI */}
      {selectedKpiType && (
          <KpiDetailModal
              isOpen={true}
              onClose={() => setSelectedKpiType(null)}
              title={
                  selectedKpiType === 'visits' ? 'Visitas Realizadas (Mês)' :
                  selectedKpiType === 'new_patients' ? 'Casos Recebidos (Mês)' :
                  selectedKpiType === 'hospitals' ? 'Hospitais Cadastrados' : 'Casos em Aberto'
              }
              items={detailedKpiData[selectedKpiType] || []}
              isHospitalMode={isHospitalMode}
          />
      )}
    </div>
  );
};
