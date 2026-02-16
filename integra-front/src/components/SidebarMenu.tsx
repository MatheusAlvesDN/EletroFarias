'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Collapse,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import LockResetIcon from '@mui/icons-material/LockReset';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { MENU_SECTIONS, filterSectionsByRole, filterItemsByRole, Role } from '@/config/menu';
import { getEmailFromToken, getRoleFromToken } from '@/utils/jwt';

export const DRAWER_WIDTH = 300;

export type SidebarMenuProps = {
  open: boolean;
  onClose: () => void;
  userEmail?: string | null; // opcional
  onLogout?: () => void;
};

const ROLE_SET = new Set<Role>([
  'ADMIN',
  'MANAGER',
  'TRIAGEM',
  'SEPARADOR',
  'ESTOQUE',
  'CONTADOR',
  'USER',
  'SUPERVISOR',
]);

const normalizeRole = (value: unknown): Role | null => {
  const r = String(value ?? '').toUpperCase().trim();
  if (!r) return null;
  return ROLE_SET.has(r as Role) ? (r as Role) : null;
};

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
  const [role, setRole] = useState<Role | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // acordeão por setor
  const [openSection, setOpenSection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const t = localStorage.getItem('authToken');

    // ✅ pega do JWT (não do state token)
    const emailFromJwt = getEmailFromToken(t);
    const roleFromJwt = normalizeRole(getRoleFromToken(t));

    // prioridade: prop > jwt
    setUserEmail(userEmailProp ?? emailFromJwt ?? null);
    setRole(roleFromJwt);
  }, [userEmailProp]);

  // ✅ filtra setores E itens por role
  const sections = useMemo(() => {
    const secs = filterSectionsByRole(MENU_SECTIONS, role);

    // filtra itens por role e remove seção vazia
    return secs
      .map((s) => ({ ...s, items: filterItemsByRole(s.items, role) }))
      .filter((s) => s.items.length > 0);
  }, [role]);

  const toggleSection = (id: string) => {
    setOpenSection((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

  const commonButtonSx = {
    borderColor: 'rgba(255,255,255,0.35)',
    color: '#fff',
    maxWidth: 240,
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
      {/* topo fechar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: 1, height: 64 }}>
        <IconButton onClick={onClose} sx={{ color: '#fff' }} aria-label="Fechar menu">
          <ChevronLeftIcon />
        </IconButton>
      </Box>

      <Divider sx={{ backgroundColor: '#444' }} />

      <List component="nav">
        <ListItem sx={{ justifyContent: 'center' }}>
          <Box
            component="img"
            src="/logo.png"
            alt="Logo da aplicação"
            sx={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', mt: 2, mb: 1 }}
          />
        </ListItem>

        <ListItem sx={{ justifyContent: 'center', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="h6" sx={{ color: 'grey.300', textAlign: 'center' }}>
            {userEmail || 'Usuário'}
          </Typography>

          <Typography variant="caption" sx={{ color: 'grey.500', textAlign: 'center' }}>
            {role ? `ROLE: ${role}` : ''}
          </Typography>
        </ListItem>

        <Divider sx={{ backgroundColor: '#444', mt: 2 }} />

        {/* fixos */}
        <ListItem sx={{ justifyContent: 'center', mt: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<HomeIcon />}
            component={Link}
            href="/inicio"
            onClick={onClose}
            sx={commonButtonSx}
          >
            INÍCIO
          </Button>
        </ListItem>

        <ListItem sx={{ justifyContent: 'center', mt: 1 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<LockResetIcon />}
            component={Link}
            href="/alterarSenha"
            onClick={onClose}
            sx={commonButtonSx}
          >
            ALTERAR SENHA
          </Button>
        </ListItem>

        <Divider sx={{ backgroundColor: '#444', mt: 2 }} />

        {/* ✅ SEÇÕES vindo do MENU_SECTIONS (já filtradas por role + itens) */}
        {sections.map((section) => {
          const isOpen = !!openSection[section.id];
          const sectionContentId = `section-content-${section.id}`;

          return (
            <Box key={section.id} sx={{ px: 2, mt: 1 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => toggleSection(section.id)}
                startIcon={section.icon ?? <ChevronRightIcon />}
                endIcon={isOpen ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                aria-expanded={isOpen}
                aria-controls={sectionContentId}
                sx={{
                  ...commonButtonSx,
                  maxWidth: '100%',
                  justifyContent: 'space-between',
                  textTransform: 'none',
                }}
              >
                <span style={{ fontWeight: 700 }}>{section.title}</span>
              </Button>

              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                <Box
                  id={sectionContentId}
                  sx={{ mt: 1, display: 'grid', gap: 1 }}
                >
                  {section.items.map((item) => (
                    <Button
                      key={item.path}
                      variant="contained"
                      component={Link}
                      href={item.path}
                      onClick={onClose}
                      startIcon={item.icon}
                      sx={{
                        justifyContent: 'flex-start',
                        textTransform: 'none',
                        borderRadius: 2,
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </Box>
              </Collapse>
            </Box>
          );
        })}

        {sections.length === 0 && (
          <ListItem sx={{ justifyContent: 'center', mt: 2 }}>
            <Typography variant="body2" sx={{ color: 'grey.400' }}>
              Nenhuma opção disponível para sua role.
            </Typography>
          </ListItem>
        )}

        <Divider sx={{ backgroundColor: '#444', mt: 2 }} />

        {/* logout */}
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
              maxWidth: 240,
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
