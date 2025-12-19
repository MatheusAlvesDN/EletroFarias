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
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

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

  // Reservado / recontagem vindos do backend (fallbacks)
  reserved?: number | null;
  reservado?: number | null;
};

const rowsPerPage = 10;

const RESET_DATE = '1981-11-23T14:01:48.190Z';
const PRIMAL_DATE = '1987-11-23T14:01:48.190Z';

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
  roles?: string[]; // se um dia você mudar pra array
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

// helper: extrai apenas a parte numérica da localização
const parseLocationNumber = (loc?: string | null): number => {
  if (!loc) return Number.MAX_SAFE_INTEGER;
  const match = loc.match(/\d+/g);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const joined = match.join('');
  const n = Number.parseInt(joined, 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

// tipos de ordenação
type OrderBy = 'location' | 'numCounts';

const Page: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [filterCodProd, setFilterCodProd] = useState('');

  // PAGINAÇÃO
  const [page, setPage] = useState(0);

  // SNACKBAR
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // auth
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  // mapa: codProd -> número de contagens
  const [countsByCodProd, setCountsByCodProd] = useState<Record<string, number>>({});

  // histórico completo por produto (codProd -> lista)
  const [historyByCodProd, setHistoryByCodProd] = useState<Record<string, InventoryItem[]>>({});

  // ordenação
  const [orderBy, setOrderBy] = useState<OrderBy>('location');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');

  // loading do botão ajustar por linha (histórico)
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // acordeão por linha
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);
  }, [router]);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getinventoryList` : `/sync/getinventoryList`),
    [API_BASE]
  );

  // endpoint de ajustar
  const INPLANT_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/inplantCount` : `/sync/inplantCount`),
    [API_BASE]
  );

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

  // ✅ regra de cor usada NO HISTÓRICO (linhas após Detalhes)
  const getRowVisual = useCallback(
    (inv: InventoryItem): { bg: string; precisaAjustar: boolean; diff: number } => {
      const reservado = getReservado(inv);
      const diff = inv.count - (inv.inStock + reservado);

      const isPrimal = inv.inplantedDate === PRIMAL_DATE;
      const precisaAjustar = isPrimal && (diff !== 0 || !!inv.recontagem);


      let rowBg = '#9FC5E8'; // azul = “alterado em sistema”
      if (isPrimal) {
        if (diff === 0) rowBg = '#B6D7A8'; // verde
        else if (diff > 0) rowBg = '#FFE599'; // amarelo
        else rowBg = '#EA9999'; // vermelho
      } else if (inv.inplantedDate === RESET_DATE) {
        rowBg = '#D9D9D9'; // cinza
      }

      return { bg: rowBg, precisaAjustar, diff };
    },
    [getReservado]
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

      // histórico por produto
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

      const counts: Record<string, number> = {};
      for (const k of Object.keys(history)) counts[k] = history[k].length;
      setCountsByCodProd(counts);

      // createdAt desc
      list = list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      // divergentes (count != inStock) + ignora Z-000
      const divergent = list.filter(
        (item) => item.count !== item.inStock && item.localizacao?.trim() !== 'Z-000' && item.inplantedDate === PRIMAL_DATE
      );



      // e-mail logado
      const currentUserEmail = decodeJwtEmail(token);
      console.log(currentUserEmail)

      // se usuário já contou aquele produto/local ou se já é recontagem → não mostrar
      const forbiddenKeys = new Set<string>();
      /*if (currentUserEmail) {
        for (const item of divergent) {
          const compare = list.filter((compara) => compara.codProd === item.codProd);
          for (const same of compare) {
            if (same.userEmail === currentUserEmail || same.recontagem) {
              forbiddenKeys.add(`${same.codProd}-${same.localizacao ?? ''}`);
            }
          }
          if (item.userEmail === currentUserEmail || item.recontagem) {
            forbiddenKeys.add(`${item.codProd}-${item.localizacao ?? ''}`);
          }
        }
      }*/

      const uniqueMap = new Map<string, InventoryItem>();
      for (const item of divergent) {
        const key = `${item.codProd}-${item.localizacao ?? ''}`;
        if (forbiddenKeys.has(key)) continue;
        if (!uniqueMap.has(key)) uniqueMap.set(key, item);
      }

      const finalList = Array.from(uniqueMap.values());

      setItems(finalList);
      setFiltered(finalList);
      setPage(0);
      setExpandedId(null);
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
  }, [LIST_URL, getHeaders, token]);

  useEffect(() => {
    if (token || API_TOKEN) fetchData();
  }, [fetchData, token, API_TOKEN]);

  useEffect(() => {
    const cod = filterCodProd.trim();
    const result = items.filter((item) => {
      if (cod && String(item.codProd) !== cod) return false;
      return true;
    });
    setFiltered(result);
    setPage(0);
  }, [filterCodProd, items]);

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

  const toggleRow = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  // ✅ handler Ajustar (atua no HISTÓRICO)
  // ✅ handler Ajustar: atualiza APENAS o histórico (Detalhes), sem mexer na lista principal
  const handleAjustar = async (inv: InventoryItem, diference: number) => {
    try {
      if (updatingId) return;

      setUpdatingId(inv.id);
      setErro(null);

      const resp = await fetch(INPLANT_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify({
          diference,
          codProd: inv.codProd,
          id: inv.id,
        }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao ajustar inventário (status ${resp.status})`);
  }

    const nowIso = new Date().toISOString();
    const codKey = String(inv.codProd);

    // ✅ atualiza só o histórico do produto (isso muda as cores sem resetar paginação da lista)
    setHistoryByCodProd((prev) => {
      const next = { ...prev };
      const arr = next[codKey] ? [...next[codKey]] : [];

      next[codKey] = arr.map((it) => {
        if (it.id === inv.id) return { ...it, inplantedDate: nowIso };
        // mesmos codProd recebem RESET_DATE (sua regra antiga)
        return { ...it, inplantedDate: RESET_DATE };
      });

      return next;
    });

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
                    Produtos com contagem divergente
                  </Typography>

                  <Tooltip arrow placement="right" title={ColorsHelp}>
                    <InfoOutlinedIcon sx={{ color: 'text.secondary', cursor: 'pointer', fontSize: 20 }} />
                  </Tooltip>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Clique em <b>Detalhes</b> para ver o histórico de contagens do produto (com cores + Ajustar).
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button variant="outlined" onClick={fetchData} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : 'Atualizar lista'}
                </Button>
              </Box>
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
                    Nenhuma contagem divergente encontrada para os critérios atuais.
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
                              onClick={() => toggleSortBy('numCounts')}
                            >
                              Número de contagens
                              {orderBy === 'numCounts' ? (orderDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                            </TableCell>

                            <TableCell align="center">Detalhes</TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {pageRows.map((inv) => {
                            const history = historyByCodProd[String(inv.codProd)] ?? [];

                            return (
                              <React.Fragment key={inv.id}>
                                {/* ✅ linha principal sem cor/botão ajustar */}
                                <TableRow sx={{ '&:hover': { backgroundColor: 'rgba(0,0,0,0.03)' } }}>
                                  <TableCell>{inv.localizacao ?? '-'}</TableCell>
                                  <TableCell>{inv.codProd}</TableCell>
                                  <TableCell>{inv.descricao ?? '-'}</TableCell>
                                  <TableCell align="center">
                                    {countsByCodProd[String(inv.codProd)] ?? 0}
                                  </TableCell>

                                  <TableCell align="center">
                                    <Button size="small" variant="outlined" onClick={() => toggleRow(inv.id)}>
                                      {expandedId === inv.id ? 'Fechar' : 'Detalhes'}
                                    </Button>
                                  </TableCell>
                                </TableRow>

                                {/* ✅ detalhes: AQUI entram cores + reservado + ajustar */}
                                {expandedId === inv.id && (
                                  <TableRow>
                                    <TableCell colSpan={5} sx={{ backgroundColor: 'background.default' }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                          Histórico de contagens — produto {inv.codProd}
                                        </Typography>

                                        <Tooltip arrow placement="right" title={ColorsHelp}>
                                          <InfoOutlinedIcon sx={{ color: 'text.secondary', cursor: 'pointer', fontSize: 18 }} />
                                        </Tooltip>
                                      </Box>

                                      {history.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary">
                                          Nenhum histórico encontrado.
                                        </Typography>
                                      ) : (
                                        <TableContainer
                                          component={Paper}
                                          elevation={0}
                                          sx={{
                                            border: (t) => `1px solid ${t.palette.divider}`,
                                            borderRadius: 2,
                                            overflowX: 'auto',
                                            backgroundColor: 'background.paper',
                                          }}
                                        >
                                          <Table size="small" aria-label="historico" sx={{ minWidth: 1100 }}>
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
                                                <TableCell>Data</TableCell>
                                                <TableCell>Localização</TableCell>
                                                <TableCell>Contador</TableCell>
                                                <TableCell align="right">Contagem</TableCell>
                                                <TableCell align="right">Estoque sistema</TableCell>
                                                <TableCell align="right">Reservado</TableCell>
                                                <TableCell align="right">Diferença</TableCell>
                                                <TableCell align="center">Recontagem?</TableCell>
                                                <TableCell align="center">Ação</TableCell>
                                              </TableRow>
                                            </TableHead>

                                            <TableBody>
                                              {history.map((h) => {
                                                const reservado = getReservado(h);
                                                const { bg, precisaAjustar, diff } = getRowVisual(h);
                                                const isRecontagem = !!h.recontagem;

                                                return (
                                                  <TableRow
                                                    key={h.id}
                                                    sx={{
                                                      background: isRecontagem
                                                        ? `linear-gradient(90deg, #E1BEE7 0%, #E1BEE7 25%, ${bg} 60%, ${bg} 100%)`
                                                        : bg,
                                                      '& td': {
                                                        fontWeight: isRecontagem ? 700 : 'inherit',
                                                      },
                                                      '&:hover': { filter: 'brightness(0.97)' },
                                                    }}
                                                  >
                                                    <TableCell>{formatDateTime(h.createdAt)}</TableCell>
                                                    <TableCell>{h.localizacao ?? '-'}</TableCell>
                                                    <TableCell>{h.userEmail ?? '-'}</TableCell>
                                                    <TableCell align="right">{h.count}</TableCell>
                                                    <TableCell align="right">{h.inStock}</TableCell>
                                                    <TableCell align="right">{reservado}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                      {diff}
                                                    </TableCell>
                                                    <TableCell align="center">{h.recontagem ? 'Sim' : 'Não'}</TableCell>

                                                    <TableCell align="center" sx={{ p: 0.5 }}>
                                                      {precisaAjustar && (
                                                        <Button
                                                          size="small"
                                                          variant="contained"
                                                          onClick={() => handleAjustar(h, diff)}
                                                          disabled={updatingId === h.id}
                                                          sx={{
                                                            minWidth: 72,
                                                            px: 1,
                                                            py: 0.25,
                                                            lineHeight: 1.4,
                                                            textTransform: 'none',
                                                          }}
                                                        >
                                                          {updatingId === h.id ? (
                                                            <CircularProgress size={14} />
                                                          ) : (
                                                            'Ajustar'
                                                          )}
                                                        </Button>
                                                      )}
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              })}
                                            </TableBody>
                                          </Table>
                                        </TableContainer>
                                      )}
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
