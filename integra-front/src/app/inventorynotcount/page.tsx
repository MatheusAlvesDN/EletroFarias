'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
  Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

type NotFoundItem = {
  id: string;
  localizacao: string;
  codProdFaltando: number[];
  codProdContados: number[];
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

function normalizeLoc(loc?: string | null): string {
  return (loc || 'SEM LOCALIZAÇÃO').toString().toUpperCase();
}

// Ordenação por prefixo e número para formato "A-001"
function getLocSortKey(loc?: string | null): { prefix: string; num: number } {
  const normalized = normalizeLoc(loc);
  if (!normalized.includes('-')) {
    return { prefix: 'ZZZ', num: Number.POSITIVE_INFINITY };
  }
  const [prefixRaw, numRaw] = normalized.split('-');
  const prefix = (prefixRaw || '').trim() || 'ZZZ';
  const numParsed = Number((numRaw || '').replace(/\D+/g, ''));
  const num = Number.isFinite(numParsed) ? numParsed : Number.POSITIVE_INFINITY;
  return { prefix, num };
}

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [list, setList] = useState<NotFoundItem[]>([]);
  const [filter, setFilter] = useState<string>('');

  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const NOTFOUND_LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/notFoundList` : `/sync/notFoundList`),
    [API_BASE]
  );

  const NOTFOUND_SYNC_FULL_URL = useMemo(
    () =>
      API_BASE ? `${API_BASE}/sync/notFoundListFull` : `/sync/notFoundListFull`,
    [API_BASE]
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    []
  );

  // auth
  useEffect(() => {
    const t =
      typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t && !API_TOKEN) {
      router.replace('/');
      return;
    }
    setToken(t ?? null);
  }, [router, API_TOKEN]);

  // Carrega a lista e mantém apenas as localizações que têm produtos contados
  const fetchList = useCallback(async () => {
    const canFetch = !!token || !!API_TOKEN;
    if (!canFetch) return;

    setErro(null);
    setOkMsg(null);
    setLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(NOTFOUND_LIST_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao carregar (status ${resp.status})`);
      }

      const data = (await resp.json()) as NotFoundItem[] | null;
      const arr = Array.isArray(data) ? data : [];

      // normalize + filtra onde codProdContados > 0
      const normalized: NotFoundItem[] = arr
        .map((n) => ({
          ...n,
          localizacao: normalizeLoc(n.localizacao),
          codProdFaltando: n.codProdFaltando ?? [],
          codProdContados: n.codProdContados ?? [],
        }))
        .filter((n) => (n.codProdContados?.length ?? 0) > 0);

      // ordena por prefixo + número (A-001, A-002, A-010, B-001...)
      normalized.sort((a, b) => {
        const ka = getLocSortKey(a.localizacao);
        const kb = getLocSortKey(b.localizacao);
        if (ka.prefix !== kb.prefix) {
          return ka.prefix.localeCompare(kb.prefix, 'pt-BR');
        }
        return ka.num - kb.num;
      });

      setList(normalized);
      setOkMsg(`Encontradas ${normalized.length} localizações com produtos contados.`);
      setSnackbarOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar lista.';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [token, API_TOKEN, NOTFOUND_LIST_URL]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filtered = useMemo(() => {
    const f = filter.trim().toUpperCase();
    if (!f) return list;
    return list.filter((n) => n.localizacao.includes(f));
  }, [filter, list]);

  // CONFERIR: same endpoint to sync then reload
  const handleConferir = useCallback(async () => {
    const canFetch = !!token || !!API_TOKEN;
    if (!canFetch) return;

    setErro(null);
    setOkMsg(null);
    setLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(NOTFOUND_SYNC_FULL_URL, { method: 'POST', headers });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao sincronizar (status ${resp.status})`);
      }

      await fetchList();
      setOkMsg('CONFERÊNCIA concluída e lista atualizada.');
      setSnackbarOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao conferir.';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [token, API_TOKEN, NOTFOUND_SYNC_FULL_URL, fetchList]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Floating sidebar button */}
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
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                mb: 2,
                gap: 2,
              }}
            >
              <Typography variant="h6" sx={SECTION_TITLE_SX}>
                Localizações com produtos contados
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="outlined" onClick={fetchList} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : 'Atualizar'}
                </Button>

                <Button variant="contained" color="error" onClick={handleConferir} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : 'CONFERIR'}
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="Filtrar localização"
                value={filter}
                onChange={(e) => setFilter(e.target.value.toUpperCase())}
                size="small"
                fullWidth
              />
            </Box>

            {erro && <Typography color="error" sx={{ mb: 1 }}>{erro}</Typography>}
            {okMsg && <Typography color="success.main" sx={{ mb: 1 }}>{okMsg}</Typography>}

            <Divider sx={{ my: 2 }} />

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Localizações com produtos contados: <b>{list.length}</b>
                </Typography>

                {filtered.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>Nenhuma localização encontrada com o filtro atual.</Typography>
                ) : (
                  <TableContainer component={Paper} elevation={0} sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 2, overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', backgroundColor: 'background.paper', maxWidth: '100%' }}>
                    <Table size="small" stickyHeader aria-label="localizacoes-contados" sx={{ minWidth: 800 }}>
                      <TableHead>
                        <TableRow sx={{ '& th': { backgroundColor: (t) => t.palette.grey[50], fontWeight: 600, whiteSpace: 'nowrap' } }}>
                          <TableCell>Localização</TableCell>
                          <TableCell align="right">Qtd. produtos contados</TableCell>
                          <TableCell align="right">Qtd. produtos faltando</TableCell>
                          <TableCell>Códigos contados</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filtered.map((nf) => {
                          const loc = nf.localizacao;
                          const qtdContados = nf.codProdContados?.length ?? 0;
                          const qtdFaltando = nf.codProdFaltando?.length ?? 0;
                          const codigosStr = (nf.codProdContados ?? []).map((c) => String(c)).join(', ');

                          return (
                            <TableRow key={nf.id}>
                              <TableCell>{loc}</TableCell>
                              <TableCell align="right">{numberFormatter.format(qtdContados)}</TableCell>
                              <TableCell align="right">{numberFormatter.format(qtdFaltando)}</TableCell>
                              <TableCell>{codigosStr || '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>

      <Snackbar open={snackbarOpen && (!!erro || !!okMsg)} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={erro ? 'error' : 'success'} variant="filled" sx={{ width: '100%' }}>
          {erro || okMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
