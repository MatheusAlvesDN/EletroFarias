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
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { usePersistedState } from '@/hooks/userPersistedState';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { parseLocationNumber } from '@/utils/location';

// Mesmo shape do backend (prisma.inventory) + localização
type InventoryItem = {
  id: string;
  codProd: number;
  count: number;
  inStock: number;
  inplantedDate: string | null;
  createdAt: string;
  descricao?: string | null;
  userEmail?: string | null;
  localizacao: string | null; // ex: "A-001"
  recontagem?: boolean | null;

  reserved?: number | null;
  reservado?: number | null;
};

type ProductInfo = {
  localizacao: string | null;
  AD_localizacao: string | null;
  raw?: unknown;
};

const rowsPerPage = 10;

const RESET_DATE = '1981-11-23T14:01:48.190Z';
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

// ABAS POR LOCALIZAÇÃO
type LocTab = 'A' | 'B' | 'C' | 'D' | 'E' | 'SEM';
function getLocTab(localizacao: string | null | undefined): LocTab {
  const loc = String(localizacao ?? '').trim().toUpperCase();
  const first = loc.charAt(0);
  if (first === 'A' || first === 'B' || first === 'C' || first === 'D' || first === 'E') {
    return first as LocTab;
  }
  return 'SEM';
}

// tipos de ordenação
type OrderBy = 'location' | 'numCounts';

const toStringSafe = (v: unknown): string => (v == null ? '' : String(v));

