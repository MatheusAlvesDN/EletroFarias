'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  Typography,
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
  Collapse,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

// ---------- Tipos baseados no Prisma ----------

type PedidoItem = {
  id: number;
  codProd?: number | null;
  descricao?: string | null;
  quantidade?: number | null;
  quantidadeSeparada?: number | null;
};

type Pedido = {
  id: number;
  numero?: string | null;       // ajuste se no seu modelo for outro (ex: nunota)
  clienteNome?: string | null;  // idem
  status?: string | null;
};

type PedidoSeparador = {
  id: number;
  pedidoId: number;
  separador: string;
  area: string;
  createdAt: string;
  order?: Pedido | null;
  items?: PedidoItem[];
};

// ---------- Helpers ----------

function decodeJwtEmail(token: string | null): string | null {
  if (!token) return null;
  try {
    const [, payloadBase64] = token.split('.');
    if (!payloadBase64) return null;
    const json = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(json);
    // Tenta alguns nomes comuns de claim
    return data.email || data.userEmail || data.username || null;
  } catch {
    return null;
  }
}

const CARD_SX = {
  maxWidth: 1200,
  mx: 'auto',
  mt: 6,
  borderRadius: 2,
  boxShadow: 0,
  border: 1,
  backgroundColor: 'background.paper',
} as const;

const SECTION_TITLE_SX = { fontWeight: 700, mb: 1 } as const;

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

// ----------------------------------------------------

export default function PedidosSeparadorPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [pedidos, setPedidos] = useState<PedidoSeparador[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const [expandedId, setExpandedId] = useState<number | null>(null);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/getPedidoSeparador`
        : `/sync/getPedidoSeparador`,
    [API_BASE]
  );

  // ---------- Autenticação & e-mail do separador ----------
  useEffect(() => {
    const t =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('authToken')
        : null;

    if (!t && !API_TOKEN) {
      // Sem token nenhum → manda pro login
      router.replace('/');
      return;
    }

    setToken(t ?? null);

    // tenta extrair o e-mail do JWT
    const emailFromToken = decodeJwtEmail(t ?? null);
    if (emailFromToken) {
      setUserEmail(emailFromToken);
    } else if (API_TOKEN) {
      // fallback: se você estiver usando API_TOKEN pra debug
      setUserEmail('debug@local');
    }
  }, [router, API_TOKEN]);

  // ---------- Carregar pedidos do separador ----------
  const fetchPedidos = useCallback(async () => {
    if (!userEmail) return;

    try {
      setLoading(true);
      setErro(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const qs = new URLSearchParams({ userEmail }).toString();
      const resp = await fetch(`${LIST_URL}?${qs}`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(
          msg || `Falha ao carregar pedidos do separador (status ${resp.status})`
        );
      }

      const data = (await resp.json()) as PedidoSeparador[] | null;
      const list = Array.isArray(data) ? data : [];

      // ordena por createdAt desc
      list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setPedidos(list);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Erro ao carregar pedidos do separador.';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, token, API_TOKEN, userEmail]);

  useEffect(() => {
    if (userEmail) {
      fetchPedidos();
    }
  }, [userEmail, fetchPedidos]);

  const handleToggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Botão flutuante: sidebar (mobile) */}
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
            {/* Cabeçalho */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 2,
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={SECTION_TITLE_SX}>
                  Meus pedidos para separação
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Separador: <strong>{userEmail ?? '...'}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pedidos carregados: <strong>{pedidos.length}</strong>
                </Typography>
              </Box>

              <Button
                variant="outlined"
                onClick={fetchPedidos}
                disabled={loading || !userEmail}
              >
                {loading ? <CircularProgress size={18} /> : 'Atualizar lista'}
              </Button>
            </Box>

            {erro && (
              <Typography color="error" sx={{ mb: 2 }}>
                {erro}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Lista de pedidos */}
            {loading && pedidos.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : pedidos.length === 0 ? (
              <Typography sx={{ color: 'text.secondary' }}>
                Nenhum pedido pendente de separação para o seu usuário.
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
                  backgroundColor: 'background.paper',
                  maxWidth: '100%',
                }}
              >
                <Table
                  size="small"
                  stickyHeader
                  aria-label="pedidos-separador"
                  sx={{ minWidth: 800 }}
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
                      <TableCell />
                      <TableCell>Pedido</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Área</TableCell>
                      <TableCell>Separador</TableCell>
                      <TableCell align="right">Qtd. Itens</TableCell>
                      <TableCell>Data criação</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pedidos.map((p) => {
                      const isExpanded = expandedId === p.id;
                      const itens = p.items ?? [];
                      const pedidoNum =
                        p.order?.numero ?? `#${p.pedidoId.toString().padStart(6, '0')}`;
                      const clienteNome =
                        p.order?.clienteNome ?? '(cliente não informado)';
                      const status = p.order?.status ?? 'PENDENTE';
                      const created =
                        p.createdAt ? dateFormatter.format(new Date(p.createdAt)) : '-';

                      return (
                        <React.Fragment key={p.id}>
                          <TableRow
                            sx={{
                              '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' },
                            }}
                          >
                            <TableCell width={48}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleExpand(p.id)}
                              >
                                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                            </TableCell>
                            <TableCell>{pedidoNum}</TableCell>
                            <TableCell>{clienteNome}</TableCell>
                            <TableCell>{p.area}</TableCell>
                            <TableCell>{p.separador}</TableCell>
                            <TableCell align="right">{itens.length}</TableCell>
                            <TableCell>{created}</TableCell>
                            <TableCell>{status}</TableCell>
                          </TableRow>

                          {/* Linha de detalhes (itens) */}
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              sx={{ p: 0, borderBottom: 'none' }}
                            >
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ mb: 1, fontWeight: 600 }}
                                  >
                                    Itens do pedido
                                  </Typography>

                                  {itens.length === 0 ? (
                                    <Typography
                                      variant="body2"
                                      sx={{ color: 'text.secondary' }}
                                    >
                                      Nenhum item carregado para este pedido.
                                    </Typography>
                                  ) : (
                                    <TableContainer
                                      component={Paper}
                                      elevation={0}
                                      sx={{
                                        border: (t) =>
                                          `1px solid ${t.palette.divider}`,
                                        borderRadius: 2,
                                      }}
                                    >
                                      <Table
                                        size="small"
                                        aria-label={`itens-pedido-${p.id}`}
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
                                            <TableCell align="right">
                                              Qtde. Pedido
                                            </TableCell>
                                            <TableCell align="right">
                                              Qtde. Separada
                                            </TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {itens.map((item) => (
                                            <TableRow key={item.id}>
                                              <TableCell>
                                                {item.codProd ?? '-'}
                                              </TableCell>
                                              <TableCell>
                                                {item.descricao ?? '-'}
                                              </TableCell>
                                              <TableCell align="right">
                                                {item.quantidade ?? 0}
                                              </TableCell>
                                              <TableCell align="right">
                                                {item.quantidadeSeparada ?? 0}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  )}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen && !!erro}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {erro}
        </Alert>
      </Snackbar>
    </Box>
  );
}
