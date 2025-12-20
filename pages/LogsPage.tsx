
import React from 'react';
// Fix: Changed AppState to GvpState to match the exported interface in types.ts
import { GvpState } from '../types';

interface LogsPageProps {
  // Fix: Changed AppState to GvpState
  state: GvpState;
  isHospitalMode?: boolean;
}

export const LogsPage: React.FC<LogsPageProps> = ({ state, isHospitalMode }) => {
  const sortedLogs = [...state.logs].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-6">
      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800 shadow-black' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-lg border`}>
        <h2 className={`text-xl font-bold mb-4 ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Logs do Sistema</h2>
        <p className={`text-sm mb-6 ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Registro histórico de atividades e alterações administrativas.</p>

        <div className="overflow-x-auto rounded-lg border border-gray-800/20">
          <table className="min-w-full divide-y divide-gray-800/20">
            <thead className={`${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Data/Hora</th>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Usuário</th>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Ação</th>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Detalhes</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800 bg-[#212327]' : 'divide-gray-100 bg-white'}`}>
              {sortedLogs.map(log => (
                <tr key={log.id} className={`${isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {log.userName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${isHospitalMode ? 'bg-blue-900/30 text-blue-400 border border-blue-900/50' : 'bg-blue-100 text-blue-800'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-sm max-w-xs truncate ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`} title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
