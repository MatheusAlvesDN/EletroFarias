'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Box,
  Container,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  IconButton,
  Divider,
  Stack,
  InputAdornment,
  Tooltip,
  CssBaseline,
  FormLabel,
  FormHelperText,
} from '@mui/material';
import Grid from '@mui/material/Grid'; // Grid v2 (suporta prop `size`)
import { createTheme, ThemeProvider } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DomainIcon from '@mui/icons-material/Domain';
import BadgeIcon from '@mui/icons-material/Badge';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MapIcon from '@mui/icons-material/Map';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloseIcon from '@mui/icons-material/Close';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';
import CheckIcon from '@mui/icons-material/Check';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';

// ============================
// Botão-checkbox customizado
// ============================

type ButtonCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
  roleType?: 'checkbox' | 'radio';
};

function ButtonCheckbox({
  checked,
  onChange,
  label,
  fullWidth,
  size = 'medium',
  roleType = 'checkbox',
}: ButtonCheckboxProps) {
  return (
    <Button
      variant={checked ? 'contained' : 'outlined'}
      color="secondary" // sempre secondary (verde), muda só o variant
      startIcon={checked ? <CheckIcon /> : <CheckBoxOutlineBlankIcon />}
      onClick={() => onChange(!checked)}
      role={roleType}
      aria-checked={checked}
      aria-pressed={checked}
      fullWidth={fullWidth}
      size={size}
      sx={{ borderRadius: 2, fontWeight: 700 }}
    >
      {label}
    </Button>
  );
}

// ============================
// Tipagens
// ============================

type TipoPessoa = 'PF' | 'PJ';

type FieldErrors = {
  // identificação comum/condicional
  tipo?: string;
  cpf?: string;
  nome?: string;
  cnpj?: string;
  razao?: string;

  // contato
  email?: string;
  telefone?: string;

  // endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
};

// ============================
// Helpers
// ============================

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function formatCNPJ(digits: string): string {
  const d = onlyDigits(digits).slice(0, 14);
  let out = '';

  for (let i = 0; i < d.length; i++) {
    out += d[i];
    if (i < d.length - 1) {
      if (i === 1 || i === 4) out += '.';
      else if (i === 7) out += '/';
      else if (i === 11) out += '-';
    }
  }

  return out.replace(/[.\-/]$/, '');
}

function formatCPF(digits: string): string {
  const d = onlyDigits(digits).slice(0, 11);
  let out = '';

  for (let i = 0; i < d.length; i++) {
    out += d[i];
    if (i < d.length - 1) {
      if (i === 2 || i === 5) out += '.';
      else if (i === 8) out += '-';
    }
  }

  return out.replace(/[.\-]$/, '');
}

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

