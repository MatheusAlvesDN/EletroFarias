'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Typography,
  Button,
  Snackbar,
  Alert,
  TextField,
  TablePagination,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRequireAuth } from '@/hooks/useRequireAuth';

type CurvaProduto = {
  codProd: number;
  curvaProduto: string; // A/B/C/D
  updatedAt: string;
  createdAt: string;
};

const rowsPerPage = 15;

function toStringSafe(v: unknown) {
  return v == null ? '' : String(v);
}
function toNumSafe(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function normalizeCurva(raw: unknown): CurvaProduto | null {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const codProd = toNumSafe(r.codProd ?? r.CODPROD ?? r.cod_prod ?? r.id);
  const curvaProduto = toStringSafe(r.curvaProduto ?? r.CURVAPRODUTO ?? r.curva_produto ?? r.curva ?? '').trim();
  const updatedAt = toStringSafe(r.updatedAt ?? r.UPDATEDAT ?? r.updated_at ?? '').trim();
  const createdAt = toStringSafe(r.createdAt ?? r.CREATEDAT ?? r.created_at ?? '').trim();

  if (codProd == null) return null;
  if (!curvaProduto) return null;

  return {
    codProd,
    curvaProduto,
    updatedAt: updatedAt || '-',
    createdAt: createdAt || '-',
  };
}

export default function CurvasPage() {
  const { token, ready, hasAccess } = useRequireAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<CurvaProduto[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [erro, setErro] = useState<string | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const [filterCod, setFilterCod] = useState('');
  const [filterCurva, setFilterCurva] = useState<'ALL' | 'A' | 'B' | 'C' | 'D'>('ALL');

  const [page, setPage] = useState(0);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const GET_CURVAS_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getCurvas` : `/sync/getCurvas`), [API_BASE]);
  const SYNC_CURVAS_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/synccurvaProduto` : `/sync/synccurvaProduto`),
    [API_BASE]
  );

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const toast = useCallback((msg: string, severity: 'success' | 'error') => {
    setSnackbarMsg(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const fetchCurvas = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const resp = await fetch(GET_CURVAS_URL, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao buscar curvas (status ${resp.status})`);
      }

      const raw = (await resp.json()) as unknown;

      const arr: unknown[] = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { data?: unknown[] } | null)?.data)
          ? ((raw as { data: unknown[] }).data as unknown[])
          : Array.isArray((raw as { curvas?: unknown[] } | null)?.curvas)
            ? ((raw as { curvas: unknown[] }).curvas as unknown[])
            : [];

      const normalized: CurvaProduto[] = [];
      for (const r of arr) {
        const n = normalizeCurva(r);
        if (n) normalized.push(n);
      }

      // mais recentes primeiro (updatedAt)
      normalized.sort((a, b) => {
        const ta = a.updatedAt && a.updatedAt !== '-' ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt && b.updatedAt !== '-' ? new Date(b.updatedAt).getTime() : 0;
        return tb - ta;
      });

      setItems(normalized);
      setPage(0);
      toast('Curvas carregadas', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar curvas';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [GET_CURVAS_URL, getHeaders, toast]);

  const syncCurvas = useCallback(async () => {
    try {
      setSyncing(true);
      setErro(null);

      const resp = await fetch(SYNC_CURVAS_URL, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao sincronizar curvas (status ${resp.status})`);
      }

      toast('Sincronização disparada com sucesso!', 'success');

      // após sync, recarrega lista
      await fetchCurvas();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao sincronizar curvas';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setSyncing(false);
    }
  }, [SYNC_CURVAS_URL, getHeaders, fetchCurvas, toast]);

  useEffect(() => {
    if (!ready || !hasAccess) return;
    if (token || API_TOKEN) void fetchCurvas();
  }, [API_TOKEN, fetchCurvas, hasAccess, ready, token]);

  const filtered = useMemo(() => {
    const cod = filterCod.trim();
    const curva = filterCurva;

    return items.filter((it) => {
      if (cod && String(it.codProd) !== cod) return false;
      if (curva !== 'ALL' && it.curvaProduto.toUpperCase() !== curva) return false;
      return true;
    });
  }, [items, filterCod, filterCurva]);

  const pageRows = useMemo(() => {
    return filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filtered, page]);

  const CARD_SX = {
    maxWidth: 1200,
    mx: 'auto',
    mt: 6,
    borderRadius: 2,
    boxShadow: 0,
    border: 1,
    backgroundColor: 'background.paper',
  } as const;

  if (!ready || !hasAccess) return null;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Floating button: sidebar */}
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
        <IconButton type="button" onClick={() => setSidebarOpen((v) => !v)} aria-label="menu" size="large">
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
            {/* Header */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 2,
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Curvas de Produto
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lista retornada por <b>GET /sync/getCurvas</b>.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  type="button"
                  variant="contained"
                  onClick={() => void syncCurvas()}
                  disabled={syncing || loading}
                  sx={{
                    textTransform: 'none',
                    backgroundColor: '#d32f2f',
                    '&:hover': { backgroundColor: '#b71c1c' },
                  }}
                >
                  {syncing ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Sincronizar curvas'}
                </Button>

                <Button type="button" variant="outlined" onClick={() => void fetchCurvas()} disabled={loading || syncing}>
                  {loading ? <CircularProgress size={18} /> : 'Atualizar lista'}
                </Button>
              </Box>
            </Box>

            {/* Filtros */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 220px' },
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                label="Filtrar por CODPROD (exato)"
                value={filterCod}
                onChange={(e) => {
                  setFilterCod(e.target.value);
                  setPage(0);
                }}
                size="small"
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
              />

              <TextField
                label="Curva"
                value={filterCurva}
                onChange={(e) => {
                  setFilterCurva(e.target.value as 'ALL' | 'A' | 'B' | 'C' | 'D');
                  setPage(0);
                }}
                size="small"
                select
                SelectProps={{ native: true }}
              >
                <option value="ALL">Todas</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </TextField>
            </Box>

            {erro && (
              <Typography color="error" sx={{ mb: 2 }}>
                {erro}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Tabela */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                <CircularProgress />
              </Box>
            ) : filtered.length === 0 ? (
              <Typography sx={{ color: 'text.secondary' }}>Nenhuma curva encontrada para os filtros atuais.</Typography>
            ) : (
              <>
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    border: (t) => `1px solid ${t.palette.divider}`,
                    borderRadius: 2,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    backgroundColor: 'background.paper',
                    maxWidth: '100%',
                  }}
                >
                  <Table size="small" stickyHeader aria-label="curvas" sx={{ minWidth: 800 }}>
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
                        <TableCell>CODPROD</TableCell>
                        <TableCell>Curva</TableCell>
                        <TableCell>UpdatedAt</TableCell>
                        <TableCell>CreatedAt</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {pageRows.map((it) => (
                        <TableRow key={String(it.codProd)} sx={{ '&:hover': { backgroundColor: 'rgba(0,0,0,0.03)' } }}>
                          <TableCell>{it.codProd}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{it.curvaProduto}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{it.updatedAt}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{it.createdAt}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={filtered.length}
                  page={page}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  rowsPerPageOptions={[rowsPerPage]}
                  labelRowsPerPage="Linhas por página"
                />
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3500}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} variant="filled" sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
