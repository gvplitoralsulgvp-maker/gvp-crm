
import React, { useState, useMemo } from 'react';
import { AppState, UserRole } from '../types';
import { Button } from '../components/Button';

// Componente Interno: Cartão de Métrica (Estilo da Imagem)
const MetricCard: React.FC<{ title: string; value: number | string; colorClass: string; isHospitalMode?: boolean }> = ({ title, value, colorClass, isHospitalMode }) => (
    <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between h-32 transition-all hover:shadow-md ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-200'}`}>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>{title}</span>
        <span className={`text-4xl font-bold ${colorClass}`}>{value}</span>
    </div>
);

// Componente Interno: Gráfico de Barras Simples (CSS)
const SimpleBarChart: React.FC<{ data: { label: string, value: number }[], isHospitalMode?: boolean }> = ({ data, isHospitalMode }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    
    return (
        <div className="h-48 flex items-end gap-2 pt-4 pb-2">
            {data.map((d, idx) => {
                const heightPct = (d.value / maxValue) * 100;
                return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                        {/* Tooltip */}
                        <div className={`absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10 ${isHospitalMode ? 'bg-white text-black' : 'bg-gray-800 text-white'}`}>
                            {d.label}: {d.value}
                        </div>
                        {/* Barra */}
                        <div 
                            className="w-full max-w-[40px] rounded-t-md transition-all hover:opacity-80 bg-blue-500 relative" 
                            style={{ height: `${heightPct}%`, minHeight: '4px' }}
                        >
                            {/* Valor dentro da barra se couber, ou fora */}
                        </div>
                        {/* Label Eixo X */}
                        <span className={`text-[9px] font-bold truncate w-full text-center ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`} title={d.label}>
                            {d.label.split(' ')[0]}...
                        </span>
                    </div>
                )
            })}
            {data.length === 0 && <p className="w-full text-center text-xs text-gray-400 self-center">Sem dados para exibir</p>}
        </div>
    );
};

// Componente Interno: Gráfico Donut SVG
const DonutChart: React.FC<{ active: number, total: number, isHospitalMode?: boolean }> = ({ active, total, isHospitalMode }) => {
    const percentage = total === 0 ? 0 : (active / total) * 100;
    // Circunferência de raio 15.9155 ~= 100
    
    return (
        <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                {/* Fundo do Anel */}
                <path 
                    className={`${isHospitalMode ? 'text-gray-800' : 'text-gray-100'}`} 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="4" 
                />
                {/* Segmento de Valor */}
                <path 
                    className="text-green-500 transition-all duration-1000 ease-out" 
                    strokeDasharray={`${percentage}, 100`} 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className={`text-3xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{active}</span>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Ativos</span>
            </div>
        </div>
    );
};

export const StatsReport: React.FC<{ state: AppState, isHospitalMode?: boolean }> = ({ state, isHospitalMode }) => {
  const [activeTab, setActiveTab] = useState<'kpis' | 'socialWorkers' | 'missed' | 'coverage'>('kpis');
  const [activeRange, setActiveRange] = useState<number>(30);
  const [isPrintMode, setIsPrintMode] = useState(false);

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
          // Routes are filtered if they contain hospitals from the region
          return state.routes.filter(r => {
              if (!r.hospitals) return false;
              // Check if any hospital in the route belongs to visible hospitals
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

  // Lista de Cobertura Hospitalar
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

  // Dados para os Gráficos
  const visitsByHospital = useMemo(() => {
      const counts: Record<string, number> = {};
      currentVisits.forEach(v => {
          const route = filteredRoutes.find(r => r.id === v.routeId);
          // Atribui a visita a todos os hospitais da rota
          route?.hospitals?.forEach(hName => {
              counts[hName] = (counts[hName] || 0) + 1;
          });
      });
      return Object.entries(counts)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6); // Top 6
  }, [currentVisits, filteredRoutes]);

  const newPatientsCount = useMemo(() => {
      return filteredPatients.filter(p => new Date(p.admissionDate) >= cutoffDate).length;
  }, [filteredPatients, cutoffDate]);

  const activePatientsCount = filteredPatients.filter(p => p.active).length;
  const totalPatientsCount = filteredPatients.length;

  const handlePrint = () => {
      setIsPrintMode(true);
      setTimeout(() => { window.print(); setIsPrintMode(false); }, 500);
  };

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
                <div className="border p-4"><b>Casos Recebidos:</b> {newPatientsCount}</div>
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
            {/* 4 CARDS NO TOPO */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                    title="Total de Atendimentos" 
                    value={currentVisits.length} 
                    colorClass="text-blue-600" 
                    isHospitalMode={isHospitalMode} 
                />
                <MetricCard 
                    title="Casos Recebidos" 
                    value={newPatientsCount} 
                    colorClass="text-green-600" 
                    isHospitalMode={isHospitalMode} 
                />
                <MetricCard 
                    title="Hospitais Cadastrados" 
                    value={filteredHospitals.length} 
                    colorClass="text-purple-600" 
                    isHospitalMode={isHospitalMode} 
                />
                <MetricCard 
                    title="Casos em Aberto" 
                    value={activePatientsCount} 
                    colorClass="text-orange-600" 
                    isHospitalMode={isHospitalMode} 
                />
            </div>

            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico de Barras (Ocupa 2 colunas) */}
                <div className={`col-span-1 lg:col-span-2 p-6 rounded-2xl border shadow-sm ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-base font-bold mb-4 ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Atendimentos por Hospital</h3>
                    <SimpleBarChart data={visitsByHospital} isHospitalMode={isHospitalMode} />
                </div>

                {/* Gráfico de Rosca (Ocupa 1 coluna) */}
                <div className={`p-6 rounded-2xl border shadow-sm flex flex-col items-center justify-center ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-base font-bold mb-6 w-full text-left ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Status dos Casos</h3>
                    <DonutChart active={activePatientsCount} total={totalPatientsCount} isHospitalMode={isHospitalMode} />
                    <div className="mt-6 w-full space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 font-bold uppercase flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div> Em Aberto
                            </span>
                            <span className={`font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{activePatientsCount}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 font-bold uppercase flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isHospitalMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div> Arquivados
                            </span>
                            <span className={`font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{totalPatientsCount - activePatientsCount}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'coverage' && (
          <div className="space-y-6">
              <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-orange-500 text-white rounded-lg">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                      <p className="text-sm font-bold text-orange-700">Status de Visitação por Hospital</p>
                      <p className="text-xs text-orange-600 opacity-80">Monitoramento de frequência de visitas GVP. O ideal é manter abaixo de 7 dias.</p>
                  </div>
              </div>

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
    </div>
  );
};
