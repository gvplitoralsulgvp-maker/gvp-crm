
import React, { useState } from 'react';
import { AppState, Experience } from '../types';
import { Button } from '../components/Button';

interface MuralPageProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  isHospitalMode?: boolean;
}

export const MuralPage: React.FC<MuralPageProps> = ({ state, onUpdateState, isHospitalMode }) => {
  const [isPosting, setIsPosting] = useState(false);
  const [newPost, setNewPost] = useState<{content: string, category: Experience['category']}>({
    content: '',
    category: 'Encorajamento'
  });
  const [filter, setFilter] = useState<Experience['category'] | 'Todos'>('Todos');

  const handlePost = () => {
    if (!state.currentUser || !newPost.content.trim()) return;

    const post: Experience = {
      id: crypto.randomUUID(),
      memberId: state.currentUser.id,
      memberName: state.currentUser.name,
      content: newPost.content,
      date: new Date().toISOString(),
      likes: 0,
      category: newPost.category
    };

    onUpdateState({
      ...state,
      experiences: [post, ...state.experiences]
    });
    setNewPost({ content: '', category: 'Encorajamento' });
    setIsPosting(false);
  };

  const handleLike = (id: string) => {
    const updated = state.experiences.map(exp => 
      exp.id === id ? { ...exp, likes: exp.likes + 1 } : exp
    );
    onUpdateState({ ...state, experiences: updated });
  };

  const filteredExperiences = filter === 'Todos' 
    ? state.experiences 
    : state.experiences.filter(exp => exp.category === filter);

  const categories: Experience['category'][] = ['Encorajamento', 'Gratidão', 'Aprendizado'];

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Encorajamento': return 'bg-blue-500';
      case 'Gratidão': return 'bg-green-500';
      case 'Aprendizado': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className={`p-6 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
        isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'
      }`}>
        <div>
          <h2 className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Mural de Experiências</h2>
          <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Compartilhe vitórias e aprendizados com o grupo.</p>
        </div>
        <Button onClick={() => setIsPosting(true)}>Compartilhar Experiência</Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {['Todos', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat as any)}
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

      {isPosting && (
        <div className={`p-6 rounded-2xl border-2 animate-fade-in ${
          isHospitalMode ? 'bg-[#1a1c1e] border-blue-900/30' : 'bg-blue-50 border-blue-100 shadow-inner'
        }`}>
          <div className="flex justify-between items-center mb-4">
             <h3 className={`text-sm font-bold uppercase tracking-widest ${isHospitalMode ? 'text-blue-400' : 'text-blue-700'}`}>Novo Relato</h3>
             <select 
               className={`text-xs p-1 rounded border ${isHospitalMode ? 'bg-black text-white' : 'bg-white text-gray-600'}`}
               value={newPost.category}
               onChange={(e) => setNewPost({...newPost, category: e.target.value as any})}
             >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
          <textarea 
            className={`w-full p-4 rounded-xl text-sm border-none focus:ring-2 focus:ring-blue-500 mb-4 h-32 ${
              isHospitalMode ? 'bg-[#212327] text-white' : 'bg-white shadow-sm'
            }`}
            placeholder="Conte algo que aconteceu na visita hoje..."
            value={newPost.content}
            onChange={(e) => setNewPost({...newPost, content: e.target.value})}
          />
          <div className="flex justify-end gap-3">
             <Button variant="ghost" onClick={() => setIsPosting(false)}>Cancelar</Button>
             <Button onClick={handlePost} disabled={!newPost.content.trim()}>Publicar no Mural</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExperiences.map(exp => (
          <div key={exp.id} className={`flex flex-col rounded-2xl border transition-all hover:shadow-lg overflow-hidden group ${
            isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'
          }`}>
            <div className={`h-1 ${getCategoryColor(exp.category)}`} />
            <div className="p-5 flex-grow space-y-3">
              <div className="flex justify-between items-start">
                 <div>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${getCategoryColor(exp.category)}`}>
                       {exp.category}
                    </span>
                    <p className={`text-sm font-bold mt-2 ${isHospitalMode ? 'text-gray-100' : 'text-gray-800'}`}>{exp.memberName}</p>
                 </div>
                 <span className="text-[10px] text-gray-500">{new Date(exp.date).toLocaleDateString()}</span>
              </div>
              <p className={`text-sm leading-relaxed italic ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>
                "{exp.content}"
              </p>
            </div>
            <div className={`px-5 py-3 border-t flex justify-between items-center ${
              isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-gray-50 border-gray-100'
            }`}>
               <button 
                 onClick={() => handleLike(exp.id)}
                 className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                   exp.likes > 0 ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                 }`}
               >
                  <svg className={`w-4 h-4 ${exp.likes > 0 ? 'fill-current' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {exp.likes} {exp.likes === 1 ? 'Curtida' : 'Curtidas'}
               </button>
            </div>
          </div>
        ))}
        {filteredExperiences.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
             <div className="w-20 h-20 bg-gray-200/50 rounded-full flex items-center justify-center mx-auto text-gray-400">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
             </div>
             <p className="text-gray-500 font-medium italic">Nenhuma experiência compartilhada aqui ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
};
