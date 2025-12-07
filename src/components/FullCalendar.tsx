
import React, { useState } from 'react';
import { VisitSlot, VisitRoute } from '../types';

interface FullCalendarProps {
  selectedDate: string;
  onChange: (date: string) => void;
  visits: VisitSlot[];
  routes: VisitRoute[];
  filterMemberId?: string;
}

export const FullCalendar: React.FC<FullCalendarProps> = ({ selectedDate, onChange, visits, routes, filterMemberId }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptySlots = Array.from({ length: firstDay }, (_, i) => i);
  
  // Sort routes by name to maintain consistent order in the visual stack
  const activeRoutes = routes.filter(r => r.active).sort((a,b) => a.name.localeCompare(b.name));

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-200 rounded-full">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="font-semibold text-gray-800 capitalize">
          {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={handleNextMonth} className="p-1 hover:bg-gray-200 rounded-full">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 py-2 border-b border-gray-100 bg-white">
        <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
      </div>

      {/* Grid Body */}
      <div className="grid grid-cols-7 text-sm bg-gray-50">
        {emptySlots.map(i => <div key={`empty-${i}`} className="h-20 sm:h-28 border-r border-b border-gray-100 bg-gray-50" />)}
        
        {daysArray.map(day => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateStr === selectedDate;
          const isToday = new Date().toISOString().split('T')[0] === dateStr;
          
          // Logic to check general status for the filter mode
          const dayVisits = visits.filter(v => v.date === dateStr);
          const isMemberScheduled = filterMemberId ? dayVisits.some(v => v.memberIds.includes(filterMemberId)) : false;

          return (
            <div 
              key={day}
              onClick={() => onChange(dateStr)}
              className={`h-20 sm:h-28 border-r border-b border-gray-100 relative cursor-pointer transition-colors hover:bg-blue-50 flex flex-col items-center justify-start pt-1.5 pb-1
                ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-500 z-10' : 'bg-white'}
              `}
            >
              <span className={`text-xs font-medium mb-1 ${isToday ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-gray-700'}`}>
                {day}
              </span>

              {/* ROUTE LIST INDICATORS */}
              <div className="w-full px-1 flex flex-col gap-0.5 mt-auto mb-1">
                 {/* Filter Mode: Simple Indicator */}
                 {filterMemberId ? (
                     isMemberScheduled && (
                        <div className="w-full h-2 bg-blue-600 rounded-full mx-auto mt-2" title="Membro Escalado"></div>
                     )
                 ) : (
                     /* General Mode: List of Routes */
                     activeRoutes.map(route => {
                         const slot = dayVisits.find(v => v.routeId === route.id);
                         const count = slot ? slot.memberIds.length : 0;
                         
                         let bgClass = 'bg-red-400';
                         if (count === 1) bgClass = 'bg-yellow-400';
                         if (count === 2) bgClass = 'bg-green-500';

                         return (
                             <div 
                                key={route.id} 
                                className={`w-full h-1.5 sm:h-2 rounded-full ${bgClass}`} 
                                title={`${route.name}: ${count}/2 confirmados`}
                             />
                         );
                     })
                 )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="px-4 py-2 border-t border-gray-100 flex flex-wrap gap-4 text-[10px] text-gray-500 justify-center">
         {filterMemberId ? (
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-600"></div> Membro Escalado</div>
         ) : (
            <>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Rota Completa</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Falta 1</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div> Vazio</div>
            </>
         )}
      </div>
    </div>
  );
};
