'use client';

import React, { useCallback, useMemo, useState } from 'react';
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
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/hooks/useAuth';

type InventoryItem = {
  id: string;
  codProd: number;
  count: number;
  inStock: number;
  createdAt: string;
  descricao?: string | null;
  userEmail?: string | null;
  localizacao?: string | null;
  recontagem?: boolean | null;
};

export default function Page() {
  const { ready, hasAccess } = useRequireAuth(); // ✅ bloqueio global
  const { token } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [filterCod, setFilterCod] = useState('');
  const [filterLoc, setFilterLoc] = useState('');
  const [filterEmail, setFilterEmail] = useState('');

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getinventoryList` : `/sync/getinventoryList`),
    [API_BASE]
  );

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const resp = await fetch(LIST_URL, { method: 'GET', headers: getHeaders(), cache: 'no-store' });
      if (!resp.ok) throw new Error((await resp.text()) || `Erro ${resp.status}`);

      const data = (await resp.json()) as InventoryItem[] | null;
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0));

      setRows(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar auditoria';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, getHeaders]);

  const filtered = useMemo(() => {
    const cod = filterCod.trim();
    const loc = filterLoc.trim().toUpperCase();
    const email = filterEmail.trim().toUpperCase();

    return rows.filter((r) => {
      if (cod && String(r.codProd) !== cod) return false;
      if (loc) {
        const rl = String(r.localizacao ?? '').toUpperCase();
        if (!rl.includes(loc)) return false;
      }
      if (email) {
        const re = String(r.userEmail ?? '').toUpperCase();
        if (!re.includes(email)) return false;
      }
      return true;
    });
  }, [rows, filterCod, filterLoc, filterEmail]);

  const exportCsv = useCallback(() => {
    const header = ['createdAt', 'codProd', 'descricao', 'localizacao', 'userEmail', 'count', 'inStock', 'recontagem'];
    const lines = [header.join(';')];

    for (const r of filtered) {
      const line = [
        r.createdAt,
        String(r.codProd),
        String(r.descricao ?? ''),
        String(r.localizacao ?? ''),
        String(r.userEmail ?? ''),
        String(r.count),
        String(r.inStock),
        String(r.recontagem ?? false),
      ]
        .map((x) => `"${String(x).replaceAll('"', '""')}"`)
        .join(';');
      lines.push(line);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [filtered]);

  if (!ready || !hasAccess) return null;

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
        }}
      >
        <Card sx={{ maxWidth: 1200, mx: 'auto', mt: 6, borderRadius: 2, border: 1, boxShadow: 0 }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Auditoria de contagens
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Filtre por código, localização e contador. Exporte CSV do resultado filtrado.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="outlined" onClick={fetchAll} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : 'Carregar'}
                </Button>
                <Button variant="contained" onClick={exportCsv} disabled={filtered.length === 0}>
                  Exportar CSV
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField label="CodProd" value={filterCod} onChange={(e) => setFilterCod(e.target.value)} size="small" />
              <TextField label="Localização" value={filterLoc} onChange={(e) => setFilterLoc(e.target.value)} size="small" />
              <TextField label="Contador " value={filterEmail} onChange={(e) => setFilterEmail(e.target.value)} size="small" />
            </Box>

            {erro && <Typography color="error" sx={{ mb: 2 }}>{erro}</Typography>}

            <Divider sx={{ my: 2 }} />

            <TableContainer component={Paper} elevation={0} sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 2 }}>
              <Table size="small" stickyHeader sx={{ minWidth: 1000 }}>
                <TableHead>
                  <TableRow sx={{ '& th': { backgroundColor: (t) => t.palette.grey[50], fontWeight: 600, whiteSpace: 'nowrap' } }}>
                    <TableCell>Data</TableCell>
                    <TableCell>Localização</TableCell>
                    <TableCell>Cód. Produto</TableCell>
                    <TableCell>Descrição</TableCell>
                    <TableCell>Contador</TableCell>
                    <TableCell align="right">Contagem</TableCell>
                    <TableCell align="right">Estoque</TableCell>
                    <TableCell align="center">Recontagem?</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.createdAt).toLocaleString('pt-BR')}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{r.localizacao ?? '-'}</TableCell>
                      <TableCell>{r.codProd}</TableCell>
                      <TableCell>{r.descricao ?? '-'}</TableCell>
                      <TableCell>{r.userEmail ?? '-'}</TableCell>
                      <TableCell align="right">{r.count}</TableCell>
                      <TableCell align="right">{r.inStock}</TableCell>
                      <TableCell align="center">{r.recontagem ? 'Sim' : 'Não'}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <Typography color="text.secondary">Sem resultados com os filtros atuais.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      <Snackbar open={snackbarOpen} autoHideDuration={3500} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={erro ? 'error' : 'success'} variant="filled">
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