function isValidCPF(input: string) {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcDV = (len: number) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(cpf[i]) * (len + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const dv1 = calcDV(9);
  const dv2 = calcDV(10);
  return dv1 === Number(cpf[9]) && dv2 === Number(cpf[10]);
}

const isValidCEP = (v: string) => onlyDigits(v).length === 8;
const isNonEmpty = (v: string) => v.trim().length > 0;
const isValidUF = (v: string) => /^[A-Za-z]{2}$/.test(v.trim());

// ============================
// Página
// ============================

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // tipo de pessoa
  const [tipo, setTipo] = useState<TipoPessoa>('PJ');

  // identificação PJ
  const [cnpj, setCnpj] = useState<string>('');
  const cnpjRef = useRef<HTMLInputElement | null>(null);
  const [razao, setRazao] = useState<string>('');
  const [temInscricaoEstadual, setTemInscricaoEstadual] = useState<boolean>(false);

  // identificação PF
  const [cpf, setCpf] = useState<string>('');
  const cpfRef = useRef<HTMLInputElement | null>(null);
  const [nome, setNome] = useState<string>('');

  // contato
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

  const [aceiteTermos, setAceiteTermos] = useState<boolean>(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loadingCep, setLoadingCep] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

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

  // ——— handlers/máscaras CNPJ ———
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

    if (pos === 0) return;

    let p = pos - 1;
    while (p >= 0 && /[.\-\/]/.test(formatted[p])) p--;
    if (p < 0) return;

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

  // ——— handlers/máscaras CPF ———
  const handleCpfChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const nextDigits = onlyDigits(e.target.value).slice(0, 11);
    setCpf(nextDigits);

    setFieldErrors((prev) => ({
      ...prev,
      cpf:
        nextDigits.length === 0
          ? 'CPF é obrigatório.'
          : isValidCPF(nextDigits)
          ? undefined
          : 'CPF inválido.',
    }));
  };

  const handleCpfKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key !== 'Backspace') return;

    const input = e.currentTarget;
    const pos = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? pos;
    const formatted = input.value;

    if (pos !== selEnd) {
      const beforeSelDigits = onlyDigits(formatted.slice(0, pos));
      const afterSelDigits = onlyDigits(formatted.slice(selEnd));
      const newDigits = (beforeSelDigits + afterSelDigits).slice(0, 11);
      setCpf(newDigits);
      e.preventDefault();

      requestAnimationFrame(() => {
        const el = cpfRef.current;
        if (!el) return;
        const newFormatted = formatCPF(newDigits);
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

    if (pos === 0) return;

    let p = pos - 1;
    while (p >= 0 && /[.\-]/.test(formatted[p])) p--;
    if (p < 0) return;

    const digitsBefore = onlyDigits(formatted.slice(0, p + 1)).length;
    const removeIndex = digitsBefore - 1;

    if (removeIndex >= 0) {
      const newDigits = cpf.slice(0, removeIndex) + cpf.slice(removeIndex + 1);
      setCpf(newDigits);
      e.preventDefault();

      requestAnimationFrame(() => {
        const el = cpfRef.current;
        if (!el) return;
        const newFormatted = formatCPF(newDigits);
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
  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  const isValidTelefone = (v: string) => {
    const d = onlyDigits(v);
    return (d.length === 10 || d.length === 11) && !/^(\d)\1+$/.test(d);
  };

  const validarCamposObrigatorios = () => {
    const errors: FieldErrors = {};

    // Tipo
    if (!tipo) errors.tipo = 'Selecione o tipo de pessoa.';

    // Identificação por tipo
    if (tipo === 'PJ') {
      if (!cnpj) errors.cnpj = 'CNPJ é obrigatório.';
      else if (!isValidCNPJ(cnpj)) errors.cnpj = 'CNPJ inválido.';

      if (!razao.trim()) errors.razao = 'Razão Social é obrigatória.';
      else if (razao.trim().length < 2) errors.razao = 'Informe ao menos 2 caracteres.';
    } else {
      if (!cpf) errors.cpf = 'CPF é obrigatório.';
      else if (!isValidCPF(cpf)) errors.cpf = 'CPF inválido.';

      if (!nome.trim()) errors.nome = 'Nome é obrigatório.';
      else if (nome.trim().length < 2) errors.nome = 'Informe ao menos 2 caracteres.';
    }

    // Contato
    if (!email.trim()) errors.email = 'E-mail é obrigatório.';
    else if (!isValidEmail(email)) errors.email = 'E-mail inválido.';

    if (!telefone.trim()) errors.telefone = 'Telefone é obrigatório.';
    else if (!isValidTelefone(telefone)) errors.telefone = 'Telefone inválido (use 10 ou 11 dígitos).';

    // Endereço
    if (!isValidCEP(cep)) errors.cep = 'CEP é obrigatório (8 dígitos).';
    if (!isNonEmpty(logradouro)) errors.logradouro = 'Logradouro é obrigatório.';
    if (!isNonEmpty(numero)) errors.numero = 'Número é obrigatório.';
    if (!isNonEmpty(bairro)) errors.bairro = 'Bairro é obrigatório.';
    if (!isNonEmpty(cidade)) errors.cidade = 'Cidade é obrigatória.';
    if (!isValidUF(uf)) errors.uf = 'UF deve ter 2 letras.';

    if (!aceiteTermos) {
      setErro('É necessário aceitar os termos de cadastro.');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0 && aceiteTermos;
  };

  // ——— ações ———
  const handleSalvar = async () => {
    setErro(null);
    setOkMsg(null);

    if (!validarCamposObrigatorios()) return;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const url = API_BASE ? `${API_BASE}/clients/register` : '/api/clients/register';

      // monta o body conforme o tipo
      const identificacao =
        tipo === 'PJ'
          ? { cnpj, razao, temInscricaoEstadual }
          : { cpf, nome };

      const body = {
        tipo, // 'PF' | 'PJ'
        ...identificacao,
        telefone,
        email,
        endereco: { cep, logradouro, numero, complemento, bairro, cidade, uf },
      };

      const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao salvar (status ${resp.status})`);
      }

      setOkMsg('Cadastro salvo com sucesso.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar cadastro';
      setErro(msg);
    }
  };

  const handleLimpar = () => {
    setTipo('PJ');
    setCnpj('');
    setRazao('');
    setTemInscricaoEstadual(false);
    setCpf('');
    setNome('');
    setTelefone('');
    setEmail('');
    setCep('');
    setLogradouro('');
    setNumero('');
    setComplemento('');
    setBairro('');
    setCidade('');
    setUf('');
    setAceiteTermos(false);
    setFieldErrors({});
    setErro(null);
    setOkMsg(null);
    cnpjRef.current?.focus();
  };

  const handleCancelar = () => router.back();

  const handleBuscarCep = async () => {
    setErro(null);
    const digits = onlyDigits(cep);
    if (digits.length !== 8) {
      setErro('CEP inválido. Use 8 dígitos.');
      setFieldErrors((prev) => ({ ...prev, cep: 'CEP deve ter 8 dígitos.' }));
      return;
    }

    try {
      setLoadingCep(true);
      const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { method: 'GET', cache: 'no-store' });
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
        setFieldErrors((prev) => ({ ...prev, cep: 'CEP não encontrado.' }));
        return;
      }

      setLogradouro(data.logradouro ?? '');
      const bairroFilled = data.bairro && data.bairro.trim().length > 0 ? data.bairro : 'Centro';
      setBairro(bairroFilled);
      setCidade(data.localidade ?? '');
      setUf((data.uf ?? '').toUpperCase());

      // Ajusta mensagens de erro de endereço após o preenchimento automático
      setFieldErrors((prev) => ({
        ...prev,
        cep: undefined,
        logradouro: isNonEmpty(data.logradouro ?? '') ? undefined : 'Logradouro é obrigatório.',
        bairro: isNonEmpty(bairroFilled) ? undefined : 'Bairro é obrigatório.',
        cidade: isNonEmpty(data.localidade ?? '') ? undefined : 'Cidade é obrigatória.',
        uf: isValidUF((data.uf ?? '').toUpperCase()) ? undefined : 'UF deve ter 2 letras.',
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao consultar CEP';
      setErro(msg);
    } finally {
      setLoadingCep(false);
    }
  };

  // ============================
  // Tema branco/verde
  // ============================
const theme = useMemo(
  () =>
    createTheme({
      palette: {
        mode: 'light',
        primary: { main: '#ffffff', contrastText: '#1f2937' },
        secondary: { main: '#2e7d32', dark: '#1b5e20', contrastText: '#2e7d32' },
        background: { default: '#ffffff', paper: '#ffffff' },
        text: { primary: '#1f2937', secondary: '#4b5563' },
      },
      shape: { borderRadius: 12 },
      components: {
        MuiCheckbox: {
          defaultProps: { color: 'secondary' },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              border: '1px solid',
              borderColor: 'rgba(0,0,0,0.08)',
              boxShadow: '0 10px 30px rgba(2,12,27,0.06)',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 100%)',
              backdropFilter: 'blur(6px)',
            },
          },
        },
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: { root: { borderRadius: 12, textTransform: 'none', fontWeight: 700 } },
        },
        MuiTooltip: { defaultProps: { arrow: true } },

        // ⭐ Ajuste de borda dos TextFields (OutlinedInput)
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0,0,0,0.23)', // padrão
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#2e7d32', // hover
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#2e7d32', // foco
                borderWidth: 2,
              },
            },
          },
        },
      },
    }),
  []
);

  const CARD_SX = { p: { xs: 2.5, md: 3 } } as const;
  const DISABLED_SX = { '& .MuiInputBase-root.Mui-disabled': { bgcolor: 'action.disabledBackground' } } as const;

  const SectionTitle: React.FC<{ icon: React.ReactNode; text: string; subtitle?: string }>
    = ({ icon, text, subtitle }) => (
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '12px',
              bgcolor: 'secondary.main',
              color: 'secondary.contrastText',
              display: 'grid',
              placeItems: 'center',
              boxShadow: 1,
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {text}
          </Typography>
        </Stack>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      </Stack>
    );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
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
            border: '1px solid',
            borderColor: 'rgba(0,0,0,0.06)',
          }}
        >
          <IconButton onClick={() => setSidebarOpen((v) => !v)} aria-label="menu" size="large">
            <MenuIcon />
          </IconButton>
        </Box>

        <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
          <Stack spacing={1} sx={{ mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: 0.2 }}>
              Cadastro de Cliente
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Selecione o tipo de pessoa e preencha os dados para criar seu cadastro.
            </Typography>
          </Stack>

          {/* Layout: esquerda = identificação + contato; direita = endereço */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={3}>
                {/* Identificação */}
                <Card>
                  <CardContent sx={CARD_SX}>
                    <SectionTitle icon={<DomainIcon fontSize="small" />} text="Identificação" />

                    {/* Tipo de pessoa - ButtonCheckbox como radio */}
                    <Stack spacing={1} sx={{ mb: 2 }}>
                      <FormLabel component="legend">Tipo de pessoa</FormLabel>
                      <Stack direction="row" spacing={1} role="radiogroup" aria-label="Tipo de pessoa">
                        <ButtonCheckbox
                          checked={tipo === 'PF'}
                          onChange={() => {
                            setTipo('PF');
                            setFieldErrors((prev) => ({
                              ...prev,
                              cpf: undefined,
                              nome: undefined,
                              cnpj: undefined,
                              razao: undefined,
                            }));
                            requestAnimationFrame(() => cpfRef.current?.focus());
                          }}
                          label="Pessoa Física"
                          size="small"
                          roleType="radio"
                        />
                        <ButtonCheckbox
                          checked={tipo === 'PJ'}
                          onChange={() => {
                            setTipo('PJ');
                            setFieldErrors((prev) => ({
                              ...prev,
                              cpf: undefined,
                              nome: undefined,
                              cnpj: undefined,
                              razao: undefined,
                            }));
                            requestAnimationFrame(() => cnpjRef.current?.focus());
                          }}
                          label="Pessoa Jurídica"
                          size="small"
                          roleType="radio"
                        />
                      </Stack>
                      {fieldErrors.tipo && <FormHelperText error>{fieldErrors.tipo}</FormHelperText>}
                    </Stack>

                    {/* Campos condicionais */}
                    {tipo === 'PJ' ? (
                      <Stack spacing={2.2}>
                        <TextField
                          label="CNPJ"
                          required
                          value={formatCNPJ(cnpj)}
                          onChange={handleCnpjChange}
                          onKeyDown={handleCnpjKeyDown}
                          inputRef={cnpjRef}
                          size="small"
                          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 18 }}
                          fullWidth
                          error={!!fieldErrors.cnpj}
                          helperText={fieldErrors.cnpj}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <BadgeIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />

                        <TextField
                          label="Razão Social"
                          required
                          value={razao}
                          onChange={(e) => {
                            setRazao(e.target.value);
                            setFieldErrors((prev) => ({
                              ...prev,
                              razao:
                                e.target.value.trim().length >= 2
                                  ? undefined
                                  : 'Informe ao menos 2 caracteres.',
                            }));
                          }}
                          size="small"
                          inputProps={{ maxLength: 120 }}
                          fullWidth
                          error={!!fieldErrors.razao}
                          helperText={fieldErrors.razao}
                        />

                        {/* Inscrição estadual como botão */}
                        <ButtonCheckbox
                          checked={temInscricaoEstadual}
                          onChange={setTemInscricaoEstadual}
                          label="Possui inscrição estadual?"
                          size="small"
                        />
                      </Stack>
                    ) : (
                      <Stack spacing={2.2}>
                        <TextField
                          label="CPF"
                          required
                          value={formatCPF(cpf)}
                          onChange={handleCpfChange}
                          onKeyDown={handleCpfKeyDown}
                          inputRef={cpfRef}
                          size="small"
                          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 14 }}
                          fullWidth
                          error={!!fieldErrors.cpf}
                          helperText={fieldErrors.cpf}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <BadgeIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />

                        <TextField
                          label="Nome"
                          required
                          value={nome}
                          onChange={(e) => {
                            setNome(e.target.value);
                            setFieldErrors((prev) => ({
                              ...prev,
                              nome:
                                e.target.value.trim().length >= 2
                                  ? undefined
                                  : 'Informe ao menos 2 caracteres.',
                            }));
                          }}
                          size="small"
                          inputProps={{ maxLength: 120 }}
                          fullWidth
                          error={!!fieldErrors.nome}
                          helperText={fieldErrors.nome}
                        />
                      </Stack>
                    )}
                  </CardContent>
                </Card>

                {/* Contato */}
                <Card>
                  <CardContent sx={CARD_SX}>
                    <SectionTitle icon={<EmailIcon fontSize="small" />} text="Contato" />

                    <Stack spacing={2.2}>
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
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PhoneIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />

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
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>

            {/* Direita: Endereço */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent sx={CARD_SX}>
                  <SectionTitle
                    icon={<LocationOnIcon fontSize="small" />}
                    text="Endereço"
                    subtitle="Você pode preencher automaticamente pelo CEP."
                  />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                    <TextField
                      label="CEP"
                      value={cep}
                      onChange={(e) => {
                        const v = onlyDigits(e.target.value).slice(0, 8);
                        setCep(v);
                        setFieldErrors((prev) => ({
                          ...prev,
                          cep: isValidCEP(v) ? undefined : 'CEP deve ter 8 dígitos.',
                        }));
                      }}
                      size="small"
                      inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 8 }}
                      sx={{ flex: 1 }}
                      error={!!fieldErrors.cep}
                      helperText={fieldErrors.cep}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <MapIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={handleBuscarCep}
                      disabled={loadingCep || !isValidCEP(cep)}
                      startIcon={loadingCep ? undefined : <PlaylistAddCheckIcon />}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      {loadingCep ? <CircularProgress size={20} /> : 'Buscar CEP'}
                    </Button>
                  </Stack>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <TextField
                        label="Rua/Avenida"
                        value={logradouro}
                        onChange={(e) => setLogradouro(e.target.value)}
                        size="small"
                        fullWidth
                        error={!!fieldErrors.logradouro}
                        helperText={fieldErrors.logradouro}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        label="Número"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        size="small"
                        fullWidth
                        error={!!fieldErrors.numero}
                        helperText={fieldErrors.numero}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Complemento"
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        size="small"
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Bairro"
                        value={bairro}
                        size="small"
                        fullWidth
                        disabled
                        sx={DISABLED_SX}
                        error={!!fieldErrors.bairro}
                        helperText={fieldErrors.bairro}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <TextField
                        label="Cidade"
                        value={cidade}
                        size="small"
                        fullWidth
                        disabled
                        sx={DISABLED_SX}
                        error={!!fieldErrors.cidade}
                        helperText={fieldErrors.cidade}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        label="UF"
                        value={uf}
                        size="small"
                        inputProps={{ maxLength: 2 }}
                        fullWidth
                        disabled
                        sx={DISABLED_SX}
                        error={!!fieldErrors.uf}
                        helperText={fieldErrors.uf}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Termos & Ações - linha inteira */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent sx={{ ...CARD_SX, pt: 2 }}>
                  {/* Termos como botão */}
                  <ButtonCheckbox
                    checked={aceiteTermos}
                    onChange={setAceiteTermos}
                    fullWidth
                    label={
                      <span>
                        Declaro que as informações estão corretas e aceito os <strong>termos de cadastro</strong>.
                      </span>
                    }
                  />

                  {erro && <Typography color="error" sx={{ mt: 1.5 }}>{erro}</Typography>}
                  {okMsg && <Typography color="secondary" sx={{ mt: 1.5 }}>{okMsg}</Typography>}

                  <Divider sx={{ my: 2 }} />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
                    <Tooltip title="Descarta alterações e volta para a página anterior">
                      <span>
                        <Button variant="text" onClick={handleCancelar} startIcon={<CloseIcon />}>
                          Cancelar
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip title="Limpa todos os campos do formulário">
                      <span>
                        <Button
                          variant="outlined"
                          color="secondary"
                          onClick={handleLimpar}
                          startIcon={<RestartAltIcon />}
                        >
                          Limpar
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip title="Salva o cadastro do cliente">
                      <span>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={handleSalvar}
                          startIcon={<SaveIcon />}
                        >
                          Salvar cadastro
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
