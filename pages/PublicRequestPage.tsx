
import React, { useState, useMemo } from 'react';
import { AppState, Patient, LogEntry, AppNotification, UserRole } from '../types';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { atomicUpdate } from '../services/storageService';

interface PublicRequestPageProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
}

export const PublicRequestPage: React.FC<PublicRequestPageProps> = ({ state, onUpdateState }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    gender: '',
    companionName: '',
    companionPhone: '',
    spiritualStatus: '',
    localElder: '',
    hospitalId: '',
    room: '',
    floor: '',
    wing: '',
    bed: '',
    visitTime: '',
    isSurgical: false,
    surgeryDate: '',
    treatment: '',
    clinicalStatus: '',
    notes: '',
    // Novos campos
    hasDirectivesCard: false,
    agentsNotified: false,
    hasS55: false,
    needsAccommodation: false,
    isIsolation: false,
    isolationType: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Filtra hospitais válidos para evitar duplicidade de placeholder ou nomes vazios
  const validHospitals = useMemo(() => {
    return state.hospitals.filter(h => h.name && h.name.trim() !== "" && h.name.toLowerCase() !== "selecione o hospital...");
  }, [state.hospitals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.hospitalId) {
      alert("Por favor, preencha o nome do paciente e selecione um hospital.");
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedHospital = validHospitals.find(h => h.id === formData.hospitalId);
      const hospitalNameDisplay = selectedHospital ? selectedHospital.name : 'Hospital';

      const newPatient: Patient = {
        id: crypto.randomUUID(),
        name: formData.name,
        phone: formData.phone,
        age: formData.age,
        gender: formData.gender,
        companionName: formData.companionName,
        companionPhone: formData.companionPhone,
        spiritualStatus: formData.spiritualStatus,
        localElder: formData.localElder,
        hospitalId: formData.hospitalId,
        hospitalName: hospitalNameDisplay,
        room: formData.room,
        floor: formData.floor,
        wing: formData.wing,
        bed: formData.bed,
        visitTime: formData.visitTime,
        isSurgical: formData.isSurgical,
        surgeryDate: formData.surgeryDate,
        clinicalStatus: formData.clinicalStatus,
        treatment: formData.treatment || 'Solicitação via Portal COLIH',
        admissionDate: new Date().toISOString().split('T')[0],
        active: true,
        notes: formData.notes,
        isExternalRequest: true,
        // Novos campos mapeados
        needsAccommodation: formData.needsAccommodation,
        hasDirectivesCard: formData.hasDirectivesCard,
        agentsNotified: formData.agentsNotified,
        formsConsidered: false, // S-401 geralmente é interno
        hasS55: formData.hasS55,
        isIsolation: formData.isIsolation,
        isolationType: formData.isolationType
      };

      const newLog: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userId: 'PORTAL_PUBLICO',
        userName: 'Portal Externo COLIH',
        action: 'Solicitação de Visita',
        details: `Novo paciente (${newPatient.name}) cadastrado para o hospital ${hospitalNameDisplay}.`
      };

      const adminNotifications: AppNotification[] = state.members
        .filter(m => m.role === UserRole.ADMIN)
        .map(admin => ({
          id: crypto.randomUUID(),
          userId: admin.id,
          message: `🚨 Nova solicitação COLIH: ${newPatient.name} no ${hospitalNameDisplay}.`,
          type: 'warning',
          read: false,
          timestamp: new Date().toISOString()
        }));

      // Persistência no Banco de Dados (Supabase)
      await atomicUpdate('patients', newPatient);
      await atomicUpdate('logs', newLog);
      
      // Salva notificações em paralelo
      await Promise.all(adminNotifications.map(n => atomicUpdate('notifications', n)));

      // Atualiza estado local apenas após sucesso no banco
      onUpdateState({
        ...state,
        patients: [newPatient, ...state.patients],
        logs: [newLog, ...state.logs],
        notifications: [...adminNotifications, ...state.notifications]
      });

      setIsSubmitting(false);
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error: any) {
      console.error("Erro ao salvar solicitação pública:", JSON.stringify(error, null, 2));
      let msg = "Houve um erro de conexão ao tentar salvar os dados.";
      if (error.message) msg += ` (${error.message})`;
      alert(msg + " Por favor, tente novamente.");
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center space-y-6 animate-fade-in border border-gray-100">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white shadow-lg">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Solicitação Enviada!</h2>
          <p className="text-gray-500 text-sm leading-relaxed">Os dados do paciente <strong>{formData.name}</strong> foram recebidos com sucesso. Nossos voluntários entrarão em contato em breve.</p>
          <Button onClick={() => setIsSuccess(false)} variant="secondary" className="w-full rounded-2xl py-4">Fazer outra solicitação</Button>
          <button onClick={() => navigate('/login')} className="text-xs font-bold text-blue-600 uppercase tracking-widest">Acesso Administrativo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
             <div className="inline-flex p-3 bg-blue-600 rounded-2xl text-white shadow-xl mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
             </div>
             <h1 className="text-3xl font-black text-gray-900 tracking-tight">Solicitação de Visita - COLIH</h1>
             <p className="text-gray-500 font-medium">Portal Externo para encaminhamento de pacientes ao GVP.</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-visible mb-12">
             <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-10">
                
                {/* Seção 1: Identificação */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-sm">1</div>
                    <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">Identificação do Paciente</h3>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Completo</label>
                    <input 
                      required type="text" 
                      className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Nome completo do paciente"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Telefone / WhatsApp</label>
                      <input 
                        type="tel" 
                        className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Idade</label>
                      <input 
                        type="text" 
                        className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                        value={formData.age}
                        onChange={e => setFormData({...formData, age: e.target.value})}
                        placeholder="Ex: 45 anos"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Gênero</label>
                      <select 
                        className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                        value={formData.gender}
                        onChange={e => setFormData({...formData, gender: e.target.value})}
                      >
                        <option value="">Selecione...</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Seção 2: Localização */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-sm">2</div>
                    <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">Localização Hospitalar</h3>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Hospital de Internação</label>
                    <select 
                      required 
                      className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                      value={formData.hospitalId}
                      onChange={e => setFormData({...formData, hospitalId: e.target.value})}
                    >
                      <option value="">Selecione o hospital...</option>
                      {validHospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase px-1">Quarto</label>
                      <input type="text" className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white transition-all shadow-sm" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} placeholder="302" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase px-1">Andar</label>
                      <input type="text" className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white transition-all shadow-sm" value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} placeholder="3º" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase px-1">Ala</label>
                      <input type="text" className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white transition-all shadow-sm" value={formData.wing} onChange={e => setFormData({...formData, wing: e.target.value})} placeholder="B" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase px-1">Leito</label>
                      <input type="text" className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white transition-all shadow-sm" value={formData.bed} onChange={e => setFormData({...formData, bed: e.target.value})} placeholder="01" />
                    </div>
                  </div>
                </div>

                {/* Seção 3: Protocolo Ético e Logística (NOVO) */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-sm">3</div>
                    <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">Protocolo Ético e Logística</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2 block">Documentação</label>
                        <label className="flex items-center gap-4 cursor-pointer group p-3 rounded-xl border border-gray-100 hover:border-blue-200 transition-all">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.hasDirectivesCard ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                <input type="checkbox" className="hidden" checked={formData.hasDirectivesCard} onChange={e => setFormData({...formData, hasDirectivesCard: e.target.checked})} />
                                {formData.hasDirectivesCard && <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                            </div>
                            <span className="text-xs font-bold text-gray-700">Tem Cartão de Diretivas?</span>
                        </label>
                        <label className="flex items-center gap-4 cursor-pointer group p-3 rounded-xl border border-gray-100 hover:border-blue-200 transition-all">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.agentsNotified ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                <input type="checkbox" className="hidden" checked={formData.agentsNotified} onChange={e => setFormData({...formData, agentsNotified: e.target.checked})} />
                                {formData.agentsNotified && <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                            </div>
                            <span className="text-xs font-bold text-gray-700">Procuradores Avisados?</span>
                        </label>
                        <label className="flex items-center gap-4 cursor-pointer group p-3 rounded-xl border border-gray-100 hover:border-blue-200 transition-all">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.hasS55 ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                <input type="checkbox" className="hidden" checked={formData.hasS55} onChange={e => setFormData({...formData, hasS55: e.target.checked})} />
                                {formData.hasS55 && <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                            </div>
                            <span className="text-xs font-bold text-gray-700">Considerou S-55?</span>
                        </label>
                     </div>

                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-2 block">Alertas de Apoio</label>
                        <label className="flex items-center gap-4 cursor-pointer group p-3 rounded-xl border border-gray-100 hover:border-orange-200 transition-all">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.needsAccommodation ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                                <input type="checkbox" className="hidden" checked={formData.needsAccommodation} onChange={e => setFormData({...formData, needsAccommodation: e.target.checked})} />
                                {formData.needsAccommodation && <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                            </div>
                            <span className="text-xs font-bold text-gray-700">Precisa de Hospedagem?</span>
                        </label>
                        
                        <div className="space-y-2 p-3 rounded-xl border border-gray-100 hover:border-red-200 transition-all">
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.isIsolation ? 'bg-red-600 border-red-600' : 'border-gray-300'}`}>
                                    <input type="checkbox" className="hidden" checked={formData.isIsolation} onChange={e => setFormData({...formData, isIsolation: e.target.checked})} />
                                    {formData.isIsolation && <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>}
                                </div>
                                <span className="text-xs font-bold text-gray-700">Paciente em Isolamento?</span>
                            </label>
                            {formData.isIsolation && (
                                <input 
                                    type="text" 
                                    placeholder="Tipo (Ex: Contato, Respiratório)" 
                                    className="w-full border-2 p-2 rounded-xl text-xs mt-2 focus:border-red-500 outline-none"
                                    value={formData.isolationType}
                                    onChange={e => setFormData({...formData, isolationType: e.target.value})}
                                />
                            )}
                        </div>
                     </div>
                  </div>
                </div>

                {/* Seção 4: Acompanhante (Renumerado para 4) */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-sm">4</div>
                    <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">Acompanhante</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome do Acompanhante</label>
                      <input 
                        type="text" 
                        className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                        value={formData.companionName}
                        onChange={e => setFormData({...formData, companionName: e.target.value})}
                        placeholder="Nome de quem está no hospital"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Telefone Acompanhante</label>
                      <input 
                        type="tel" 
                        className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                        value={formData.companionPhone}
                        onChange={e => setFormData({...formData, companionPhone: e.target.value})}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 5: Espiritualidade */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-sm">5</div>
                    <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">Situação Espiritual</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Vínculo com a Congregação</label>
                      <select 
                        className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                        value={formData.spiritualStatus}
                        onChange={e => setFormData({...formData, spiritualStatus: e.target.value})}
                      >
                        <option value="">Selecione...</option>
                        <option value="Ativo">Publicador Ativo</option>
                        <option value="Inativo">Inativo</option>
                        <option value="Estudante">Estudante</option>
                        <option value="Familiar">Familiar / Interessado</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Ancião Local / Congregação</label>
                      <input 
                        type="text" 
                        className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                        value={formData.localElder}
                        onChange={e => setFormData({...formData, localElder: e.target.value})}
                        placeholder="Nome do ancião ou congregação"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 6: Atendimento */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-sm">6</div>
                    <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">Detalhes do Atendimento</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">É caso cirúrgico?</label>
                      <div className="flex gap-8 p-1">
                         <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="radio" name="isSurgical" checked={formData.isSurgical === true} onChange={() => setFormData({...formData, isSurgical: true})} className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-bold text-gray-700">Sim</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="radio" name="isSurgical" checked={formData.isSurgical === false} onChange={() => setFormData({...formData, isSurgical: false})} className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-bold text-gray-700">Não</span>
                         </label>
                      </div>
                    </div>
                    {formData.isSurgical && (
                      <div className="space-y-1.5 animate-fade-in">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Data Prevista da Cirurgia</label>
                        <input 
                          type="date" 
                          className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                          value={formData.surgeryDate}
                          onChange={e => setFormData({...formData, surgeryDate: e.target.value})}
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Horário Preferencial de Visita</label>
                      <input 
                        type="text" 
                        className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                        value={formData.visitTime}
                        onChange={e => setFormData({...formData, visitTime: e.target.value})}
                        placeholder="Ex: Tarde (14h-16h)"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Estado Clínico / Gravidade</label>
                      <select 
                        className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                        value={formData.clinicalStatus}
                        onChange={e => setFormData({...formData, clinicalStatus: e.target.value})}
                      >
                        <option value="">Selecione...</option>
                        <option value="Estável">Estável / Quarto</option>
                        <option value="Grave">Grave / UTI</option>
                        <option value="Crítico">Crítico / Urgência</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Seção 7: Notas */}
                <div className="space-y-1.5 pt-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Observações Adicionais / Motivo da Internação</label>
                  <textarea 
                    className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all resize-none shadow-sm"
                    rows={4}
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    placeholder="Descreva o tratamento, histórico ou urgência da visita..."
                  />
                </div>

                <div className="pt-8">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full rounded-2xl py-5 text-lg font-bold shadow-2xl shadow-blue-500/40 transition-all active:scale-95 bg-blue-600 text-white"
                  >
                    {isSubmitting ? 'Enviando Solicitação...' : 'Enviar Solicitação ao GVP'}
                  </Button>
                </div>
             </form>
             
             <div className="bg-gray-50 p-6 text-center border-t border-gray-100 rounded-b-[2.5rem]">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">GVP Litoral Sul - Grupo de Visita a Pacientes</p>
             </div>
          </div>
          
          <div className="text-center pb-12">
             <button onClick={() => navigate('/login')} className="text-xs font-bold text-gray-400 hover:text-blue-600 uppercase tracking-widest transition-colors">Voltar para Login de Membros</button>
          </div>
        </div>
      </div>
    </div>
  );
};
