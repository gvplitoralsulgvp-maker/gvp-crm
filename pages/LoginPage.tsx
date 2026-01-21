
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, Member, UserRole } from '../types';
import { Button } from '../components/Button';
import { supabase } from '../services/supabaseClient';
import { mapFromDb } from '../services/storageService';

interface LoginPageProps {
  state: AppState;
  onLogin: (user: Member) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ state, onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // --- ACESSO MESTRE DE EMERGÊNCIA ---
    if (cleanEmail === 'admin@gvp.com' && password === '654321') {
        const masterAdmin: Member = {
            id: 'admin-master-id',
            name: 'Administrador Geral',
            email: 'admin@gvp.com',
            role: UserRole.ADMIN,
            active: true,
            hasSeenOnboarding: true,
            congregation: 'Sede GVP'
        };
        onLogin(masterAdmin);
        navigate('/dashboard');
        return;
    }

    try {
        if (!supabase) throw new Error("Supabase não configurado corretamente.");

        // 1. Autenticação via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password
        });

        if (authError) {
            console.error("Login Auth Error:", authError);
            
            if (authError.message.includes("Email not confirmed")) {
                throw new Error("Sua conta foi criada mas o e-mail não foi confirmado.");
            }
            
            if (authError.message.includes("Invalid login credentials")) {
                 throw new Error("E-mail ou senha incorretos. Se você faz parte do grupo mas nunca criou uma senha, clique em 'Solicitar Novo Cadastro' abaixo.");
            }
            
            throw new Error("Erro de autenticação. Verifique seus dados.");
        }

        // 2. Busca o perfil na tabela members usando o UUID do Auth
        const { data: profileRaw, error: profileError } = await supabase
            .from('members')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profileRaw) {
            console.error("Login Profile Error:", profileError);
            throw new Error("Perfil de voluntário não localizado. Contate o administrador.");
        }

        // 3. Usa o mapeamento padronizado do app
        const mappedProfiles = mapFromDb<Member>([profileRaw]);
        const userSession = mappedProfiles[0];

        // 4. Verificação de status ativo (aprovado pelo admin)
        if (userSession.active !== true) {
            throw new Error("Seu cadastro foi realizado, mas ainda aguarda a aprovação do Administrador.");
        }

        onLogin(userSession);
        navigate('/dashboard');
    } catch (err: any) {
        setError(err.message || "Ocorreu um erro ao tentar entrar.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-fade-in">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="bg-blue-600 text-white p-4 rounded-3xl shadow-xl inline-block mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">COLIH/GVP Litoral Sul</h2>
        <p className="mt-2 text-sm text-gray-500 font-bold uppercase tracking-widest">Acesso Enterprise</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-10 px-8 shadow-2xl rounded-[2.5rem] border border-gray-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">E-mail Corporativo</label>
              <input 
                required type="email" 
                placeholder="seu.email@gvp.com" 
                className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 outline-none transition-all" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Senha de Acesso</label>
              <input 
                required type="password" 
                placeholder="••••••••" 
                className="w-full border-2 border-gray-50 bg-gray-50 rounded-2xl p-4 text-sm focus:border-blue-600 outline-none transition-all" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
            </div>

            {error && (
              <div className="p-4 rounded-2xl text-[10px] font-black border text-center uppercase tracking-widest leading-relaxed bg-red-50 text-red-600 border-red-100">
                {error}
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full rounded-2xl py-4 font-black transition-all active:scale-95">
                {isLoading ? 'Conectando...' : 'Entrar no Sistema'}
            </Button>
          </form>

          <div className="mt-10 pt-6 border-t border-gray-50 text-center space-y-4">
             <button onClick={() => navigate('/signup')} className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] hover:opacity-70 transition-all">Solicitar Novo Cadastro</button>
             <div className="flex justify-center">
                 <button onClick={() => navigate('/solicitar-visita')} className="text-[9px] font-bold text-gray-400 hover:text-blue-500 uppercase tracking-widest">Portal Público COLIH</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
