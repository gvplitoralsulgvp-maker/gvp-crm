
import React, { useState } from 'react';
import { Button } from './Button';

interface CancelVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (justification: string) => void;
  isHospitalMode?: boolean;
}

export const CancelVisitModal: React.FC<CancelVisitModalProps> = ({ isOpen, onClose, onConfirm, isHospitalMode }) => {
  const [justification, setJustification] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (justification.trim().length >= 5) {
      onConfirm(justification);
      setJustification('');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className={`rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
        <div className="bg-red-600 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Cancelar Minha Visita</h3>
          <button onClick={onClose} className="text-white hover:text-red-200 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6">
          <p className={`text-sm mb-4 ${isHospitalMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Ao cancelar, sua vaga ficará disponível para outro membro. Por favor, justifique o motivo.
          </p>

          <label className={`block text-[10px] font-bold uppercase mb-1 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Justificativa
          </label>
          <textarea
            className={`w-full border rounded-md p-3 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none resize-none transition-all ${
                isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-white border-gray-300'
            }`}
            rows={3}
            placeholder="Ex: Imprevisto de saúde, trabalho..."
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />
          
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Voltar</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleSubmit}
              disabled={justification.trim().length < 5}
            >
              Confirmar Cancelamento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
