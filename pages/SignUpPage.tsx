
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, Member, UserRole, LogEntry } from '../types';
import { Button } from '../components/Button';
import { getCoordsFromCep } from '../services/geoService';

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

  const handleValidateCep = async () => {
    const cleanCep = formData.cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
        setError('Por favor, informe um CEP válido com 8 números.');
        return;
    }
    setError('');
    setIsValidatingCep(true);
    setGeoInfo(null); // Reset current geo info
    
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
        setError('Você precisa validar sua localização pelo CEP antes de prosseguir.');
        return;
    }

    if (formData.password !== formData.confirmPassword) {
        setError('As senhas não coincidem.');
        return;
    }

    const exists = state.members.some(m => m.email?.toLowerCase() === formData.email.toLowerCase());
    if (exists) {
        setError('Este email já está cadastrado.');
        return;
    }

    const newMember: Member = {
        id: crypto.randomUUID(),
        name: formData.name,
        email: formData.email,
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
        action: 'Novo Cadastro',
        details: `Novo usuário registrado (${newMember.name}) com localização via CEP ${newMember.cep}`
    };

    onUpdateState({
        ...state,
        members: [...state.members, newMember],
        logs: [newLog, ...state.logs]
    });

    alert('Solicitação enviada! Aguarde a aprovação do Administrador para entrar no sistema.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Criar Conta GVP</h2>
        <p className="mt-2 text-center text-sm text-gray-600">Gestão de Visitas Litoral Sul</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Nome Completo</label>
                  <input required type="text" className="w-full border rounded-xl p-2.5 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Email</label>
                  <input required type="email" className="w-full border rounded-xl p-2.5 text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">WhatsApp</label>
                  <input required type="tel" className="w-full border rounded-xl p-2.5 text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Congregação</label>
                  <input required type="text" className="w-full border rounded-xl p-2.5 text-sm" value={formData.congregation} onChange={e => setFormData({...formData, congregation: e.target.value})} />
                </div>
            </div>

            <div className="pt-2 border-t border-gray-50">
               <label className="block text-[10px] font-bold uppercase text-blue-600 mb-1">Localização p/ Mapa (CEP)</label>
               <div className="flex gap-2">
                  <input 
                    required type="text" maxLength={9}
                    placeholder="00000-000"
                    className={`flex-grow border rounded-xl p-2.5 text-sm ${geoInfo ? 'bg-green-50 border-green-200 shadow-inner shadow-green-100' : 'bg-white border-gray-200'}`}
                    value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} 
                  />
                  <Button 
                    type="button" size="sm" variant="secondary"
                    className="shrink-0"
                    onClick={handleValidateCep}
                    disabled={isValidatingCep}
                  >
                    {isValidatingCep ? (
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            Validando
                        </div>
                    ) : 'Validar'}
                  </Button>
               </div>
               {geoInfo && (
                   <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-lg">
                       <p className="text-[10px] text-green-700 font-bold uppercase flex items-center gap-1">
                           <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                           Localizado com Sucesso
                       </p>
                       <p className="text-[9px] text-green-600 mt-0.5 truncate">{geoInfo.address}</p>
                   </div>
               )}
               {error && <p className="mt-2 text-[10px] text-red-600 font-bold uppercase bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Senha</label>
                    <input required type="password" placeholder="Mín. 6 dígitos" className="w-full border rounded-xl p-2.5 text-sm" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Confirmar</label>
                    <input required type="password" placeholder="Repita a senha" className="w-full border rounded-xl p-2.5 text-sm" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <Button type="submit" disabled={!geoInfo || isValidatingCep} className="w-full justify-center rounded-xl py-3 shadow-blue-500/20">Solicitar Acesso</Button>
              <button type="button" onClick={() => navigate('/login')} className="text-xs text-gray-400 hover:text-gray-600 font-bold uppercase tracking-widest text-center">Voltar para Login</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
