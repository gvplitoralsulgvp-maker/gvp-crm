
import React, { useState, useEffect } from 'react';
import { VisitRoute, Member, Hospital, Patient } from '../types';
import { HistoryItem } from './ReportModal';
import { Button } from './Button';
import { generateRouteBriefing } from '../services/geminiService';

interface MyVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  route: VisitRoute;
  partner: Member | null;
  hospitalDetails: Hospital[];
  patients: Patient[];
  recentHistory: HistoryItem[];
  isHospitalMode?: boolean;
  isPrivacyMode?: boolean;
  onSwapRequest?: () => void;
  onCancelVisit?: () => void;
  onOnTheWay?: () => void;
  onFinishVisit?: () => void;
  onPatientClick: (patient: Patient) => void;
}

export const MyVisitModal: React.FC<MyVisitModalProps> = ({ 
  isOpen, onClose, date, route, partner, hospitalDetails, patients, recentHistory, isHospitalMode, isPrivacyMode, onSwapRequest, onCancelVisit, onOnTheWay, onFinishVisit, onPatientClick
}) => {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [nearbyHospital, setNearbyHospital] = useState<Hospital | null>(null);
  const [sentOnTheWay, setSentOnTheWay] = useState(false);

  useEffect(() => {
    if (isOpen && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        const near = hospitalDetails.find(h => {
          const dist = Math.sqrt(Math.pow(h.lat - latitude, 2) + Math.pow(h.lng - longitude, 2));
          return dist < 0.005; 
        });
        if (near) setNearbyHospital(near);
      });
    }
    if (!isOpen) setSentOnTheWay(false);
  }, [isOpen, hospitalDetails]);

  const handleGetBriefing = async () => {
    if (!route) return;
    setIsBriefingLoading(true);
    const result = await generateRouteBriefing(route.name, recentHistory);
    setBriefing(result);
    setIsBriefingLoading(false);
  };

  const handleOnTheWay = () => {
      if (onOnTheWay) onOnTheWay();
      setSentOnTheWay(true);
  };

  if (!isOpen || !route) return null;

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const routePatients = patients.filter(p => p.active && route.hospitals?.includes(p.hospitalName));

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800 shadow-black' : 'bg-white'}`}>
        <div className="bg-blue-600 px-6 py-5 flex justify-between items-start shrink-0">
          <div>
            <h3 className="text-white font-bold text-xl">Detalhes da Visita</h3>
            <p className="text-blue-100 text-sm capitalize">{formattedDate}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-200 text-3xl leading-none">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          {/* Ações Rápidas */}
          <div className="grid grid-cols-2 gap-4">
             <button 
                onClick={handleOnTheWay}
                disabled={sentOnTheWay || !partner}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border-2 ${
                    sentOnTheWay 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default' 
                    : isHospitalMode 
                        ? 'bg-blue-900/20 border-blue-900/50 text-blue-400 hover:bg-blue-900/40' 
                        : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                }`}
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                {sentOnTheWay ? 'Avisado!' : 'A caminho'}
             </button>

             <button 
                onClick={onFinishVisit}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border-2 ${
                    isHospitalMode 
                        ? 'bg-green-900/20 border-green-900/50 text-green-400 hover:bg-green-900/40' 
                        : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                }`}
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Finalizar Visita
             </button>
          </div>

          {/* Pacientes na Rota */}
          <div className={`p-5 rounded-2xl border shadow-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-white border-gray-100'}`}>
             <h4 className={`text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
               Pacientes para Visitar hoje ({routePatients.length})
             </h4>
             {routePatients.length === 0 ? (
               <p className={`text-sm py-2 italic ${isHospitalMode ? 'text-gray-600' : 'text-gray-400'}`}>Nenhum paciente cadastrado nesta rota no momento.</p>
             ) : (
               <div className="space-y-3">
                 {routePatients.map(p => (
                   <div 
                    key={p.id} 
                    onClick={() => onPatientClick(p)}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all shadow-sm ${
                      isHospitalMode 
                        ? 'bg-[#212327] border-gray-800 hover:border-blue-900' 
                        : 'bg-gray-50 border-gray-100 hover:border-blue-200 hover:bg-white'
                    }`}
                   >
                     <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${p.isIsolation ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}>
                          {p.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className={`text-base font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'} ${isPrivacyMode ? 'blur-sm select-none' : ''}`}>{p.name}</p>
                          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">{p.floor ? `${p.floor} • ` : ''}{p.hospitalName}</p>
                        </div>
                     </div>
                     <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                   </div>
                 ))}
               </div>
             )}
          </div>

          {/* Informações dos Hospitais */}
          {hospitalDetails.some(h => !!h.importantInfo) && (
            <div className={`p-5 rounded-2xl border-2 animate-fade-in ${isHospitalMode ? 'bg-blue-900/10 border-blue-900/30' : 'bg-blue-50/50 border-blue-100/50'}`}>
              <h4 className={`text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isHospitalMode ? 'text-blue-400' : 'text-blue-700'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Instruções das Instituições
              </h4>
              <div className="space-y-4">
                {hospitalDetails.filter(h => !!h.importantInfo).map(h => (
                  <div key={h.id} className={`space-y-2 p-3 rounded-lg ${isHospitalMode ? 'bg-black/20' : 'bg-white/60 shadow-sm border border-blue-100'}`}>
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${isHospitalMode ? 'text-gray-400' : 'text-blue-800'}`}>{h.name}</p>
                    <p className={`text-sm leading-relaxed ${isHospitalMode ? 'text-gray-300' : 'text-gray-800'}`}>{h.importantInfo}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Briefing Gemini */}
          <div className={`${isHospitalMode ? 'bg-blue-900/10 border-blue-900/50 shadow-black' : 'bg-blue-50 border-blue-100 shadow-sm'} p-5 rounded-2xl border-2 space-y-4`}>
             <div className="flex justify-between items-center">
                 <h4 className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 ${isHospitalMode ? 'text-blue-400' : 'text-blue-600'}`}>
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5z" /></svg>
                     Briefing Inteligente
                 </h4>
                 {!briefing && (
                    <button onClick={handleGetBriefing} disabled={isBriefingLoading} className={`text-[10px] font-bold underline disabled:opacity-50 transition-colors uppercase tracking-tight ${isHospitalMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-700 hover:text-blue-900'}`}>
                        {isBriefingLoading ? 'Processando...' : 'OBTER RESUMO DA ROTA'}
                    </button>
                 )}
             </div>
             {briefing ? (
                 <p className={`text-sm leading-relaxed italic border-l-4 border-blue-400 pl-4 py-1 ${isHospitalMode ? 'text-blue-100' : 'text-blue-900'}`}>"{briefing}"</p>
             ) : (
                 <p className={`text-[11px] italic ${isHospitalMode ? 'text-gray-600' : 'text-gray-500'}`}>Clique para obter um resumo automático das últimas visitas desta rota gerado por IA.</p>
             )}
          </div>

          {/* Parceiro de Visita */}
          <div className={`flex items-center gap-5 p-5 rounded-2xl border shadow-sm ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
             <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl shadow-inner border-2 border-white">{partner ? partner.name.substring(0, 2).toUpperCase() : '?'}</div>
             <div className="flex-grow">
               <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Parceiro de Visita</p>
               <p className={`text-xl font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'} ${isPrivacyMode ? 'blur-md select-none' : ''}`}>{partner ? partner.name : 'Aguardando dupla...'}</p>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-5 border-t grid grid-cols-3 gap-3 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
          <button onClick={onCancelVisit} className="text-red-500 hover:bg-red-500/10 text-xs font-bold uppercase py-2 rounded-lg">Cancelar</button>
          <button onClick={onSwapRequest} className="text-orange-600 hover:bg-orange-500/10 text-xs font-bold uppercase py-2 rounded-lg">Troca</button>
          <button onClick={onClose} className="bg-blue-600 text-white rounded-lg shadow-md font-bold text-sm px-6 py-2.5 hover:bg-blue-700 transition-all active:scale-95">Fechar</button>
        </div>
      </div>
    </div>
  );
};
