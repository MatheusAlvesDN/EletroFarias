'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // auth
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  // form
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ui feedback
  const [erro, setErro] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);
  }, [router]);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const CREATE_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/criarUsuario` : `/sync/criarUsuario`),
    [API_BASE]
  );

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const toast = (msg: string, severity: 'success' | 'error') => {
    setSnackbarMsg(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const isValidEmail = (v: string) => /^[a-zA-Z]+@[a-zA-Z]+$/.test(v.trim());

  const handleCreate = async () => {
    const e = email.trim();
    const s = senha;

    setErro(null);

    if (!e) {
      setErro('Informe o e-mail.');
      return;
    }
    if (!isValidEmail(e)) {
      setErro('E-mail inválido.');
      return;
    }
    if (!s) {
      setErro('Informe a senha.');
      return;
    }
    if (s.length < 4) {
      setErro('A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const resp = await fetch(CREATE_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify({ email: e, senha: s }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao criar usuário (status ${resp.status})`);
      }

      toast('Usuário criado com sucesso!', 'success');
      setEmail('');
      setSenha('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar usuário';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') handleCreate();
  };

  const CARD_SX = {
    maxWidth: 800,
    mx: 'auto',
    mt: 6,
    borderRadius: 2,
    boxShadow: 0,
    border: 1,
    backgroundColor: 'background.paper',
  } as const;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Floating button: sidebar */}
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

      {/* Main */}
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
          fontSize: '18px',
          lineHeight: '1.8',
          color: '#333',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Card sx={CARD_SX}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Criar usuário
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Informe e-mail e senha para criar um novo usuário.
            </Typography>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="small"
                fullWidth
                autoFocus
                onKeyDown={handleKeyDown}
              />
              <TextField
                label="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                size="small"
                fullWidth
                type="password"
                onKeyDown={handleKeyDown}
              />
            </Box>

            {erro && (
              <Typography color="error" sx={{ mt: 2 }}>
                {erro}
              </Typography>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleCreate}
                disabled={submitting}
                sx={{ minWidth: 120, textTransform: 'none' }}
              >
                {submitting ? <CircularProgress size={18} /> : 'CRIAR'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3500}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbarMsg}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
