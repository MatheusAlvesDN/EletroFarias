// ./src/app/inventory/notaPositiva/page.tsx
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Snackbar,
  Alert,
  TextField,
  Checkbox,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

type InventoryRow = {
  id?: string;
  codProd?: number;
  descricao?: string | null;
  localizacao?: string | null;
  count?: number;
  inStock?: number;
  reservado?: number | null;
  reserved?: number | null;
  userEmail?: string | null;
  createdAt?: string | null;
  inplantedDate?: string | null;
  recontagem?: boolean | null;

  [key: string]: unknown;
};

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<InventoryRow[]>([]);
  const [filtered, setFiltered] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // filtros
  const [filterCodProd, setFilterCodProd] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterLoc, setFilterLoc] = useState('');

  // seleção
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ação ajustar
  const [isAdjusting, setIsAdjusting] = useState(false);

  // ✅ ação retornar (mesma lógica do outro page)
  const [isReturning, setIsReturning] = useState(false);

  // auth
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);
  }, [router]);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getNotaPositiva` : `/sync/getNotaPositiva`),
    [API_BASE]
  );

  const AJUSTE_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/ajustePositivo` : `/sync/ajustePositivo`),
    [API_BASE]
  );

  // ✅ NOVO endpoint (igual ao outro page)
  const RETORNAR_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/retornarProdutos` : `/sync/retornarProdutos`),
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

  const getReservado = (it: InventoryRow) => {
    const v = (it.reserved ?? it.reservado ?? 0) as unknown;
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
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
        throw new Error(msg || `Falha ao buscar contagens (status ${resp.status})`);
      }

      const data = (await resp.json()) as unknown;

      const list: InventoryRow[] = Array.isArray(data)
        ? (data as unknown[]).map((x) => (typeof x === 'object' && x ? (x as InventoryRow) : ({} as InventoryRow)))
        : [];

      list.sort((a, b) => {
        const ta = a.createdAt ? new Date(String(a.createdAt)).getTime() : 0;
        const tb = b.createdAt ? new Date(String(b.createdAt)).getTime() : 0;
        return tb - ta;
      });

      setItems(list);
      setSelectedIds(new Set());
      toast('Lista carregada', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar contagens';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, getHeaders, toast]);

  useEffect(() => {
    if (token || API_TOKEN) fetchData();
  }, [fetchData, token, API_TOKEN]);

  useEffect(() => {
    const cod = filterCodProd.trim();
    const user = filterUser.trim().toUpperCase();
    const loc = filterLoc.trim().toUpperCase();

    const result = items.filter((it) => {
      if (cod && String(it.codProd ?? '') !== cod) return false;

      if (user) {
        const email = String(it.userEmail ?? '').toUpperCase();
        if (!email.includes(user)) return false;
      }

      if (loc) {
        const l = String(it.localizacao ?? '').toUpperCase();
        if (!l.includes(loc)) return false;
      }

      return true;
    });

    setFiltered(result);
  }, [items, filterCodProd, filterUser, filterLoc]);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '-';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return String(iso);
    return dt.toLocaleString('pt-BR');
  };

  const toggleRow = (rowId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((it, idx) => {
      const rowId = String((it.id as string) ?? `${it.userEmail ?? 'u'}-${idx}`);
      return selectedIds.has(rowId);
    });

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((it, idx) => {
          const rowId = String((it.id as string) ?? `${it.userEmail ?? 'u'}-${idx}`);
          next.delete(rowId);
        });
      } else {
        filtered.forEach((it, idx) => {
          const rowId = String((it.id as string) ?? `${it.userEmail ?? 'u'}-${idx}`);
          next.add(rowId);
        });
      }
      return next;
    });
  };

  // ✅ AJUSTAR usando o contrato do backend:
  // ajustePositivo(@Body() body: { produtos: { codProd: number; diference: number }[] })
  const handleAjustar = async () => {
    if (isAdjusting) return;

    const produtos: { codProd: number; diference: number }[] = [];

    filtered.forEach((it, idx) => {
      const rowId = String((it.id as string) ?? `${it.userEmail ?? 'u'}-${idx}`);
      if (!selectedIds.has(rowId)) return;

      const codProd = Number(it.codProd);
      if (!Number.isFinite(codProd)) return;

      const reservado = getReservado(it);
      const count = Number(it.count ?? 0);
      const inStock = Number(it.inStock ?? 0);

      const diference = count - (inStock + reservado);
      produtos.push({ codProd, diference });
    });

    if (produtos.length === 0) {
      toast('Selecione linhas válidas (com codProd) para ajustar.', 'error');
      return;
    }

    setIsAdjusting(true);
    setErro(null);

    try {
      const resp = await fetch(AJUSTE_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify({ produtos }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao ajustar (status ${resp.status})`);
      }

      toast('Ajuste enviado com sucesso!', 'success');
      await fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao ajustar';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setIsAdjusting(false);
    }
  };

  // ✅ RETORNAR: mesma lógica do outro page
  const handleRetornar = async () => {
    if (isReturning) return;

    const cods = new Set<number>();

    filtered.forEach((it, idx) => {
      const rowId = String((it.id as string) ?? `${it.userEmail ?? 'u'}-${idx}`);
      if (!selectedIds.has(rowId)) return;

      const codProd = Number(it.codProd);
      if (Number.isFinite(codProd) && codProd > 0) cods.add(codProd);
    });

    const codProds = Array.from(cods);

    if (codProds.length === 0) {
      toast('Selecione linhas válidas (com codProd) para retornar.', 'error');
      return;
    }

    setIsReturning(true);
    setErro(null);

    try {
      const resp = await fetch(RETORNAR_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        // ✅ se o backend esperar array puro, troque para JSON.stringify(codProds)
        body: JSON.stringify({ codProds }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao retornar (status ${resp.status})`);
      }

      toast('Produtos retornados com sucesso!', 'success');
      await fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao retornar produtos';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setIsReturning(false);
    }
  };

  const CARD_SX = {
    maxWidth: 1400,
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
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Todas as contagens (getNotaPositiva)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total: {filtered.length} • Selecionados: {selectedIds.size}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="outlined" onClick={fetchData} disabled={loading || isAdjusting || isReturning}>
                  {loading ? <CircularProgress size={18} /> : 'Atualizar'}
                </Button>

                {/* ✅ NOVO BOTÃO RETORNAR */}
                <Button
                  variant="contained"
                  onClick={handleRetornar}
                  disabled={loading || isAdjusting || isReturning || selectedIds.size === 0}
                  sx={{ textTransform: 'none', bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
                >
                  {isReturning ? <CircularProgress size={18} /> : 'RETORNAR'}
                </Button>

                <Button
                  variant="contained"
                  color="warning"
                  onClick={handleAjustar}
                  disabled={loading || isAdjusting || isReturning || selectedIds.size === 0}
                  sx={{ textTransform: 'none' }}
                >
                  {isAdjusting ? <CircularProgress size={18} /> : 'AJUSTAR'}
                </Button>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                label="Filtrar por código exato (codProd)"
                value={filterCodProd}
                onChange={(e) => setFilterCodProd(e.target.value)}
                size="small"
              />
              <TextField
                label="Filtrar por contador (userEmail contém)"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                size="small"
              />
              <TextField
                label="Filtrar por localização (contém)"
                value={filterLoc}
                onChange={(e) => setFilterLoc(e.target.value)}
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
                  <Typography sx={{ color: 'text.secondary' }}>Nenhuma contagem encontrada.</Typography>
                ) : (
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
                    <Table size="small" stickyHeader aria-label="nota-positiva" sx={{ minWidth: 1200 }}>
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
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={allFilteredSelected}
                              indeterminate={!allFilteredSelected && selectedIds.size > 0}
                              onChange={toggleSelectAllFiltered}
                              inputProps={{ 'aria-label': 'Selecionar todos' }}
                            />
                          </TableCell>
                          <TableCell>Data</TableCell>
                          <TableCell>Localização</TableCell>
                          <TableCell>Cód. Produto</TableCell>
                          <TableCell>Descrição</TableCell>
                          <TableCell>Contador</TableCell>
                          <TableCell align="right">Contagem</TableCell>
                          <TableCell align="right">Estoque</TableCell>
                          <TableCell align="right">Reservado</TableCell>
                          <TableCell align="right">Diferença</TableCell>
                          <TableCell align="center">Recontagem?</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {filtered.map((it, idx) => {
                          const reservado = getReservado(it);
                          const count = Number(it.count ?? 0);
                          const inStock = Number(it.inStock ?? 0);
                          const diff = count - (inStock + reservado);

                          const rowId = String((it.id as string) ?? `${it.userEmail ?? 'u'}-${idx}`);
                          const checked = selectedIds.has(rowId);

                          return (
                            <TableRow
                              key={rowId}
                              onClick={() => toggleRow(rowId)}
                              sx={{
                                backgroundColor: checked ? '#b3d9ff' : '#d6ecff',
                                cursor: 'pointer',
                                '&:hover': { filter: 'brightness(0.98)' },
                                '& td': { borderBottom: '1px solid rgba(0,0,0,0.06)' },
                              }}
                            >
                              <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                <Checkbox checked={checked} onChange={() => toggleRow(rowId)} />
                              </TableCell>

                              <TableCell>{formatDateTime((it.createdAt as string) ?? null)}</TableCell>
                              <TableCell>{String(it.localizacao ?? '-')}</TableCell>
                              <TableCell>{String(it.codProd ?? '-')}</TableCell>
                              <TableCell>{String(it.descricao ?? '-')}</TableCell>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{String(it.userEmail ?? '-')}</TableCell>
                              <TableCell align="right">{Number.isFinite(count) ? count : '-'}</TableCell>
                              <TableCell align="right">{Number.isFinite(inStock) ? inStock : '-'}</TableCell>
                              <TableCell align="right">{reservado}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>
                                {Number.isFinite(diff) ? diff : '-'}
                              </TableCell>
                              <TableCell align="center">{it.recontagem ? 'Sim' : 'Não'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </CardContent>
        </Card>

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
    </Box>
  );
}
