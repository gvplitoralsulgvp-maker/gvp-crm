
import React, { useState, useMemo } from 'react';
import { AppState } from '../types';
import { Button } from '../components/Button';

export const StatsReport: React.FC<{ state: AppState, isHospitalMode?: boolean }> = ({ state, isHospitalMode }) => {
  const [activeTab, setActiveTab] = useState<'kpis' | 'socialWorkers' | 'missed'>('kpis');
  const [activeRange, setActiveRange] = useState<number>(30);
  const [isPrintMode, setIsPrintMode] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const currentVisits = useMemo(() => {
    const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - activeRange);
    return state.visits.filter(v => v.status === 'FINISHED' && new Date(v.date) >= cutoffDate);
  }, [state.visits, activeRange]);

  const currentSocialVisits = useMemo(() => {
    const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - activeRange);
    return state.socialWorkerVisits.filter(v => v.status === 'FINISHED' && new Date(v.date) >= cutoffDate);
  }, [state.socialWorkerVisits, activeRange]);

  const missedVisits = useMemo(() => {
    return state.visits.filter(v => 
      v.date < todayStr && 
      v.memberIds.length > 0 && 
      v.status !== 'FINISHED' && 
      !v.report
    );
  }, [state.visits, todayStr]);

  const handlePrint = () => {
      setIsPrintMode(true);
      setTimeout(() => { window.print(); setIsPrintMode(false); }, 500);
  };

  if (isPrintMode) {
      return (
          <div className="p-10 bg-white min-h-screen text-black space-y-8">
              <div className="border-b-2 border-black pb-4 flex justify-between items-end">
                  <div><h1 className="text-3xl font-bold uppercase">Relatório GVP Litoral Sul</h1><p>Período: Últimos {activeRange} dias</p></div>
                  <p className="text-xs">Gerado em: {new Date().toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-3 gap-8">
                <div className="border p-4"><b>Visitas Realizadas:</b> {currentVisits.length}</div>
                <div className="border p-4"><b>Visitas Institucionais:</b> {currentSocialVisits.length}</div>
                <div className="border p-4 text-red-600"><b>Visitas Perdidas:</b> {missedVisits.length}</div>
              </div>
              
              <h2 className="text-xl font-bold border-b mt-10">Visitas Perdidas (Não realizadas no dia)</h2>
              <table className="w-full border-collapse">
                <thead><tr className="bg-gray-100 text-left"><th className="border p-2">Data</th><th className="border p-2">Rota</th><th className="border p-2">Membros Escalados</th><th className="border p-2">Status</th></tr></thead>
                <tbody>
                    {missedVisits.map(v => (
                        <tr key={v.id}>
                            <td className="border p-2 text-sm">{v.date}</td>
                            <td className="border p-2 text-sm">{state.routes.find(r => r.id === v.routeId)?.name}</td>
                            <td className="border p-2 text-sm">{v.memberIds.map(id => state.members.find(m => m.id === id)?.name).join(' & ')}</td>
                            <td className="border p-2 text-xs font-bold text-red-600 uppercase">Não Realizada</td>
                        </tr>
                    ))}
                </tbody>
              </table>

              <h2 className="text-xl font-bold border-b mt-10">Interações Institucionais</h2>
              <table className="w-full border-collapse">
                  <thead><tr className="bg-gray-100 text-left"><th className="border p-2">Data</th><th className="border p-2">Instituição</th><th className="border p-2">Membros</th><th className="border p-2">Relato AS</th></tr></thead>
                  <tbody>
                      {currentSocialVisits.map(v => (
                          <tr key={v.id}>
                              <td className="border p-2 text-sm">{v.date}</td>
                              <td className="border p-2 text-sm">{state.hospitals.find(h => h.id === v.hospitalId)?.name}</td>
                              <td className="border p-2 text-sm">{v.memberIds.map(id => state.members.find(m => m.id === id)?.name).join(' & ')}</td>
                              <td className="border p-2 text-xs italic">{v.report?.notes}</td>
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
          <div><h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Relatórios de Impacto</h2><p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Monitoramento de metas e ocorrências críticas.</p></div>
          <Button onClick={handlePrint} className="bg-blue-600 text-white">Versão para Impressão (PDF)</Button>
      </div>
      
      <div className="flex gap-4 border-b border-gray-800/10 overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab('kpis')} className={`pb-3 text-xs font-black uppercase tracking-widest whitespace-nowrap ${activeTab === 'kpis' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400'}`}>Impacto Social</button>
          <button onClick={() => setActiveTab('socialWorkers')} className={`pb-3 text-xs font-black uppercase tracking-widest whitespace-nowrap ${activeTab === 'socialWorkers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400'}`}>Interações AS</button>
          <button onClick={() => setActiveTab('missed')} className={`pb-3 text-xs font-black uppercase tracking-widest whitespace-nowrap ${activeTab === 'missed' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-400'}`}>Visitas Não Realizadas ({missedVisits.length})</button>
      </div>

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
                            <td className="px-6 py-4 font-bold">{state.routes.find(r => r.id === v.routeId)?.name}</td>
                            <td className="px-6 py-4 text-gray-500">{v.memberIds.map(id => state.members.find(m => m.id === id)?.name).join(' & ')}</td>
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
                            <td className="px-6 py-4 text-indigo-500 font-bold">{state.hospitals.find(h => h.id === v.hospitalId)?.name}</td>
                            <td className="px-6 py-4"><p className="text-xs italic text-gray-500 max-w-lg">"{v.report?.notes}"</p><p className="text-[10px] mt-1 text-gray-400">Por: {v.report?.doctorName}</p></td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'kpis' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-600 p-6 rounded-xl text-white shadow-lg flex flex-col justify-center min-h-[140px]"><p className="text-xs font-bold uppercase opacity-80">Visitas no Período</p><p className="text-5xl font-bold mt-2">{currentVisits.length}</p></div>
          <div className={`p-6 rounded-xl border shadow-sm flex flex-col justify-center min-h-[140px] ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}><p className="text-xs font-bold uppercase text-gray-500">Pacientes Ativos</p><p className={`text-5xl font-bold mt-2 ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{state.patients.filter(p => p.active).length}</p></div>
          <div className={`p-6 rounded-xl border shadow-sm flex flex-col justify-center min-h-[140px] ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}><p className="text-xs font-bold uppercase text-gray-500">Membros Ativos</p><p className={`text-5xl font-bold mt-2 ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{state.members.filter(m => m.active).length}</p></div>
        </div>
      )}
    </div>
  );
};
