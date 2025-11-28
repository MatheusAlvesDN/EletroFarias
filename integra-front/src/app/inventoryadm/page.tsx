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

// Mesmo shape do backend (prisma.inventory)
type InventoryItem = {
  id: string;
  codProd: number;
  count: number;
  inStock: number;
  inplantedDate: string;   // ISO string
  descricao?: string | null;
  userEmail?: string | null;
};

type OrderBy = 'codProd' | 'descricao' | 'count' | 'inStock' | 'diff';

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [filterCodProd, setFilterCodProd] = useState('');

  // PAGINAÇÃO
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  // ORDENAÇÃO
  const [orderBy, setOrderBy] = useState<OrderBy>('codProd');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');

  // SNACKBAR
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // controle de atualização por linha
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatedIds, setUpdatedIds] = useState<string[]>([]);

  // auth
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/'); // sem login → volta pra tela de login
      return;
    }
    setToken(t);
  }, [router]);

  // Base da API
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/getinventoryList`
        : `/sync/getinventoryList`,
    [API_BASE]
  );

  // endpoint para atualizar a data (ajuste o path conforme seu backend)
  const UPDATE_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/updateInventoryDate`
        : `/sync/updateInventoryDate`,
    [API_BASE]
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      }),
    []
  );

  // Função para carregar a lista (reutilizada pelo useEffect e pelo botão "Atualizar" da página)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(LIST_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao carregar inventário (status ${resp.status})`);
      }

      const data = (await resp.json()) as InventoryItem[] | null;

      const list = Array.isArray(data) ? data : [];
      // ordena por data desc como padrão inicial
      list.sort((a, b) => {
        const da = new Date(a.inplantedDate).getTime();
        const db = new Date(b.inplantedDate).getTime();
        return db - da;
      });

      setItems(list);
      setUpdatedIds([]); // reset flags ao recarregar
      setPage(0); // reseta página após carregar
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar inventário';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, token, API_TOKEN]);

  // Carrega lista ao montar (e quando token/variáveis mudarem)
  useEffect(() => {
    if (token || API_TOKEN) {
      fetchData();
    }
  }, [fetchData, token, API_TOKEN]);

  // Filtro por código EXATO
  useEffect(() => {
    const cod = filterCodProd.trim();

    const result = items.filter((item) => {
      if (!cod) return true;
      return String(item.codProd) === cod; // código exato
    });

    setFiltered(result);
    setPage(0); // sempre volta para a página 0 ao filtrar
  }, [filterCodProd, items]);

  const CARD_SX = {
    maxWidth: 1200,
    mx: 'auto',
    mt: 6,
    borderRadius: 2,
    boxShadow: 0,
    border: 1,
    backgroundColor: 'background.paper',
  } as const;

  const SECTION_TITLE_SX = { fontWeight: 700, mb: 2 } as const;

  // handler de troca de página
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Ordenação
  const handleSort = (field: OrderBy) => {
    setOrderBy((prev) => {
      if (prev === field) {
        setOrderDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setOrderDirection('asc');
      return field;
    });
  };

  const sorted = useMemo(() => {
    const arr = [...filtered];

    return arr.sort((a, b) => {
      const diffA = a.count - a.inStock;
      const diffB = b.count - b.inStock;

      let valA: string | number;
      let valB: string | number;

      switch (orderBy) {
        case 'codProd':
          valA = a.codProd;
          valB = b.codProd;
          break;
        case 'descricao':
          valA = (a.descricao ?? '').toUpperCase();
          valB = (b.descricao ?? '').toUpperCase();
          break;
        case 'count':
          valA = a.count;
          valB = b.count;
          break;
        case 'inStock':
          valA = a.inStock;
          valB = b.inStock;
          break;
        case 'diff':
          valA = diffA;
          valB = diffB;
          break;
        default:
          valA = 0;
          valB = 0;
      }

      let cmp: number;
      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB), 'pt-BR');
      }

      return orderDirection === 'asc' ? cmp : -cmp;
    });
  }, [filtered, orderBy, orderDirection]);

  // fatia os resultados para a página atual
  const pageRows = sorted.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  // Atualiza a linha (inplantedDate no BD) e muda cor para azul
  const handleUpdateRow = async (inv: InventoryItem) => {
    try {
      setUpdatingId(inv.id);
      setErro(null);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      // Ajuste o body conforme o seu backend esperar (id, codProd, etc.)
      const resp = await fetch(UPDATE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: inv.id,
          // se o backend exigir, pode enviar a data aqui também:
          // inplantedDate: new Date().toISOString(),
        }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(
          msg || `Falha ao atualizar data de contagem (status ${resp.status})`
        );
      }

      // Atualização otimista no front: ajusta data e marca como atualizado
      const nowIso = new Date().toISOString();

      setItems((prev) =>
        prev.map((item) =>
          item.id === inv.id ? { ...item, inplantedDate: nowIso } : item
        )
      );

      setUpdatedIds((prev) =>
        prev.includes(inv.id) ? prev : [...prev, inv.id]
      );

      setSnackbarMsg('Atualizado');
      setSnackbarOpen(true);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Erro ao atualizar data de contagem.';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Botão flutuante: sidebar */}
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

      {/* Main */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: 0,
          backgroundColor: '#f0f4f8',
          height: '100vh',
          overflowY: 'auto',
          p: 5,
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
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                gap: 2,
              }}
            >
              <Typography variant="h6" sx={SECTION_TITLE_SX}>
                Contagens de produtos
              </Typography>

              {/* Botão para atualizar a página (recarregar dados) */}
              <Button
                variant="outlined"
                onClick={fetchData}
                disabled={loading}
              >
                {loading ? <CircularProgress size={18} /> : 'Atualizar lista'}
              </Button>
            </Box>

            {/* Filtro (apenas por código EXATO) */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr' },
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                label="Filtrar por código exato do produto"
                value={filterCodProd}
                onChange={(e) => setFilterCodProd(e.target.value)}
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
                  <Typography sx={{ color: 'text.secondary' }}>
                    Nenhuma contagem encontrada.
                  </Typography>
                ) : (
                  <>
                    <TableContainer
                      component={Paper}
                      elevation={0}
                      sx={{
                        border: (t) => `1px solid ${t.palette.divider}`,
                        borderRadius: 2,
                        overflow: 'hidden',
                        backgroundColor: 'background.paper',
                        maxWidth: '100%',
                      }}
                    >
                      <Table size="small" stickyHeader aria-label="lista-contagens">
                        <TableHead>
                          <TableRow
                            sx={{
                              '& th': {
                                backgroundColor: (t) => t.palette.grey[50],
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                              },
                            }}
                          >
                            <TableCell onClick={() => handleSort('codProd')}>
                              Cód. Produto
                            </TableCell>
                            <TableCell onClick={() => handleSort('descricao')}>
                              Descrição
                            </TableCell>
                            <TableCell align="right" onClick={() => handleSort('count')}>
                              Contagem
                            </TableCell>
                            <TableCell align="right" onClick={() => handleSort('inStock')}>
                              Estoque sistema
                            </TableCell>
                            <TableCell align="right" onClick={() => handleSort('diff')}>
                              Diferença
                            </TableCell>
                            <TableCell>
                              Ação
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pageRows.map((inv) => {
                            const diff = inv.count - inv.inStock;
                            const isUpdated = updatedIds.includes(inv.id);

                            // cores de fundo:
                            // azul claro (#9FC5E8) se já foi atualizado
                            // verde claro (#B6D7A8) diff == 0
                            // amarelo claro (#FFE599) diff > 0
                            // vermelho claro (#EA9999) diff < 0
                            let rowBg = '#B6D7A8';
                            if (diff > 0) rowBg = '#FFE599';
                            if (diff < 0) rowBg = '#EA9999';
                            if (isUpdated) rowBg = '#9FC5E8';

                            const precisaAtualizar = diff !== 0 && !isUpdated; // só amarelo/vermelho e não atualizado ainda

                            return (
                              <TableRow
                                key={inv.id}
                                sx={{
                                  backgroundColor: rowBg,
                                  '&:hover': {
                                    filter: 'brightness(0.97)',
                                  },
                                }}
                              >
                                <TableCell>
                                  {inv.codProd}
                                </TableCell>
                                <TableCell>
                                  {inv.descricao ?? '-'}
                                </TableCell>
                                <TableCell align="right">
                                  {numberFormatter.format(inv.count)}
                                </TableCell>
                                <TableCell align="right">
                                  {numberFormatter.format(inv.inStock)}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {numberFormatter.format(diff)}
                                </TableCell>
                                <TableCell>
                                  {precisaAtualizar && (
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={() => handleUpdateRow(inv)}
                                      disabled={updatingId === inv.id}
                                    >
                                      {updatingId === inv.id ? (
                                        <CircularProgress size={16} />
                                      ) : (
                                        'Atualizar'
                                      )}
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Paginação (10 por página) */}
                    <TablePagination
                      component="div"
                      count={filtered.length}
                      page={page}
                      onPageChange={handleChangePage}
                      rowsPerPage={rowsPerPage}
                      rowsPerPageOptions={[rowsPerPage]}
                      labelRowsPerPage="Linhas por página"
                    />
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Snackbar "Atualizado" */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={erro ? 'error' : 'success'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
