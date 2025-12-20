
import React, { useState } from 'react';
// Fix: Changed AppState to GvpState to match the exported interface in types.ts
import { GvpState } from '../types';
import { Button } from '../components/Button';

// Fix: Changed AppState to GvpState
export const StatsReport: React.FC<{ state: GvpState, isHospitalMode?: boolean }> = ({ state, isHospitalMode }) => {
  const [activeRange, setActiveRange] = useState<number>(30);
  const [isPrintMode, setIsPrintMode] = useState(false);

  const getVisitsInRange = (days: number) => {
    const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - days);
    return state.visits.filter(v => new Date(v.date) >= cutoffDate);
  };
  const currentVisits = getVisitsInRange(activeRange);

  const handlePrint = () => {
      setIsPrintMode(true);
      setTimeout(() => {
          window.print();
          setIsPrintMode(false);
      }, 500);
  };

  if (isPrintMode) {
      return (
          <div className="p-10 bg-white min-h-screen text-black space-y-8">
              <div className="border-b-2 border-black pb-4 flex justify-between items-end">
                  <div><h1 className="text-3xl font-bold uppercase">Relatório de Atividades GVP</h1><p>Período: Últimos {activeRange} dias</p></div>
                  <p className="text-xs">Gerado em: {new Date().toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-3 gap-8">
                  <div className="border p-4"><b>Total Visitas:</b> {currentVisits.length}</div>
                  <div className="border p-4"><b>Hospitais:</b> {Array.from(new Set(state.routes.flatMap(r => r.hospitals))).length}</div>
                  <div className="border p-4"><b>Escala Ativa:</b> {state.members.filter(m => m.active).length}</div>
              </div>
              <h2 className="text-xl font-bold border-b">Detalhamento</h2>
              <table className="w-full border-collapse">
                  <thead><tr className="bg-gray-100 text-left"><th className="border p-2">Data</th><th className="border p-2">Rota</th><th className="border p-2">Dupla</th><th className="border p-2">Obs</th></tr></thead>
                  <tbody>
                      {currentVisits.sort((a,b) => b.date.localeCompare(a.date)).map(v => (
                          <tr key={v.id}>
                              <td className="border p-2 text-sm">{v.date}</td>
                              <td className="border p-2 text-sm">{state.routes.find(r => r.id === v.routeId)?.name}</td>
                              <td className="border p-2 text-sm">{v.memberIds.map(id => state.members.find(m => m.id === id)?.name).join(' & ')}</td>
                              <td className="border p-2 text-xs italic">{v.report?.notes || 'Sem relato'}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      );
  }

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      <div className={`p-6 rounded-xl shadow-sm border flex flex-col md:flex-row justify-between gap-4 ${
          isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'
      }`}>
          <div>
            <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Relatórios</h2>
            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Métricas de impacto social.</p>
          </div>
          <Button onClick={handlePrint} className="bg-blue-600 text-white">Versão para Impressão (PDF)</Button>
      </div>
      
      <div className="flex gap-2">
          {[30, 90, 180].map(d => (
              <button 
                key={d} 
                onClick={() => setActiveRange(d)} 
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all ${
                    activeRange === d 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : isHospitalMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                Últimos {d} dias
              </button>
          ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-600 p-6 rounded-xl text-white shadow-lg flex flex-col justify-center min-h-[140px]">
            <p className="text-xs font-bold uppercase opacity-80">Visitas no Período</p>
            <p className="text-5xl font-bold mt-2">{currentVisits.length}</p>
        </div>
        <div className={`p-6 rounded-xl border shadow-sm flex flex-col justify-center min-h-[140px] ${
            isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'
        }`}>
            <p className="text-xs font-bold uppercase text-gray-500">Pacientes Ativos</p>
            <p className={`text-5xl font-bold mt-2 ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{state.patients.filter(p => p.active).length}</p>
        </div>
        <div className={`p-6 rounded-xl border shadow-sm flex flex-col justify-center min-h-[140px] ${
            isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'
        }`}>
            <p className="text-xs font-bold uppercase text-gray-500">Membros Ativos</p>
            <p className={`text-5xl font-bold mt-2 ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{state.members.filter(m => m.active).length}</p>
        </div>
      </div>
    </div>
  );
};
