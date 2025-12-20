
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Fix: Changed AppState to GvpState to match the exported interface in types.ts
import { GvpState, Member, UserRole } from '../types';
import { Button } from '../components/Button';

interface LoginPageProps {
  // Fix: Changed AppState to GvpState
  state: GvpState;
  onLogin: (user: Member) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ state, onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Find user by email (case insensitive)
    const user = state.members.find(
      m => m.email?.toLowerCase() === email.toLowerCase().trim()
    );

    if (!user) {
      setError('Email não encontrado. Verifique ou faça seu cadastro.');
      return;
    }

    // 2. Check Password
    // Default fallback to '123456' if user has no password set in DB
    const storedPassword = user.password || '123456';
    
    if (storedPassword !== password) {
        setError('Senha incorreta.');
        return;
    }

    // 3. Check Active Status
    if (!user.active) {
        setError('Seu cadastro está pendente de aprovação pelo Administrador.');
        return;
    }

    // Success
    onLogin(user);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
            <div className="bg-blue-600 text-white p-3 rounded-xl shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
            </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          GVP Litoral Sul
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Acesso Restrito aos Membros
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Seu email cadastrado"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200 text-center flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    {error}
                </div>
            )}

            <div>
              <Button type="submit" className="w-full flex justify-center py-2 px-4">
                Entrar
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Novo no grupo?
                </span>
              </div>
            </div>

            <div className="mt-6">
               <button
                 onClick={() => navigate('/signup')}
                 className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100"
               >
                 Primeiro Acesso / Criar Conta
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
