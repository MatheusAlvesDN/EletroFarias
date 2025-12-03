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

// Mesmo shape do backend (prisma.inventory) + localização
type InventoryItem = {
  id: string;
  codProd: number;
  count: number;
  inStock: number;
  inplantedDate: string | null;
  createdAt: string;
  descricao?: string | null;
  userEmail?: string | null;
  localizacao: string | null; // campo de localização, ex: "A-001"
};

const rowsPerPage = 10;

// helper: extrai email de um JWT (authToken salvo no localStorage)
function decodeJwtEmail(token: string | null): string | null {
  if (!token) return null;
  if (typeof window === 'undefined') return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // padding
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const json = JSON.parse(window.atob(base64));
    return (
      json.email ||
      json.userEmail ||
      json.sub ||
      null
    );
  } catch {
    return null;
  }
}

// helper: extrai apenas a parte numérica da localização
const parseLocationNumber = (loc?: string | null): number => {
  if (!loc) return Number.MAX_SAFE_INTEGER;
  const match = loc.match(/\d+/g);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const joined = match.join('');
  const n = Number.parseInt(joined, 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

const Page: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [filterCodProd, setFilterCodProd] = useState('');

  // PAGINAÇÃO
  const [page, setPage] = useState(0);

  // SNACKBAR
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // auth
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t =
      typeof window !== 'undefined'
        ? localStorage.getItem('authToken')
        : null;
    if (!t) {
      router.replace('/'); // sem login → volta pra tela de login
      return;
    }
    setToken(t);
  }, [router]);

  // Base da API
  const API_BASE = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? '',
    []
  );
  const API_TOKEN = useMemo(
    () => process.env.NEXT_PUBLIC_API_TOKEN ?? '',
    []
  );

  const LIST_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/getinventoryList`
        : `/sync/getinventoryList`,
    [API_BASE]
  );

  // endpoint de nova contagem
  const ADDNEWCOUNT_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/addNewCount`
        : `/sync/addNewCount`,
    [API_BASE]
  );

  // estado da recontagem por linha
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [countById, setCountById] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Carrega lista
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN)
        headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(LIST_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(
          msg ||
            `Falha ao carregar inventário (status ${resp.status})`
        );
      }

      const data = (await resp.json()) as InventoryItem[] | null;

      let list = Array.isArray(data) ? data : [];

      // ordena por createdAt desc
      list = list.sort((a, b) => {
        const ta = a.createdAt
          ? new Date(a.createdAt).getTime()
          : 0;
        const tb = b.createdAt
          ? new Date(b.createdAt).getTime()
          : 0;
        return tb - ta;
      });

      // só itens com contagem divergente
      const divergent = list.filter(
        (item) => item.count !== item.inStock
      );

      // e-mail do usuário logado
      const currentUserEmail = decodeJwtEmail(token);

      // chaves de itens que ESTE usuário já contou (codProd + localizacao)
      const forbiddenKeys = new Set<string>();
      if (currentUserEmail) {
        for (const item of divergent) {
          if (item.userEmail === currentUserEmail) {
            const key = `${item.codProd}-${item.localizacao ?? ''}`;
            forbiddenKeys.add(key);
          }
        }
      }

      // remove duplicadas e ignora qualquer item cujo key esteja em forbiddenKeys
      const uniqueMap = new Map<string, InventoryItem>();
      for (const item of divergent) {
        const key = `${item.codProd}-${item.localizacao ?? ''}`;

        // se o usuário já contou esse produto/local, não mostra
        if (forbiddenKeys.has(key)) continue;

        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      }

      const finalList = Array.from(uniqueMap.values());

      setItems(finalList);
      setPage(0);
      setExpandedId(null);
      setCountById({});
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Erro ao carregar inventário';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, token, API_TOKEN]);

  useEffect(() => {
    if (token || API_TOKEN) {
      fetchData();
    }
  }, [fetchData, token, API_TOKEN]);

  // Filtro por código EXATO (lista já está só com divergentes, sem duplicadas e sem itens contados pelo usuário)
  useEffect(() => {
    const cod = filterCodProd.trim();

    const result = items.filter((item) => {
      if (cod && String(item.codProd) !== cod) return false;
      return true;
    });

    setFiltered(result);
    setPage(0);
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

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Ordenação fixa: sempre por localização numérica
  const sorted = useMemo(() => {
    const arr = [...filtered];
    return arr.sort((a, b) => {
      const la = parseLocationNumber(a.localizacao ?? a.descricao ?? '');
      const lb = parseLocationNumber(b.localizacao ?? b.descricao ?? '');
      if (la === lb) return a.codProd - b.codProd;
      return la - lb;
    });
  }, [filtered]);

  const pageRows = sorted.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const toggleRow = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleChangeCount =
    (id: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value ?? '';
      setCountById((prev) => ({
        ...prev,
        [id]: value,
      }));
    };

  const handleEnviarContagem = async (inv: InventoryItem) => {
    const raw = countById[inv.id] ?? '';

    if (!raw.trim()) {
      setErro('Informe a nova contagem.');
      setSnackbarMsg('Informe a nova contagem.');
      setSnackbarOpen(true);
      return;
    }

    const valor = Number(raw.replace(',', '.'));
    if (!Number.isFinite(valor)) {
      setErro('Contagem inválida.');
      setSnackbarMsg('Contagem inválida.');
      setSnackbarOpen(true);
      return;
    }

    setErro(null);
    setSavingId(inv.id);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN)
        headers.Authorization = `Bearer ${API_TOKEN}`;

      const body = {
        codProd: inv.codProd,
        contagem: valor,
        descricao: inv.descricao ?? '',
        localizacao: inv.localizacao ?? '',
      };

      const resp = await fetch(ADDNEWCOUNT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(
          msg || `Falha ao enviar recontagem (status ${resp.status})`
        );
      }

      setSnackbarMsg('Recontagem enviada com sucesso!');
      setSnackbarOpen(true);
      // limpa o campo desta linha
      setCountById((prev) => ({
        ...prev,
        [inv.id]: '',
      }));
      // se quiser, pode fechar a linha após envio:
      // setExpandedId((prev) => (prev === inv.id ? null : prev));
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao enviar recontagem.';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
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
        <IconButton
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="menu"
          size="large"
        >
          <MenuIcon />
        </IconButton>
      </Box>

      <SidebarMenu
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: 0,
          backgroundColor: '#f0f4f8',
          height: '100vh',
          overflowY: 'auto',
          p: { xs: 2, sm: 5 },
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
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: {
                  xs: 'flex-start',
                  sm: 'center',
                },
                mb: 2,
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={SECTION_TITLE_SX}>
                  Produtos com contagem divergente
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Listando apenas itens onde a contagem difere do
                  estoque do sistema, ordenados pela localização
                  (valor numérico) e ocultando produtos já contados
                  por você.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Button
                  variant="outlined"
                  onClick={fetchData}
                  disabled={loading}
                >
                  {loading ? (
                    <CircularProgress size={18} />
                  ) : (
                    'Atualizar lista'
                  )}
                </Button>
              </Box>
            </Box>

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
                onChange={(e) =>
                  setFilterCodProd(e.target.value)
                }
                size="small"
              />
            </Box>

            {erro && (
              <Typography color="error" sx={{ mb: 2 }}>
                {erro}
              </Typography>
            )}

            {loading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mt: 4,
                  mb: 4,
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Divider sx={{ my: 2 }} />

                {sorted.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>
                    Nenhuma contagem divergente encontrada para os
                    critérios atuais.
                  </Typography>
                ) : (
                  <>
                    <TableContainer
                      component={Paper}
                      elevation={0}
                      sx={{
                        border: (t) =>
                          `1px solid ${t.palette.divider}`,
                        borderRadius: 2,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        backgroundColor: 'background.paper',
                        maxWidth: '100%',
                      }}
                    >
                      <Table
                        size="small"
                        stickyHeader
                        aria-label="lista-contagens-divergentes"
                        sx={{
                          minWidth: 600,
                        }}
                      >
                        <TableHead>
                          <TableRow
                            sx={{
                              '& th': {
                                backgroundColor: (t) =>
                                  t.palette.grey[50],
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              },
                            }}
                          >
                            <TableCell>Localização</TableCell>
                            <TableCell>Cód. Produto</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell align="center">
                              Recontagem
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pageRows.map((inv) => (
                            <React.Fragment key={inv.id}>
                              <TableRow>
                                <TableCell>
                                  {inv.localizacao ?? '-'}
                                </TableCell>
                                <TableCell>
                                  {inv.codProd}
                                </TableCell>
                                <TableCell>
                                  {inv.descricao ?? '-'}
                                </TableCell>
                                <TableCell align="center">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() =>
                                      toggleRow(inv.id)
                                    }
                                  >
                                    {expandedId === inv.id
                                      ? 'Fechar'
                                      : 'Recontar'}
                                  </Button>
                                </TableCell>
                              </TableRow>

                              {expandedId === inv.id && (
                                <TableRow>
                                  <TableCell
                                    colSpan={4}
                                    sx={{
                                      backgroundColor:
                                        'background.default',
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                          xs: '1fr',
                                          sm: '1fr auto',
                                        },
                                        gap: 2,
                                        alignItems: 'center',
                                        mt: 1,
                                      }}
                                    >
                                      <TextField
                                        label="Nova contagem"
                                        value={
                                          countById[inv.id] ?? ''
                                        }
                                        onChange={handleChangeCount(
                                          inv.id
                                        )}
                                        size="small"
                                        fullWidth
                                        slotProps={{
                                          htmlInput: {
                                            inputMode: 'numeric',
                                          },
                                        }}
                                      />
                                      <Button
                                        variant="contained"
                                        onClick={() =>
                                          handleEnviarContagem(inv)
                                        }
                                        disabled={
                                          savingId === inv.id
                                        }
                                        sx={{
                                          whiteSpace: 'nowrap',
                                          height: 40,
                                        }}
                                      >
                                        {savingId === inv.id ? (
                                          <CircularProgress
                                            size={20}
                                          />
                                        ) : (
                                          'Enviar'
                                        )}
                                      </Button>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <TablePagination
                      component="div"
                      count={sorted.length}
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

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
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
};

export default Page;
