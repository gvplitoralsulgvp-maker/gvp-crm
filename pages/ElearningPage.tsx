
import React, { useState } from 'react';
import { AppState, TrainingMaterial } from '../types';
import { Button } from '../components/Button';

export const ElearningPage: React.FC<{ state: AppState, isHospitalMode?: boolean }> = ({ state, isHospitalMode }) => {
  const [filter, setFilter] = useState<string>('Todos');

  const categories = ['Todos', 'Bioética', 'Segurança', 'Abordagem', 'Protocolos'];
  const filteredMaterials = filter === 'Todos' 
    ? state.trainingMaterials 
    : state.trainingMaterials.filter((m: TrainingMaterial) => m.category === filter);

  const getIcon = (type: string) => {
    if (type === 'video') return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    if (type === 'pdf') return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
    return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`p-6 rounded-xl border shadow-sm ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
        <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Capacitação e Recursos</h2>
        <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Material de apoio para visitas amorosas e profissionais.</p>
        
        <div className="flex gap-2 mt-6 overflow-x-auto pb-2 custom-scrollbar">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all whitespace-nowrap ${
                filter === cat 
                ? 'bg-blue-600 text-white shadow-md' 
                : isHospitalMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(filteredMaterials || []).map((material: TrainingMaterial) => (
          <div key={material.id} className={`rounded-xl border shadow-sm overflow-hidden flex flex-col transition-transform hover:scale-[1.02] ${
            isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'
          }`}>
            <div className={`p-4 border-b flex justify-between items-center ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}>{material.category}</span>
              <div className={isHospitalMode ? 'text-gray-500' : 'text-gray-400'}>{getIcon(material.type)}</div>
            </div>
            <div className="p-5 flex-grow space-y-3">
              <h3 className={`font-bold text-base leading-tight ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{material.title}</h3>
              <p className={`text-xs ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{material.description}</p>
            </div>
            <div className={`p-4 border-t flex items-center justify-between ${isHospitalMode ? 'border-gray-800' : 'border-gray-50'}`}>
              {material.isRestricted && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-orange-500 uppercase">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Restrito
                </span>
              )}
              <Button size="sm" variant="ghost" onClick={() => window.open(material.url, '_blank')} className="ml-auto">
                Acessar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
