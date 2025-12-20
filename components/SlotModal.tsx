
import React, { useState } from 'react';
import { Member, VisitRoute, UserRole } from '../types';
import { Button } from './Button';

interface SlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: VisitRoute;
  currentMemberIds: string[];
  allMembers: Member[];
  onSave: (newMemberIds: string[]) => void;
  currentUser: Member | null;
}

export const SlotModal: React.FC<SlotModalProps> = ({ 
  isOpen, onClose, route, currentMemberIds, allMembers, onSave, currentUser 
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(currentMemberIds);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !currentUser) return null;

  const isAdmin = currentUser.role === UserRole.ADMIN;

  const toggleMember = (id: string) => {
    // Permission check
    if (!isAdmin && id !== currentUser.id) {
        alert("Você só pode adicionar ou remover seu próprio nome da agenda.");
        return;
    }

    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(mid => mid !== id));
    } else {
      // Check limits
      if (selectedIds.length < 2) {
        setSelectedIds([...selectedIds, id]);
      } else {
        alert("Esta dupla já está completa. Remova alguém antes de adicionar.");
      }
    }
  };

  const filteredMembers = allMembers.filter(m => 
    m.active && 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sorting: Current User first, then Selected ones, then Alphabetical
  filteredMembers.sort((a, b) => {
    if (a.id === currentUser.id) return -1;
    if (b.id === currentUser.id) return 1;
    const aSelected = selectedIds.includes(a.id);
    const bSelected = selectedIds.includes(b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
        <div className="bg-gray-50 px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Definir Dupla</h3>
          <p className="text-sm text-blue-600 font-medium">{route.name}</p>
          <div className="flex flex-wrap gap-1 mt-2 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
            {route.hospitals.join(' • ')}
          </div>
        </div>

        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar membro..."
              className="w-full border-2 border-gray-100 rounded-xl px-10 py-2.5 text-sm focus:border-blue-500 focus:ring-0 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="overflow-y-auto flex-grow p-4 space-y-2 bg-gray-50 custom-scrollbar">
           <div className="text-[10px] font-bold text-gray-500 uppercase px-2 mb-2 tracking-widest">
             Selecionados ({selectedIds.length}/2)
           </div>
           
           {filteredMembers.map(member => {
             const isSelected = selectedIds.includes(member.id);
             const isMe = member.id === currentUser.id;
             const canToggle = isAdmin || isMe;
             
             return (
               <div 
                 key={member.id}
                 onClick={() => canToggle && toggleMember(member.id)}
                 className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                   isSelected 
                     ? 'bg-blue-50 border-blue-600 shadow-sm' 
                     : 'bg-white border-transparent hover:border-gray-200'
                 } ${!canToggle ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
               >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {member.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                        {member.name} {isMe && '(Você)'}
                      </p>
                      {!canToggle && <p className="text-[10px] text-red-500 font-medium">Acesso restrito ao seu próprio nome</p>}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                    </div>
                  )}
               </div>
             );
           })}
        </div>

        <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-3">
          <Button variant="secondary" className="px-6" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" className="px-6" onClick={() => onSave(selectedIds)}>Salvar Dupla</Button>
        </div>
      </div>
    </div>
  );
};
