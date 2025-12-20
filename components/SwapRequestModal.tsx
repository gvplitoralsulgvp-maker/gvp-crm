
import React, { useState } from 'react';
import { Button } from './Button';

interface SwapRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: string;
  onConfirm: (newDate: string, note: string) => void;
  isHospitalMode?: boolean;
}

export const SwapRequestModal: React.FC<SwapRequestModalProps> = ({ isOpen, onClose, currentDate, onConfirm, isHospitalMode }) => {
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
      <div className={`rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
        <div className="bg-yellow-500 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Solicitar Troca</h3>
          <button onClick={onClose} className="text-white hover:text-yellow-100 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6">
          <p className={`text-sm mb-4 ${isHospitalMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Você está solicitando a troca da visita do dia <strong>{new Date(currentDate + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>.
          </p>

          <div className="space-y-4">
              <div>
                  <label className={`block text-[10px] font-bold uppercase mb-1 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Sugestão de Nova Data (Opcional)
                  </label>
                  <input 
                    type="date" 
                    className={`w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                    min={new Date().toISOString().split('T')[0]}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
              </div>

              <div>
                  <label className={`block text-[10px] font-bold uppercase mb-1 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Observação / Motivo
                  </label>
                  <textarea
                    className={`w-full border rounded-md p-2 text-sm resize-none focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                    rows={3}
                    placeholder="Ex: Imprevisto no trabalho, gostaria de trocar pelo próximo sábado."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
              </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button 
              className="bg-yellow-500 hover:bg-yellow-600 text-white border-none shadow-md"
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
