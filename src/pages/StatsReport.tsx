
import React, { useState } from 'react';
import { AppState } from '../types';
import { Button } from '../components/Button';

interface StatsReportProps {
  state: AppState;
}

export const StatsReport: React.FC<StatsReportProps> = ({ state }) => {
  const [activeRange, setActiveRange] = useState<number>(30); 

  const getVisitsInRange = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return state.visits.filter(v => new Date(v.date) >= cutoffDate);
  };

  const currentVisits = getVisitsInRange(activeRange);

  // --- Hospital Stats ---
  const hospitalStats: Record<string, number> = {};
  currentVisits.forEach(visit => {
    const route = state.routes.find(r => r.id === visit.routeId);
    if (route) {
        route.hospitals.forEach(hospital => {
            if (!hospitalStats[hospital]) hospitalStats[hospital] = 0;
            hospitalStats[hospital] += 1;
        });
    }
  });

  // Sort hospitals by count
  const sortedHospitals = Object.entries(hospitalStats).sort(([,a], [,b]) => b - a);
  const maxHospitalCount = sortedHospitals.length > 0 ? sortedHospitals[0][1] : 1;

  // --- Member Stats ---
  const memberStats: Record<string, number> = {};
  currentVisits.forEach(visit => {
    visit.memberIds.forEach(mId => {
      if (!memberStats[mId]) memberStats[mId] = 0;
      memberStats[mId] += 1;
    });
  });

  // Map to member objects and sort
  const sortedMembers = Object.entries(memberStats)
    .map(([id, count]) => {
      const member = state.members.find(m => m.id === id);
      return { name: member?.name || 'Desconhecido', count, id };
    })
    .sort((a, b) => b.count - a.count);

  const ranges = [30, 60, 90, 180, 360];

  // --- Export Function ---
  const handleExportExcel = () => {
    // Helper to escape text for CSV (handle commas and quotes)
    const safe = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;

    let csvContent = `RELATÓRIO DE VISITAS GVP - ÚLTIMOS ${activeRange} DIAS\n`;
    csvContent += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;

    // Section 1: Summary
    csvContent += `RESUMO GERAL\n`;
    csvContent += `Total de Visitas,Média Diária,Membros Participantes\n`;
    csvContent += `${currentVisits.length},${(currentVisits.length / activeRange).toFixed(2)},${sortedMembers.length}\n\n`;

    // Section 2: Hospitals
    csvContent += `VISITAS POR HOSPITAL\n`;
    csvContent += `Hospital,Total de Visitas\n`;
    sortedHospitals.forEach(([name, count]) => {
        csvContent += `${safe(name)},${count}\n`;
    });
    csvContent += `\n`;

    // Section 3: Members
    csvContent += `PARTICIPAÇÃO DOS MEMBROS\n`;
    csvContent += `Nome do Membro,Total de Visitas\n`;
    sortedMembers.forEach(m => {
        csvContent += `${safe(m.name)},${m.count}\n`;
    });
    csvContent += `\n`;

    // Section 4: Detailed List
    csvContent += `DETALHAMENTO DAS VISITAS\n`;
    csvContent += `Data,Rota,Membros (Dupla),Relatório / Observações\n`;
    
    // Sort visits by date desc for the list
    const sortedVisitsList = [...currentVisits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    sortedVisitsList.forEach(v => {
        const routeName = state.routes.find(r => r.id === v.routeId)?.name || 'Rota Desconhecida';
        const membersNames = v.memberIds.map(id => state.members.find(m => m.id === id)?.name || '??').join(' & ');
        const notes = v.report ? v.report.notes : 'Sem relatório';
        
        csvContent += `${v.date},${safe(routeName)},${safe(membersNames)},${safe(notes)}\n`;
    });

    // Create Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_GVP_${activeRange}dias_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
             <h2 className="text-xl font-bold text-gray-800">Relatórios Estatísticos</h2>
             <Button 
                onClick={handleExportExcel}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
             >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Exportar Excel
             </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {ranges.map(days => (
            <button
              key={days}
              onClick={() => setActiveRange(days)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeRange === days 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Últimos {days} dias
            </button>
          ))}
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg text-white shadow-md">
          <h3 className="text-blue-100 text-sm font-semibold uppercase tracking-wider">Total Visitas</h3>
          <p className="text-4xl font-bold mt-2">{currentVisits.length}</p>
          <p className="text-blue-100 text-sm mt-1">Agendamentos realizados</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Média Diária</h3>
          <p className="text-4xl font-bold text-gray-800 mt-2">{(currentVisits.length / activeRange).toFixed(1)}</p>
          <p className="text-gray-400 text-sm mt-1">Visitas por dia</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Membros Ativos</h3>
          <p className="text-4xl font-bold text-gray-800 mt-2">{sortedMembers.length}</p>
          <p className="text-gray-400 text-sm mt-1">Participaram no período</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Hospital Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
             <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
             Visitas por Hospital
           </h3>
           
           {sortedHospitals.length === 0 ? (
               <p className="text-gray-500 italic text-center py-8">Sem dados para exibir.</p>
           ) : (
              <div className="space-y-4">
                 {sortedHospitals.map(([name, count]) => {
                   const percentage = (count / maxHospitalCount) * 100;
                   return (
                     <div key={name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{name}</span>
                          <span className="font-bold text-gray-900">{count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                     </div>
                   );
                 })}
              </div>
           )}
        </div>

        {/* Member Activity List */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
             <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
             Participação dos Membros
           </h3>
           
           {sortedMembers.length === 0 ? (
               <p className="text-gray-500 italic text-center py-8">Nenhuma visita realizada.</p>
           ) : (
             <div className="overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Membro</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Visitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedMembers.map((m, idx) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700 flex items-center gap-2">
                           <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${idx < 3 ? 'bg-yellow-500' : 'bg-gray-400'}`}>
                             {idx + 1}
                           </span>
                           {m.name}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                           {m.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};
