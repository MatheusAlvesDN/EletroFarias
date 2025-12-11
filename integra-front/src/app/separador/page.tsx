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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

type PedidoSeparador = {
  id: string;
  numeroPedido: string;
  data: string;          // ISO string ou dd/MM/yyyy
  cliente: string;
  status: string;
  total: number;
  quantidadeItens: number;
  prioridade?: string | null;
  separadorEmail?: string | null;
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

// helper simples pra extrair email do JWT
function getEmailFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const [, payloadBase64] = token.split('.');
    if (!payloadBase64) return null;
    const json = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(json);
    return data.email ?? data.userEmail ?? null;
  } catch {
    return null;
  }
}

export default function PedidosSeparadorPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [pedidos, setPedidos] = useState<PedidoSeparador[]>([]);
  const [filtered, setFiltered] = useState<PedidoSeparador[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | string>('TODOS');

  // paginação
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  // snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // auth
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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
    setUserEmail(getEmailFromToken(t));
  }, [router]);

  // Base da API
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(
    () => process.env.NEXT_PUBLIC_API_TOKEN ?? '',
    []
  );

  const PEDIDOS_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/getPedidoSeparador`
        : `/sync/getPedidoSeparador`,
    [API_BASE]
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    []
  );

  const formatDate = (value: string) => {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return dateFormatter.format(d);
  };

  // Carrega pedidos do separador
  const fetchPedidos = useCallback(async () => {
    if (!token && !API_TOKEN) return;
    if (!userEmail) {
      setErro('Não foi possível identificar o usuário (email não encontrado no token).');
      setSnackbarMsg('Erro de autenticação do usuário.');
      setSnackbarOpen(true);
      return;
    }

    try {
      setLoading(true);
      setErro(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const url = `${PEDIDOS_URL}?userEmail=${encodeURIComponent(
        userEmail
      )}`;

      const resp = await fetch(url, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(
          msg ||
            `Falha ao carregar pedidos (status ${resp.status})`
        );
      }

      const data = (await resp.json()) as PedidoSeparador[] | null;
      const list = Array.isArray(data) ? data : [];

      // opcional: ordenar por prioridade/data
      const ordered = [...list].sort((a, b) => {
        // prioridade primeiro (se existir), depois data desc
        const pA = (a.prioridade ?? '').toString();
        const pB = (b.prioridade ?? '').toString();
        const cmpP = pA.localeCompare(pB, 'pt-BR');
        if (cmpP !== 0) return cmpP;

        const tA = a.data ? new Date(a.data).getTime() : 0;
        const tB = b.data ? new Date(b.data).getTime() : 0;
        return tB - tA;
      });

      setPedidos(ordered);
      setPage(0);
      setSnackbarMsg('Pedidos carregados com sucesso.');
      setSnackbarOpen(true);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Erro ao carregar pedidos do separador.';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [PEDIDOS_URL, token, API_TOKEN, userEmail]);

  useEffect(() => {
    if ((token || API_TOKEN) && userEmail) {
      fetchPedidos();
    }
  }, [fetchPedidos, token, API_TOKEN, userEmail]);

  // Filtros em memória
  useEffect(() => {
    const text = filterText.trim().toUpperCase();

    const result = pedidos.filter((p) => {
      // filtro texto: número do pedido OU cliente
      if (text) {
        const inNumero = (p.numeroPedido ?? '')
          .toString()
          .toUpperCase()
          .includes(text);
        const inCliente = (p.cliente ?? '')
          .toString()
          .toUpperCase()
          .includes(text);
        if (!inNumero && !inCliente) return false;
      }

      // filtro status
      if (filterStatus !== 'TODOS') {
        if ((p.status ?? '').toUpperCase() !== filterStatus.toUpperCase()) {
          return false;
        }
      }

      return true;
    });

    setFiltered(result);
    setPage(0);
  }, [filterText, filterStatus, pedidos]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const pageRows = filtered.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // pegar lista de status distintos pra combo
  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    pedidos.forEach((p) => {
      if (p.status) set.add(p.status);
    });
    return Array.from(set.values()).sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
  }, [pedidos]);

  const totalPedidos = filtered.length;
  const somaTotal = useMemo(
    () =>
      filtered.reduce(
        (acc, p) => acc + (Number(p.total) || 0),
        0
      ),
    [filtered]
  );
  const somaItens = useMemo(
    () =>
      filtered.reduce(
        (acc, p) => acc + (Number(p.quantidadeItens) || 0),
        0
      ),
    [filtered]
  );

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
            {/* Cabeçalho */}
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
                  Pedidos disponíveis para separação
                </Typography>
                {userEmail && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    Separador: <b>{userEmail}</b>
                  </Typography>
                )}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Pedidos filtrados: <b>{totalPedidos}</b> | Itens:{' '}
                  <b>{somaItens}</b> | Valor total:{' '}
                  <b>{numberFormatter.format(somaTotal)}</b>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={fetchPedidos}
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

            {/* Filtros */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '2fr 1fr',
                },
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                label="Buscar por número do pedido ou cliente"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                size="small"
                fullWidth
              />

              <FormControl size="small" fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  label="Status"
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(
                      e.target.value as typeof filterStatus
                    )
                  }
                >
                  <MenuItem value="TODOS">Todos</MenuItem>
                  {statusOptions.map((st) => (
                    <MenuItem key={st} value={st}>
                      {st}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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

                {filtered.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>
                    Nenhum pedido disponível para esse separador com
                    os filtros atuais.
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
                        aria-label="lista-pedidos-separador"
                        sx={{
                          minWidth: 900,
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
                            <TableCell>Nº Pedido</TableCell>
                            <TableCell>Data</TableCell>
                            <TableCell>Cliente</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Prioridade</TableCell>
                            <TableCell align="right">
                              Qtde Itens
                            </TableCell>
                            <TableCell align="right">
                              Valor total
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pageRows.map((p) => (
                            <TableRow
                              key={p.id}
                              sx={{
                                '&:hover': {
                                  backgroundColor: '#f5f5f5',
                                },
                              }}
                            >
                              <TableCell>{p.numeroPedido}</TableCell>
                              <TableCell>{formatDate(p.data)}</TableCell>
                              <TableCell>{p.cliente}</TableCell>
                              <TableCell>{p.status}</TableCell>
                              <TableCell>
                                {p.prioridade ?? '-'}
                              </TableCell>
                              <TableCell align="right">
                                {p.quantidadeItens}
                              </TableCell>
                              <TableCell align="right">
                                {numberFormatter.format(
                                  Number(p.total) || 0
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

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
