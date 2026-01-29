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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  AD_LOCALIZACAO?: string | null;
  AD_QTDMAX?: number | null;
  DESCRGRUPOPROD?: string | null;
  estoque?: EstoqueItem[];
};

const MAX_LOC = 15;
const MAX_LOC2 = 15;

const toStringSafe = (v: unknown) => (v == null ? '' : String(v));

function normalizeCurvaSaida(raw: unknown): string {
  if (raw == null) return 'D';

  if (typeof raw === 'string') {
    const s = raw.trim().toUpperCase();
    return s || 'D';
  }

  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    const curva = toStringSafe(
      r.curvaProduto ??
        r.CURVAPRODUTO ??
        r.curva_produto ??
        r.curva ??
        r.CURVA ??
        r.classificacao ??
        r.CLASSIFICACAO ??
        r.value ??
        r.data
    )
      .trim()
      .toUpperCase();
    return curva || 'D';
  }

  return 'D';
}

// ✅ agora normaliza para LISTA de códigos
function normalizeCodBarras(raw: unknown): string[] {
  const uniq = (arr: string[]) => Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));

  if (raw == null) return [];

  if (typeof raw === 'string' || typeof raw === 'number') {
    const s = String(raw).trim();
    if (s.includes(',')) return uniq(s.split(',').map((x) => x.trim()));
    return s ? [s] : [];
  }

  if (Array.isArray(raw)) {
    return uniq(raw.map((x) => String(x ?? '').trim()));
  }

  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;

    const direct =
      r.codBarras ??
      r.CODBARRAS ??
      r.codigoBarras ??
      r.CODIGOBARRAS ??
      r.barcode ??
      r.BARCODE;

    if (direct != null) {
      const s = String(direct).trim();
      if (s.includes(',')) return uniq(s.split(',').map((x) => x.trim()));
      return s ? [s] : [];
    }

    const data = r.data ?? r.DATA ?? r.items ?? r.ITEMS;
    if (Array.isArray(data)) {
      return uniq(data.map((x) => String(x ?? '').trim()));
    }
  }

  return [];
}

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cod, setCod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [produto, setProduto] = useState<Produto | null>(null);
  const [localizacao, setLocalizacao] = useState<string>('');
  const [AD_LOCALIZACAO, setAD_LOCALIZACAO] = useState<string>('');
  const [AD_QTDMAX, setAD_QTDMAX] = useState<string>('');

  const abortRef = useRef<AbortController | null>(null);

  // [auth] token de login (localStorage)
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

  const CRIAR_COD_BARRAS_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/criarCodigoBarras` : `/sync/criarCodigoBarras`),
    [API_BASE]
  );

  const GET_CURVA_BY_ID_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getCurvaById` : `/sync/getCurvaById`),
    [API_BASE]
  );

  const GET_COD_BARRAS_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getCodBarras` : `/sync/getCodBarras`),
    [API_BASE]
  );

  // Store (POST update)
  const { sendUpdateLocation, sendUpdateLocation2, sendUpdateQtdMax, isSaving, error: storeError } =
    useUpdateLocStore();

  useEffect(() => {
    setLocalizacao((produto?.LOCALIZACAO ?? '').toString().slice(0, MAX_LOC));
  }, [produto]);

  useEffect(() => {
    setAD_LOCALIZACAO((produto?.AD_LOCALIZACAO ?? '').toString().slice(0, MAX_LOC2));
  }, [produto]);

  useEffect(() => {
    setAD_QTDMAX((produto?.AD_QTDMAX ?? '').toString());
  }, [produto]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const numberFormatter = useMemo(() => new Intl.NumberFormat('pt-BR'), []);
  const toNum = (v: unknown) => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  const totais = useMemo(() => {
    const itens = produto?.estoque ?? [];
    return itens.reduce(
      (acc, it) => {
        acc.estoque += toNum(it.ESTOQUE);
        acc.reservado += toNum(it.RESERVADO);
        acc.disponivel += toNum(it.DISPONIVEL);
        return acc;
      },
      { estoque: 0, reservado: 0, disponivel: 0 }
    );
  }, [produto]);

  const getUrl = useCallback(
    (id: string) =>
      API_BASE ? `${API_BASE}/sync/getProduct?id=${encodeURIComponent(id)}` : `/sync/getProduct?id=${encodeURIComponent(id)}`,
    [API_BASE]
  );

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  // ------------------------------------------------------------------
  // ✅ CURVA DE SAÍDA
  // ------------------------------------------------------------------
  const [curvaSaida, setCurvaSaida] = useState<string>('-');
  const [curvaSaidaLoading, setCurvaSaidaLoading] = useState(false);
  const [curvaSaidaError, setCurvaSaidaError] = useState<string | null>(null);

  const lastCurvaReqRef = useRef<string | null>(null);

  const fetchCurvaSaida = useCallback(
    async (codProd: string) => {
      if (lastCurvaReqRef.current === codProd) return;
      lastCurvaReqRef.current = codProd;

      setCurvaSaidaLoading(true);
      setCurvaSaidaError(null);

      try {
        const url = `${GET_CURVA_BY_ID_URL}?codProd=${encodeURIComponent(codProd)}`;

        const resp = await fetch(url, {
          method: 'GET',
          headers: getHeaders(),
          cache: 'no-store',
        });

        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha ao buscar curva de saída (status ${resp.status})`);
        }

        const raw = (await resp.json()) as unknown;
        setCurvaSaida(normalizeCurvaSaida(raw));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao buscar curva de saída';
        setCurvaSaida('-');
        setCurvaSaidaError(msg);
      } finally {
        setCurvaSaidaLoading(false);
      }
    },
    [GET_CURVA_BY_ID_URL, getHeaders]
  );

  useEffect(() => {
    const codProd = produto?.CODPROD != null ? String(produto.CODPROD).trim() : '';
    if (!codProd) {
      setCurvaSaida('-');
      setCurvaSaidaError(null);
      setCurvaSaidaLoading(false);
      lastCurvaReqRef.current = null;
      return;
    }

    setCurvaSaida('-');
    setCurvaSaidaError(null);
    lastCurvaReqRef.current = null;
    void fetchCurvaSaida(codProd);
  }, [produto?.CODPROD, fetchCurvaSaida]);

  // ------------------------------------------------------------------
  // ✅ CÓDIGO DE BARRAS (lista + expand/minimize)
  // ------------------------------------------------------------------
  const [codigoBarrasList, setCodigoBarrasList] = useState<string[]>([]);
  const [codigoBarrasLoading, setCodigoBarrasLoading] = useState(false);
  const [codigoBarrasError, setCodigoBarrasError] = useState<string | null>(null);
  const [barrasExpanded, setBarrasExpanded] = useState(false);

  const lastBarrasReqRef = useRef<string | null>(null);

  const fetchCodBarras = useCallback(
    async (codProd: string) => {
      if (lastBarrasReqRef.current === codProd) return;
      lastBarrasReqRef.current = codProd;

      setCodigoBarrasLoading(true);
      setCodigoBarrasError(null);

      try {
        const url = `${GET_COD_BARRAS_URL}?codProd=${encodeURIComponent(codProd)}`;

        const resp = await fetch(url, {
          method: 'GET',
          headers: getHeaders(),
          cache: 'no-store',
        });

        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha ao buscar código de barras (status ${resp.status})`);
        }

        const raw = (await resp.json()) as unknown;
        const list = normalizeCodBarras(raw);
        setCodigoBarrasList(list);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao buscar código de barras';
        setCodigoBarrasList([]);
        setCodigoBarrasError(msg);
      } finally {
        setCodigoBarrasLoading(false);
      }
    },
    [GET_COD_BARRAS_URL, getHeaders]
  );

  useEffect(() => {
    const codProd = produto?.CODPROD != null ? String(produto.CODPROD).trim() : '';
    if (!codProd) {
      setCodigoBarrasList([]);
      setCodigoBarrasError(null);
      setCodigoBarrasLoading(false);
      setBarrasExpanded(false);
      lastBarrasReqRef.current = null;
      return;
    }

    setCodigoBarrasList([]);
    setCodigoBarrasError(null);
    setBarrasExpanded(false);
    lastBarrasReqRef.current = null;
    void fetchCodBarras(codProd);
  }, [produto?.CODPROD, fetchCodBarras]);

  // ------------------------------------------------------------------

  const handleApagarBusca = useCallback(() => {
    setCod('');
    setErro(null);
    setOkMsg(null);

    // opcional: limpa resultado na tela também
    setProduto(null);

    // opcional: reseta estados derivados
    setCurvaSaida('-');
    setCurvaSaidaError(null);
    lastCurvaReqRef.current = null;

    setCodigoBarrasList([]);
    setCodigoBarrasError(null);
    setBarrasExpanded(false);
    lastBarrasReqRef.current = null;
  }, []);


  const handleBuscar = useCallback(async () => {
    setErro(null);
    setOkMsg(null);
    setProduto(null);

    setCurvaSaida('-');
    setCurvaSaidaError(null);
    lastCurvaReqRef.current = null;

    setCodigoBarrasList([]);
    setCodigoBarrasError(null);
    setBarrasExpanded(false);
    lastBarrasReqRef.current = null;

    const clean = cod.trim();
    if (!clean) {
      setErro('Informe o código do produto.');
      return;
    }
    if (!/^\d+$/.test(clean)) {
      setErro('O código deve conter apenas números.');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);

      const resp = await fetch(getUrl(clean), {
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
        return;
      }

      setProduto(data);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'name' in e && (e as { name?: unknown }).name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'Erro ao buscar produto';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }, [cod, getHeaders, getUrl]);

  const handleSalvarTudo = useCallback(async () => {
    if (!produto?.CODPROD) {
      setErro('Busque um produto antes de salvar.');
      return;
    }
    setErro(null);
    setOkMsg(null);

    const id = Number(produto.CODPROD);
    if (!Number.isFinite(id)) {
      setErro('CODPROD inválido.');
      return;
    }

    const loc1 = localizacao.slice(0, MAX_LOC);
    const loc2 = AD_LOCALIZACAO.slice(0, MAX_LOC2);

    const qtdMaxRaw = AD_QTDMAX.trim();
    if (!qtdMaxRaw) {
      setErro('Informe a Quantidade Máxima.');
      return;
    }
    if (!/^\d+([.,]\d+)?$/.test(qtdMaxRaw)) {
      setErro('AD_QTDMAX deve ser numérico.');
      return;
    }
    const qtdMaxNum = Number(qtdMaxRaw.replace(',', '.'));
    if (!Number.isFinite(qtdMaxNum)) {
      setErro('AD_QTDMAX inválido.');
      return;
    }

    try {
      const [ok1, ok2, ok3] = await Promise.all([
        sendUpdateLocation(id, loc1),
        sendUpdateLocation2(id, loc2),
        sendUpdateQtdMax(id, qtdMaxNum),
      ]);

      if (!ok1 || !ok2 || !ok3) {
        setErro(storeError || 'Erro ao salvar alterações.');
        return;
      }

      setOkMsg('Alterações salvas com sucesso!');
      setProduto((p) => (p ? { ...p, LOCALIZACAO: loc1, AD_LOCALIZACAO: loc2, AD_QTDMAX: qtdMaxNum } : p));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar alterações.';
      setErro(msg);
    }
  }, [
    AD_LOCALIZACAO,
    AD_QTDMAX,
    localizacao,
    produto?.CODPROD,
    sendUpdateLocation,
    sendUpdateLocation2,
    sendUpdateQtdMax,
    storeError,
  ]);

  const onChangeLimit: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value ?? '';
    setLocalizacao(v.slice(0, MAX_LOC));
  };

  const onChangeLimit2: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value ?? '';
    setAD_LOCALIZACAO(v.slice(0, MAX_LOC2));
  };

  // ------------------------------------------------------------------
  // Modal: ADICIONAR COD. BARRAS
  // ------------------------------------------------------------------
  const [addBarrasOpen, setAddBarrasOpen] = useState(false);
  const [codBarras, setCodBarras] = useState('');
  const [addBarrasLoading, setAddBarrasLoading] = useState(false);
  const [addBarrasErr, setAddBarrasErr] = useState<string | null>(null);

  const openAddBarras = useCallback(() => {
    setAddBarrasErr(null);
    setCodBarras('');
    setAddBarrasOpen(true);
  }, []);

  const closeAddBarras = useCallback(() => {
    setAddBarrasOpen(false);
    setAddBarrasErr(null);
  }, []);

  const handleEnviarCodBarras = useCallback(async () => {
    if (!produto?.CODPROD) {
      setAddBarrasErr('Busque um produto antes de adicionar código de barras.');
      return;
    }
    const codProdNum = Number(produto.CODPROD);
    if (!Number.isFinite(codProdNum)) {
      setAddBarrasErr('CODPROD inválido.');
      return;
    }

    const barras = codBarras.trim();
    if (!barras) {
      setAddBarrasErr('Informe o código de barras.');
      return;
    }

    setAddBarrasErr(null);
    setErro(null);
    setOkMsg(null);

    try {
      setAddBarrasLoading(true);

      const payload = { codProduto: codProdNum, codBarras: barras };

      const resp = await fetch(CRIAR_COD_BARRAS_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao criar código de barras (status ${resp.status})`);
      }

      setOkMsg('Código de barras adicionado com sucesso!');
      setAddBarrasOpen(false);

      // ✅ atualiza a lista exibida após adicionar
      lastBarrasReqRef.current = null;
      await fetchCodBarras(String(codProdNum));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar código de barras.';
      setAddBarrasErr(msg);
    } finally {
      setAddBarrasLoading(false);
    }
  }, [CRIAR_COD_BARRAS_URL, codBarras, getHeaders, produto?.CODPROD, fetchCodBarras]);

  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), []);

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

  // ✅ preview 1 item (pra aparecer expandir com 2+)
  const BARRAS_PREVIEW_QTD = 0;
  const barrasToShow = barrasExpanded ? codigoBarrasList : codigoBarrasList.slice(0, BARRAS_PREVIEW_QTD);
  const hasMoreBarras = codigoBarrasList.length > BARRAS_PREVIEW_QTD;

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

      <SidebarMenu open={sidebarOpen} onClose={handleCloseSidebar} />

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
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleBuscar();
              }}
              size="small"
              autoFocus
              slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
            />

            <Button variant="contained" onClick={handleBuscar} disabled={loading}>
              {loading ? <CircularProgress size={22} /> : 'Buscar'}
            </Button>

            <Button
              variant="contained"
              color="error"
              onClick={handleApagarBusca}
              disabled={!cod && !produto}
              sx={{ whiteSpace: 'nowrap', height: 40 }}
            >
              APAGAR
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

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                    <TextField label="CODPROD" value={produto.CODPROD ?? ''} size="small" disabled fullWidth />
                    <TextField label="DESCRPROD" value={produto.DESCRPROD ?? ''} size="small" disabled fullWidth />
                    <TextField
                      label="CURVA DE SAÍDA"
                      value={curvaSaidaLoading ? 'Carregando...' : curvaSaidaError ? 'Erro' : curvaSaida}
                      size="small"
                      disabled
                      fullWidth
                      helperText={curvaSaidaError ? curvaSaidaError : `Curva de saida(A/B/C/D)`}
                    />
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                      gap: 2,
                      alignItems: 'start',
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

                    <TextField
                      label="LOCALIZAÇÃO 2"
                      value={AD_LOCALIZACAO}
                      onChange={onChangeLimit2}
                      size="small"
                      fullWidth
                      slotProps={{ htmlInput: { maxLength: MAX_LOC2 } }}
                      helperText={`${AD_LOCALIZACAO.length}/${MAX_LOC2}`}
                    />

                    <TextField
                      label="Quantidade Máxima"
                      value={AD_QTDMAX}
                      onChange={(e) => setAD_QTDMAX(e.target.value)}
                      size="small"
                      fullWidth
                      slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                      helperText={`Atual: ${String(produto?.AD_QTDMAX ?? '-')}`}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      onClick={handleSalvarTudo}
                      disabled={isSaving || !produto?.CODPROD}
                      sx={{ whiteSpace: 'nowrap', height: 40 }}
                    >
                      {isSaving ? <CircularProgress size={22} /> : 'SALVAR ALTERAÇÕES'}
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={openAddBarras}
                      disabled={!produto?.CODPROD}
                      sx={{ whiteSpace: 'nowrap', height: 40 }}
                    >
                      ADICIONAR COD. BARRAS
                    </Button>
                  </Box>

                  {/* ✅ Lista + Expandir/Minimizar */}
                  <Box
                    sx={{
                      border: (t) => `1px solid ${t.palette.divider}`,
                      borderRadius: 1,
                      p: 1.5,
                      backgroundColor: 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        CÓDIGO DE BARRAS
                      </Typography>

                      {hasMoreBarras && (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setBarrasExpanded((v) => !v)}
                          sx={{ textTransform: 'none' }}
                          disabled={codigoBarrasLoading}
                        >
                          {barrasExpanded ? 'Minimizar' : 'Expandir'}
                        </Button>
                      )}
                    </Box>

                    {codigoBarrasLoading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2">Carregando...</Typography>
                      </Box>
                    ) : codigoBarrasError ? (
                      <Typography variant="body2" color="error">
                        Erro ao carregar códigos.
                      </Typography>
                    ) : codigoBarrasList.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nenhum código de barras cadastrado.
                      </Typography>
                    ) : (
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        {barrasToShow.map((b, idx) => (
                          <Box component="li" key={`${b}-${idx}`} sx={{ fontFamily: 'monospace' }}>
                            {b}
                          </Box>
                        ))}
                        {!barrasExpanded && hasMoreBarras && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            +{codigoBarrasList.length - BARRAS_PREVIEW_QTD} outros...
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>

                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" sx={SECTION_TITLE_SX}>
                    Estoque por local
                  </Typography>

                  {!produto.estoque || produto.estoque.length === 0 ? (
                    <Typography sx={{ color: 'text.secondary' }}>Nenhum registro de estoque para este produto.</Typography>
                  ) : (
                    <TableContainer
                      component={Paper}
                      elevation={0}
                      sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 2 }}
                    >
                      <Table size="small" stickyHeader>
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
                            <TableCell>Código Local</TableCell>
                            <TableCell>Local</TableCell>
                            <TableCell>Cód. Empresa</TableCell>
                            <TableCell align="right">Estoque</TableCell>
                            <TableCell align="right">Reservado</TableCell>
                            <TableCell align="right">Disponível</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {produto.estoque!.map((it, idx) => (
                            <TableRow key={`${it.CODLOCAL}-${idx}`}>
                              <TableCell>{it.CODLOCAL}</TableCell>
                              <TableCell>{it.LocalFinanceiro_DESCRLOCAL ?? '-'}</TableCell>
                              <TableCell>{it.CODEMP ?? '-'}</TableCell>
                              <TableCell align="right">{numberFormatter.format(toNum(it.ESTOQUE))}</TableCell>
                              <TableCell align="right">{numberFormatter.format(toNum(it.RESERVADO))}</TableCell>
                              <TableCell align="right">{numberFormatter.format(toNum(it.DISPONIVEL))}</TableCell>
                            </TableRow>
                          ))}

                          <TableRow>
                            <TableCell colSpan={3} sx={{ fontWeight: 700 }}>
                              Totais
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {numberFormatter.format(totais.estoque)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {numberFormatter.format(totais.reservado)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {numberFormatter.format(totais.disponivel)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Stack>
              </>
            )}
          </CardContent>
        </Card>

        {/* Modal: ADICIONAR COD. BARRAS */}
        <Dialog open={addBarrasOpen} onClose={closeAddBarras} fullWidth maxWidth="xs">
          <DialogTitle>Adicionar código de barras</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Informe o código de barras para o produto <b>{String(produto?.CODPROD ?? '-')}</b>.
            </Typography>

            <TextField
              label="Código de barras"
              value={codBarras}
              onChange={(e) => setCodBarras(e.target.value)}
              size="small"
              fullWidth
              autoFocus
              sx={{ mt: 1 }}
            />

            {addBarrasErr && (
              <Typography color="error" sx={{ mt: 2 }}>
                {addBarrasErr}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={closeAddBarras} disabled={addBarrasLoading}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleEnviarCodBarras} disabled={addBarrasLoading || !codBarras.trim()}>
              {addBarrasLoading ? <CircularProgress size={18} /> : 'ENVIAR'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
