'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  TextField,
  Alert,
  Snackbar,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';

export default function RoulettePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Game State
  const [spins, setSpins] = useState(0);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // Mocked Valid Codes
  const VALID_CODES: Record<string, number> = {
    'BONUS2024': 5,
    'WELCOME': 10,
    'LUCKY': 1,
    'ROLETATOP': 3
  };

  const [redeemedCodes, setRedeemedCodes] = useState<Set<string>>(new Set());

  const handleRedeem = () => {
    const normalizedCode = code.trim().toUpperCase();

    if (!normalizedCode) {
      setMessage({ type: 'error', text: 'Por favor, digite um código.' });
      setOpenSnackbar(true);
      return;
    }

    if (redeemedCodes.has(normalizedCode)) {
      setMessage({ type: 'error', text: 'Este código já foi utilizado.' });
      setOpenSnackbar(true);
      return;
    }

    if (VALID_CODES[normalizedCode]) {
      const addedSpins = VALID_CODES[normalizedCode];
      setSpins(prev => prev + addedSpins);
      setRedeemedCodes(prev => new Set(prev).add(normalizedCode));
      setMessage({ type: 'success', text: `Código resgatado! Você ganhou ${addedSpins} giros.` });
      setCode('');
    } else {
      setMessage({ type: 'error', text: 'Código inválido.' });
    }
    setOpenSnackbar(true);
  };

  const handleSpin = () => {
    if (spins > 0) {
      setSpins(prev => prev - 1);
      // Logic for spinning would go here
      setMessage({ type: 'success', text: 'Girando a roleta... (Simulação)' });
      setOpenSnackbar(true);
    } else {
        setMessage({ type: 'error', text: 'Você não tem giros suficientes.' });
        setOpenSnackbar(true);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar Toggle */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          left: 16,
          width: 56,
          height: 56,
          borderRadius: '50%',
          bgcolor: 'background.paper',
          boxShadow: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: (t) => t.zIndex.appBar,
        }}
      >
        <IconButton onClick={() => setSidebarOpen((v) => !v)} aria-label="menu" size="large">
          <MenuIcon />
        </IconButton>
      </Box>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: 0,
          backgroundColor: '#f0f4f8',
          height: '100vh',
          overflowY: 'auto',
          p: { xs: 2, sm: 5 },
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 4, color: '#333' }}>
              Roleta de Prêmios
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                {/* Roulette Area */}
                <Box sx={{ flex: 2 }}>
                    <Card sx={{ height: '100%', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fff' }}>
                        <CardContent sx={{ textAlign: 'center', width: '100%' }}>
                            <Box sx={{
                                width: 200,
                                height: 200,
                                borderRadius: '50%',
                                border: '10px solid #f50057',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto',
                                mb: 3,
                                background: 'conic-gradient(#f44336 0deg 60deg, #ffeb3b 60deg 120deg, #4caf50 120deg 180deg, #2196f3 180deg 240deg, #9c27b0 240deg 300deg, #ff9800 300deg 360deg)'
                            }}>
                                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold', textShadow: '1px 1px 2px black' }}>
                                    ROLETA
                                </Typography>
                            </Box>
                            <Button variant="contained" color="secondary" size="large" onClick={handleSpin} disabled={spins === 0}>
                                Girar Roleta ({spins})
                            </Button>
                        </CardContent>
                    </Card>
                </Box>

                {/* Code System Area */}
                <Box sx={{ flex: 1 }}>
                    <Card sx={{ height: '100%', bgcolor: '#fff' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Sistema de Códigos
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Digite um código promocional para ganhar giros extras.
                            </Typography>

                            <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
                                <TextField
                                    label="Código Promocional"
                                    variant="outlined"
                                    fullWidth
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    sx={{ mb: 2 }}
                                />
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={handleRedeem}
                                >
                                    Resgatar
                                </Button>
                            </Box>

                            {/* Valid Codes Hint (For Demo) */}
                            <Box sx={{ mt: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Códigos de teste: BONUS2024, WELCOME, LUCKY
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </Box>
      </Box>

      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={() => setOpenSnackbar(false)}>
        <Alert onClose={() => setOpenSnackbar(false)} severity={message?.type || 'info'} sx={{ width: '100%' }}>
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}
