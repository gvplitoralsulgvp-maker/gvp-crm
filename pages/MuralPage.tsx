
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

/**
 * Este componente foi desativado a pedido do usuário.
 * Mantido como placeholder para evitar erros de compilação de arquivos órfãos.
 */
export const MuralPage: React.FC<any> = () => {
  const navigate = useNavigate();
  return (
    <div className="p-8 text-center space-y-4">
      <h2 className="text-xl font-bold">Mural desativado</h2>
      <p className="text-gray-500 text-sm">Esta funcionalidade não está mais disponível no sistema.</p>
      <Button onClick={() => navigate('/dashboard')}>Voltar ao Início</Button>
    </div>
  );
};
