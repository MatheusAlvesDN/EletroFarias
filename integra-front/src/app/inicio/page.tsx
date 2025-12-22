'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Collapse,
  Button,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

import { MENU_SECTIONS, filterSectionsByRole, Role } from '@/config/menu';
import { getEmailFromToken, getRoleFromToken } from '@/utils/jwt';

const ROLE_SET = new Set<Role>([
  'ADMIN',
  'MANAGER',
  'TRIAGEM',
  'SEPARADOR',
  'ESTOQUE',
  'CONTADOR',
]);

const normalizeRole = (value: unknown): Role | null => {
  const r = String(value ?? '').toUpperCase().trim();
  if (!r) return null;
  return ROLE_SET.has(r as Role) ? (r as Role) : null;
};

export default function Page() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  // setor expandido
  const [openSection, setOpenSection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    if (!t) {
      router.replace('/');
      return;
    }

    // ✅ pegue do token REAL (t), não do state token (que ainda não foi setado)
    setEmail(getEmailFromToken(t) ?? null);
    setRole(normalizeRole(getRoleFromToken(t)));
  }, [router]);

  const sections = useMemo(() => {
    return filterSectionsByRole(MENU_SECTIONS, role);
  }, [role]);

  const CARD_SX = {
    maxWidth: 1200,
    mx: 'auto',
    mt: 6,
    borderRadius: 2,
    boxShadow: 0,
    border: 1,
    backgroundColor: 'background.paper',
  } as const;

  const toggleSection = (id: string) => {
    setOpenSection((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const go = (path: string) => {
    router.push(path);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* botão flutuante sidebar */}
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

      {/* main */}
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
          color: '#333',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Card sx={CARD_SX}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Início
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {email ? `Logado como ${email}` : 'Usuário logado'}
              {role ? ` • Role: ${role}` : ''}
            </Typography>

            <Divider sx={{ mb: 2 }} />

            {sections.map((section) => {
              const isOpen = !!openSection[section.id];

              return (
                <Box key={section.id} sx={{ mb: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => toggleSection(section.id)}
                    startIcon={section.icon ?? <ChevronRightIcon />}
                    endIcon={isOpen ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                    sx={{ justifyContent: 'space-between', textTransform: 'none' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span style={{ fontWeight: 700 }}>{section.title}</span>
                    </Box>
                  </Button>

                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    <Box sx={{ mt: 1, display: 'grid', gap: 1 }}>
                      {section.items.map((item) => (
                        <Button
                          key={item.path}
                          variant="contained"
                          onClick={() => go(item.path)}
                          startIcon={item.icon}
                          sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
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
              <Typography color="text.secondary">Nenhuma opção disponível para sua role.</Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
