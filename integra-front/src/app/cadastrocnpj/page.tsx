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

  // identificação
  const [cnpj, setCnpj] = useState<string>('');
  const [razao, setRazao] = useState<string>('');
  const [telefone, setTelefone] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  // endereço
  const [cep, setCep] = useState<string>('');
  const [logradouro, setLogradouro] = useState<string>('');
  const [numero, setNumero] = useState<string>('');
  const [complemento, setComplemento] = useState<string>('');
  const [bairro, setBairro] = useState<string>('');
  const [cidade, setCidade] = useState<string>('');
  const [uf, setUf] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
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

  const validarCnpj = (v: string) => /^\d{14}$/.test(v);

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

    const chave = cnpjClean || razaoClean;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
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

  const handleBuscarCep = async () => {
    setErro(null);
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setErro('CEP inválido. Use 8 dígitos.');
      return;
    }

    try {
      setLoadingCep(true);
      const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (!resp.ok) {
        throw new Error('Falha ao consultar CEP.');
      }
      const data = (await resp.json()) as {
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
        erro?: boolean;
        complemento?: string;
      };

      if (data.erro) {
        setErro('CEP não encontrado.');
        return;
      }

      setLogradouro(data.logradouro ?? '');
      setBairro(data.bairro ?? '');
      setCidade(data.localidade ?? '');
      setUf((data.uf ?? '').toUpperCase());
      // mantém número/complemento do que já estava digitado
      setOkMsg('CEP carregado com sucesso.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao consultar CEP';
      setErro(msg);
    } finally {
      setLoadingCep(false);
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

            {/* Identificação */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="CNPJ"
                value={cnpj}
                onChange={(e) => {
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
              <TextField
                label="Telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value.replace(/[^\d()+\-\s]/g, ''))}
                size="small"
                inputProps={{ maxLength: 20 }}
                fullWidth
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="Email p/ Contato"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="small"
                inputProps={{ maxLength: 120 }}
                fullWidth
              />
            </Box>

            {/* Endereço */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              Endereço
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="CEP"
                value={cep}
                onChange={(e) => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
                size="small"
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 8 }}
                sx={{ flex: { xs: '1 1 180px', sm: '0 0 200px' } }}
              />
              <Button
                variant="outlined"
                onClick={handleBuscarCep}
                disabled={loadingCep || cep.replace(/\D/g, '').length !== 8}
              >
                {loadingCep ? <CircularProgress size={22} /> : 'Buscar CEP'}
              </Button>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField
                label="Logradouro"
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Número"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                size="small"
                fullWidth
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField
                label="Complemento"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                size="small"
                fullWidth
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField
                label="Cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="UF"
                value={uf}
                onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
                size="small"
                inputProps={{ maxLength: 2 }}
                fullWidth
              />
            </Box>

            {/* Ações */}
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