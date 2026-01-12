'use client'

import React, { useState } from 'react';
import { useCreateStore } from '@/stores/useCreateStore';
import SidebarMenu, { DRAWER_WIDTH } from '@/components/SidebarMenu';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  TextField,
  Button,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';

export default function Page() {
  const { sendCreateRequest, sendEANRequest, isLoading } = useCreateStore();
  const [inputValue, setInputValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleSubmit = () => {
    if (inputValue.trim()) {
      sendCreateRequest(inputValue.trim());
    }
  };

  const sendEANReq = () => {
    sendEANRequest();
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* AppBar com toggle */}
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={() => setSidebarOpen((v) => !v)} aria-label="menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="h6">Cadastrar</Typography>
        </Toolbar>
      </AppBar>

      {/* espaçador do AppBar */}
      <Toolbar />

      {/* Sidebar controlado */}
      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main com scroll e margem quando o menu está aberto no desktop */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: '#f0f4f8',
          overflowY: 'auto',
          height: 'calc(100vh - 64px)',
          p: 4,
          ml: { md: sidebarOpen && !isMobile ? `${DRAWER_WIDTH}px` : 0 },
          transition: (t) =>
            t.transitions.create('margin', {
              easing: t.transitions.easing.sharp,
              duration: t.transitions.duration.leavingScreen,
            }),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Conteúdo centralizado */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 520,
            bgcolor: 'white',
            borderRadius: 2,
            boxShadow: 1,
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="h5" sx={{ mb: 2 }}>
            Cadastrar
          </Typography>

          <Typography sx={{ mb: 1, fontSize: 16 }}>
            Insira o <b>código do produto</b> como aparece no Sankhya:
          </Typography>

          <TextField
            fullWidth
            size="small"
            placeholder="Ex: 7101103"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            sx={{ mb: 2 }}
            inputProps={{ inputMode: 'numeric' }}
          />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="success"
              onClick={handleSubmit}
              sx={{ px: 3 }}
            >
              Enviar
            </Button>

            <Button
              variant="contained"
              onClick={sendEANReq}
              sx={{ px: 3 }}
            >
              Atualizar EAN
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Overlay de carregamento */}
      {isLoading && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(255,255,255,0.8)',
            zIndex: (t) => t.zIndex.modal + 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          Carregando...
        </Box>
      )}
    </Box>
  );
}
