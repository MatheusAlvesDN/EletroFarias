'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { usePersistedState } from '@/hooks/userPersistedState';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { parseLocationNumber } from '@/utils/location';

type InventoryItem = {
  id: string;
  codProd: number;
  count: number;
  inStock: number;
  inplantedDate: string | null;
  createdAt: string;
  descricao?: string | null;
  userEmail?: string | null;
  localizacao: string | null;
  recontagem?: boolean | null;

  // ✅ produto (GET /sync/getProduct)
  ad_localizacao?: string | null;
};

const rowsPerPage = 10;

// ✅ AGORA a regra é: mostrar somente quem tem pelo menos 1 registro PRIMAL
const PRIMAL_DATE = '1987-11-23T14:01:48.190Z';

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
  roles?: string[];
  exp?: number;
  iat?: number;
};

function decodeJwt(token: string | null): JwtPayload | null {
  if (!token || typeof window === 'undefined') return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';

    const json = window.atob(base64);
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === 'object') return parsed as JwtPayload;

    return null;
  } catch {
    return null;
  }
}

function decodeJwtEmail(token: string | null) {
  const jwtEmail = decodeJwt(token);
  return jwtEmail?.email;
}

type OrderBy = 'location' | 'numCounts';

type LocTab = 'A' | 'B' | 'C' | 'D' | 'E' | 'SEM';

function getLocTab(localizacao: string | null): LocTab {
  const loc = String(localizacao ?? '').trim().toUpperCase();
  const first = loc.charAt(0);
  if (first === 'A' || first === 'B' || first === 'C' || first === 'D' || first === 'E') {
    return first as LocTab;
  }
  return 'SEM';
}

