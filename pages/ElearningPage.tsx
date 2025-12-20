
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

export const ElearningPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="p-8 text-center space-y-4">
      <h2 className="text-xl font-bold">Treinamento e Capacitação</h2>
      <p className="text-gray-500">Esta funcionalidade está temporariamente desativada para manutenção.</p>
      <Button onClick={() => navigate('/dashboard')}>Voltar ao Início</Button>
    </div>
  );
};
