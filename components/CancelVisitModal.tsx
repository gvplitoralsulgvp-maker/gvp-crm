
import React, { useState } from 'react';
import { Button } from './Button';

interface CancelVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (justification: string) => void;
}

export const CancelVisitModal: React.FC<CancelVisitModalProps> = ({ isOpen, onClose, onConfirm }) => {
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
        <div className="bg-red-600 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Cancelar Visita</h3>
          <button onClick={onClose} className="text-white hover:text-red-200 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Ao cancelar, sua vaga ficará disponível para outro membro. Por favor, justifique o motivo.
          </p>

          <label className="block text-xs font-bold text-gray-700 mb-1">
            Justificativa
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
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
