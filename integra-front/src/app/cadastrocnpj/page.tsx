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
  Checkbox,
  FormControlLabel,
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

// helpers
function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function formatCNPJ(digits: string) {
  const d = onlyDigits(digits).slice(0, 14);
  let out = '';
  for (let i = 0; i < d.length; i++) {
    out += d[i];
    if (i === 1 || i === 4) out += '.';
    if (i === 7) out += '/';
    if (i === 11) out += '-';
  }
  return out;
}

// validação CNPJ (com DV)
function isValidCNPJ(input: string) {
  const cnpj = onlyDigits(input);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDV = (len: number) => {
    const pesos =
      len === 12
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
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function isValidTelefone(v: string) {
  const d = onlyDigits(v);
  if (d.length !== 10 && d.length !== 11) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  return true;
}

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // identificação (ATENÇÃO: cnpj somente dígitos)
  const [cnpj, setCnpj] = useState<string>('');
  const cnpjRef = useRef<HTMLInputElement | null>(null);

  const [razao, setRazao] = useState<string>('');
  const [temInscricaoEstadual, setTemInscricaoEstadual] = useState<boolean>(false);
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

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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

  // ——— CNPJ handlers (máscara + backspace) ———
  const handleCnpjChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const nextDigits = onlyDigits(e.target.value).slice(0, 14);
    setCnpj(nextDigits);

    setFieldErrors((prev) => ({
      ...prev,
      cnpj:
        nextDigits.length === 0
          ? 'CNPJ é obrigatório.'
          : isValidCNPJ(nextDigits)
          ? undefined
          : 'CNPJ inválido.',
    }));
  };

  const handleCnpjKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key !== 'Backspace') return;

    const input = e.currentTarget;
    const pos = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? pos;
    const formatted = input.value;

    // Se existe seleção, remove os dígitos contidos nela
    if (pos !== selEnd) {
      const beforeSelDigits = onlyDigits(formatted.slice(0, pos));
      const afterSelDigits = onlyDigits(formatted.slice(selEnd));
      const newDigits = (beforeSelDigits + afterSelDigits).slice(0, 14);
      setCnpj(newDigits);
      e.preventDefault();

      requestAnimationFrame(() => {
        const el = cnpjRef.current;
        if (!el) return;
        const newFormatted = formatCNPJ(newDigits);
        // posiciona onde terminava "beforeSelDigits"
        let i = 0,
          seen = 0;
        while (i < newFormatted.length && seen < beforeSelDigits.length) {
          if (/\d/.test(newFormatted[i])) seen++;
          i++;
        }
        el.setSelectionRange(i, i);
      });
      return;
    }

    // Sem seleção:
    if (pos === 0) return;

    // Se a posição atrás do caret é separador, anda para trás até um dígito
    let p = pos - 1;
    while (p >= 0 && /[.\-\/]/.test(formatted[p])) p--;
    if (p < 0) return;

    // Índice do dígito a remover na string cnpj (só dígitos)
    const digitsBefore = onlyDigits(formatted.slice(0, p + 1)).length;
    const removeIndex = digitsBefore - 1;

    if (removeIndex >= 0) {
      const newDigits = cnpj.slice(0, removeIndex) + cnpj.slice(removeIndex + 1);
      setCnpj(newDigits);
      e.preventDefault();

      requestAnimationFrame(() => {
        const el = cnpjRef.current;
        if (!el) return;
        const newFormatted = formatCNPJ(newDigits);
        // caret após o dígito removido
        let i = 0,
          seen = 0;
        while (i < newFormatted.length && seen < digitsBefore - 1) {
          if (/\d/.test(newFormatted[i])) seen++;
          i++;
        }
        el.setSelectionRange(i, i);
      });
    }
  };

  // ——— validações ———
  const validarCamposObrigatorios = () => {
    const errors: FieldErrors = {};

    if (!cnpj) errors.cnpj = 'CNPJ é obrigatório.';
    else if (!isValidCNPJ(cnpj)) errors.cnpj = 'CNPJ inválido.';

    if (!razao.trim()) errors.razao = 'Razão Social é obrigatória.';
    else if (razao.trim().length < 2) errors.razao = 'Informe ao menos 2 caracteres';

    if (!email.trim()) errors.email = 'E-mail é obrigatório.';
    else if (!isValidEmail(email)) errors.email = 'E-mail inválido.';

    if (!telefone.trim()) errors.telefone = 'Telefone é obrigatório.';
    else if (!isValidTelefone(telefone)) errors.telefone = 'Telefone inválido (use 10 ou 11 dígitos).';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ——— ações ———
  const handleBuscar = async () => {
    setErro(null);
    setOkMsg(null);
    setProduto(null);

    if (!validarCamposObrigatorios()) {
      setErro('Corrija os campos obrigatórios antes de continuar.');
      return;
    }

    const cnpjDigits = cnpj; // já são só dígitos
    const razaoClean = razao.trim();
    const chave = cnpjDigits || razaoClean;
    if (!chave) {
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
      const bairroFilled = data.bairro && data.bairro.trim().length > 0 ? data.bairro : 'Centro';
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
                value={formatCNPJ(cnpj)} // exibe mascarado
                onChange={handleCnpjChange} // guarda só dígitos
                onKeyDown={handleCnpjKeyDown} // backspace inteligente
                size="small"
                inputRef={cnpjRef}
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
                    razao: e.target.value.trim().length >= 2 ? undefined : 'Informe ao menos 2 caracteres',
                  }));
                }}
                size="small"
                inputProps={{ maxLength: 120 }}
                fullWidth
                error={!!fieldErrors.razao}
                helperText={fieldErrors.razao}
              />
            </Box>

            {/* Checkbox: inscrição estadual */}
            <Box sx={{ display: 'flex', mb: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={temInscricaoEstadual}
                    onChange={(e) => setTemInscricaoEstadual(e.target.checked)}
                  />
                }
                label="Possui inscrição estadual?"
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
