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
  IconButton,
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
import {KeyboardArrowUp, KeyboardArrowDown, KeyboardDoubleArrowUp, KeyboardDoubleArrowDown, } from '@mui/icons-material';

type Produto = {
  CODPROD: number;
  DESCRPROD: string | null;
  CODBARRA?: string | null;

  CODGRUPOPROD?: number | null;
  DESCRGRUPOPROD?: string | null;

  MARCA?: string;
  ATIVO?: any;

  CODBARRAS?: string[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function ProdutosPage() {
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [rows, setRows] = useState<Produto[]>([]);

  // filtros
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL'); // DESCRGRUPOPROD
  const [selectedMarca, setSelectedMarca] = useState<string>('ALL');

  // paginação (apenas na lista superior)
  const [pageSize, setPageSize] = useState(200);
  const [page, setPage] = useState(0);

  // seleção de checkboxes (apenas para ações em lote na lista superior/baixo)
  const [checkedTop, setCheckedTop] = useState<Set<number>>(new Set());
  const [checkedBottom, setCheckedBottom] = useState<Set<number>>(new Set());

  // lista inferior (produtos “enviados”)
  const [selectedMap, setSelectedMap] = useState<Map<number, Produto>>(new Map());

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
      setCheckedTop(new Set());
      setCheckedBottom(new Set());
      setSelectedGroup('ALL');
      setSelectedMarca('ALL');
      setSearch('');

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

  // -------------------------
  // opções com interseção
  // -------------------------
  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    const marcaFilter = selectedMarca === 'ALL' ? null : selectedMarca;

    for (const r of rows) {
      const marca = (r.MARCA ?? '').trim();
      if (marcaFilter != null && marca !== marcaFilter) continue;

      const descrGrupo = (r.DESCRGRUPOPROD ?? '').trim();
      if (descrGrupo) set.add(descrGrupo);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, selectedMarca]);

  const marcaOptions = useMemo(() => {
    const set = new Set<string>();
    const groupFilter = selectedGroup === 'ALL' ? null : selectedGroup;

    for (const r of rows) {
      const descrGrupo = (r.DESCRGRUPOPROD ?? '').trim();
      if (groupFilter != null && descrGrupo !== groupFilter) continue;

      const v = (r.MARCA ?? '').trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, selectedGroup]);

  useEffect(() => {
    if (selectedMarca !== 'ALL' && !marcaOptions.includes(selectedMarca)) {
      setSelectedMarca('ALL');
      setPage(0);
    }
    if (selectedGroup !== 'ALL' && !groupOptions.includes(selectedGroup)) {
      setSelectedGroup('ALL');
      setPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcaOptions, groupOptions]);

  // -------------------------
  // lista superior (filtrada)
  // -------------------------
  const filteredTop = useMemo(() => {
    const s = search.trim().toLowerCase();
    const groupFilter = selectedGroup === 'ALL' ? null : selectedGroup;
    const marcaFilter = selectedMarca === 'ALL' ? null : selectedMarca;

    return rows.filter((r) => {
      // não remove da lista superior se já estiver no selecionado (você pode manter visível)
      // se quiser esconder os já enviados, descomente:
      // if (selectedMap.has(r.CODPROD)) return false;

      const grupoDesc = (r.DESCRGRUPOPROD ?? '').trim();
      if (groupFilter != null && grupoDesc !== groupFilter) return false;

      const marca = (r.MARCA ?? '').trim();
      if (marcaFilter != null && marca !== marcaFilter) return false;

      if (!s) return true;

      const cod = String(r.CODPROD ?? '').toLowerCase();
      const desc = (r.DESCRPROD ?? '').toLowerCase();
      const barra = String(r.CODBARRA ?? '').toLowerCase();
      const m = marca.toLowerCase();
      const g = grupoDesc.toLowerCase();

      return cod.includes(s) || desc.includes(s) || barra.includes(s) || m.includes(s) || g.includes(s);
    });
  }, [rows, search, selectedGroup, selectedMarca]);

  // paginação apenas na lista superior
  const safePageSize = Math.min(Math.max(Number(pageSize) || 200, 25), 500);
  const totalTop = filteredTop.length;
  const totalPages = Math.max(1, Math.ceil(totalTop / safePageSize));
  const pageClamped = Math.min(Math.max(page, 0), totalPages - 1);

  const start = pageClamped * safePageSize;
  const end = start + safePageSize;
  const pagedTop = filteredTop.slice(start, end);

  // -------------------------
  // lista inferior (selecionada)
  // -------------------------
  const selectedBottom = useMemo(() => {
    return Array.from(selectedMap.values()).sort((a, b) => a.CODPROD - b.CODPROD);
  }, [selectedMap]);

  // -------------------------
  // ações: mover itens
  // -------------------------
  const addOneToBottom = (p: Produto) => {
    setSelectedMap((prev) => {
      if (prev.has(p.CODPROD)) return prev;
      const next = new Map(prev);
      next.set(p.CODPROD, p);
      return next;
    });
  };

  const removeOneFromBottom = (codprod: number) => {
    setSelectedMap((prev) => {
      if (!prev.has(codprod)) return prev;
      const next = new Map(prev);
      next.delete(codprod);
      return next;
    });
  };

  const toggleChecked = (setFn: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) => {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCheckedTop = () => {
    const items = rowsById(checkedTop);
    if (items.length === 0) return;

    setSelectedMap((prev) => {
      const next = new Map(prev);
      for (const p of items) next.set(p.CODPROD, p);
      return next;
    });

    setCheckedTop(new Set());
    setSnack({ open: true, msg: `Adicionados: ${items.length}`, severity: 'success' });
  };

  const addAllPagedTop = () => {
    if (pagedTop.length === 0) return;
    setSelectedMap((prev) => {
      const next = new Map(prev);
      for (const p of pagedTop) next.set(p.CODPROD, p);
      return next;
    });
    setCheckedTop(new Set());
    setSnack({ open: true, msg: `Adicionados (página): ${pagedTop.length}`, severity: 'success' });
  };

  const removeCheckedBottom = () => {
    if (checkedBottom.size === 0) return;
    const count = checkedBottom.size;

    setSelectedMap((prev) => {
      const next = new Map(prev);
      for (const id of checkedBottom) next.delete(id);
      return next;
    });

    setCheckedBottom(new Set());
    setSnack({ open: true, msg: `Removidos: ${count}`, severity: 'info' });
  };

  const clearBottom = () => {
    if (selectedMap.size === 0) return;
    setSelectedMap(new Map());
    setCheckedBottom(new Set());
    setSnack({ open: true, msg: 'Lista inferior limpa.', severity: 'info' });
  };

  // helper: pega produtos por id, a partir da lista completa
  const rowsIndex = useMemo(() => {
    const m = new Map<number, Produto>();
    for (const r of rows) m.set(r.CODPROD, r);
    return m;
  }, [rows]);

  function rowsById(ids: Set<number>): Produto[] {
    const out: Produto[] = [];
    for (const id of ids) {
      const p = rowsIndex.get(id);
      if (p) out.push(p);
    }
    return out;
  }

  // -------------------------
  // Enviar (POST com produtos selecionados)
  // -------------------------
  const handleEnviar = async () => {
    const produtos = Array.from(selectedMap.values());
    if (produtos.length === 0) {
      setSnack({ open: true, msg: 'Selecione produtos na lista inferior.', severity: 'info' });
      return;
    }

    setLoading(true);
    setErrMsg(null);

    try {
      const res = await fetch(`${API_BASE}/sync/cadastrarProdutosIfood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtos }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      let msg = `Enviado com sucesso: ${produtos.length} produto(s).`;
      try {
        const data = await res.json();
        if (data?.message) msg = String(data.message);
      } catch {
        // ignore
      }

      setSnack({ open: true, msg, severity: 'success' });
    } catch (e: any) {
      const m = e?.message ?? 'Erro ao enviar produtos';
      setErrMsg(m);
      setSnack({ open: true, msg: m, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const onChangeGroup = (e: SelectChangeEvent<string>) => {
    setSelectedGroup(e.target.value);
    setPage(0);
    setCheckedTop(new Set());
  };

  const onChangeMarca = (e: SelectChangeEvent<string>) => {
    setSelectedMarca(e.target.value);
    setPage(0);
    setCheckedTop(new Set());
  };

  // estados “select all” da lista superior/baixo (por página / por lista)
  const topAllChecked = pagedTop.length > 0 && pagedTop.every((p) => checkedTop.has(p.CODPROD));
  const topSomeChecked = pagedTop.some((p) => checkedTop.has(p.CODPROD));

  const toggleTopPageAll = () => {
    setCheckedTop((prev) => {
      const next = new Set(prev);
      const shouldSelectAll = !pagedTop.every((p) => next.has(p.CODPROD));
      for (const p of pagedTop) {
        if (shouldSelectAll) next.add(p.CODPROD);
        else next.delete(p.CODPROD);
      }
      return next;
    });
  };

  const bottomAllChecked = selectedBottom.length > 0 && selectedBottom.every((p) => checkedBottom.has(p.CODPROD));
  const bottomSomeChecked = selectedBottom.some((p) => checkedBottom.has(p.CODPROD));

  const toggleBottomAll = () => {
    setCheckedBottom((prev) => {
      const next = new Set(prev);
      const shouldSelectAll = !selectedBottom.every((p) => next.has(p.CODPROD));
      for (const p of selectedBottom) {
        if (shouldSelectAll) next.add(p.CODPROD);
        else next.delete(p.CODPROD);
      }
      return next;
    });
  };

  return (
    <Box sx={{ p: 2, height: '100vh', boxSizing: 'border-box' }}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
          {/* HEADER */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="h5">Produtos (Sankhya) — {rows.length}</Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="outlined" onClick={fetchAll} disabled={loading}>
                Recarregar
              </Button>
              <Button variant="outlined" onClick={clearBottom} disabled={loading || selectedMap.size === 0}>
                Limpar lista inferior
              </Button>
              <Button variant="contained" onClick={handleEnviar} disabled={loading || selectedMap.size === 0}>
                Enviar ({selectedMap.size})
              </Button>
            </Box>
          </Box>

          <Divider />

          {/* LAYOUT: topo (lista + filtros à direita) */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 280px' }, gap: 2, flex: 1, minHeight: 0 }}>
            {/* LISTA SUPERIOR */}
            <Paper sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <Box sx={{ p: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1">
                  Itens
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Button size="small" variant="outlined" onClick={addAllPagedTop} disabled={loading || pagedTop.length === 0}>
                    Adicionar página
                  </Button>
                  <Button size="small" variant="outlined" onClick={addCheckedTop} disabled={loading || checkedTop.size === 0}>
                    Adicionar marcados ({checkedTop.size})
                  </Button>

                  <TextField
                    label="Linhas/página"
                    value={safePageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value || 200));
                      setPage(0);
                      setCheckedTop(new Set());
                    }}
                    size="small"
                    sx={{ width: 160 }}
                    inputProps={{ inputMode: 'numeric' }}
                  />
                </Box>
              </Box>

              {errMsg ? <Alert severity="error" sx={{ mx: 1.5, mb: 1.5 }}>{errMsg}</Alert> : null}

              <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ width: 48 }}>
                        <Checkbox checked={topAllChecked} indeterminate={!topAllChecked && topSomeChecked} onChange={toggleTopPageAll} />
                      </TableCell>
                      <TableCell sx={{ width: 110 }}>CODPROD</TableCell>
                      <TableCell>DESCRPROD</TableCell>
                      <TableCell sx={{ width: 160 }}>CODBARRA</TableCell>
                      <TableCell sx={{ width: 240 }}>GRUPO</TableCell>
                      <TableCell sx={{ width: 220 }}>MARCA</TableCell>
                      <TableCell sx={{ width: 120 }}>STATUS</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                            <CircularProgress size={22} />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : pagedTop.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Alert severity="info">Nenhum produto encontrado.</Alert>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedTop.map((r) => {
                        const already = selectedMap.has(r.CODPROD);
                        return (
                          <TableRow
                            key={r.CODPROD}
                            hover
                            onClick={() => {
                              if (!already) {
                                addOneToBottom(r);
                                setSnack({ open: true, msg: `Adicionado: ${r.CODPROD}`, severity: 'success' });
                              } else {
                                setSnack({ open: true, msg: `Já está na lista inferior: ${r.CODPROD}`, severity: 'info' });
                              }
                            }}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={checkedTop.has(r.CODPROD)}
                                onChange={() => toggleChecked(setCheckedTop, r.CODPROD)}
                              />
                            </TableCell>
                            <TableCell>{r.CODPROD}</TableCell>
                            <TableCell sx={{ wordBreak: 'break-word' }}>{r.DESCRPROD ?? '-'}</TableCell>
                            <TableCell>{(r.CODBARRA ?? '').trim() || '-'}</TableCell>
                            <TableCell>{(r.DESCRGRUPOPROD ?? '').trim() || '-'}</TableCell>
                            <TableCell>{(r.MARCA ?? '').trim() || '-'}</TableCell>
                            <TableCell>
                              {already ? (
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>Selecionado</Typography>
                              ) : (
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>Disponível</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ px: 1.5, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2">
                  Topo: {totalTop} | Página: {pageClamped + 1}/{totalPages} | Marcados: {checkedTop.size}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={loading || pageClamped <= 0}
                    onClick={() => {
                      setPage((p) => Math.max(0, p - 1));
                      setCheckedTop(new Set());
                    }}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={loading || pageClamped >= totalPages - 1}
                    onClick={() => {
                      setPage((p) => Math.min(totalPages - 1, p + 1));
                      setCheckedTop(new Set());
                    }}
                  >
                    Próxima
                  </Button>
                </Box>
              </Box>
            </Paper>

            {/* COLUNA DIREITA: FILTROS */}
            <Paper sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle1">Filtros</Typography>

              <TextField
                label="Buscar"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                  setCheckedTop(new Set());
                }}
                size="small"
              />

              <FormControl size="small">
                <InputLabel>GRUPO</InputLabel>
                <Select value={selectedGroup} label="GRUPO" onChange={onChangeGroup}>
                  <MenuItem value="ALL">Todos</MenuItem>
                  {groupOptions.map((g) => (
                    <MenuItem key={g} value={g}>
                      {g}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small">
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

              <Divider />


            </Paper>
          </Box>

          {/* “setas” / ações entre listas (como no seu desenho) */}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
             <IconButton onClick={addCheckedTop} disabled={loading || checkedTop.size === 0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, }}>
              <KeyboardArrowDown /> Adicionar Marcados
            </IconButton>
           <IconButton onClick={addAllPagedTop} disabled={loading} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, }}>
              <KeyboardDoubleArrowDown /> Adicionar Pagina
            </IconButton>
            <IconButton onClick={removeCheckedBottom} disabled={loading || selectedMap.size === 0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, }}>
              <KeyboardArrowUp /> Remover marcados
            </IconButton>
            <IconButton onClick={clearBottom} disabled={loading} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, }}>
              <KeyboardDoubleArrowUp /> Limpar tudo
            </IconButton>
            
            

          </Box>

          {/* LISTA INFERIOR */}
          <Paper sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="subtitle1">
                Selecionados para cadastro
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button size="small" variant="outlined" onClick={removeCheckedBottom} disabled={loading || checkedBottom.size === 0}>
                  Remover marcados ({checkedBottom.size})
                </Button>
                <Button size="small" variant="outlined" onClick={clearBottom} disabled={loading || selectedMap.size === 0}>
                  Limpar lista
                </Button>
              </Box>
            </Box>

            <TableContainer sx={{ flex: 1, minHeight: 0 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ width: 48 }}>
                      <Checkbox checked={bottomAllChecked} indeterminate={!bottomAllChecked && bottomSomeChecked} onChange={toggleBottomAll} />
                    </TableCell>
                    <TableCell sx={{ width: 110 }}>CODPROD</TableCell>
                    <TableCell>DESCRPROD</TableCell>
                    <TableCell sx={{ width: 160 }}>CODBARRA</TableCell>
                    <TableCell sx={{ width: 240 }}>GRUPO</TableCell>
                    <TableCell sx={{ width: 220 }}>MARCA</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {selectedBottom.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Alert severity="info">Nenhum produto selecionado ainda.</Alert>
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedBottom.map((r) => (
                      <TableRow
                        key={r.CODPROD}
                        hover
                        onClick={() => {
                          removeOneFromBottom(r.CODPROD);
                          setCheckedBottom((prev) => {
                            const next = new Set(prev);
                            next.delete(r.CODPROD);
                            return next;
                          });
                        }}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={checkedBottom.has(r.CODPROD)}
                            onChange={() => toggleChecked(setCheckedBottom, r.CODPROD)}
                          />
                        </TableCell>
                        <TableCell>{r.CODPROD}</TableCell>
                        <TableCell sx={{ wordBreak: 'break-word' }}>{r.DESCRPROD ?? '-'}</TableCell>
                        <TableCell>{(r.CODBARRA ?? '').trim() || '-'}</TableCell>
                        <TableCell>{(r.DESCRGRUPOPROD ?? '').trim() || '-'}</TableCell>
                        <TableCell>{(r.MARCA ?? '').trim() || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ px: 1.5, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">
                Inferior: {selectedMap.size} | Marcados: {checkedBottom.size}
              </Typography>

              <Button variant="contained" onClick={handleEnviar} disabled={loading || selectedMap.size === 0}>
                ENVIAR ({selectedMap.size})
              </Button>
            </Box>
          </Paper>
        </CardContent>
      </Card>

      <Snackbar open={snack.open} autoHideDuration={4500} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
