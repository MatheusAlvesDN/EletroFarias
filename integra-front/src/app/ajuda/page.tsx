'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
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

type Produto = {
  CODPROD: number;
  DESCRPROD: string | null;
  CODBARRA?: string | null;
  CODGRUPOPROD?: number | null;
  MARCA?: string | null; // ✅ agora é string
  ATIVO?: any;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function ProdutosPage() {
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [rows, setRows] = useState<Produto[]>([]);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(200);
  const [page, setPage] = useState(0);

  // filtros
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedMarca, setSelectedMarca] = useState<string>('ALL');

  // seleção
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    msg: '',
    severity: 'info',
  });

  const fetchAll = async () => {
    setLoading(true);
    setErrMsg(null);
    try {
      const res = await fetch(`${API_BASE}/sync/getAllProdutos`, { method: 'GET' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const items: Produto[] = Array.isArray(data) ? data : (data?.items ?? []);

      setRows(items);
      setPage(0);
      setSelectedIds(new Set());
      setSelectedGroup('ALL');
      setSelectedMarca('ALL');

      setSnack({ open: true, msg: `Carregado: ${items.length} produtos`, severity: 'success' });
    } catch (e: any) {
      setErrMsg(e?.message ?? 'Erro ao carregar');
      setRows([]);
      setSnack({ open: true, msg: e?.message ?? 'Erro ao carregar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // lista de grupos possíveis
  const groupOptions = useMemo(() => {
    const s = new Set<number>();
    for (const r of rows) {
      const v = r.CODGRUPOPROD;
      if (typeof v === 'number' && Number.isFinite(v)) s.add(v);
    }
    return Array.from(s).sort((a, b) => a - b);
  }, [rows]);

  // lista de marcas possíveis (string)
  const marcaOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      const v = (r.MARCA ?? '').trim();
      if (v) s.add(v);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // aplica busca + filtros
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    const groupFilter = selectedGroup === 'ALL' ? null : Number(selectedGroup);
    const marcaFilter = selectedMarca === 'ALL' ? null : selectedMarca;

    return rows.filter((r) => {
      if (groupFilter != null && r.CODGRUPOPROD !== groupFilter) return false;

      const marca = (r.MARCA ?? '').trim();
      if (marcaFilter != null && marca !== marcaFilter) return false;

      if (!s) return true;

      const cod = String(r.CODPROD ?? '').toLowerCase();
      const desc = (r.DESCRPROD ?? '').toLowerCase();
      const barra = String(r.CODBARRA ?? '').toLowerCase();
      const m = marca.toLowerCase();

      return cod.includes(s) || desc.includes(s) || barra.includes(s) || m.includes(s);
    });
  }, [rows, search, selectedGroup, selectedMarca]);

  // paginação
  const safePageSize = Math.min(Math.max(Number(pageSize) || 200, 25), 500);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const pageClamped = Math.min(Math.max(page, 0), totalPages - 1);

  const start = pageClamped * safePageSize;
  const end = start + safePageSize;
  const paged = filtered.slice(start, end);

  // seleção
  const isSelected = (codprod: number) => selectedIds.has(codprod);

  const toggleOne = (codprod: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(codprod)) next.delete(codprod);
      else next.add(codprod);
      return next;
    });
  };

  const pageAllSelected = paged.length > 0 && paged.every((r) => selectedIds.has(r.CODPROD));
  const pageSomeSelected = paged.some((r) => selectedIds.has(r.CODPROD));

  const togglePage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const shouldSelectAll = !paged.every((r) => next.has(r.CODPROD));
      for (const r of paged) {
        if (shouldSelectAll) next.add(r.CODPROD);
        else next.delete(r.CODPROD);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleEnviar = () => {
    const ids = Array.from(selectedIds);
    // FUTURO: POST com os itens selecionados
    setSnack({ open: true, msg: `Enviar: ${ids.length} itens selecionados (stub)`, severity: 'info' });
  };

  const onChangeGroup = (e: SelectChangeEvent<string>) => {
    setSelectedGroup(e.target.value);
    setPage(0);
  };

  const onChangeMarca = (e: SelectChangeEvent<string>) => {
    setSelectedMarca(e.target.value);
    setPage(0);
  };

  return (
    <Box sx={{ p: 2, height: '100vh', boxSizing: 'border-box' }}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h5">Produtos — {rows.length}</Typography>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={fetchAll} disabled={loading}>
                Recarregar
              </Button>
              <Button variant="outlined" onClick={clearSelection} disabled={selectedIds.size === 0}>
                Limpar seleção
              </Button>
              <Button variant="contained" onClick={handleEnviar} disabled={selectedIds.size === 0}>
                Enviar ({selectedIds.size})
              </Button>
            </Box>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="Buscar (código / descrição / barras / marca)"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              size="small"
              sx={{ minWidth: 320, flex: 1 }}
            />

            <FormControl size="small" sx={{ width: 220 }}>
              <InputLabel>CODGRUPOPROD</InputLabel>
              <Select value={selectedGroup} label="CODGRUPOPROD" onChange={onChangeGroup}>
                <MenuItem value="ALL">Todos</MenuItem>
                {groupOptions.map((g) => (
                  <MenuItem key={g} value={String(g)}>
                    {g}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ width: 260 }}>
              <InputLabel>MARCA</InputLabel>
              <Select value={selectedMarca} label="MARCA" onChange={onChangeMarca}>
                <MenuItem value="ALL">Todas</MenuItem>
                {marcaOptions.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Linhas por página"
              value={safePageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value || 200));
                setPage(0);
              }}
              size="small"
              sx={{ width: 180 }}
              inputProps={{ inputMode: 'numeric' }}
            />
          </Box>

          {errMsg ? <Alert severity="error">{errMsg}</Alert> : null}

          <Paper sx={{ flex: 1, overflow: 'hidden' }}>
            <TableContainer sx={{ height: '100%' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ width: 48 }}>
                      <Checkbox checked={pageAllSelected} indeterminate={!pageAllSelected && pageSomeSelected} onChange={togglePage} />
                    </TableCell>
                    <TableCell sx={{ width: 110 }}>CODPROD</TableCell>
                    <TableCell>DESCRPROD</TableCell>
                    <TableCell sx={{ width: 140 }}>CODGRUPO</TableCell>
                    <TableCell sx={{ width: 220 }}>MARCA</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                          <CircularProgress size={22} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : paged.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Alert severity="info">Nenhum produto encontrado.</Alert>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map((r) => (
                      <TableRow key={r.CODPROD} hover>
                        <TableCell padding="checkbox">
                          <Checkbox checked={isSelected(r.CODPROD)} onChange={() => toggleOne(r.CODPROD)} />
                        </TableCell>
                        <TableCell>{r.CODPROD}</TableCell>
                        <TableCell sx={{ wordBreak: 'break-word' }}>{r.DESCRPROD ?? '-'}</TableCell>
                        <TableCell>{r.CODGRUPOPROD ?? '-'}</TableCell>
                        <TableCell>{(r.MARCA ?? '').trim() || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              Filtrados: {total} | Página: {pageClamped + 1}/{totalPages} | Selecionados: {selectedIds.size}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" disabled={loading || pageClamped <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Anterior
              </Button>
              <Button
                variant="outlined"
                disabled={loading || pageClamped >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Próxima
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
