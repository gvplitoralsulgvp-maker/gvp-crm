
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, Member, UserRole, LogEntry } from '../types';
import { Button } from '../components/Button';

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
      congregation: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações básicas
    if (formData.password !== formData.confirmPassword) {
        setError('As senhas não coincidem.');
        return;
    }
    if (formData.password.length < 6) {
        setError('A senha deve ter no mínimo 6 caracteres.');
        return;
    }

    // Verificar se email já existe
    const exists = state.members.some(m => m.email?.toLowerCase() === formData.email.toLowerCase());
    if (exists) {
        setError('Este email já está cadastrado.');
        return;
    }

    // Criar novo membro INATIVO
    const newMember: Member = {
        id: crypto.randomUUID(),
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: UserRole.MEMBER,
        congregation: formData.congregation,
        active: false, // Precisa de aprovação
        address: '',
        cep: '',
        lat: undefined,
        lng: undefined
    };

    const newLog: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userId: 'system',
        userName: 'Sistema',
        action: 'Novo Cadastro',
        details: `Novo usuário registrado aguardando aprovação: ${newMember.name}`
    };

    onUpdateState({
        ...state,
        members: [...state.members, newMember],
        logs: [newLog, ...state.logs]
    });

    alert('Cadastro realizado com sucesso! Sua conta está aguardando aprovação de um administrador. Por favor, aguarde o contato.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Criar Conta
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Solicitação de acesso ao GVP Litoral Sul
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
              <input required type="text" className="w-full border rounded-md p-2 mt-1" 
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input required type="email" className="w-full border rounded-md p-2 mt-1" 
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Celular / WhatsApp</label>
              <input required type="tel" className="w-full border rounded-md p-2 mt-1" 
                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Congregação</label>
              <input required type="text" className="w-full border rounded-md p-2 mt-1" 
                value={formData.congregation} onChange={e => setFormData({...formData, congregation: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Senha</label>
                    <input required type="password" className="w-full border rounded-md p-2 mt-1" 
                        value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Confirmar Senha</label>
                    <input required type="password" className="w-full border rounded-md p-2 mt-1" 
                        value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                </div>
            </div>

            {error && <p className="text-red-600 text-sm text-center">{error}</p>}

            <div className="pt-4 flex flex-col gap-3">
              <Button type="submit" className="w-full justify-center">Solicitar Acesso</Button>
              <Button type="button" variant="ghost" onClick={() => navigate('/login')} className="w-full justify-center">Voltar para Login</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
