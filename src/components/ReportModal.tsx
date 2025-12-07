import React, { useState, useEffect, useRef } from 'react';
import { VisitReport } from '@/types';
import { Button } from './Button';
import { improveReport } from '../services/geminiService';

export interface HistoryItem {
  date: string;
  notes: string;
  visitorNames: string;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (report: VisitReport) => void;
  initialReport?: VisitReport;
  hospitalName: string;
  visitParticipants: string; 
  recentHistory: HistoryItem[]; 
}

// Quick Tags for easy reporting
const REPORT_TAGS = [
  "Paciente Dormindo", "Família Presente", "Médico no Quarto", 
  "Não Aceitou Visita", "Oração Realizada", "Leitura Bíblica",
  "Entregue Publicação", "Paciente Melhorou", "Paciente Piorou"
];

export const ReportModal: React.FC<ReportModalProps> = ({ 
  isOpen, onClose, onSave, initialReport, hospitalName, visitParticipants, recentHistory 
}) => {
  const [visitorNames, setVisitorNames] = useState(initialReport?.doctorName || visitParticipants);
  const [notes, setNotes] = useState(initialReport?.notes || '');
  const [followUpNeeded, setFollowUpNeeded] = useState(initialReport?.followUpNeeded || false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!initialReport?.doctorName) {
        setVisitorNames(visitParticipants);
    }
  }, [visitParticipants, initialReport]);

  if (!isOpen) return null;

  // --- Logic for Speech Recognition ---
  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Seu navegador não suporta ditado por voz. Tente usar o Google Chrome.");
      return;
    }

    if (isListening) {
      setIsListening(false); // Stop handled by onend
    } else {
      setIsListening(true);
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setNotes((prev) => prev ? `${prev} ${transcript}` : transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    }
  };

  const addTag = (tag: string) => {
    setNotes((prev) => {
        if(prev.includes(tag)) return prev; // Avoid duplicates? Or just append.
        return prev ? `${prev} | ${tag}` : tag;
    });
  };

  const handleAiImprove = async () => {
    if (!notes.trim()) return;
    setIsAiLoading(true);
    try {
      const improved = await improveReport(notes);
      setNotes(improved);
    } catch (e) {
      alert("Erro ao conectar com a IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      doctorName: visitorNames, 
      notes,
      followUpNeeded,
      createdAt: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center flex-shrink-0">
          <h3 className="text-white font-semibold text-lg">Relatório de Visita: {hospitalName}</h3>
          <button onClick={onClose} className="text-white hover:text-blue-200 text-2xl">&times;</button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
            <form id="report-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Visitantes (Dupla)</label>
                <input 
                type="text" 
                readOnly
                className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600 sm:text-sm cursor-not-allowed"
                value={visitorNames}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Detalhes da Visita</label>
                
                {/* Quick Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                   {REPORT_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        className="text-xs bg-gray-100 hover:bg-blue-100 text-gray-700 border border-gray-200 rounded-full px-3 py-1 transition-colors"
                      >
                        + {tag}
                      </button>
                   ))}
                </div>

                <div className="relative">
                <textarea 
                    required
                    rows={6}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Descreva como foi a visita..."
                />
                
                <div className="absolute bottom-2 right-2 flex gap-2">
                    {/* Microphone Button */}
                    <button
                        type="button"
                        onClick={toggleListening}
                        className={`text-xs px-2 py-1 rounded-md border flex items-center gap-1 transition-all ${
                            isListening ? 'bg-red-100 text-red-700 border-red-300 animate-pulse' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                        }`}
                        title="Ditar texto"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                          <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
                        </svg>
                        {isListening ? 'Ouvindo...' : 'Ditar'}
                    </button>

                    {/* AI Button */}
                    <button
                        type="button"
                        onClick={handleAiImprove}
                        disabled={isAiLoading || !notes.trim()}
                        className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-md border border-purple-200 hover:bg-purple-200 flex items-center gap-1 transition-colors"
                    >
                        {isAiLoading ? <span>✨ ...</span> : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM6.97 11.03a.75.75 0 111.06 1.06l-2.25 2.25a.75.75 0 11-1.06-1.06l2.25-2.25zm11.25 0a.75.75 0 10-1.06 1.06l2.25 2.25a.75.75 0 101.06-1.06l-2.25-2.25z" clipRule="evenodd" />
                                </svg>
                                <span>IA Melhorar</span>
                            </>
                        )}
                    </button>
                </div>
                </div>
            </div>

            <div className="flex items-center p-3 bg-red-50 rounded border border-red-100">
                <input
                id="followup"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                checked={followUpNeeded}
                onChange={(e) => setFollowUpNeeded(e.target.checked)}
                />
                <label htmlFor="followup" className="ml-2 block text-sm font-medium text-red-700">
                Requer nova visita/acompanhamento urgente?
                <span className="block text-xs font-normal text-red-500">Isso enviará um alerta aos administradores.</span>
                </label>
            </div>
            </form>

            {/* Historic Section */}
            {recentHistory.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Histórico Recente desta Rota
                    </h4>
                    <div className="space-y-3 bg-gray-50 p-4 rounded-md max-h-48 overflow-y-auto custom-scrollbar">
                        {recentHistory.map((h, idx) => (
                            <div key={idx} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-blue-600 text-xs">
                                        {new Date(h.date).toLocaleDateString('pt-BR')}
                                    </span>
                                    <span className="text-[10px] text-gray-500 italic text-right max-w-[50%] truncate">
                                        {h.visitorNames}
                                    </span>
                                </div>
                                <p className="text-gray-700 text-xs whitespace-pre-wrap line-clamp-3" title={h.notes}>
                                    {h.notes}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
        <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
        <Button variant="primary" type="submit" form="report-form">Salvar Relatório</Button>
        </div>
      </div>
    </div>
  );
};