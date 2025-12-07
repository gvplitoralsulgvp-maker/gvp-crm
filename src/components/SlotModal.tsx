
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
      // If it's 2 people, check if we can replace or if it's full
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Definir Dupla</h3>
          <p className="text-sm text-gray-500">{route.name}</p>
          <div className="flex flex-wrap gap-1 mt-1 text-xs text-gray-400">
            {route.hospitals.join(' + ')}
          </div>
        </div>

        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Buscar membro..."
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-y-auto flex-grow p-4 space-y-2">
           <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
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
                 className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
                   isSelected 
                     ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' 
                     : 'hover:bg-gray-50 border-gray-200'
                 } ${!canToggle ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}`}
               >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {member.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {member.name} {isMe && '(Você)'}
                      </p>
                      {!canToggle && <p className="text-xs text-red-400">Apenas Admins podem alterar</p>}
                    </div>
                  </div>
                  {isSelected && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-600">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  )}
               </div>
             );
           })}
        </div>

        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => onSave(selectedIds)}>Confirmar</Button>
        </div>
      </div>
    </div>
  );
};