const Page: React.FC = () => {
  const { token, ready, hasAccess } = useRequireAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [filterCodProd, setFilterCodProd] = usePersistedState<string>(
    'inventory:recontagem:filterCodProd',
    ''
  );

  const [activeTab, setActiveTab] = usePersistedState<LocTab>(
    'inventory:recontagem:activeTab',
    'A'
  );

  const [page, setPage] = useState(0);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const [countsByCodProd, setCountsByCodProd] = useState<Record<string, number>>({});
  const [recountedIds, setRecountedIds] = useState<Record<string, boolean>>({});

  const [orderBy, setOrderBy] = useState<OrderBy>('location');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getinventoryList` : `/sync/getinventoryList`),
    [API_BASE]
  );

  const ADDNEWCOUNT_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/addNewCount` : `/sync/addNewCount`),
    [API_BASE]
  );

  // ✅ GET product
  const GET_PRODUCT_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getProduct` : `/sync/getProduct`),
    [API_BASE]
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [countById, setCountById] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // ✅ cache: codProd -> produto (localizacao/ad_localizacao)
  const [productByCod, setProductByCod] = useState<
    Record<string, { localizacao?: string | null; AD_localizacao?: string | null; ad_localizacao?: string | null }>
  >({});

  // ✅ FIX: hook NÃO pode ficar depois de early return
  const tabCounts = useMemo(() => {
    const base: Record<LocTab, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, SEM: 0 };
    for (const it of items) base[getLocTab(it.localizacao)] += 1;
    return base;
  }, [items]);

  const fetchProduct = useCallback(
    async (codProd: number) => {
      const key = String(codProd);
      if (productByCod[key]) return productByCod[key];

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

        // backend usa @Query('id')
        const url = `${GET_PRODUCT_URL}?id=${encodeURIComponent(String(codProd))}`;

        const resp = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha ao buscar produto (status ${resp.status})`);
        }

        const raw = (await resp.json()) as any;

        const prod = {
          localizacao: raw?.localizacao ?? raw?.LOCALIZACAO ?? null,
          AD_localizacao: raw?.AD_localizacao ?? raw?.ad_localizacao ?? raw?.AD_LOCALIZACAO ?? null,
          ad_localizacao: raw?.ad_localizacao ?? raw?.AD_localizacao ?? null,
        };

        setProductByCod((prev) => ({ ...prev, [key]: prod }));
        return prod;
      } catch (e) {
        // salva vazio pra não ficar martelando
        const prod = { localizacao: null, AD_localizacao: null, ad_localizacao: null };
        setProductByCod((prev) => ({ ...prev, [key]: prod }));
        return prod;
      }
    },
    [API_TOKEN, GET_PRODUCT_URL, productByCod, token]
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(LIST_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao carregar inventário (status ${resp.status})`);
      }

      const data = (await resp.json()) as InventoryItem[] | null;
      let list = Array.isArray(data) ? data : [];

      // ✅ conta nº de contagens por produto
      const counts: Record<string, number> = {};
      for (const item of list) {
        const key = String(item.codProd);
        counts[key] = (counts[key] ?? 0) + 1;
      }
      setCountsByCodProd(counts);

      // ✅ ordena desc por data
      list = list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      // ✅ AGORA: set de codProd que tem pelo menos 1 PRIMAL_DATE
      const primalCodProds = new Set<string>();
      for (const item of list) {
        if (item.inplantedDate === PRIMAL_DATE) {
          primalCodProds.add(String(item.codProd));
        }
      }

      // ✅ divergentes + somente codProd que está no set PRIMAL
      const divergent = list.filter((item) => {
        if (!primalCodProds.has(String(item.codProd))) return false;
        return item.count !== item.inStock && item.localizacao?.trim() !== 'Z-000';
      });

      // ✅ agora EXIBE também os já recontados (antes você bloqueava)
      const uniqueMap = new Map<string, InventoryItem>();
      for (const item of divergent) {
        const key = `${item.codProd}-${item.localizacao ?? ''}`;
        if (!uniqueMap.has(key)) uniqueMap.set(key, item);
      }

      const finalList = Array.from(uniqueMap.values());

      setItems(finalList);
      setPage(0);
      setExpandedId(null);
      setCountById({});
      setRecountedIds({});
      setOrderBy('location');
      setOrderDirection('asc');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar inventário';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, token, API_TOKEN]);

  useEffect(() => {
    if (!ready || !hasAccess) return;
    if (token || API_TOKEN) fetchData();
  }, [API_TOKEN, fetchData, hasAccess, ready, token]);

  useEffect(() => {
    if (!ready || !hasAccess) return;

    const cod = filterCodProd.trim();

    const result = items.filter((item) => {
      if (cod && String(item.codProd) !== cod) return false;
      if (getLocTab(item.localizacao) !== activeTab) return false;
      return true;
    });

    setFiltered(result);
    setPage(0);
    setExpandedId(null);
  }, [activeTab, filterCodProd, hasAccess, items, ready]);

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

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);

  const toggleSortBy = (field: OrderBy) => {
    if (orderBy === field) setOrderDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    else {
      setOrderBy(field);
      setOrderDirection('asc');
    }
  };

  const sorted = useMemo(() => {
    const arr = [...filtered];

    return arr.sort((a, b) => {
      let valA: number;
      let valB: number;

      if (orderBy === 'numCounts') {
        valA = countsByCodProd[String(a.codProd)] ?? 0;
        valB = countsByCodProd[String(b.codProd)] ?? 0;
      } else {
        valA = parseLocationNumber(a.localizacao ?? a.descricao ?? '');
        valB = parseLocationNumber(b.localizacao ?? b.descricao ?? '');
      }

      if (valA === valB && orderBy === 'location') {
        valA = a.codProd;
        valB = b.codProd;
      }

      const cmp = valA - valB;
      return orderDirection === 'asc' ? cmp : -cmp;
    });
  }, [filtered, orderBy, orderDirection, countsByCodProd]);

  const pageRows = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // ✅ agora pode ter early return sem quebrar hooks
  if (!ready || !hasAccess) return null;

  const toggleRow = async (inv: InventoryItem) => {
    const willOpen = expandedId !== inv.id;
    setExpandedId(willOpen ? inv.id : null);

    // ✅ ao abrir, busca info do produto pra exibir localizacao + ad_localizacao
    if (willOpen) {
      await fetchProduct(inv.codProd);
    }
  };

  const handleChangeCount =
    (id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value ?? '';
      setCountById((prev) => ({ ...prev, [id]: value }));
    };

  const handleEnviarContagem = async (inv: InventoryItem) => {
    if (recountedIds[inv.id]) {
      setSnackbarMsg('Este item já teve uma recontagem enviada.');
      setSnackbarOpen(true);
      return;
    }

    const raw = countById[inv.id] ?? '';
    if (!raw.trim()) {
      setErro('Informe a nova contagem.');
      setSnackbarMsg('Informe a nova contagem.');
      setSnackbarOpen(true);
      return;
    }

    const valor = Number(raw.replace(',', '.'));
    if (!Number.isFinite(valor)) {
      setErro('Contagem inválida.');
      setSnackbarMsg('Contagem inválida.');
      setSnackbarOpen(true);
      return;
    }

    setErro(null);
    setSavingId(inv.id);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const body = {
        codProd: inv.codProd,
        contagem: valor,
        descricao: inv.descricao ?? '',
        localizacao: inv.localizacao ?? '',
      };

      const resp = await fetch(ADDNEWCOUNT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao enviar recontagem (status ${resp.status})`);
      }

      setSnackbarMsg('Recontagem enviada com sucesso!');
      setSnackbarOpen(true);

      setRecountedIds((prev) => ({ ...prev, [inv.id]: true }));
      setCountById((prev) => ({ ...prev, [inv.id]: '' }));
      setExpandedId((prev) => (prev === inv.id ? null : prev));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar recontagem.';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    } finally {
      setSavingId(null);
    }
  };

  const getProductInfoText = (codProd: number) => {
    const prod = productByCod[String(codProd)];
    if (!prod) return null;

    const loc = String(prod.localizacao ?? '').trim();
    const ad = String(prod.AD_localizacao ?? prod.ad_localizacao ?? '').trim();

    if (!loc && !ad) return 'Localização: - | AD_localizacao: -';
    return `Localização: ${loc || '-'} | AD_localizacao: ${ad || '-'}`;
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
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                mb: 2,
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={SECTION_TITLE_SX}>
                  Produtos com contagem divergente (PRIMAL)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Exibe apenas produtos que possuem <b>pelo menos um registro</b> com inplantedDate ={' '}
                  <b>{PRIMAL_DATE}</b>. Agora também mostra itens que já foram recontados.
                </Typography>
              </Box>

              <Button variant="outlined" onClick={fetchData} disabled={loading}>
                {loading ? <CircularProgress size={18} /> : 'Atualizar lista'}
              </Button>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Tabs
                value={activeTab}
                onChange={(_, v: LocTab) => setActiveTab(v)}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab value="A" label={`A (${tabCounts.A})`} />
                <Tab value="B" label={`B (${tabCounts.B})`} />
                <Tab value="C" label={`C (${tabCounts.C})`} />
                <Tab value="D" label={`D (${tabCounts.D})`} />
                <Tab value="E" label={`E (${tabCounts.E})`} />
                <Tab value="SEM" label={`SEM LOCALIZAÇÃO (${tabCounts.SEM})`} />
              </Tabs>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr' },
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                label="Filtrar por código exato do produto"
                value={filterCodProd}
                onChange={(e) => setFilterCodProd(e.target.value)}
                size="small"
              />
            </Box>

            {erro && (
              <Typography color="error" sx={{ mb: 2 }}>
                {erro}
              </Typography>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Divider sx={{ my: 2 }} />

                {sorted.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>
                    Nenhum item encontrado para os critérios atuais.
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
                        overflowY: 'hidden',
                        backgroundColor: 'background.paper',
                        maxWidth: '100%',
                      }}
                    >
                      <Table size="small" stickyHeader aria-label="lista-contagens-divergentes" sx={{ minWidth: 750 }}>
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
                            <TableCell>Cód. Produto</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell
                              align="center"
                              sx={{ cursor: 'pointer' }}
                              onClick={() => toggleSortBy('numCounts')}
                            >
                              Número de contagens
                              {orderBy === 'numCounts' ? (orderDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                            </TableCell>
                            <TableCell align="center">Recontagem</TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {pageRows.map((inv) => {
                            const alreadyRecounted = !!recountedIds[inv.id];

                            return (
                              <React.Fragment key={inv.id}>
                                <TableRow>
                                  <TableCell>{inv.localizacao ?? '-'}</TableCell>
                                  <TableCell>{inv.codProd}</TableCell>
                                  <TableCell>{inv.descricao ?? '-'}</TableCell>
                                  <TableCell align="center">{countsByCodProd[String(inv.codProd)] ?? 0}</TableCell>
                                  <TableCell align="center">
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => toggleRow(inv)}
                                    >
                                      {expandedId === inv.id ? 'Fechar' : 'Recontar'}
                                    </Button>
                                  </TableCell>
                                </TableRow>

                                {expandedId === inv.id && (
                                  <TableRow>
                                    <TableCell colSpan={5} sx={{ backgroundColor: 'background.default' }}>
                                      {/* ✅ info de localização do produto */}
                                      <Box sx={{ mb: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                          {getProductInfoText(inv.codProd) ?? 'Carregando localização do produto...'}
                                        </Typography>
                                      </Box>

                                      <Box
                                        sx={{
                                          display: 'grid',
                                          gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
                                          gap: 2,
                                          alignItems: 'center',
                                          mt: 1,
                                        }}
                                      >
                                        <TextField
                                          label="Nova contagem"
                                          value={countById[inv.id] ?? ''}
                                          onChange={handleChangeCount(inv.id)}
                                          size="small"
                                          fullWidth
                                          disabled={alreadyRecounted}
                                          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                                        />
                                        <Button
                                          variant="contained"
                                          onClick={() => handleEnviarContagem(inv)}
                                          disabled={savingId === inv.id || alreadyRecounted}
                                          sx={{ whiteSpace: 'nowrap', height: 40 }}
                                        >
                                          {savingId === inv.id ? <CircularProgress size={20} /> : alreadyRecounted ? 'Enviado' : 'Enviar'}
                                        </Button>
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

                    <TablePagination
                      component="div"
                      count={sorted.length}
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
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Page;
