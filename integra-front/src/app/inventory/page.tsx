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

const MAX_LOC = 15;

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

  // snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // [auth] token de login (localStorage)
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  // 👇 NOVO: email extraído do JWT
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const handleLogout = () => {
    // remove o token e volta pro login
    localStorage.removeItem('authToken');
    router.replace('/');
  };

  useEffect(() => {
    const t =
      typeof window !== 'undefined'
        ? localStorage.getItem('authToken')
        : null;

    if (!t) {
      router.replace('/'); // sem login → volta para a página inicial (login)
      return;
    }

    setToken(t);

    // tenta decodificar o JWT e extrair e-mail
    try {
      const parts = t.split('.');
      if (parts.length >= 2) {
        const payloadBase64 = parts[1];
        const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = atob(base64);
        const payload = JSON.parse(jsonPayload) as {
          email?: string;
          userEmail?: string;
          sub?: string;
          [key: string]: unknown;
        };

        const emailFromJwt =
          payload.email ?? payload.userEmail ?? payload.sub ?? null;

        if (emailFromJwt) setUserEmail(emailFromJwt);
      }
    } catch (e) {
      console.error('Erro ao decodificar JWT:', e);
    }
  }, [router]);

  // GET: base/headers
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(
    () => process.env.NEXT_PUBLIC_API_TOKEN ?? '',
    []
  );
  const GET_URL = (id: string) =>
    API_BASE
      ? `${API_BASE}/sync/getProductLocation?id=${encodeURIComponent(id)}`
      : `/sync/getProductLocation?id=${encodeURIComponent(id)}`;

  const ADDCOUNT_URL = API_BASE
    ? `${API_BASE}/sync/addCount2`
    : `/sync/addCount2`;

  // Store (POST update)
  const {
    sendUpdateLocation,
    isSaving,
    error: storeError,
  } = useUpdateLocStore();

  // refletir LOCALIZACAO do produto no campo editável
  useEffect(() => {
    setLocalizacao((produto?.LOCALIZACAO ?? '').toString().slice(0, MAX_LOC));
  }, [produto]);

  // aborta fetch pendente ao desmontar
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // ===== Helpers numéricos / reservado =====

  const toNum = (v: unknown) => {
    if (v == null) return 0;

    if (typeof v === 'string') {
      const parsed = Number(v.replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : 0;
    }

    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Soma total de RESERVADO em produto.estoque
  const reservadoTotal = useMemo(() => {
    if (!produto?.estoque || produto.estoque.length === 0) return 0;

    return produto.estoque.reduce((acc, item) => {
      return acc + toNum(item.RESERVADO);
    }, 0);
  }, [produto?.estoque]);

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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const body = {
        codProd: codProdNum,
        contagem: valor, // TEM que ser "contagem"
        descricao: produto.DESCRPROD ?? '',
        localizacao: produto.LOCALIZACAO?.toString() ?? '',
        // 👇 Agora enviando o total de reservados calculado a partir de produto.estoque
        reservado: reservadoTotal,
      };

      console.log('reservado total: ' + reservadoTotal);

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
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao enviar contagem.';
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
        <IconButton
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="menu"
          size="large"
        >
          <MenuIcon />
        </IconButton>
      </Box>

      {/* Sidebar com email vindo do JWT */}
      <SidebarMenu
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={userEmail}
        onLogout={handleLogout}   // <-- AQUI
      />


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
                slotProps={{
                  htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' },
                }}
              />
              <Button
                variant="contained"
                onClick={handleBuscar}
                disabled={loading}
              >
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
                      border: `1px solid {t.palette.divider}`,
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
                    <TextField
                      label="CODPROD"
                      value={produto.CODPROD ?? ''}
                      size="small"
                      disabled
                      fullWidth
                    />
                    <TextField
                      label="DESCRPROD"
                      value={produto.DESCRPROD ?? ''}
                      size="small"
                      disabled
                      fullWidth
                    />
                    <TextField
                      label="DESCRPROD"
                      value={produto.NOMEPROD ?? ''}
                      size="small"
                      disabled
                      fullWidth
                      />
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
                      disabled={
                        isSaving || !produto?.CODPROD || localizacao.length === 0
                      }
                      sx={{ whiteSpace: 'nowrap', height: 40 }}
                    >
                      {isSaving ? (
                        <CircularProgress size={22} />
                      ) : (
                        'Salvar'
                      )}
                    </Button>
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 2,
                    }}
                  >
                    <TextField
                      label="MARCA"
                      value={produto.MARCA ?? ''}
                      size="small"
                      disabled
                      fullWidth
                    />
                    <TextField
                      label="CODVOL"
                      value={produto.CODVOL ?? ''}
                      size="small"
                      disabled
                      fullWidth
                    />
                  </Box>

                  <TextField
                    label="CARACTERÍSTICAS"
                    value={produto.CARACTERISTICAS ?? ''}
                    size="small"
                    disabled
                    multiline
                    minRows={2}
                    fullWidth
                  />

                  {/* (Opcional) Mostrar total reservado calculado */}
                  <TextField
                    label="Reservado total (somado do estoque)"
                    value={reservadoTotal}
                    size="small"
                    disabled
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
