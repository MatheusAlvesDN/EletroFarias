'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  Divider,
  Stack,
  IconButton,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';

// Store para update
import { useUpdateLocStore } from '@/stores/useUpdateLocStore';

// [auth] redirect se não logado
import { useRouter } from 'next/navigation';

type EstoqueItem = {
  CODLOCAL: number | string;
  ESTOQUE: number | string | null;
  RESERVADO: number | string | null;
  DISPONIVEL: number | string | null;
  CODEMP?: number | string | null;
  CODPROD?: number | string | null;
  CONTROLE?: string | null;
  CODPARC?: number | string | null;
  TIPO?: string | null;
  LocalFinanceiro_DESCRLOCAL?: string | null;
  Empresa_NOMEFANTASIA?: string | null;
  Produto_DESCRPROD?: string | null;
  Parceiro_NOMEPARC?: string | null;
};

type Produto = {
  CODPROD?: string | number | null;
  DESCRPROD?: string | null;
  MARCA?: string | null;
  CARACTERISTICAS?: string | null;
  CODVOL?: string | null;
  CODGRUPOPROD?: string | null;
  LOCALIZACAO?: string | null;
  DESCRGRUPOPROD?: string | null;
  estoque?: EstoqueItem[];
};

type InventoryItem = {
  id: string;
  codProd: number;
  descricao?: string | null;
  count: number;
  inStock: number;
  inplantedDate: string;
  userEmail?: string | null;
  localizacao?: string | null;
};

type OrderBy = 'localizacao' | 'count' | 'inStock' | 'diff';

