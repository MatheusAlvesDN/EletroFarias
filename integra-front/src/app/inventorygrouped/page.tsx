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

// -----------------------------
// TIPOS
// -----------------------------
type InventoryItem = {
  id: string;
  codProd: number;
  count: number;
  inStock: number;
  inplantedDate: string | null;
  descricao?: string | null;
  userEmail?: string | null;
  createdAt: string;
};

type GroupedItem = {
  codProd: number;
  descricao: string;
  totalCount: number;
  totalInStock: number;
  totalDiff: number;
  qtdRegistros: number;
  ultimoLancamento: string | null;
  contadores: string[];
};

// -----------------------------
const PAGE_SIZE = 10;

export default function Page() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<GroupedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [filterCodProd, setFilterCodProd] = useState('');
  const [filterDesc, setFilterDesc] = useState('');

  const [page, setPage] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // -----------------------------
  // AUTH
  // -----------------------------
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);
  }, [router]);

  // -----------------------------
  // API
  // -----------------------------
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? '';
  const LIST_URL = API_BASE ? `${API_BASE}/sync/getinventoryList` : `/sync/getinventoryList`;

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      }),
    []
  );

  // -----------------------------
  // FETCH
  // -----------------------------
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(LIST_URL, { method: 'GET', headers });
      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Erro ao carregar inventário`);
      }

      const data = (await resp.json()) as InventoryItem[];
      setItems(data ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar inventário';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, token, API_TOKEN]);

  useEffect(() => {
    if (token || API_TOKEN) fetchData();
  }, [fetchData, token, API_TOKEN]);

  // -----------------------------
  // AGRUPAMENTO
  // -----------------------------
  const grouped: GroupedItem[] = useMemo(() => {
    if (!items.length) return [];

    const map = new Map<number, GroupedItem & { _dates: Date[] }>();

    for (const it of items) {
      const cod = Number(it.codProd);
      if (!map.has(cod)) {
        map.set(cod, {
          codProd: cod,
          descricao: it.descricao ?? '',
          totalCount: it.count,
          totalInStock: it.inStock,
          totalDiff: it.count - it.inStock,
          qtdRegistros: 1,
          contadores: it.userEmail ? [it.userEmail] : [],
          ultimoLancamento: it.inplantedDate ? it.inplantedDate : null,
          _dates: it.inplantedDate ? [new Date(it.inplantedDate)] : [],
        });
      } else {
        const g = map.get(cod)!;
        g.totalCount += it.count;
        g.totalInStock += it.inStock;
        g.totalDiff = g.totalCount - g.totalInStock;
        g.qtdRegistros++;
        if (it.userEmail) g.contadores.push(it.userEmail);
        if (it.inplantedDate) g._dates.push(new Date(it.inplantedDate));
      }
    }

    const res: GroupedItem[] = [];
    for (const g of map.values()) {
      const last =
        g._dates.length > 0
          ? g._dates.sort((a, b) => b.getTime() - a.getTime())[0].toLocaleString('pt-BR')
          : null;
      res.push({
        ...g,
        contadores: Array.from(new Set(g.contadores)), // remove duplicados
        ultimoLancamento: last,
      });
    }

    return res;
  }, [items]);

  // -----------------------------
  // FILTROS
  // -----------------------------
  useEffect(() => {
    let list = [...grouped];

    if (filterCodProd.trim()) {
      list = list.filter((g) => String(g.codProd).includes(filterCodProd.trim()));
    }

    if (filterDesc.trim()) {
      list = list.filter((g) =>
        g.descricao.toLowerCase().includes(filterDesc.trim().toLowerCase())
      );
    }

    setFiltered(list);
    setPage(0);
  }, [grouped, filterCodProd, filterDesc]);

  // -----------------------------
  // PAGINAÇÃO
  // -----------------------------
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar button */}
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

      {/* MAIN */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          overflowY: 'auto',
          p: 5,
          backgroundColor: '#f0f4f8',
        }}
      >
        <Card sx={{ maxWidth: 1200, mx: 'auto', border: 1, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              Agrupamento de contagens por produto
            </Typography>

            {/* FILTROS */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Filtrar por código"
                size="small"
                value={filterCodProd}
                onChange={(e) => setFilterCodProd(e.target.value)}
              />
              <TextField
                label="Filtrar por descrição"
                size="small"
                value={filterDesc}
                onChange={(e) => setFilterDesc(e.target.value)}
              />
              <Button variant="outlined" onClick={fetchData} disabled={loading}>
                {loading ? <CircularProgress size={18} /> : 'Recarregar'}
              </Button>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* TABELA */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Cód. Prod</TableCell>
                        <TableCell>Descrição</TableCell>
                        <TableCell align="right">Qtd. Registros</TableCell>
                        <TableCell align="right">Total Contado</TableCell>
                        <TableCell align="right">Total Sistema</TableCell>
                        <TableCell align="right">Diferença</TableCell>
                        <TableCell>Último lançamento</TableCell>
                        <TableCell>Contadores</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {pageRows.map((g) => (
                        <TableRow key={g.codProd}>
                          <TableCell>{g.codProd}</TableCell>
                          <TableCell>{g.descricao}</TableCell>
                          <TableCell align="right">{g.qtdRegistros}</TableCell>
                          <TableCell align="right">
                            {numberFormatter.format(g.totalCount)}
                          </TableCell>
                          <TableCell align="right">
                            {numberFormatter.format(g.totalInStock)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {numberFormatter.format(g.totalDiff)}
                          </TableCell>
                          <TableCell>{g.ultimoLancamento ?? '-'}</TableCell>
                          <TableCell>{g.contadores.join(', ') || '-'}</TableCell>
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
                  rowsPerPage={PAGE_SIZE}
                  rowsPerPageOptions={[PAGE_SIZE]}
                />
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* SNACKBAR */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={erro ? 'error' : 'success'}
          variant="filled"
          onClose={() => setSnackbarOpen(false)}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
