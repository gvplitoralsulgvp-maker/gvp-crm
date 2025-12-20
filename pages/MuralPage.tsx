
import React from 'react';
import { Navigate } from 'react-router-dom';

export const MuralPage: React.FC = () => {
  return <Navigate to="/dashboard" replace />;
};
