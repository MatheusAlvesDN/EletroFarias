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
  Stack,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

// shape esperado de um TOP (campos principais)
type TopItem = {
  codigo?: string | number;
  descricao?: string | null;
  natureza?: string | null;
  estoqueControlado?: boolean | number | null;
  // não colocamos index signature com `any` — extras serão tratados como `unknown`
};

type OrderBy = 'codigo' | 'descricao';

const ROWS_PER_PAGE = 10;

// helper seguro: tenta extrair o primeiro campo presente na lista de chaves e
// retorna string vazia caso não encontre.
// recebe `obj` como unknown e faz checagens de tipo antes de acessar propriedades.
function getFirstFieldString(obj: unknown, keys: string[]): string {
  if (!obj || typeof obj !== 'object') return '';
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (v === undefined || v === null) continue;
    return String(v);
  }
  return '';
}

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [list, setList] = useState<TopItem[]>([]);
  const [filtered, setFiltered] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(ROWS_PER_PAGE);

  const [orderBy, setOrderBy] = useState<OrderBy>('codigo');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');

  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      // se quiser exigir login descomente a linha abaixo
      // router.replace('/');
      setToken(null);
      return;
    }
    setToken(t);
  }, [router]);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_TOP_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/listarTOP` : `/listarTOP`),
    [API_BASE]
  );

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErro(null);
    setOkMsg(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(LIST_TOP_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `Falha ao listar TOPs (status ${resp.status})`);
      }

      const raw = (await resp.json()) as unknown;

      // normalizar retorno: aceitar array direto [] ou envelope { items: [] }
      let arr: unknown[] = [];
      if (Array.isArray(raw)) {
        arr = raw;
      } else if (raw && typeof raw === 'object') {
        const maybeItems = (raw as Record<string, unknown>).items;
        if (Array.isArray(maybeItems)) arr = maybeItems;
      }

      // mapear cada elemento para TopItem, usando getFirstFieldString para pegar possíveis nomes diferentes no backend
      const normalized: TopItem[] = arr.map((t) => {
        const codigo = getFirstFieldString(t, ['codigo', 'codigoTipoOperacao', 'code', 'id']);
        const descricao = getFirstFieldString(t, ['descricao', 'nome', 'description']);
        const natureza = getFirstFieldString(t, ['natureza', 'tipo']);
        const estoqueControladoRaw = (t && typeof t === 'object' ? (t as Record<string, unknown>).estoqueControlado ?? (t as Record<string, unknown>).controlaEstoque ?? null : null);

        const estoqueControlado = typeof estoqueControladoRaw === 'boolean' || typeof estoqueControladoRaw === 'number'
          ? (estoqueControladoRaw as boolean | number)
          : null;

        return {
          codigo: codigo !== '' ? codigo : undefined,
          descricao: descricao !== '' ? descricao : undefined,
          natureza: natureza !== '' ? natureza : undefined,
          estoqueControlado,
        };
      });

      setList(normalized);
      setOkMsg(`Encontrados ${normalized.length} TOPs`);
      setSnackbarOpen(true);
      setPage(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar TOPs';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [LIST_TOP_URL, token, API_TOKEN]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // filtro simples por código/descrição
  useEffect(() => {
    const q = search.trim().toUpperCase();
    const result = list.filter((t) => {
      if (!q) return true;
      const code = String(t.codigo ?? '').toUpperCase();
      const desc = String(t.descricao ?? '').toUpperCase();
      return code.includes(q) || desc.includes(q);
    });
    setFiltered(result);
    setPage(0);
  }, [search, list]);

  // ordenação client-side
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const cmp = (a: TopItem, b: TopItem) => {
      let va: string | number = '';
      let vb: string | number = '';
      if (orderBy === 'codigo') {
        // padStart para ajudar ordenação de códigos numéricos/almac.
        va = String(a.codigo ?? '').padStart(10, '0');
        vb = String(b.codigo ?? '').padStart(10, '0');
      } else {
        va = String(a.descricao ?? '').toUpperCase();
        vb = String(b.descricao ?? '').toUpperCase();
      }

      if (typeof va === 'number' && typeof vb === 'number') {
        return (va as number) - (vb as number);
      }
      return String(va).localeCompare(String(vb), 'pt-BR', { sensitivity: 'base' });
    };

    arr.sort((a, b) => {
      const res = cmp(a, b);
      return orderDirection === 'asc' ? res : -res;
    });
    return arr;
  }, [filtered, orderBy, orderDirection]);

  const pageRows = useMemo(() => {
    return sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sorted, page, rowsPerPage]);

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);

  const toggleSort = (field: OrderBy) => {
    if (orderBy === field) {
      setOrderDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(field);
      setOrderDirection('asc');
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* floating menu button */}
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
        <Card sx={{ maxWidth: 1200, mx: 'auto', mt: 6, borderRadius: 2, boxShadow: 0, border: 1, backgroundColor: 'background.paper' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Lista de TOPs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de TOPs: <b>{list.length}</b>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="outlined" onClick={fetchList} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : 'Atualizar'}
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="Pesquisar código ou descrição"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                fullWidth
              />
            </Box>

            {erro && <Typography color="error" sx={{ mb: 1 }}>{erro}</Typography>}
            {okMsg && <Typography color="success.main" sx={{ mb: 1 }}>{okMsg}</Typography>}

            <Divider sx={{ my: 2 }} />

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={2}>
                {sorted.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>Nenhum TOP encontrado.</Typography>
                ) : (
                  <>
                    <TableContainer component={Paper} elevation={0} sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 2, overflowX: 'auto', backgroundColor: 'background.paper', maxWidth: '100%' }}>
                      <Table size="small" stickyHeader aria-label="lista-tops" sx={{ minWidth: 700 }}>
                        <TableHead>
                          <TableRow sx={{ '& th': { backgroundColor: (t) => t.palette.grey[50], fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' } }}>
                            <TableCell onClick={() => toggleSort('codigo')}>
                              Código {orderBy === 'codigo' ? (orderDirection === 'asc' ? '▲' : '▼') : ''}
                            </TableCell>
                            <TableCell onClick={() => toggleSort('descricao')}>
                              Descrição {orderBy === 'descricao' ? (orderDirection === 'asc' ? '▲' : '▼') : ''}
                            </TableCell>
                            <TableCell>Natureza</TableCell>
                            <TableCell align="center">Controla Estoque</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pageRows.map((row, idx) => (
                            <TableRow key={String(row.codigo ?? idx)}>
                              <TableCell>{String(row.codigo ?? '-')}</TableCell>
                              <TableCell>{row.descricao ?? '-'}</TableCell>
                              <TableCell>{row.natureza ?? '-'}</TableCell>
                              <TableCell align="center">{row.estoqueControlado ? 'Sim' : 'Não'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

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
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>

      <Snackbar open={snackbarOpen && (!!erro || !!okMsg)} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={erro ? 'error' : 'success'} variant="filled" sx={{ width: '100%' }}>
          {erro || okMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
