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
  TablePagination,
  Tabs,
  Tab,
  Chip,
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

function parseLocNumber(loc: string): number | null {
  const m = loc.match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function getStockTab(loc: string): 'A' | 'B' | 'C' | 'D' | 'E' | 'SEM LOCALIZAÇÃO' {
  const l = normalizeLoc(loc);
  const first = l[0];
  if (first === 'A' || first === 'B' || first === 'C' || first === 'D' || first === 'E') return first;
  return 'SEM LOCALIZAÇÃO';
}

const TAB_ORDER: Array<'A' | 'B' | 'C' | 'D' | 'E' | 'SEM LOCALIZAÇÃO'> = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'SEM LOCALIZAÇÃO',
];

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [notFoundList, setNotFoundList] = useState<NotFoundItem[]>([]);
  const [filter, setFilter] = useState<string>('');

  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const [selectedLoc, setSelectedLoc] = useState<NotFoundItem | null>(null);

  const [countInputs, setCountInputs] = useState<Record<number, string>>({});
  const [sendingCod, setSendingCod] = useState<number | null>(null);

  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  const [activeTab, setActiveTab] = useState<(typeof TAB_ORDER)[number]>('A');

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const NOTFOUND_LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/notFoundList` : `/sync/notFoundList`),
    [API_BASE]
  );

  const NOTFOUND_SYNC_FULL_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/notFoundListFull` : `/sync/notFoundListFull`),
    [API_BASE]
  );

  const ADD_COUNT2_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/addCount2` : `/sync/addCount2`), [API_BASE]);

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    []
  );

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t && !API_TOKEN) {
      router.replace('/');
      return;
    }
    setToken(t ?? null);
  }, [router, API_TOKEN]);

  const buildHeaders = useCallback(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  // ✅ FIX: remove selectedLoc das dependências para não refazer fetch ao clicar "Exibir"
  const fetchNotFound = useCallback(async () => {
    const canFetch = !!token || !!API_TOKEN;
    if (!canFetch) return;

    setErro(null);
    setOkMsg(null);
    setLoading(true);

    try {
      const resp = await fetch(NOTFOUND_LIST_URL, {
        method: 'GET',
        headers: buildHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao carregar NotFound (status ${resp.status})`);
      }

      const data = (await resp.json()) as NotFoundItem[] | null;
      const list = Array.isArray(data) ? data : [];

      const normalizedList: NotFoundItem[] = list
        .map((n) => ({
          ...n,
          localizacao: normalizeLoc(n.localizacao),
          codProdFaltando: n.codProdFaltando ?? [],
          codProdContados: n.codProdContados ?? [],
        }))
        .filter((n) => (n.codProdFaltando?.length ?? 0) > 0);

      normalizedList.sort((a, b) => {
        const an = parseLocNumber(a.localizacao);
        const bn = parseLocNumber(b.localizacao);

        if (an == null && bn == null) return a.localizacao.localeCompare(b.localizacao, 'pt-BR');
        if (an == null) return 1;
        if (bn == null) return -1;

        if (an !== bn) return an - bn;
        return a.localizacao.localeCompare(b.localizacao, 'pt-BR');
      });

      setNotFoundList(normalizedList);
      setPage(0);

      // ✅ valida selectedLoc sem depender dele no useCallback
      setSelectedLoc((prev) => {
        if (!prev) return null;
        const stillExists = normalizedList.some((n) => n.id === prev.id);
        if (!stillExists) {
          setCountInputs({});
          return null;
        }
        return prev;
      });

      setOkMsg(`Encontradas ${normalizedList.length} localizações com produtos faltando.`);
      setSnackbarOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar NotFound.';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [token, API_TOKEN, NOTFOUND_LIST_URL, buildHeaders]);

  useEffect(() => {
    fetchNotFound();
  }, [fetchNotFound]);

  const tabCounts = useMemo(() => {
    const counts: Record<(typeof TAB_ORDER)[number], number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
      'SEM LOCALIZAÇÃO': 0,
    };

    for (const n of notFoundList) counts[getStockTab(n.localizacao)] += 1;
    return counts;
  }, [notFoundList]);

  const filteredLocs = useMemo(() => {
    const f = filter.trim().toUpperCase();
    return notFoundList.filter((n) => {
      if (getStockTab(n.localizacao) !== activeTab) return false;
      if (!f) return true;
      return n.localizacao.includes(f);
    });
  }, [filter, notFoundList, activeTab]);

  const pagedLocs = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredLocs.slice(start, start + rowsPerPage);
  }, [filteredLocs, page]);

  useEffect(() => {
    setPage(0);
    if (selectedLoc) {
      const stillExists = filteredLocs.some((x) => x.id === selectedLoc.id);
      if (!stillExists) {
        setSelectedLoc(null);
        setCountInputs({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, activeTab]);

  const handleConferir = useCallback(async () => {
    const canFetch = !!token || !!API_TOKEN;
    if (!canFetch) return;

    setErro(null);
    setOkMsg(null);
    setLoading(true);

    try {
      const resp = await fetch(NOTFOUND_SYNC_FULL_URL, {
        method: 'POST',
        headers: buildHeaders(),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao sincronizar NotFound (status ${resp.status})`);
      }

      await fetchNotFound();

      setOkMsg('CONFERÊNCIA concluída e NotFound atualizado.');
      setSnackbarOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao executar CONFERIR em NotFound.';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [token, API_TOKEN, NOTFOUND_SYNC_FULL_URL, fetchNotFound, buildHeaders]);

  // ✅ Exibir/Fechar (agora com MUI Button)
  const toggleExibir = useCallback((nf: NotFoundItem) => {
    setSelectedLoc((prev) => (prev && prev.id === nf.id ? null : nf));
    setCountInputs({});
  }, []);

  const handleChangeCountInput = (cod: number, value: string) => {
    setCountInputs((prev) => ({ ...prev, [cod]: value }));
  };

  const handleContar = async (codProd: number) => {
    if (!selectedLoc) return;

    const raw = countInputs[codProd];
    const contagem = Number(raw);

    if (!raw || Number.isNaN(contagem)) {
      setErro('Informe uma quantidade numérica válida.');
      setSnackbarOpen(true);
      return;
    }

    const canFetch = !!token || !!API_TOKEN;
    if (!canFetch) return;

    setSendingCod(codProd);
    setErro(null);
    setOkMsg(null);

    try {
      const body = {
        codProd,
        contagem,
        descricao: '',
        localizacao: selectedLoc.localizacao,
        reservado: 0,
      };

      const resp = await fetch(ADD_COUNT2_URL, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao registrar contagem (status ${resp.status})`);
      }

      setOkMsg(`Contagem registrada para o produto ${codProd} na localização ${selectedLoc.localizacao}.`);
      setSnackbarOpen(true);

      setCountInputs((prev) => {
        const next = { ...prev };
        delete next[codProd];
        return next;
      });

      await fetchNotFound();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar contagem.';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setSendingCod(null);
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);

    if (selectedLoc) {
      const start = newPage * rowsPerPage;
      const end = start + rowsPerPage;
      const idsDaPagina = new Set(filteredLocs.slice(start, end).map((x) => x.id));
      if (!idsDaPagina.has(selectedLoc.id)) {
        setSelectedLoc(null);
        setCountInputs({});
      }
    }
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
          {/* ✅ trava submit/reload mesmo se existir <form> acima */}
          <CardContent
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            sx={{ p: { xs: 2, sm: 3 } }}
          >
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
                Produtos faltando por localização (NotFound)
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button type="button" variant="outlined" onClick={fetchNotFound} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : 'Atualizar'}
                </Button>

                <Button type="button" variant="contained" color="error" onClick={handleConferir} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : 'CONFERIR'}
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
                {TAB_ORDER.map((t) => (
                  <Tab
                    key={t}
                    value={t}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{t}</span>
                        <Chip size="small" label={tabCounts[t] ?? 0} />
                      </Box>
                    }
                  />
                ))}
              </Tabs>
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
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Aba atual: <b>{activeTab}</b> • Localizações com produtos faltando: <b>{filteredLocs.length}</b>
                </Typography>

                {filteredLocs.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>Nenhuma localização encontrada.</Typography>
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
                        WebkitOverflowScrolling: 'touch',
                        backgroundColor: 'background.paper',
                        maxWidth: '100%',
                      }}
                    >
                      <Table size="small" stickyHeader aria-label="localizacoes-notfound" sx={{ minWidth: 800 }}>
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
                            <TableCell align="right">Qtd. produtos faltando</TableCell>
                            <TableCell align="center">Produtos faltando</TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {pagedLocs.map((nf) => {
                            const qtd = nf.codProdFaltando?.length ?? 0;
                            const isOpen = !!selectedLoc && selectedLoc.id === nf.id;

                            return (
                              <TableRow
                                key={nf.id}
                                sx={{
                                  backgroundColor: isOpen ? 'rgba(25, 118, 210, 0.06)' : 'inherit',
                                }}
                              >
                                <TableCell>{nf.localizacao}</TableCell>
                                <TableCell align="right">{numberFormatter.format(qtd)}</TableCell>
                                <TableCell align="center">
                                  <Button
                                    type="button"
                                    size="small"
                                    variant={isOpen ? 'contained' : 'outlined'}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleExibir(nf);
                                    }}
                                    sx={{ textTransform: 'none', minWidth: 92 }}
                                  >
                                    {isOpen ? 'Fechar' : 'Exibir'}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <TablePagination
                      component="div"
                      count={filteredLocs.length}
                      page={page}
                      onPageChange={handleChangePage}
                      rowsPerPage={rowsPerPage}
                      rowsPerPageOptions={[rowsPerPage]}
                      labelRowsPerPage="Linhas por página"
                    />

                    {selectedLoc && (
                      <Box
                        sx={{
                          mt: 3,
                          p: 2,
                          borderRadius: 2,
                          border: (t) => `1px solid ${t.palette.primary.light}`,
                          backgroundColor: (t) =>
                            t.palette.mode === 'light' ? 'rgba(25,118,210,0.03)' : 'rgba(25,118,210,0.12)',
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                          Produtos faltando na localização:{' '}
                          <span style={{ fontWeight: 700 }}>{selectedLoc.localizacao}</span>
                        </Typography>

                        <TableContainer
                          component={Paper}
                          elevation={0}
                          sx={{
                            border: (t) => `1px solid ${t.palette.divider}`,
                            borderRadius: 2,
                            overflowX: 'auto',
                            maxWidth: '100%',
                          }}
                        >
                          <Table size="small" aria-label="produtos-faltando" sx={{ minWidth: 400 }}>
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
                                <TableCell>Qtd. contada</TableCell>
                                <TableCell align="center">Ação</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedLoc.codProdFaltando.map((cod) => (
                                <TableRow key={cod}>
                                  <TableCell>{cod}</TableCell>
                                  <TableCell>
                                    <TextField
                                      size="small"
                                      type="number"
                                      inputProps={{ min: 0 }}
                                      value={countInputs[cod] ?? ''}
                                      onChange={(e) => handleChangeCountInput(cod, e.target.value)}
                                      placeholder="Quantidade"
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Button
                                      type="button"
                                      size="small"
                                      variant="contained"
                                      disabled={sendingCod === cod}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        void handleContar(cod);
                                      }}
                                    >
                                      {sendingCod === cod ? <CircularProgress size={16} /> : 'Contar'}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}
                  </>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>

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
