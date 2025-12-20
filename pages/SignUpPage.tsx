
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, Member, UserRole, LogEntry } from '../types';
import { Button } from '../components/Button';
import { getCoordsFromCep } from '../services/geoService';
import { MapPicker } from '../components/MapPicker';

interface SignUpPageProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ state, onUpdateState }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      congregation: '',
      cep: ''
  });
  const [geoInfo, setGeoInfo] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [isValidatingCep, setIsValidatingCep] = useState(false);
  const [error, setError] = useState('');

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 5) {
      value = value.substring(0, 5) + '-' + value.substring(5, 8);
    }
    setFormData({ ...formData, cep: value });
    if (geoInfo) setGeoInfo(null);
    if (error) setError('');
  };

  const handleValidateCep = async () => {
    const cleanCep = formData.cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
        setError('O CEP deve ter 8 dígitos (ex: 11390-510).');
        return;
    }
    
    setError('');
    setIsValidatingCep(true);
    setGeoInfo(null);
    
    try {
        const result = await getCoordsFromCep(cleanCep);
        setGeoInfo({
            lat: result.lat,
            lng: result.lng,
            address: result.address
        });
    } catch (err: any) {
        setError(err.message || 'Falha ao localizar CEP.');
    } finally {
        setIsValidatingCep(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!geoInfo) {
        setError('A localização pelo CEP é obrigatória para o mapa da escala.');
        return;
    }

    if (formData.password !== formData.confirmPassword) {
        setError('As senhas não coincidem.');
        return;
    }

    if (formData.password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
    }

    const emailExists = state.members.some(m => m.email?.toLowerCase() === formData.email.toLowerCase().trim());
    if (emailExists) {
        setError('Este email já está em uso.');
        return;
    }

    const newMember: Member = {
        id: crypto.randomUUID(),
        name: formData.name,
        email: formData.email.trim(),
        phone: formData.phone,
        password: formData.password,
        role: UserRole.MEMBER,
        congregation: formData.congregation,
        active: false,
        address: geoInfo.address,
        cep: formData.cep.replace(/\D/g, ''),
        lat: geoInfo.lat,
        lng: geoInfo.lng,
        hasSeenOnboarding: false
    };

    const newLog: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userId: 'system',
        userName: 'Sistema',
        action: 'Solicitação de Cadastro',
        details: `Novo membro (${newMember.name}) solicitou acesso via CEP ${newMember.cep} (${newMember.lat}, ${newMember.lng})`
    };

    onUpdateState({
        ...state,
        members: [...state.members, newMember],
        logs: [newLog, ...state.logs]
    });

    alert('Sua solicitação foi enviada! O administrador revisará seu cadastro e localização em breve.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="w-full sm:max-w-md mb-6">
        <div className="flex justify-center">
            <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-xl animate-fade-in">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
            </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">Primeiro Acesso GVP</h2>
        <p className="mt-2 text-center text-sm text-gray-600 px-4">Sua localização é essencial para o mapa de rotas.</p>
      </div>

      <div className="w-full sm:max-w-xl pb-10">
        <div className="bg-white py-6 px-4 shadow-2xl sm:rounded-[2rem] sm:px-10 border border-gray-100">
          <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1 px-1 tracking-wider">Nome Completo</label>
                  <input required type="text" className="w-full border-2 border-gray-100 rounded-2xl p-3 text-sm focus:border-blue-500 outline-none transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1 px-1 tracking-wider">Email Profissional</label>
                  <input required type="email" className="w-full border-2 border-gray-100 rounded-2xl p-3 text-sm focus:border-blue-500 outline-none transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1 px-1 tracking-wider">WhatsApp</label>
                  <input required type="tel" placeholder="(13) 99999-9999" className="w-full border-2 border-gray-100 rounded-2xl p-3 text-sm focus:border-blue-500 outline-none transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1 px-1 tracking-wider">Congregação</label>
                  <input required type="text" className="w-full border-2 border-gray-100 rounded-2xl p-3 text-sm focus:border-blue-500 outline-none transition-all" value={formData.congregation} onChange={e => setFormData({...formData, congregation: e.target.value})} />
                </div>
            </div>

            <div className="pt-4 border-t-2 border-gray-50">
               <label className="block text-[10px] font-bold uppercase text-blue-600 mb-2 tracking-widest px-1">Localização (CEP)</label>
               <div className="flex gap-2 mb-3">
                  <input 
                    required type="text" maxLength={9}
                    placeholder="00000-000"
                    className={`flex-grow border-2 rounded-2xl p-3 text-sm transition-all outline-none ${geoInfo ? 'bg-green-50 border-green-200' : 'border-gray-100 focus:border-blue-500'}`}
                    value={formData.cep} onChange={handleCepChange} 
                  />
                  <Button 
                    type="button" variant="secondary"
                    className="shrink-0 rounded-2xl px-6 font-bold h-[48px] min-w-[100px]"
                    onClick={handleValidateCep}
                    disabled={isValidatingCep}
                  >
                    {isValidatingCep ? (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : 'Buscar'}
                  </Button>
               </div>

               {geoInfo && (
                   <div className="animate-fade-in space-y-3">
                       <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-start gap-3 shadow-sm">
                           <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                           <div>
                               <p className="text-[10px] text-green-700 font-bold uppercase tracking-wider">Localização Confirmada</p>
                               <p className="text-xs text-green-600 leading-tight mt-1 italic">{geoInfo.address}</p>
                           </div>
                       </div>
                       
                       {/* Mapa de visualização prévia */}
                       <div className="rounded-2xl overflow-hidden border-2 border-green-100 h-40 shadow-inner">
                          <MapPicker 
                            initialLat={geoInfo.lat} 
                            initialLng={geoInfo.lng} 
                            onLocationSelect={(lat, lng) => setGeoInfo({...geoInfo, lat, lng})} 
                          />
                       </div>
                       <p className="text-[9px] text-center text-gray-400 uppercase font-bold">Você pode arrastar o marcador se precisar de mais precisão</p>
                   </div>
               )}

               {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-fade-in shadow-sm">
                    <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 112 0v4a1 1 0 11-2 0V6zm1 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                    <p className="text-xs text-red-600 font-bold">{error}</p>
                </div>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1 px-1 tracking-wider">Criar Senha</label>
                    <input required type="password" placeholder="Mín. 6 dígitos" className="w-full border-2 border-gray-100 rounded-2xl p-3 text-sm focus:border-blue-500 outline-none transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1 px-1 tracking-wider">Confirme</label>
                    <input required type="password" placeholder="Repita a senha" className="w-full border-2 border-gray-100 rounded-2xl p-3 text-sm focus:border-blue-500 outline-none transition-all" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                </div>
            </div>

            <div className="pt-6 flex flex-col gap-4">
              <Button 
                type="submit" 
                disabled={!geoInfo || isValidatingCep} 
                className="w-full justify-center rounded-2xl py-4 shadow-xl shadow-blue-500/20 text-base font-bold transition-all active:scale-95 disabled:grayscale disabled:opacity-50"
              >
                Solicitar Meu Acesso
              </Button>
              <button 
                type="button" 
                onClick={() => navigate('/login')} 
                className="text-[10px] text-gray-400 hover:text-blue-600 font-black uppercase tracking-[0.2em] text-center transition-colors"
              >
                Já tenho cadastro • Voltar ao Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
