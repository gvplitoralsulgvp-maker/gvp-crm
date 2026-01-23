
import React from 'react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isHospitalMode?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText = 'Confirmar', 
  cancelText = 'Cancelar', 
  isDestructive = true,
  isHospitalMode 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className={`p-6 text-center ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${isDestructive ? 'bg-red-100' : 'bg-blue-100'}`}>
            {isDestructive ? (
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ) : (
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )}
          </div>
          <h3 className="text-lg leading-6 font-black uppercase tracking-tight mb-2">{title}</h3>
          <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {description}
          </p>
        </div>
        <div className={`px-4 py-4 sm:px-6 sm:flex sm:flex-row-reverse gap-2 border-t ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
          <Button 
            onClick={() => { onConfirm(); onClose(); }}
            className={`w-full sm:w-auto ${isDestructive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {confirmText}
          </Button>
          <Button 
            variant="secondary" 
            onClick={onClose}
            className="w-full sm:w-auto mt-2 sm:mt-0"
          >
            {cancelText}
          </Button>
        </div>
      </div>
    </div>
  );
};
