'use client';

import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function MercadoLivreCadastradosPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const pageClamped = Math.min(Math.max(page, 1), totalPages);
  const firstItem = total === 0 ? 0 : (pageClamped - 1) * limit + 1;
  const lastItem = total === 0 ? 0 : Math.min(pageClamped * limit, total);

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'active':
        return 'Ativos';
      case 'paused':
        return 'Pausados';
      case 'closed':
        return 'Encerrados';
      default:
        return 'Todos';
    }
  }, [status]);

  const fetchProdutos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(pageClamped));
      params.set('limit', String(limit));

      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (status !== 'ALL') params.set('status', status);

      const res = await fetch(`${API_BASE}/mercadolivre/cadastrados?${params.toString()}`);

      if (!res.ok) {
        throw new Error((await res.text()) || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setRows(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.paging?.total ?? 0));
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao buscar produtos cadastrados');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, pageClamped, limit]);

  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, limit]);

  const handleClearFilters = () => {
    setSearch('');
    setStatus('ALL');
    setLimit(50);
    setPage(1);
  };

  return (
    <Box sx={{ p: 2, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Produtos Cadastrados no Mercado Livre
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lista paginada dos anúncios já existentes na conta do Mercado Livre
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Link href="/mercadoLivre" style={{ textDecoration: 'none' }}>
                <Button variant="outlined">Voltar para Cadastro</Button>
              </Link>

              <Button variant="contained" onClick={fetchProdutos} disabled={loading}>
                Atualizar
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.5fr 180px 140px auto' }, gap: 2, mb: 2 }}>
            <TextField
              label="Buscar por título ou ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              fullWidth
              helperText="Pesquisa no backend do Mercado Livre"
            />

            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="ALL">Todos</MenuItem>
                <MenuItem value="active">Ativos</MenuItem>
                <MenuItem value="paused">Pausados</MenuItem>
                <MenuItem value="closed">Encerrados</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel>Por página</InputLabel>
              <Select
                value={String(limit)}
                label="Por página"
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                <MenuItem value="25">25</MenuItem>
                <MenuItem value="50">50</MenuItem>
                <MenuItem value="75">75</MenuItem>
                <MenuItem value="100">100</MenuItem>
              </Select>
            </FormControl>

            <Button variant="outlined" onClick={handleClearFilters}>
              Limpar Filtros
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Chip label={`Status: ${statusLabel}`} color="primary" variant="outlined" />
            <Chip label={`Total encontrado: ${total}`} color="secondary" variant="outlined" />
            <Chip label={`Exibindo: ${firstItem} - ${lastItem}`} variant="outlined" />
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Paper variant="outlined">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Título</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Preço</TableCell>
                    <TableCell>Estoque</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : rows.length > 0 ? (
                    rows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.id}</TableCell>
                        <TableCell sx={{ minWidth: 320 }}>{row.title}</TableCell>
                        <TableCell>
                          <Chip
                            label={row.status}
                            color={
                              row.status === 'active'
                                ? 'success'
                                : row.status === 'paused'
                                  ? 'warning'
                                  : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {Number(row.price ?? 0).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </TableCell>
                        <TableCell>{row.available_quantity ?? 0}</TableCell>
                        <TableCell>{row.listing_type_id ?? '-'}</TableCell>
                        <TableCell>
                          {row.permalink && (
                            <Button
                              size="small"
                              href={row.permalink}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir anúncio
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        Nenhum anúncio encontrado para os filtros informados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 2,
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Página {pageClamped} de {totalPages}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={() => setPage(1)}
                disabled={loading || pageClamped === 1}
              >
                Primeira
              </Button>
              <Button
                variant="outlined"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={loading || pageClamped === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outlined"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={loading || pageClamped >= totalPages}
              >
                Próxima
              </Button>
              <Button
                variant="outlined"
                onClick={() => setPage(totalPages)}
                disabled={loading || pageClamped >= totalPages}
              >
                Última
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
