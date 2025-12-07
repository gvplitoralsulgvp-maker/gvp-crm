
import React, { useState } from 'react';
import { Button } from './Button';

interface FinishVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}

export const FinishVisitModal: React.FC<FinishVisitModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const charCount = note.length;
  const isValid = charCount >= 5 && charCount <= 50;

  const handleSubmit = () => {
    if (isValid) {
      onConfirm(note);
      setNote(''); // Reset
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
        <div className="bg-green-600 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Concluir Visita</h3>
          <button onClick={onClose} className="text-white hover:text-green-100 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Descreva brevemente como foi a visita para finalizá-la.
          </p>

          <label className="block text-xs font-bold text-gray-700 mb-1">
            Resumo da Visita
          </label>
          <textarea
            className={`w-full border rounded-md p-3 text-sm focus:ring-2 focus:outline-none resize-none ${
              isValid ? 'border-gray-300 focus:ring-green-500' : 'border-red-300 focus:ring-red-500'
            }`}
            rows={3}
            placeholder="Ex: Visita realizada, tudo ok."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={50}
          />
          
          <div className="flex justify-between items-center mt-2">
            <span className={`text-xs font-medium ${isValid ? 'text-gray-500' : 'text-red-500'}`}>
              {charCount} / 50 caracteres
            </span>
            {!isValid && (
              <span className="text-[10px] text-red-500">
                Mínimo 5, Máximo 50.
              </span>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSubmit}
              disabled={!isValid}
            >
              Concluir & Arquivar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
