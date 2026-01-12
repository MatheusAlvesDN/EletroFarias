'use client';

import React, { useEffect, useState } from 'react';
import SidebarMenu, { DRAWER_WIDTH } from '@/components/SidebarMenu';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SyncIcon from '@mui/icons-material/Sync';

export default function ServiceStatusPage() {
  const [status, setStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const fetchServiceStatus = async () => {
    try {
      setStatus('loading');
      // Simula chamada à API
      await new Promise((res) => setTimeout(res, 1000));
      const randomStatus = Math.random() > 0.5 ? 'online' : 'offline';
      setStatus(randomStatus);
      setLastUpdated(new Date().toLocaleString());
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      setStatus('offline');
    }
  };

  useEffect(() => {
    fetchServiceStatus();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 64 }} />;
      case 'offline':
        return <ErrorIcon sx={{ color: '#f44336', fontSize: 64 }} />;
      default:
        return <CircularProgress size={48} />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'online':
        return 'Serviço operando normalmente';
      case 'offline':
        return 'Serviço fora do ar';
      default:
        return 'Verificando status...';
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: '#f0f4f8' }}>
      {/* AppBar com toggle */}
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={() => setSidebarOpen((v) => !v)} aria-label="menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="h6">Status do Serviço</Typography>
        </Toolbar>
      </AppBar>

      {/* Espaçador do AppBar */}
      <Toolbar />

      {/* Sidebar controlado (temporary no mobile, persistent no desktop) */}
      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main com scroll e margem quando o menu está aberto no desktop */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: 'calc(100vh - 64px)',
          overflowY: 'auto',
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
        <Card
          elevation={3}
          sx={{
            width: 360,
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            bgcolor: '#fff',
          }}
        >
          <CardContent>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Status do Serviço
            </Typography>

            <Box sx={{ mt: 2, mb: 2 }}>{getStatusIcon()}</Box>

            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              {getStatusMessage()}
            </Typography>

            {lastUpdated && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Última verificação: {lastUpdated}
              </Typography>
            )}

            <Divider sx={{ my: 3 }} />

            <Button
              onClick={fetchServiceStatus}
              variant="contained"
              startIcon={<SyncIcon />}
              disabled={status === 'loading'}
              sx={{
                textTransform: 'none',
                fontWeight: 'bold',
              }}
            >
              Atualizar Status
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
