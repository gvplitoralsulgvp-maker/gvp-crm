
import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

interface PatientHistoryProps {
  state: AppState;
  isHospitalMode?: boolean;
}

export const PatientHistory: React.FC<PatientHistoryProps> = ({ state, isHospitalMode }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const inactivePatients = useMemo(() => {
    let result = state.patients.filter(p => !p.active);
    result.sort((a,b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime());

    if(searchTerm.trim()){
        const lower = searchTerm.toLowerCase();
        result = result.filter(p => 
            p.name.toLowerCase().includes(lower) || 
            p.hospitalName.toLowerCase().includes(lower)
        );
    }
    return result;
  }, [state.patients, searchTerm]);

  return (
    <div className="space-y-6">
       <div className={`p-4 rounded-lg shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4 ${
           isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-200'
       }`}>
          <div>
            <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Histórico de Altas</h2>
            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Registro de pacientes que já receberam alta ou foram arquivados.</p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
             <input 
                type="text" 
                placeholder="Buscar no histórico..." 
                className={`border rounded-md px-3 py-2 text-sm w-full md:w-64 ${
                    isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
             <Button variant="secondary" onClick={() => navigate('/patients')}>Voltar</Button>
          </div>
       </div>

       <div className={`rounded-lg shadow-sm border overflow-hidden ${
           isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-200'
       }`}>
          <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200">
                <thead className={isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'}>
                   <tr>
                      <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Paciente</th>
                      <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Hospital</th>
                      <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Período</th>
                      <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Docs</th>
                   </tr>
                </thead>
                <tbody className={`divide-y ${isHospitalMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                   {inactivePatients.map(patient => (
                      <tr key={patient.id} className={isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                         <td className="px-6 py-4">
                            <p className={`text-sm font-bold ${isHospitalMode ? 'text-gray-100' : 'text-gray-900'}`}>{patient.name}</p>
                            <p className="text-xs text-gray-500">{patient.treatment}</p>
                         </td>
                         <td className={`px-6 py-4 text-sm ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {patient.hospitalName}
                         </td>
                         <td className={`px-6 py-4 text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            <span className="block">Entrada: {new Date(patient.admissionDate).toLocaleDateString()}</span>
                            <span className="block text-xs opacity-60">
                                Alta (Est): {patient.estimatedDischargeDate ? new Date(patient.estimatedDischargeDate).toLocaleDateString() : 'N/A'}
                            </span>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                                {patient.hasDirectivesCard && <span className="text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1.5 rounded uppercase font-bold">Cartão</span>}
                                {patient.agentsNotified && <span className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-1.5 rounded uppercase font-bold">Proc.</span>}
                                {patient.formsConsidered && <span className="text-[10px] bg-purple-500/10 text-purple-500 border border-purple-500/20 px-1.5 rounded uppercase font-bold">S-401</span>}
                                {!patient.hasDirectivesCard && !patient.agentsNotified && !patient.formsConsidered && <span className="text-[10px] text-gray-400">-</span>}
                            </div>
                         </td>
                      </tr>
                   ))}
                   {inactivePatients.length === 0 && (
                      <tr>
                         <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">
                             Nenhum histórico encontrado.
                         </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
};
