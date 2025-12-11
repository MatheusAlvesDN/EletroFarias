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

// shape do retorno de sync/getLogins (compatível com seu model Session)
type SessionItem = {
  id: string;
  userId: string;
  userEmail: string | null;
  lastSeen: string;
  expiresAt: string;
  active: boolean;
  createdAt: string;
};

const ROWS_PER_PAGE = 10;

// helper para formatar data bonitinha
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [filtered, setFiltered] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(ROWS_PER_PAGE);

  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  // auth: pega authToken do localStorage
  useEffect(() => {
    const t =
      typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      // se quiser forçar login:
      // router.replace('/');
      setToken(null);
      return;
    }
    setToken(t);
  }, [router]);

  // base da API
  const API_BASE = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? '',
    []
  );
  const API_TOKEN = useMemo(
    () => process.env.NEXT_PUBLIC_API_TOKEN ?? '',
    []
  );

  const LIST_SESSIONS_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/getLogins`
        : `/sync/getLogins`,
    [API_BASE]
  );

  // carregar sessões ativas
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setErro(null);
    setOkMsg(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(LIST_SESSIONS_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(
          txt || `Falha ao listar sessões (status ${resp.status})`
        );
      }

      const raw = (await resp.json()) as unknown;

      let arr: SessionItem[] = [];
      if (Array.isArray(raw)) {
        arr = raw as SessionItem[];
      } else if (raw && typeof raw === 'object') {
        const maybeItems = (raw as { items?: SessionItem[] }).items;
        if (Array.isArray(maybeItems)) arr = maybeItems;
      }

      // garante que só sessões ativas sejam exibidas
      const onlyActive = arr.filter((s) => s.active);

      setSessions(onlyActive);
      setOkMsg(`Encontradas ${onlyActive.length} sessões ativas.`);
      setSnackbarOpen(true);
      setPage(0);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Erro ao carregar sessões ativas';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [LIST_SESSIONS_URL, token, API_TOKEN]);

  useEffect(() => {
    if (token || API_TOKEN) {
      fetchSessions();
    }
  }, [fetchSessions, token, API_TOKEN]);

  // filtro por email ou userId
  useEffect(() => {
    const q = search.trim().toUpperCase();
    const result = sessions.filter((s) => {
      if (!q) return true;
      const email = (s.userEmail ?? '').toUpperCase();
      const id = s.userId.toUpperCase();
      return email.includes(q) || id.includes(q);
    });
    setFiltered(result);
    setPage(0);
  }, [search, sessions]);

  const pageRows = useMemo(
    () =>
      filtered.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [filtered, page, rowsPerPage]
  );

  const handleChangePage = (_: unknown, newPage: number) =>
    setPage(newPage);

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

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* botão flutuante do menu lateral */}
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
            {/* header */}
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
                  Sessões ativas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de sessões ativas: <b>{sessions.length}</b>
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  variant="outlined"
                  onClick={fetchSessions}
                  disabled={loading}
                >
                  {loading ? (
                    <CircularProgress size={18} />
                  ) : (
                    'Atualizar'
                  )}
                </Button>
              </Box>
            </Box>

            {/* filtro */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'center',
                mb: 2,
              }}
            >
              <TextField
                label="Pesquisar por e-mail ou userId"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                fullWidth
              />
            </Box>

            {erro && (
              <Typography color="error" sx={{ mb: 1 }}>
                {erro}
              </Typography>
            )}
            {okMsg && (
              <Typography color="success.main" sx={{ mb: 1 }}>
                {okMsg}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            {loading && sessions.length === 0 ? (
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
            ) : filtered.length === 0 ? (
              <Typography sx={{ color: 'text.secondary' }}>
                Nenhuma sessão ativa encontrada.
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
                    backgroundColor: 'background.paper',
                    maxWidth: '100%',
                  }}
                >
                  <Table
                    size="small"
                    stickyHeader
                    aria-label="lista-sessoes-ativas"
                    sx={{ minWidth: 700 }}
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
                        <TableCell>E-mail</TableCell>
                        <TableCell>Último acesso</TableCell>
                        <TableCell>Expira em</TableCell>
                        <TableCell>Ativa</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pageRows.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.userEmail ?? '-'}</TableCell>
                          <TableCell>
                            {dateFormatter.format(new Date(s.lastSeen))}
                          </TableCell>
                          <TableCell>
                            {dateFormatter.format(new Date(s.expiresAt))}
                          </TableCell>
                          <TableCell>
                            {s.active ? 'Sim' : 'Não'}
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
