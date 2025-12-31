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

type SolicitacaoProduto = {
  codProduto: number;
  quantidade: number;
  descricao: string;
};

type SolicitacaoGroup = {
  id: string; // usado internamente (não exibir)
  userRequest: string;
  createdAt: string;
  aprovado: boolean;
  aprovedAt: string | null;
  produtos: SolicitacaoProduto[];
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

// helper: extrair email do JWT (client-safe)
const getEmailFromJwt = (jwt: string | null): string | null => {
  if (!jwt) return null;
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64.padEnd(payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4), '=');

    const jsonPayload = atob(padded);
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

function formatDateTime(iso?: string | null) {
  if (!iso) return '-';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return String(iso);
  return dt.toLocaleString('pt-BR');
}

function normalizeProdutos(rec: Record<string, unknown>): SolicitacaoProduto[] {
  const maybeArray =
    rec.itemSolicitacao ??
    rec.ITEMSOLICITACAO ??
    rec.itemSolicitacoes ??
    rec.ITEMSOLICITACOES ??
    rec.itensSolicitacao ??
    rec.ITENSSOLICITACAO ??
    rec.itens ??
    rec.ITENS ??
    rec.items ??
    rec.ITEMS ??
    rec.produtos ??
    rec.PRODUTOS;

  if (Array.isArray(maybeArray)) {
    return maybeArray
      .map((p) => {
        const obj = p && typeof p === 'object' ? (p as Record<string, unknown>) : {};

        const codProduto = toNumberSafe(
          obj.codProduto ?? obj.CODPRODUTO ?? obj.codProd ?? obj.CODPROD ?? obj.codigo ?? obj.CODIGO
        );

        const quantidade = toNumberSafe(
          obj.quantidade ?? obj.QUANTIDADE ?? obj.qtd ?? obj.QTD ?? obj.count ?? obj.COUNT
        );

        const descricao = toStringSafe(
          obj.descricao ?? obj.DESCRICAO ?? obj.desc ?? obj.DESC ?? obj.descrprod ?? obj.DESCRPROD ?? ''
        ).trim();

        if (!Number.isFinite(codProduto)) return null;

        return {
          codProduto,
          quantidade: Number.isFinite(quantidade) ? quantidade : 1,
          descricao: descricao || '-',
        } as SolicitacaoProduto;
      })
      .filter((x): x is SolicitacaoProduto => !!x);
  }

  const codProduto = toNumberSafe(
    rec.codProd ?? rec.CODPROD ?? rec.codProduto ?? rec.CODPRODUTO ?? rec.codigo ?? rec.CODIGO
  );

  if (!Number.isFinite(codProduto)) return [];

  const quantidade = toNumberSafe(rec.quantidade ?? rec.QUANTIDADE ?? rec.qtd ?? rec.QTD ?? 1);

  const descricao = toStringSafe(
    rec.descricao ?? rec.DESCRICAO ?? rec.desc ?? rec.DESC ?? rec.descrprod ?? rec.DESCRPROD ?? ''
  ).trim();

  return [
    {
      codProduto,
      quantidade: Number.isFinite(quantidade) ? quantidade : 1,
      descricao: descricao || '-',
    },
  ];
}

export default function Page() {
  const { token, ready, hasAccess } = useRequireAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<SolicitacaoGroup[]>([]);
  const [filtered, setFiltered] = useState<SolicitacaoGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [search, setSearch] = usePersistedState<string>('solicitacoesUser:search', '');
  const [page, setPage] = useState(0);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('authToken');
    setUserEmail(getEmailFromJwt(t));
  }, []);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

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

  const LIST_URL = useMemo(() => {
    const base = API_BASE ? `${API_BASE}/sync/getSolicitacaoUser` : `/sync/getSolicitacaoUser`;
    return base;
  }, [API_BASE]);

  const fetchData = useCallback(async () => {
    try {
      if (!userEmail) {
        setItems([]);
        setFiltered([]);
        setErro('Não foi possível identificar o e-mail do usuário logado.');
        return;
      }

      setLoading(true);
      setErro(null);

      const url = `${LIST_URL}?userEmail=${encodeURIComponent(userEmail)}`;

      const resp = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao buscar solicitações (status ${resp.status})`);
      }

      const raw = (await resp.json()) as unknown;

      const arr: unknown[] = (() => {
        if (Array.isArray(raw)) return raw;

        if (raw && typeof raw === 'object') {
          const obj = raw as Record<string, unknown>;

          const data = obj['data'];
          if (Array.isArray(data)) return data;

          const solicitacoes = obj['solicitacoes'];
          if (Array.isArray(solicitacoes)) return solicitacoes;
        }

        return [];
      })();

      const byId = new Map<string, SolicitacaoGroup>();

      for (const r of arr) {
        const rec = r && typeof r === 'object' ? (r as Record<string, unknown>) : {};

        const id = toStringSafe(
          rec.id ??
            rec.ID ??
            rec.solicitacaoId ??
            rec.SOLICITACAOID ??
            rec.idSolicitacao ??
            rec.IDSOLICITACAO ??
            rec.requestId ??
            rec.REQUESTID ??
            ''
        ).trim();

        const userRequest = toStringSafe(
          rec.userRequest ??
            rec.user_request ??
            rec.userEmail ??
            rec.user_email ??
            rec.userAproved ??
            rec.user_aproved ??
            rec.userApproved ??
            rec.user_approved ??
            rec.usuario ??
            rec.USUARIO ??
            ''
        ).trim();

        const createdAt = toStringSafe(
          rec.createdAt ?? rec.CREATEDAT ?? rec.created_at ?? rec.createAt ?? rec.CREATEAT ?? rec.data ?? rec.DATA ?? ''
        ).trim();

        const aprovado = toBoolSafe(
          rec.aprovado ?? rec.APROVADO ?? rec.aproved ?? rec.APROVED ?? rec.approved ?? rec.APPROVED ?? false
        );

        const aprovedAtRaw = toStringSafe(
          rec.aprovedAt ??
            rec.APROVEDAT ??
            rec.approvedAt ??
            rec.APPROVEDAT ??
            rec.aprovadoAt ??
            rec.APROVADOAT ??
            rec.approved_at ??
            rec.aproved_at ??
            ''
        ).trim();

        const aprovedAt = aprovedAtRaw ? aprovedAtRaw : null;

        const produtos = normalizeProdutos(rec);

        if (!userRequest || !createdAt) continue;

        // id segue existindo internamente para key/expand/toggle, mas não mostramos na UI
        const groupId = id || `${userRequest}__${createdAt}`;

        const existing = byId.get(groupId);
        if (!existing) {
          byId.set(groupId, {
            id: groupId,
            userRequest,
            createdAt,
            aprovado,
            aprovedAt,
            produtos: [...produtos],
            raw: r,
          });
        } else {
          existing.aprovado = existing.aprovado || aprovado;
          existing.aprovedAt = existing.aprovedAt ?? aprovedAt;

          for (const p of produtos) {
            const dup = existing.produtos.some(
              (x) =>
                x.codProduto === p.codProduto &&
                x.quantidade === p.quantidade &&
                (x.descricao ?? '') === (p.descricao ?? '')
            );
            if (!dup) existing.produtos.push(p);
          }
        }
      }

      const normalized = Array.from(byId.values());

      normalized.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setItems(normalized);
      setExpandedId(null);
      setPage(0);
      toast('Lista carregada', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar solicitações';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, getHeaders, toast, userEmail]);

  useEffect(() => {
    if (!ready || !hasAccess) return;
    if (!token && !API_TOKEN) return;
    if (!userEmail) return;
    fetchData();
  }, [ready, hasAccess, token, API_TOKEN, userEmail, fetchData]);

  useEffect(() => {
    const q = search.trim().toUpperCase();

    const result = items.filter((it) => {
      if (!q) return true;

      const matchBase =
        it.userRequest.toUpperCase().includes(q) ||
        it.createdAt.toUpperCase().includes(q) ||
        String(it.produtos.length).includes(q) ||
        String(it.aprovado).toUpperCase().includes(q) ||
        String(it.aprovedAt ?? '').toUpperCase().includes(q);

      if (matchBase) return true;

      return it.produtos.some((p) => {
        const desc = (p.descricao ?? '').toUpperCase();
        return String(p.codProduto).includes(q) || String(p.quantidade).includes(q) || (desc && desc.includes(q));
      });
    });

    setFiltered(result);
    setPage(0);
  }, [items, search]);

  const pageRows = filtered.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);
  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const getRowSx = (g: SolicitacaoGroup) => {
    const bg =
    g.aprovedAt == null  
        ? 'rgba(245, 124, 0, 0.12)'
        : g.aprovado === true
          ? 'rgba(46, 125, 50, 0.12)'
          : 'rgba(211, 47, 47, 0.12)';

    const hover =
      
      g.aprovedAt == null
        ?'rgba(245, 124, 0, 0.18)' 
        : g.aprovado === true
          ? 'rgba(46, 125, 50, 0.18)'
          : 'rgba(211, 47, 47, 0.18)';

    return {
      backgroundColor: bg,
      '&:hover': { backgroundColor: hover },
    } as const;
  };

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
                  Minhas solicitações
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total: {filtered.length}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Verde: aprovado • Amarelo: pendente • Vermelho: reprovado
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
                label="Pesquisar (itens / codProduto / quantidade / descrição / data / status)"
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
                  <Typography sx={{ color: 'text.secondary' }}>Nenhuma solicitação encontrada.</Typography>
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
                      <Table size="small" stickyHeader aria-label="solicitacoes-user" sx={{ minWidth: 1100 }}>
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
                            <TableCell align="center">Itens</TableCell>
                            <TableCell>Resumo</TableCell>
                            <TableCell>Data (criação)</TableCell>
                            <TableCell>Data (aprovação)</TableCell>
                            <TableCell align="center">Detalhes</TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {pageRows.map((g) => {
                            const isExpanded = expandedId === g.id;

                            const resumo = (g.produtos ?? [])
                              .slice(0, 2)
                              .map((p) => `${p.codProduto} (${p.quantidade})`)
                              .join(', ');
                            const more = (g.produtos?.length ?? 0) > 2 ? ` +${(g.produtos.length ?? 0) - 2}` : '';

                            return (
                              <React.Fragment key={g.id}>
                                <TableRow sx={getRowSx(g)}>
                                  <TableCell align="center">{g.produtos?.length ?? 0}</TableCell>
                                  <TableCell>{(resumo || '-') + more}</TableCell>
                                  <TableCell>{formatDateTime(g.createdAt)}</TableCell>
                                  <TableCell>{formatDateTime(g.aprovedAt)}</TableCell>

                                  <TableCell align="center">
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => toggleExpand(g.id)}
                                      sx={{ textTransform: 'none', minWidth: 92 }}
                                    >
                                      {isExpanded ? 'Fechar' : 'Ver'}
                                    </Button>
                                  </TableCell>
                                </TableRow>

                                {isExpanded && (
                                  <TableRow>
                                    <TableCell colSpan={5} sx={{ backgroundColor: 'background.default' }}>
                                      <Box
                                        sx={{
                                          border: (t) => `1px solid ${t.palette.divider}`,
                                          borderRadius: 2,
                                          backgroundColor: 'background.paper',
                                          p: 2,
                                        }}
                                      >
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                          Itens da solicitação
                                        </Typography>

                                        {(g.produtos?.length ?? 0) === 0 ? (
                                          <Typography variant="body2" color="text.secondary">
                                            Nenhum item vinculado a esta solicitação.
                                          </Typography>
                                        ) : (
                                          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2 }}>
                                            <Table size="small" aria-label="produtos" sx={{ minWidth: 900 }}>
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
                                                  <TableCell>Cód. Produto</TableCell>
                                                  <TableCell>Descrição</TableCell>
                                                  <TableCell align="right">Qtd</TableCell>
                                                </TableRow>
                                              </TableHead>
                                              <TableBody>
                                                {(g.produtos ?? []).map((p, idx) => (
                                                  <TableRow key={`${g.id}-${p.codProduto}-${idx}`}>
                                                    <TableCell>{p.codProduto}</TableCell>
                                                    <TableCell>{(p.descricao ?? '').trim() || '-'}</TableCell>
                                                    <TableCell align="right">
                                                      {Number.isFinite(p.quantidade) ? p.quantidade : '-'}
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </TableContainer>
                                        )}
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
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
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} variant="filled" sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
