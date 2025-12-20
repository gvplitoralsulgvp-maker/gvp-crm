
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
    <div className={`fixed inset-0 bg-gradient-to-br from-blue-900 to-blue-700 flex flex-col items-center justify-center transition-opacity duration-1000 ${opacity} z-50`}>
      <div className="text-center text-white px-4">
        <div className="mb-6 animate-bounce">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 mx-auto text-blue-200">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 drop-shadow-md">
          Seja bem vindo ao planejamento de visita
        </h1>
        <h2 className="text-2xl md:text-3xl font-light text-blue-100 tracking-wider uppercase border-t border-blue-400 pt-4 mt-4 inline-block">
          GVP Litoral Sul
        </h2>
        
        <div className="mt-12">
           <button 
             onClick={() => navigate('/login')}
             className="px-8 py-3 bg-white text-blue-900 rounded-full font-semibold hover:bg-blue-50 transition-transform transform hover:scale-105 shadow-lg"
           >
             Acessar Sistema
           </button>
        </div>
      </div>
      
      <div className="absolute bottom-8 text-blue-300 text-sm">
        Carregando ambiente seguro...
      </div>
    </div>
  );
};
