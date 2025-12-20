
import React, { useState } from 'react';
import { VisitSlot, VisitRoute } from '../types';

interface FullCalendarProps {
  selectedDate: string;
  onChange: (date: string) => void;
  visits: VisitSlot[];
  routes: VisitRoute[];
  isHospitalMode?: boolean;
}

export const FullCalendar: React.FC<FullCalendarProps> = ({ selectedDate, onChange, visits, routes, isHospitalMode }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptySlots = Array.from({ length: firstDay }, (_, i) => i);
  const activeRoutesCount = routes.filter(r => r.active).length;

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const getDayStatus = (dateStr: string) => {
    const dayVisits = visits.filter(v => v.date === dateStr);
    const totalSlots = activeRoutesCount * 2;
    let filledSlots = 0;
    dayVisits.forEach(v => filledSlots += v.memberIds.length);
    if (filledSlots === 0) return 'empty';
    if (filledSlots === totalSlots) return 'full';
    return 'partial';
  };

  return (
    <div className={`rounded-xl overflow-hidden ${isHospitalMode ? 'bg-[#212327]' : 'bg-white'}`}>
      <div className={`flex items-center justify-between px-2 py-4 border-b ${isHospitalMode ? 'border-gray-800' : 'border-gray-50'}`}>
        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className={`font-bold capitalize tracking-tight text-lg ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>
          {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className={`grid grid-cols-7 text-center text-[10px] font-bold py-3 uppercase tracking-widest ${isHospitalMode ? 'bg-[#1a1c1e] text-gray-500' : 'bg-gray-50/50 text-gray-400'}`}>
        <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
      </div>

      <div className={`grid grid-cols-7 border-l border-t ${isHospitalMode ? 'border-gray-800' : 'border-gray-50'}`}>
        {emptySlots.map(i => <div key={`empty-${i}`} className={`h-24 sm:h-32 border-r border-b ${isHospitalMode ? 'border-gray-800 bg-[#1a1c1e]/50' : 'border-gray-50 bg-gray-50/20'}`} />)}
        
        {daysArray.map(day => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateStr === selectedDate;
          const isToday = new Date().toISOString().split('T')[0] === dateStr;
          const status = getDayStatus(dateStr);
          const dayVisits = visits.filter(v => v.date === dateStr);
          const confirmados = dayVisits.reduce((acc, v) => acc + v.memberIds.length, 0);
          const totalNecessario = activeRoutesCount * 2;

          return (
            <div 
              key={day}
              onClick={() => onChange(dateStr)}
              className={`h-24 sm:h-32 border-r border-b relative cursor-pointer transition-all flex flex-col items-center justify-start p-2
                ${isHospitalMode ? 'border-gray-800' : 'border-gray-50'}
                ${isSelected ? (isHospitalMode ? 'bg-blue-900/20 ring-2 ring-inset ring-blue-500/50' : 'bg-blue-50 ring-2 ring-inset ring-blue-500') : (isHospitalMode ? 'bg-[#212327] hover:bg-[#2d3135]' : 'bg-white hover:bg-blue-50/50')}
              `}
            >
              <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                isToday ? 'bg-blue-600 text-white shadow-md' : (isHospitalMode ? 'text-gray-400' : 'text-gray-500')
              }`}>
                {day}
              </span>

              <div className="mt-auto mb-2 flex flex-col items-center gap-1.5 w-full">
                {status === 'full' ? (
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border scale-90 sm:scale-100 ${isHospitalMode ? 'bg-green-900/20 border-green-900/50 text-green-500' : 'bg-green-50 border-green-100 text-green-600'}`}>
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Ok</span>
                  </div>
                ) : status === 'partial' ? (
                  <div className="flex flex-col items-center gap-1 w-full px-1">
                    <div className={`w-full h-1 rounded-full overflow-hidden ${isHospitalMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <div className="bg-yellow-400 h-full rounded-full transition-all duration-500" style={{ width: `${(confirmados / totalNecessario) * 100}%` }}></div>
                    </div>
                    <span className="text-[8px] text-yellow-600 font-bold uppercase">{confirmados}/{totalNecessario}</span>
                  </div>
                ) : (
                  <div className={`px-2 py-0.5 rounded-full border scale-90 sm:scale-100 ${isHospitalMode ? 'bg-red-900/10 border-red-900/30 text-red-900' : 'bg-red-50 border-red-100 text-red-500'}`}>
                    <span className="text-[8px] font-bold uppercase">Livre</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
