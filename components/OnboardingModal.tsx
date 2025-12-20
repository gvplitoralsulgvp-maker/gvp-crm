
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
      title: "Boas-vindas ao GVP Litoral Sul",
      description: "Este é o seu novo centro de comando para o trabalho voluntário. Unimos logística avançada e cuidado pastoral em uma única plataforma.",
      color: "bg-blue-600",
      featureList: ["Sincronização Cloud em tempo real", "Acesso seguro e restrito", "Foco total na ética hospitalar"],
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      title: "Agenda e Gestão de Escalas",
      description: "Gerencie suas visitas com precisão. O sistema organiza duplas e rotas, garantindo que nenhum hospital fique desassistido.",
      color: "bg-indigo-600",
      featureList: ["Confirmação de Dupla em segundos", "Integração com Agenda do Google/iCal", "Alertas de vagas em aberto"],
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      )
    },
    {
      title: "Relatórios de Visita Profissionais",
      description: "Documente cada visita de forma ética. O relato consolidado ajuda a administração a acompanhar casos críticos e necessidades urgentes.",
      color: "bg-emerald-600",
      featureList: ["Histórico de 'Passagem de Bastão'", "Checklist de Diretivas Éticas", "Sinalização de acompanhamento urgente"],
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: "Mapa de Recência e Equipe",
      description: "Visualize a localização de todos os membros e hospitais. Nosso mapa inteligente destaca a prioridade de visita com base no tempo decorrido.",
      color: "bg-rose-600",
      featureList: ["Círculos Azuis: Localização da Equipe", "Legenda Verde: Visitas Recentes", "Legenda Vermelha: Alerta (+5 dias sem visita)"],
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    },
    {
      title: "Segurança e Discrição Hospitalar",
      description: "Pensado para o ambiente clínico. Use o Modo Hospitalar para não ofuscar a visão e o Modo Privacidade para ocultar nomes sensíveis.",
      color: "bg-slate-800",
      featureList: ["Interface Dark otimizada", "Blur instantâneo de nomes", "Filtro Amber para visitas noturnas"],
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
      <div className={`w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border transition-all duration-500 ${
        isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'
      }`}>
        
        {/* Lado Esquerdo - Visual Animado */}
        <div className={`w-full md:w-2/5 p-12 flex flex-col items-center justify-center text-white transition-colors duration-1000 ${current.color}`}>
          <div className="bg-white/10 p-10 rounded-[2rem] shadow-inner mb-10 backdrop-blur-md animate-pulse">
            {current.icon}
          </div>
          <div className="flex gap-3">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2 rounded-full transition-all duration-500 ${idx === currentStep ? 'w-10 bg-white' : 'w-2 bg-white/20'}`} 
              />
            ))}
          </div>
        </div>

        {/* Lado Direito - Conteúdo */}
        <div className="flex-grow p-10 md:p-16 flex flex-col justify-between">
          <div className="space-y-8">
             <div className="space-y-2">
                <span className={`text-[12px] font-black uppercase tracking-[0.3em] ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}>Guia do Sistema Enterprise</span>
                <h2 className={`text-4xl font-black tracking-tight leading-none ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{current.title}</h2>
             </div>
             
             <p className={`text-xl leading-relaxed font-medium opacity-90 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>
               {current.description}
             </p>

             <div className="space-y-4 pt-4">
                <p className={`text-[10px] font-black uppercase tracking-widest ${isHospitalMode ? 'text-gray-600' : 'text-gray-400'}`}>Destaques da Função:</p>
                <div className="grid grid-cols-1 gap-3">
                   {current.featureList.map((f, i) => (
                      <div key={i} className="flex items-center gap-4">
                         <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${isHospitalMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                         </div>
                         <span className={`text-sm font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{f}</span>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="mt-16 flex items-center justify-between gap-6">
            <button 
              onClick={onClose}
              className={`text-xs font-black uppercase tracking-widest transition-colors ${isHospitalMode ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Pular Guia
            </button>
            <div className="flex gap-4">
                {currentStep > 0 && (
                    <Button variant="secondary" className="rounded-2xl px-8" onClick={() => setCurrentStep(prev => prev - 1)}>Anterior</Button>
                )}
                <Button 
                  size="lg" 
                  onClick={handleNext}
                  className={`rounded-2xl px-12 shadow-2xl border-none text-white font-black transition-all active:scale-95 ${current.color} hover:brightness-110`}
                >
                  {currentStep === steps.length - 1 ? 'Iniciar Aplicação' : 'Próximo Passo'}
                </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
