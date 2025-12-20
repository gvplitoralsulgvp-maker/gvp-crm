
import React, { useState } from 'react';
import { Button } from './Button';
import { Member } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Member;
  onConfirm: (newPassword: string) => void;
  isHospitalMode?: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, currentUser, onConfirm, isHospitalMode }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check old password
    const actualCurrent = currentUser.password || '123456';
    if (currentPassword !== actualCurrent) {
        setError('Senha atual incorreta.');
        return;
    }

    // Check new match
    if (newPassword !== confirmNewPassword) {
        setError('As novas senhas não coincidem.');
        return;
    }

    if (newPassword.length < 6) {
        setError('A nova senha deve ter no mínimo 6 caracteres.');
        return;
    }

    onConfirm(newPassword);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
        <div className="bg-blue-600 px-6 py-5 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Alterar Senha</h3>
          <button onClick={onClose} className="text-white hover:bg-blue-500 p-2 rounded-lg transition-colors text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className={`p-6 space-y-4 ${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-white'}`}>
          
          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${isHospitalMode ? 'text-gray-500' : 'text-gray-700'}`}>Senha Atual</label>
            <input 
                type="password" required
                className={`w-full border rounded-xl p-3 text-sm transition-all ${isHospitalMode ? 'bg-[#212327] border-gray-800 text-white focus:border-blue-600' : 'bg-white border-gray-200'}`}
                value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="pt-2 border-t border-gray-800/20">
            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${isHospitalMode ? 'text-gray-500' : 'text-gray-700'}`}>Nova Senha</label>
            <input 
                type="password" required
                className={`w-full border rounded-xl p-3 text-sm transition-all ${isHospitalMode ? 'bg-[#212327] border-gray-800 text-white focus:border-blue-600' : 'bg-white border-gray-200'}`}
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${isHospitalMode ? 'text-gray-500' : 'text-gray-700'}`}>Confirmar Nova Senha</label>
            <input 
                type="password" required
                className={`w-full border rounded-xl p-3 text-sm transition-all ${isHospitalMode ? 'bg-[#212327] border-gray-800 text-white focus:border-blue-600' : 'bg-white border-gray-200'}`}
                value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-[10px] text-red-600 font-bold bg-red-500/10 p-2 rounded-lg text-center uppercase border border-red-500/20">{error}</p>}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800/20">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar Senha</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
