
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { VisitRoute, Member, Hospital } from '../types';
import { HistoryItem } from './ReportModal';
import { Button } from './Button';

interface MyVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  route: VisitRoute;
  partner: Member | null;
  hospitalDetails: Hospital[];
  recentHistory: HistoryItem[];
}

export const MyVisitModal: React.FC<MyVisitModalProps> = ({
  isOpen,
  onClose,
  date,
  route,
  partner,
  hospitalDetails,
  recentHistory
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleNavigateToHistory = () => {
    navigate('/stats');
  };

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-start flex-shrink-0">
          <div>
            <h3 className="text-white font-bold text-lg">Detalhes da Visita</h3>
            <p className="text-blue-100 text-sm capitalize">{formattedDate}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-200 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* Partner Info */}
          <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
             <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg">
                {partner ? partner.name.substring(0, 2).toUpperCase() : '?'}
             </div>
             <div>
                <p className="text-xs text-blue-600 font-bold uppercase">Sua Dupla</p>
                <p className="text-lg font-bold text-gray-800">
                    {partner ? partner.name : <span className="italic text-gray-500">Aguardando parceiro...</span>}
                </p>
                {partner && partner.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                           <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" clipRule="evenodd" />
                        </svg>
                        {partner.phone}
                    </p>
                )}
             </div>
          </div>

          {/* Route & Hospitals */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide border-b pb-1">Hospitais da Rota</h4>
            <div className="space-y-3">
               {hospitalDetails.length > 0 ? (
                   hospitalDetails.map(h => {
                       // Construct GPS Links
                       const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(h.address + ' ' + h.city)}`;
                       const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.address + ' ' + h.city)}`;

                       return (
                           <div key={h.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                              <div className="flex items-start gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                  </svg>
                                  <div>
                                      <p className="font-bold text-gray-800 text-sm">{h.name}</p>
                                      <p className="text-xs text-gray-500">{h.address} - {h.city}</p>
                                  </div>
                              </div>
                              <div className="flex gap-2 pl-7 sm:pl-0">
                                  <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold hover:bg-blue-100">
                                      Waze
                                  </a>
                                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold hover:bg-gray-200">
                                      Maps
                                  </a>
                              </div>
                           </div>
                       );
                   })
               ) : (
                   <p className="text-sm text-gray-500 italic">Endereços não encontrados para esta rota.</p>
               )}
            </div>
          </div>

          {/* Recent History */}
          <div className="pt-2">
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Últimas Visitas
                </span>
                <span className="text-[10px] font-normal text-gray-400">Clique na mensagem para ver detalhes</span>
            </h4>
            
            {recentHistory.length === 0 ? (
                <div className="bg-gray-50 rounded p-4 text-center text-sm text-gray-500">
                    Nenhum histórico recente disponível para esta rota.
                </div>
            ) : (
                <div className="space-y-3">
                    {recentHistory.slice(0, 3).map((h, idx) => (
                        <div 
                           key={idx} 
                           onClick={handleNavigateToHistory}
                           className="bg-gray-50 p-3 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all group"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-blue-600 text-xs">
                                    {new Date(h.date).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="text-[10px] text-gray-500 italic truncate max-w-[120px]">
                                    {h.visitorNames}
                                </span>
                            </div>
                            <p className="text-gray-700 text-xs line-clamp-2 group-hover:text-blue-800">
                                {h.notes}
                            </p>
                        </div>
                    ))}
                </div>
            )}
          </div>

        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <Button variant="primary" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
};
