import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import MobileLayout from '../components/Layout/MobileLayout.tsx';

const Placeholder = ({ title }: { title: string }) => (
  <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Typography variant="h5">{title}</Typography>
  </Box>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<MobileLayout />}>
        <Route path="/" element={<Placeholder title="Home Page - To be implemented" />} />
        <Route path="/inventory" element={<Placeholder title="Inventory Area" />} />
        <Route path="/settings" element={<Placeholder title="Settings Area" />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
