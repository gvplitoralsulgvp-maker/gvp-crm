
import React, { useState } from 'react';
import { AppState, Experience } from '../types';
import { Button } from '../components/Button';

export const MuralPage: React.FC<{ state: AppState, onUpdateState: (s: AppState) => void, isHospitalMode?: boolean }> = ({ state, onUpdateState, isHospitalMode }) => {
  const [isPosting, setIsPosting] = useState(false);
  const [newPost, setNewPost] = useState({ content: '', category: 'Encorajamento' as any });

  const handlePost = () => {
    if (!newPost.content.trim() || !state.currentUser) return;
    const exp: Experience = {
      id: crypto.randomUUID(),
      memberId: state.currentUser.id,
      memberName: state.currentUser.name,
      content: newPost.content,
      date: new Date().toISOString(),
      likes: 0,
      category: newPost.category
    };
    onUpdateState({ ...state, experiences: [exp, ...state.experiences] });
    setIsPosting(false);
    setNewPost({ content: '', category: 'Encorajamento' });
  };

  const handleLike = (id: string) => {
    onUpdateState({
      ...state,
      experiences: state.experiences.map(e => e.id === id ? { ...e, likes: e.likes + 1 } : e)
    });
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-10">
      <div className={`p-8 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 ${
          isHospitalMode ? 'bg-gradient-to-br from-blue-900/20 to-transparent border border-blue-900/30' : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'
      }`}>
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-bold">Mural de Experiências</h2>
          <p className="opacity-80 text-sm mt-1">Compartilhe momentos que fortaleceram seu coração durante as visitas.</p>
        </div>
        <Button onClick={() => setIsPosting(true)} className={`${isHospitalMode ? 'bg-blue-600' : 'bg-white text-blue-700 hover:bg-blue-50'} rounded-xl px-8 font-bold`}>
          Compartilhar Relato
        </Button>
      </div>

      {isPosting && (
        <div className={`p-6 rounded-2xl border-2 animate-fade-in ${isHospitalMode ? 'bg-[#212327] border-blue-900/30' : 'bg-white border-blue-100 shadow-lg'}`}>
           <textarea 
             className={`w-full p-4 rounded-xl text-sm focus:ring-0 transition-all resize-none border-2 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white focus:border-blue-600' : 'bg-gray-50 border-gray-100 text-gray-800 focus:border-blue-500'}`}
             rows={4}
             placeholder="Como foi sua experiência hoje? (Mantenha o anonimato dos pacientes)..."
             value={newPost.content}
             onChange={e => setNewPost({...newPost, content: e.target.value})}
           />
           <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
              <div className="flex gap-2">
                {['Encorajamento', 'Gratidão', 'Aprendizado'].map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setNewPost({...newPost, category: cat as any})}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${newPost.category === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="secondary" onClick={() => setIsPosting(false)} className="flex-grow">Cancelar</Button>
                <Button onClick={handlePost} disabled={!newPost.content.trim()} className="flex-grow">Publicar</Button>
              </div>
           </div>
        </div>
      )}

      <div className="space-y-6">
        {state.experiences.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 font-medium">O mural ainda está vazio. Seja o primeiro a inspirar o grupo!</p>
          </div>
        ) : (
          state.experiences.map(exp => (
            <div key={exp.id} className={`p-6 rounded-2xl border transition-all hover:shadow-md group ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">{exp.memberName.substring(0,2)}</div>
                    <div>
                      <p className={`text-sm font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{exp.memberName}</p>
                      <p className="text-[10px] text-gray-500">{new Date(exp.date).toLocaleDateString()}</p>
                    </div>
                 </div>
                 <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase ${
                   exp.category === 'Encorajamento' ? 'bg-purple-100 text-purple-600' : 
                   exp.category === 'Gratidão' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                 }`}>
                   {exp.category}
                 </span>
              </div>
              <p className={`text-sm leading-relaxed italic ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>"{exp.content}"</p>
              <div className="mt-6 flex items-center gap-4 border-t pt-4 border-gray-800/10">
                 <button 
                  onClick={() => handleLike(exp.id)}
                  className={`flex items-center gap-2 text-xs font-bold transition-all ${exp.likes > 0 ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}
                 >
                   <svg className={`w-5 h-5 ${exp.likes > 0 ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                   {exp.likes} Apoios
                 </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
