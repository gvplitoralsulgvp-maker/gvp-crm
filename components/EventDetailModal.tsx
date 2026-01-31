
import React from 'react';
import { createPortal } from 'react-dom';
import { AppEvent } from '../types';
import { Button } from './Button';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: AppEvent | null;
  isHospitalMode?: boolean;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ isOpen, onClose, event, isHospitalMode }) => {
  if (!isOpen || !event) return null;

  const handleOpenMap = (service: 'google' | 'waze') => {
    if (!event.location) return;
    const query = encodeURIComponent(event.location);
    const url = service === 'google' 
      ? `https://www.google.com/maps/search/?api=1&query=${query}`
      : `https://waze.com/ul?q=${query}`;
    window.open(url, '_blank');
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border flex flex-col ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
        
        <div className="relative h-24 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
            <div className="text-white text-center">
                <p className="text-xs font-black uppercase tracking-widest opacity-80">{new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                <h3 className="text-3xl font-black">{new Date(event.date + 'T12:00:00').getDate()}</h3>
                <p className="text-xs font-bold uppercase">{new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long' })}</p>
            </div>
            <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white p-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div className="p-6 space-y-6">
            <div>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded mb-2 inline-block ${event.targetGroup === 'GVP' ? 'bg-blue-100 text-blue-700' : event.targetGroup === 'COLIH' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-700'}`}>
                    Público: {event.targetGroup === 'ALL' ? 'Geral' : event.targetGroup}
                </span>
                <h2 className={`text-xl font-bold leading-tight ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{event.title}</h2>
                {event.time && (
                    <p className={`text-sm mt-1 font-medium flex items-center gap-2 ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Horário: {event.time}
                    </p>
                )}
            </div>

            {event.description && (
                <div className={`p-4 rounded-xl border ${isHospitalMode ? 'bg-black/20 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
                </div>
            )}

            <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Localização</label>
                <div className="flex items-start gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${isHospitalMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <p className={`text-sm font-medium pt-1 ${isHospitalMode ? 'text-gray-300' : 'text-gray-800'}`}>
                        {event.location || 'Local não definido'}
                    </p>
                </div>

                {event.location && (
                    <div className="grid grid-cols-2 gap-3">
                        <Button 
                            variant="secondary" 
                            onClick={() => handleOpenMap('waze')}
                            className="w-full justify-center text-xs"
                        >
                            Abrir Waze
                        </Button>
                        <Button 
                            onClick={() => handleOpenMap('google')}
                            className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-lg"
                        >
                            Google Maps
                        </Button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
