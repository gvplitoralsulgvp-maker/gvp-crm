
import React, { useState } from 'react';
import { AppState, Experience } from '../types';
import { Button } from '../components/Button';

export const MuralPage: React.FC<{ state: AppState, onUpdateState: (s: AppState) => void, isHospitalMode?: boolean }> = ({ state, onUpdateState, isHospitalMode }) => {
  const [isPosting, setIsPosting] = useState(false);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Experience['category']>('Encorajamento');

  const handlePost = () => {
    if (!content.trim() || !state.currentUser) return;

    const newExp: Experience = {
      id: crypto.randomUUID(),
      memberId: state.currentUser.id,
      memberName: state.currentUser.name,
      content: content.trim(),
      date: new Date().toISOString(),
      likes: 0,
      category
    };

    onUpdateState({
      ...state,
      experiences: [newExp, ...state.experiences]
    });
    setContent('');
    setIsPosting(false);
  };

  const handleLike = (id: string) => {
    const updated = state.experiences.map(exp => 
      exp.id === id ? { ...exp, likes: exp.likes + 1 } : exp
    );
    onUpdateState({ ...state, experiences: updated });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'} p-6 rounded-xl border flex justify-between items-center`}>
        <div>
          <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Mural de Experiências</h2>
          <p className="text-sm text-gray-500">Compartilhe vitórias e encorajamento com o grupo.</p>
        </div>
        {!isPosting && <Button onClick={() => setIsPosting(true)}>Contar Experiência</Button>}
      </div>

      {isPosting && (
        <div className={`${isHospitalMode ? 'bg-[#1a1c1e] border-blue-900/30' : 'bg-blue-50 border-blue-100'} p-6 rounded-xl border-2 space-y-4`}>
          <div className="flex gap-4">
             <select 
               className={`p-2 rounded-lg text-xs font-bold ${isHospitalMode ? 'bg-[#212327] text-white border-gray-800' : 'bg-white border-gray-200'}`}
               value={category}
               onChange={(e) => setCategory(e.target.value as any)}
             >
                <option value="Encorajamento">Encorajamento</option>
                <option value="Gratidão">Gratidão</option>
                <option value="Aprendizado">Aprendizado</option>
             </select>
          </div>
          <textarea
            className={`w-full p-4 rounded-xl text-sm border-2 focus:ring-0 ${isHospitalMode ? 'bg-[#212327] border-gray-800 text-white focus:border-blue-600' : 'bg-white border-white focus:border-blue-500'}`}
            rows={4}
            placeholder="O que aconteceu de especial na visita de hoje?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsPosting(false)}>Cancelar</Button>
            <Button onClick={handlePost} disabled={!content.trim()}>Publicar no Mural</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.experiences.map(exp => (
          <div key={exp.id} className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} rounded-2xl border overflow-hidden flex flex-col`}>
             <div className={`h-1.5 ${exp.category === 'Encorajamento' ? 'bg-blue-500' : exp.category === 'Gratidão' ? 'bg-green-500' : 'bg-purple-500'}`} />
             <div className="p-5 flex-grow space-y-3">
                <div className="flex justify-between items-start">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{new Date(exp.date).toLocaleDateString()}</span>
                   <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full text-white uppercase ${exp.category === 'Encorajamento' ? 'bg-blue-500' : exp.category === 'Gratidão' ? 'bg-green-500' : 'bg-purple-500'}`}>
                     {exp.category}
                   </span>
                </div>
                <p className={`text-sm italic leading-relaxed ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>"{exp.content}"</p>
                <p className="text-xs font-bold text-blue-600">{exp.memberName}</p>
             </div>
             <div className={`px-5 py-3 border-t flex justify-between items-center ${isHospitalMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                <button onClick={() => handleLike(exp.id)} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-500 transition-colors">
                  <svg className={`w-4 h-4 ${exp.likes > 0 ? 'fill-red-500 text-red-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  {exp.likes} {exp.likes === 1 ? 'curtida' : 'curtidas'}
                </button>
             </div>
          </div>
        ))}
        {state.experiences.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-40 italic">Nenhum relato compartilhado ainda.</div>
        )}
      </div>
    </div>
  );
};
