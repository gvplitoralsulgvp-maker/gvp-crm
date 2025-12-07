
import React, { useState } from 'react';
import { Button } from './Button';

interface SwapRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: string;
  onConfirm: (newDate: string, note: string) => void;
}

export const SwapRequestModal: React.FC<SwapRequestModalProps> = ({ isOpen, onClose, currentDate, onConfirm }) => {
  const [newDate, setNewDate] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onConfirm(newDate, note);
    setNewDate('');
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
        <div className="bg-yellow-500 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Solicitar Troca</h3>
          <button onClick={onClose} className="text-white hover:text-yellow-100 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Você está solicitando a troca da visita do dia <strong>{new Date(currentDate).toLocaleDateString('pt-BR')}</strong>.
          </p>

          <div className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Sugestão de Nova Data (Opcional)
                  </label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    min={new Date().toISOString().split('T')[0]}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
              </div>

              <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Observação
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md p-2 text-sm resize-none"
                    rows={2}
                    placeholder="Ex: Posso trocar por qualquer sábado."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
              </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button 
              className="bg-yellow-500 hover:bg-yellow-600 text-white border-none"
              onClick={handleSubmit}
            >
              Enviar Solicitação
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
