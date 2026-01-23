
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
      title: "Portal GVP & COLIH Litoral Sul",
      description: "Bem-vindo ao sistema integrado de gestão pastoral e hospitalar. Uma plataforma única para organizar visitas, apoiar pacientes e coordenar ações institucionais.",
      color: "bg-blue-600",
      featureList: ["Integração GVP e COLIH", "Segurança de Dados Enterprise", "Sincronização em Tempo Real"],
      icon: (
        <svg className="w-12 h-12 md:w-16 md:h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      title: "Agenda Inteligente & Eventos",
      description: "Gerencie escalas de duplas com facilidade. Visualize eventos (Assembleias, Reuniões), receba briefings de rota gerados por IA e relate atividades por voz.",
      color: "bg-indigo-600",
      featureList: ["Briefing de Rota via IA", "Visualização de Eventos", "Relatórios Ditados por Voz"],
      icon: (
        <svg className="w-12 h-12 md:w-16 md:h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      )
    },
    {
      title: "Gestão de Pacientes & HLC-7",
      description: "Controle total do ciclo de atendimento: desde a solicitação GVP, acompanhamento de diretivas/S-55, até a alta médica e arquivamento administrativo.",
      color: "bg-emerald-600",
      featureList: ["Solicitações e Bandeiras", "Fluxo de Alta vs Arquivamento", "Alertas de Isolamento"],
      icon: (
        <svg className="w-12 h-12 md:w-16 md:h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: "Módulo Institucional",
      description: "Ferramentas exclusivas para a COLIH e Assistência Social. Mapeie médicos cooperadores, agende apresentações e registre interações com o hospital.",
      color: "bg-purple-600",
      featureList: ["Cadastro de Médicos & Especialidades", "Visitas de Assistência Social", "Metas de Apresentações"],
      icon: (
        <svg className="w-12 h-12 md:w-16 md:h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: "Recursos & Modo Hospitalar",
      description: "Acesse documentos, protocolos e mapas em um ambiente visual seguro e discreto, projetado para uso ético dentro das instituições.",
      color: "bg-slate-800",
      featureList: ["Central de Documentos & Pautas", "Modo Escuro (Hospitalar)", "Modo Privacidade (Blur)"],
      icon: (
        <svg className="w-12 h-12 md:w-16 md:h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 md:p-4 backdrop-blur-xl overflow-hidden">
      {/* Botão de Fechar Rápido para Mobile */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-[210] p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all md:hidden"
        aria-label="Fechar Guia"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className={`w-full h-full md:h-auto md:max-w-4xl md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border transition-all duration-500 ${
        isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'
      }`}>
        
        {/* Lado Esquerdo - Visual (Menor no mobile) */}
        <div className={`w-full md:w-2/5 p-6 md:p-12 flex flex-col items-center justify-center text-white transition-colors duration-1000 shrink-0 ${current.color}`}>
          <div className="bg-white/10 p-6 md:p-10 rounded-2xl md:rounded-[2rem] shadow-inner mb-4 md:mb-10 backdrop-blur-md animate-pulse">
            {current.icon}
          </div>
          <div className="flex gap-2">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1 md:h-2 rounded-full transition-all duration-500 ${idx === currentStep ? 'w-6 md:w-10 bg-white' : 'w-1 md:w-2 bg-white/20'}`} 
              />
            ))}
          </div>
        </div>

        {/* Lado Direito - Conteúdo (Com scroll independente se necessário) */}
        <div className="flex-grow flex flex-col min-h-0 bg-inherit">
          <div className="flex-grow p-6 md:p-16 overflow-y-auto custom-scrollbar">
            <div className="space-y-4 md:space-y-8">
              <div className="space-y-1">
                  <span className={`text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}>Guia do Sistema Enterprise</span>
                  <h2 className={`text-2xl md:text-4xl font-black tracking-tight leading-tight ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{current.title}</h2>
              </div>
              
              <p className={`text-base md:text-xl leading-relaxed font-medium opacity-90 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {current.description}
              </p>

              <div className="space-y-3 md:space-y-4 pt-2">
                  <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${isHospitalMode ? 'text-gray-600' : 'text-gray-400'}`}>Destaques da Função:</p>
                  <div className="grid grid-cols-1 gap-2 md:gap-3">
                    {current.featureList.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 md:gap-4">
                          <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center shadow-sm shrink-0 ${isHospitalMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                              <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                          </div>
                          <span className={`text-sm md:text-base font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{f}</span>
                        </div>
                    ))}
                  </div>
              </div>
            </div>
          </div>

          {/* Rodapé de Ações (Fixo no fim do card) */}
          <div className={`p-6 md:p-10 border-t shrink-0 flex items-center justify-between gap-4 ${isHospitalMode ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
            <button 
              onClick={onClose}
              className={`text-[10px] md:text-xs font-black uppercase tracking-widest transition-all px-2 py-1 ${isHospitalMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Pular Guia
            </button>
            <div className="flex gap-2 md:gap-4">
                {currentStep > 0 && (
                    <Button variant="secondary" className="rounded-xl md:rounded-2xl px-4 md:px-8 text-xs" onClick={() => setCurrentStep(prev => prev - 1)}>Voltar</Button>
                )}
                <Button 
                  size="lg" 
                  onClick={handleNext}
                  className={`rounded-xl md:rounded-2xl px-6 md:px-12 shadow-xl border-none text-white font-black transition-all active:scale-95 text-xs md:text-base ${current.color} hover:brightness-110`}
                >
                  {currentStep === steps.length - 1 ? 'Acessar Sistema' : 'Próximo'}
                </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
