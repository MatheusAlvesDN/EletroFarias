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
  IconButton,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

type ProdutoMin = {
  CODPROD?: string | number | null;
  DESCRPROD?: string | null;
  LOCALIZACAO?: string | null;
};

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [cnpj, setCnpj] = useState<string>('');
  const [razao, setRazao] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [produto, setProduto] = useState<ProdutoMin | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // [auth] token de login (localStorage)
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/'); // sem login → volta para login
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

  // aborta fetch pendente ao desmontar
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const validarCnpj = (v: string) => /^\d{14}$/.test(v); // ajuste se quiser aceitar <14 durante digitação

  const handleBuscar = async () => {
    setErro(null);
    setOkMsg(null);
    setProduto(null);

    const cnpjClean = cnpj.replace(/\D/g, '');
    const razaoClean = razao.trim();

    if (!cnpjClean && !razaoClean) {
      setErro('Informe o CNPJ ou a Razão Social.');
      return;
    }

    if (cnpjClean && !validarCnpj(cnpjClean)) {
      setErro('CNPJ inválido. Use 14 dígitos (somente números).');
      return;
    }

    // escolha da chave de busca (prioriza CNPJ)
    const chave = cnpjClean || razaoClean;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      // [auth] preferir token de login; fallback NEXT_PUBLIC_API_TOKEN
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(GET_URL(chave), {
        method: 'GET',
        headers,
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha na busca (status ${resp.status})`);
      }

      const data = (await resp.json()) as ProdutoMin | null;
      if (!data || (!data.CODPROD && !data.DESCRPROD)) {
        setErro('Registro não encontrado.');
        setProduto(null);
        return;
      }

      setProduto(data);
      setOkMsg('Busca concluída.');
    } catch (e: unknown) {
      // @ts-expect-error Abort check
      if (e?.name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'Erro ao buscar';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDownCnpj: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') handleBuscar();
  };

  const handleKeyDownRazao: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
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
        <Card sx={CARD_SX}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={SECTION_TITLE_SX}>
              Cadastro CNPJ
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="CNPJ"
                value={cnpj}
                onChange={(e) => {
                  // mantém apenas dígitos; opcionalmente formate com máscara
                  const digits = e.target.value.replace(/\D/g, '');
                  setCnpj(digits);
                }}
                onKeyDown={handleKeyDownCnpj}
                size="small"
                autoFocus
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 14 }}
                fullWidth
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="Razão Social"
                value={razao}
                onChange={(e) => setRazao(e.target.value)}
                onKeyDown={handleKeyDownRazao}
                size="small"
                inputProps={{ maxLength: 120 }}
                fullWidth
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
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
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Produto:</strong> {produto.DESCRPROD ?? '—'}
                </Typography>
                <Typography variant="body2">
                  <strong>CODPROD:</strong> {produto.CODPROD ?? '—'}
                </Typography>
                <Typography variant="body2">
                  <strong>Localização:</strong> {produto.LOCALIZACAO ?? '—'}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
