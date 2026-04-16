'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

type MarcaOption = {
  id: number;
  nome: string;
};

type ProdutoRow = {
  CODPROD: number;
  DESCRPROD: string | null;
  CODBARRA?: string | null;
  CODBARRAS?: string[];
  CODGRUPOPROD?: number | null;
  DESCRGRUPOPROD?: string | null;
  MARCA?: string | null;
  CODFAB?: number | null;
  ATIVO?: string | null;
  USOPROD?: string | null;
};

type ProdutosResponse = {
  items: ProdutoRow[];
  total: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function MercadoLivrePage() {
  const [marcas, setMarcas] = useState<MarcaOption[]>([]);
  const [marcasLoading, setMarcasLoading] = useState(false);
  const [marcaSearch, setMarcaSearch] = useState('');
  const [selectedMarcas, setSelectedMarcas] = useState<MarcaOption[]>([]);

  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<ProdutoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const carregarMarcas = useCallback(async (term?: string) => {
    setMarcasLoading(true);
    try {
      const params = new URLSearchParams();
      if (term?.trim()) params.set('search', term.trim());

      const res = await fetch(`${API_BASE}/sync/marcas?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Erro ao carregar marcas');
      }

      const data: MarcaOption[] = await res.json();
      setMarcas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setMarcas([]);
    } finally {
      setMarcasLoading(false);
    }
  }, []);

  const carregarProdutos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      const manufacturerIds = selectedMarcas.map((m) => m.id).join(',');
      if (manufacturerIds) params.set('manufacturerIds', manufacturerIds);
      if (search.trim()) params.set('search', search.trim());

      params.set('limit', String(rowsPerPage));
      params.set('offset', String(page * rowsPerPage));

      const res = await fetch(`${API_BASE}/sync/produtos?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Erro ao carregar produtos');
      }

      const data: ProdutosResponse = await res.json();

      setRows(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total || 0));
    } catch (err: any) {
      console.error(err);
      setRows([]);
      setTotal(0);
      setError(err?.message || 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, selectedMarcas]);

  useEffect(() => {
    carregarMarcas();
  }, [carregarMarcas]);

  useEffect(() => {
    const t = setTimeout(() => {
      carregarMarcas(marcaSearch);
    }, 400);

    return () => clearTimeout(t);
  }, [marcaSearch, carregarMarcas]);

  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  const produtosSelecionados = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return rows.filter((row) => selectedSet.has(Number(row.CODPROD)));
  }, [rows, selectedIds]);

  const isSelected = (codProd: number) => selectedIds.includes(Number(codProd));

  const toggleRow = (codProd: number) => {
    setSelectedIds((prev) =>
      prev.includes(codProd)
        ? prev.filter((id) => id !== codProd)
        : [...prev, codProd]
    );
  };

  const toggleSelecionarPagina = () => {
    const pageIds = rows.map((r) => Number(r.CODPROD));
    const todosSelecionados = pageIds.every((id) => selectedIds.includes(id));

    if (todosSelecionados) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
  };

  const cadastrarSelecionados = async () => {
    try {
      const res = await fetch(`${API_BASE}/sync/cadastrarProdutosIfood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          produtos: produtosSelecionados,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Erro ao cadastrar produtos');
      }

      alert(`Produtos enviados: ${produtosSelecionados.length}`);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Erro ao cadastrar produtos');
    }
  };

  const todosDaPaginaSelecionados =
    rows.length > 0 && rows.every((r) => selectedIds.includes(Number(r.CODPROD)));

  return (
    <Box sx={{ p: 2, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Mercado Livre
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Selecione marcas e carregue apenas produtos com ATIVO = S e USOPROD = R
            </Typography>
          </Box>

          <Autocomplete
            multiple
            options={marcas}
            value={selectedMarcas}
            loading={marcasLoading}
            onChange={(_, value) => {
              setSelectedMarcas(value);
              setPage(0);
            }}
            onInputChange={(_, value) => {
              setMarcaSearch(value);
            }}
            getOptionLabel={(option) => option.nome}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(x) => x}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option.nome}
                  size="small"
                  {...getTagProps({ index })}
                  key={option.id}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Marcas"
                placeholder="Pesquise e selecione marcas"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {marcasLoading ? <CircularProgress size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Pesquisar produto"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Descrição, código ou código de barras"
              fullWidth
            />

            <Button
              variant="contained"
              onClick={carregarProdutos}
              disabled={loading}
              sx={{ minWidth: 180 }}
            >
              Buscar produtos
            </Button>

            <Button
              variant="outlined"
              onClick={cadastrarSelecionados}
              disabled={produtosSelecionados.length === 0}
              sx={{ minWidth: 220 }}
            >
              Cadastrar selecionados
            </Button>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Chip label={`Selecionados: ${selectedIds.length}`} color="primary" />
            <Chip label={`Total encontrado: ${total}`} variant="outlined" />
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          <Paper variant="outlined">
            <TableContainer sx={{ maxHeight: 650 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={todosDaPaginaSelecionados}
                        indeterminate={!todosDaPaginaSelecionados && selectedIds.some((id) => rows.map((r) => r.CODPROD).includes(id))}
                        onChange={toggleSelecionarPagina}
                      />
                    </TableCell>
                    <TableCell>Cód. Produto</TableCell>
                    <TableCell>Descrição</TableCell>
                    <TableCell>Marca</TableCell>
                    <TableCell>Grupo</TableCell>
                    <TableCell>Cód. Barra Principal</TableCell>
                    <TableCell>Todos os Cód. Barras</TableCell>
                    <TableCell>Ativo</TableCell>
                    <TableCell>Uso</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        Nenhum produto encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow
                        hover
                        key={row.CODPROD}
                        selected={isSelected(Number(row.CODPROD))}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected(Number(row.CODPROD))}
                            onChange={() => toggleRow(Number(row.CODPROD))}
                          />
                        </TableCell>
                        <TableCell>{row.CODPROD}</TableCell>
                        <TableCell>{row.DESCRPROD || '-'}</TableCell>
                        <TableCell>{row.MARCA || '-'}</TableCell>
                        <TableCell>{row.DESCRGRUPOPROD || '-'}</TableCell>
                        <TableCell>{row.CODBARRA || '-'}</TableCell>
                        <TableCell>
                          {Array.isArray(row.CODBARRAS) && row.CODBARRAS.length > 0
                            ? row.CODBARRAS.join(', ')
                            : '-'}
                        </TableCell>
                        <TableCell>{row.ATIVO || '-'}</TableCell>
                        <TableCell>{row.USOPROD || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[25, 50, 100]}
              labelRowsPerPage="Linhas por página"
            />
          </Paper>
        </Stack>
      </Paper>
    </Box>
  );
}