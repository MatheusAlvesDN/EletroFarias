'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter, useSearchParams } from 'next/navigation';

type Produto = {
  CODPROD?: string | number | null;
  DESCRPROD?: string | null;
};

type JwtPayload = {
  email?: string;
};

function decodeJwt(token: string | null): JwtPayload | null {
  if (!token || typeof window === 'undefined') return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';

    const json = window.atob(base64);
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === 'object') return parsed as JwtPayload;

    return null;
  } catch {
    return null;
  }
}

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  const [produto, setProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [quantidade, setQuantidade] = useState<string>('');
  const [solicitando, setSolicitando] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const abortRef = useRef<AbortController | null>(null);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const GET_PRODUCT_URL = useCallback(
    (codProd: string) =>
      API_BASE
        ? `${API_BASE}/sync/getProduct?id=${encodeURIComponent(codProd)}`
        : `/sync/getProduct?id=${encodeURIComponent(codProd)}`,
    [API_BASE]
  );

  const SOLICITA_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/solicitaProduto` : `/sync/solicitaProduto`),
    [API_BASE]
  );

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const toast = useCallback((msg: string, severity: 'success' | 'error') => {
    setSnackbarMsg(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  // auth + email
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);

    const payload = decodeJwt(t);
    const email = String(payload?.email ?? '').trim();
    setUserEmail(email);
  }, [router]);

  // carregar produto pelo codProd (query param)
  const codProdParam = useMemo(() => {
    const raw = searchParams.get('codProd') ?? '';
    return raw.trim();
  }, [searchParams]);

  const fetchProduto = useCallback(async () => {
    setErro(null);
    setProduto(null);

    if (!codProdParam) {
      setErro('Informe ?codProd=... na URL.');
      return;
    }
    if (!/^\d+$/.test(codProdParam)) {
      setErro('codProd inválido (deve conter apenas números).');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);

      const resp = await fetch(GET_PRODUCT_URL(codProdParam), {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao buscar produto (status ${resp.status})`);
      }

      const data = (await resp.json()) as Produto | null;

      if (!data || (!data.CODPROD && !data.DESCRPROD)) {
        setErro('Produto não encontrado.');
        return;
      }

      setProduto(data);
    } catch (e: unknown) {
      // Abort
      if (typeof e === 'object' && e && 'name' in e && (e as { name?: string }).name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'Erro ao buscar produto';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }, [GET_PRODUCT_URL, codProdParam, getHeaders]);

  useEffect(() => {
    if (token || API_TOKEN) fetchProduto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, API_TOKEN, fetchProduto]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleSolicitar = useCallback(async () => {
    if (!produto?.CODPROD) {
      toast('Produto não carregado.', 'error');
      return;
    }

    const email = userEmail.trim();
    if (!email) {
      toast('Não foi possível identificar o e-mail do usuário logado.', 'error');
      return;
    }

    const qRaw = quantidade.trim().replace(',', '.');
    if (!qRaw) {
      toast('Informe a quantidade.', 'error');
      return;
    }

    const q = Number(qRaw);
    if (!Number.isFinite(q) || q <= 0) {
      toast('Quantidade inválida.', 'error');
      return;
    }

    const codProd = Number(produto.CODPROD);
    if (!Number.isFinite(codProd) || codProd <= 0) {
      toast('CODPROD inválido.', 'error');
      return;
    }

    try {
      setSolicitando(true);

      const resp = await fetch(SOLICITA_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify({
          codProd,
          quantidade: q,
          email,
        }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao solicitar (status ${resp.status})`);
      }

      toast('Solicitação enviada com sucesso!', 'success');
      setQuantidade('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao solicitar produto';
      toast(msg, 'error');
    } finally {
      setSolicitando(false);
    }
  }, [SOLICITA_URL, getHeaders, produto, quantidade, toast, userEmail]);

  const imgSrc = useMemo(() => {
    const cod = produto?.CODPROD ?? '';
    if (!cod) return '';
    return `https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${cod}.dbimage`;
  }, [produto]);

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
        <Card
          sx={{
            maxWidth: 900,
            mx: 'auto',
            mt: 6,
            borderRadius: 2,
            boxShadow: 0,
            border: 1,
            backgroundColor: 'background.paper',
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Solicitar produto
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                <CircularProgress />
              </Box>
            ) : erro ? (
              <Typography color="error">{erro}</Typography>
            ) : !produto ? (
              <Typography color="text.secondary">Nenhum produto carregado.</Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 2 }}>
                {/* imagem */}
                <Box
                  component="img"
                  src={imgSrc}
                  alt={produto.DESCRPROD ?? 'Imagem do produto'}
                  sx={{
                    width: '100%',
                    maxHeight: 320,
                    objectFit: 'contain',
                    border: (t) => `1px solid ${t.palette.divider}`,
                    borderRadius: 2,
                    backgroundColor: 'background.default',
                  }}
                />

                {/* descrição */}
                <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
                  {produto.DESCRPROD ?? '-'}
                </Typography>

                {/* quantidade + solicitar */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
                    gap: 2,
                    alignItems: 'center',
                    mt: 2,
                  }}
                >
                  <TextField
                    label="Quantidade"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    size="small"
                    slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                    helperText={userEmail ? `Solicitante: ${userEmail}` : 'Solicitante não identificado'}
                  />

                  <Button
                    variant="contained"
                    onClick={handleSolicitar}
                    disabled={solicitando || !quantidade.trim()}
                    sx={{ height: 40, whiteSpace: 'nowrap' }}
                  >
                    {solicitando ? <CircularProgress size={20} /> : 'SOLICITAR'}
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbarMsg}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
