'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  TablePagination,              // <-- NOVO
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

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [filterCodProd, setFilterCodProd] = useState('');
  const [filterUser, setFilterUser] = useState('');

  // PAGINAÇÃO
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

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

  const LIST_URL = API_BASE
    ? `${API_BASE}/sync/getinventoryList`
    : `/sync/getinventoryList`;

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      }),
    []
  );

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('pt-BR');
  };

  // Carrega lista inteira ao montar
  useEffect(() => {
    const fetchData = async () => {
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
        list.sort((a, b) => {
          const da = new Date(a.inplantedDate).getTime();
          const db = new Date(b.inplantedDate).getTime();
          return db - da;
        });

        setItems(list);
        setFiltered(list);
        setPage(0); // reseta página após carregar
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar inventário';
        setErro(msg);
      } finally {
        setLoading(false);
      }
    };

    if (token || API_TOKEN) {
      fetchData();
    }
  }, [LIST_URL, token, API_TOKEN]);

  // Filtro simples por codProd e userEmail
  useEffect(() => {
    const cod = filterCodProd.trim();
    const user = filterUser.trim().toLowerCase();

    const result = items.filter((item) => {
      const byCod = !cod || String(item.codProd).includes(cod);
      const byUser = !user || (item.userEmail ?? '').toLowerCase().includes(user);

      return byCod && byUser;
    });

    setFiltered(result);
    setPage(0); // sempre volta para a página 0 ao filtrar
  }, [filterCodProd, filterUser, items]);

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

  // fatia os resultados para a página atual
  const pageRows = filtered.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

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
            <Typography variant="h6" sx={SECTION_TITLE_SX}>
              Contagens de produtos
            </Typography>

            {/* Filtros simples */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                label="Filtrar por código do produto"
                value={filterCodProd}
                onChange={(e) => setFilterCodProd(e.target.value)}
                size="small"
              />
              <TextField
                label="Filtrar por usuário (e-mail)"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
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
                              },
                            }}
                          >
                            <TableCell>Cód. Produto</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell align="right">Contagem</TableCell>
                            <TableCell align="right">Estoque sistema</TableCell>
                            <TableCell align="right">Diferença</TableCell>
                            <TableCell>Usuário</TableCell>
                            <TableCell>Data</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pageRows.map((inv) => {
                            const diff = inv.count - inv.inStock;
                            const diffColor =
                              diff === 0
                                ? 'success.main'
                                : diff > 0
                                ? 'warning.main'
                                : 'error.main';

                            return (
                              <TableRow
                                key={inv.id}
                                sx={{
                                  backgroundColor: diffColor,   // <- cor da linha = cor da diferença
                                  '&:hover': {
                                    filter: 'brightness(0.30)',
                                  },
                                }}
                              >
                                <TableCell sx={{ color: 'common.white' }}>
                                  {inv.codProd}
                                </TableCell>
                                <TableCell sx={{ color: 'common.white' }}>
                                  {inv.descricao ?? '-'}
                                </TableCell>
                                <TableCell sx={{ color: 'common.white' }} align="right">
                                  {numberFormatter.format(inv.count)}
                                </TableCell>
                                <TableCell sx={{ color: 'common.white' }} align="right">
                                  {numberFormatter.format(inv.inStock)}
                                </TableCell>
                                <TableCell
                                  sx={{ color: 'common.white', fontWeight: 600 }}
                                  align="right"
                                >
                                  {numberFormatter.format(diff)}
                                </TableCell>
                                <TableCell sx={{ color: 'common.white' }}>
                                  {inv.userEmail ?? '-'}
                                </TableCell>
                                <TableCell sx={{ color: 'common.white' }}>
                                  {formatDateTime(inv.inplantedDate)}
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
    </Box>
  );
}
