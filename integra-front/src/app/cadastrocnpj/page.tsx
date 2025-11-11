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

type FieldErrors = {
  cnpj?: string;
  razao?: string;
  email?: string;
  telefone?: string;
};

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function formatCNPJ(input: string) {
  const d = onlyDigits(input).slice(0, 14);
  let out = '';
  for (let i = 0; i < d.length; i++) {
    out += d[i];
    if (i === 1 || i === 4) out += '.';
    if (i === 7) out += '/';
    if (i === 11) out += '-';
  }
  return out;
}

// Validação de CNPJ (com DV)
function isValidCNPJ(input: string) {
  const cnpj = onlyDigits(input);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // todos iguais

  const calcDV = (len: number) => {
    const pesos = len === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const base = cnpj.slice(0, len);
    const soma = base.split('').reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const dv1 = calcDV(12);
  const dv2 = calcDV(13);
  return dv1 === Number(cnpj[12]) && dv2 === Number(cnpj[13]);
}

function isValidEmail(v: string) {
  const email = v.trim();
  // Regex simples, suficiente para validação de formulário
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function isValidTelefone(v: string) {
  const d = onlyDigits(v);
  if (d.length !== 10 && d.length !== 11) return false;
  if (/^(\d)\1+$/.test(d)) return false; // todos iguais
  return true;
}

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // identificação (CNPJ formatado na string de estado)
  const [cnpj, setCnpj] = useState<string>('');
  const [razao, setRazao] = useState<string>('');
  const [telefone, setTelefone] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  // address
  const [cep, setCep] = useState<string>('');
  const [logradouro, setLogradouro] = useState<string>('');
  const [numero, setNumero] = useState<string>('');
  const [complemento, setComplemento] = useState<string>('');
  const [bairro, setBairro] = useState<string>('');
  const [cidade, setCidade] = useState<string>('');
  const [uf, setUf] = useState<string>('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [produto, setProduto] = useState<ProdutoMin | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // [auth]
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);
  }, [router]);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);
  const GET_URL = (id: string) =>
    API_BASE
      ? `${API_BASE}/sync/getProductLocation?id=${encodeURIComponent(id)}`
      : `/sync/getProductLocation?id=${encodeURIComponent(id)}`;

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const validarCamposObrigatorios = () => {
    const errors: FieldErrors = {};

    // CNPJ
    if (!cnpj.trim()) {
      errors.cnpj = 'CNPJ é obrigatório.';
    } else if (!isValidCNPJ(cnpj)) {
      errors.cnpj = 'CNPJ inválido.';
    }

    // Razão social
    if (!razao.trim()) {
      errors.razao = 'Razão Social é obrigatória.';
    } else if (razao.trim().length < 2) {
      errors.razao = 'Informe ao menos 2 caracteres.';
    }

    // Email
    if (!email.trim()) {
      errors.email = 'E-mail é obrigatório.';
    } else if (!isValidEmail(email)) {
      errors.email = 'E-mail inválido.';
    }

    // Telefone
    if (!telefone.trim()) {
      errors.telefone = 'Telefone é obrigatório.';
    } else if (!isValidTelefone(telefone)) {
      errors.telefone = 'Telefone inválido (use 10 ou 11 dígitos).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validarCnpjBusca = () => {
    const digits = onlyDigits(cnpj);
    // Para “buscar”, aceito CNPJ válido OU razão social não vazia
    if (digits && !isValidCNPJ(cnpj)) return false;
    return true;
  };

  const validarCnpj = (v: string) => {
    const masked = formatCNPJ(v);
    setCnpj(masked);
    // valida em tempo real (opcional: só ao blur)
    setFieldErrors((prev) => ({
      ...prev,
      cnpj:
        masked.trim().length === 0
          ? 'CNPJ é obrigatório.'
          : isValidCNPJ(masked)
          ? undefined
          : 'CNPJ inválido.',
    }));
  };

  const handleBuscar = async () => {
    setErro(null);
    setOkMsg(null);
    setProduto(null);

    // Campos obrigatórios
    if (!validarCamposObrigatorios()) {
      setErro('Corrija os campos obrigatórios antes de continuar.');
      return;
    }

    const cnpjDigits = onlyDigits(cnpj);
    const razaoClean = razao.trim();

    // Para a sua API atual (placeholder), escolho a chave:
    const chave = cnpjDigits || razaoClean;
    if (!chave || !validarCnpjBusca()) {
      setErro('Dados de busca inválidos.');
      return;
    }

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
    } catch (e) {
      const maybeAbort = e as { name?: string };
      if (maybeAbort?.name === 'AbortError') return;

      const msg = e instanceof Error ? e.message : 'Erro ao buscar';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscarCep = async () => {
    setErro(null);
    const digits = onlyDigits(cep);
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
      if (!resp.ok) throw new Error('Falha ao consultar CEP.');

      const data = (await resp.json()) as {
        logradouro?: string;
        bairro?: string | null;
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
      const bairroFilled =
        data.bairro && data.bairro.trim().length > 0 ? data.bairro : 'Centro';
      setBairro(bairroFilled);
      setCidade(data.localidade ?? '');
      setUf((data.uf ?? '').toUpperCase());
      setOkMsg('CEP carregado com sucesso.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao consultar CEP';
      setErro(msg);
    } finally {
      setLoadingCep(false);
    }
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
                required
                value={cnpj}
                onChange={(e) => validarCnpj(e.target.value)}
                size="small"
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 18 }}
                fullWidth
                error={!!fieldErrors.cnpj}
                helperText={fieldErrors.cnpj}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="Razão Social"
                required
                value={razao}
                onChange={(e) => {
                  setRazao(e.target.value);
                  setFieldErrors((prev) => ({
                    ...prev,
                    razao: e.target.value.trim().length >= 2 ? undefined : 'Informe ao menos 2 caracteres.',
                  }));
                }}
                size="small"
                inputProps={{ maxLength: 120 }}
                fullWidth
                error={!!fieldErrors.razao}
                helperText={fieldErrors.razao}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="Telefone"
                required
                value={telefone}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d()+\-\s]/g, '');
                  setTelefone(v);
                  setFieldErrors((prev) => ({
                    ...prev,
                    telefone: isValidTelefone(v) ? undefined : 'Use 10 ou 11 dígitos.',
                  }));
                }}
                size="small"
                inputProps={{ maxLength: 20 }}
                fullWidth
                error={!!fieldErrors.telefone}
                helperText={fieldErrors.telefone}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="E-mail para Contato"
                required
                type="email"
                value={email}
                onChange={(e) => {
                  const v = e.target.value;
                  setEmail(v);
                  setFieldErrors((prev) => ({
                    ...prev,
                    email: isValidEmail(v) ? undefined : 'E-mail inválido.',
                  }));
                }}
                size="small"
                inputProps={{ maxLength: 120 }}
                fullWidth
                error={!!fieldErrors.email}
                helperText={fieldErrors.email}
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
                onChange={(e) => setCep(onlyDigits(e.target.value).slice(0, 8))}
                size="small"
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 8 }}
                sx={{ flex: { xs: '1 1 180px', sm: '0 0 200px' } }}
              />
              <Button
                variant="outlined"
                onClick={handleBuscarCep}
                disabled={loadingCep || onlyDigits(cep).length !== 8}
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
              {/* Bairro: somente leitura */}
              <TextField
                label="Bairro"
                value={bairro}
                size="small"
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2, mb: 2 }}>
              {/* Cidade: somente leitura */}
              <TextField
                label="Cidade"
                value={cidade}
                size="small"
                fullWidth
                InputProps={{ readOnly: true }}
              />
              {/* UF: somente leitura */}
              <TextField
                label="UF"
                value={uf}
                size="small"
                inputProps={{ maxLength: 2 }}
                fullWidth
                InputProps={{ readOnly: true }}
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
