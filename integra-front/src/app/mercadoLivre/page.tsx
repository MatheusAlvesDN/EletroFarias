'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
  Badge
} from '@mui/material';
import {
  KeyboardArrowUp,
  KeyboardArrowDown,
  PlaylistAddCheck,
  FilterList
} from '@mui/icons-material';

// --- TIPOS ---
type Produto = {
  CODPROD: number;
  DESCRPROD: string | null;
  CODBARRA?: string | null;
  CODGRUPOPROD?: number | null;
  DESCRGRUPOPROD?: string | null;
  MARCA?: string;
  ATIVO?: any;
  CODBARRAS?: string[];
  PRECO?: number;
  ESTOQUE?: number;
  category_id?: string;
};

type ResultadoCadastro = {
  ok: boolean;
  codProd: number;
  produto: string;
  erro?: any;
  response?: any;
};

type CadastroResponse = {
  message?: string;
  total?: number;
  sucesso?: number;
  erro?: number;
  resultados?: ResultadoCadastro[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const MERCADO_LIVRE_PRODUTOS_ENDPOINT =
  process.env.NEXT_PUBLIC_ML_PRODUTOS_URL ??
  `${API_BASE}/sync/getAllProdutos`;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function formatCadastroError(erro: any): string {
  if (!erro) return 'Erro não informado';
  if (typeof erro === 'string') return erro;

  if (Array.isArray(erro?.cause) && erro.cause.length > 0) {
    return erro.cause
      .map((item: any) => item?.message || item?.code || JSON.stringify(item))
      .join(' | ');
  }

  if (erro?.message) return String(erro.message);
  if (erro?.error) return String(erro.error);

  try {
    return JSON.stringify(erro);
  } catch {
    return 'Erro não informado';
  }
}

const ProdutoRow = React.memo(({
  row,
  isChecked,
  isAlreadySelected,
  onToggle,
  onAddOne
}: {
  row: Produto;
  isChecked: boolean;
  isAlreadySelected: boolean;
  onToggle: (id: number) => void;
  onAddOne: (p: Produto) => void;
}) => {
  return (
    <TableRow
      hover
      onClick={() => {
        if (!isAlreadySelected) onAddOne(row);
      }}
      sx={{
        cursor: isAlreadySelected ? 'default' : 'pointer',
        opacity: isAlreadySelected ? 0.6 : 1
      }}
    >
      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isChecked}
          onChange={() => onToggle(row.CODPROD)}
        />
      </TableCell>
      <TableCell>{row.CODPROD}</TableCell>
      <TableCell sx={{ wordBreak: 'break-word' }}>
        {row.DESCRPROD ?? '-'}
      </TableCell>
      <TableCell>{(row.CODBARRA ?? '').trim() || '-'}</TableCell>
      <TableCell>{(row.DESCRGRUPOPROD ?? '').trim() || '-'}</TableCell>
      <TableCell>{(row.MARCA ?? '').trim() || '-'}</TableCell>
      <TableCell>
        {isAlreadySelected ? (
          <Typography variant="caption" color="text.disabled">
            Selecionado
          </Typography>
        ) : (
          <Typography variant="caption" color="primary">
            Consultado
          </Typography>
        )}
      </TableCell>
    </TableRow>
  );
}, (prev, next) => {
  return (
    prev.isChecked === next.isChecked &&
    prev.isAlreadySelected === next.isAlreadySelected &&
    prev.row === next.row
  );
});

ProdutoRow.displayName = 'ProdutoRow';

export default function MercadoLivrePage() {
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<Produto[]>([]);
  const [lastQueryCount, setLastQueryCount] = useState(0);
  const [lastSendSummary, setLastSendSummary] = useState<string | null>(null);
  const [lastSendErrors, setLastSendErrors] = useState<string[]>([]);
  const [searchTermInput, setSearchTermInput] = useState('');
  const debouncedSearch = useDebounce(searchTermInput, 300);
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedMarca, setSelectedMarca] = useState<string>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [pageSize, setPageSize] = useState(200);
  const [page, setPage] = useState(0);
  const [checkedTop, setCheckedTop] = useState<Set<number>>(new Set());
  const [checkedBottom, setCheckedBottom] = useState<Set<number>>(new Set());
  const [selectedMap, setSelectedMap] = useState<Map<number, Produto>>(new Map());
  const [snack, setSnack] = useState<{
    open: boolean;
    msg: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    msg: '',
    severity: 'info'
  });

  const resetFilters = () => {
    setPage(0);
    setCheckedTop(new Set());
    setCheckedBottom(new Set());
    setSelectedGroup('ALL');
    setSelectedMarca('ALL');
    setSearchTermInput('');
  };

  const fetchProdutosSankhya = async () => {
    setLoading(true);
    setErrMsg(null);

    try {
      const res = await fetch(MERCADO_LIVRE_PRODUTOS_ENDPOINT, { method: 'GET' });

      if (!res.ok) {
        throw new Error((await res.text()) || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const items: Produto[] = Array.isArray(data) ? data : (data?.items ?? []);

      setRows(items);
      setLastQueryCount(items.length);
      setLastSendSummary(null);
      setLastSendErrors([]);
      resetFilters();

      setSnack({
        open: true,
        msg: `Consulta carregada: ${items.length} produto(s)`,
        severity: 'success'
      });
    } catch (e: any) {
      setErrMsg(e?.message ?? 'Erro ao consultar produtos para o Mercado Livre');
      setRows([]);
      setLastQueryCount(0);

      setSnack({
        open: true,
        msg: e?.message ?? 'Erro ao consultar produtos para o Mercado Livre',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutosSankhya();
  }, []);

  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    const marcaFilter = selectedMarca === 'ALL' ? null : selectedMarca;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (marcaFilter && (r.MARCA ?? '').trim() !== marcaFilter) continue;
      if (r.DESCRGRUPOPROD) set.add(r.DESCRGRUPOPROD.trim());
    }

    return Array.from(set).sort();
  }, [rows, selectedMarca]);

  const marcaOptions = useMemo(() => {
    const set = new Set<string>();
    const groupFilter = selectedGroup === 'ALL' ? null : selectedGroup;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (groupFilter && (r.DESCRGRUPOPROD ?? '').trim() !== groupFilter) continue;
      if (r.MARCA) set.add(r.MARCA.trim());
    }

    return Array.from(set).sort();
  }, [rows, selectedGroup]);

  const filteredTop = useMemo(() => {
    const s = debouncedSearch.trim().toLowerCase();
    const groupFilter = selectedGroup === 'ALL' ? null : selectedGroup;
    const marcaFilter = selectedMarca === 'ALL' ? null : selectedMarca;

    if (!s && !groupFilter && !marcaFilter) return rows;

    return rows.filter((r) => {
      const grupoDesc = (r.DESCRGRUPOPROD ?? '').trim();
      const marca = (r.MARCA ?? '').trim();

      if (groupFilter && grupoDesc !== groupFilter) return false;
      if (marcaFilter && marca !== marcaFilter) return false;
      if (!s) return true;

      return (
        String(r.CODPROD).toLowerCase().includes(s) ||
        (r.DESCRPROD ?? '').toLowerCase().includes(s) ||
        (r.CODBARRA ?? '').toLowerCase().includes(s)
      );
    });
  }, [rows, debouncedSearch, selectedGroup, selectedMarca]);

  const safePageSize = Math.max(Number(pageSize) || 200, 10);
  const totalTop = filteredTop.length;
  const totalPages = Math.ceil(totalTop / safePageSize) || 1;
  const pageClamped = Math.min(Math.max(page, 0), totalPages - 1);

  const pagedTop = useMemo(() => {
    const start = pageClamped * safePageSize;
    return filteredTop.slice(start, start + safePageSize);
  }, [filteredTop, pageClamped, safePageSize]);

  const rowsIndex = useMemo(() => {
    const m = new Map<number, Produto>();
    for (const r of rows) m.set(r.CODPROD, r);
    return m;
  }, [rows]);

  const addOneToBottom = useCallback((p: Produto) => {
    setSelectedMap((prev) => {
      if (prev.has(p.CODPROD)) return prev;
      const next = new Map(prev);
      next.set(p.CODPROD, p);
      return next;
    });

    setSnack({
      open: true,
      msg: `Adicionado: ${p.CODPROD}`,
      severity: 'success'
    });
  }, []);

  const toggleCheckedTop = useCallback((id: number) => {
    setCheckedTop((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addCheckedTop = () => {
    if (checkedTop.size === 0) return;

    let count = 0;

    setSelectedMap((prev) => {
      const next = new Map(prev);

      checkedTop.forEach((id) => {
        const p = rowsIndex.get(id);
        if (p && !next.has(id)) {
          next.set(id, p);
          count++;
        }
      });

      return next;
    });

    setCheckedTop(new Set());

    setSnack({
      open: true,
      msg: `${count} item(ns) adicionados.`,
      severity: 'success'
    });
  };

  const addAllFilteredTop = () => {
    if (filteredTop.length === 0) return;

    if (filteredTop.length > 2000) {
      if (!window.confirm(`Você está prestes a adicionar ${filteredTop.length} itens. Deseja continuar?`)) {
        return;
      }
    }

    let count = 0;

    setSelectedMap((prev) => {
      const next = new Map(prev);
      for (const p of filteredTop) {
        if (!next.has(p.CODPROD)) {
          next.set(p.CODPROD, p);
          count++;
        }
      }
      return next;
    });

    const nomeFiltro = selectedGroup !== 'ALL' ? `do grupo ${selectedGroup}` : 'da consulta atual';

    setSnack({
      open: true,
      msg: `${count} item(ns) ${nomeFiltro} foram adicionados.`,
      severity: 'success'
    });
  };

  const removeCheckedBottom = () => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      checkedBottom.forEach((id) => next.delete(id));
      return next;
    });
    setCheckedBottom(new Set());
  };

  const clearBottom = () => {
    setSelectedMap(new Map());
    setCheckedBottom(new Set());
  };

  const handleEnviar = async () => {
    const categoryId = selectedCategoryId.trim().toUpperCase();
    const produtos = Array.from(selectedMap.values()).map((produto) => ({
      ...produto,
      category_id: categoryId || undefined,
    }));

    if (produtos.length === 0) return;

    setLoading(true);
    setLastSendSummary(null);
    setLastSendErrors([]);

    try {
      const res = await fetch(`${API_BASE}/mercadolivre/cadastrarProdutos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtos })
      });

      const data: CadastroResponse = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error((typeof data?.message === 'string' && data.message) || `HTTP ${res.status}`);
      }

      const sucesso = Number(data?.sucesso ?? 0);
      const erro = Number(data?.erro ?? 0);
      const resultados = Array.isArray(data?.resultados) ? data.resultados : [];
      const errosFormatados = resultados
        .filter((item) => !item.ok)
        .map((item) => `${item.codProd} - ${item.produto}: ${formatCadastroError(item.erro)}`);

      const resumo = `Processamento finalizado. Sucesso: ${sucesso}. Falha: ${erro}.`;

      setLastSendSummary(resumo);
      setLastSendErrors(errosFormatados);

      if (sucesso > 0 && erro === 0) {
        setSnack({ open: true, msg: resumo, severity: 'success' });
        clearBottom();
        return;
      }

      if (sucesso > 0) {
        setSnack({ open: true, msg: resumo, severity: 'info' });
        setSelectedMap((prev) => {
          const next = new Map(prev);
          resultados.filter((item) => item.ok).forEach((item) => next.delete(item.codProd));
          return next;
        });
        setCheckedBottom(new Set());
        return;
      }

      setSnack({ open: true, msg: resumo, severity: 'error' });
    } catch (e: any) {
      const mensagem = e?.message ?? 'Erro ao enviar produtos ao Mercado Livre';
      setLastSendSummary(mensagem);
      setLastSendErrors([]);
      setSnack({ open: true, msg: `Erro: ${mensagem}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const topPageAllSelected = pagedTop.length > 0 && pagedTop.every((p) => checkedTop.has(p.CODPROD));

  const toggleTopPageAll = () => {
    setCheckedTop((prev) => {
      const next = new Set(prev);
      if (topPageAllSelected) pagedTop.forEach((p) => next.delete(p.CODPROD));
      else pagedTop.forEach((p) => next.add(p.CODPROD));
      return next;
    });
  };

  return (
    <Box sx={{ p: 2, height: '100vh', boxSizing: 'border-box', bgcolor: '#f5f5f5' }}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" fontWeight="bold" sx={{ color: '#FFE600', textShadow: '1px 1px 2px rgba(0,0,0,0.2)' }}>
                Integração Mercado Livre
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Selecione os produtos e o backend complementa preço e estoque no envio
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                component={Link}
                href="/mercadoLivre/cadastrados"
                variant="outlined"
                disabled={loading}
              >
                Consultar Produtos Cadastrados
              </Button>

              <Button variant="outlined" onClick={fetchProdutosSankhya} disabled={loading}>
                Reconsultar Produtos
              </Button>

              <Button
                variant="contained"
                sx={{ bgcolor: '#2D3277', '&:hover': { bgcolor: '#1A1E52' } }}
                onClick={handleEnviar}
                disabled={loading || selectedMap.size === 0}
                endIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              >
                ENVIAR ({selectedMap.size})
              </Button>
            </Box>
          </Box>

          <Divider />

          {(lastSendSummary || lastSendErrors.length > 0) && (
            <Alert severity={lastSendErrors.length > 0 ? 'warning' : 'success'}>
              <Typography variant="body2" fontWeight="bold">
                {lastSendSummary ?? 'Resultado do envio'}
              </Typography>

              {lastSendErrors.length > 0 && (
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                  {lastSendErrors.slice(0, 8).map((erro, index) => (
                    <Box component="li" key={`${erro}-${index}`} sx={{ mb: 0.5 }}>
                      <Typography variant="caption">{erro}</Typography>
                    </Box>
                  ))}
                  {lastSendErrors.length > 8 && (
                    <Box component="li">
                      <Typography variant="caption">... e mais {lastSendErrors.length - 8} erro(s).</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 60px 1fr 280px' }, gap: 2, flex: 1, minHeight: 0 }}>
            <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <Box sx={{ p: 1, bgcolor: '#fafafa', borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Produtos Disponíveis - Mercado Livre ({filteredTop.length})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Última consulta retornou {lastQueryCount} item(ns)
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Adicionar todos os itens listados da consulta atual">
                    <Button size="small" variant="contained" sx={{ bgcolor: '#2D3277' }} startIcon={<PlaylistAddCheck />} onClick={addAllFilteredTop} disabled={loading || filteredTop.length === 0}>
                      Adicionar Listados
                    </Button>
                  </Tooltip>
                </Box>
              </Box>

              <TableContainer sx={{ flex: 1 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={topPageAllSelected}
                          indeterminate={!topPageAllSelected && checkedTop.size > 0 && pagedTop.some((p) => checkedTop.has(p.CODPROD))}
                          onChange={toggleTopPageAll}
                        />
                      </TableCell>
                      <TableCell width={80}>COD</TableCell>
                      <TableCell>DESCRIÇÃO</TableCell>
                      <TableCell width={120}>EAN</TableCell>
                      <TableCell width={150}>GRUPO</TableCell>
                      <TableCell width={150}>MARCA</TableCell>
                      <TableCell width={100}>STATUS</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {pagedTop.map((row) => (
                      <ProdutoRow
                        key={row.CODPROD}
                        row={row}
                        isChecked={checkedTop.has(row.CODPROD)}
                        isAlreadySelected={selectedMap.has(row.CODPROD)}
                        onToggle={toggleCheckedTop}
                        onAddOne={addOneToBottom}
                      />
                    ))}

                    {pagedTop.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          {errMsg ? `Erro na consulta de produtos do Mercado Livre: ${errMsg}` : 'Nenhum produto retornado pela consulta do Mercado Livre.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="caption">Pág {pageClamped + 1} de {totalPages}</Typography>

                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Qtd</InputLabel>
                  <Select value={String(pageSize)} label="Qtd" onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}>
                    <MenuItem value="50">50</MenuItem>
                    <MenuItem value="100">100</MenuItem>
                    <MenuItem value="200">200</MenuItem>
                    <MenuItem value="500">500</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" disabled={pageClamped === 0} onClick={() => setPage((p) => p - 1)}>Ant</Button>
                  <Button size="small" disabled={pageClamped >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Prox</Button>
                </Box>
              </Box>
            </Paper>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'row', lg: 'column' }, justifyContent: 'center', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Adicionar itens marcados com checkbox">
                <span>
                  <IconButton color="primary" onClick={addCheckedTop} disabled={checkedTop.size === 0} sx={{ border: 1, borderColor: 'divider' }}>
                    <KeyboardArrowDown />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Remover itens marcados da lista inferior">
                <span>
                  <IconButton color="error" onClick={removeCheckedBottom} disabled={checkedBottom.size === 0} sx={{ border: 1, borderColor: 'divider' }}>
                    <KeyboardArrowUp />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', borderColor: '#FFE600', borderWidth: 2 }}>
              <Box sx={{ p: 1, bgcolor: '#FFFDE7', borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge badgeContent={selectedMap.size} color="primary">
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mr: 2 }}>Anunciar no Meli</Typography>
                </Badge>

                <Button size="small" color="error" onClick={clearBottom} disabled={selectedMap.size === 0}>Limpar Tudo</Button>
              </Box>

              <TableContainer sx={{ flex: 1 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedMap.size > 0 && checkedBottom.size === selectedMap.size}
                          onChange={() => {
                            if (checkedBottom.size === selectedMap.size) setCheckedBottom(new Set());
                            else setCheckedBottom(new Set(selectedMap.keys()));
                          }}
                        />
                      </TableCell>
                      <TableCell>COD</TableCell>
                      <TableCell>DESCRIÇÃO</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {Array.from(selectedMap.values()).map((r) => (
                      <TableRow key={r.CODPROD} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={checkedBottom.has(r.CODPROD)}
                            onChange={() => {
                              setCheckedBottom((prev) => {
                                const next = new Set(prev);
                                if (next.has(r.CODPROD)) next.delete(r.CODPROD);
                                else next.add(r.CODPROD);
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell>{r.CODPROD}</TableCell>
                        <TableCell>{r.DESCRPROD ?? '-'}</TableCell>
                      </TableRow>
                    ))}

                    {selectedMap.size === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                          Nenhum item selecionado para envio ao Mercado Livre.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterList color="action" />
                <Typography variant="h6">Filtros</Typography>
              </Box>

              <TextField
                label="Buscar (Cod, Nome, EAN)"
                size="small"
                fullWidth
                value={searchTermInput}
                onChange={(e) => { setSearchTermInput(e.target.value); setPage(0); }}
                helperText="Filtra os itens da consulta atual"
              />

              <TextField
                label="Categoria ML para envio"
                size="small"
                fullWidth
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value.toUpperCase())}
                placeholder="Ex.: MLB1055"
                helperText="Informe o category_id que será usado na publicação dos itens selecionados"
              />

              <FormControl size="small" fullWidth>
                <InputLabel>Grupo</InputLabel>
                <Select value={selectedGroup} label="Grupo" onChange={(e) => { setSelectedGroup(e.target.value); setPage(0); }}>
                  <MenuItem value="ALL">Todos os Grupos</MenuItem>
                  {groupOptions.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>Marca</InputLabel>
                <Select value={selectedMarca} label="Marca" onChange={(e) => { setSelectedMarca(e.target.value); setPage(0); }}>
                  <MenuItem value="ALL">Todas as Marcas</MenuItem>
                  {marcaOptions.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </Select>
              </FormControl>

              {errMsg && <Alert severity="error">{errMsg}</Alert>}
            </Paper>
          </Box>
        </CardContent>
      </Card>

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
