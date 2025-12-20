
import React, { useState } from 'react';
import { AppState, TrainingMaterial } from '../types';

export const ElearningPage: React.FC<{ state: AppState, isHospitalMode?: boolean }> = ({ state, isHospitalMode }) => {
  const [filter, setFilter] = useState<TrainingMaterial['category'] | 'Todos'>('Todos');

  const filtered = filter === 'Todos' 
    ? state.trainingMaterials 
    : state.trainingMaterials.filter(m => m.category === filter);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} p-6 rounded-xl border`}>
        <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Portal de Treinamentos</h2>
        <p className="text-sm text-gray-500">Materiais oficiais para capacitação e protocolos do grupo.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {['Todos', 'Protocolos', 'Bioética', 'Abordagem'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat as any)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all whitespace-nowrap ${
              filter === cat 
                ? 'bg-blue-600 text-white shadow-md' 
                : isHospitalMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(material => (
          <div key={material.id} className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} rounded-xl border p-5 space-y-4 hover:shadow-lg transition-all group cursor-pointer`}>
             <div className="flex justify-between items-start">
                <div className={`p-3 rounded-xl ${isHospitalMode ? 'bg-white/5' : 'bg-blue-50'} text-blue-600`}>
                   {material.type === 'video' ? (
                     <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                   ) : (
                     <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                   )}
                </div>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{material.duration || material.type}</span>
             </div>
             <div>
                <h3 className={`font-bold text-lg leading-tight ${isHospitalMode ? 'text-gray-100' : 'text-gray-800'}`}>{material.title}</h3>
                <p className="text-xs text-gray-500 mt-2">{material.description}</p>
             </div>
             <div className="pt-4 border-t border-gray-800/10 flex items-center justify-between">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${isHospitalMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>{material.category}</span>
                <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">Acessar &rarr;</span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
