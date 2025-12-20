
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
  isHospitalMode?: boolean;
}

const REPORT_TAGS = [
  "Paciente Dormindo", "Família Presente", "Médico no Quarto", 
  "Não Aceitou Visita", "Oração Realizada", "Leitura Bíblica",
  "Entregue Publicação", "Paciente Melhorou", "Paciente Piorou"
];

export const ReportModal: React.FC<ReportModalProps> = ({ 
  isOpen, onClose, onSave, initialReport, hospitalName, visitParticipants, recentHistory, isHospitalMode 
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

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Seu navegador não suporta ditado por voz. Tente usar o Google Chrome.");
      return;
    }

    if (isListening) {
      setIsListening(false); 
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
        if(prev.includes(tag)) return prev; 
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
        <div className="bg-blue-600 px-6 py-5 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-white font-bold text-lg">Relatório de Visita</h3>
            <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">{hospitalName}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-500 p-2 rounded-lg transition-colors text-2xl leading-none">&times;</button>
        </div>
        
        <div className={`flex-grow overflow-y-auto p-6 custom-scrollbar ${isHospitalMode ? 'bg-[#1a1c1e]' : 'bg-gray-50'}`}>
            <form id="report-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Visitantes (Dupla)</label>
                <div className={`border-2 rounded-xl px-4 py-3 text-sm font-bold shadow-sm ${isHospitalMode ? 'bg-[#212327] border-gray-800 text-gray-200' : 'bg-white border-gray-100 text-gray-700'}`}>
                    {visitorNames}
                </div>
            </div>

            <div className={`p-4 rounded-2xl border-2 shadow-sm ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-3 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Detalhes da Visita</label>
                
                <div className="flex flex-wrap gap-2 mb-4">
                   {REPORT_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        className={`text-[10px] font-bold border rounded-lg px-3 py-1.5 transition-all ${
                            isHospitalMode ? 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-blue-100 hover:border-blue-300'
                        }`}
                      >
                        + {tag}
                      </button>
                   ))}
                </div>

                <div className="relative">
                    <textarea 
                        required
                        rows={6}
                        className={`block w-full rounded-xl border-2 px-4 py-3 focus:ring-0 text-sm transition-all ${
                            isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white focus:border-blue-600' : 'bg-white border-gray-50 text-gray-800 focus:border-blue-500'
                        }`}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Descreva como foi a visita..."
                    />
                    
                    <div className="absolute bottom-3 right-3 flex gap-2">
                        <button
                            type="button"
                            onClick={toggleListening}
                            className={`px-3 py-1.5 rounded-lg border-2 flex items-center gap-2 text-[10px] font-bold transition-all ${
                                isListening 
                                ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' 
                                : isHospitalMode ? 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" /><path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" /></svg>
                            {isListening ? 'OUVINDO...' : 'DITAR'}
                        </button>

                        <button
                            type="button"
                            onClick={handleAiImprove}
                            disabled={isAiLoading || !notes.trim()}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5z" /></svg>
                            {isAiLoading ? 'MELHORANDO...' : 'USAR IA'}
                        </button>
                    </div>
                </div>
            </div>

            <div className={`flex items-center p-4 rounded-2xl border-2 ${isHospitalMode ? 'bg-red-900/10 border-red-900/30' : 'bg-red-50 border-red-100'}`}>
                <input
                    id="followup"
                    type="checkbox"
                    className="h-5 w-5 rounded-lg border-red-300 text-red-600 focus:ring-red-500"
                    checked={followUpNeeded}
                    onChange={(e) => setFollowUpNeeded(e.target.checked)}
                />
                <label htmlFor="followup" className="ml-3 block">
                    <span className={`block text-sm font-bold ${isHospitalMode ? 'text-red-400' : 'text-red-700'}`}>Requer acompanhamento urgente?</span>
                    <span className="block text-[10px] text-red-500 font-medium uppercase tracking-tighter">Notificará os administradores</span>
                </label>
            </div>
            </form>

            {recentHistory.length > 0 && (
                <div className={`mt-8 pt-6 border-t ${isHospitalMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isHospitalMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Histórico Recente desta Rota
                    </h4>
                    <div className="space-y-3">
                        {recentHistory.map((h, idx) => (
                            <div key={idx} className={`p-4 rounded-xl border-2 shadow-sm ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-50'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-blue-500 text-[10px]">
                                        {new Date(h.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase truncate max-w-[50%] ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {h.visitorNames}
                                    </span>
                                </div>
                                <p className={`text-xs leading-relaxed italic ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    "{h.notes}"
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className={`flex justify-end gap-3 p-6 border-t shrink-0 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
            <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
            <Button variant="primary" type="submit" form="report-form">Salvar Relatório</Button>
        </div>
      </div>
    </div>
  );
};
