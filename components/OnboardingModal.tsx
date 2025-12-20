
import React, { useState } from 'react';
import { Button } from './Button';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  featureList: string[];
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHospitalMode?: boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, isHospitalMode }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      title: "Seja Bem-vindo!",
      description: "Este é o GVP Litoral Sul, sua ferramenta para gestão de visitas hospitalares. Vamos te mostrar rapidamente como aproveitar o app.",
      color: "bg-blue-600",
      featureList: ["Organização de escalas", "Prontuários em tempo real", "Suporte inteligente"],
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      title: "Sua Agenda e Escala",
      description: "Na aba 'Agenda', você pode visualizar o calendário do mês e se candidatar a vagas abertas nas rotas de visita.",
      color: "bg-indigo-600",
      featureList: ["Entrar em rotas com um toque", "Ver sua dupla de visita", "Baixar arquivo para Google Calendar"],
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "Controle de Pacientes",
      description: "Mantenha o histórico de quem está internado. Verifique se o paciente tem o cartão de diretivas (S-401) e o status do S-55.",
      color: "bg-emerald-600",
      featureList: ["Andar e Leito atualizados", "Alertas de isolamento", "Checklist de diretivas éticas"],
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      title: "Relatórios com IA Gemini",
      description: "Ao final da visita, você pode ditar o seu relato. Use o botão 'IA' para que o sistema organize suas notas de forma profissional.",
      color: "bg-purple-600",
      featureList: ["Ditado por voz (Hands-free)", "Correção gramatical automática", "Resumos de inteligência da rota"],
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      title: "Segurança e Discrição",
      description: "Ative o 'Modo Hospitalar' (ícone da lua) para usar uma interface escura e discreta dentro das unidades de saúde.",
      color: "bg-slate-800",
      featureList: ["Modo Escuro (Dark Mode)", "Filtro Âmbar para cansaço visual", "Modo Privacidade (Blur em nomes)"],
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    }
  ];

  if (!isOpen) return null;

  const current = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
      setCurrentStep(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border animate-fade-in ${
        isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'
      }`}>
        
        {/* Banner Lateral Decorativo */}
        <div className={`w-full md:w-1/3 p-10 flex flex-col items-center justify-center text-white transition-colors duration-500 ${current.color}`}>
          <div className="bg-white/20 p-6 rounded-full shadow-inner mb-6 backdrop-blur-md">
            {current.icon}
          </div>
          <div className="flex gap-2">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all ${idx === currentStep ? 'w-8 bg-white' : 'w-2 bg-white/30'}`} 
              />
            ))}
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-grow p-8 md:p-12 flex flex-col justify-between">
          <div className="space-y-6">
             <div className="space-y-1">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}>Guia do Usuário</span>
                <h2 className={`text-3xl font-bold tracking-tight ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{current.title}</h2>
             </div>
             
             <p className={`text-lg leading-relaxed ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>
               {current.description}
             </p>

             <div className="space-y-3 pt-2">
                {current.featureList.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${current.color}`}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className={`text-sm font-medium ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{feature}</span>
                  </div>
                ))}
             </div>
          </div>

          <div className="mt-12 flex items-center justify-between">
            <button 
              onClick={onClose}
              className={`text-xs font-bold uppercase tracking-widest transition-colors ${isHospitalMode ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Pular Tudo
            </button>
            
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button variant="secondary" onClick={handlePrev} className="rounded-xl px-6">Anterior</Button>
              )}
              <Button 
                onClick={handleNext}
                className={`rounded-xl px-8 shadow-lg text-white font-bold border-none transition-transform active:scale-95 ${current.color}`}
              >
                {currentStep === steps.length - 1 ? 'Começar Agora' : 'Próximo'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
