'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

type ProdutoRow = {
  codprod: number;
  descrprod: string;
  codbarras?: string | null;
  codgrupo?: number | null;
  descgrupo?: string | null;
  codfab?: number | null;
  fabricante?: string | null;
  ativo?: boolean | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function ProdutosSankhyaPage() {
  const [groupId, setGroupId] = useState<string>('');
  const [fabId, setFabId] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [limit, setLimit] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ProdutoRow[]>([]);
  const [total, setTotal] = useState<number>(0);

  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    msg: '',
    severity: 'info',
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (groupId.trim()) params.set('groupId', groupId.trim());
    if (fabId.trim()) params.set('manufacturerId', fabId.trim());
    if (search.trim()) params.set('search', search.trim());
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    return params.toString();
  }, [groupId, fabId, search, limit, offset]);

  const fetchProdutos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sync/produtos?${queryString}`, { method: 'GET' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setRows(data.items ?? []);
      setTotal(Number(data.total ?? 0));
    } catch (e: any) {
      setSnack({ open: true, msg: e?.message ?? 'Erro ao consultar produtos', severity: 'error' });
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    // carrega inicialmente (sem filtros) se quiser:
    fetchProdutos();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <Box sx={{ p: 2, height: '100vh', boxSizing: 'border-box' }}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
          <Typography variant="h5">Consulta de Produtos (Sankhya)</Typography>
          <Divider />

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="Grupo (CODGRUPOPROD)"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              size="small"
              inputProps={{ inputMode: 'numeric' }}
              sx={{ width: 220 }}
            />
            <TextField
              label="Fabricante (CODFAB)"
              value={fabId}
              onChange={(e) => setFabId(e.target.value)}
              size="small"
              inputProps={{ inputMode: 'numeric' }}
              sx={{ width: 200 }}
            />
            <TextField
              label="Buscar (nome/código/barras)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ minWidth: 320, flex: 1 }}
            />
            <TextField
              label="Limite"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value || 50))}
              size="small"
              sx={{ width: 120 }}
              inputProps={{ inputMode: 'numeric' }}
            />

            <Button
              variant="contained"
              onClick={() => {
                setOffset(0);
                fetchProdutos();
              }}
              disabled={loading}
            >
              Consultar
            </Button>
          </Box>

          <Paper sx={{ flex: 1, overflow: 'hidden' }}>
            <TableContainer sx={{ height: '100%' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Cód.</TableCell>
                    <TableCell>Descrição</TableCell>
                    <TableCell>Cód. Barras</TableCell>
                    <TableCell>Grupo</TableCell>
                    <TableCell>Fabricante</TableCell>
                    <TableCell>Ativo</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                          <CircularProgress size={22} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Alert severity="info">Nenhum item encontrado.</Alert>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.codprod} hover>
                        <TableCell>{r.codprod}</TableCell>
                        <TableCell>{r.descrprod}</TableCell>
                        <TableCell>{r.codbarras ?? '-'}</TableCell>
                        <TableCell>
                          {r.codgrupo ?? '-'} {r.descgrupo ? `- ${r.descgrupo}` : ''}
                        </TableCell>
                        <TableCell>
                          {r.codfab ?? '-'} {r.fabricante ? `- ${r.fabricante}` : ''}
                        </TableCell>
                        <TableCell>{r.ativo ? 'SIM' : 'NÃO'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="body2">
              Total: {total} | Mostrando {rows.length} | Offset: {offset}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  const next = Math.max(0, offset - limit);
                  setOffset(next);
                  setTimeout(fetchProdutos, 0);
                }}
                disabled={loading || !canPrev}
              >
                Anterior
              </Button>

              <Button
                variant="outlined"
                onClick={() => {
                  const next = offset + limit;
                  setOffset(next);
                  setTimeout(fetchProdutos, 0);
                }}
                disabled={loading || !canNext}
              >
                Próxima
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
