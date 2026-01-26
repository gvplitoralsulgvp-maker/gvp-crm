
import React from 'react';
import { createPortal } from 'react-dom';
import { SocialWorkerVisit, Member, Hospital } from '../types';
import { Button } from './Button';

interface SocialHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospital: Hospital;
  visits: SocialWorkerVisit[];
  members: Member[];
  isHospitalMode?: boolean;
}

export const SocialHistoryModal: React.FC<SocialHistoryModalProps> = ({ 
  isOpen, onClose, hospital, visits, members, isHospitalMode 
}) => {
  if (!isOpen) return null;

  const sortedVisits = [...visits]
    .filter(v => v.status === 'FINISHED')
    .sort((a, b) => b.date.localeCompare(a.date));

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
        <div className="bg-indigo-600 px-6 py-5 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-white font-bold text-lg">Histórico de Visitas (AS)</h3>
            <p className="text-indigo-100 text-xs font-medium uppercase tracking-wider">{hospital.name}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-indigo-500 p-2 rounded-lg transition-colors text-2xl leading-none">&times;</button>
        </div>

        <div className={`p-6 overflow-y-auto custom-scrollbar flex-grow ${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'}`}>
           {sortedVisits.length === 0 ? (
               <p className={`text-center py-10 italic ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Nenhuma visita institucional registrada.</p>
           ) : (
               <div className="space-y-4">
                   {sortedVisits.map(visit => {
                       const visitorNames = visit.memberIds.map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(' & ');
                       return (
                           <div key={visit.id} className={`p-4 rounded-xl border ${isHospitalMode ? 'bg-black/20 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                               <div className="flex justify-between items-start mb-2">
                                   <span className="font-black text-indigo-500 text-sm">
                                       {new Date(visit.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                   </span>
                               </div>
                               <p className={`text-xs font-bold mb-2 uppercase tracking-wide ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                   Visitantes: <span className={isHospitalMode ? 'text-gray-200' : 'text-gray-800'}>{visitorNames}</span>
                               </p>
                               {visit.report?.notes && (
                                   <div className={`p-3 rounded-lg text-xs leading-relaxed italic ${isHospitalMode ? 'bg-white/5 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                                       "{visit.report.notes}"
                                   </div>
                               )}
                           </div>
                       );
                   })}
               </div>
           )}
        </div>

        <div className={`p-4 border-t flex justify-end ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-50'}`}>
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">Fechar Histórico</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
