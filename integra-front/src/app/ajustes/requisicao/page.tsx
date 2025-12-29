'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
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
  Produto_AD_NOMEPRDLV?: string | null;
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
  AD_LOCALIZACAO?: string | null;
  DESCRGRUPOPROD?: string | null;
  AD_NOMEPRDLV?: string | null;
  estoque?: EstoqueItem[];
};

type JwtPayload = {
  email?: string;
  userEmail?: string;
  sub?: string;
  [key: string]: unknown;
};

function safeDecodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64.padEnd(payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4), '=');
    const jsonPayload = atob(padded);
    const payload = JSON.parse(jsonPayload) as unknown;

    if (payload && typeof payload === 'object') return payload as JwtPayload;
    return null;
  } catch {
    return null;
  }
}

const MAX_LOC = 15;

type CartItem = {
  codProduto: number;
  descricao: string;
  nomeProd: string;
  localizacao: string;
  adLocalizacao: string;
  quantidadeStr: string; // input
  produtoRaw?: Produto;
};

function toNumberSafe(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function parsePositiveNumber(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [cod, setCod] = useState<string>('');
  const [produto, setProduto] = useState<Produto | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.replace('/');
  };

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    if (!t) {
      router.replace('/');
      return;
    }

    setToken(t);

    const payload = safeDecodeJwt(t);
    const emailFromJwt = payload?.email ?? payload?.userEmail ?? payload?.sub ?? null;
    if (emailFromJwt) setUserEmail(String(emailFromJwt));
  }, [router]);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const GET_URL = useCallback(
    (id: string) =>
      API_BASE
        ? `${API_BASE}/sync/getProductLocation?id=${encodeURIComponent(id)}`
        : `/sync/getProductLocation?id=${encodeURIComponent(id)}`,
    [API_BASE]
  );

  const SOLICITAR_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/solicitarProduto` : `/sync/solicitarProduto`),
    [API_BASE]
  );

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const toast = useCallback((msg: string, severity: 'success' | 'error') => {
    if (severity === 'error') {
      setErro(msg);
      setOkMsg(null);
    } else {
      setOkMsg(msg);
      setErro(null);
    }
    setSnackbarOpen(true);
  }, []);

  const handleBuscar = async () => {
    setErro(null);
    setOkMsg(null);
    setSnackbarOpen(false);
    setProduto(null);

    const clean = cod.trim();
    if (!clean) return toast('Informe o código do produto.', 'error');
    if (!/^\d+$/.test(clean)) return toast('O código deve conter apenas números.', 'error');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);

      const resp = await fetch(GET_URL(clean), {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha na busca (status ${resp.status})`);
      }

      const data = (await resp.json()) as Produto | null;
      if (!data || (!data.CODPROD && !data.DESCRPROD)) {
        setProduto(null);
        return toast('Produto não encontrado.', 'error');
      }

      setProduto(data);
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((e as any)?.name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'Erro ao buscar produto';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!produto?.CODPROD) return toast('Busque um produto antes de adicionar.', 'error');

    const codProdNum = toNumberSafe(produto.CODPROD);
    if (!Number.isFinite(codProdNum)) return toast('CODPROD inválido.', 'error');

    if (cart.some((c) => c.codProduto === codProdNum)) {
      return toast('Este produto já está na lista.', 'error');
    }

    setLoadingAdd(true);
    try {
      const item: CartItem = {
        codProduto: codProdNum,
        descricao: String(produto.DESCRPROD ?? ''),
        nomeProd: String(produto.AD_NOMEPRDLV ?? ''),
        localizacao: String(produto.LOCALIZACAO ?? '').slice(0, MAX_LOC),
        adLocalizacao: String(produto.AD_LOCALIZACAO ?? '').slice(0, MAX_LOC),
        quantidadeStr: '',
        produtoRaw: produto,
      };

      setCart((prev) => [item, ...prev]);
      setProduto(null);
      setCod('');
      toast('Produto adicionado à lista.', 'success');
    } finally {
      setLoadingAdd(false);
    }
  };

  const handleRemoveFromCart = (codProduto: number) => {
    setCart((prev) => prev.filter((x) => x.codProduto !== codProduto));
  };

  const handleChangeQty = (codProduto: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ?? '';
    setCart((prev) => prev.map((x) => (x.codProduto === codProduto ? { ...x, quantidadeStr: value } : x)));
  };

  // ✅ AGORA envia 1 único POST com { userEmail, produtos: [...] }
  const handleSolicitarTodos = async () => {
    if (!userEmail) return toast('Não foi possível identificar o e-mail do usuário logado.', 'error');
    if (cart.length === 0) return toast('Adicione pelo menos um produto na lista.', 'error');

    const invalid = cart.find((x) => parsePositiveNumber(x.quantidadeStr) == null);
    if (invalid) return toast(`Informe uma quantidade válida para o produto ${invalid.codProduto}.`, 'error');

    const produtos = cart.map((it) => {
      const quantidade = parsePositiveNumber(it.quantidadeStr);
      // invalid já foi barrado acima, mas mantém seguro
      if (quantidade == null) throw new Error(`Quantidade inválida para ${it.codProduto}`);

      return {
        codProduto: it.codProduto,
        quantidade,
        descricao: it.descricao ?? '',
      };
    });

    setLoadingSend(true);
    try {
      const body = { userEmail, produtos };

      const resp = await fetch(SOLICITAR_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao solicitar produtos (status ${resp.status})`);
      }

      toast('Solicitações enviadas com sucesso!', 'success');
      setCart([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao solicitar produtos.';
      toast(msg, 'error');
    } finally {
      setLoadingSend(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') handleBuscar();
  };

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

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
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

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} userEmail={userEmail} onLogout={handleLogout} />

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
              Buscar por código
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Código do produto"
                value={cod}
                onChange={(e) => setCod(e.target.value)}
                onKeyDown={handleKeyDown}
                size="small"
                autoFocus
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
              />

              <Button variant="contained" onClick={handleBuscar} disabled={loading}>
                {loading ? <CircularProgress size={22} /> : 'Buscar'}
              </Button>

              <Button
                variant="outlined"
                onClick={handleAddToCart}
                disabled={loadingAdd || !produto?.CODPROD}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {loadingAdd ? <CircularProgress size={20} /> : 'Adicionar à lista'}
              </Button>

              <Button
                variant="contained"
                color="success"
                onClick={handleSolicitarTodos}
                disabled={loadingSend || cart.length === 0}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {loadingSend ? <CircularProgress size={20} /> : 'Solicitar todos'}
              </Button>
            </Box>

            {produto && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" sx={SECTION_TITLE_SX}>
                  Resultado da busca
                </Typography>

                <Stack spacing={2}>
                  <Box
                    component="img"
                    src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${produto.CODPROD}.dbimage`}
                    alt={produto.DESCRPROD ?? 'Imagem do produto'}
                    sx={{
                      width: 200,
                      height: 200,
                      objectFit: 'contain',
                      border: (t) => `1px solid ${t.palette.divider}`,
                      borderRadius: 2,
                      backgroundColor: 'background.default',
                    }}
                  />

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField label="CODPROD" value={produto.CODPROD ?? ''} size="small" disabled fullWidth />
                    <TextField label="DESCRPROD" value={produto.DESCRPROD ?? ''} size="small" disabled fullWidth />
                    <TextField label="NOMEPROD" value={produto.AD_NOMEPRDLV ?? ''} size="small" disabled fullWidth />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr' }, gap: 2 }}>
                    <TextField
                      label="LOCALIZAÇÃO"
                      value={String(produto.LOCALIZACAO ?? '').slice(0, MAX_LOC)}
                      disabled
                      size="small"
                      fullWidth
                      helperText={`${String(produto.LOCALIZACAO ?? '').slice(0, MAX_LOC).length}/${MAX_LOC}`}
                    />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr' }, gap: 2 }}>
                    <TextField
                      label="LOCALIZAÇÃO 2"
                      value={String(produto.AD_LOCALIZACAO ?? '').slice(0, MAX_LOC)}
                      disabled
                      size="small"
                      fullWidth
                      helperText={`${String(produto.AD_LOCALIZACAO ?? '').slice(0, MAX_LOC).length}/${MAX_LOC}`}
                    />
                  </Box>
                </Stack>
              </>
            )}

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={SECTION_TITLE_SX}>
              Lista de solicitações
            </Typography>

            {cart.length === 0 ? (
              <Typography color="text.secondary">Nenhum item adicionado ainda.</Typography>
            ) : (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 2 }}
              >
                <Table size="small" aria-label="lista-solicitacoes" sx={{ minWidth: 900 }}>
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
                      <TableCell>Localização</TableCell>
                      <TableCell>Localização 2</TableCell>
                      <TableCell width={160}>Quantidade</TableCell>
                      <TableCell align="right" width={140}>
                        Ações
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {cart.map((it) => {
                      const qtyOk = parsePositiveNumber(it.quantidadeStr) != null;

                      return (
                        <TableRow key={it.codProduto} sx={{ '&:hover': { backgroundColor: 'rgba(0,0,0,0.03)' } }}>
                          <TableCell>{it.codProduto}</TableCell>
                          <TableCell>{it.descricao || '-'}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{it.localizacao || '-'}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{it.adLocalizacao || '-'}</TableCell>
                          <TableCell>
                            <TextField
                              value={it.quantidadeStr}
                              onChange={handleChangeQty(it.codProduto)}
                              size="small"
                              fullWidth
                              error={it.quantidadeStr.trim().length > 0 && !qtyOk}
                              helperText={it.quantidadeStr.trim().length > 0 && !qtyOk ? 'Inválido' : ' '}
                              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Button variant="outlined" color="error" size="small" onClick={() => handleRemoveFromCart(it.codProduto)}>
                              Remover
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>

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
