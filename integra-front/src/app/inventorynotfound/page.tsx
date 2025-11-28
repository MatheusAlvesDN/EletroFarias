'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  TextField,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  Divider,
  Stack,
  IconButton,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,          // <-- ADICIONADO
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

type InventoryItem = {
  id: string;
  codProd: number;
  descricao?: string | null;
  count: number;
  inStock: number;
  inplantedDate: string;
  userEmail?: string | null;
  localizacao?: string | null;
};

type LocAgg = {
  localizacao: string;
  qtProdutos: number;   // quantos registros de inventário naquela loc
  totalCount: number;   // soma de count
  totalInStock: number; // soma de inStock
};

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [locAgg, setLocAgg] = useState<LocAgg[]>([]);
  const [filter, setFilter] = useState<string>('');

  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const INVENTORY_LIST_URL = API_BASE
    ? `${API_BASE}/sync/getinventoryList`
    : `/sync/getinventoryList`;

  // autenticação: se não tiver token → volta pro login
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t && !API_TOKEN) {
      router.replace('/');
      return;
    }
    setToken(t ?? null);
  }, [router, API_TOKEN]);

  // carrega inventário quando tiver token / API_TOKEN
  useEffect(() => {
    const canFetch = !!token || !!API_TOKEN;
    if (!canFetch) return;

    const fetchInventory = async () => {
      setErro(null);
      setOkMsg(null);
      setLoading(true);

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

        const resp = await fetch(INVENTORY_LIST_URL, {
          method: 'GET',
          headers,
          cache: 'no-store',
        });

        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha ao carregar inventário (status ${resp.status})`);
        }

        const data = (await resp.json()) as InventoryItem[] | null;
        const list = Array.isArray(data) ? data : [];

        setInventory(list);

        // Agrupa por localização
        const map = new Map<string, LocAgg>();

        for (const item of list) {
          const loc = (item.localizacao || 'SEM LOCALIZAÇÃO').toString().toUpperCase();

          const existing = map.get(loc) ?? {
            localizacao: loc,
            qtProdutos: 0,
            totalCount: 0,
            totalInStock: 0,
          };

          existing.qtProdutos += 1;
          existing.totalCount += Number(item.count ?? 0);
          existing.totalInStock += Number(item.inStock ?? 0);

          map.set(loc, existing);
        }

        const agg = Array.from(map.values()).sort((a, b) =>
          a.localizacao.localeCompare(b.localizacao, 'pt-BR')
        );

        setLocAgg(agg);
        setOkMsg(`Carregadas ${agg.length} localizações com produtos contados.`);
        setSnackbarOpen(true);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Erro ao carregar localizações contadas.';
        setErro(msg);
        setSnackbarOpen(true);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [token, API_TOKEN, INVENTORY_LIST_URL]);

  const filteredLocs = useMemo(() => {
    const f = filter.trim().toUpperCase();
    if (!f) return locAgg;
    return locAgg.filter((l) => l.localizacao.includes(f));
  }, [filter, locAgg]);

  // Navega para a tela de "pendentes por localização"
  const handleOpenLocation = (loc: string) => {
    if (!loc) return;
    // ajuste o path abaixo para o caminho real da sua página de pendentes
    router.push(`/estoque/pendentes-por-localizacao?loc=${encodeURIComponent(loc)}`);
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
        <IconButton
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="menu"
          size="large"
        >
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
              Localizações com produtos contados
            </Typography>

            {/* Filtro por localização */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="Filtrar localização"
                value={filter}
                onChange={(e) => setFilter(e.target.value.toUpperCase())}
                size="small"
                fullWidth
              />
            </Box>

            {erro && (
              <Typography color="error" sx={{ mb: 1 }}>
                {erro}
              </Typography>
            )}
            {okMsg && (
              <Typography color="success.main" sx={{ mb: 1 }}>
                {okMsg}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            {loading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mt: 4,
                  mb: 4,
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total de localizações com inventário: <b>{locAgg.length}</b>
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  Linhas totais de inventário: <b>{inventory.length}</b>
                </Typography>

                {filteredLocs.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>
                    Nenhuma localização encontrada com o filtro atual.
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
                    <Table size="small" stickyHeader aria-label="locacoes-contadas">
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
                          <TableCell>Localização</TableCell>
                          <TableCell align="right">Produtos contados</TableCell>
                          <TableCell align="right">Soma contagem</TableCell>
                          <TableCell align="right">Soma estoque</TableCell>
                          <TableCell align="center">Ações</TableCell> {/* nova coluna */}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredLocs.map((l) => (
                          <TableRow key={l.localizacao}>
                            <TableCell>{l.localizacao}</TableCell>
                            <TableCell align="right">{l.qtProdutos}</TableCell>
                            <TableCell align="right">{l.totalCount}</TableCell>
                            <TableCell align="right">{l.totalInStock}</TableCell>
                            <TableCell align="center">
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleOpenLocation(l.localizacao)}
                              >
                                Ver produtos
                              </Button>
                            </TableCell>
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

      {/* Snackbar global */}
      <Snackbar
        open={snackbarOpen && (!!erro || !!okMsg)}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={erro ? 'error' : 'success'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {erro || okMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
