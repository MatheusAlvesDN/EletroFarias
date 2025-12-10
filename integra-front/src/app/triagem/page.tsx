'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  TablePagination,
  Button,
  Snackbar,
  Alert,
  Stack,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

// shape esperado (genérico) — sem any
type ItemGeneric = {
  id?: string | number;
  codigo?: string | number;
  descricao?: string | null;
  natureza?: string | null;
  estoqueControlado?: boolean | number | null;
  [k: string]: unknown;
};

type OrderBy = 'codigo' | 'descricao';

const ROWS_PER_PAGE = 10;
const POLLING_INTERVAL_MS = 3000; // intervalo de "tempo real" (ajuste se desejar)

// helper seguro: tenta extrair o primeiro campo presente na lista de chaves e
// retorna string vazia caso não encontre.
function getFirstFieldString(obj: unknown, keys: string[]): string {
  if (!obj || typeof obj !== 'object') return '';
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (v === undefined || v === null) continue;
    return String(v);
  }
  return '';
}

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // abas: 0 = Pedidos (real-time), 1 = Separadores (TOPs)
  const [tab, setTab] = useState<number>(0);

  // Pedidos (real-time)
  const [pedidos, setPedidos] = useState<ItemGeneric[]>([]);
  const [pedidosLoading, setPedidosLoading] = useState(false);
  const [pedidosError, setPedidosError] = useState<string | null>(null);

  // Separadores / TOPs (manual)
  const [tops, setTops] = useState<ItemGeneric[]>([]);
  const [topsFiltered, setTopsFiltered] = useState<ItemGeneric[]>([]);
  const [topsLoading, setTopsLoading] = useState(false);
  const [topsError, setTopsError] = useState<string | null>(null);

  // comuns (pesquisa / paginação / ordenação)
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(ROWS_PER_PAGE);
  const [orderBy, setOrderBy] = useState<OrderBy>('codigo');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarError, setSnackbarError] = useState(false);

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  // polling ref para limpar interval
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      // se quiser forçar login: router.replace('/');
      setToken(null);
      return;
    }
    setToken(t);
  }, [router]);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  // Endpoints — ajuste conforme sua API real
  const PEDIDOS_URL = useMemo(() => (API_BASE ? `${API_BASE}/pedidos` : `/pedidos`), [API_BASE]);
  const LIST_TOP_URL = useMemo(() => (API_BASE ? `${API_BASE}/listarTOP` : `/listarTOP`), [API_BASE]);

  // --------------------------
  // PEDIDOS (real-time polling)
  // --------------------------
  const fetchPedidos = useCallback(async () => {
    try {
      setPedidosLoading(true);
      setPedidosError(null);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(PEDIDOS_URL, { method: 'GET', headers, cache: 'no-store' });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `Falha ao buscar pedidos (status ${resp.status})`);
      }

      const raw = await resp.json();
      // normalize -> array
      const arr = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && Array.isArray((raw as any).items) ? (raw as any).items : []);
      const normalized = arr.map((t: unknown) => ({
        id: getFirstFieldString(t, ['id', 'pedidoId', 'codigo', 'cd']),
        codigo: getFirstFieldString(t, ['codigo', 'numero', 'pedido']),
        descricao: getFirstFieldString(t, ['descricao', 'cliente', 'nomeCliente']),
        raw: t,
      }));
      setPedidos(normalized);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar pedidos';
      setPedidosError(msg);
      setSnackbarMsg(msg);
      setSnackbarError(true);
      setSnackbarOpen(true);
    } finally {
      setPedidosLoading(false);
    }
  }, [PEDIDOS_URL, token, API_TOKEN]);

  // start/stop polling quando aba Pedidos ativa
  useEffect(() => {
    // limpa possível polling anterior
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (tab === 0) {
      // primeira carga imediata
      fetchPedidos();
      // e liga polling periódico
      const id = window.setInterval(() => {
        fetchPedidos();
      }, POLLING_INTERVAL_MS);
      pollingRef.current = id;
    }

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [tab, fetchPedidos]);

  // --------------------------
  // TOPs / Separadores (manual)
  // --------------------------
  const fetchTops = useCallback(async () => {
    try {
      setTopsLoading(true);
      setTopsError(null);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(LIST_TOP_URL, { method: 'GET', headers, cache: 'no-store' });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `Falha ao listar TOPs (status ${resp.status})`);
      }

      const raw = await resp.json();
      let arr: unknown[] = [];
      if (Array.isArray(raw)) arr = raw;
      else if (raw && typeof raw === 'object') {
        const maybe = (raw as Record<string, unknown>).items;
        if (Array.isArray(maybe)) arr = maybe;
      }

      const normalized = arr.map((t) => ({
        id: getFirstFieldString(t, ['id', 'codigo', 'code']),
        codigo: getFirstFieldString(t, ['codigo', 'code', 'id']),
        descricao: getFirstFieldString(t, ['descricao', 'nome', 'description']),
        natureza: getFirstFieldString(t, ['natureza', 'tipo']),
        estoqueControlado: (t && typeof t === 'object' ? ((t as Record<string, unknown>).estoqueControlado ?? (t as Record<string, unknown>).controlaEstoque ?? null) : null) as boolean | number | null,
        raw: t,
      }));
      setTops(normalized);
      setTopsFiltered(normalized);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar TOPs';
      setTopsError(msg);
      setSnackbarMsg(msg);
      setSnackbarError(true);
      setSnackbarOpen(true);
    } finally {
      setTopsLoading(false);
    }
  }, [LIST_TOP_URL, token, API_TOKEN]);

  useEffect(() => {
    // carrega tops inicialmente (não faz polling)
    fetchTops();
  }, [fetchTops]);

  // --------------------------
  // filtro / ordenação (aplicado à aba ativa)
  // --------------------------
  useEffect(() => {
    setPage(0);
    const q = search.trim().toUpperCase();
    if (tab === 0) {
      // filtro pedidos
      const result = pedidos.filter((p) => {
        if (!q) return true;
        const code = String(p.codigo ?? '').toUpperCase();
        const desc = String(p.descricao ?? '').toUpperCase();
        return code.includes(q) || desc.includes(q);
      });
      setPedidos(result);
      // NOTE: here we setPedidos to filtered result; but we want to keep full pedidos for next poll.
      // To avoid losing full list, we will not override pedidos; instead we use a derived filtered list for rendering.
      // For simplicity, we won't change data here — rendering uses derived lists below.
    } else {
      // separadores/tops
      const result = tops.filter((t) => {
        if (!q) return true;
        const code = String(t.codigo ?? '').toUpperCase();
        const desc = String(t.descricao ?? '').toUpperCase();
        return code.includes(q) || desc.includes(q);
      });
      setTopsFiltered(result);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, tab]);

  // derived lists for rendering (so polling won't be overwritten by filter effect)
  const pedidosRendered = useMemo(() => {
    const q = search.trim().toUpperCase();
    const arr = pedidos.filter((p) => {
      if (!q) return true;
      const code = String(p.codigo ?? '').toUpperCase();
      const desc = String(p.descricao ?? '').toUpperCase();
      return code.includes(q) || desc.includes(q);
    });

    const sorted = [...arr].sort((a, b) => {
      let va = String(a.codigo ?? '').padStart(10, '0');
      let vb = String(b.codigo ?? '').padStart(10, '0');
      if (orderBy === 'descricao') {
        va = String(a.descricao ?? '').toUpperCase();
        vb = String(b.descricao ?? '').toUpperCase();
      }
      return orderDirection === 'asc' ? va.localeCompare(vb, 'pt-BR') : vb.localeCompare(va, 'pt-BR');
    });
    return sorted;
  }, [pedidos, search, orderBy, orderDirection]);

  const topsRendered = useMemo(() => {
    const arr = topsFiltered;
    const sorted = [...arr].sort((a, b) => {
      let va = String(a.codigo ?? '').padStart(10, '0');
      let vb = String(b.codigo ?? '').padStart(10, '0');
      if (orderBy === 'descricao') {
        va = String(a.descricao ?? '').toUpperCase();
        vb = String(b.descricao ?? '').toUpperCase();
      }
      return orderDirection === 'asc' ? va.localeCompare(vb, 'pt-BR') : vb.localeCompare(va, 'pt-BR');
    });
    return sorted;
  }, [topsFiltered, orderBy, orderDirection]);

  const pageRows = useMemo(() => {
    const source = tab === 0 ? pedidosRendered : topsRendered;
    return source.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [tab, pedidosRendered, topsRendered, page, rowsPerPage]);

  // handlers
  const handleChangeTab = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setPage(0);
  };

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);

  const toggleSort = (field: OrderBy) => {
    if (orderBy === field) {
      setOrderDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(field);
      setOrderDirection('asc');
    }
  };

  // UI constants
  const CARD_SX = { maxWidth: 1200, mx: 'auto', mt: 6, borderRadius: 2, boxShadow: 0, border: 1, backgroundColor: 'background.paper' } as const;
  const SECTION_TITLE_SX = { fontWeight: 700, mb: 2 } as const;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* floating menu button */}
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h6" sx={SECTION_TITLE_SX}>
                  Pedidos / Separadores
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Aba <b>{tab === 0 ? 'Pedidos (tempo real)' : 'Separadores (TOPs)'}</b>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {/* indicador real-time */}
                {tab === 0 && (
                  <Chip
                    label={pedidosLoading ? 'Atualizando...' : `Última atualização: ${new Date().toLocaleTimeString()}`}
                    color={pedidosLoading ? 'warning' : 'default'}
                    size="small"
                  />
                )}

                <Button
                  variant="outlined"
                  onClick={() => {
                    if (tab === 0) fetchPedidos();
                    else fetchTops();
                  }}
                >
                  Atualizar
                </Button>
              </Box>
            </Box>

            <Tabs value={tab} onChange={handleChangeTab} sx={{ mb: 2 }}>
              <Tab label="Pedidos (tempo real)" />
              <Tab label="Separadores (TOPs)" />
            </Tabs>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField label="Pesquisar (código/descrição)" value={search} onChange={(e) => setSearch(e.target.value)} size="small" fullWidth />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Conteúdo Pedidos */}
            {tab === 0 ? (
              pedidosLoading && pedidos.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                  <CircularProgress />
                </Box>
              ) : pedidosRendered.length === 0 ? (
                <Typography sx={{ color: 'text.secondary' }}>Nenhum pedido encontrado.</Typography>
              ) : (
                <>
                  <TableContainer component={Paper} elevation={0} sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 2, overflowX: 'auto', backgroundColor: 'background.paper', maxWidth: '100%' }}>
                    <Table size="small" stickyHeader aria-label="pedidos" sx={{ minWidth: 700 }}>
                      <TableHead>
                        <TableRow sx={{ '& th': { backgroundColor: (t) => t.palette.grey[50], fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' } }}>
                          <TableCell onClick={() => toggleSort('codigo')}>Código {orderBy === 'codigo' ? (orderDirection === 'asc' ? '▲' : '▼') : ''}</TableCell>
                          <TableCell onClick={() => toggleSort('descricao')}>Descrição {orderBy === 'descricao' ? (orderDirection === 'asc' ? '▲' : '▼') : ''}</TableCell>
                          <TableCell>Detalhes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pageRows.map((row, idx) => (
                          <TableRow key={String(row.id ?? idx)}>
                            <TableCell>{String(row.codigo ?? row.id ?? '-')}</TableCell>
                            <TableCell>{String(row.descricao ?? '-')}</TableCell>
                            <TableCell>
                              <pre style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 600 }}>
                                {JSON.stringify(row.raw ?? {}, null, 0)}
                              </pre>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination component="div" count={pedidosRendered.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} rowsPerPageOptions={[rowsPerPage]} labelRowsPerPage="Linhas por página" />
                </>
              )
            ) : (
              // Conteúdo Separadores / TOPs
              <>
                {topsLoading && tops.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : topsRendered.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>Nenhum TOP encontrado.</Typography>
                ) : (
                  <>
                    <TableContainer component={Paper} elevation={0} sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 2, overflowX: 'auto', backgroundColor: 'background.paper', maxWidth: '100%' }}>
                      <Table size="small" stickyHeader aria-label="tops" sx={{ minWidth: 700 }}>
                        <TableHead>
                          <TableRow sx={{ '& th': { backgroundColor: (t) => t.palette.grey[50], fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' } }}>
                            <TableCell onClick={() => toggleSort('codigo')}>Código {orderBy === 'codigo' ? (orderDirection === 'asc' ? '▲' : '▼') : ''}</TableCell>
                            <TableCell onClick={() => toggleSort('descricao')}>Descrição {orderBy === 'descricao' ? (orderDirection === 'asc' ? '▲' : '▼') : ''}</TableCell>
                            <TableCell>Natureza</TableCell>
                            <TableCell align="center">Controla Estoque</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pageRows.map((row, idx) => (
                            <TableRow key={String(row.id ?? idx)}>
                              <TableCell>{String(row.codigo ?? '-')}</TableCell>
                              <TableCell>{row.descricao ?? '-'}</TableCell>
                              <TableCell>{row.natureza ?? '-'}</TableCell>
                              <TableCell align="center">{row.estoqueControlado ? 'Sim' : 'Não'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <TablePagination component="div" count={topsRendered.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} rowsPerPageOptions={[rowsPerPage]} labelRowsPerPage="Linhas por página" />
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarError ? 'error' : 'success'} variant="filled" sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
