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
import { usePersistedState } from '@/hooks/userPersistedState';
import { useRequireAuth } from '@/hooks/useRequireAuth';

type Solicitacao = {
  id?: string;
  userRequest: string;
  codProd: number;
  descricao?: string; // ✅ 1 - novo campo
  createdAt: string;
  aprovado: boolean;
  quantidade: number;
  raw?: unknown;
};

const ROWS_PER_PAGE = 10;

const toStringSafe = (v: unknown): string => (v == null ? '' : String(v));
const toNumberSafe = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
};
const toBoolSafe = (v: unknown): boolean => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'sim' || s === 's') return true;
    if (s === 'false' || s === '0' || s === 'nao' || s === 'não' || s === 'n') return false;
  }
  return false;
};

// ✅ helper: extrair email do JWT (client-safe)
const getEmailFromJwt = (jwt: string | null): string | null => {
  if (!jwt) return null;
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(payloadBase64);
    const payload = JSON.parse(jsonPayload) as {
      email?: string;
      userEmail?: string;
      sub?: string;
      [k: string]: unknown;
    };

    const email = (payload.email ?? payload.userEmail ?? payload.sub ?? '') as string;
    const cleaned = String(email).trim();
    return cleaned ? cleaned : null;
  } catch {
    return null;
  }
};

