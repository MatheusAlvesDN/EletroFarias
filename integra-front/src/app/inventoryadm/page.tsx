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

  // PAGINAÇÃO
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  // ORDENAÇÃO
  const [orderBy, setOrderBy] = useState<OrderBy>('codProd');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');

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

  // endpoint para atualizar (ajustar) inventário
  const UPDATE_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/updateInventoryDate`
        : `/sync/updateInventoryDate`,
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

  // Carrega lista
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

      const list = Array.isArray(data) ? data : [];

      // se quiser manter algum sort inicial, pode deixar, mas não é obrigatório
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

  // Filtro por código EXATO
  useEffect(() => {
    const cod = filterCodProd.trim();
    const result = items.filter((item) => {
      if (!cod) return true;
      return String(item.codProd) === cod;
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

  // handler de troca de página
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Ordenação
  const handleSort = (field: OrderBy) => {
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
  }, [filtered, orderBy, orderDirection]);

  // fatia os resultados para a página atual
  const pageRows = sorted.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  // Botão "Ajustar":
  // - linha clicada → inplantedDate = hoje
  // - demais linhas com mesmo codProd → inplantedDate = RESET_DATE
  const handleUpdateRow = async (inv: InventoryItem) => {
    try {
      setUpdatingId(inv.id);
      setErro(null);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(UPDATE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: inv.id,
          codProd: inv.codProd,
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
          p: 5,
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
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                gap: 2,
              }}
            >
              <Typography variant="h6" sx={SECTION_TITLE_SX}>
                Contagens de produtos
              </Typography>

              <Button
                variant="outlined"
                onClick={fetchData}
                disabled={loading}
              >
                {loading ? <CircularProgress size={18} /> : 'Atualizar lista'}
              </Button>
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

                {filtered.length === 0 ? (
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
                        overflow: 'hidden',
                        backgroundColor: 'background.paper',
                        maxWidth: '100%',
                      }}
                    >
                      <Table size="small" stickyHeader aria-label="lista-contagens">
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
                            <TableCell align="right" onClick={() => handleSort('count')}>
                              Contagem
                            </TableCell>
                            <TableCell align="right" onClick={() => handleSort('inStock')}>
                              Estoque sistema
                            </TableCell>
                            <TableCell align="right" onClick={() => handleSort('diff')}>
                              Diferença
                            </TableCell>
                            <TableCell>
                              Ação
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pageRows.map((inv) => {
                            const diff = inv.count - inv.inStock;

                            const dateStr = (inv.inplantedDate === PRIMAL_DATE);

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

                            // só pode “ajustar” se ainda não tem data
                            // e houver diferença (linhas amarelas/vermelhas)
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
                                <TableCell>
                                  {precisaAjustar && (
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={() => handleUpdateRow(inv)}
                                      disabled={updatingId === inv.id}
                                    >
                                      {updatingId === inv.id ? (
                                        <CircularProgress size={16} />
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
                      count={filtered.length}
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
