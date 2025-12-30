'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
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

  reserved?: number | null;
  reservado?: number | null;
};

type ProductInfo = {
  localizacao: string | null;
  AD_localizacao: string | null;
  raw?: unknown;
};

const rowsPerPage = 10;
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

type LocTab = 'A' | 'B' | 'C' | 'D' | 'E' | 'SEM';
function getLocTab(localizacao: string | null | undefined): LocTab {
  const loc = String(localizacao ?? '').trim().toUpperCase();
  const first = loc.charAt(0);
  if (first === 'A' || first === 'B' || first === 'C' || first === 'D' || first === 'E') {
    return first as LocTab;
  }
  return 'SEM';
}

type OrderBy = 'location' | 'numCounts';
const toStringSafe = (v: unknown): string => (v == null ? '' : String(v));

function normEmail(v: string | null | undefined) {
  return String(v ?? '').trim().toLowerCase();
}

function getItemKey(inv: Pick<InventoryItem, 'codProd' | 'localizacao'>) {
  return `${inv.codProd}__${String(inv.localizacao ?? '').trim().toUpperCase()}`;
}

const PageInner: React.FC = () => {
  const { token, ready, hasAccess } = useRequireAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [filterCodProd, setFilterCodProd] = usePersistedState<string>('inventory:terceira:filterCodProd', '');
  const [activeTab, setActiveTab] = usePersistedState<LocTab>('inventory:terceira:activeTab', 'A');
  const [page, setPage] = useState(0);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const [countsByCodProd, setCountsByCodProd] = useState<Record<string, number>>({});

  const [productInfoByCodProd, setProductInfoByCodProd] = useState<Record<string, ProductInfo | undefined>>({});
  const [productLoadingByCodProd, setProductLoadingByCodProd] = useState<Record<string, boolean>>({});
  const [productErrorByCodProd, setProductErrorByCodProd] = useState<Record<string, string | null>>({});

  const [orderBy, setOrderBy] = useState<OrderBy>('location');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});
  const [sentItemKeys, setSentItemKeys] = useState<Record<string, boolean>>({});

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

  // ✅ mantém scroll do container ao atualizar estado (evita "voltar pro topo")
  const mainRef = useRef<HTMLElement | null>(null);

  // ✅ Guard "à prova de bala" contra refresh/reload causado por submit/enter/click-submit (inclusive em form pai do layout)
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const onSubmitCapture = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;

      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();

      // deixa Enter funcionar em textarea
      if (tag === 'textarea') return;

      // Enter em input frequentemente dispara submit do form pai
      if (tag === 'input') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onClickCapture = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const btn = el?.closest?.('button') as HTMLButtonElement | null;
      if (!btn) return;

      const typeAttr = (btn.getAttribute('type') || '').toLowerCase();
      // sem type => vira submit dentro de form
      const isSubmit = typeAttr === '' || typeAttr === 'submit';

      if (isSubmit) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('submit', onSubmitCapture, true);
    document.addEventListener('keydown', onKeyDownCapture, true);
    document.addEventListener('click', onClickCapture, true);

    return () => {
      document.removeEventListener('submit', onSubmitCapture, true);
      document.removeEventListener('keydown', onKeyDownCapture, true);
      document.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  const ensureProductInfo = useCallback(
    async (codProd: number) => {
      const key = String(codProd);

      if (productInfoByCodProd[key]) return;
      if (productLoadingByCodProd[key]) return;

      setProductLoadingByCodProd((prev) => ({ ...prev, [key]: true }));
      setProductErrorByCodProd((prev) => ({ ...prev, [key]: null }));

      try {
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
              rec['AD_LOCALIZACAO'],
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
    [GETPRODUCT_URL, getHeaders, productInfoByCodProd, productLoadingByCodProd],
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
      const list = Array.isArray(data) ? data : [];

      const history: Record<string, InventoryItem[]> = {};
      for (const item of list) {
        const key = String(item.codProd);
        if (!history[key]) history[key] = [];
        history[key].push(item);
      }

      const codProdsWithRecount = new Set<string>();
      const counts: Record<string, number> = {};
      for (const [cod, rows] of Object.entries(history)) {
        counts[cod] = rows.length;
        if (rows.some((r) => !!r.recontagem)) codProdsWithRecount.add(cod);
      }
      setCountsByCodProd(counts);

      const currentUserEmail = decodeJwtEmail(token);
      const currentEmailNorm = normEmail(currentUserEmail);

      const alreadyCountedByUser = new Set<string>();
      if (currentEmailNorm) {
        for (const it of list) {
          if (normEmail(it.userEmail) === currentEmailNorm) {
            alreadyCountedByUser.add(getItemKey(it));
          }
        }
      }

      const divergent = list
        .slice()
        .sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        })
        .filter((item) => {
          const codKey = String(item.codProd);
          if (!codProdsWithRecount.has(codKey)) return false;

          if (alreadyCountedByUser.has(getItemKey(item))) return false;

          return item.count !== item.inStock && item.localizacao?.trim() !== 'Z-000' && item.inplantedDate === PRIMAL_DATE;
        });

      const uniqueMap = new Map<string, InventoryItem>();
      for (const item of divergent) {
        const key = getItemKey(item);
        if (!uniqueMap.has(key)) uniqueMap.set(key, item);
      }

      const finalList = Array.from(uniqueMap.values());

      setItems(finalList);
      setFiltered(finalList);

      // ✅ NÃO zera paginação sempre. Ajusta só se ficar inválida.
      const lastPage = Math.max(0, Math.ceil(finalList.length / rowsPerPage) - 1);
      setPage((p) => Math.min(p, lastPage));

      setExpandedId(null);
      setOrderBy('location');
      setOrderDirection('asc');

      setSentIds({});
      setSentItemKeys({});
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

  // ✅ CORREÇÃO PRINCIPAL: NÃO zerar page ao mudar items (isso fazia voltar pro começo após enviar contagem)
  useEffect(() => {
    if (!ready || !hasAccess) return;

    const cod = filterCodProd.trim();

    const result = items.filter((item) => {
      if (getLocTab(item.localizacao) !== activeTab) return false;
      if (cod && String(item.codProd) !== cod) return false;
      return true;
    });

    setFiltered(result);

    // ✅ mantém pagina atual; só ajusta se a página atual ficar fora do range
    const lastPage = Math.max(0, Math.ceil(result.length / rowsPerPage) - 1);
    setPage((p) => Math.min(p, lastPage));
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

  const toggleRow = (inv: InventoryItem) => {
    setExpandedId((prev) => {
      const next = prev === inv.id ? null : inv.id;
      if (next) void ensureProductInfo(inv.codProd);
      return next;
    });
  };

  const ColorsHelp = (
    <Box sx={{ fontSize: 13, lineHeight: 1.6 }}>
      <Typography variant="caption">
        Nesta tela, itens já contados por você não aparecem. E você não consegue enviar 2 contagens para o mesmo item (codProd + localização).
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
    const itemKey = getItemKey(inv);

    if (sentIds[inv.id] || sentItemKeys[itemKey]) {
      setSnackbarMsg('Você já enviou uma nova contagem para este item (cód. produto + localização).');
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

      const userEmail = decodeJwtEmail(token) ?? null;

      const body = {
        codProd: inv.codProd,
        contagem: valor,
        descricao: inv.descricao ?? '',
        localizacao: inv.localizacao ?? '',
        userEmail,
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
      setSentItemKeys((prev) => ({ ...prev, [itemKey]: true }));

      setNewCountById((prev) => ({ ...prev, [inv.id]: '' }));
      setExpandedId((prev) => (prev === inv.id ? null : prev));

      // ✅ preserva scroll do container (não “volta pro topo”)
      const prevScrollTop = mainRef.current?.scrollTop ?? 0;

      // remove item da lista sem resetar paginação
      setItems((prev) => prev.filter((x) => getItemKey(x) !== itemKey));

      requestAnimationFrame(() => {
        if (mainRef.current) mainRef.current.scrollTop = prevScrollTop;
      });
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
        <IconButton type="button" onClick={() => setSidebarOpen((v) => !v)} aria-label="menu" size="large">
          <MenuIcon />
        </IconButton>
      </Box>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box
        component="main"
        ref={mainRef}
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
                  Clique em <b>Detalhes</b> para ver <b>localização</b> do produto e enviar <b>nova contagem</b>.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button type="button" variant="outlined" onClick={fetchData} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : 'Atualizar lista'}
                </Button>
              </Box>
            </Box>

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
                  <Typography sx={{ color: 'text.secondary' }}>Nenhum produto encontrado para os critérios atuais.</Typography>
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
                            const alreadySent = !!sentIds[inv.id] || !!sentItemKeys[getItemKey(inv)];

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
                                    <Button type="button" size="small" variant="outlined" onClick={() => toggleRow(inv)}>
                                      {expandedId === inv.id ? 'Fechar' : 'Detalhes'}
                                    </Button>
                                  </TableCell>
                                </TableRow>

                                {expandedId === inv.id && (
                                  <TableRow>
                                    <TableCell colSpan={5} sx={{ backgroundColor: 'background.default' }}>
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

                                      <Box
                                        sx={{
                                          display: 'grid',
                                          gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
                                          gap: 2,
                                          alignItems: 'center',
                                        }}
                                      >
                                        <TextField
                                          label="Nova contagem"
                                          value={newCountById[inv.id] ?? ''}
                                          onChange={handleChangeNewCount(inv.id)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              void handleEnviarNovaContagem(inv);
                                            }
                                          }}
                                          size="small"
                                          fullWidth
                                          disabled={alreadySent || sendingId === inv.id}
                                          slotProps={{ htmlInput: { inputMode: 'numeric', formNoValidate: true } }}
                                        />
                                        <Button
                                          type="button"
                                          variant="contained"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            void handleEnviarNovaContagem(inv);
                                          }}
                                          disabled={alreadySent || sendingId === inv.id}
                                          sx={{ whiteSpace: 'nowrap', height: 40, textTransform: 'none' }}
                                        >
                                          {sendingId === inv.id ? <CircularProgress size={20} /> : alreadySent ? 'Enviado' : 'Enviar'}
                                        </Button>
                                      </Box>

                                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
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

export default dynamic(() => Promise.resolve(PageInner), { ssr: false });
