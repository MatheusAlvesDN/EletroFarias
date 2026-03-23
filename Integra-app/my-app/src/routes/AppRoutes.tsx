import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import MobileLayout from '../components/Layout/MobileLayout.tsx';
import Login from '../pages/Login.tsx';
import Contagem from '../pages/Inventory/Contagem.tsx';
import { Preferences } from '@capacitor/preferences';

// Componente para proteger rotas
const PrivateRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { value: token } = await Preferences.get({ key: 'auth_token' });
      setIsAuthenticated(!!token);
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const Placeholder = ({ title }: { title: string }) => (
  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <Box sx={{ mt: 4 }}>
        <h1>{title}</h1>
        <p>Esta funcionalidade está sendo migrada do sistema web para o aplicativo nativo.</p>
    </Box>
  </Box>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Rotas Protegidas */}
      <Route element={<PrivateRoute />}>
        <Route element={<MobileLayout />}>
          <Route path="/" element={<Placeholder title="Página Inicial" />} />
          <Route path="/inventory" element={<Contagem />} />
          <Route path="/settings" element={<Placeholder title="Configurações" />} />
        </Route>
      </Route>

      {/* Redirecionamento padrão */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
