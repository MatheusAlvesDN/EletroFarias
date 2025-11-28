'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  Divider,
  Stack,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

// Produtos retornados do Sankhya pela localização
type ProdutoLoc = {
  CODPROD: number | string;
  DESCRPROD?: string | null;
  LOCALIZACAO?: string | null;
  ESTOQUE?: number | string | null;
};

// Registros de inventário do Prisma
type InventoryItem = {
  id: string;
  codProd: number;
  count: number;
  inStock: number;
  inplantedDate: string;   // ISO
  descricao?: string | null;
  userEmail?: string | null;
};

const MAX_LOC = 15;

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [produtosPendentes, setProdutosPendentes] = useState<ProdutoLoc[]>([]);

  // auth
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/'); // sem login → volta pra tela de login
      return;
    }
    setToken(t);
  }, [router]);

  // Base da API
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  // Endpoints:
  // 1) produtos por localização (Sankhya)
  const PRODUCTS_BY_LOC_URL = (loc: string) =>
    API_BASE
      ? `${API_BASE}/sync/getProductsByLocation?loc=${encodeURIComponent(loc)}`
      : `/sync/getProductsByLocation?loc=${encodeURIComponent(loc)}`;

  // 2) lista completa de inventário (Prisma)
  const INVENTORY_LIST_URL = API_BASE
    ? `${API_BASE}/sync/getinventoryList`
    : `/sync/getinventoryList`;

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      }),
    []
  );

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

  const formatEstoque = (v: number | string | null | undefined) => {
    if (v == null) return '-';
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return numberFormatter.format(n);
  };

  // Função principal: busca produtos na localização + inventário e filtra
  const handleBuscar = useCallback(async () => {
    const loc = location.trim().toUpperCase();
    setErro(null);
    setProdutosPendentes([]);

    if (!loc) {
      setErro('Informe a localização.');
      return;
    }

    if (!token && !API_TOKEN) {
      setErro('Token de autenticação não encontrado.');
      return;
    }

    try {
      setLoading(true);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      // 1) buscar produtos da localização no Sankhya
      const prodResp = await fetch(PRODUCTS_BY_LOC_URL(loc), {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!prodResp.ok) {
        const msg = await prodResp.text();
        throw new Error(msg || `Falha ao buscar produtos por localização (status ${prodResp.status})`);
      }

      const produtos = (await prodResp.json()) as ProdutoLoc[] | null;
      const listaProdutos = Array.isArray(produtos) ? produtos : [];

      // 2) buscar inventário (todos os produtos já contados)
      const invResp = await fetch(INVENTORY_LIST_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!invResp.ok) {
        const msg = await invResp.text();
        throw new Error(msg || `Falha ao carregar inventário (status ${invResp.status})`);
      }

      const invData = (await invResp.json()) as InventoryItem[] | null;
      const inventario = Array.isArray(invData) ? invData : [];

      // 3) Criar set com os CODPROD já presentes no inventário
      const inventarioSet = new Set<number>(
        inventario.map((inv) => Number(inv.codProd)).filter((n) => Number.isFinite(n))
      );

      // 4) Filtrar apenas produtos da localização que NÃO estão no inventário
      const pendentes = listaProdutos.filter((p) => {
        const codNum = Number(p.CODPROD);
        if (!Number.isFinite(codNum)) return false; // ignora registros sem ID numérico
        return !inventarioSet.has(codNum);
      });

      setProdutosPendentes(pendentes);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar produtos pendentes.';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }, [location, token, API_TOKEN, PRODUCTS_BY_LOC_URL, INVENTORY_LIST_URL]);

  // Permitir Enter no campo de localização
  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') handleBuscar();
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Botão flutuante: sidebar */}
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
            <Typography variant="h6" sx={SECTION_TITLE_SX}>
              Produtos pendentes de contagem por localização
            </Typography>

            {/* Campo de localização + botão Buscar */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="Localização"
                value={location}
                onChange={(e) => setLocation(e.target.value.slice(0, MAX_LOC))}
                onKeyDown={handleKeyDown}
                size="small"
              />
              <Button variant="contained" onClick={handleBuscar} disabled={loading}>
                {loading ? <CircularProgress size={22} /> : 'Buscar'}
              </Button>
            </Box>

            {erro && (
              <Typography color="error" sx={{ mb: 2 }}>
                {erro}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Localização consultada: <b>{location || '-'}</b>
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  Produtos pendentes de contagem: <b>{produtosPendentes.length}</b>
                </Typography>

                {produtosPendentes.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>
                    Nenhum produto pendente de contagem para esta localização.
                  </Typography>
                ) : (
                  <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                      border: (t) => `1px solid ${t.palette.divider}`,
                      borderRadius: 2,
                      overflow: 'hidden',
                      backgroundColor: 'background.paper',
                      maxWidth: '100%',
                    }}
                  >
                    <Table size="small" stickyHeader aria-label="produtos-pendentes">
                      <TableHead>
                        <TableRow
                          sx={{
                            '& th': {
                              backgroundColor: (t) => t.palette.grey[50],
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            },
                          }}
                        >
                          <TableCell>Cód. Produto</TableCell>
                          <TableCell>Descrição</TableCell>
                          <TableCell>Localização</TableCell>
                          <TableCell align="right">Estoque</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {produtosPendentes.map((p) => (
                          <TableRow key={String(p.CODPROD)}>
                            <TableCell>{p.CODPROD}</TableCell>
                            <TableCell>{p.DESCRPROD ?? '-'}</TableCell>
                            <TableCell>{p.LOCALIZACAO ?? '-'}</TableCell>
                            <TableCell align="right">{formatEstoque(p.ESTOQUE)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}