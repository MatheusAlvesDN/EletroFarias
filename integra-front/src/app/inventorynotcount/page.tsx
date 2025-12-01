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
  contadores: string[]; // e-mails de quem contou naquela localização
};

type ProdutoLoc = {
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

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [locAgg, setLocAgg] = useState<LocAgg[]>([]);
  const [filter, setFilter] = useState<string>('');

  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const INVENTORY_LIST_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/getinventoryList`
        : `/sync/getinventoryList`,
    [API_BASE]
  );

  const PRODUCTS_BY_LOC_URL = useCallback(
    (loc: string) =>
      API_BASE
        ? `${API_BASE}/sync/getProductsByLocation?loc=${encodeURIComponent(loc)}`
        : `/sync/getProductsByLocation?loc=${encodeURIComponent(loc)}`,
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

  // Produtos pendentes cacheados por localização (buscados sob demanda)
  const [pendentesByLoc, setPendentesByLoc] = useState<Record<string, ProdutoLoc[]>>({});
  const [expandedLoc, setExpandedLoc] = useState<string | null>(null);
  const [loadingLoc, setLoadingLoc] = useState<string | null>(null);

  // autenticação: se não tiver token → volta pro login
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t && !API_TOKEN) {
      router.replace('/');
      return;
    }
    setToken(t ?? null);
  }, [router, API_TOKEN]);

  // Carrega APENAS o inventário + agrega por localização (com contadores)
  const fetchInventory = useCallback(async () => {
    const canFetch = !!token || !!API_TOKEN;
    if (!canFetch) return;

    setErro(null);
    setOkMsg(null);
    setLoading(true);
    setPendentesByLoc({});
    setExpandedLoc(null);

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

      // Agrupa por localização + contadores únicos
      type TmpAgg = {
        qtProdutos: number;
        totalCount: number;
        totalInStock: number;
        contadoresSet: Set<string>;
      };

      const map = new Map<string, TmpAgg>();

      for (const item of list) {
        const loc = normalizeLoc(item.localizacao);
        const email = (item.userEmail ?? '').trim();

        const existing = map.get(loc) ?? {
          qtProdutos: 0,
          totalCount: 0,
          totalInStock: 0,
          contadoresSet: new Set<string>(),
        };

        existing.qtProdutos += 1;
        existing.totalCount += Number(item.count ?? 0);
        existing.totalInStock += Number(item.inStock ?? 0);
        if (email) {
          existing.contadoresSet.add(email);
        }

        map.set(loc, existing);
      }

      const aggAll: LocAgg[] = Array.from(map.entries())
        .map(([loc, v]) => ({
          localizacao: loc,
          qtProdutos: v.qtProdutos,
          totalCount: v.totalCount,
          totalInStock: v.totalInStock,
          contadores: Array.from(v.contadoresSet.values()),
        }))
        .sort((a, b) => a.localizacao.localeCompare(b.localizacao, 'pt-BR'));

      setLocAgg(aggAll);

      setOkMsg(`Localizações carregadas: ${aggAll.length}`);
      setSnackbarOpen(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao carregar localizações.';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [token, API_TOKEN, INVENTORY_LIST_URL]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const filteredLocs = useMemo(() => {
    const f = filter.trim().toUpperCase();
    if (!f) return locAgg;
    return locAgg.filter((l) => l.localizacao.includes(f));
  }, [filter, locAgg]);

  // abre/fecha lista retrátil.
  // se ainda não tiver pendentes em cache para essa loc, faz fetch pontual.
  // aqui o "set" de inventário é montado apenas para essa localização (lazy)
  const handleToggleLocation = async (locRaw: string) => {
    const loc = normalizeLoc(locRaw);
    if (!loc) return;

    if (expandedLoc === loc) {
      setExpandedLoc(null);
      return;
    }

    if (!token && !API_TOKEN) {
      setErro('Token de autenticação não encontrado.');
      setSnackbarOpen(true);
      return;
    }

    // já temos pendentes no cache → só expande
    if (pendentesByLoc[loc]) {
      setExpandedLoc(loc);
      return;
    }

    try {
      setLoadingLoc(loc);
      setErro(null);
      setOkMsg(null);
      setSnackbarOpen(false);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const prodResp = await fetch(PRODUCTS_BY_LOC_URL(loc), {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!prodResp.ok) {
        const msg = await prodResp.text();
        throw new Error(
          msg || `Falha ao buscar produtos por localização (status ${prodResp.status})`
        );
      }

      const produtos = (await prodResp.json()) as ProdutoLoc[] | null;
      const listaProdutos = Array.isArray(produtos) ? produtos : [];

      // monta set de codProd apenas dos itens daquela localização
      const inventarioLocSet = new Set<number>();
      for (const inv of inventory) {
        if (normalizeLoc(inv.localizacao) !== loc) continue;
        inventarioLocSet.add(Number(inv.codProd));
      }

      const pendentes = listaProdutos.filter((p) => {
        const codNum = Number(p.CODPROD);
        if (!Number.isFinite(codNum)) return false;
        return !inventarioLocSet.has(codNum);
      });

      setPendentesByLoc((prev) => ({ ...prev, [loc]: pendentes }));
      setExpandedLoc(loc);

      setOkMsg(`Encontrados ${pendentes.length} produtos pendentes na localização "${loc}".`);
      setSnackbarOpen(true);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Erro ao buscar produtos pendentes por localização.';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoadingLoc(null);
    }
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
                Localizações com produtos contados
              </Typography>

              <Button
                variant="outlined"
                onClick={fetchInventory}
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
                  Localizações com inventário: <b>{locAgg.length}</b>
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  Total de produtos contados: <b>{inventory.length}</b>
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
                      aria-label="locacoes-contadas"
                      sx={{
                        minWidth: 800,
                      }}
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
                          <TableCell align="right">Produtos contados</TableCell>
                          <TableCell>Contadores (inventário)</TableCell>
                          <TableCell align="right">Produtos pendentes</TableCell>
                          <TableCell align="center">Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredLocs.map((l) => {
                          const loc = l.localizacao;
                          const isExpanded = expandedLoc === loc;
                          const pendentes = pendentesByLoc[loc] ?? [];
                          const qtdPendentes = pendentes.length;

                          return (
                            <React.Fragment key={loc}>
                              {/* linha principal */}
                              <TableRow>
                                <TableCell>{loc}</TableCell>
                                <TableCell align="right">{l.qtProdutos}</TableCell>
                                <TableCell>
                                  {l.contadores.length > 0
                                    ? l.contadores.join(', ')
                                    : '-'}
                                </TableCell>
                                <TableCell align="right">
                                  {pendentesByLoc[loc]
                                    ? numberFormatter.format(qtdPendentes)
                                    : '-'}
                                </TableCell>
                                <TableCell align="center">
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => handleToggleLocation(loc)}
                                    disabled={loadingLoc === loc}
                                  >
                                    {loadingLoc === loc
                                      ? 'Carregando...'
                                      : isExpanded
                                      ? 'Fechar'
                                      : 'Ver produtos'}
                                  </Button>
                                </TableCell>
                              </TableRow>

                              {/* linha retrátil */}
                              {isExpanded && (
                                <TableRow>
                                  <TableCell colSpan={5} sx={{ p: 0 }}>
                                    <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
                                      {loadingLoc === loc ? (
                                        <Box
                                          sx={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            my: 2,
                                          }}
                                        >
                                          <CircularProgress size={24} />
                                        </Box>
                                      ) : pendentes.length === 0 ? (
                                        <Typography
                                          variant="body2"
                                          sx={{ color: 'text.secondary' }}
                                        >
                                          Nenhum produto pendente de contagem para esta
                                          localização.
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
                                            aria-label={`produtos-pendentes-${loc}`}
                                            sx={{
                                              minWidth: 700,
                                            }}
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
                                                <TableCell>Cód. Produto</TableCell>
                                                <TableCell>Descrição</TableCell>
                                                <TableCell>Localização</TableCell>
                                                <TableCell align="right">
                                                  Estoque
                                                </TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {pendentes.map((p) => (
                                                <TableRow key={String(p.CODPROD)}>
                                                  <TableCell>{p.CODPROD}</TableCell>
                                                  <TableCell>
                                                    {p.DESCRPROD ?? '-'}
                                                  </TableCell>
                                                  <TableCell>
                                                    {p.LOCALIZACAO ?? '-'}
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

