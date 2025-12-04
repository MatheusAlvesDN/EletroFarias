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

type ProdutoInfo = {
  CODPROD: number | string;
  DESCRPROD?: string | null;
  LOCALIZACAO?: string | null;
  ESTOQUE?: number | string | null;
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

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [notFoundList, setNotFoundList] = useState<NotFoundItem[]>([]);
  const [filter, setFilter] = useState<string>('');

  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const NOTFOUND_LIST_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/notFoundList`
        : `/sync/notFoundList`,
    [API_BASE]
  );

  // 👉 endpoint que recebe codProd e retorna info do produto
  const PRODUCT_BY_CODE_URL = useCallback(
    (cod: number | string) =>
      API_BASE
        ? `${API_BASE}/sync/getProductLocation?codProd=${encodeURIComponent(
            String(cod)
          )}`
        : `/sync/getProductLocation?codProd=${encodeURIComponent(String(cod))}`,
    [API_BASE]
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      }),
    []
  );

  const formatEstoque = (v: number | string | null | undefined) => {
    if (v == null) return '-';
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return numberFormatter.format(n);
  };

  // produtos faltando por localização (detalhes vindos do getProductLocation)
  const [faltandoByLoc, setFaltandoByLoc] = useState<Record<string, ProdutoInfo[]>>({});
  const [expandedLoc, setExpandedLoc] = useState<string | null>(null);

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

  // Carrega notFound + resolve produtos faltando (codProdFaltando → getProductLocation)
  const fetchNotFoundAndProducts = useCallback(async () => {
    const canFetch = !!token || !!API_TOKEN;
    if (!canFetch) return;

    setErro(null);
    setOkMsg(null);
    setLoading(true);
    setFaltandoByLoc({});
    setExpandedLoc(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      // 1) Carrega notFoundList
      const resp = await fetch(NOTFOUND_LIST_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(
          msg || `Falha ao carregar NotFound (status ${resp.status})`
        );
      }

      const data = (await resp.json()) as NotFoundItem[] | null;
      const list = Array.isArray(data) ? data : [];

      // normaliza localização e ordena
      const normalizedList: NotFoundItem[] = list.map((n) => ({
        ...n,
        localizacao: normalizeLoc(n.localizacao),
      }));

      normalizedList.sort((a, b) =>
        a.localizacao.localeCompare(b.localizacao, 'pt-BR')
      );

      setNotFoundList(normalizedList);

      // 2) Para cada localização, buscar info de cada codProdFaltando via getProductLocation
      const faltandoMap: Record<string, ProdutoInfo[]> = {};

      const CONCURRENCY = 5;
      for (let i = 0; i < normalizedList.length; i += CONCURRENCY) {
        const slice = normalizedList.slice(i, i + CONCURRENCY);

        await Promise.all(
          slice.map(async (nf) => {
            const loc = nf.localizacao;
            const codigos = nf.codProdFaltando ?? [];
            if (codigos.length === 0) {
              faltandoMap[loc] = [];
              return;
            }

            // evita codigos duplicados
            const uniqueCodes = Array.from(new Set(codigos));

            const produtosLoc: ProdutoInfo[] = [];

            await Promise.all(
              uniqueCodes.map(async (cod) => {
                try {
                  const respProd = await fetch(PRODUCT_BY_CODE_URL(cod), {
                    method: 'GET',
                    headers,
                    cache: 'no-store',
                  });

                  if (!respProd.ok) return;

                  const raw = await respProd.json();

                  // backend pode devolver um produto ou uma lista; tentamos ser resilientes
                  if (Array.isArray(raw)) {
                    raw.forEach((p) => {
                      if (!p) return;
                      produtosLoc.push({
                        CODPROD: p.CODPROD ?? cod,
                        DESCRPROD: p.DESCRPROD ?? p.descrprod ?? null,
                        LOCALIZACAO: p.LOCALIZACAO ?? p.localizacao ?? loc,
                        ESTOQUE: p.ESTOQUE ?? p.estoque ?? null,
                      });
                    });
                  } else if (raw) {
                    produtosLoc.push({
                      CODPROD: raw.CODPROD ?? cod,
                      DESCRPROD: raw.DESCRPROD ?? raw.descrprod ?? null,
                      LOCALIZACAO: raw.LOCALIZACAO ?? raw.localizacao ?? loc,
                      ESTOQUE: raw.ESTOQUE ?? raw.estoque ?? null,
                    });
                  }
                } catch {
                  // se falhar pra um código, só ignora aquele produto
                }
              })
            );

            faltandoMap[loc] = produtosLoc;
          })
        );
      }

      setFaltandoByLoc(faltandoMap);
      setOkMsg(
        `Carregadas ${normalizedList.length} localizações e produtos faltando.`
      );
      setSnackbarOpen(true);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao carregar localizações e produtos faltando.';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [token, API_TOKEN, NOTFOUND_LIST_URL, PRODUCT_BY_CODE_URL]);

  useEffect(() => {
    fetchNotFoundAndProducts();
  }, [fetchNotFoundAndProducts]);

  const filteredLocs = useMemo(() => {
    const f = filter.trim().toUpperCase();
    if (!f) return notFoundList;
    return notFoundList.filter((n) => n.localizacao.includes(f));
  }, [filter, notFoundList]);

  const handleToggleLocation = (locRaw: string) => {
    const loc = normalizeLoc(locRaw);
    if (!loc) return;
    if (expandedLoc === loc) setExpandedLoc(null);
    else setExpandedLoc(loc);
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
            {/* Título + botão Atualizar */}
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
                Produtos faltando por localização (NotFound + getProductLocation)
              </Typography>

              <Button
                variant="outlined"
                onClick={fetchNotFoundAndProducts}
                disabled={loading}
              >
                {loading ? <CircularProgress size={18} /> : 'Atualizar'}
              </Button>
            </Box>

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
                  Localizações cadastradas em NotFound:{' '}
                  <b>{notFoundList.length}</b>
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
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      WebkitOverflowScrolling: 'touch',
                      backgroundColor: 'background.paper',
                      maxWidth: '100%',
                    }}
                  >
                    <Table
                      size="small"
                      stickyHeader
                      aria-label="localizacoes-notfound"
                      sx={{ minWidth: 800 }}
                    >
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
                          <TableCell align="right">
                            Qtd. produtos faltando
                          </TableCell>
                          <TableCell align="right">
                            Qtd. produtos contados
                          </TableCell>
                          <TableCell align="center">Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredLocs.map((nf) => {
                          const loc = nf.localizacao;
                          const isExpanded = expandedLoc === loc;
                          const faltando = faltandoByLoc[loc] ?? [];
                          const qtdFaltando =
                            nf.codProdFaltando?.length ?? faltando.length ?? 0;
                          const qtdContados = nf.codProdContados?.length ?? 0;

                          return (
                            <React.Fragment key={nf.id}>
                              {/* linha principal */}
                              <TableRow>
                                <TableCell>{loc}</TableCell>
                                <TableCell align="right">
                                  {numberFormatter.format(qtdFaltando)}
                                </TableCell>
                                <TableCell align="right">
                                  {numberFormatter.format(qtdContados)}
                                </TableCell>
                                <TableCell align="center">
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => handleToggleLocation(loc)}
                                    disabled={qtdFaltando === 0}
                                  >
                                    {isExpanded ? 'Fechar' : 'Ver produtos'}
                                  </Button>
                                </TableCell>
                              </TableRow>

                              {/* linha retrátil com produtos faltando */}
                              {isExpanded && (
                                <TableRow>
                                  <TableCell colSpan={4} sx={{ p: 0 }}>
                                    <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
                                      {faltando.length === 0 ? (
                                        <Typography
                                          variant="body2"
                                          sx={{ color: 'text.secondary' }}
                                        >
                                          Nenhum produto faltando encontrado
                                          para esta localização (pode ser que a
                                          lista ainda não tenha sido
                                          carregada/atualizada).
                                        </Typography>
                                      ) : (
                                        <TableContainer
                                          component={Paper}
                                          elevation={0}
                                          sx={{
                                            border: (t) =>
                                              `1px solid ${t.palette.divider}`,
                                            borderRadius: 2,
                                            overflowX: 'auto',
                                            overflowY: 'hidden',
                                            WebkitOverflowScrolling: 'touch',
                                            backgroundColor: 'background.paper',
                                            maxWidth: '100%',
                                          }}
                                        >
                                          <Table
                                            size="small"
                                            aria-label={`produtos-faltando-${loc}`}
                                            sx={{ minWidth: 700 }}
                                          >
                                            <TableHead>
                                              <TableRow
                                                sx={{
                                                  '& th': {
                                                    backgroundColor: (t) =>
                                                      t.palette.grey[100],
                                                    fontWeight: 600,
                                                    whiteSpace: 'nowrap',
                                                  },
                                                }}
                                              >
                                                <TableCell>
                                                  Cód. Produto
                                                </TableCell>
                                                <TableCell>
                                                  Descrição
                                                </TableCell>
                                                <TableCell>
                                                  Localização
                                                </TableCell>
                                                <TableCell align="right">
                                                  Estoque
                                                </TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {faltando.map((p) => (
                                                <TableRow
                                                  key={String(p.CODPROD)}
                                                >
                                                  <TableCell>
                                                    {p.CODPROD}
                                                  </TableCell>
                                                  <TableCell>
                                                    {p.DESCRPROD ?? '-'}
                                                  </TableCell>
                                                  <TableCell>
                                                    {p.LOCALIZACAO ?? loc}
                                                  </TableCell>
                                                  <TableCell align="right">
                                                    {formatEstoque(p.ESTOQUE)}
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </TableContainer>
                                      )}
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
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
