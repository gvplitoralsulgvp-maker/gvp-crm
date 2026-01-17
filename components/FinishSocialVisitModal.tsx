
import React, { useState } from 'react';
import { Button } from './Button';

interface FinishSocialVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  hospitalName: string;
  isHospitalMode?: boolean;
}

export const FinishSocialVisitModal: React.FC<FinishSocialVisitModalProps> = ({ isOpen, onClose, onConfirm, hospitalName, isHospitalMode }) => {
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-white font-bold text-lg">Visita Assistência Social</h3>
            <p className="text-indigo-100 text-xs uppercase font-bold tracking-widest">{hospitalName}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-indigo-500 p-2 rounded-lg transition-colors text-2xl leading-none">&times;</button>
        </div>

        <div className={`p-6 space-y-4 ${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'}`}>
          <div className="space-y-2">
            <label className={`block text-[10px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Relatório da Interação
            </label>
            <textarea
              className={`w-full border-2 rounded-xl p-4 text-sm focus:ring-0 transition-all resize-none ${
                isHospitalMode ? 'bg-[#212327] border-gray-800 text-white focus:border-indigo-600' : 'bg-white border-gray-100 text-gray-800 focus:border-indigo-500'
              }`}
              rows={6}
              placeholder="Descreva quem foi contatado, receptividade e se houve entrega de material..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className={`p-6 border-t flex justify-end gap-3 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px] shadow-lg"
            onClick={() => onConfirm(notes)}
            disabled={notes.trim().length < 10}
          >
            Finalizar Relato
          </Button>
        </div>
      </div>
    </div>
  );
};
