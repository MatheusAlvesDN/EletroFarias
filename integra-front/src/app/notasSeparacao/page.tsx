'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Typography,
  Button,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

type NotaSeparacao = {
  NUNOTA: number;
  CODPARC: number;
  NUMNOTA: number;
  STATUSNOTA: string;
  STATUSCONFERENCIA: string;
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

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const [notas, setNotas] = useState<NotaSeparacao[]>([]);

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  // auth
  useEffect(() => {
    const t =
      typeof window !== 'undefined'
        ? localStorage.getItem('authToken')
        : null;
    if (!t) {
      setToken(null);
      return;
    }
    setToken(t);
  }, [router]);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const GET_NOTA_SEPARACAO_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/getNotaSeparacao`
        : `/sync/getNotaSeparacao`,
    [API_BASE]
  );

  const fetchNotas = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);
      setOkMsg(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(GET_NOTA_SEPARACAO_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(
          txt || `Falha ao buscar notas (status ${resp.status})`
        );
      }

      const data = (await resp.json()) as NotaSeparacao[];

      setNotas(Array.isArray(data) ? data : []);
      setOkMsg(`Encontradas ${data.length} notas.`);
      setSnackbarOpen(true);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Erro ao carregar notas de separação';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [GET_NOTA_SEPARACAO_URL, token, API_TOKEN]);

  useEffect(() => {
    fetchNotas();
  }, [fetchNotas]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* botão sidebar */}
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
        <IconButton onClick={() => setSidebarOpen((v) => !v)} size="large">
          <MenuIcon />
        </IconButton>
      </Box>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* main */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: 0,
          backgroundColor: '#f0f4f8',
          height: '100vh',
          overflowY: 'auto',
          p: { xs: 2, sm: 5 },
        }}
      >
        <Card sx={CARD_SX}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={SECTION_TITLE_SX}>
                  Notas de Separação
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Endpoint: <b>/sync/getNotaSeparacao</b>
                </Typography>
              </Box>

              <Button
                variant="outlined"
                onClick={fetchNotas}
                disabled={loading}
              >
                {loading ? <CircularProgress size={18} /> : 'Atualizar'}
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            {erro && (
              <Typography color="error" sx={{ mb: 2 }}>
                {erro}
              </Typography>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
              </Box>
            ) : notas.length === 0 ? (
              <Typography sx={{ color: 'text.secondary' }}>
                Nenhuma nota encontrada.
              </Typography>
            ) : (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  border: (t) => `1px solid ${t.palette.divider}`,
                  borderRadius: 2,
                }}
              >
                <Table size="small" stickyHeader>
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
                      <TableCell>CODPARC</TableCell>
                      <TableCell>Status Nota</TableCell>
                      <TableCell>Status Conferência</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {notas.map((n) => (
                      <TableRow key={n.NUNOTA}>
                        <TableCell>{n.NUNOTA}</TableCell>
                        <TableCell>{n.NUMNOTA}</TableCell>
                        <TableCell>{n.CODPARC}</TableCell>
                        <TableCell>{n.STATUSNOTA}</TableCell>
                        <TableCell>{n.STATUSCONFERENCIA}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={snackbarOpen && (!!erro || !!okMsg)}
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
          {erro || okMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