const MAX_LOC = 15;

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

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cod, setCod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [produto, setProduto] = useState<Produto | null>(null);
  const [localizacao, setLocalizacao] = useState<string>('');
  const [contagem, setContagem] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  // Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Inventory do produto (histórico de contagens)
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [invLoading, setInvLoading] = useState(false);

  // Ordenação da tabela de histórico
  const [orderBy, setOrderBy] = useState<OrderBy>('localizacao');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');

  // [auth] token de login (localStorage)
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/'); // sem login → volta para a página inicial (login)
      return;
    }
    setToken(t);
  }, [router]);

  // GET: base/headers
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);
  const GET_URL = (id: string) =>
    API_BASE
      ? `${API_BASE}/sync/getProductLocation?id=${encodeURIComponent(id)}`
      : `/sync/getProductLocation?id=${encodeURIComponent(id)}`;
  const ADDCOUNT_URL = API_BASE
    ? `${API_BASE}/sync/addcount`
    : `/sync/addcount`;

  const INVENTORY_LIST_URL = API_BASE
    ? `${API_BASE}/sync/getinventoryList`
    : `/sync/getinventoryList`;

  // Store (POST update)
  const { sendUpdateLocation, isSaving, error: storeError } = useUpdateLocStore();

  // refletir LOCALIZACAO do produto no campo editável
  useEffect(() => {
    setLocalizacao((produto?.LOCALIZACAO ?? '').toString().slice(0, MAX_LOC));
  }, [produto]);

  // aborta fetch pendente ao desmontar
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const buildHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  };

  // carrega histórico de contagens para o produto
  const carregarHistorico = async (codProdNum: number) => {
    try {
      setInvLoading(true);
      const headers = buildHeaders();

      const resp = await fetch(INVENTORY_LIST_URL, {
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

      // Filtra apenas registros desse produto
      const filtrados = list.filter((item) => Number(item.codProd) === codProdNum);

      setInventory(filtrados);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao carregar histórico de contagens.';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setInvLoading(false);
    }
  };

  const handleBuscar = async () => {
    setErro(null);
    setOkMsg(null);
    setSnackbarOpen(false);
    setProduto(null);
    setContagem('');
    setInventory([]);

    const clean = cod.trim();
    if (!clean) {
      setErro('Informe o código do produto.');
      setSnackbarOpen(true);
      return;
    }
    // código EXATO, somente números
    if (!/^\d+$/.test(clean)) {
      setErro('O código deve conter apenas números.');
      setSnackbarOpen(true);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const headers = buildHeaders();

      const resp = await fetch(GET_URL(clean), {
        method: 'GET',
        headers,
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha na busca (status ${resp.status})`);
      }

      const data = (await resp.json()) as Produto | null;
      if (!data || (!data.CODPROD && !data.DESCRPROD)) {
        setErro('Produto não encontrado.');
        setProduto(null);
        setSnackbarOpen(true);
        return;
      }

      setProduto(data);

      const codProdNum = Number(data.CODPROD);
      if (Number.isFinite(codProdNum)) {
        // carrega histórico de contagens somente desse produto
        await carregarHistorico(codProdNum);
      }
    } catch (e: unknown) {
      // @ts-expect-error Abort check
      if (e?.name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'Erro ao buscar produto';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarLocalizacao = async () => {
    if (!produto?.CODPROD) {
      setErro('Busque um produto antes de atualizar a localização.');
      setSnackbarOpen(true);
      return;
    }
    setErro(null);
    setOkMsg(null);

    const id = Number(produto.CODPROD);
    if (!Number.isFinite(id)) {
      setErro('CODPROD inválido.');
      setSnackbarOpen(true);
      return;
    }

    const loc = localizacao.slice(0, MAX_LOC);

    const ok = await sendUpdateLocation(id, loc);

    if (ok) {
      setOkMsg('Localização atualizada com sucesso!');
      setSnackbarOpen(true);
      setProduto((p) => (p ? { ...p, LOCALIZACAO: loc } : p));
    } else {
      setErro(storeError || 'Erro ao atualizar localização');
      setSnackbarOpen(true);
    }
  };

  // handler para enviar contagem
  const handleEnviarContagem = async () => {
    if (!produto?.CODPROD) {
      setErro('Busque um produto antes de lançar a contagem.');
      setSnackbarOpen(true);
      return;
    }

    if (!contagem.trim()) {
      setErro('Informe a contagem.');
      setSnackbarOpen(true);
      return;
    }

    const valor = Number(contagem.replace(',', '.'));
    if (!Number.isFinite(valor)) {
      setErro('Contagem inválida.');
      setSnackbarOpen(true);
      return;
    }

    const codProdNum = Number(produto.CODPROD);
    if (!Number.isFinite(codProdNum)) {
      setErro('CODPROD inválido.');
      setSnackbarOpen(true);
      return;
    }

    setErro(null);
    setOkMsg(null);

    try {
      const headers = buildHeaders();

      const body = {
        codProd: codProdNum,
        contagem: valor,
        descricao: produto.DESCRPROD,
        localizacao: produto.LOCALIZACAO?.toString(),
      };

      const resp = await fetch(ADDCOUNT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao enviar contagem (status ${resp.status})`);
      }

      setOkMsg('Contagem enviada com sucesso!');
      setContagem('');
      setSnackbarOpen(true);

      // Recarrega histórico depois de enviar
      await carregarHistorico(codProdNum);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar contagem.';
      setErro(msg);
      setSnackbarOpen(true);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') handleBuscar();
  };

  const onChangeLimit: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value ?? '';
    setLocalizacao(v.slice(0, MAX_LOC));
  };

  const handleSort = (field: OrderBy) => {
    setOrderBy((prevField) => {
      if (prevField === field) {
        setOrderDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prevField;
      }
      setOrderDirection('asc');
      return field;
    });
  };

  const sortedInventory = useMemo(() => {
    const arr = [...inventory];

    return arr.sort((a, b) => {
      const diffA = Number(a.count ?? 0) - Number(a.inStock ?? 0);
      const diffB = Number(b.count ?? 0) - Number(b.inStock ?? 0);

      let valA: string | number = '';
      let valB: string | number = '';

      switch (orderBy) {
        case 'localizacao':
          valA = (a.localizacao || '').toString().toUpperCase();
          valB = (b.localizacao || '').toString().toUpperCase();
          break;
        case 'count':
          valA = Number(a.count ?? 0);
          valB = Number(b.count ?? 0);
          break;
        case 'inStock':
          valA = Number(a.inStock ?? 0);
          valB = Number(b.inStock ?? 0);
          break;
        case 'diff':
          valA = diffA;
          valB = diffB;
          break;
      }

      let cmp: number;
      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB), 'pt-BR');
      }

      return orderDirection === 'asc' ? cmp : -cmp;
    });
  }, [inventory, orderBy, orderDirection]);

  const getRowColor = (count: number, inStock: number) => {
    const diff = count - inStock;
    if (diff === 0) return '#e8f5e9'; // verde claro
    if (diff < 0) return '#fffde7';  // amarelo claro
    return '#ffebee';                // vermelho claro
  };

  const CARD_MAIN_SX = CARD_SX;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Floating button: sidebar */}
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
        {/* Card principal */}
        <Card sx={CARD_MAIN_SX}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={SECTION_TITLE_SX}>
              Buscar por código
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="Código do produto"
                value={cod}
                onChange={(e) => setCod(e.target.value)}
                onKeyDown={handleKeyDown}
                size="small"
                autoFocus
                slotProps={{
                  htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' },
                }}
              />
              <Button variant="contained" onClick={handleBuscar} disabled={loading}>
                {loading ? <CircularProgress size={22} /> : 'Buscar'}
              </Button>
            </Box>

            {erro && (
              <Typography color="error" sx={{ mb: 1 }}>
                {erro}
              </Typography>
            )}
            {okMsg && (
              <Typography color="success.main" sx={{ mb: 1 }}>
                {okMsg}
              </Typography>
            )}

            {produto && (
              <>
                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" sx={SECTION_TITLE_SX}>
                  Resultado
                </Typography>

                <Stack spacing={2}>
                  {/* Imagem do produto */}
                  <Box
                    component="img"
                    src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${produto.CODPROD}.dbimage`}
                    alt={produto.DESCRPROD ?? 'Imagem do produto'}
                    sx={{
                      width: 200,
                      height: 200,
                      objectFit: 'contain',
                      border: '1px solid #ddd',
                      borderRadius: 2,
                      backgroundColor: 'background.default',
                    }}
                  />

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 2,
                    }}
                  >
                    <TextField label="CODPROD" value={produto.CODPROD ?? ''} size="small" disabled fullWidth />
                    <TextField label="DESCRPROD" value={produto.DESCRPROD ?? ''} size="small" disabled fullWidth />
                  </Box>

                  {/* LOCALIZAÇÃO editável + botão */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
                      gap: 2,
                      alignItems: 'center',
                    }}
                  >
                    <TextField
                      label="LOCALIZAÇÃO"
                      value={localizacao}
                      onChange={onChangeLimit}
                      size="small"
                      fullWidth
                      slotProps={{ htmlInput: { maxLength: MAX_LOC } }}
                      helperText={`${localizacao.length}/${MAX_LOC}`}
                    />
                    <Button
                      variant="contained"
                      onClick={handleSalvarLocalizacao}
                      disabled={isSaving || !produto?.CODPROD || localizacao.length === 0}
                      sx={{ whiteSpace: 'nowrap', height: 40 }}
                    >
                      {isSaving ? <CircularProgress size={22} /> : 'Salvar'}
                    </Button>
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 2,
                    }}
                  >
                    <TextField label="MARCA" value={produto.MARCA ?? ''} size="small" disabled fullWidth />
                    <TextField label="CODVOL" value={produto.CODVOL ?? ''} size="small" disabled fullWidth />
                  </Box>

                  <TextField
                    label="CARACTERÍSTICAS"
                    value={produto.CARACTERISTICAS ?? ''} size="small"
                    disabled
                    multiline
                    minRows={2}
                    fullWidth
                  />

                  {/* ======= BLOCO: CONTAGEM ======= */}
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" sx={SECTION_TITLE_SX}>
                    Contagem
                  </Typography>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
                      gap: 2,
                      alignItems: 'center',
                    }}
                  >
                    <TextField
                      label="Contagem"
                      value={contagem}
                      onChange={(e) => setContagem(e.target.value)}
                      size="small"
                      fullWidth
                      slotProps={{
                        htmlInput: { inputMode: 'numeric' },
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleEnviarContagem}
                      sx={{ whiteSpace: 'nowrap', height: 40 }}
                      disabled={!contagem.trim()}
                    >
                      Enviar
                    </Button>
                  </Box>

                  {/* ======= HISTÓRICO DE CONTAGENS (SEM COLUNA DATA) ======= */}
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" sx={SECTION_TITLE_SX}>
                    Histórico de contagens do produto
                  </Typography>

                  {invLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : inventory.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Nenhum registro de contagem encontrado para este produto.
                    </Typography>
                  ) : (
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
                      <Table size="small" stickyHeader aria-label="historico-contagens">
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
                            <TableCell onClick={() => handleSort('localizacao')}>
                              Localização
                            </TableCell>
                            <TableCell align="right" onClick={() => handleSort('count')}>
                              Contagem
                            </TableCell>
                            <TableCell align="right" onClick={() => handleSort('inStock')}>
                              Estoque
                            </TableCell>
                            <TableCell align="right" onClick={() => handleSort('diff')}>
                              Diferença
                            </TableCell>
                            <TableCell align="center">
                              Ação
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedInventory.map((item) => {
                            const count = Number(item.count ?? 0);
                            const inStock = Number(item.inStock ?? 0);
                            const diff = count - inStock;
                            const bgColor = getRowColor(count, inStock);
                            const precisaAtualizar = diff !== 0; // amarelo/vermelho

                            return (
                              <TableRow key={item.id} sx={{ backgroundColor: bgColor }}>
                                <TableCell>{item.localizacao || '-'}</TableCell>
                                <TableCell align="right">{count}</TableCell>
                                <TableCell align="right">{inStock}</TableCell>
                                <TableCell align="right">{diff}</TableCell>
                                <TableCell align="center">
                                  {precisaAtualizar && (
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={() => {
                                        setErro(null);
                                        setOkMsg('Atualizado!');
                                        setSnackbarOpen(true);
                                      }}
                                    >
                                      Atualizar
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Stack>
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* SNACKBAR GLOBAL DE AVISO */}
      <Snackbar
        open={snackbarOpen && (!!erro || !!okMsg)}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={erro ? 'error' : 'success'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {erro || okMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