const Page: React.FC = () => {
  const { token, ready, hasAccess } = useRequireAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [filterCodProd, setFilterCodProd] = usePersistedState<string>('inventory:terceira:filterCodProd', '');

  // ABA ATIVA
  const [activeTab, setActiveTab] = usePersistedState<LocTab>('inventory:terceira:activeTab', 'A');

  // PAGINAÇÃO
  const [page, setPage] = useState(0);

  // SNACKBAR
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // mapa: codProd -> número de contagens
  const [countsByCodProd, setCountsByCodProd] = useState<Record<string, number>>({});

  // ✅ histórico completo por produto (ainda calculamos para saber quem “tem recontagem” e quantas contagens)
  const [historyByCodProd, setHistoryByCodProd] = useState<Record<string, InventoryItem[]>>({});

  // ✅ cache de info do produto (codProd -> info)
  const [productInfoByCodProd, setProductInfoByCodProd] = useState<Record<string, ProductInfo | undefined>>({});
  const [productLoadingByCodProd, setProductLoadingByCodProd] = useState<Record<string, boolean>>({});
  const [productErrorByCodProd, setProductErrorByCodProd] = useState<Record<string, string | null>>({});

  // ordenação
  const [orderBy, setOrderBy] = useState<OrderBy>('location');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');

  // acordeão por linha
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // controle de envio
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [newCountById, setNewCountById] = useState<Record<string, string>>({});

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getinventoryList` : `/sync/getinventoryList`), [API_BASE]);

  const ADDNEWCOUNT_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/addNewCount` : `/sync/addNewCount`), [API_BASE]);

  const GETPRODUCT_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getProduct` : `/sync/getProduct`), [API_BASE]);

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const getReservado = useCallback((item: InventoryItem): number => {
    const v = item.reserved ?? item.reservado ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '-';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleString('pt-BR');
  };

  const getRowVisual = useCallback(
    (inv: InventoryItem): { bg: string; diff: number } => {
      const reservado = getReservado(inv);
      const diff = inv.count - (inv.inStock + reservado);

      const isPrimal = inv.inplantedDate === PRIMAL_DATE;

      let rowBg = '#9FC5E8'; // azul
      if (isPrimal) {
        if (diff === 0) rowBg = '#B6D7A8'; // verde
        else if (diff > 0) rowBg = '#FFE599'; // amarelo
        else rowBg = '#EA9999'; // vermelho
      } else if (inv.inplantedDate === RESET_DATE) {
        rowBg = '#D9D9D9'; // cinza
      }

      return { bg: rowBg, diff };
    },
    [getReservado]
  );

  // ✅ busca info do produto (com cache)
  const ensureProductInfo = useCallback(
    async (codProd: number) => {
      const key = String(codProd);
      if (productInfoByCodProd[key]) return;
      if (productLoadingByCodProd[key]) return;

      setProductLoadingByCodProd((prev) => ({ ...prev, [key]: true }));
      setProductErrorByCodProd((prev) => ({ ...prev, [key]: null }));

      try {
        // backend estava com @Query('id'), mas aqui você vinha usando codProd
        // Mantive codProd pois é o que a tela já usa; se seu backend espera ?id=, troque abaixo.
        const url = `${GETPRODUCT_URL}?codProd=${encodeURIComponent(String(codProd))}`;

        const resp = await fetch(url, {
          method: 'GET',
          headers: getHeaders(),
          cache: 'no-store',
        });

        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha ao buscar produto (status ${resp.status})`);
        }

        const raw = (await resp.json()) as unknown;
        const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

        const localizacao = toStringSafe(rec.localizacao ?? rec.LOCALIZACAO ?? rec.loc ?? rec.LOC) || null;

        const AD_localizacao =
          toStringSafe(
            rec.AD_localizacao ??
              rec.AD_LOCALIZACAO ??
              rec.ad_localizacao ??
              rec.adLocalizacao ??
              rec['AD_LOCALIZACAO']
          ) || null;

        setProductInfoByCodProd((prev) => ({
          ...prev,
          [key]: { localizacao, AD_localizacao, raw },
        }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao buscar produto';
        setProductErrorByCodProd((prev) => ({ ...prev, [key]: msg }));
      } finally {
        setProductLoadingByCodProd((prev) => ({ ...prev, [key]: false }));
      }
    },
    [GETPRODUCT_URL, getHeaders, productInfoByCodProd, productLoadingByCodProd]
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const resp = await fetch(LIST_URL, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao carregar inventário (status ${resp.status})`);
      }

      const data = (await resp.json()) as InventoryItem[] | null;
      let list = Array.isArray(data) ? data : [];

      // histórico por produto (para saber “tem recontagem” e nº contagens)
      const history: Record<string, InventoryItem[]> = {};
      for (const item of list) {
        const key = String(item.codProd);
        if (!history[key]) history[key] = [];
        history[key].push(item);
      }

      for (const k of Object.keys(history)) {
        history[k] = history[k].slice().sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
      }
      setHistoryByCodProd(history);

      // Set de codProd que tiveram pelo menos 1 recontagem
      const codProdsWithRecount = new Set<string>();
      for (const [cod, rows] of Object.entries(history)) {
        if (rows.some((r) => !!r.recontagem)) codProdsWithRecount.add(cod);
      }

      // contagens por produto
      const counts: Record<string, number> = {};
      for (const k of Object.keys(history)) counts[k] = history[k].length;
      setCountsByCodProd(counts);

      // createdAt desc
      list = list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      const currentUserEmail = decodeJwtEmail(token);

      // divergentes + primal + ignora Z-000 + somente produtos que tiveram recontagem
      // ✅ + NÃO mostrar itens contados pelo usuário logado
      const divergent = list.filter((item) => {
        const codKey = String(item.codProd);
        if (!codProdsWithRecount.has(codKey)) return false;

        if (
          currentUserEmail &&
          item.userEmail &&
          item.userEmail.trim().toLowerCase() === currentUserEmail.trim().toLowerCase()
        ) {
          return false;
        }

        return item.count !== item.inStock && item.localizacao?.trim() !== 'Z-000' && item.inplantedDate === PRIMAL_DATE;
      });

      // unique (codProd + localizacao)
      const uniqueMap = new Map<string, InventoryItem>();
      for (const item of divergent) {
        const key = `${item.codProd}-${item.localizacao ?? ''}`;
        if (!uniqueMap.has(key)) uniqueMap.set(key, item);
      }

      const finalList = Array.from(uniqueMap.values());

      setItems(finalList);
      setFiltered(finalList);
      setPage(0);
      setExpandedId(null);
      setOrderBy('location');
      setOrderDirection('asc');

      // reset bloqueios
      setSentIds({});
      setSendingId(null);
      setNewCountById({});

      setActiveTab('A');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar inventário';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, getHeaders, token, setActiveTab]);

  useEffect(() => {
    if (!ready || !hasAccess) return;
    if (token || API_TOKEN) fetchData();
  }, [API_TOKEN, fetchData, hasAccess, ready, token]);

  // FILTRO: aba + codProd
  useEffect(() => {
    if (!ready || !hasAccess) return;

    const cod = filterCodProd.trim();

    const result = items.filter((item) => {
      if (getLocTab(item.localizacao) !== activeTab) return false;
      if (cod && String(item.codProd) !== cod) return false;
      return true;
    });

    setFiltered(result);
    setPage(0);
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

  const tabCounts = useMemo(() => {
    const base: Record<LocTab, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, SEM: 0 };
    for (const it of items) base[getLocTab(it.localizacao)] += 1;
    return base;
  }, [items]);

  if (!ready || !hasAccess) return null;

  // ✅ ao abrir detalhes, busca info do produto
  const toggleRow = (inv: InventoryItem) => {
    setExpandedId((prev) => {
      const next = prev === inv.id ? null : inv.id;
      if (next) void ensureProductInfo(inv.codProd);
      return next;
    });
  };

  const ColorsHelp = (
    <Box sx={{ fontSize: 13, lineHeight: 1.6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 12, height: 12, bgcolor: '#EA9999', borderRadius: 0.5 }} />
        Vermelho: contagem menor que estoque
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 12, height: 12, bgcolor: '#FFE599', borderRadius: 0.5 }} />
        Amarelo: contagem maior que estoque
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 12, height: 12, bgcolor: '#B6D7A8', borderRadius: 0.5 }} />
        Verde: contagem igual ao estoque
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 12, height: 12, bgcolor: '#9FC5E8', borderRadius: 0.5 }} />
        Azul: ajuste realizado no sistema
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 12, height: 12, bgcolor: '#D9D9D9', borderRadius: 0.5 }} />
        Cinza: alterado com base em outra contagem
      </Box>
      <Divider sx={{ my: 1 }} />
      <Typography variant="caption">
        Linha com degradê indica <b>recontagem</b>
      </Typography>
    </Box>
  );

  const handleChangeNewCount =
    (id: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value ?? '';
      setNewCountById((prev) => ({ ...prev, [id]: value }));
    };

  const handleEnviarNovaContagem = async (inv: InventoryItem) => {
    if (sentIds[inv.id]) {
      setSnackbarMsg('Já foi enviada uma nova contagem para este item.');
      setSnackbarOpen(true);
      return;
    }

    const raw = newCountById[inv.id] ?? '';
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

    try {
      setErro(null);
      setSendingId(inv.id);

      const body = {
        codProd: inv.codProd,
        contagem: valor,
        descricao: inv.descricao ?? '',
        localizacao: inv.localizacao ?? '',
      };

      const resp = await fetch(ADDNEWCOUNT_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao enviar nova contagem (status ${resp.status})`);
      }

      setSnackbarMsg('Nova contagem enviada com sucesso!');
      setSnackbarOpen(true);

      setSentIds((prev) => ({ ...prev, [inv.id]: true }));
      setNewCountById((prev) => ({ ...prev, [inv.id]: '' }));
      setExpandedId((prev) => (prev === inv.id ? null : prev));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar nova contagem.';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    } finally {
      setSendingId(null);
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={SECTION_TITLE_SX}>
                    Produtos com contagem divergente (com recontagem)
                  </Typography>

                  <Tooltip arrow placement="right" title={ColorsHelp}>
                    <InfoOutlinedIcon sx={{ color: 'text.secondary', cursor: 'pointer', fontSize: 20 }} />
                  </Tooltip>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Esta tela mostra <b>somente</b> produtos que tiveram <b>pelo menos uma recontagem</b>. Clique em{' '}
                  <b>Detalhes</b> para enviar <b>nova contagem</b> e ver as <b>informações do produto</b>.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button variant="outlined" onClick={fetchData} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : 'Atualizar lista'}
                </Button>
              </Box>
            </Box>

            {/* ABAS */}
            <Box sx={{ mb: 2 }}>
              <Tabs value={activeTab} onChange={(_, v: LocTab) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
                <Tab value="A" label={`A (${tabCounts.A})`} />
                <Tab value="B" label={`B (${tabCounts.B})`} />
                <Tab value="C" label={`C (${tabCounts.C})`} />
                <Tab value="D" label={`D (${tabCounts.D})`} />
                <Tab value="E" label={`E (${tabCounts.E})`} />
                <Tab value="SEM" label={`SEM LOCALIZAÇÃO (${tabCounts.SEM})`} />
              </Tabs>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr' }, gap: 2, mb: 2 }}>
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
                  <Typography sx={{ color: 'text.secondary' }}>Nenhum produto com recontagem encontrado para os critérios atuais.</Typography>
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
                      <Table size="small" stickyHeader aria-label="divergentes" sx={{ minWidth: 900 }}>
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
                              onClick={() => toggleSortBy(orderBy === 'location' ? 'numCounts' : 'location')}
                            >
                              {orderBy === 'location' ? 'Ordenação: Localização' : 'Ordenação: Nº contagens'}
                              {orderBy === 'location' ? (orderDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                            </TableCell>

                            <TableCell align="center">Detalhes</TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {pageRows.map((inv) => {
                            const alreadySent = !!sentIds[inv.id];

                            const codKey = String(inv.codProd);
                            const prodInfo = productInfoByCodProd[codKey];
                            const prodLoading = !!productLoadingByCodProd[codKey];
                            const prodErr = productErrorByCodProd[codKey];

                            return (
                              <React.Fragment key={inv.id}>
                                <TableRow sx={{ '&:hover': { backgroundColor: 'rgba(0,0,0,0.03)' } }}>
                                  <TableCell>{inv.localizacao ?? '-'}</TableCell>
                                  <TableCell>{inv.codProd}</TableCell>
                                  <TableCell>{inv.descricao ?? '-'}</TableCell>
                                  <TableCell align="center">{countsByCodProd[String(inv.codProd)] ?? 0}</TableCell>
                                  <TableCell align="center">
                                    <Button size="small" variant="outlined" onClick={() => toggleRow(inv)}>
                                      {expandedId === inv.id ? 'Fechar' : 'Detalhes'}
                                    </Button>
                                  </TableCell>
                                </TableRow>

                                {expandedId === inv.id && (
                                  <TableRow>
                                    <TableCell colSpan={5} sx={{ backgroundColor: 'background.default' }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                          Detalhes — produto {inv.codProd}
                                        </Typography>

                                        <Tooltip arrow placement="right" title={ColorsHelp}>
                                          <InfoOutlinedIcon sx={{ color: 'text.secondary', cursor: 'pointer', fontSize: 18 }} />
                                        </Tooltip>
                                      </Box>

                                      {/* ✅ INFORMAÇÕES DO PRODUTO */}
                                      <Box
                                        sx={{
                                          border: (t) => `1px solid ${t.palette.divider}`,
                                          borderRadius: 2,
                                          backgroundColor: 'background.paper',
                                          p: 2,
                                          mb: 2,
                                        }}
                                      >
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                          Informações do produto (via /sync/getProduct)
                                        </Typography>

                                        {prodLoading ? (
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CircularProgress size={18} />
                                            <Typography variant="body2" color="text.secondary">
                                              Carregando informações do produto...
                                            </Typography>
                                          </Box>
                                        ) : prodErr ? (
                                          <Typography variant="body2" color="error">
                                            {prodErr}
                                          </Typography>
                                        ) : (
                                          <Box
                                            sx={{
                                              display: 'grid',
                                              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                              gap: 2,
                                            }}
                                          >
                                            <Box>
                                              <Typography variant="caption" color="text.secondary">
                                                localizacao
                                              </Typography>
                                              <Typography sx={{ fontFamily: 'monospace' }}>{prodInfo?.localizacao ?? '-'}</Typography>
                                            </Box>

                                            <Box>
                                              <Typography variant="caption" color="text.secondary">
                                                AD_localizacao
                                              </Typography>
                                              <Typography sx={{ fontFamily: 'monospace' }}>{prodInfo?.AD_localizacao ?? '-'}</Typography>
                                            </Box>
                                          </Box>
                                        )}
                                      </Box>

                                      {/* ✅ NOVA CONTAGEM (mantida) */}
                                      <Box
                                        sx={{
                                          display: 'grid',
                                          gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
                                          gap: 2,
                                          alignItems: 'center',
                                          mb: 2,
                                        }}
                                      >
                                        <TextField
                                          label="Nova contagem"
                                          value={newCountById[inv.id] ?? ''}
                                          onChange={handleChangeNewCount(inv.id)}
                                          size="small"
                                          fullWidth
                                          disabled={alreadySent || sendingId === inv.id}
                                          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                                        />
                                        <Button
                                          variant="contained"
                                          onClick={() => handleEnviarNovaContagem(inv)}
                                          disabled={alreadySent || sendingId === inv.id}
                                          sx={{ whiteSpace: 'nowrap', height: 40, textTransform: 'none' }}
                                        >
                                          {sendingId === inv.id ? <CircularProgress size={20} /> : alreadySent ? 'Enviado' : 'Enviar'}
                                        </Button>
                                      </Box>

                                      {/* ✅ HISTÓRICO REMOVIDO (não exibir inventorys no detalhes) */}
                                      <Typography variant="body2" color="text.secondary">
                                        Histórico oculto nesta tela.
                                      </Typography>
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
        <Alert onClose={() => setSnackbarOpen(false)} severity={erro ? 'error' : 'success'} variant="filled" sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Page;
