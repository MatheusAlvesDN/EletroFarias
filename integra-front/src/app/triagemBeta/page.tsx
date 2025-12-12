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
  Tabs,
  Tab,
  Chip,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

// genérico para items retornados (Pedidos)
type ItemGeneric = {
  id?: string | number;
  codigo?: string | number;
  descricao?: string | null;
  raw?: unknown;
  [k: string]: unknown;
};

// shape específico para separadores (getSeparadores)
type SeparadorItem = {
  id?: string;
  userEmail?: string | null;
  userId?: string | null;
  lastSeen?: string | null;
  active?: boolean | null;
  raw?: unknown;
  [k: string]: unknown;
};

type OrderBy = 'codigo' | 'descricao';

const ROWS_PER_PAGE = 10;
const POLLING_INTERVAL_MS = 3000;

// helper seguro: extrai o primeiro campo presente na lista de chaves
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

type StockKey = 'A' | 'B' | 'C' | 'D';
type StockStatus = 'ATIVO' | 'INATIVO';

type SeparadorStocks = Record<StockKey, StockStatus>;

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // abas: 0 = Pedidos (real-time), 1 = Separadores (getSeparadores)
  const [tab, setTab] = useState<number>(0);

  // Pedidos (real-time)
  const [pedidos, setPedidos] = useState<ItemGeneric[]>([]);
  const [pedidosLoading, setPedidosLoading] = useState(false);

  // Separadores (getSeparadores)
  const [separadores, setSeparadores] = useState<SeparadorItem[]>([]);
  const [separadoresFiltered, setSeparadoresFiltered] = useState<SeparadorItem[]>([]);
  const [separadoresLoading, setSeparadoresLoading] = useState(false);

  // ✅ estado local dos "estoques" por separador (placeholder pro futuro)
  const [stocksByEmail, setStocksByEmail] = useState<Record<string, SeparadorStocks>>({});

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

  // polling ref para Pedidos
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      setToken(null);
      return;
    }
    setToken(t);
  }, [router]);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  // Endpoints
  const PEDIDOS_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/pedidos` : `/pedidos`),
    [API_BASE]
  );

  const GET_SEPARADORES_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getSeparadores` : `/sync/getSeparadores`),
    [API_BASE]
  );

  // --------------------------
  // PEDIDOS (real-time polling)
  // --------------------------
  const fetchPedidos = useCallback(async () => {
    try {
      setPedidosLoading(true);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(PEDIDOS_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `Falha ao buscar pedidos (status ${resp.status})`);
      }

      const raw = await resp.json();
      const arr: unknown[] = Array.isArray(raw)
        ? raw
        : raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).items)
          ? ((raw as Record<string, unknown>).items as unknown[])
          : [];

      const normalized: ItemGeneric[] = arr.map((t) => ({
        id: getFirstFieldString(t, ['id', 'pedidoId', 'codigo', 'cd']),
        codigo: getFirstFieldString(t, ['codigo', 'numero', 'pedido']),
        descricao: getFirstFieldString(t, ['descricao', 'cliente', 'nomeCliente']),
        raw: t,
      }));

      setPedidos(normalized);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar pedidos';
      setSnackbarMsg(msg);
      setSnackbarError(true);
      setSnackbarOpen(true);
    } finally {
      setPedidosLoading(false);
    }
  }, [PEDIDOS_URL, token, API_TOKEN]);

  // start/stop polling quando aba Pedidos ativa
  useEffect(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (tab === 0) {
      fetchPedidos();
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
  // SEPARADORES (getSeparadores)
  // --------------------------
  const fetchSeparadores = useCallback(async () => {
    try {
      setSeparadoresLoading(true);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(GET_SEPARADORES_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `Falha ao buscar separadores (status ${resp.status})`);
      }

      const raw = await resp.json();
      const arr: unknown[] = Array.isArray(raw)
        ? raw
        : raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).items)
          ? ((raw as Record<string, unknown>).items as unknown[])
          : [];

      const normalized: SeparadorItem[] = arr.map((t) => {
        const rec = (t && typeof t === 'object') ? (t as Record<string, unknown>) : {};
        return {
          id: (rec.id ?? rec.sessionId ?? rec.userId ?? '') as string,
          userEmail: (rec.userEmail ?? rec.email ?? null) as string | null,
          userId: (rec.userId ?? null) as string | null,
          lastSeen: (rec.lastSeen ?? rec.updatedAt ?? null) as string | null,
          active: (rec.active ?? true) as boolean | null,
          raw: t,
        };
      });

      setSeparadores(normalized);
      setSeparadoresFiltered(normalized);

      // ✅ garante estado local para cada email (default: tudo ATIVO)
      setStocksByEmail((prev) => {
        const next = { ...prev };
        for (const s of normalized) {
          const email = String(s.userEmail ?? '').trim();
          if (!email) continue;
          if (!next[email]) {
            next[email] = { A: 'ATIVO', B: 'ATIVO', C: 'ATIVO', D: 'ATIVO' };
          }
        }
        return next;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar separadores';
      setSnackbarMsg(msg);
      setSnackbarError(true);
      setSnackbarOpen(true);
    } finally {
      setSeparadoresLoading(false);
    }
  }, [GET_SEPARADORES_URL, token, API_TOKEN]);

  useEffect(() => {
    // carrega separadores inicialmente (não faz polling)
    fetchSeparadores();
  }, [fetchSeparadores]);

  // --------------------------
  // filtro / ordenação (aplicado à aba ativa)
  // --------------------------
  useEffect(() => {
    setPage(0);
    const q = search.trim().toUpperCase();

    if (tab === 1) {
      const result = separadores.filter((s) => {
        if (!q) return true;
        const email = String(s.userEmail ?? '').toUpperCase();
        return email.includes(q);
      });
      setSeparadoresFiltered(result);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, tab, separadores]);

  const pedidosRendered = useMemo(() => {
    const q = search.trim().toUpperCase();
    const arr = pedidos.filter((p) => {
      if (!q) return true;
      const code = String(p.codigo ?? '').toUpperCase();
      const desc = String(p.descricao ?? '').toUpperCase();
      return code.includes(q) || desc.includes(q);
    });

    const sorted = [...arr].sort((a, b) => {
      const va = String(a.codigo ?? '').padStart(10, '0');
      const vb = String(b.codigo ?? '').padStart(10, '0');
      if (orderBy === 'descricao') {
        va = String(a.descricao ?? '').toUpperCase();
        vb = String(b.descricao ?? '').toUpperCase();
      }
      return orderDirection === 'asc'
        ? va.localeCompare(vb, 'pt-BR')
        : vb.localeCompare(va, 'pt-BR');
    });
    return sorted;
  }, [pedidos, search, orderBy, orderDirection]);

  const separadoresRendered = useMemo(() => {
  const arr = separadoresFiltered;

  const sorted = [...arr].sort((a, b) => {
    const va =
      orderBy === 'descricao'
        ? String(a.userId ?? '').toUpperCase()
        : String(a.userEmail ?? '').toUpperCase();

    const vb =
      orderBy === 'descricao'
        ? String(b.userId ?? '').toUpperCase()
        : String(b.userEmail ?? '').toUpperCase();

    return orderDirection === 'asc'
      ? va.localeCompare(vb, 'pt-BR')
      : vb.localeCompare(va, 'pt-BR');
  });

  return sorted;
  }, [separadoresFiltered, orderBy, orderDirection]);


  const pageRows = useMemo(() => {
    const source = tab === 0 ? pedidosRendered : separadoresRendered;
    return source.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [tab, pedidosRendered, separadoresRendered, page, rowsPerPage]);

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

  const handleChangeStock = (email: string, key: StockKey, value: StockStatus) => {
    // ✅ por enquanto só altera localmente.
    // No futuro: chamar função/endpoint aqui.
    setStocksByEmail((prev) => ({
      ...prev,
      [email]: {
        ...(prev[email] ?? { A: 'ATIVO', B: 'ATIVO', C: 'ATIVO', D: 'ATIVO' }),
        [key]: value,
      },
    }));
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
        <IconButton
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="menu"
          size="large"
        >
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
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <Box>
                <Typography variant="h6" sx={SECTION_TITLE_SX}>
                  Pedidos / Separadores
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Aba{' '}
                  <b>
                    {tab === 0
                      ? 'Pedidos (tempo real)'
                      : 'Separadores (getSeparadores)'}
                  </b>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {tab === 0 && (
                  <Chip
                    label={
                      pedidosLoading
                        ? 'Atualizando...'
                        : `Última atualização: ${new Date().toLocaleTimeString()}`
                    }
                    color={pedidosLoading ? 'warning' : 'default'}
                    size="small"
                  />
                )}

                <Button
                  variant="outlined"
                  onClick={() => {
                    if (tab === 0) fetchPedidos();
                    else fetchSeparadores();
                  }}
                >
                  Atualizar
                </Button>
              </Box>
            </Box>

            <Tabs value={tab} onChange={handleChangeTab} sx={{ mb: 2 }}>
              <Tab label="Pedidos (tempo real)" />
              <Tab label="Separadores (getSeparadores)" />
            </Tabs>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label={tab === 0 ? 'Pesquisar (código/descrição)' : 'Pesquisar (e-mail)'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                fullWidth
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Conteúdo Pedidos */}
            {tab === 0 ? (
              pedidosLoading && pedidos.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                  <CircularProgress />
                </Box>
              ) : pedidosRendered.length === 0 ? (
                <Typography sx={{ color: 'text.secondary' }}>
                  Nenhum pedido encontrado.
                </Typography>
              ) : (
                <>
                  <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                      border: (t) => `1px solid ${t.palette.divider}`,
                      borderRadius: 2,
                      overflowX: 'auto',
                      backgroundColor: 'background.paper',
                      maxWidth: '100%',
                    }}
                  >
                    <Table size="small" stickyHeader aria-label="pedidos" sx={{ minWidth: 700 }}>
                      <TableHead>
                        <TableRow
                          sx={{
                            '& th': {
                              backgroundColor: (t) => t.palette.grey[50],
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                            },
                          }}
                        >
                          <TableCell onClick={() => toggleSort('codigo')}>
                            Código{' '}
                            {orderBy === 'codigo'
                              ? orderDirection === 'asc'
                                ? '▲'
                                : '▼'
                              : ''}
                          </TableCell>
                          <TableCell onClick={() => toggleSort('descricao')}>
                            Descrição{' '}
                            {orderBy === 'descricao'
                              ? orderDirection === 'asc'
                                ? '▲'
                                : '▼'
                              : ''}
                          </TableCell>
                          <TableCell>Detalhes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pageRows.map((row, idx) => (
                          <TableRow key={String(row.id ?? idx)}>
                            <TableCell>
                              {String((row as ItemGeneric).codigo ?? (row as ItemGeneric).id ?? '-')}
                            </TableCell>
                            <TableCell>{String((row as ItemGeneric).descricao ?? '-')}</TableCell>
                            <TableCell>
                              <pre
                                style={{
                                  margin: 0,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: 600,
                                }}
                              >
                                {JSON.stringify((row as ItemGeneric).raw ?? {}, null, 0)}
                              </pre>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={pedidosRendered.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[rowsPerPage]}
                    labelRowsPerPage="Linhas por página"
                  />
                </>
              )
            ) : (
              // ✅ Conteúdo Separadores (getSeparadores) - NOVO VISUAL
              <>
                {separadoresLoading && separadores.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : separadoresRendered.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>
                    Nenhum separador encontrado.
                  </Typography>
                ) : (
                  <>
                    <TableContainer
                      component={Paper}
                      elevation={0}
                      sx={{
                        border: (t) => `1px solid ${t.palette.divider}`,
                        borderRadius: 2,
                        overflowX: 'auto',
                        backgroundColor: 'background.paper',
                        maxWidth: '100%',
                      }}
                    >
                      <Table size="small" stickyHeader aria-label="separadores" sx={{ minWidth: 900 }}>
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
                            <TableCell onClick={() => toggleSort('codigo')} sx={{ cursor: 'pointer' }}>
                              E-mail{' '}
                              {orderBy === 'codigo'
                                ? orderDirection === 'asc'
                                  ? '▲'
                                  : '▼'
                                : ''}
                            </TableCell>

                            <TableCell align="center">Estoque A</TableCell>
                            <TableCell align="center">Estoque B</TableCell>
                            <TableCell align="center">Estoque C</TableCell>
                            <TableCell align="center">Estoque D</TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {pageRows.map((row, idx) => {
                            const sep = row as SeparadorItem;
                            const email = String(sep.userEmail ?? '').trim();
                            const stocks = stocksByEmail[email] ?? { A: 'ATIVO', B: 'ATIVO', C: 'ATIVO', D: 'ATIVO' };

                            const renderSelect = (key: StockKey) => (
                              <TextField
                                select
                                size="small"
                                value={stocks[key]}
                                onChange={(e) => handleChangeStock(email, key, e.target.value as StockStatus)}
                                sx={{ minWidth: 120 }}
                              >
                                <MenuItem value="ATIVO">Ativo</MenuItem>
                                <MenuItem value="INATIVO">Inativo</MenuItem>
                              </TextField>
                            );

                            return (
                              <TableRow key={String(sep.id ?? email ?? idx)}>
                                <TableCell>{sep.userEmail ?? '-'}</TableCell>

                                <TableCell align="center">{email ? renderSelect('A') : '-'}</TableCell>
                                <TableCell align="center">{email ? renderSelect('B') : '-'}</TableCell>
                                <TableCell align="center">{email ? renderSelect('C') : '-'}</TableCell>
                                <TableCell align="center">{email ? renderSelect('D') : '-'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <TablePagination
                      component="div"
                      count={separadoresRendered.length}
                      page={page}
                      onPageChange={handleChangePage}
                      rowsPerPage={rowsPerPage}
                      rowsPerPageOptions={[rowsPerPage]}
                      labelRowsPerPage="Linhas por página"
                    />
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarError ? 'error' : 'success'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
