
import React from 'react';
import { createPortal } from 'react-dom';
import { AppEvent } from '../types';
import { Button } from './Button';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: (present: boolean) => void;
  event: AppEvent;
  isHospitalMode?: boolean;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({ isOpen, onClose, event, isHospitalMode }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h3 className="text-white font-black text-xl leading-tight">Reunião Hoje!</h3>
            <p className="text-teal-100 text-xs font-medium uppercase tracking-widest mt-1">Controle de Presença</p>
        </div>

        <div className="p-6 text-center space-y-4">
            <div>
                <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Evento</p>
                <p className={`text-lg font-bold ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{event.title}</p>
                <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{event.location || 'Local não informado'} • {event.time || 'Horário não inf.'}</p>
            </div>

            <p className={`text-sm italic border-t pt-4 ${isHospitalMode ? 'border-gray-700 text-gray-300' : 'border-gray-100 text-gray-600'}`}>
                Você está presente nesta reunião?
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
                <Button 
                    variant="secondary" 
                    onClick={() => onClose(false)}
                    className="w-full justify-center rounded-xl py-3 border-2"
                >
                    Não
                </Button>
                <Button 
                    onClick={() => onClose(true)}
                    className="w-full justify-center bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-3 shadow-lg shadow-teal-500/30"
                >
                    Sim, Presente!
                </Button>
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
