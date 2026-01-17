
import React, { useState } from 'react';
import { AppState, Patient, LogEntry, Notification, UserRole } from '../types';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';

interface PublicRequestPageProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
}

export const PublicRequestPage: React.FC<PublicRequestPageProps> = ({ state, onUpdateState }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    // Fix: Using hospitalId to align with Patient type definition
    hospitalId: '',
    treatment: '',
    floor: '',
    wing: '',
    bed: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.hospitalId) return;

    setIsSubmitting(true);

    // Find hospital name for log and notification display purposes
    const selectedHospital = state.hospitals.find(h => h.id === formData.hospitalId);
    const hospitalNameDisplay = selectedHospital ? selectedHospital.name : 'Hospital';

    // Fix: Agora a interface Patient em types.ts possui hospitalName e wing
    const newPatient: Patient = {
      id: crypto.randomUUID(),
      name: formData.name,
      // Fix: hospitalName replaced with hospitalId as per types.ts
      hospitalId: formData.hospitalId,
      hospitalName: hospitalNameDisplay, // Populando o nome para evitar problemas no histórico/agenda
      treatment: formData.treatment || 'Solicitação COLIH',
      admissionDate: new Date().toISOString().split('T')[0],
      active: true,
      floor: formData.floor,
      wing: formData.wing, // Agora permitido pela interface atualizada
      bed: formData.bed,
      notes: formData.notes,
      isExternalRequest: true,
      needsAccommodation: false,
      hasDirectivesCard: false,
      agentsNotified: false,
      formsConsidered: false,
      hasS55: false
    };

    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId: 'COLIH',
      userName: 'Portal Externo COLIH',
      action: 'Solicitação de Visita',
      // Fix: Property 'hospitalName' does not exist on type 'Patient'. Used local hospitalNameDisplay variable.
      details: `Novo paciente (${newPatient.name}) cadastrado via link público para o hospital ${hospitalNameDisplay}.`
    };

    // Notificar Admins
    const adminNotifications: Notification[] = state.members
      .filter(m => m.role === UserRole.ADMIN)
      .map(admin => ({
        id: crypto.randomUUID(),
        userId: admin.id,
        // Fix: Property 'hospitalName' does not exist on type 'Patient'. Used local hospitalNameDisplay variable.
        message: `Nova solicitação COLIH: Paciente ${newPatient.name} no ${hospitalNameDisplay}.`,
        type: 'info',
        read: false,
        timestamp: new Date().toISOString()
      }));

    onUpdateState({
      ...state,
      patients: [newPatient, ...state.patients],
      logs: [newLog, ...state.logs],
      notifications: [...adminNotifications, ...state.notifications]
    });

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1000);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center space-y-6 animate-fade-in border border-gray-100">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white shadow-lg">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Solicitação Enviada!</h2>
          <p className="text-gray-500 text-sm leading-relaxed">Os dados do paciente <strong>{formData.name}</strong> já foram integrados ao sistema do GVP Litoral Sul. Nossos voluntários serão notificados imediatamente.</p>
          <Button onClick={() => setIsSuccess(false)} variant="secondary" className="w-full rounded-2xl py-4">Fazer nova solicitação</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 flex flex-col items-center overflow-y-auto">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
           <div className="inline-flex p-3 bg-blue-600 rounded-2xl text-white shadow-xl mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
           </div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tight">Solicitação de Visita - COLIH</h1>
           <p className="text-gray-500 font-medium">Preencha os dados abaixo para designar uma nova visita hospitalar.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
           <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Completo do Paciente</label>
                <input 
                  required type="text" 
                  className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Nome do paciente"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Hospital de Internação</label>
                  <select 
                    required 
                    className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all"
                    value={formData.hospitalId}
                    onChange={e => setFormData({...formData, hospitalId: e.target.value})}
                  >
                    <option value="">Selecione o hospital...</option>
                    {/* Fix: Using hospital ID as the value to match expected state and type */}
                    {state.hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Motivo / Tratamento</label>
                  <input 
                    type="text" 
                    className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all"
                    value={formData.treatment}
                    onChange={e => setFormData({...formData, treatment: e.target.value})}
                    placeholder="Ex: Cirurgia de Fêmur"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase px-1">Andar</label>
                  <input type="text" className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all" value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase px-1">Ala</label>
                  <input type="text" className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all" value={formData.wing} onChange={e => setFormData({...formData, wing: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase px-1">Leito</label>
                  <input type="text" className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all" value={formData.bed} onChange={e => setFormData({...formData, bed: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Observações Adicionais</label>
                <textarea 
                  className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all resize-none"
                  rows={4}
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Informações sobre parentes, histórico ou urgência..."
                />
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full rounded-2xl py-4 text-base font-bold shadow-xl shadow-blue-500/30 transition-all active:scale-95"
                >
                  {isSubmitting ? 'Enviando Solicitação...' : 'Enviar Solicitação ao GVP'}
                </Button>
              </div>
           </form>
           
           <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">GVP Litoral Sul - Grupo de Visita a Pacientes</p>
           </div>
        </div>
        
        <div className="text-center">
           <button onClick={() => navigate('/login')} className="text-xs font-bold text-gray-400 hover:text-blue-600 uppercase tracking-widest transition-colors">Acesso Restrito Membros</button>
        </div>
      </div>
    </div>
  );
};
