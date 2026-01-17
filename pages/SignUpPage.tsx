
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, Member, UserRole } from '../types';
import { Button } from '../components/Button';
import { getCoordsFromCep } from '../services/geoService';
import { supabase } from '../services/supabaseClient';
import { atomicUpdate } from '../services/storageService';

export const SignUpPage: React.FC<{ state: AppState, onUpdateState: (s: AppState) => void }> = ({ state, onUpdateState }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', congregation: '', cep: '' });
  const [geoInfo, setGeoInfo] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInstanceBlocked, setIsInstanceBlocked] = useState(false);

  const handleValidateCep = async () => {
    const cleanCep = formData.cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    setIsLoading(true);
    try {
        const result = await getCoordsFromCep(cleanCep);
        setGeoInfo({ lat: result.lat, lng: result.lng, address: result.address });
        setError('');
    } catch (err) { setError('CEP não localizado.'); } finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInstanceBlocked(false);

    if (!geoInfo || formData.password.length < 6) {
        if (!geoInfo) setError('Por favor, valide o seu CEP antes de continuar.');
        else if (formData.password.length < 6) setError('A senha deve ter no mínimo 6 caracteres.');
        return;
    }
    
    setIsLoading(true);
    setError('');

    try {
        if (!supabase) throw new Error("Supabase não configurado.");

        const cleanEmail = formData.email.toLowerCase().trim();

        // 1. Criar Usuário no Supabase Auth
        const { data, error: authErr } = await supabase.auth.signUp({
            email: cleanEmail,
            password: formData.password,
            options: { 
              data: { 
                full_name: formData.name 
              } 
            }
        });

        if (authErr) {
          // Detectar erro de instância que não permite novos usuários
          if (authErr.message.includes("Signups not allowed")) {
            setIsInstanceBlocked(true);
            throw new Error("O servidor está configurado para não aceitar novos cadastros no momento.");
          }
          throw authErr;
        }

        if (!data.user) throw new Error("Erro ao criar usuário na autenticação.");

        const isAdminEmail = cleanEmail === 'admin@gvp.com';

        // 2. Criar Perfil na tabela Members
        const newMember: Member = {
            id: data.user.id,
            name: formData.name,
            email: cleanEmail,
            phone: formData.phone,
            role: isAdminEmail ? UserRole.ADMIN : UserRole.MEMBER,
            congregation: formData.congregation,
            active: isAdminEmail ? true : false,
            address: geoInfo.address,
            lat: geoInfo.lat,
            lng: geoInfo.lng,
            hasSeenOnboarding: false
        };

        await atomicUpdate('members', newMember);
        
        if (isAdminEmail) {
            alert('Conta Administrador criada com sucesso! Você já pode acessar o sistema.');
        } else {
            alert('Cadastro realizado com sucesso! Aguarde agora a liberação do seu acesso pelo coordenador do grupo no painel administrativo.');
        }
        
        navigate('/login');
    } catch (err: any) {
        console.error("Erro no cadastro:", err);
        setError(err.message || 'Erro ao criar conta. Verifique se o e-mail já existe.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 animate-fade-in">
      <div className="w-full max-w-xl bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 space-y-8">
        <div className="text-center">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">GVP Litoral Sul</h2>
            <p className="text-sm font-bold text-blue-500 uppercase tracking-widest mt-2">Solicitar Cadastro</p>
        </div>

        {isInstanceBlocked && (
          <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-2xl space-y-3 animate-bounce">
            <p className="text-xs font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Instrução para o Administrador
            </p>
            <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
              O seu Supabase está bloqueando novos usuários. Para corrigir:<br/>
              1. Vá ao <span className="underline">Dashboard do Supabase</span><br/>
              2. Menu <span className="underline">Authentication</span> &gt; <span className="underline">Providers</span><br/>
              3. Abra a aba <span className="underline">Email</span><br/>
              4. Ative a opção: <b>"Allow new users to sign up"</b>.
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Completo</label>
                    <input required className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm outline-none focus:border-blue-600 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">E-mail</label>
                    <input required type="email" placeholder="seu.email@gvp.com" className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm outline-none focus:border-blue-600 transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Telefone</label>
                    <input required placeholder="(13) 99999-9999" className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm outline-none focus:border-blue-600 transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Congregação</label>
                    <input required className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm outline-none focus:border-blue-600 transition-all" value={formData.congregation} onChange={e => setFormData({...formData, congregation: e.target.value})} />
                </div>
            </div>
            
            <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Localização (CEP)</label>
                <div className="flex gap-2">
                    <input placeholder="00000-000" className="flex-grow border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm outline-none focus:border-blue-600 transition-all" value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} />
                    <Button type="button" variant="secondary" onClick={handleValidateCep} className="rounded-2xl px-6">Validar</Button>
                </div>
            </div>

            {geoInfo && (
                <div className="p-4 bg-green-50 border border-green-100 rounded-2xl animate-fade-in text-[10px] text-green-700 font-bold uppercase tracking-tight">
                    Endereço: {geoInfo.address}
                </div>
            )}

            <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Criar Senha</label>
                <input required type="password" placeholder="Mínimo 6 caracteres" className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm outline-none focus:border-blue-600 transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black border border-red-100 text-center uppercase tracking-widest leading-relaxed">{error}</div>}

            <Button type="submit" disabled={isLoading} className="w-full rounded-2xl py-5 font-black text-base transition-all active:scale-95 shadow-xl shadow-blue-500/20">
                {isLoading ? 'Criando Conta...' : 'Finalizar Cadastro'}
            </Button>
            
            <div className="text-center pt-2">
                <button type="button" onClick={() => navigate('/login')} className="text-[10px] font-black text-gray-400 uppercase hover:text-blue-600 tracking-widest transition-colors">Já tem conta? Entrar</button>
            </div>
        </form>
      </div>
    </div>
  );
};
