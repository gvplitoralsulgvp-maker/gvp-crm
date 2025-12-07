
import React, { useState } from 'react';
import { Button } from './Button';
import { Member } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Member;
  onConfirm: (newPassword: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, currentUser, onConfirm }) => {
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Alterar Senha</h3>
          <button onClick={onClose} className="text-white hover:text-blue-100 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Senha Atual</label>
            <input 
                type="password" required
                className="w-full border rounded-md p-2 text-sm"
                value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Nova Senha</label>
            <input 
                type="password" required
                className="w-full border rounded-md p-2 text-sm"
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Confirmar Nova Senha</label>
            <input 
                type="password" required
                className="w-full border rounded-md p-2 text-sm"
                value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded text-center">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar Nova Senha</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
