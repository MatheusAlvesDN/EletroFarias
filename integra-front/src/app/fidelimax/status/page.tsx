'use client'

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Button,
} from '@mui/material';
import SidebarMenu from '@/components/SidebarMenu';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SyncIcon from '@mui/icons-material/Sync';

export default function ServiceStatusPage() {
  const [status, setStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchServiceStatus = async () => {
    try {
      setStatus('loading');
      await new Promise((res) => setTimeout(res, 1000));
      const randomStatus = Math.random() > 0.5 ? 'online' : 'offline';
      setStatus(randomStatus);
      setLastUpdated(new Date().toLocaleString());
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
    } catch (err) {
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
        return 'Serviço Operando normalmente';
      case 'offline':
        return 'Serviço Fora do ar';
      default:
        return 'Verificando status...';
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f0f4f8' }}>
      {/* Sidebar */}
      <SidebarMenu />

      {/* Conteúdo */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
        }}
      >
        <Card
          elevation={3}
          sx={{
            width: 360,
            padding: 4,
            textAlign: 'center',
            borderRadius: 3,
            backgroundColor: '#fff',
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
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#125ea4',
                },
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
