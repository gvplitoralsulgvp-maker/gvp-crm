
import React from 'react';
import { VisitSlot, VisitRoute, Member } from '../types';
import { Button } from './Button';

interface ViewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: VisitSlot | null;
  route: VisitRoute | undefined;
  members: Member[];
  isHospitalMode?: boolean;
}

export const ViewReportModal: React.FC<ViewReportModalProps> = ({ 
  isOpen, onClose, slot, route, members, isHospitalMode 
}) => {
  if (!isOpen || !slot || !slot.report) return null;

  const memberNames = slot.memberIds
    .map(id => members.find(m => m.id === id)?.name)
    .filter(Boolean)
    .join(' & ');

  const formattedDate = new Date(slot.date + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
        <div className="bg-blue-600 px-6 py-5 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-white font-bold text-lg">Relatório de Visita</h3>
            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">{route?.name}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-500 p-2 rounded-lg transition-colors text-2xl leading-none">&times;</button>
        </div>

        <div className={`p-6 overflow-y-auto custom-scrollbar space-y-6 ${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'}`}>
           <div className={`p-4 rounded-xl border ${isHospitalMode ? 'bg-black/20 border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Data da Realização</p>
                    <p className={`text-sm font-bold capitalize ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{formattedDate}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Status</p>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-md uppercase">Finalizada</span>
                  </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200/10">
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Visitantes</p>
                  <p className={`text-sm font-medium ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{memberNames}</p>
              </div>
           </div>

           <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Relato por {slot.report.doctorName}
                  </p>
              </div>
              <div className={`p-5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap border ${isHospitalMode ? 'bg-blue-900/10 border-blue-500/30 text-gray-300' : 'bg-white border-gray-200 text-gray-700 shadow-sm'}`}>
                 {slot.report.notes}
              </div>
           </div>
           
           {slot.report.followUpNeeded && (
               <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 animate-pulse">
                   <div className="p-2 bg-red-500 rounded-lg text-white">
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                   </div>
                   <div>
                       <p className="text-xs font-black text-red-600 uppercase">Atenção Necessária</p>
                       <p className="text-[10px] text-red-500 font-medium">Os visitantes sinalizaram necessidade de acompanhamento.</p>
                   </div>
               </div>
           )}
        </div>

        <div className={`p-4 border-t flex justify-end ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-50'}`}>
          <Button onClick={onClose} className="w-full sm:w-auto">Fechar Relatório</Button>
        </div>
      </div>
    </div>
  );
};
