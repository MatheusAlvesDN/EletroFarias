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
  Stack,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

// ✅ agora "Pedidos" são Notas pendentes de conferência
type NotaPendenteItem = {
  NUNOTA?: number;
  STATUSCONFERENCIA?: string | null;
  raw?: unknown;
  [k: string]: unknown;
};

// shape específico para separadores (getSeparadores)
type SeparadorItem = {
  id?: string;
  userEmail?: string | null;
  raw?: unknown;
  [k: string]: unknown;
};

const ROWS_PER_PAGE = 10;
const POLLING_INTERVAL_MS = 3000;

type EstoqueKey = 'A' | 'B' | 'C' | 'D';

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

  // abas: 0 = Pedidos (agora: notas pendentes), 1 = Separadores
  const [tab, setTab] = useState<number>(0);

  // ✅ Pedidos -> Notas pendentes de conferência
  const [pedidos, setPedidos] = useState<NotaPendenteItem[]>([]);
  const [pedidosLoading, setPedidosLoading] = useState(false);

  // Separadores (getSeparadores)
  const [separadores, setSeparadores] = useState<SeparadorItem[]>([]);
  const [separadoresFiltered, setSeparadoresFiltered] = useState<SeparadorItem[]>([]);
  const [separadoresLoading, setSeparadoresLoading] = useState(false);

  // pesquisa / paginação
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(ROWS_PER_PAGE);

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

  // ✅ NOVO endpoint Pedidos
  const PEDIDOS_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getNotasPendentesConferencia` : `/sync/getNotasPendentesConferencia`),
    [API_BASE]
  );

  const GET_SEPARADORES_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getSeparadores` : `/sync/getSeparadores`),
    [API_BASE]
  );

  const ADD_SEPARADOR_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/adicionarSeparador` : `/sync/adicionarSeparador`),
    [API_BASE]
  );

  const REMOVE_SEPARADOR_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/removerSeparador` : `/sync/removerSeparador`),
    [API_BASE]
  );

  // --------------------------
  // Chips: estado local (placeholder)
  // --------------------------
  const [estoquesState, setEstoquesState] = useState<Record<string, boolean>>({});
  const [chipLoading, setChipLoading] = useState<Record<string, boolean>>({});

  const makeKey = (email: string, estoque: EstoqueKey) => `${email}::${estoque}`;

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const handleToggleEstoque = useCallback(
    async (userEmailRaw: string | null | undefined, estoque: EstoqueKey, toActive: boolean) => {
      const userEmail = String(userEmailRaw ?? '').trim();
      if (!userEmail) return;

      const k = makeKey(userEmail, estoque);
      if (chipLoading[k]) return;

      setChipLoading((prev) => ({ ...prev, [k]: true }));

      try {
        const url = toActive ? ADD_SEPARADOR_URL : REMOVE_SEPARADOR_URL;

        const resp = await fetch(url, {
          method: 'POST',
          headers: getAuthHeaders(),
          cache: 'no-store',
          body: JSON.stringify({ userEmail, estoque }),
        });

        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(txt || `Falha ao ${toActive ? 'ativar' : 'inativar'} ${estoque} (status ${resp.status})`);
        }

        setEstoquesState((prev) => ({ ...prev, [k]: toActive }));

        setSnackbarMsg(`Estoque ${estoque} ${toActive ? 'ativado' : 'inativado'} para ${userEmail}.`);
        setSnackbarError(false);
        setSnackbarOpen(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao atualizar estoque do separador';
        setSnackbarMsg(msg);
        setSnackbarError(true);
        setSnackbarOpen(true);
      } finally {
        setChipLoading((prev) => ({ ...prev, [k]: false }));
      }
    },
    [ADD_SEPARADOR_URL, REMOVE_SEPARADOR_URL, getAuthHeaders, chipLoading]
  );

  // --------------------------
  // ✅ PEDIDOS (agora: /sync/getNotasPendentesConferencia)
  // --------------------------
  const fetchPedidos = useCallback(async () => {
    try {
      setPedidosLoading(true);

      const resp = await fetch(PEDIDOS_URL, {
        method: 'GET',
        headers: getAuthHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `Falha ao buscar notas pendentes (status ${resp.status})`);
      }

      const raw = await resp.json();

      const arr: unknown[] = Array.isArray(raw)
        ? raw
        : raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).items)
        ? ((raw as Record<string, unknown>).items as unknown[])
        : [];

      // normaliza campos
      const normalized: NotaPendenteItem[] = arr.map((t) => {
        const rec = t && typeof t === 'object' ? (t as Record<string, unknown>) : {};

        const nunotaRaw = rec.NUNOTA ?? rec.nunota ?? rec.id ?? rec.codigo ?? null;
        const statusRaw =
          rec.STATUSCONFERENCIA ?? rec.statusConferencia ?? rec.status ?? rec.descricao ?? null;

        return {
          NUNOTA: nunotaRaw !== null && nunotaRaw !== undefined ? Number(nunotaRaw) : undefined,
          STATUSCONFERENCIA: statusRaw !== null && statusRaw !== undefined ? String(statusRaw) : null,
          raw: t,
        };
      });

      setPedidos(normalized);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar notas pendentes';
      setSnackbarMsg(msg);
      setSnackbarError(true);
      setSnackbarOpen(true);
    } finally {
      setPedidosLoading(false);
    }
  }, [PEDIDOS_URL, getAuthHeaders]);

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

      const resp = await fetch(GET_SEPARADORES_URL, {
        method: 'GET',
        headers: getAuthHeaders(),
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
        const rec = t && typeof t === 'object' ? (t as Record<string, unknown>) : {};
        return {
          id: (rec.id ?? rec.sessionId ?? rec.userId ?? '') as string,
          userEmail: (rec.userEmail ?? rec.email ?? null) as string | null,
          raw: t,
        };
      });

      setSeparadores(normalized);
      setSeparadoresFiltered(normalized);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar separadores';
      setSnackbarMsg(msg);
      setSnackbarError(true);
      setSnackbarOpen(true);
    } finally {
      setSeparadoresLoading(false);
    }
  }, [GET_SEPARADORES_URL, getAuthHeaders]);

  useEffect(() => {
    fetchSeparadores();
  }, [fetchSeparadores]);

  // filtro
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

  // ✅ render PEDIDOS (notas pendentes) com filtro e ordenação
  const pedidosRendered = useMemo(() => {
    const q = search.trim().toUpperCase();
    const arr = pedidos.filter((p) => {
      if (!q) return true;
      const nunota = String(p.NUNOTA ?? '').toUpperCase();
      const status = String(p.STATUSCONFERENCIA ?? '').toUpperCase();
      return nunota.includes(q) || status.includes(q);
    });

    return [...arr].sort((a, b) => {
      const va = Number(a.NUNOTA ?? 0);
      const vb = Number(b.NUNOTA ?? 0);
      return va - vb;
    });
  }, [pedidos, search]);

  const separadoresRendered = useMemo(() => {
    const arr = separadoresFiltered;
    const sorted = [...arr].sort((a, b) => {
      const va = String(a.userEmail ?? '').toUpperCase();
      const vb = String(b.userEmail ?? '').toUpperCase();
      return va.localeCompare(vb, 'pt-BR');
    });
    return sorted;
  }, [separadoresFiltered]);

  const pageRows = useMemo(() => {
    const source = tab === 0 ? pedidosRendered : separadoresRendered;
    return source.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [tab, pedidosRendered, separadoresRendered, page, rowsPerPage]);

  const handleChangeTab = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setPage(0);
  };

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);

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

  const renderToggleChips = (email: string | null | undefined, estoque: EstoqueKey) => {
    const safeEmail = String(email ?? '').trim();
    const k = makeKey(safeEmail, estoque);
    const active = !!estoquesState[k];
    const loading = !!chipLoading[k];

    return (
      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
        <Chip
          label="Ativo"
          clickable
          disabled={loading || !safeEmail}
          color={active ? 'success' : 'default'}
          variant={active ? 'filled' : 'outlined'}
          onClick={() => handleToggleEstoque(safeEmail, estoque, true)}
          sx={{ minWidth: 76, justifyContent: 'center' }}
        />
        <Chip
          label="Inativo"
          clickable
          disabled={loading || !safeEmail}
          color={!active ? 'error' : 'default'}
          variant={!active ? 'filled' : 'outlined'}
          onClick={() => handleToggleEstoque(safeEmail, estoque, false)}
          sx={{ minWidth: 84, justifyContent: 'center' }}
        />
      </Stack>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
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
                  Aba <b>{tab === 0 ? 'Notas pendentes de conferência' : 'Separadores (getSeparadores)'}</b>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
                    else fetchSeparadores();
                  }}
                >
                  Atualizar
                </Button>
              </Box>
            </Box>

            <Tabs value={tab} onChange={handleChangeTab} sx={{ mb: 2 }}>
              <Tab label="Pedidos (notas pendentes)" />
              <Tab label="Separadores (getSeparadores)" />
            </Tabs>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label={tab === 0 ? 'Pesquisar (NUNOTA/STATUSCONFERENCIA)' : 'Pesquisar (e-mail)'}
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
                <Typography sx={{ color: 'text.secondary' }}>Nenhuma nota pendente encontrada.</Typography>
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
                    <Table size="small" stickyHeader aria-label="notas-pendentes" sx={{ minWidth: 700 }}>
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
                          <TableCell>NUNOTA</TableCell>
                          <TableCell>Status conferência</TableCell>
                          <TableCell>Detalhes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pageRows.map((row, idx) => {
                          const r = row as NotaPendenteItem;
                          return (
                            <TableRow key={String(r.NUNOTA ?? idx)}>
                              <TableCell>{String(r.NUNOTA ?? '-')}</TableCell>
                              <TableCell>{String(r.STATUSCONFERENCIA ?? '-')}</TableCell>
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
                                  {JSON.stringify(r.raw ?? {}, null, 0)}
                                </pre>
                              </TableCell>
                            </TableRow>
                          );
                        })}
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
              // Conteúdo Separadores
              <>
                {separadoresLoading && separadores.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : separadoresRendered.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>Nenhum separador encontrado.</Typography>
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
                            <TableCell>E-mail</TableCell>
                            <TableCell align="center">Estoque A</TableCell>
                            <TableCell align="center">Estoque B</TableCell>
                            <TableCell align="center">Estoque C</TableCell>
                            <TableCell align="center">Estoque D</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pageRows.map((row, idx) => {
                            const sep = row as SeparadorItem;
                            const email = sep.userEmail ?? '-';

                            return (
                              <TableRow key={String(sep.id ?? idx)}>
                                <TableCell>{email}</TableCell>
                                <TableCell align="center">{renderToggleChips(sep.userEmail, 'A')}</TableCell>
                                <TableCell align="center">{renderToggleChips(sep.userEmail, 'B')}</TableCell>
                                <TableCell align="center">{renderToggleChips(sep.userEmail, 'C')}</TableCell>
                                <TableCell align="center">{renderToggleChips(sep.userEmail, 'D')}</TableCell>
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
