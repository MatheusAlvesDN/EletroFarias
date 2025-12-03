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
  inplantedDate: string | null;   // agora permite null
  createdAt: string;              // usado para ordenação inicial
  descricao?: string | null;
  userEmail?: string | null;
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
  const [showOnlyPendentes, setShowOnlyPendentes] = useState(false); // NOVO: listar só pendentes

  // PAGINAÇÃO
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  // ORDENAÇÃO
  const [orderBy, setOrderBy] = useState<OrderBy>('codProd');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');
  const [hasUserSorted, setHasUserSorted] = useState(false); // controla se o usuário já clicou para ordenar

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
      router.replace('/'); // sem login → volta pra tela de login
      return;
    }
    setToken(t);
  }, [router]);

  // Base da API
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/getinventoryList`
        : `/sync/getinventoryList`,
    [API_BASE]
  );

  // endpoint para ajustar inventário (AGORA: inplantCount)
  const INPLANT_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/inplantCount`
        : `/sync/inplantCount`,
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

  // 🔢 CONTAGEM DE CÓDIGOS DE PRODUTO DISTINTOS (NO INVENTORY)
  const uniqueCodProdCount = useMemo(
    () => new Set(items.map((i) => i.codProd)).size,
    [items]
  );

  // Carrega lista
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);
      setHasUserSorted(false); // ao recarregar, volta para ordenação padrão por createdAt

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

      // ordena por createdAt desc: mais recentes primeiro
      list = list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setItems(list);
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
    if (token || API_TOKEN) {
      fetchData();
    }
  }, [fetchData, token, API_TOKEN]);

  // Filtro por código EXATO + apenas pendentes (onde o botão Ajustar estaria disponível)
  useEffect(() => {
    const cod = filterCodProd.trim();

    const result = items.filter((item) => {
      // filtro por código exato
      if (cod && String(item.codProd) !== cod) return false;

      if (!showOnlyPendentes) return true;

      // mesma lógica de "precisaAjustar"
      const diff = item.count - item.inStock;
      const dateStr = item.inplantedDate === PRIMAL_DATE;
      const precisaAjustar = dateStr && diff !== 0;

      return precisaAjustar;
    });

    setFiltered(result);
    setPage(0);
  }, [filterCodProd, items, showOnlyPendentes]);

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

  // handler de troca de página
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Ordenação manual (quando usuário clica no header)
  const handleSort = (field: OrderBy) => {
    setHasUserSorted(true); // a partir daqui, passamos a respeitar a ordenação escolhida pelo usuário
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
    // enquanto o usuário não clicar em nada, mantemos a ordem original (por createdAt desc)
    if (!hasUserSorted) {
      return filtered;
    }

    const arr = [...filtered];

    return arr.sort((a, b) => {
      const diffA = a.count - a.inStock;
      const diffB = b.count - b.inStock;

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

      let cmp: number;
      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB), 'pt-BR');
      }

      return orderDirection === 'asc' ? cmp : -cmp;
    });
  }, [filtered, orderBy, orderDirection, hasUserSorted]);

  // fatia os resultados para a página atual
  const pageRows = sorted.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  // Botão "Ajustar":
  // - linha clicada → inplantedDate = hoje
  // - demais linhas com mesmo codProd → inplantedDate = RESET_DATE
  // (no backend, agora via rota /sync/inplantCount)
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
        body: JSON.stringify({
          diference,
          codProd: inv.codProd,
          id: inv.id,
        }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(
          msg || `Falha ao ajustar inventário (status ${resp.status})`
        );
      }

      const nowIso = new Date().toISOString();

      setItems((prev) =>
        prev.map((item) => {
          if (item.id === inv.id) {
            // este registro vira "ajustado hoje"
            return { ...item, inplantedDate: nowIso };
          }
          if (item.codProd === inv.codProd) {
            // demais registros do mesmo produto recebem a data "reset"
            return { ...item, inplantedDate: RESET_DATE };
          }
          return item;
        })
      );

      setSnackbarMsg('Atualizado');
      setSnackbarOpen(true);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Erro ao ajustar inventário.';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    } finally {
      setUpdatingId(null);
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
          p: { xs: 2, sm: 5 }, // padding menor no mobile
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
              {/* Título + contagem de itens distintos */}
              <Box>
                <Typography variant="h6" sx={SECTION_TITLE_SX}>
                  Contagens de produtos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de produtos distintos no inventário: {uniqueCodProdCount}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={fetchData}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={18} /> : 'Atualizar lista'}
                </Button>

                {/* BOTÃO PARA LISTAR APENAS PENDENTES */}
                <Button
                  variant={showOnlyPendentes ? 'contained' : 'outlined'}
                  color="warning"
                  onClick={() => setShowOnlyPendentes((prev) => !prev)}
                >
                  {showOnlyPendentes
                    ? 'Mostrar todas as contagens'
                    : 'Mostrar apenas pendentes'}
                </Button>
              </Box>
            </Box>

            {/* Filtro (apenas por código EXATO) */}
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

            {/* LEGENDA DE CORES */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: 0.5,
                    bgcolor: '#EA9999', // Vermelho
                    border: '1px solid rgba(0,0,0,0.2)',
                  }}
                />
                <Typography variant="body2">
                  Vermelho = Produtos a menos na contagem
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: 0.5,
                    bgcolor: '#FFE599', // Amarelo
                    border: '1px solid rgba(0,0,0,0.2)',
                  }}
                />
                <Typography variant="body2">
                  Amarelo = Produtos a mais na contagem
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: 0.5,
                    bgcolor: '#B6D7A8', // Verde
                    border: '1px solid rgba(0,0,0,0.2)',
                  }}
                />
                <Typography variant="body2">
                  Verde = Contagem igual estoque
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: 0.5,
                    bgcolor: '#9FC5E8', // Azul
                    border: '1px solid rgba(0,0,0,0.2)',
                  }}
                />
                <Typography variant="body2">
                  Azul = Realizada alteração em sistema
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: 0.5,
                    bgcolor: '#D9D9D9', // Cinza
                    border: '1px solid rgba(0,0,0,0.2)',
                  }}
                />
                <Typography variant="body2">
                  Cinza = Item alterado com base em outra contagem
                </Typography>
              </Box>
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
                    Nenhuma contagem encontrada.
                  </Typography>
                ) : (
                  <>
                    <TableContainer
                      component={Paper}
                      elevation={0}
                      sx={{
                        border: (t) => `1px solid ${t.palette.divider}`,
                        borderRadius: 2,
                        overflowX: 'auto',        // scroll horizontal no mobile
                        overflowY: 'hidden',
                        backgroundColor: 'background.paper',
                        maxWidth: '100%',
                      }}
                    >
                      <Table
                        size="small"
                        stickyHeader
                        aria-label="lista-contagens"
                        sx={{
                          minWidth: 700,        // força largura pra ter o que rolar
                        }}
                      >
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
                            <TableCell onClick={() => handleSort('codProd')}>
                              Cód. Produto
                            </TableCell>
                            <TableCell onClick={() => handleSort('descricao')}>
                              Descrição
                            </TableCell>
                            {/* COLUNA CONTADOR */}
                            <TableCell>
                              Contador
                            </TableCell>
                            <TableCell align="right" onClick={() => handleSort('count')}>
                              Contagem
                            </TableCell>
                            <TableCell align="right" onClick={() => handleSort('inStock')}>
                              Estoque sistema
                            </TableCell>
                            <TableCell align="right" onClick={() => handleSort('diff')}>
                              Diferença
                            </TableCell>
                            {/* célula com pouco padding */}
                            <TableCell align="center" sx={{ p: 0.5 }}>
                              Ação
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pageRows.map((inv) => {
                            const diff = inv.count - inv.inStock;

                            const dateStr = inv.inplantedDate === PRIMAL_DATE;

                            let rowBg: string;

                            if (dateStr) {
                              // esquema antigo baseado na diferença
                              if (diff === 0) {
                                rowBg = '#B6D7A8'; // verde
                              } else if (diff > 0) {
                                rowBg = '#FFE599'; // amarelo
                              } else {
                                rowBg = '#EA9999'; // vermelho
                              }
                            } else if (inv.inplantedDate === RESET_DATE) {
                              rowBg = '#D9D9D9'; // cinza
                            } else {
                              rowBg = '#9FC5E8'; // ciano/azul claro
                            }

                            const precisaAjustar = dateStr && diff !== 0;

                            return (
                              <TableRow
                                key={inv.id}
                                sx={{
                                  backgroundColor: rowBg,
                                  '&:hover': {
                                    filter: 'brightness(0.97)',
                                  },
                                }}
                              >
                                <TableCell>
                                  {inv.codProd}
                                </TableCell>
                                <TableCell>
                                  {inv.descricao ?? '-'}
                                </TableCell>
                                {/* CÉLULA CONTADOR COM userEmail */}
                                <TableCell>
                                  {inv.userEmail ?? '-'}
                                </TableCell>
                                <TableCell align="right">
                                  {numberFormatter.format(inv.count)}
                                </TableCell>
                                <TableCell align="right">
                                  {numberFormatter.format(inv.inStock)}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {numberFormatter.format(diff)}
                                </TableCell>
                                {/* célula com botão compacto */}
                                <TableCell
                                  align="center"
                                  sx={{ p: 0.5 }}
                                >
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
                                      {updatingId === inv.id ? (
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

                    {/* Paginação (10 por página) */}
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

      {/* Snackbar */}
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
