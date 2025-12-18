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
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import { useRouter } from 'next/navigation';

export const DRAWER_WIDTH = 300;

export type SidebarMenuProps = {
  open: boolean;
  onClose: () => void;
  userEmail?: string | null;
  onLogout?: () => void;
};

type JwtPayload = Record<string, unknown>;

function decodeJwtPayload(token: string | null): JwtPayload | null {
  if (!token) return null;
  if (typeof window === 'undefined') return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';

    const parsed: unknown = JSON.parse(window.atob(base64));
    if (parsed && typeof parsed === 'object') return parsed as JwtPayload;

    return null;
  } catch {
    return null;
  }
}

function normalizeRole(v: unknown): string[] {
  if (!v) return [];

  // roles pode vir como string, array, ou até CSV
  if (Array.isArray(v)) {
    return v
      .map((x) => String(x).toUpperCase().trim())
      .flatMap((s) => (s.includes(',') ? s.split(',') : [s]))
      .map((s) => s.toUpperCase().trim())
      .filter(Boolean);
  }

  const s = String(v).toUpperCase().trim();
  if (!s) return [];
  return s
    .split(',')
    .map((x) => x.toUpperCase().trim())
    .filter(Boolean);
}

/**
 * ✅ Retorna várias roles a partir do JWT.
 * Suporta:
 * - payload.role: "ADMIN"
 * - payload.role: ["ADMIN","USER"]
 * - payload.roles: ["ADMIN","USER"]
 * - payload.roles: "ADMIN,USER"
 * - payload.claims.role / payload.claims.roles
 */
function getUserRolesFromToken(token: string | null): string[] {
  const payload = decodeJwtPayload(token);
  if (!payload) return [];

  const claims = payload['claims'];
  const claimsObj = claims && typeof claims === 'object' ? (claims as Record<string, unknown>) : null;

  const raw =
    payload['roles'] ??
    payload['role'] ??
    payload['perfil'] ??
    payload['profile'] ??
    claimsObj?.['roles'] ??
    claimsObj?.['role'] ??
    null;

  const roles = normalizeRole(raw);

  // unique
  return Array.from(new Set(roles));
}

type MenuItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  rolesAllowed?: string[]; // se vazio/undefined => todos logados
};

export default function SidebarMenu({
  open,
  onClose,
  userEmail: userEmailProp,
  onLogout,
}: SidebarMenuProps) {
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

  // ✅ AGORA: várias roles
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    if (userEmailProp) {
      setUserEmail(userEmailProp);
    } else if (typeof window !== 'undefined') {
      const lsEmail = localStorage.getItem('userEmail');
      if (lsEmail) setUserEmail(lsEmail);
    }

    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('authToken');
      setRoles(getUserRolesFromToken(t));
    }
  }, [userEmailProp]);

  const go = useCallback(
    (path: string) => {
      onClose();
      router.push(path);
    },
    [onClose, router]
  );

  const goInicio = useCallback(() => go('/inicio'), [go]);
  const goAlterarSenha = useCallback(() => go('/alterarSenha'), [go]);

  const doLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

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
          // ignore
        }
      }
    } finally {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userEmail');
        }
      } catch {
        // ignore
      }

      try {
        onLogout?.();
      } catch {
        // ignore
      }

      onClose();
      router.replace('/');
      setIsLoggingOut(false);
    }
  }, [API_TOKEN, LOGOUT_URL, onClose, onLogout, router, isLoggingOut]);

  const menuItems: MenuItem[] = useMemo(
    () => [
      { label: 'TRIAGEM', path: '/triagem/triagemChip', icon: <AltRouteIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'TRIAGEM'] },

      { label: 'CONTAGEM', path: '/inventory/contagem', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'INVENTORY', 'USER'] },
      { label: 'RECONTAGEM', path: '/inventory/recontagem', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'INVENTORY', 'USER'] },
      { label: 'TERCEIRA CONTAGEM', path: '/inventory/terceira_contagem', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'INVENTORY', 'USER'] },

      { label: 'DASHBOARD', path: '/mapBeta', icon: <PlaylistAddCheckIcon /> },
    ],
    []
  );

  const allowedItems = useMemo(() => {
    const userRoles = roles.map((r) => r.toUpperCase().trim()).filter(Boolean);

    return menuItems.filter((item) => {
      const allowed = item.rolesAllowed?.map((r) => r.toUpperCase().trim()) ?? [];
      if (allowed.length === 0) return true; // aberto para todos logados
      if (userRoles.length === 0) return false; // sem role => não mostra restritos

      return allowed.some((r) => userRoles.includes(r));
    });
  }, [menuItems, roles]);

  const commonButtonSx = {
    borderColor: 'rgba(255,255,255,0.35)',
    color: '#fff',
    maxWidth: 220,
    '&:hover': {
      borderColor: 'rgba(255,255,255,0.6)',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
  } as const;

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
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,.4) transparent',
        },
        ...(!isMobile && !open ? { display: 'none' } : {}),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: 1, height: 64 }}>
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
            sx={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', mt: 2, mb: 1 }}
          />
        </ListItem>

        <ListItem sx={{ justifyContent: 'center', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="h6" sx={{ color: 'grey.300', textAlign: 'center' }}>
            {userEmail || 'Usuário'}
          </Typography>

          {/* debug opcional */}
          <Typography variant="caption" sx={{ color: 'grey.500', textAlign: 'center' }}>
            {roles.length ? `Roles: ${roles.join(', ')}` : ''}
          </Typography>
        </ListItem>

        <Divider sx={{ backgroundColor: '#444', mt: 2 }} />

        <ListItem sx={{ justifyContent: 'center', mt: 2 }}>
          <Button variant="outlined" fullWidth startIcon={<HomeIcon />} onClick={goInicio} sx={commonButtonSx}>
            INÍCIO
          </Button>
        </ListItem>

        <ListItem sx={{ justifyContent: 'center', mt: 1 }}>
          <Button variant="outlined" fullWidth startIcon={<LockResetIcon />} onClick={goAlterarSenha} sx={commonButtonSx}>
            ALTERAR SENHA
          </Button>
        </ListItem>

        {allowedItems.length > 0 && <Divider sx={{ backgroundColor: '#444', mt: 2 }} />}

        {allowedItems.map((item) => (
          <ListItem key={item.path} sx={{ justifyContent: 'center', mt: 1 }}>
            <Button variant="outlined" fullWidth startIcon={item.icon} onClick={() => go(item.path)} sx={commonButtonSx}>
              {item.label}
            </Button>
          </ListItem>
        ))}

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
