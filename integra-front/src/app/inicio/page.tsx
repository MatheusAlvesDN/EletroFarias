'use client';

import React, { useEffect, useMemo, useState } from 'react';
import SidebarMenu from '@/components/SidebarMenu';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Typography,
  Button,
  Stack,
  IconButton,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useRouter } from 'next/navigation';

// Reaproveita o mesmo "look & feel" da página de busca:
// - Botão flutuante para abrir o menu lateral
// - Fundo com cor clara e conteúdo centralizado em um Card
// - Tipografia e espaçamentos iguais

const CARD_SX = {
  maxWidth: 1200,
  mx: 'auto',
  mt: 6,
  borderRadius: 2,
  boxShadow: 0,
  border: 1,
  backgroundColor: 'background.paper',
} as const;

const SECTION_TITLE_SX = { fontWeight: 700, mb: 2 } as const;

export default function Page() {
  const { fetchCategories } = useCategoryStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);


  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const router = useRouter();

useEffect(() => {
  const t =
    typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (!t) {
    router.replace('/'); // sem login → volta para a página inicial (login)
    return;
  }
  // não precisa armazenar token em state se não usa
}, [router]);


  // Exemplo de ações rápidas (CTA) para manter o mesmo padrão visual
  const quickActions = useMemo(
    () => [
      { label: 'Consultar Produtos', href: '/produtos/consulta' },
      { label: 'Cadastrar Grupo', href: '/grupos/novo' },
      { label: 'Relatórios', href: '/relatorios' },
    ],
    []
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Botão flutuante para abrir/fechar o Sidebar */}
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
          p: 5,
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
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Início
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Integração de Estoque — EletroFarias
            </Typography>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={SECTION_TITLE_SX}>
              Visão geral
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Aplicativo para integrar o estoque do Sankhya com outras plataformas.
              Utilize o menu lateral para acessar consultas, cadastros, exclusões, status e relatórios.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
              {quickActions.map((a) => (
                <Button
                  key={a.label}
                  variant="contained"
                  href={a.href}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {a.label}
                </Button>
              ))}
            </Stack>

            {/* Se quiser, dá para inserir cards-resumo aqui com números de sincronização/erros */}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
