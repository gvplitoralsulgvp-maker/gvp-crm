
import React from 'react';

interface CalendarWidgetProps {
  selectedDate: string;
  onChange: (date: string) => void;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ selectedDate, onChange }) => {
  const today = new Date();
  const current = new Date(selectedDate);
  
  // Simple navigation helpers
  const handlePrevDay = () => {
    const d = new Date(current);
    d.setDate(d.getDate() - 1);
    onChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(current);
    d.setDate(d.getDate() + 1);
    onChange(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    onChange(today.toISOString().split('T')[0]);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00'); // Fix timezone offset issues
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col items-center justify-center">
      <div className="flex items-center justify-between w-full max-w-md">
        <button 
          onClick={handlePrevDay}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        
        <div className="text-center">
            <span className="block text-xs font-semibold text-blue-600 uppercase tracking-wide">Agenda do Dia</span>
            <div className="flex items-center gap-2 justify-center">
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => onChange(e.target.value)}
                    className="text-lg font-bold text-gray-800 bg-transparent border-none focus:ring-0 p-0 text-center cursor-pointer max-w-[160px]"
                />
            </div>
            <p className="text-sm text-gray-500 capitalize">{formatDate(selectedDate)}</p>
        </div>

        <button 
          onClick={handleNextDay}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
      
      {selectedDate !== today.toISOString().split('T')[0] && (
        <button onClick={handleToday} className="mt-2 text-xs text-blue-600 hover:underline">
          Voltar para Hoje
        </button>
      )}
    </div>
  );
};
