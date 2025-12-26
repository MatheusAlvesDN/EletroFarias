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

const MAX_LOC = 15;

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

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cod, setCod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [produto, setProduto] = useState<Produto | null>(null);
  const [localizacao, setLocalizacao] = useState<string>('');
  const [adLocalizacao, setAdLocalizacao] = useState<string>('');
  const [contagem, setContagem] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  // ✅ email do usuário logado
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

  // ✅ NOVO endpoint
  const SOLICITAR_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/solicitarProduto` : `/sync/solicitarProduto`),
    [API_BASE]
  );

  useEffect(() => {
    setLocalizacao((produto?.LOCALIZACAO ?? '').toString().slice(0, MAX_LOC));
  }, [produto]);

  useEffect(() => {
    setAdLocalizacao((produto?.AD_LOCALIZACAO ?? '').toString().slice(0, MAX_LOC));
  }, [produto]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleBuscar = async () => {
    setErro(null);
    setOkMsg(null);
    setSnackbarOpen(false);
    setProduto(null);
    setContagem('');

    const clean = cod.trim();
    if (!clean) {
      setErro('Informe o código do produto.');
      setSnackbarOpen(true);
      return;
    }
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
        setErro('Produto não encontrado.');
        setProduto(null);
        setSnackbarOpen(true);
        return;
      }

      setProduto(data);
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

  // ✅ ALTERADO: envia para /sync/solicitarProduto
  const handleSolicitarProduto = async () => {
    if (!produto?.CODPROD) {
      setErro('Busque um produto antes de solicitar.');
      setSnackbarOpen(true);
      return;
    }

    if (!userEmail) {
      setErro('Não foi possível identificar o e-mail do usuário logado.');
      setSnackbarOpen(true);
      return;
    }

    if (!contagem.trim()) {
      setErro('Informe a quantidade.');
      setSnackbarOpen(true);
      return;
    }

    const valor = Number(contagem.replace(',', '.'));
    if (!Number.isFinite(valor) || valor <= 0) {
      setErro('Quantidade inválida.');
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
      const body = {
        codProduto: codProdNum,
        quantidade: 
        valor,
        userEmail,
        descricao: produto.DESCRPROD ?? '',
      };

      const resp = await fetch(SOLICITAR_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao solicitar produto (status ${resp.status})`);
      }

      setOkMsg('Solicitação enviada com sucesso!');
      setContagem('');
      setSnackbarOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao solicitar produto.';
      setErro(msg);
      setSnackbarOpen(true);
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

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
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
            </Box>

            {produto && (
              <>
                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" sx={SECTION_TITLE_SX}>
                  Resultado
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

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' }, gap: 2, alignItems: 'center' }}>
                    <TextField
                      label="LOCALIZAÇÃO"
                      value={localizacao}
                      disabled
                      size="small"
                      fullWidth
                      slotProps={{ htmlInput: { maxLength: MAX_LOC } }}
                      helperText={`${localizacao.length}/${MAX_LOC}`}
                    />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' }, gap: 2, alignItems: 'center' }}>
                    <TextField
                      label="LOCALIZAÇÃO 2"
                      value={adLocalizacao}
                      disabled
                      size="small"
                      fullWidth
                      slotProps={{ htmlInput: { maxLength: MAX_LOC } }}
                      helperText={`${adLocalizacao.length}/${MAX_LOC}`}
                    />
                  </Box>

                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" sx={SECTION_TITLE_SX}>
                    Solicitar produto
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' }, gap: 2, alignItems: 'center' }}>
                    <TextField
                      label="Quantidade"
                      value={contagem}
                      onChange={(e) => setContagem(e.target.value)}
                      size="small"
                      fullWidth
                      slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleSolicitarProduto}
                      sx={{ whiteSpace: 'nowrap', height: 40 }}
                      disabled={!contagem.trim()}
                    >
                      SOLICITAR
                    </Button>
                  </Box>
                </Stack>
              </>
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
        <Alert onClose={() => setSnackbarOpen(false)} severity={erro ? 'error' : 'success'} variant="filled" sx={{ width: '100%' }}>
          {erro || okMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
