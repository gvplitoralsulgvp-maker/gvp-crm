
import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

interface KpiItem {
    id: string;
    primaryText: string;
    secondaryText: string;
    tertiaryText?: string;
    tag?: string;
    tagColor?: string;
}

interface KpiDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: KpiItem[];
  isHospitalMode?: boolean;
}

export const KpiDetailModal: React.FC<KpiDetailModalProps> = ({ isOpen, onClose, title, items, isHospitalMode }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border flex flex-col max-h-[80vh] ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="p-6 border-b border-gray-100/10 flex justify-between items-center shrink-0">
            <h3 className={`font-black text-lg ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <button onClick={onClose} className={`p-2 rounded-full hover:bg-gray-100/10 ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        
        <div className="overflow-y-auto custom-scrollbar p-4 space-y-2">
            {items.length === 0 ? (
                <p className={`text-center py-8 text-sm italic ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Nenhum registro encontrado neste período.</p>
            ) : (
                items.map(item => (
                    <div key={item.id} className={`p-3 rounded-xl border flex justify-between items-center ${isHospitalMode ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                        <div>
                            <p className={`text-sm font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.primaryText}</p>
                            <p className={`text-xs ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.secondaryText}</p>
                            {item.tertiaryText && <p className={`text-[10px] ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.tertiaryText}</p>}
                        </div>
                        {item.tag && (
                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${item.tagColor || 'bg-gray-200 text-gray-600'}`}>
                                {item.tag}
                            </span>
                        )}
                    </div>
                ))
            )}
        </div>

        <div className={`p-4 border-t shrink-0 ${isHospitalMode ? 'border-gray-800 bg-[#1a1c1e]' : 'border-gray-100 bg-gray-50'}`}>
            <Button onClick={onClose} className="w-full justify-center">Fechar</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
