'use client';

import React, { useEffect, useState } from 'react';
import { useCategoryStore } from '@/stores/useCategoryStore';
import SidebarMenu, { DRAWER_WIDTH } from '@/components/SidebarMenu';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';

export default function Page() {
  const { fetchCategories } = useCategoryStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* AppBar com toggle */}
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={() => setSidebarOpen(v => !v)} aria-label="menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="h6">Início</Typography>
        </Toolbar>
      </AppBar>

      {/* espaçador do AppBar */}
      <Toolbar />

      {/* Sidebar controlado (temporary no mobile, persistent no desktop) */}
      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main com scroll e margem quando o menu está aberto no desktop */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: '#f0f4f8',
          overflowY: 'auto',
          height: 'calc(100vh - 64px)',
          p: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          lineHeight: '1.8',
          color: '#333',
          ml: { md: sidebarOpen && !isMobile ? `${DRAWER_WIDTH}px` : 0 },
          transition: (t) =>
            t.transitions.create('margin', {
              easing: t.transitions.easing.sharp,
              duration: t.transitions.duration.leavingScreen,
            }),
        }}
      >
        <Typography variant="h4" sx={{ color: '#006400', mb: 3 }}>
          Integração de Estoque — EletroFarias
        </Typography>

        <Typography variant="h6" sx={{ mb: 1 }}>
          Aplicativo para integrar o estoque do Sankhya com outras plataformas.
        </Typography>

        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Use o menu lateral para navegar entre as funcionalidades de consulta, cadastro e exclusão
          de grupos/produtos, além das telas de status e relatórios.
        </Typography>
      </Box>
    </Box>
  );
}
