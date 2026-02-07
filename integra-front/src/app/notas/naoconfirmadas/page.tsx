'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  Chip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

type NotaNaoConfirmada = {
  NUNOTA: number | string;
  NUMNOTA?: number | string | null;
  SERIENOTA?: string | null;
  CODEMP?: number | string | null;
  CODPARC?: number | string | null;
  CODTIPOPER?: number | string | null;
  DTNEG?: string | null;
  DTENTSAI?: string | null;
  CONFIRMADA?: string | null; // "N"
};

const rowsPerPage = 10;

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

export default function NotasNaoConfirmadasPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [data, setData] = useState<NotaNaoConfirmada[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  // ✅ Ajuste este endpoint para o seu backend (controller que chama listarNotasNaoConfirmadas)
  const LIST_URL = useMemo(() => {
    // exemplo: GET /sync/notas-nao-confirmadas
    return API_BASE ? `${API_BASE}/sync/getNotasNaoConfirmadas` : `/sync/getNotasNaoConfirmadas`;
  }, []);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErro(null);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const resp = await fetch(LIST_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao buscar notas (status ${resp.status})`);
      }

      const json = (await resp.json()) as NotaNaoConfirmada[] | { data?: NotaNaoConfirmada[] };

      const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      setData(list);
      setPage(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar notas.';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return data;

    return data.filter((n) => {
      const nunota = String(n.NUNOTA ?? '').toLowerCase();
      const numnota = String(n.NUMNOTA ?? '').toLowerCase();
      const serie = String(n.SERIENOTA ?? '').toLowerCase();
      const codparc = String(n.CODPARC ?? '').toLowerCase();
      const codtipoper = String(n.CODTIPOPER ?? '').toLowerCase();

      // busca simples: NUNOTA, NUMNOTA, SERIE, CODPARC, CODTIPOPER
      return (
        nunota === q ||
        numnota === q ||
        serie === q ||
        codparc === q ||
        codtipoper === q
      );
    });
  }, [data, filter]);

  const sorted = useMemo(() => {
    // ordena por DTNEG desc (se existir)
    const arr = [...filtered];
    return arr.sort((a, b) => {
      const ta = a.DTNEG ? new Date(a.DTNEG).getTime() : 0;
      const tb = b.DTNEG ? new Date(b.DTNEG).getTime() : 0;
      return tb - ta;
    });
  }, [filtered]);

  const pageRows = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const formatDate = (v?: string | null) => {
    if (!v) return '-';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleString('pt-BR');
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
        <Card
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            mt: 6,
            borderRadius: 2,
            boxShadow: 0,
            border: 1,
            backgroundColor: 'background.paper',
          }}
        >
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
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Notas não confirmadas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Listando registros da TGFCAB com <b>CONFIRMADA = &quot;N&quot;</b>.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button variant="outlined" onClick={fetchData} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : 'Atualizar'}
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2, mb: 2 }}>
              <TextField
                label="Buscar por NUNOTA / NUMNOTA / SÉRIE / CODPARC / TOP"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
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
                    Nenhuma nota não confirmada encontrada.
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
                      <Table size="small" stickyHeader aria-label="notas-nao-confirmadas" sx={{ minWidth: 900 }}>
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
                            <TableCell>NUNOTA</TableCell>
                            <TableCell>NUMNOTA</TableCell>
                            <TableCell>Série</TableCell>
                            <TableCell>Empresa</TableCell>
                            <TableCell>Parceiro</TableCell>
                            <TableCell>TOP</TableCell>
                            <TableCell>DTNEG</TableCell>
                            <TableCell>DTENTSAI</TableCell>
                            <TableCell>Confirmada</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pageRows.map((n) => (
                            <TableRow key={String(n.NUNOTA)}>
                              <TableCell>{n.NUNOTA ?? '-'}</TableCell>
                              <TableCell>{n.NUMNOTA ?? '-'}</TableCell>
                              <TableCell>{n.SERIENOTA ?? '-'}</TableCell>
                              <TableCell>{n.CODEMP ?? '-'}</TableCell>
                              <TableCell>{n.CODPARC ?? '-'}</TableCell>
                              <TableCell>{n.CODTIPOPER ?? '-'}</TableCell>
                              <TableCell>{formatDate(n.DTNEG)}</TableCell>
                              <TableCell>{formatDate(n.DTENTSAI)}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={String(n.CONFIRMADA ?? 'N')}
                                  variant="outlined"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <TablePagination
                      component="div"
                      count={sorted.length}
                      page={page}
                      onPageChange={(_, newPage) => setPage(newPage)}
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
}
