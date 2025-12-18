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

/**
 * Se o back estiver emitindo `role` como número (enum index),
 * mapeie aqui exatamente na ordem do seu enum do Prisma/Nest.
 * Ex: enum Role { ADMIN, MANAGER, USER, TRIAGEM, SEPARADOR }
 */
const ROLE_BY_INDEX = ['ADMIN', 'MANAGER', 'USER', 'TRIAGEM', 'SEPARADOR'] as const;

function base64UrlDecodeToString(base64Url: string): string {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';

  const binary = window.atob(base64);
  const bytes = new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
  return new TextDecoder('utf-8').decode(bytes);
}

function decodeJwtPayload(token: string | null): JwtPayload | null {
  if (!token) return null;
  if (typeof window === 'undefined') return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const json = base64UrlDecodeToString(parts[1]);
    const parsed: unknown = JSON.parse(json);

    if (parsed && typeof parsed === 'object') return parsed as JwtPayload;
    return null;
  } catch (e) {
    console.error('decodeJwtPayload falhou:', e);
    return null;
  }
}

function normalizeRoles(raw: unknown): string[] {
  if (raw === null || raw === undefined) return [];

  // número -> enum index
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const r = ROLE_BY_INDEX[raw as number];
    return r ? [r] : [];
  }

  // string numérica -> enum index OU string normal
  if (typeof raw === 'string') {
    const s = raw.trim();
    const asNum = Number(s);

    if (s !== '' && Number.isFinite(asNum) && Number.isInteger(asNum)) {
      const r = ROLE_BY_INDEX[asNum];
      return r ? [r] : [s.toUpperCase()];
    }

    // csv (ex: "ADMIN,MANAGER")
    return s
      .split(',')
      .map((x) => x.toUpperCase().trim())
      .filter(Boolean);
  }

  // array (strings/números)
  if (Array.isArray(raw)) {
    return raw.flatMap((x) => normalizeRoles(x));
  }

  return [String(raw).toUpperCase().trim()].filter(Boolean);
}

function getUserRolesFromToken(token: string | null): string[] {
  const payload = decodeJwtPayload(token);
  if (!payload) return [];

  const claims = payload['claims'];
  const claimsObj =
    claims && typeof claims === 'object' ? (claims as Record<string, unknown>) : null;

  const raw =
    payload['roles'] ??
    payload['role'] ??
    claimsObj?.['roles'] ??
    claimsObj?.['role'] ??
    null;

  const roles = normalizeRoles(raw);

  // unique + normaliza
  return Array.from(new Set(roles.map((r) => r.toUpperCase().trim()).filter(Boolean)));
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

  // ✅ roles do usuário (via JWT)
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    // email (prop > localStorage)
    if (userEmailProp) {
      setUserEmail(userEmailProp);
    } else if (typeof window !== 'undefined') {
      const lsEmail = localStorage.getItem('userEmail');
      if (lsEmail) setUserEmail(lsEmail);
    }

    // roles via token (recarrega quando abrir o menu)
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('authToken');
      const payload = decodeJwtPayload(t);
      const r = getUserRolesFromToken(t);

      console.log('JWT payload:', payload);
      console.log('roles lidas:', r);

      setRoles(r);
    }
  }, [userEmailProp, open]);

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

  // ✅ Defina as páginas e roles (apenas roles que EXISTEM no seu enum)
  const menuItems: MenuItem[] = useMemo(
    () => [
      // Triagem
      { label: 'TRIAGEM', path: '/triagem/triagemChip', icon: <AltRouteIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'TRIAGEM'] },

      // Inventory (se você quer deixar USER acessar também, ok)
      { label: 'CONTAGEM', path: '/inventory/contagem', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'USER'] },
      { label: 'RECONTAGEM', path: '/inventory/recontagem', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'USER'] },
      { label: 'TERCEIRA CONTAGEM', path: '/inventory/terceira_contagem', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'USER'] },

      // Dashboard (sem rolesAllowed => todo mundo logado vê)
      { label: 'DASHBOARD', path: '/mapBeta', icon: <PlaylistAddCheckIcon /> },
    ],
    []
  );

  const allowedItems = useMemo(() => {
    const userRoles = roles;

    return menuItems.filter((item) => {
      const allowed = item.rolesAllowed;
      if (!allowed || allowed.length === 0) return true;
      return allowed.some((r) => userRoles.includes(String(r).toUpperCase().trim()));
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
            sx={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', mt: 2, mb: 1 }}
          />
        </ListItem>

        <ListItem sx={{ justifyContent: 'center', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="h6" sx={{ color: 'grey.300', textAlign: 'center' }}>
            {userEmail || 'Usuário'}
          </Typography>

          {/* debug (opcional) */}
          <Typography variant="caption" sx={{ color: 'grey.500', textAlign: 'center' }}>
            {roles.length ? roles.join(', ') : ''}
          </Typography>
        </ListItem>

        <Divider sx={{ backgroundColor: '#444', mt: 2 }} />

        {/* fixos */}
        <ListItem sx={{ justifyContent: 'center', mt: 2 }}>
          <Button variant="outlined" fullWidth startIcon={<HomeIcon />} onClick={goInicio} sx={commonButtonSx}>
            INÍCIO
          </Button>
        </ListItem>

        <ListItem sx={{ justifyContent: 'center', mt: 1 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<LockResetIcon />}
            onClick={goAlterarSenha}
            sx={commonButtonSx}
          >
            ALTERAR SENHA
          </Button>
        </ListItem>

        {/* páginas por role */}
        {allowedItems.length > 0 && <Divider sx={{ backgroundColor: '#444', mt: 2 }} />}

        {allowedItems.map((item) => (
          <ListItem key={item.path} sx={{ justifyContent: 'center', mt: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={item.icon}
              onClick={() => go(item.path)}
              sx={commonButtonSx}
            >
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