export default function Page() {
  const { token, ready, hasAccess } = useRequireAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<Solicitacao[]>([]);
  const [filtered, setFiltered] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [search, setSearch] = usePersistedState<string>('solicitacoes:search', '');
  const [page, setPage] = useState(0);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // loading por linha (um para aprovar/reprovar)
  const [actingKey, setActingKey] = useState<string | null>(null);

  // ✅ email do usuário logado (JWT)
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('authToken');
    setUserEmail(getEmailFromJwt(t));
  }, []);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getSolicitacao` : `/sync/getSolicitacao`),
    [API_BASE]
  );

  const APROVAR_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/aprovarSolicitacao` : `/sync/aprovarSolicitacao`),
    [API_BASE]
  );

  const REPROVAR_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/reprovarSolicitacao` : `/sync/reprovarSolicitacao`),
    [API_BASE]
  );

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const toast = useCallback((msg: string, severity: 'success' | 'error' = 'success') => {
    setSnackbarMsg(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '-';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return String(iso);
    return dt.toLocaleString('pt-BR');
  };

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
        throw new Error(msg || `Falha ao buscar solicitações (status ${resp.status})`);
      }

      const raw = (await resp.json()) as unknown;
      const arr: unknown[] = Array.isArray(raw) ? raw : [];

      const normalized: Solicitacao[] = arr
        .map((r) => {
          const rec = r && typeof r === 'object' ? (r as Record<string, unknown>) : {};
          return {
            id: toStringSafe(
              rec.id ??
                rec.ID ??
                rec.solicitacaoId ??
                rec.SOLICITACAOID ??
                rec.idSolicitacao ??
                rec.IDSOLICITACAO ??
                ''
            ),
            userRequest: toStringSafe(rec.userRequest ?? rec.user_request ?? rec.userEmail ?? rec.user_email ?? ''),
            codProd: toNumberSafe(rec.codProd ?? rec.CODPROD ?? rec.codProduto ?? rec.CODPRODUTO),
            // ✅ 1 - descricao (variações comuns)
            descricao: toStringSafe(rec.descricao ?? rec.DESCRICAO ?? rec.desc ?? rec.DESC ?? ''),
            createdAt: toStringSafe(rec.createdAt ?? rec.CREATEDAT ?? rec.created_at ?? ''),
            aprovado: toBoolSafe(rec.aprovado ?? rec.APROVADO ?? rec.approved ?? rec.APPROVED ?? false),
            quantidade: toNumberSafe(rec.quantidade ?? rec.QUANTIDADE ?? rec.qtd ?? rec.QTD ?? 1),
            raw: r,
          };
        })
        .filter((x) => x.userRequest && Number.isFinite(x.codProd) && x.createdAt);

      normalized.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setItems(normalized);
      setPage(0);
      toast('Lista carregada', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar solicitações';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, getHeaders, toast]);

  const doAction = useCallback(
    async (url: string, it: Solicitacao, key: string, successMsg: string) => {
      if (!userEmail) {
        toast('Não foi possível identificar o e-mail do usuário logado.', 'error');
        return;
      }

      const rowId = String(it.id ?? '').trim();
      if (!rowId) {
        toast('Esta solicitação não possui ID.', 'error');
        return;
      }

      if (!Number.isFinite(it.codProd)) {
        toast('codProd inválido.', 'error');
        return;
      }

      setActingKey(key);
      setErro(null);

      try {
        const payload = {
          id: rowId,
          userEmail,
          codProduto: it.codProd,
          quantidade: it.quantidade,
        };

        console.log('ACTION payload:', payload);

        const resp = await fetch(url, {
          method: 'POST',
          headers: getHeaders(),
          cache: 'no-store',
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha (status ${resp.status})`);
        }

        // ✅ 2 - como a tela só mostra aprovados=false, removemos do grid após ação
        setItems((prev) => prev.filter((x) => String(x.id ?? '').trim() !== rowId));

        toast(successMsg, 'success');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao processar';
        setErro(msg);
        toast(msg, 'error');
      } finally {
        setActingKey(null);
      }
    },
    [getHeaders, toast, userEmail]
  );

  const handleAprovar = useCallback(
    (it: Solicitacao, key: string) => doAction(APROVAR_URL, it, key, 'Solicitação aprovada!'),
    [APROVAR_URL, doAction]
  );

  const handleReprovar = useCallback(
    (it: Solicitacao, key: string) => doAction(REPROVAR_URL, it, key, 'Solicitação reprovada!'),
    [REPROVAR_URL, doAction]
  );

  useEffect(() => {
    if (!ready || !hasAccess) return;
    if (token || API_TOKEN) fetchData();
  }, [ready, hasAccess, token, API_TOKEN, fetchData]);

  useEffect(() => {
    const q = search.trim().toUpperCase();

    // ✅ 2 - só pendentes (aprovado === false)
    const pendentes = items.filter((it) => it.aprovado === false);

    const result = pendentes.filter((it) => {
      if (!q) return true;

      return (
        it.userRequest.toUpperCase().includes(q) ||
        String(it.codProd).includes(q) ||
        String(it.quantidade).includes(q) ||
        (it.descricao ?? '').toUpperCase().includes(q) ||
        it.createdAt.toUpperCase().includes(q) ||
        String(it.id ?? '').toUpperCase().includes(q) ||
        'NAO'.includes(q) // mantém "nao" encontrável
      );
    });

    setFiltered(result);
    setPage(0);
  }, [items, search]);

  const pageRows = filtered.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);
  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);

  if (!ready || !hasAccess) return null;

  const CARD_SX = {
    maxWidth: 1200,
    mx: 'auto',
    mt: 6,
    borderRadius: 2,
    boxShadow: 0,
    border: 1,
    backgroundColor: 'background.paper',
  } as const;

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
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Solicitações (pendentes)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total: {filtered.length}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="outlined" onClick={fetchData} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : 'Atualizar'}
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr' }, gap: 2, mb: 2 }}>
              <TextField
                label="Pesquisar (id / usuário / codProd / quantidade / descrição / data)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                fullWidth
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
                  <Typography sx={{ color: 'text.secondary' }}>Nenhuma solicitação pendente encontrada.</Typography>
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
                      }}
                    >
                      <Table size="small" stickyHeader aria-label="solicitacoes" sx={{ minWidth: 1100 }}>
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
                            <TableCell>Usuário</TableCell>
                            <TableCell>Código</TableCell>
                            <TableCell>Descrição</TableCell> {/* ✅ 1 */}
                            <TableCell align="right">Qtd</TableCell>
                            <TableCell>Data</TableCell>
                            <TableCell align="center">Ações</TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {pageRows.map((it, idx) => {
                            const key =
                              String(it.id ?? '').trim() || `${it.userRequest}-${it.codProd}-${it.createdAt}-${idx}`;
                            const isActing = actingKey === key;

                            return (
                              <TableRow key={key} sx={{ '&:hover': { backgroundColor: 'rgba(0,0,0,0.03)' } }}>
                                <TableCell sx={{ fontFamily: 'monospace' }}>{it.userRequest}</TableCell>
                                <TableCell>{it.codProd}</TableCell>
                                <TableCell>{(it.descricao ?? '').trim() || '-'}</TableCell>
                                <TableCell align="right">{Number.isFinite(it.quantidade) ? it.quantidade : '-'}</TableCell>
                                <TableCell>{formatDateTime(it.createdAt)}</TableCell>

                                <TableCell align="center">
                                  <Box sx={{ display: 'inline-flex', gap: 1 }}>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="success"
                                      onClick={() => handleAprovar(it, key)}
                                      disabled={isActing}
                                      sx={{ textTransform: 'none', minWidth: 92 }}
                                    >
                                      {isActing ? <CircularProgress size={16} /> : 'APROVAR'}
                                    </Button>

                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="error"
                                      onClick={() => handleReprovar(it, key)} // ✅ 3
                                      disabled={isActing}
                                      sx={{ textTransform: 'none', minWidth: 92 }}
                                    >
                                      {isActing ? <CircularProgress size={16} /> : 'REPROVAR'}
                                    </Button>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <TablePagination
                      component="div"
                      count={filtered.length}
                      page={page}
                      onPageChange={handleChangePage}
                      rowsPerPage={ROWS_PER_PAGE}
                      rowsPerPageOptions={[ROWS_PER_PAGE]}
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
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
