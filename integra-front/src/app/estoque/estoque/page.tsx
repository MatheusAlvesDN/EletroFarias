'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Server,
  Search,
  Trash2,
  AlertTriangle,
  Package,
  Save,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  MapPin,
  Barcode,
  Boxes
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';
import { useUpdateLocStore } from '@/stores/useUpdateLocStore';

// --- Tipos ---
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
  AD_NOMEPRDLV?: string | null; // Adicionado do seu código original
};

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
  roles?: string[];
  exp?: number;
  iat?: number;
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

function decodeJwtEmail(token: string | null) {
  const jwtEmail = decodeJwt(token);
  return jwtEmail?.email ?? jwtEmail?.sub ?? null;
}

const MAX_LOC = 15;
const MAX_LOC2 = 30;

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
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [cod, setCod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [produto, setProduto] = useState<Produto | null>(null);
  const [localizacao, setLocalizacao] = useState<string>('');
  const [AD_LOCALIZACAO, setAD_LOCALIZACAO] = useState<string>('');
  const [AD_QTDMAX, setAD_QTDMAX] = useState<string>('');

  const abortRef = useRef<AbortController | null>(null);

  // Toast Customizado
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  // Auth
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
    setUserEmail(decodeJwtEmail(t));
  }, [router]);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const GET_CURVA_BY_ID_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getCurvaById` : `/sync/getCurvaById`),
    [API_BASE]
  );

  const GET_COD_BARRAS_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getCodBarras` : `/sync/getCodBarras`),
    [API_BASE]
  );

  const CREATE_ERRO_ESTOQUE_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/createErroEstoque` : `/sync/createErroEstoque`),
    [API_BASE]
  );

  // Store (POST update)
  const { sendUpdateLocation, sendUpdateLocation2, sendUpdateQtdMax, isSaving, error: storeError } = useUpdateLocStore();

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

  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, open: false }));
    }, 4000);
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
    setProduto(null);
    
    setCurvaSaida('-');
    setCurvaSaidaError(null);
    lastCurvaReqRef.current = null;

    setCodigoBarrasList([]);
    setCodigoBarrasError(null);
    setBarrasExpanded(false);
    lastBarrasReqRef.current = null;
    setToastState(p => ({ ...p, open: false }));
  }, []);

  const handleBuscar = useCallback(async () => {
    setToastState(p => ({ ...p, open: false }));
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
      toast('Informe o código do produto.', 'error');
      return;
    }
    if (!/^\d+$/.test(clean)) {
      toast('O código deve conter apenas números.', 'error');
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
        toast('Produto não encontrado.', 'error');
        setProduto(null);
        return;
      }

      setProduto(data);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'name' in e && (e as { name?: unknown }).name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'Erro ao buscar produto';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [cod, getHeaders, getUrl, toast]);

  const handleSalvarTudo = useCallback(async () => {
    if (!produto?.CODPROD) {
      toast('Busque um produto antes de salvar.', 'error');
      return;
    }

    const id = Number(produto.CODPROD);
    if (!Number.isFinite(id)) {
      toast('CODPROD inválido.', 'error');
      return;
    }

    const loc1 = localizacao.slice(0, MAX_LOC);
    const loc2 = AD_LOCALIZACAO.slice(0, MAX_LOC2);

    const qtdMaxRaw = AD_QTDMAX.trim();
    if (!qtdMaxRaw) {
      toast('Informe a Quantidade Máxima.', 'error');
      return;
    }
    if (!/^\d+([.,]\d+)?$/.test(qtdMaxRaw)) {
      toast('Qtd Máxima deve ser um valor numérico.', 'error');
      return;
    }
    const qtdMaxNum = Number(qtdMaxRaw.replace(',', '.'));
    if (!Number.isFinite(qtdMaxNum)) {
      toast('Qtd Máxima inválida.', 'error');
      return;
    }

    try {
      const [ok1, ok2, ok3] = await Promise.all([
        sendUpdateLocation(id, loc1),
        sendUpdateLocation2(id, loc2),
        sendUpdateQtdMax(id, qtdMaxNum),
      ]);

      if (!ok1 || !ok2 || !ok3) {
        toast(storeError || 'Erro ao salvar alterações.', 'error');
        return;
      }

      toast('Alterações salvas com sucesso!', 'success');
      setProduto((p) => (p ? { ...p, LOCALIZACAO: loc1, AD_LOCALIZACAO: loc2, AD_QTDMAX: qtdMaxNum } : p));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar alterações.';
      toast(msg, 'error');
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
    toast
  ]);

  const onChangeLimit: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value ?? '';
    setLocalizacao(v.slice(0, MAX_LOC));
  };

  const onChangeLimit2: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value ?? '';
    setAD_LOCALIZACAO(v.slice(0, MAX_LOC2));
  };

  // Erro Estoque Modal
  const [erroEstoqueOpen, setErroEstoqueOpen] = useState(false);
  const [erroEstoqueDesc, setErroEstoqueDesc] = useState('');
  const [erroEstoqueLoading, setErroEstoqueLoading] = useState(false);
  const [erroEstoqueErr, setErroEstoqueErr] = useState<string | null>(null);

  const openErroEstoque = useCallback(() => {
    setErroEstoqueErr(null);
    setErroEstoqueDesc('');
    setErroEstoqueOpen(true);
  }, []);

  const closeErroEstoque = useCallback(() => {
    if (erroEstoqueLoading) return;
    setErroEstoqueOpen(false);
    setErroEstoqueErr(null);
  }, [erroEstoqueLoading]);

  const handleEnviarErroEstoque = useCallback(async () => {
    if (!produto?.CODPROD) {
      setErroEstoqueErr('Busque um produto antes de notificar um erro.');
      return;
    }

    const codProdNum = Number(produto.CODPROD);
    if (!Number.isFinite(codProdNum)) {
      setErroEstoqueErr('CODPROD inválido.');
      return;
    }

    const descricao = erroEstoqueDesc.trim();
    if (!descricao) {
      setErroEstoqueErr('Descreva o erro antes de enviar.');
      return;
    }

    setErroEstoqueErr(null);

    try {
      setErroEstoqueLoading(true);

      const resp = await fetch(CREATE_ERRO_ESTOQUE_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify({ codProd: codProdNum, descricao }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao notificar erro (status ${resp.status})`);
      }

      toast('Erro notificado com sucesso!', 'success');
      setErroEstoqueOpen(false);
      setErroEstoqueDesc('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao notificar erro.';
      setErroEstoqueErr(msg);
    } finally {
      setErroEstoqueLoading(false);
    }
  }, [CREATE_ERRO_ESTOQUE_URL, erroEstoqueDesc, getHeaders, produto?.CODPROD, toast]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') void handleBuscar();
  };

  const BARRAS_PREVIEW_QTD = 0;
  const barrasToShow = barrasExpanded ? codigoBarrasList : codigoBarrasList.slice(0, BARRAS_PREVIEW_QTD);
  const hasMoreBarras = codigoBarrasList.length > BARRAS_PREVIEW_QTD;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
      {/* Botão flutuante sidebar */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        title="Abrir Menu"
      >
        <Menu className="w-7 h-7" />
      </button>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} userEmail={userEmail} onLogout={handleLogout} />

      {/* Header Padronizado */}
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 opacity-90 text-emerald-100" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Painel Gerencial</h1>
                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                  Busca de Produto &amp; Estoque
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <img
                src="/eletro_farias2.png"
                alt="Logo 1"
                className="h-16 w-auto object-contain bg-green/10 rounded px-2"                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <img
                src="/lid-verde-branco.png"
                alt="Logo 2"
                className="h-12 w-auto object-contain hidden md:block"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>
        </div>
      </header>


      {/* Conteúdo Principal */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 animate-fade-in-up">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Cabeçalho do Card */}
          <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-6 h-6 text-emerald-600" />
              <h2 className="text-xl font-bold text-emerald-900">Buscar por código</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative w-full sm:w-auto sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Código do produto..."
                  value={cod}
                  onChange={(e) => setCod(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleBuscar}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                </button>

                <button
                  type="button"
                  onClick={handleApagarBusca}
                  disabled={!cod && !produto}
                  className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Apagar
                </button>

                <button
                  type="button"
                  onClick={openErroEstoque}
                  disabled={!produto?.CODPROD}
                  className="flex-1 sm:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Notificar Erro
                </button>
              </div>
            </div>
          </div>

          {/* Resultado */}
          {produto && (
            <div className="p-6 bg-slate-50/50 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-4 text-emerald-800">
                <Package className="w-5 h-5" />
                <h3 className="text-lg font-bold">Detalhes do Produto</h3>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                {/* Imagem */}
                <div className="w-full md:w-56 h-56 bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center shrink-0 shadow-sm">
                  <img
                    src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${produto.CODPROD}.dbimage`}
                    alt={produto.DESCRPROD ?? 'Produto'}
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2JkNWUxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiPjwvcmVjdD48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSI+PC9jaXJjbGU+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSI+PC9wb2x5bGluZT48L3N2Zz4=';
                      (e.target as HTMLImageElement).className = 'w-20 h-20 opacity-40';
                    }}
                  />
                </div>

                {/* Info & Inputs */}
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cód. Prod</label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                        {produto.CODPROD ?? '-'}
                      </div>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 truncate" title={produto.DESCRPROD ?? ''}>
                        {produto.DESCRPROD ?? '-'}
                      </div>
                    </div>

                    <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome Comercial (PDV)</label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 truncate" title={produto.AD_NOMEPRDLV ?? ''}>
                        {produto.AD_NOMEPRDLV ?? '-'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Curva de Saída</label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                        {curvaSaidaLoading ? 'Carregando...' : curvaSaidaError ? 'Erro' : curvaSaida}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Marca</label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 truncate">
                        {produto.MARCA ?? '-'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cod. Vol.</label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                        {produto.CODVOL ?? '-'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Características</label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 min-h-[60px]">
                      {produto.CARACTERISTICAS || '-'}
                    </div>
                  </div>

                  {/* Campos Editáveis */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Localização
                      </label>
                      <input
                        type="text"
                        value={localizacao}
                        onChange={onChangeLimit}
                        maxLength={MAX_LOC}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="text-[10px] text-right text-slate-400 mt-0.5">{localizacao.length}/{MAX_LOC}</div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Localização 2
                      </label>
                      <input
                        type="text"
                        value={AD_LOCALIZACAO}
                        onChange={onChangeLimit2}
                        maxLength={MAX_LOC2}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="text-[10px] text-right text-slate-400 mt-0.5">{AD_LOCALIZACAO.length}/{MAX_LOC2}</div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Qtd. Máxima</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={AD_QTDMAX}
                        onChange={(e) => setAD_QTDMAX(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="text-[10px] text-right text-slate-400 mt-0.5">Atual: {String(produto?.AD_QTDMAX ?? '-')}</div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSalvarTudo}
                      disabled={isSaving || !produto?.CODPROD}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Seção Código de Barras */}
              <div className="mt-6">
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                      <Barcode className="w-4 h-4 text-slate-500" />
                      Códigos de Barras
                    </div>
                    {hasMoreBarras && (
                      <button
                        onClick={() => setBarrasExpanded((v) => !v)}
                        disabled={codigoBarrasLoading}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-1 focus:outline-none"
                      >
                        {barrasExpanded ? (
                          <>Minimizar <ChevronUp className="w-3.5 h-3.5" /></>
                        ) : (
                          <>Expandir <ChevronDown className="w-3.5 h-3.5" /></>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    {codigoBarrasLoading ? (
                      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" /> Carregando códigos...
                      </div>
                    ) : codigoBarrasError ? (
                      <div className="text-rose-600 text-sm font-medium">{codigoBarrasError}</div>
                    ) : codigoBarrasList.length === 0 ? (
                      <div className="text-slate-500 text-sm italic">Nenhum código de barras cadastrado.</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {barrasToShow.map((b, idx) => (
                          <div key={`${b}-${idx}`} className="font-mono text-sm text-slate-700 bg-slate-100 px-3 py-1.5 rounded inline-block w-fit border border-slate-200">
                            {b}
                          </div>
                        ))}
                        {!barrasExpanded && hasMoreBarras && (
                          <div className="text-xs text-slate-500 font-medium mt-1">
                            +{codigoBarrasList.length - BARRAS_PREVIEW_QTD} outros códigos...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção Estoque */}
              <div className="mt-8 border-t border-slate-200 pt-6">
                <div className="flex items-center gap-2 mb-4 text-emerald-800">
                  <Boxes className="w-5 h-5" />
                  <h3 className="text-lg font-bold">Estoque por local</h3>
                </div>

                {!produto.estoque || produto.estoque.length === 0 ? (
                  <div className="p-6 bg-white border border-slate-200 rounded-xl text-center text-slate-500 text-sm italic">
                    Nenhum registro de estoque para este produto.
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Código Local</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Local</th>
                            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estoque</th>
                            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reservado</th>
                            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Disponível</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {produto.estoque.map((it, idx) => (
                            <tr key={`${it.CODLOCAL}-${idx}`} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-2.5 text-sm font-bold text-slate-700">{it.CODLOCAL}</td>
                              <td className="px-4 py-2.5 text-sm text-slate-600">{it.LocalFinanceiro_DESCRLOCAL ?? '-'}</td>
                              <td className="px-4 py-2.5 text-sm text-right tabular-nums font-medium text-slate-800">{numberFormatter.format(toNum(it.ESTOQUE))}</td>
                              <td className="px-4 py-2.5 text-sm text-right tabular-nums text-rose-600 font-medium">{numberFormatter.format(toNum(it.RESERVADO))}</td>
                              <td className="px-4 py-2.5 text-sm text-right tabular-nums font-bold text-emerald-700">{numberFormatter.format(toNum(it.DISPONIVEL))}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-emerald-50/50 border-t-2 border-emerald-100">
                          <tr>
                            <td colSpan={2} className="px-4 py-3 text-right text-xs font-bold text-emerald-900 uppercase tracking-wider">Totais</td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-emerald-900 tabular-nums">{numberFormatter.format(totais.estoque)}</td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-rose-700 tabular-nums">{numberFormatter.format(totais.reservado)}</td>
                            <td className="px-4 py-3 text-right text-sm font-black text-emerald-700 tabular-nums">{numberFormatter.format(totais.disponivel)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Notificar Erro */}
      {erroEstoqueOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-rose-50/50 flex items-center gap-3">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-full">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-rose-900 text-lg">Notificar Erro de Estoque</h3>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm text-slate-700">
                Produto: <span className="font-bold font-mono">{String(produto?.CODPROD ?? '-')}</span> — {produto?.DESCRPROD ?? ''}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 block">Descrição do Erro</label>
                <textarea
                  value={erroEstoqueDesc}
                  onChange={(e) => setErroEstoqueDesc(e.target.value)}
                  placeholder="Descreva o problema encontrado (ex.: divergência, cadastro incorreto, localização errada...)"
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow min-h-[120px] resize-y"
                />
              </div>

              {erroEstoqueErr && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {erroEstoqueErr}
                </div>
              )}
            </div>
            
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={closeErroEstoque}
                disabled={erroEstoqueLoading}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviarErroEstoque}
                disabled={erroEstoqueLoading || !erroEstoqueDesc.trim() || !produto?.CODPROD}
                className="px-6 py-2 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {erroEstoqueLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ENVIAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar / Toast Customizado */}
      <div 
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-in-out ${
          toastState.open ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
      >
        <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm ${
          toastState.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'
        }`}>
          {toastState.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toastState.msg}
          <button 
            type="button"
            onClick={() => setToastState(s => ({ ...s, open: false }))} 
            className="ml-2 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        @keyframes fadeInUp { 
          from { transform: translateY(20px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }
        .animate-fade-in-up { 
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
      `}</style>
    </div>
  );
}