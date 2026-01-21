'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function IfoodPage() {
  const [groupId, setGroupId] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    msg: '',
    severity: 'info',
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (groupId.trim()) params.set('groupId', groupId.trim());
    if (manufacturerId.trim()) params.set('manufacturerId', manufacturerId.trim());
    if (search.trim()) params.set('search', search.trim());
    params.set('limit', '50');
    params.set('offset', '0');
    return params.toString();
  }, [groupId, manufacturerId, search]);

  const consultar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sync/produtos?${queryString}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSnack({ open: true, msg: `OK: ${data?.items?.length ?? 0} itens (total ${data?.total ?? 0})`, severity: 'success' });
    } catch (e: any) {
      setSnack({ open: true, msg: e?.message ?? 'Erro ao consultar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  return (
    <Box sx={{ p: 2, height: '100vh', boxSizing: 'border-box' }}>
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h5">iFood - Consulta de Produtos (Sankhya)</Typography>
          <Divider />

          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
                value={manufacturerId}
                onChange={(e) => setManufacturerId(e.target.value)}
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

              <Button variant="contained" onClick={consultar} disabled={loading}>
                {loading ? 'Consultando...' : 'Consultar'}
              </Button>
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              Este é um esqueleto da página. Se quiser, eu encaixo aqui a tabela completa com paginação e ações.
            </Alert>
          </Paper>
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
