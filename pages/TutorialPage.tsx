
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
}

export const TutorialPage: React.FC<{ isHospitalMode?: boolean }> = ({ isHospitalMode }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TutorialStep[] = [
    {
      title: "Seja Bem-vindo ao GVP Litoral Sul",
      description: "Este aplicativo foi desenvolvido para apoiar o Grupo de Visita a Pacientes. Aqui você centraliza toda a logística necessária para um trabalho voluntário organizado e amoroso.",
      color: "bg-blue-600",
      features: ["Acesso seguro", "Sincronização em nuvem", "Suporte Offline"],
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      title: "Agenda e Escala de Grupos",
      description: "Nunca perca uma visita. Acompanhe o calendário e saiba exatamente quem será seu parceiro no dia.",
      color: "bg-indigo-600",
      features: ["Agendamento simplificado", "Visualização por calendário", "Download para Google/iCal"],
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "Gestão de Pacientes (Prontuário)",
      description: "Mantenha o histórico atualizado. Saiba quem precisa de visita prioritária e verifique o status de documentos importantes.",
      color: "bg-emerald-600",
      features: ["Status do S-55 e Diretivas", "Alertas de Isolamento", "Andar e Leito atualizados"],
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      title: "Relatórios Assistidos por IA",
      description: "Relate suas visitas com facilidade. Use a voz para ditar e a inteligência artificial para organizar o texto.",
      color: "bg-purple-600",
      features: ["Ditado por voz", "Melhoria de texto com Gemini", "Passagem de bastão inteligente"],
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      title: "Protocolo e Discrição",
      description: "O Modo Hospitalar altera o visual do app para tons escuros, garantindo que você possa consultar dados com discrição nos corredores.",
      color: "bg-slate-800",
      features: ["Interface escura (Dark Mode)", "Filtro de luz âmbar", "Modo de Privacidade (Blur)"],
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate('/dashboard');
    }
  };

  const current = steps[currentStep];

  return (
    <div className={`min-h-[calc(100vh-160px)] flex items-center justify-center p-4 animate-fade-in`}>
      <div className={`w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
        
        {/* Lado Esquerdo - Visual */}
        <div className={`w-full md:w-2/5 p-10 flex flex-col items-center justify-center text-white transition-colors duration-700 ${current.color}`}>
          <div className="bg-white/20 p-8 rounded-3xl shadow-inner mb-8 backdrop-blur-md">
            {current.icon}
          </div>
          <div className="flex gap-2">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 rounded-full cursor-pointer transition-all ${idx === currentStep ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'}`} 
              />
            ))}
          </div>
        </div>

        {/* Lado Direito - Conteúdo */}
        <div className="flex-grow p-8 md:p-12 flex flex-col justify-between">
          <div className="space-y-6">
             <div className="space-y-1">
                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}>Central de Boas-Vindas</span>
                <h2 className={`text-3xl font-bold tracking-tight ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{current.title}</h2>
             </div>
             
             <p className={`text-lg leading-relaxed ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>
               {current.description}
             </p>

             <div className="space-y-3 pt-4">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-600' : 'text-gray-400'}`}>Principais Recursos:</p>
                <div className="grid grid-cols-1 gap-2">
                   {current.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-3">
                         <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isHospitalMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                         </div>
                         <span className={`text-sm font-medium ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{f}</span>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="mt-12 flex items-center justify-between gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className={`text-xs font-bold uppercase tracking-widest transition-colors ${isHospitalMode ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Pular Introdução
            </button>
            <div className="flex gap-3">
                {currentStep > 0 && (
                    <Button variant="secondary" onClick={() => setCurrentStep(prev => prev - 1)}>Anterior</Button>
                )}
                <Button 
                  size="lg" 
                  onClick={handleNext}
                  className={`rounded-2xl px-10 shadow-xl ${current.color} border-none hover:opacity-90 text-white font-bold transition-transform active:scale-95`}
                >
                  {currentStep === steps.length - 1 ? 'Finalizar Guia' : 'Continuar'}
                </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
