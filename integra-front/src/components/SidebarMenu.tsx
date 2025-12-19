'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Drawer,
  List,
  ListItem,
  Typography,
  Divider,
  Box,
  IconButton,
  Button,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useRouter } from 'next/navigation';

export const DRAWER_WIDTH = 300;

export type SidebarMenuProps = {
  open: boolean;
  onClose: () => void;

  // opcional: se você passar por prop, ele usa.
  userEmail?: string | null;

  // opcional: se quiser executar algo extra ao deslogar
  onLogout?: () => void;
};

// ✅ helper: extrai email de um JWT (authToken salvo no localStorage)
function decodeJwtEmail(token: string | null): string | null {
  if (!token) return null;
  if (typeof window === 'undefined') return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';

    const json = JSON.parse(window.atob(base64)) as Record<string, unknown>;

    const email =
      (typeof json.email === 'string' ? json.email : null) ||
      (typeof json.userEmail === 'string' ? json.userEmail : null) ||
      (typeof json.sub === 'string' ? json.sub : null);

    return email ?? null;
  } catch {
    return null;
  }
}

export default function SidebarMenu({ open, onClose, userEmail: userEmailProp, onLogout }: SidebarMenuProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LOGOUT_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/logoutSession` : `/sync/logoutSession`),
    [API_BASE]
  );

  const [userEmail, setUserEmail] = useState<string | null>(userEmailProp ?? null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ✅ mantém email atualizado (prop > jwt(authToken) > localStorage.userEmail)
  useEffect(() => {
    if (userEmailProp) {
      setUserEmail(userEmailProp);
      return;
    }

    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('authToken');
    const jwtEmail = decodeJwtEmail(token);

    if (jwtEmail) {
      setUserEmail(jwtEmail);
      return;
    }

    const lsEmail = localStorage.getItem('userEmail');
    if (lsEmail) setUserEmail(lsEmail);
  }, [userEmailProp]);

  const goInicio = useCallback(() => {
    onClose();
    router.push('/inicio');
  }, [onClose, router]);

  const goAlterarSenha = useCallback(() => {
    onClose();
    router.push('/alterarSenha');
  }, [onClose, router]);

  const doLogout = useCallback(async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      // tenta POST, depois GET
      let ok = false;

      try {
        const resp = await fetch(LOGOUT_URL, { method: 'POST', headers, cache: 'no-store' });
        ok = resp.ok;
      } catch {
        ok = false;
      }

      if (!ok) {
        try {
          const resp2 = await fetch(LOGOUT_URL, { method: 'GET', headers, cache: 'no-store' });
          ok = resp2.ok;
        } catch {
          // ignora
        }
      }
    } finally {
      // desloga do frontend sempre
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userEmail');
        }
      } catch {
        // ignora
      }

      try {
        onLogout?.();
      } catch {
        // ignora
      }

      onClose();
      router.replace('/');
      setIsLoggingOut(false);
    }
  }, [API_TOKEN, LOGOUT_URL, onClose, onLogout, router, isLoggingOut]);

  return (
    <Drawer
      anchor="left"
      variant={isMobile ? 'temporary' : 'persistent'}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: '#1e1e2f',
          color: '#fff',
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 0 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,.25)', borderRadius: 8 },
          '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(255,255,255,.4)' },
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,.4) transparent',
        },
        ...(!isMobile && !open ? { display: 'none' } : {}),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          px: 1,
          height: 64,
        }}
      >
        <IconButton onClick={onClose} sx={{ color: '#fff' }} aria-label="Fechar menu">
          <ChevronLeftIcon />
        </IconButton>
      </Box>

      <Divider sx={{ backgroundColor: '#444' }} />

      <List>
        <ListItem sx={{ justifyContent: 'center' }}>
          <Box
            component="img"
            src="/logo.png"
            alt="Avatar"
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              objectFit: 'cover',
              mt: 2,
              mb: 1,
            }}
          />
        </ListItem>

        {/* ✅ Email sempre visível */}
        <ListItem sx={{ justifyContent: 'center' }}>
          <Typography variant="h6" sx={{ color: 'grey.300', textAlign: 'center', px: 2 }}>
            {userEmail || 'Usuário'}
          </Typography>
        </ListItem>

        <Divider sx={{ backgroundColor: '#444', mt: 2 }} />

        <ListItem sx={{ justifyContent: 'center', mt: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<HomeIcon />}
            onClick={goInicio}
            sx={{
              borderColor: 'rgba(255,255,255,0.35)',
              color: '#fff',
              maxWidth: 220,
              '&:hover': { borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255, 255, 255, 0.08)' },
            }}
          >
            INÍCIO
          </Button>
        </ListItem>

        <ListItem sx={{ justifyContent: 'center', mt: 1 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<LockResetIcon />}
            onClick={goAlterarSenha}
            sx={{
              borderColor: 'rgba(255,255,255,0.35)',
              color: '#fff',
              maxWidth: 220,
              '&:hover': { borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255, 255, 255, 0.08)' },
            }}
          >
            ALTERAR SENHA
          </Button>
        </ListItem>

        <Divider sx={{ backgroundColor: '#444', mt: 2 }} />

        <ListItem sx={{ justifyContent: 'center', mt: 2, mb: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={isLoggingOut ? <CircularProgress size={16} sx={{ color: '#f44336' }} /> : <LogoutIcon />}
            onClick={doLogout}
            disabled={isLoggingOut}
            sx={{
              borderColor: '#f44336',
              color: '#f44336',
              maxWidth: 220,
              '&:hover': { borderColor: '#d32f2f', backgroundColor: 'rgba(244, 67, 54, 0.08)' },
            }}
          >
            {isLoggingOut ? 'Saindo...' : 'Sair'}
          </Button>
        </ListItem>
      </List>
    </Drawer>
  );
}
