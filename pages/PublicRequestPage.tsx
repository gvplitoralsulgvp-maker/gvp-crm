
import React, { useState, useMemo } from 'react';
import { AppState, Patient, LogEntry, AppNotification, UserRole } from '../types';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { atomicInsert } from '../services/storageService';
import { supabase } from '../services/supabaseClient';

interface PublicRequestPageProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
}

export const PublicRequestPage: React.FC<PublicRequestPageProps> = ({ state, onUpdateState }) => {
  const navigate = useNavigate();
  
  // Estado alinhado com os novos campos
  const [formData, setFormData] = useState({
    name: '', // Nome do Paciente
    phone: '', // Contato Paciente
    congregation: '', // Congregação
    spiritualStatus: 'Sim', // Boa condição espiritual?
    nonWitnessFamily: false, // Família que não serve a Jeová envolvida?
    hasDirectivesCard: false, // Tem cartão diretivas (DPA) preenchido?
    treatment: '', // Problema de saúde (modo simples)
    hospitalId: '', // Hospital
    email: '', // Endereço de e-mail
    age: '', // Idade
    companionName: '', // Contato do Acompanhante e Parentesco (Nome/Parentesco)
    companionPhone: '', // Contato do Acompanhante (Telefone)
    localElder: '', // Nome do Ancião de Congregação
    elderPhone: '', // Contato do Ancião de Congregação
    requestDate: new Date().toLocaleString('sv').slice(0, 16).replace(' ', 'T'), // Data/Hora do Contato (Formato ISO local para input)
    
    // Campos Extras (mantidos hidden ou default para compatibilidade)
    gender: '',
    room: '',
    floor: '',
    wing: '',
    bed: '',
    visitTime: '',
    isSurgical: false,
    surgeryDate: '',
    clinicalStatus: '',
    notes: '',
    needsAccommodation: false,
    agentsNotified: false,
    hasS55: false,
    isIsolation: false,
    isolationType: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Filtra hospitais válidos
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
        email: formData.email,
        congregation: formData.congregation,
        spiritualStatus: formData.spiritualStatus,
        nonWitnessFamily: formData.nonWitnessFamily,
        hasDirectivesCard: formData.hasDirectivesCard,
        treatment: formData.treatment || 'Problema de saúde não especificado',
        hospitalId: formData.hospitalId,
        hospitalName: hospitalNameDisplay,
        age: formData.age ? String(formData.age).replace(/\D/g, '') : undefined, // Sanitiza para evitar erro
        companionName: formData.companionName, // Nome e Parentesco
        companionPhone: formData.companionPhone,
        localElder: formData.localElder,
        elderPhone: formData.elderPhone,
        requestDate: new Date(formData.requestDate).toISOString(),
        
        // Campos padrão / extras
        gender: formData.gender,
        room: formData.room,
        floor: formData.floor,
        wing: formData.wing,
        bed: formData.bed,
        visitTime: formData.visitTime,
        isSurgical: formData.isSurgical,
        surgeryDate: formData.surgeryDate,
        clinicalStatus: formData.clinicalStatus,
        admissionDate: new Date().toISOString().split('T')[0],
        active: true,
        notes: formData.notes,
        isExternalRequest: true,
        needsAccommodation: formData.needsAccommodation,
        agentsNotified: formData.agentsNotified,
        formsConsidered: false, 
        hasS55: formData.hasS55,
        isIsolation: formData.isIsolation,
        isolationType: formData.isolationType
      };

      // FIX: Use a random UUID for userId since "PORTAL_PUBLICO" fails UUID validation in Postgres
      const publicSessionId = crypto.randomUUID();

      const newLog: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userId: publicSessionId, 
        userName: 'Portal Externo COLIH',
        action: 'Solicitação de Visita',
        details: `Novo paciente (${newPatient.name}) cadastrado para o hospital ${hospitalNameDisplay}.`
      };

      // Tenta obter IDs de admin
      let adminIds = state.members
        .filter(m => m.role === UserRole.ADMIN)
        .map(m => m.id);

      if (adminIds.length === 0 && supabase) {
         try {
             const { data: fetchedAdmins } = await supabase.from('members').select('id').eq('role', 'ADMIN');
             if (fetchedAdmins) {
                 adminIds = fetchedAdmins.map((a: any) => a.id);
             }
         } catch (err) {
             console.error("Falha ao buscar admins para notificação", err);
         }
      }

      const adminNotifications: AppNotification[] = adminIds.map(adminId => ({
          id: crypto.randomUUID(),
          userId: adminId,
          message: `🚨 Nova solicitação COLIH: ${newPatient.name} no ${hospitalNameDisplay}.`,
          type: 'warning',
          read: false,
          timestamp: new Date().toISOString()
      }));

      // Persistência com Fallback para Schema Desatualizado e usando atomicInsert
      try {
          await atomicInsert('patients', newPatient);
      } catch (dbError: any) {
          // PGRST204: Coluna não encontrada. Indica que o banco ainda não rodou o script de migração.
          // Tentamos salvar sem os campos novos para não perder a solicitação.
          if (dbError.message?.includes('request_date') || dbError.code === 'PGRST204' || dbError.message?.includes('is_external_request')) {
              console.warn("⚠️ Schema do banco desatualizado. Salvando em modo de compatibilidade (sem request_date)...");
              
              // Cria cópia sem os campos novos
              const { requestDate, isExternalRequest, ...legacyPatient } = newPatient;
              await atomicInsert('patients', legacyPatient);
          } else {
              throw dbError; // Se for outro erro (ex: 42501), repassa
          }
      }
      
      // Tentativa de log (pode falhar se RLS strict, mas não deve bloquear o usuário)
      try {
          await atomicInsert('logs', newLog);
      } catch (logErr) {
          console.warn("Log de auditoria falhou (provavelmente permissão), mas paciente foi salvo.", logErr);
      }
      
      if (adminNotifications.length > 0) {
          await Promise.all(adminNotifications.map(n => atomicInsert('notifications', n)));
      }

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
      alert(`Houve um erro ao enviar. Detalhes: ${error.message || 'Erro desconhecido'}. \n\nCódigo: ${error.code || 'N/A'}`);
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
             <p className="text-gray-500 font-medium">Preencha os dados abaixo para encaminhamento à COLIH.</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-visible mb-12">
             <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8">
                
                {/* 0. Data/Hora do Contato (NOVO) */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Data/Hora do Contato</label>
                    <input 
                      required type="datetime-local" 
                      className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                      value={formData.requestDate}
                      onChange={e => setFormData({...formData, requestDate: e.target.value})}
                    />
                </div>

                {/* 1. Nome do Paciente */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome do Paciente</label>
                    <input 
                      required type="text" 
                      className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Nome completo"
                    />
                </div>

                {/* 2. Contato Paciente */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Contato Paciente (Tel/WhatsApp)</label>
                    <input 
                      required type="tel" 
                      className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder="(00) 00000-0000"
                    />
                </div>

                {/* 3. Congregação */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Congregação</label>
                    <input 
                      type="text" 
                      className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                      value={formData.congregation}
                      onChange={e => setFormData({...formData, congregation: e.target.value})}
                      placeholder="Nome da congregação"
                    />
                </div>

                {/* 4. Boa condição espiritual? */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Boa condição espiritual?</label>
                    <select 
                      className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                      value={formData.spiritualStatus}
                      onChange={e => setFormData({...formData, spiritualStatus: e.target.value})}
                    >
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                      <option value="Desconhecido">Não sei informar</option>
                    </select>
                </div>

                {/* 5. Família que não serve a Jeová envolvida? */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Família que não serve a Jeová envolvida?</label>
                    <div className="flex gap-6 p-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="nonWitness" checked={formData.nonWitnessFamily === true} onChange={() => setFormData({...formData, nonWitnessFamily: true})} className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-bold text-gray-700">Sim</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="nonWitness" checked={formData.nonWitnessFamily === false} onChange={() => setFormData({...formData, nonWitnessFamily: false})} className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-bold text-gray-700">Não</span>
                        </label>
                    </div>
                </div>

                {/* 6. Tem cartão diretivas (DPA) preenchido? */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tem cartão diretivas (DPA) preenchido?</label>
                    <div className="flex gap-6 p-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="dpa" checked={formData.hasDirectivesCard === true} onChange={() => setFormData({...formData, hasDirectivesCard: true})} className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-bold text-gray-700">Sim</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="dpa" checked={formData.hasDirectivesCard === false} onChange={() => setFormData({...formData, hasDirectivesCard: false})} className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-bold text-gray-700">Não / Não sei</span>
                        </label>
                    </div>
                </div>

                {/* 7. Problema de saúde (modo simples) */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Problema de saúde (modo simples)</label>
                    <textarea 
                      className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                      rows={3}
                      value={formData.treatment}
                      onChange={e => setFormData({...formData, treatment: e.target.value})}
                      placeholder="Ex: Cirurgia de vesícula, Pneumonia..."
                    />
                </div>

                {/* 8. Hospital */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Hospital</label>
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

                {/* 9. Endereço de e-mail */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Endereço de e-mail</label>
                    <input 
                      type="email" 
                      className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder="email@exemplo.com"
                    />
                </div>

                {/* 10. Idade */}
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

                {/* 11. Contato do Acompanhante e Parentesco */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Acompanhante e Parentesco</label>
                        <input 
                          type="text" 
                          className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                          value={formData.companionName}
                          onChange={e => setFormData({...formData, companionName: e.target.value})}
                          placeholder="Ex: Maria (Esposa)"
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

                {/* 12. Nome do Ancião de Congregação */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome do Ancião de Congregação</label>
                    <input 
                      type="text" 
                      className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                      value={formData.localElder}
                      onChange={e => setFormData({...formData, localElder: e.target.value})}
                      placeholder="Nome do ancião"
                    />
                </div>

                {/* 13. Contato do Ancião de Congregação */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Contato do Ancião de Congregação</label>
                    <input 
                      type="tel" 
                      className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                      value={formData.elderPhone}
                      onChange={e => setFormData({...formData, elderPhone: e.target.value})}
                      placeholder="(00) 00000-0000"
                    />
                </div>

                <div className="pt-8">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full rounded-2xl py-5 text-lg font-bold shadow-2xl shadow-blue-500/40 transition-all active:scale-95 bg-blue-600 text-white"
                  >
                    {isSubmitting ? 'Enviando Solicitação...' : 'Enviar Solicitação à COLIH'}
                  </Button>
                </div>
             </form>
             
             <div className="bg-gray-50 p-6 text-center border-t border-gray-100 rounded-b-[2.5rem]">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">COLIH Litoral Sul - Comissão de Ligação com Hospitais</p>
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
