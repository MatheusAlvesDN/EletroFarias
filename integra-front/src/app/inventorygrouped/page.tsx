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
  location?: string | null; // <<< campo de localização, ex: "A-001"
};

const rowsPerPage = 10;

export default function Page() {
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

  useEffect(() => {
    const t =
      typeof window !== 'undefined'
        ? localStorage.getItem('authToken')
        : null;
    if (!t) {
      router.replace('/'); // sem login → volta pra tela de login
      return;
    }
    setToken(t);
  }, [router]);

  // Base da API
  const API_BASE = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? '',
    []
  );
  const API_TOKEN = useMemo(
    () => process.env.NEXT_PUBLIC_API_TOKEN ?? '',
    []
  );

  const LIST_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/getinventoryList`
        : `/sync/getinventoryList`,
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

  // helper: extrai apenas a parte numérica da localização
  // "A-001" -> 1 ; "B-12" -> 12 ; null/sem número -> Number.MAX_SAFE_INTEGER (vai pro fim)
  const parseLocationNumber = (loc?: string | null): number => {
    if (!loc) return Number.MAX_SAFE_INTEGER;
    const match = loc.match(/\d+/g);
    if (!match) return Number.MAX_SAFE_INTEGER;
    const joined = match.join(''); // se quiser juntar tudo, tipo "A-01-02" -> "0102"
    const n = Number.parseInt(joined, 10);
    return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
  };

  // Carrega lista
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN)
        headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(LIST_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(
          msg ||
            `Falha ao carregar inventário (status ${resp.status})`
        );
      }

      const data = (await resp.json()) as InventoryItem[] | null;

      let list = Array.isArray(data) ? data : [];

      // 1) mantém ordenação original por createdAt desc (só pra consistência)
      list = list.sort((a, b) => {
        const ta = a.createdAt
          ? new Date(a.createdAt).getTime()
          : 0;
        const tb = b.createdAt
          ? new Date(b.createdAt).getTime()
          : 0;
        return tb - ta;
      });

      // 2) filtra só itens com contagem divergente
      list = list.filter((item) => item.count !== item.inStock);

      setItems(list);
      setPage(0);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Erro ao carregar inventário';
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

  // Filtro por código EXATO, mantendo apenas divergentes
  useEffect(() => {
    const cod = filterCodProd.trim();

    const result = items.filter((item) => {
      if (cod && String(item.codProd) !== cod) return false;
      return true; // já são só divergentes
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

  // Ordenação fixa: sempre por localização numérica
  const sorted = useMemo(() => {
    const arr = [...filtered];
    return arr.sort((a, b) => {
      const la = parseLocationNumber(a.location ?? a.descricao ?? '');
      const lb = parseLocationNumber(b.location ?? b.descricao ?? '');
      // se der empate, ordena por codProd só pra estabilizar
      if (la === lb) return a.codProd - b.codProd;
      return la - lb;
    });
  }, [filtered]);

  // fatia os resultados para a página atual
  const pageRows = sorted.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
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

      <SidebarMenu
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

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
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: {
                  xs: 'flex-start',
                  sm: 'center',
                },
                mb: 2,
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={SECTION_TITLE_SX}>
                  Produtos com contagem divergente
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Listando apenas itens onde a contagem difere do
                  estoque do sistema, ordenados pela localização
                  (valor numérico).
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Button
                  variant="outlined"
                  onClick={fetchData}
                  disabled={loading}
                >
                  {loading ? (
                    <CircularProgress size={18} />
                  ) : (
                    'Atualizar lista'
                  )}
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
                onChange={(e) =>
                  setFilterCodProd(e.target.value)
                }
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
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
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

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
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
            </Box>

            {erro && (
              <Typography color="error" sx={{ mb: 2 }}>
                {erro}
              </Typography>
            )}

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
              <>
                <Divider sx={{ my: 2 }} />

                {sorted.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>
                    Nenhuma contagem divergente encontrada.
                  </Typography>
                ) : (
                  <>
                    <TableContainer
                      component={Paper}
                      elevation={0}
                      sx={{
                        border: (t) =>
                          `1px solid ${t.palette.divider}`,
                        borderRadius: 2,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        backgroundColor: 'background.paper',
                        maxWidth: '100%',
                      }}
                    >
                      <Table
                        size="small"
                        stickyHeader
                        aria-label="lista-contagens-divergentes"
                        sx={{
                          minWidth: 700,
                        }}
                      >
                        <TableHead>
                          <TableRow
                            sx={{
                              '& th': {
                                backgroundColor: (t) =>
                                  t.palette.grey[50],
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              },
                            }}
                          >
                            <TableCell>Cód. Produto</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell>Localização</TableCell>
                            <TableCell>Contador</TableCell>
                            <TableCell align="right">
                              Contagem
                            </TableCell>
                            <TableCell align="right">
                              Estoque sistema
                            </TableCell>
                            <TableCell align="right">
                              Diferença
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pageRows.map((inv) => {
                            const diff =
                              inv.count - inv.inStock;

                            let rowBg: string;
                            if (diff > 0) {
                              rowBg = '#FFE599'; // amarelo
                            } else if (diff < 0) {
                              rowBg = '#EA9999'; // vermelho
                            } else {
                              rowBg = '#FFFFFF'; // (não deve ocorrer aqui)
                            }

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
                                <TableCell>
                                  {inv.location ?? '-'}
                                </TableCell>
                                <TableCell>
                                  {inv.userEmail ?? '-'}
                                </TableCell>
                                <TableCell align="right">
                                  {numberFormatter.format(inv.count)}
                                </TableCell>
                                <TableCell align="right">
                                  {numberFormatter.format(
                                    inv.inStock
                                  )}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {numberFormatter.format(diff)}
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
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
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
