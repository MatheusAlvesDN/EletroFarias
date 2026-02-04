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

type NotaNaoConfirmada = {
  nunota: string;        // idx 0 (único)
  numnota: string;       // idx 1
  status: string;        // idx 2
  codparc: string;       // idx 4
  codtipoper: string;    // idx 5
  dtneg: string;         // idx 6
  dt2: string;           // idx 7
  confirmada: string;    // idx 8 (L = não confirmada)
};

const rowsPerPage = 10;

const s = (v: unknown) => (v == null ? '' : String(v));

/**
 * Mapeamento correto:
 * 0 nunota
 * 1 numnota
 * 2 status
 * 4 codparc
 * 5 codtipoper
 * 6 dtneg
 * 7 dt2
 * 8 confirmada (L = não confirmada)
 */
const normalizeNotaFromArray = (row: unknown[]): NotaNaoConfirmada => ({
  nunota: s(row?.[0]),
  numnota: s(row?.[1]),
  status: s(row?.[2]),
  codparc: s(row?.[4]),
  codtipoper: s(row?.[5]),
  dtneg: s(row?.[6]),
  dt2: s(row?.[7]),
  confirmada: s(row?.[8]),
});

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);

  const [data, setData] = useState<NotaNaoConfirmada[]>([]);
  const [filtered, setFiltered] = useState<NotaNaoConfirmada[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  useEffect(() => {
    const t =
      typeof window !== 'undefined'
        ? localStorage.getItem('authToken')
        : null;

    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);
  }, [router]);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  // Ajuste para o seu endpoint real
  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getNotasNaoConfirmadas` : `/sync/getNotasNaoConfirmadas`),
    [API_BASE]
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(LIST_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao buscar notas (status ${resp.status})`);
      }

      const json = await resp.json();

      // suporta vários formatos de payload
      const rows: unknown[] =
        Array.isArray(json) ? json :
        Array.isArray(json?.data) ? json.data :
        Array.isArray(json?.notas) ? json.notas :
        Array.isArray(json?.responseBody) ? json.responseBody :
        Array.isArray(json?.result) ? json.result :
        [];

      const notas = rows
        .filter(Array.isArray)
        .map(normalizeNotaFromArray);

      // ✅ somente NÃO confirmadas: confirmada === 'L'
      //const naoConfirmadas = notas.filter(n => n.confirmada.trim().toUpperCase() === 'L' && n.codtipoper.trim().toUpperCase() === '601');

      const naoConfirmadas = notas;

      // ✅ dedup por NUNOTA (único)
      const unique = new Map<string, NotaNaoConfirmada>();
      for (const n of naoConfirmadas) {
        if (n.nunota) unique.set(n.nunota, n);
      }

      setData(Array.from(unique.values()));
      setPage(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar notas.';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
      setData([]);
      setPage(0);
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, token, API_TOKEN]);

  useEffect(() => {
    if (token || API_TOKEN) fetchData();
  }, [fetchData, token, API_TOKEN]);

  // filtro (nunota/numnota/top/parc/status/confirmada/data)
  useEffect(() => {
    const q = filter.trim().toUpperCase();
    if (!q) {
      setFiltered(data);
      setPage(0);
      return;
    }

    const out = data.filter(n => {
      return (
        n.nunota.toUpperCase() === q ||
        n.numnota.toUpperCase() === q ||
        n.codtipoper.toUpperCase() === q ||
        n.codparc.toUpperCase() === q ||
        n.status.toUpperCase() === q ||
        n.confirmada.toUpperCase() === q ||
        n.dtneg.toUpperCase().includes(q) ||
        n.dt2.toUpperCase().includes(q)
      );
    });

    setFiltered(out);
    setPage(0);
  }, [filter, data]);

  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
        <IconButton onClick={() => setSidebarOpen(v => !v)} aria-label="menu" size="large">
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
                  Notas não confirmadas (CONFIRMADA = L)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  NUNOTA é único e usado como chave.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button variant="outlined" onClick={fetchData} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : 'Atualizar'}
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr' }, gap: 2, mb: 2 }}>
              <TextField
                label="Buscar (NUNOTA / NUMNOTA / TOP / PARC / STATUS / CONFIRMADA / data)"
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

                {filtered.length === 0 ? (
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
                      <Table size="small" stickyHeader aria-label="lista-notas" sx={{ minWidth: 980 }}>
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
                            <TableCell>STATUS</TableCell>
                            <TableCell>CODPARC</TableCell>
                            <TableCell>TOP</TableCell>
                            <TableCell>DTNEG</TableCell>
                            <TableCell>DT2</TableCell>
                            <TableCell>CONFIRMADA</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pageRows.map((n) => (
                            <TableRow key={n.nunota}>
                              <TableCell>{n.nunota || '-'}</TableCell>
                              <TableCell>{n.numnota || '-'}</TableCell>
                              <TableCell>{n.status || '-'}</TableCell>
                              <TableCell>{n.codparc || '-'}</TableCell>
                              <TableCell>{n.codtipoper || '-'}</TableCell>
                              <TableCell>{n.dtneg || '-'}</TableCell>
                              <TableCell>{n.dt2 || '-'}</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>
                                {n.confirmada || '-'}
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
