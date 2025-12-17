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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

// Mesmo shape do backend (prisma.inventory)
type InventoryItem = {
  id: string;
  codProd: number;
  count: number;
  inStock: number;
  inplantedDate: string | null; // agora permite null
  createdAt: string; // usado para ordenação inicial
  descricao?: string | null;
  userEmail?: string | null;
  localizacao?: string | null; // ⚠️ seu filtro usa isso, então deixei opcional

  // Reservado / recontagem vindos do backend
  reserved?: number | null;
  reservado?: number | null; // fallback se o backend usar esse nome
  recontagem?: boolean | null;
};

type OrderBy = 'codProd' | 'descricao' | 'count' | 'inStock' | 'diff';

const RESET_DATE = '1981-11-23T14:01:48.190Z';
const PRIMAL_DATE = '1987-11-23T14:01:48.190Z';

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [filterCodProd, setFilterCodProd] = useState('');
  const [filterUserEmail, setFilterUserEmail] = useState(''); // ✅ filtro por contador
  const [showOnlyPendentes, setShowOnlyPendentes] = useState(false);
  const [showOnlyRecontagens, setShowOnlyRecontagens] = useState(false);

  // PAGINAÇÃO
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  // ORDENAÇÃO
  const [orderBy, setOrderBy] = useState<OrderBy>('codProd');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');
  const [hasUserSorted, setHasUserSorted] = useState(false);

  // SNACKBAR
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // controle de “loading” do botão por linha
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // auth
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);
  }, [router]);

  // Base da API
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getinventoryList` : `/sync/getinventoryList`),
    [API_BASE]
  );

  // endpoint para ajustar inventário
  const INPLANT_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/inplantCount` : `/sync/inplantCount`),
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

  // helper pra pegar reservado de forma segura (suporta reserved ou reservado)
  const getReservado = (item: InventoryItem): number => {
    const v = item.reserved ?? item.reservado ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // 🔢 CONTAGEM DE CÓDIGOS DE PRODUTO DISTINTOS
  const uniqueCodProdCount = useMemo(() => new Set(items.map((i) => i.codProd)).size, [items]);

  // Carrega lista
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);
      setHasUserSorted(false);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(LIST_URL, { method: 'GET', headers, cache: 'no-store' });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao carregar inventário (status ${resp.status})`);
      }

      const data = (await resp.json()) as InventoryItem[] | null;
      let list = Array.isArray(data) ? data : [];

      // ✅ ordena por createdAt desc: mais recentes primeiro
      list = list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      // ✅ AGRUPA POR CONTADOR (userEmail) mantendo a ordem (desc)
      const byEmail: Record<string, InventoryItem[]> = {};
      for (const it of list) {
        const email = (it.userEmail ?? '').trim().toLowerCase();
        if (!email) continue; // sem email não dá pra achar "anterior"
        if (!byEmail[email]) byEmail[email] = [];
        byEmail[email].push(it);
      }

      // ✅ Index rápido: email -> (id -> posição)
      const indexByEmail: Record<string, Map<string, number>> = {};
      for (const [email, arr] of Object.entries(byEmail)) {
        const m = new Map<string, number>();
        arr.forEach((it, idx) => m.set(it.id, idx));
        indexByEmail[email] = m;
      }

      // ✅ Seleciona: Z-000 + anterior do mesmo contador (na linha do tempo desc)
      const idsToShow = new Set<string>();

      const locs = ['Z-000', '6 K', 'B-06', 'B-15	', 'F-16', 'B-38/MOS', 'B-57', 'B-885', 'E-56', 'E-424', '3111', '20308', 'SHOOWROOM', '3090']

      const locais = Map.from(locs)

      for (const [email, arr] of Object.entries(byEmail)) {
        const idxMap = indexByEmail[email];

        for (const it of arr) {
          const loc = (it.localizacao ?? '').trim().toUpperCase();
          if (!locais.include(loc)) continue;

          idsToShow.add(it.id);

          const idx = idxMap.get(it.id);
          if (idx === undefined) continue;

          const previous = arr[idx + 1]; // +1 = mais antigo (porque arr está desc)
          if (previous) idsToShow.add(previous.id);
        }
      }

      // ✅ Final: somente os escolhidos, preservando ordenação geral (createdAt desc)
      const finalList = list.filter((it) => idsToShow.has(it.id));

      setItems(finalList);
      setPage(0);
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
    if (token || API_TOKEN) fetchData();
  }, [fetchData, token, API_TOKEN]);

  // ✅ Filtro: código exato + contador (contains) + apenas pendentes + apenas recontagens
  useEffect(() => {
    const cod = filterCodProd.trim();
    const emailFilter = filterUserEmail.trim().toUpperCase();

    const result = items.filter((item) => {
      // filtro por código exato
      if (cod && String(item.codProd) !== cod) return false;

      // filtro por contador (userEmail contém)
      if (emailFilter) {
        const email = String(item.userEmail ?? '').toUpperCase();
        if (!email.includes(emailFilter)) return false;
      }

      const reservado = getReservado(item);
      const diff = item.count - (item.inStock + reservado);
      const dateStr = item.inplantedDate === PRIMAL_DATE;
      const precisaAjustar = dateStr && diff !== 0;

      if (showOnlyPendentes && !precisaAjustar) return false;
      if (showOnlyRecontagens && !item.recontagem) return false;

      return true;
    });

    setFiltered(result);
    setPage(0);
  }, [filterCodProd, filterUserEmail, items, showOnlyPendentes, showOnlyRecontagens]);

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

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleSort = (field: OrderBy) => {
    setHasUserSorted(true);
    setOrderBy((prev) => {
      if (prev === field) {
        setOrderDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setOrderDirection('asc');
      return field;
    });
  };

  const sorted = useMemo(() => {
    if (!hasUserSorted) return filtered;

    const arr = [...filtered];
    return arr.sort((a, b) => {
      const reservA = getReservado(a);
      const reservB = getReservado(b);

      const diffA = a.count - (a.inStock + reservA);
      const diffB = b.count - (b.inStock + reservB);

      let valA: string | number;
      let valB: string | number;

      switch (orderBy) {
        case 'codProd':
          valA = a.codProd;
          valB = b.codProd;
          break;
        case 'descricao':
          valA = (a.descricao ?? '').toUpperCase();
          valB = (b.descricao ?? '').toUpperCase();
          break;
        case 'count':
          valA = a.count;
          valB = b.count;
          break;
        case 'inStock':
          valA = a.inStock;
          valB = b.inStock;
          break;
        case 'diff':
          valA = diffA;
          valB = diffB;
          break;
        default:
          valA = 0;
          valB = 0;
      }

      const cmp =
        typeof valA === 'number' && typeof valB === 'number'
          ? valA - valB
          : String(valA).localeCompare(String(valB), 'pt-BR');

      return orderDirection === 'asc' ? cmp : -cmp;
    });
  }, [filtered, orderBy, orderDirection, hasUserSorted]);

  const pageRows = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleUpdateRow = async (inv: InventoryItem, diference: number) => {
    try {
      setUpdatingId(inv.id);
      setErro(null);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(INPLANT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ diference, codProd: inv.codProd, id: inv.id }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao ajustar inventário (status ${resp.status})`);
      }

      const nowIso = new Date().toISOString();

      setItems((prev) =>
        prev.map((item) => {
          if (item.id === inv.id) return { ...item, inplantedDate: nowIso };
          if (item.codProd === inv.codProd) return { ...item, inplantedDate: RESET_DATE };
          return item;
        })
      );

      setSnackbarMsg('Atualizado');
      setSnackbarOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao ajustar inventário.';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    } finally {
      setUpdatingId(null);
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
                <Typography variant="h6" sx={SECTION_TITLE_SX}>
                  Contagens de produtos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de produtos distintos contados: {uniqueCodProdCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Mostrando apenas: <b>Z-000</b> + <b>registro anterior</b> do mesmo contador.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button variant="outlined" onClick={fetchData} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : 'Atualizar lista'}
                </Button>

                <Button
                  variant={showOnlyPendentes ? 'contained' : 'outlined'}
                  color="warning"
                  onClick={() => setShowOnlyPendentes((prev) => !prev)}
                >
                  {showOnlyPendentes ? 'Mostrar todas as contagens' : 'Mostrar apenas pendentes'}
                </Button>

                <Button
                  variant={showOnlyRecontagens ? 'contained' : 'outlined'}
                  color="secondary"
                  onClick={() => setShowOnlyRecontagens((prev) => !prev)}
                >
                  {showOnlyRecontagens ? 'Mostrar todas as contagens' : 'Mostrar apenas recontagens'}
                </Button>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
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

              <TextField
                label="Filtrar por contador (e-mail)"
                value={filterUserEmail}
                onChange={(e) => setFilterUserEmail(e.target.value)}
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
                  <Typography sx={{ color: 'text.secondary' }}>Nenhuma contagem encontrada.</Typography>
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
                      <Table size="small" stickyHeader aria-label="lista-contagens" sx={{ minWidth: 900 }}>
                        <TableHead>
                          <TableRow
                            sx={{
                              '& th': {
                                backgroundColor: (t) => t.palette.grey[50],
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                              },
                            }}
                          >
                            <TableCell>Localização</TableCell>
                            <TableCell>Loc2</TableCell>
                            <TableCell onClick={() => handleSort('codProd')}>Cód. Produto</TableCell>
                            <TableCell >Data de criação</TableCell>
                            <TableCell onClick={() => handleSort('descricao')}>Descrição</TableCell>
                            <TableCell>Contador</TableCell>
                            <TableCell align="right" onClick={() => handleSort('count')}>
                              Contagem
                            </TableCell>
                            <TableCell align="right" onClick={() => handleSort('inStock')}>
                              Estoque sistema
                            </TableCell>
                            <TableCell align="right">Reservado</TableCell>
                            <TableCell align="right" onClick={() => handleSort('diff')}>
                              Diferença
                            </TableCell>
                            <TableCell align="center" sx={{ p: 0.5 }}>
                              Ação
                            </TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {pageRows.map((inv) => {
                            const reservado = getReservado(inv);
                            const diff = inv.count - (inv.inStock + reservado);
                            const dateStr = inv.inplantedDate === PRIMAL_DATE;
                            const precisaAjustar = dateStr && diff !== 0;

                            let rowBg: string;
                            if (dateStr) {
                              if (diff === 0) rowBg = '#B6D7A8';
                              else if (diff > 0) rowBg = '#FFE599';
                              else rowBg = '#EA9999';
                            } else if (inv.inplantedDate === RESET_DATE) {
                              rowBg = '#D9D9D9';
                            } else {
                              rowBg = '#9FC5E8';
                            }

                            const isRecontagem = !!inv.recontagem;

                            return (
                              <TableRow
                                key={inv.id}
                                sx={{
                                  background: isRecontagem
                                    ? `linear-gradient(90deg, #FFA756 0%, ${rowBg} 55%, ${rowBg} 100%)`
                                    : rowBg,
                                  '& td': { fontWeight: isRecontagem ? 700 : 'inherit' },
                                  '&:hover': { filter: 'brightness(0.97)' },
                                }}
                              >
                                <TableCell>{inv.localizacao ?? '-'}</TableCell>
                                <TableCell>{inv.localizacao2 ?? '-'}</TableCell>
                                <TableCell>{inv.codProd}</TableCell>
                                <TableCell>{inv.createdAt}</TableCell>
                                <TableCell>{inv.descricao ?? '-'}</TableCell>
                                <TableCell>{inv.userEmail ?? '-'}</TableCell>
                                <TableCell align="right">{numberFormatter.format(inv.count)}</TableCell>
                                <TableCell align="right">{numberFormatter.format(inv.inStock)}</TableCell>
                                <TableCell align="right">{numberFormatter.format(reservado)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  {numberFormatter.format(diff)}
                                </TableCell>
                                <TableCell align="center" sx={{ p: 0.5 }}>
                                  {precisaAjustar && (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      onClick={() => handleUpdateRow(inv, diff)}
                                      disabled={updatingId === inv.id}
                                      sx={{
                                        minWidth: 64,
                                        px: 1,
                                        py: 0.25,
                                        lineHeight: 1.4,
                                        textTransform: 'none',
                                      }}
                                    >
                                      {updatingId === inv.id ? <CircularProgress size={14} /> : 'Ajustar'}
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
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
        autoHideDuration={3000}
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
}
