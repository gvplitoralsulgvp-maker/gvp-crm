
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [opacity, setOpacity] = useState('opacity-0');

  useEffect(() => {
    // Fade in
    setTimeout(() => setOpacity('opacity-100'), 100);

    // Auto redirect after 3.5 seconds
    const timer = setTimeout(() => {
      navigate('/login');
    }, 3500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className={`fixed inset-0 bg-gradient-to-br from-blue-900 to-indigo-800 flex flex-col items-center justify-center transition-opacity duration-1000 ${opacity} z-50`}>
      <div className="text-center text-white px-4">
        <div className="mb-8 animate-bounce">
          <svg className="w-24 h-24 mx-auto text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2 drop-shadow-md">
          Portal de Visitas
        </h1>
        
        <div className="flex items-center justify-center gap-3 my-6">
            <span className="text-xl md:text-2xl font-bold tracking-widest uppercase text-blue-200">COLIH</span>
            <span className="h-6 w-px bg-white/30"></span>
            <span className="text-xl md:text-2xl font-bold tracking-widest uppercase text-blue-200">GVP</span>
        </div>
        
        <p className="text-sm font-medium text-blue-100 tracking-wider uppercase border-t border-white/20 pt-6 mt-2 inline-block">
          Litoral Sul
        </p>
        
        <div className="mt-12">
           <button 
             onClick={() => navigate('/login')}
             className="px-10 py-4 bg-white text-blue-900 rounded-2xl font-bold hover:bg-blue-50 transition-all transform hover:scale-105 shadow-xl uppercase text-xs tracking-widest"
           >
             Acessar Sistema
           </button>
        </div>
      </div>
      
      <div className="absolute bottom-8 text-blue-300/60 text-[10px] uppercase font-bold tracking-widest">
        Ambiente Seguro Enterprise v2.0
      </div>
    </div>
  );
};
