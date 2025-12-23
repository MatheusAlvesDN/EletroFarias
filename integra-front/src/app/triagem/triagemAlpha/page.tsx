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

// shape específico para separadores (getSeparadores)
type SeparadorItem = {
  id?: string;
  userEmail?: string | null;
  raw?: unknown;
  [k: string]: unknown;
};

// ✅ retorno do /sync/getNotaSeparacao
type NotaSeparacao = {
  NUNOTA: number;
  CODPARC: number;
  NUMNOTA: number;
  STATUSNOTA: string;
  STATUSCONFERENCIA: string;
};

const ROWS_PER_PAGE = 10;
const POLLING_INTERVAL_MS = 3000;

type EstoqueKey = 'A' | 'B' | 'C' | 'D';
const ESTOQUES: EstoqueKey[] = ['A', 'B', 'C', 'D'];

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
};

const toStringSafe = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  return String(v);
};

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState<number>(0);

  // ✅ Pedidos => notas de separação
  const [notas, setNotas] = useState<NotaSeparacao[]>([]);
  const [notasLoading, setNotasLoading] = useState(false);

  // Separadores
  const [separadores, setSeparadores] = useState<SeparadorItem[]>([]);
  const [separadoresFiltered, setSeparadoresFiltered] = useState<SeparadorItem[]>([]);
  const [separadoresLoading, setSeparadoresLoading] = useState(false);

  // comuns
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(ROWS_PER_PAGE);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarError, setSnackbarError] = useState(false);

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

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

  // ✅ rota nova
  const NOTAS_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getNotaSeparacao` : `/sync/getNotaSeparacao`),
    [API_BASE]
  );

  const GET_SEPARADORES_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getSeparadores` : `/sync/getSeparadores`),
    [API_BASE]
  );

  const GET_ESTOQUE_BY_ID_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getEstoqueById` : `/sync/getEstoqueById`),
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

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // ✅ conforme pedido: “passando apenas o token”
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  // --------------------------
  // Chips: estado + helpers (separadores)
  // --------------------------
  const [estoquesState, setEstoquesState] = useState<Record<string, boolean>>({});
  const [chipLoading, setChipLoading] = useState<Record<string, boolean>>({});

  const makeKey = (email: string, estoque: EstoqueKey) => `${email}::${estoque}`;

  const extractEmails = useCallback((raw: unknown): string[] => {
    if (Array.isArray(raw) && raw.every((x) => typeof x === 'string')) {
      return Array.from(new Set(raw.map((s) => s.trim().toLowerCase()).filter(Boolean)));
    }

    const arr: unknown[] = Array.isArray(raw)
      ? raw
      : raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).items)
      ? ((raw as Record<string, unknown>).items as unknown[])
      : [];

    const emails = arr
      .map((t) => {
        const rec = t && typeof t === 'object' ? (t as Record<string, unknown>) : {};
        const email = (rec.userEmail ?? rec.email ?? rec.separador ?? null) as string | null;
        return (email ?? '').trim().toLowerCase();
      })
      .filter(Boolean);

    return Array.from(new Set(emails));
  }, []);

  const fetchActiveByEstoque = useCallback(
    async (region: EstoqueKey): Promise<string[]> => {
      const url = `${GET_ESTOQUE_BY_ID_URL}?region=${encodeURIComponent(region)}`;

      const resp = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `Falha ao buscar ativos do estoque ${region} (status ${resp.status})`);
      }

      const raw = (await resp.json()) as unknown;
      return extractEmails(raw);
    },
    [GET_ESTOQUE_BY_ID_URL, getAuthHeaders, extractEmails]
  );

  const hydrateEstoqueState = useCallback(
    async (seps: SeparadorItem[]) => {
      const allEmails = seps
        .map((s) => String(s.userEmail ?? '').trim().toLowerCase())
        .filter(Boolean);

      const base: Record<string, boolean> = {};
      for (const email of allEmails) {
        for (const est of ESTOQUES) base[makeKey(email, est)] = false;
      }

      const results = await Promise.all(
        ESTOQUES.map(async (est) => {
          const emails = await fetchActiveByEstoque(est);
          return { est, emails };
        })
      );

      for (const r of results) {
        for (const email of r.emails) {
          base[makeKey(email, r.est)] = true;
        }
      }

      setEstoquesState(base);
    },
    [fetchActiveByEstoque]
  );

  const handleToggleEstoque = useCallback(
    async (userEmailRaw: string | null | undefined, estoque: EstoqueKey, toActive: boolean) => {
      const userEmail = String(userEmailRaw ?? '').trim();
      if (!userEmail) return;

      const emailKey = userEmail.toLowerCase();
      const k = makeKey(emailKey, estoque);
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

  const renderToggleChips = (email: string | null | undefined, estoque: EstoqueKey) => {
    const safeEmail = String(email ?? '').trim().toLowerCase();
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

  // --------------------------
  // ✅ NOTAS (polling) - agora GET /sync/getNotaSeparacao
  // --------------------------
  const fetchNotas = useCallback(async () => {
    try {
      setNotasLoading(true);

      const resp = await fetch(NOTAS_URL, {
        method: 'GET',
        headers: getAuthHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `Falha ao buscar notas de separação (status ${resp.status})`);
      }

      const raw = (await resp.json()) as unknown;
      const arr: unknown[] = Array.isArray(raw) ? raw : [];

      const normalized: NotaSeparacao[] = arr
        .map((r: unknown) => {
          const rec = r && typeof r === 'object' ? (r as Record<string, unknown>) : {};
          return {
            NUNOTA: toNumber(rec.NUNOTA),
            CODPARC: toNumber(rec.CODPARC),
            NUMNOTA: toNumber(rec.NUMNOTA),
            STATUSNOTA: toStringSafe(rec.STATUSNOTA),
            STATUSCONFERENCIA: toStringSafe(rec.STATUSCONFERENCIA),
          };
        })
        .filter((n) => Number.isFinite(n.NUNOTA));

      setNotas(normalized);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar notas de separação';
      setSnackbarMsg(msg);
      setSnackbarError(true);
      setSnackbarOpen(true);
    } finally {
      setNotasLoading(false);
    }
  }, [NOTAS_URL, getAuthHeaders]);

  useEffect(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (tab === 0) {
      fetchNotas();
      const id = window.setInterval(() => {
        fetchNotas();
      }, POLLING_INTERVAL_MS);
      pollingRef.current = id;
    }

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [tab, fetchNotas]);

  // --------------------------
  // SEPARADORES
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

      await hydrateEstoqueState(normalized);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar separadores';
      setSnackbarMsg(msg);
      setSnackbarError(true);
      setSnackbarOpen(true);
    } finally {
      setSeparadoresLoading(false);
    }
  }, [GET_SEPARADORES_URL, getAuthHeaders, hydrateEstoqueState]);

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

  const notasRendered = useMemo(() => {
    const q = search.trim().toUpperCase();
    const arr = notas.filter((n) => {
      if (!q) return true;
      return (
        String(n.NUNOTA).includes(q) ||
        String(n.CODPARC).includes(q) ||
        String(n.NUMNOTA).includes(q) ||
        n.STATUSNOTA.toUpperCase().includes(q) ||
        n.STATUSCONFERENCIA.toUpperCase().includes(q)
      );
    });

    return [...arr].sort((a, b) => a.NUNOTA - b.NUNOTA);
  }, [notas, search]);

  const separadoresRendered = useMemo(() => {
    return [...separadoresFiltered].sort((a, b) => {
      const va = String(a.userEmail ?? '').toUpperCase();
      const vb = String(b.userEmail ?? '').toUpperCase();
      return va.localeCompare(vb, 'pt-BR');
    });
  }, [separadoresFiltered]);

  const pageRows = useMemo(() => {
    const source = tab === 0 ? notasRendered : separadoresRendered;
    return source.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [tab, notasRendered, separadoresRendered, page, rowsPerPage]);

  const handleChangeTab = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setPage(0);
  };

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);

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
        <Card sx={{ maxWidth: 1200, mx: 'auto', mt: 6, borderRadius: 2, boxShadow: 0, border: 1, backgroundColor: 'background.paper' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Pedidos / Separadores
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Aba <b>{tab === 0 ? 'Notas de separação' : 'Separadores (estoques A/B/C/D)'}</b>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {tab === 0 && (
                  <Chip
                    label={notasLoading ? 'Atualizando...' : `Última atualização: ${new Date().toLocaleTimeString()}`}
                    color={notasLoading ? 'warning' : 'default'}
                    size="small"
                  />
                )}

                <Button
                  variant="outlined"
                  onClick={() => {
                    if (tab === 0) fetchNotas();
                    else fetchSeparadores();
                  }}
                >
                  Atualizar
                </Button>
              </Box>
            </Box>

            <Tabs value={tab} onChange={handleChangeTab} sx={{ mb: 2 }}>
              <Tab label="Pedidos" />
              <Tab label="Separadores" />
            </Tabs>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label={tab === 0 ? 'Pesquisar (NUNOTA/CODPARC/NUMNOTA/status)' : 'Pesquisar (e-mail)'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                fullWidth
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {tab === 0 ? (
              notasLoading && notas.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                  <CircularProgress />
                </Box>
              ) : notasRendered.length === 0 ? (
                <Typography sx={{ color: 'text.secondary' }}>Nenhuma nota encontrada.</Typography>
              ) : (
                <>
                  <TableContainer component={Paper} elevation={0} sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 2, overflowX: 'auto', backgroundColor: 'background.paper', maxWidth: '100%' }}>
                    <Table size="small" stickyHeader aria-label="notas-separacao" sx={{ minWidth: 900 }}>
                      <TableHead>
                        <TableRow sx={{ '& th': { backgroundColor: (t) => t.palette.grey[50], fontWeight: 600, whiteSpace: 'nowrap' } }}>
                          <TableCell>NUNOTA</TableCell>
                          <TableCell>CODPARC</TableCell>
                          <TableCell>NUMNOTA</TableCell>
                          <TableCell>STATUSNOTA</TableCell>
                          <TableCell>STATUSCONFERENCIA</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pageRows.map((row, idx) => {
                          const n = row as NotaSeparacao;
                          return (
                            <TableRow key={String(n.NUNOTA ?? idx)}>
                              <TableCell>{Number.isFinite(n.NUNOTA) ? n.NUNOTA : '-'}</TableCell>
                              <TableCell>{Number.isFinite(n.CODPARC) ? n.CODPARC : '-'}</TableCell>
                              <TableCell>{Number.isFinite(n.NUMNOTA) ? n.NUMNOTA : '-'}</TableCell>
                              <TableCell>{n.STATUSNOTA || '-'}</TableCell>
                              <TableCell>{n.STATUSCONFERENCIA || '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={notasRendered.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[rowsPerPage]}
                    labelRowsPerPage="Linhas por página"
                  />
                </>
              )
            ) : (
              <>
                {separadoresLoading && separadores.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : separadoresRendered.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>Nenhum separador encontrado.</Typography>
                ) : (
                  <>
                    <TableContainer component={Paper} elevation={0} sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 2, overflowX: 'auto', backgroundColor: 'background.paper', maxWidth: '100%' }}>
                      <Table size="small" stickyHeader aria-label="separadores" sx={{ minWidth: 900 }}>
                        <TableHead>
                          <TableRow sx={{ '& th': { backgroundColor: (t) => t.palette.grey[50], fontWeight: 600, whiteSpace: 'nowrap' } }}>
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

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarError ? 'error' : 'success'} variant="filled" sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
