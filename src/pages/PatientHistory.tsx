
import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

interface PatientHistoryProps {
  state: AppState;
}

export const PatientHistory: React.FC<PatientHistoryProps> = ({ state }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const inactivePatients = useMemo(() => {
    let result = state.patients.filter(p => !p.active);
    
    // Sort by Discharge Date (which we usually store in estimatedDischargeDate upon archive, or just admission for now)
    // Assuming archived patients have a newer modification, but let's sort by admission date desc for now
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
       <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Histórico de Altas</h2>
            <p className="text-sm text-gray-500">Registro de pacientes que já receberam alta ou foram arquivados.</p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
             <input 
                type="text" 
                placeholder="Buscar no histórico..." 
                className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full md:w-64"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
             <Button variant="secondary" onClick={() => navigate('/patients')}>Voltar</Button>
          </div>
       </div>

       <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                   <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hospital</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docs</th>
                   </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                   {inactivePatients.map(patient => (
                      <tr key={patient.id} className="hover:bg-gray-50">
                         <td className="px-6 py-4">
                            <p className="text-sm font-bold text-gray-900">{patient.name}</p>
                            <p className="text-xs text-gray-500">{patient.treatment}</p>
                         </td>
                         <td className="px-6 py-4 text-sm text-gray-700">
                            {patient.hospitalName}
                         </td>
                         <td className="px-6 py-4 text-sm text-gray-600">
                            <span className="block">Entrada: {new Date(patient.admissionDate).toLocaleDateString()}</span>
                            {/* Assuming discharge date was captured or using estimated as final */}
                            <span className="block text-xs text-gray-400">
                                Alta (Est): {patient.estimatedDischargeDate ? new Date(patient.estimatedDischargeDate).toLocaleDateString() : 'N/A'}
                            </span>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                                {patient.hasDirectivesCard && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded">Cartão</span>}
                                {patient.agentsNotified && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded">Proc.</span>}
                                {patient.formsConsidered && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded">S-401</span>}
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
