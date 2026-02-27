'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Server,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  RotateCw,
  AlertTriangle,
  Check,
  Settings2,
  Package,
  MapPin,
  Save,
  Barcode,
  ChevronDown,
  ChevronUp,
  Boxes,
  Plus,
  Send,
  ClipboardCheck,
  CheckSquare
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';
import { useUpdateLocStore } from '@/stores/useUpdateLocStore';

// --- Tipos ---
type ErroEstoque = {
  id: string;
  codProd: number;
  descricao: string;
  createdAt: string;
  userCreate: string;
  resolvido: boolean;
  userResolve?: string | null;
  resolvedAt?: string | null;
};

type EstoqueItem = {
  CODLOCAL: number | string;
  ESTOQUE: number | string | null;
  RESERVADO: number | string | null;
  DISPONIVEL: number | string | null;
  CODEMP?: number | string | null;
  LocalFinanceiro_DESCRLOCAL?: string | null;
};

type Produto = {
  CODPROD?: string | number | null;
  DESCRPROD?: string | null;
  REFFORN?: string | null; // <--- Campo Adicionado
  LOCALIZACAO?: string | null;
  AD_LOCALIZACAO?: string | null;
  AD_QTDMAX?: number | null;
  estoque?: EstoqueItem[];
};

// --- Utilitários ---
function formatDateTimeBR(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const onlyNumber = (v: string) => v.replace(/[^\d]/g, '');

const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));
const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

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

// --- Componente de Cartão de Estatística ---
const StatCard = ({ label, value, colorClass, icon, bgIconClass, textIconClass }: { label: string; value: number; colorClass: string; icon: React.ReactNode; bgIconClass: string; textIconClass: string; }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${bgIconClass} ${textIconClass}`}>
      {icon}
    </div>
    <div>
      <div className={`text-2xl font-black ${colorClass}`}>
        {value}
      </div>
      <div className="text-sm font-bold text-slate-500">
        {label}
      </div>
    </div>
  </div>
);


// ============================================================================
// MODAL DE AJUSTE (AjusteDialog)
// ============================================================================
function AjusteDialog({
  open,
  onClose,
  codProd,
  erroId,
  descricao,
  apiBase,
  apiTokenEnv,
  onSuccess,
  onFinalizarErro,
}: {
  open: boolean;
  onClose: () => void;
  codProd: number | null;
  erroId?: string;
  descricao?: string;
  apiBase: string;
  apiTokenEnv: string;
  onSuccess: () => Promise<void> | void;
  onFinalizarErro: (id: string, motivo: string) => Promise<void>;
}) {
  const MAX_LOC = 15;
  const MAX_LOC2 = 30;

  const [token, setToken] = useState<string | null>(null);

  const [produto, setProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Toast Interno do Modal
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  // editar localização
  const [localizacao, setLocalizacao] = useState('');
  const [localizacao2, setLocalizacao2] = useState('');
  const [qtdMax, setQtdMax] = useState('');

  // contagem
  const [contagem, setContagem] = useState('');
  const [sending, setSending] = useState(false);

  // finalização
  const [motivoResolucao, setMotivoResolucao] = useState('');
  const [finalizingLocal, setFinalizingLocal] = useState(false);

  // códigos de barras
  const [codigoBarrasList, setCodigoBarrasList] = useState<string[]>([]);
  const [codigoBarrasLoading, setCodigoBarrasLoading] = useState(false);
  const [codigoBarrasError, setCodigoBarrasError] = useState<string | null>(null);
  const [barrasExpanded, setBarrasExpanded] = useState(false);

  // modal add barras
  const [addBarrasOpen, setAddBarrasOpen] = useState(false);
  const [codBarrasInput, setCodBarrasInput] = useState('');
  const [addBarrasLoading, setAddBarrasLoading] = useState(false);
  const [addBarrasErr, setAddBarrasErr] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    setToken(t);
  }, []);

  const { sendUpdateLocation, sendUpdateLocation2, isSaving, error: storeError } = useUpdateLocStore();

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (apiTokenEnv) headers.Authorization = `Bearer ${apiTokenEnv}`;
    return headers;
  }, [token, apiTokenEnv]);

  const GET_PRODUCT_URL = useMemo(() => (apiBase ? `${apiBase}/sync/getProduct` : `/sync/getProduct`), [apiBase]);
  const GET_COD_BARRAS_URL = useMemo(() => (apiBase ? `${apiBase}/sync/getCodBarras` : `/sync/getCodBarras`), [apiBase]);
  const CRIAR_COD_BARRAS_URL = useMemo(() => (apiBase ? `${apiBase}/sync/criarCodigoBarras` : `/sync/criarCodigoBarras`), [apiBase]);
  const POST_CORRECAO_URL = useMemo(() => (apiBase ? `${apiBase}/sync/correcaoErroEstoque` : `/sync/correcaoErroEstoque`), [apiBase]);

  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, open: false }));
    }, 4000);
  }, []);

  const toNum = (v: unknown) => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  const numberFormatter = useMemo(() => new Intl.NumberFormat('pt-BR'), []);

  const totais = useMemo(() => {
    const itens = produto?.estoque ?? [];
    return itens.reduce(
      (acc, it) => {
        acc.estoque += toNum(it.ESTOQUE);
        acc.reservado += toNum(it.RESERVADO);
        acc.disponivel += toNum(it.DISPONIVEL);
        return acc;
      },
      { estoque: 0, reservado: 0, disponivel: 0 },
    );
  }, [produto]);

  const normalizeCodBarras = (raw: unknown): string[] => {
    const uniq = (arr: string[]) => Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
    if (raw == null) return [];

    if (typeof raw === 'string' || typeof raw === 'number') {
      const s = String(raw).trim();
      if (s.includes(',')) return uniq(s.split(',').map((x) => x.trim()));
      return s ? [s] : [];
    }

    if (Array.isArray(raw)) return uniq(raw.map((x) => String(x ?? '').trim()));

    if (typeof raw === 'object') {
      const r = raw as Record<string, unknown>;
      const direct = r.codBarras ?? r.CODBARRAS ?? r.codigoBarras ?? r.CODIGOBARRAS ?? r.barcode ?? r.BARCODE;

      if (direct != null) {
        const s = String(direct).trim();
        if (s.includes(',')) return uniq(s.split(',').map((x) => x.trim()));
        return s ? [s] : [];
      }

      const data = r.data ?? r.DATA ?? r.items ?? r.ITEMS;
      if (Array.isArray(data)) return uniq(data.map((x) => String(x ?? '').trim()));
    }

    return [];
  };

  const fetchProduto = useCallback(async () => {
    if (!codProd) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      setErro(null);
      setLoading(true);
      setProduto(null);

      const url = `${GET_PRODUCT_URL}?id=${encodeURIComponent(String(codProd))}`;

      const resp = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
        signal: ac.signal,
      });

      if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        throw new Error(msg || `Falha na busca (status ${resp.status})`);
      }

      const data = (await resp.json()) as Produto | null;
      if (!data || (!data.CODPROD && !data.DESCRPROD)) {
        setErro('Produto não encontrado.');
        setProduto(null);
        return;
      }

      setProduto(data);
      setLocalizacao(String(data.LOCALIZACAO ?? '').slice(0, MAX_LOC));
      setLocalizacao2(String(data.AD_LOCALIZACAO ?? '').slice(0, MAX_LOC2));
      setQtdMax(String(data.AD_QTDMAX ?? ''));
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setErro(e?.message || 'Erro ao buscar produto.');
    } finally {
      setLoading(false);
    }
  }, [GET_PRODUCT_URL, codProd, getHeaders]);

  const fetchCodBarras = useCallback(async () => {
    if (!codProd) return;

    setCodigoBarrasLoading(true);
    setCodigoBarrasError(null);

    try {
      const url = `${GET_COD_BARRAS_URL}?codProd=${encodeURIComponent(String(codProd))}`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        throw new Error(msg || `Falha ao buscar código de barras (status ${resp.status})`);
      }

      const raw = (await resp.json()) as unknown;
      const list = normalizeCodBarras(raw);
      setCodigoBarrasList(list);
    } catch (e: any) {
      setCodigoBarrasList([]);
      setCodigoBarrasError(e?.message || 'Erro ao buscar código de barras');
    } finally {
      setCodigoBarrasLoading(false);
    }
  }, [GET_COD_BARRAS_URL, codProd, getHeaders]);

  useEffect(() => {
    if (!open) return;

    setContagem('');
    setMotivoResolucao('');
    setBarrasExpanded(false);
    setCodBarrasInput('');
    setAddBarrasErr(null);

    void fetchProduto();
    void fetchCodBarras();

    return () => abortRef.current?.abort();
  }, [open, fetchProduto, fetchCodBarras]);

  const handleSalvarLocalizacoes = async () => {
    if (!produto?.CODPROD) {
      toast('Produto inválido.', 'error');
      return;
    }

    const id = Number(produto.CODPROD);
    if (!Number.isFinite(id)) {
      toast('CODPROD inválido.', 'error');
      return;
    }

    const loc1 = localizacao.slice(0, MAX_LOC);
    const loc2 = localizacao2.slice(0, MAX_LOC2);

    try {
      setErro(null);
      const ok1 = await sendUpdateLocation(id, loc1);
      const ok2 = await sendUpdateLocation2(id, loc2);

      if (!ok1 || !ok2) {
        toast(storeError || 'Erro ao salvar localizações.', 'error');
        return;
      }

      toast('Localizações atualizadas!', 'success');
      setProduto((p) => (p ? { ...p, LOCALIZACAO: loc1, AD_LOCALIZACAO: loc2 } : p));
    } catch (e: any) {
      toast(e?.message || 'Erro ao salvar localizações.', 'error');
    }
  };

  const openAddBarras = () => {
    setAddBarrasErr(null);
    setCodBarrasInput('');
    setAddBarrasOpen(true);
  };

  const closeAddBarras = () => {
    if (addBarrasLoading) return;
    setAddBarrasOpen(false);
    setAddBarrasErr(null);
  };

  const handleSalvarNovoCodBarras = async () => {
    if (!codProd) return;
    if (!codBarrasInput) {
      setAddBarrasErr('Informe o código.');
      return;
    }

    setAddBarrasLoading(true);
    setAddBarrasErr(null);

    try {
      const payload = {
        codProduto: Number(codProd),
        codBarras: Number(codBarrasInput.replace(/[^\d]/g, ''))
      };

      const resp = await fetch(CRIAR_COD_BARRAS_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Erro ao salvar código de barras.');
      }

      await fetchCodBarras();
      toast('Código de barras adicionado.', 'success');
      closeAddBarras();
    } catch (e: any) {
      setAddBarrasErr(e.message || 'Falha ao adicionar.');
    } finally {
      setAddBarrasLoading(false);
    }
  };

  const handleEnviarContagem = async () => {
    if (!codProd) return;

    const numeric = onlyNumber(contagem).trim();
    if (!numeric) {
      toast('Informe uma contagem numérica.', 'error');
      return;
    }

    try {
      setErro(null);
      setSending(true);

      const payload = {
        codProd: Number(codProd),
        valor: Number(numeric),
      };

      const resp = await fetch(POST_CORRECAO_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        throw new Error(msg || `Falha ao enviar (status ${resp.status})`);
      }

      toast('Contagem enviada e erro solucionado!', 'success');
      await onSuccess();
      onClose();
    } catch (e: any) {
      toast(e?.message || 'Erro ao encaminhar contagem.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleFinalizarLocal = async () => {
    if (!erroId) return;
    if (!motivoResolucao.trim()) {
      toast('É obrigatório informar o motivo para finalizar.', 'error');
      return;
    }
    setFinalizingLocal(true);
    try {
      await onFinalizarErro(erroId, motivoResolucao);
      onClose();
    } catch (e: any) {
      toast(e?.message || 'Erro ao finalizar.', 'error');
    } finally {
      setFinalizingLocal(false);
    }
  };

  const BARRAS_PREVIEW_QTD = 2;
  const barrasToShow = barrasExpanded ? codigoBarrasList : codigoBarrasList.slice(0, BARRAS_PREVIEW_QTD);
  const hasMoreBarras = codigoBarrasList.length > BARRAS_PREVIEW_QTD;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-full flex flex-col overflow-hidden">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-emerald-600" />
            Ajuste / Conferência
          </h2>
          <div className="flex items-center gap-3">
            <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200 text-xs">
              Prod: {codProd}
            </span>
            <button
              onClick={onClose}
              disabled={sending || finalizingLocal}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Modal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/50">
          
          {descricao && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
              <div>
                <span className="font-bold">Motivo do Erro Reportado:</span> {descricao}
              </div>
            </div>
          )}

          {erro && (
            <div className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {erro}
            </div>
          )}

          <div className="flex justify-end mb-4">
            <button
              onClick={fetchProduto}
              disabled={loading || !codProd}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4 text-emerald-600" />}
              Recarregar Dados
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
              <Loader2 className="w-10 h-10 animate-spin mb-3" />
              <span className="text-sm font-bold">Buscando produto...</span>
            </div>
          ) : produto ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in-up">
              
              {/* Esquerda: Info e Barras */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col text-center">
                  <div className="w-full h-48 bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-center mb-4">
                    <img
                      src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${produto.CODPROD}.dbimage`}
                      alt={produto.DESCRPROD ?? 'Produto'}
                      className="w-full h-full object-contain rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2JkNWUxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiPjwvcmVjdD48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSI+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSI+PC9wb2x5bGluZT48L3N2Zz4=';
                        (e.target as HTMLImageElement).className = 'w-16 h-16 opacity-40';
                      }}
                    />
                  </div>
                  
                  <h3 className="font-bold text-lg text-slate-800 leading-tight mb-1">{produto.DESCRPROD}</h3>
                  {produto.REFFORN && (
                    <p className="text-sm font-medium text-slate-500">Ref: <span className="text-slate-700">{produto.REFFORN}</span></p>
                  )}

                  <hr className="my-4 border-slate-100" />
                  
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Códigos de Barras</span>
                      {hasMoreBarras && (
                        <button
                          onClick={() => setBarrasExpanded((v) => !v)}
                          disabled={codigoBarrasLoading}
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-0.5"
                        >
                          {barrasExpanded ? <>Ocultar <ChevronUp className="w-3 h-3" /></> : <>Ver todos <ChevronDown className="w-3 h-3" /></>}
                        </button>
                      )}
                    </div>

                    {codigoBarrasLoading ? (
                      <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-medium py-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                      </div>
                    ) : codigoBarrasList.length === 0 ? (
                      <div className="text-slate-400 text-xs italic pb-2">Nenhum código cadastrado.</div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                        {barrasToShow.map((b, idx) => (
                          <span key={`${b}-${idx}`} className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-mono text-slate-700">
                            {b}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto pt-2">
                      <button
                        onClick={openAddBarras}
                        className="w-full px-4 py-2 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Cód. Barras
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direita: Ações */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Editar Localizações */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-emerald-800 border-b border-slate-100 pb-2">
                    <MapPin className="w-5 h-5" />
                    <h3 className="font-bold text-base">Localização do Produto</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Localização 1</label>
                      <input
                        type="text"
                        value={localizacao}
                        onChange={(e) => setLocalizacao(e.target.value.slice(0, MAX_LOC))}
                        maxLength={MAX_LOC}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Localização 2</label>
                      <input
                        type="text"
                        value={localizacao2}
                        onChange={(e) => setLocalizacao2(e.target.value.slice(0, MAX_LOC2))}
                        maxLength={MAX_LOC2}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={handleSalvarLocalizacoes}
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar Locais
                    </button>
                  </div>
                </div>

                {/* Tabela de Estoque */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-sm text-slate-800">Estoque por local</h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-5 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Local</th>
                          <th className="px-5 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estoque</th>
                          <th className="px-5 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Disponível</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {produto.estoque?.map((it, idx) => (
                          <tr key={`${it.CODLOCAL}-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-2.5 text-sm font-bold text-slate-700">{it.LocalFinanceiro_DESCRLOCAL ?? it.CODLOCAL}</td>
                            <td className="px-5 py-2.5 text-sm text-right tabular-nums font-medium text-slate-600">{numberFormatter.format(toNum(it.ESTOQUE))}</td>
                            <td className="px-5 py-2.5 text-sm text-right tabular-nums font-bold text-emerald-700">{numberFormatter.format(toNum(it.DISPONIVEL))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ações de Correção */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Enviar Nova Contagem */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-emerald-900 mb-4 flex items-center gap-2">
                      <Send className="w-4 h-4 text-emerald-600" /> Enviar Nova Contagem
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Qtd Real..."
                        value={contagem}
                        onChange={(e) => setContagem(onlyNumber(e.target.value))}
                        className="w-full px-4 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                      />
                      <button
                        onClick={handleEnviarContagem}
                        disabled={sending || !contagem}
                        className="w-full sm:w-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ENVIAR'}
                      </button>
                    </div>
                  </div>

                  {/* Finalizar Erro */}
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 shadow-sm flex flex-col">
                    <h4 className="text-sm font-bold text-rose-900 mb-2 flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-rose-600" /> Finalizar Divergência
                    </h4>
                    <p className="text-[11px] text-rose-700 mb-3 font-medium">Descreva o que foi feito para corrigir este problema.</p>
                    <textarea
                      placeholder="Motivo / Solução aplicada..."
                      value={motivoResolucao}
                      onChange={(e) => setMotivoResolucao(e.target.value)}
                      className="w-full flex-1 min-h-[60px] p-3 bg-white border border-rose-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-shadow resize-y mb-3"
                    />
                    <button
                      onClick={handleFinalizarLocal}
                      disabled={finalizingLocal || !motivoResolucao.trim()}
                      className="w-full px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      {finalizingLocal ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      FINALIZAR
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <Search className="w-12 h-12 text-slate-300 mb-3" />
              <span className="text-sm font-medium">Nenhum produto selecionado.</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal Interno: Adicionar Código de Barras */}
      {addBarrasOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full">
                <Barcode className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-emerald-900 text-lg">Novo Cód. Barras</h3>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm text-slate-700">
                Produto: <span className="font-bold font-mono">{String(produto?.CODPROD ?? '-')}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 block">Código de barras</label>
                <input
                  type="text"
                  value={codBarrasInput}
                  onChange={(e) => setCodBarrasInput(onlyNumber(e.target.value))}
                  autoFocus
                  placeholder="Ex: 7891234567890"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                />
              </div>

              {addBarrasErr && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {addBarrasErr}
                </div>
              )}
            </div>
            
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={closeAddBarras}
                disabled={addBarrasLoading}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarNovoCodBarras}
                disabled={addBarrasLoading || !codBarrasInput.trim()}
                className="px-6 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {addBarrasLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Interno do Modal */}
      <div 
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-[140] transition-all duration-300 ease-in-out ${
          toastState.open ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
      >
        <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm ${
          toastState.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'
        }`}>
          {toastState.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toastState.msg}
          <button 
            onClick={() => setToastState(s => ({ ...s, open: false }))} 
            className="ml-2 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================
export default function ErroEstoquePage() {
  const router = useRouter();
  const [data, setData] = useState<ErroEstoque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'TODOS' | 'PENDENTES' | 'RESOLVIDOS'>('PENDENTES');

  const [openAjuste, setOpenAjuste] = useState(false);
  const [selected, setSelected] = useState<ErroEstoque | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal Confirmação Rápida de Finalização
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [itemToFinalize, setItemToFinalize] = useState<ErroEstoque | null>(null);
  const [finalizeReason, setFinalizeReason] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Toast / Snackbar
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success',
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);
    setUserEmail(decodeJwtEmail(t));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.replace('/');
  };

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const GET_ALL_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getAllErroEstoque` : `/sync/getAllErroEstoque`), [API_BASE]);
  const FINALIZAR_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/finalizarErroEstoque` : `/sync/finalizarErroEstoque`), [API_BASE]);

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, open: false }));
    }, 4000);
  }, []);

  const fetchErros = useCallback(async () => {
    if (!token && !API_TOKEN) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      setError(null);
      setIsLoading(true);

      const res = await fetch(GET_ALL_URL, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
        signal: ac.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Erro HTTP ${res.status}`);
      }

      const json = (await res.json()) as ErroEstoque[];
      if (!mountedRef.current) return;

      const sorted = [...(json ?? [])].sort((a, b) => {
        if (a.resolvido !== b.resolvido) return a.resolvido ? 1 : -1;
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return db - da;
      });

      setData(sorted);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setError(e?.message || 'Falha ao buscar erros de estoque.');
    } finally {
      if (!mountedRef.current) return;
      setIsLoading(false);
    }
  }, [GET_ALL_URL, getHeaders, token, API_TOKEN]);

  useEffect(() => {
    mountedRef.current = true;
    fetchErros();

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [fetchErros]);

  const executeFinalizacao = async (id: string, descricao: string) => {
    const res = await fetch(FINALIZAR_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ id, descricao }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || 'Erro ao finalizar');
    }
  };

  const handleOpenFinalizeModal = (row: ErroEstoque) => {
    setItemToFinalize(row);
    setFinalizeReason('');
    setConfirmFinalizeOpen(true);
  };

  const handleConfirmFinalize = async () => {
    if (!itemToFinalize || !finalizeReason.trim()) return;
    setIsFinalizing(true);
    try {
      await executeFinalizacao(itemToFinalize.id, finalizeReason);
      toast('Erro finalizado com sucesso.', 'success');
      setConfirmFinalizeOpen(false);
      setItemToFinalize(null);
      await fetchErros();
    } catch (e: any) {
      toast(e.message || 'Falha ao finalizar.', 'error');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleFinalizarFromDetalhes = async (id: string, motivo: string) => {
    try {
       await executeFinalizacao(id, motivo);
       toast('Erro finalizado com sucesso.', 'success');
       await fetchErros();
    } catch (e: any) {
       toast(e.message || 'Falha ao finalizar.', 'error');
       throw e;
    }
  };

  const counts = useMemo(() => {
    const total = data.length;
    const pend = data.filter((x) => !x.resolvido).length;
    const res = total - pend;
    return { total, pend, res };
  }, [data]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.filter((x) => {
      if (status === 'PENDENTES' && x.resolvido) return false;
      if (status === 'RESOLVIDOS' && !x.resolvido) return false;
      if (!needle) return true;

      const hay = [x.id, String(x.codProd ?? ''), x.descricao ?? '', x.userCreate ?? '', x.userResolve ?? '']
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [data, q, status]);

  const openAjusteFor = (row: ErroEstoque) => {
    setSelected(row);
    setOpenAjuste(true);
  };

  const closeAjuste = () => {
    setOpenAjuste(false);
    setSelected(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
      {/* Botão flutuante sidebar */}
      <button
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
                  Erros de Estoque Reportados
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
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-8 animate-fade-in-up">
        
        {/* Cabecalho e Estatísticas */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl md:text-3xl font-black text-slate-800">Painel de Inconsistências</h2>
          <button
            onClick={fetchErros}
            disabled={isLoading}
            className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
            Atualizar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard label="Total de Registros" value={counts.total} colorClass="text-blue-600" bgIconClass="bg-blue-100" textIconClass="text-blue-600" icon={<Boxes className="w-6 h-6" />} />
          <StatCard label="Pendentes" value={counts.pend} colorClass="text-amber-500" bgIconClass="bg-amber-100" textIconClass="text-amber-500" icon={<AlertCircle className="w-6 h-6" />} />
          <StatCard label="Resolvidos" value={counts.res} colorClass="text-emerald-600" bgIconClass="bg-emerald-100" textIconClass="text-emerald-600" icon={<CheckCircle2 className="w-6 h-6" />} />
        </div>

        {/* Tabela de Erros */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Filtros */}
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative w-full lg:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código, descrição ou usuário..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              />
            </div>

            <div className="flex bg-slate-200/60 p-1 rounded-lg border border-slate-200 w-full lg:w-auto">
              <button
                onClick={() => setStatus('PENDENTES')}
                className={`flex-1 px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${
                  status === 'PENDENTES' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setStatus('RESOLVIDOS')}
                className={`flex-1 px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${
                  status === 'RESOLVIDOS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                Resolvidos
              </button>
              <button
                onClick={() => setStatus('TODOS')}
                className={`flex-1 px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${
                  status === 'TODOS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                Todos
              </button>
            </div>
          </div>

          {error && (
            <div className="m-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Tabela Principal */}
          <div className="p-0 bg-white">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                <span className="text-sm font-bold">Carregando erros de estoque...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <Search className="w-12 h-12 text-slate-300 mb-3" />
                <span className="text-sm font-medium">Nenhum registro encontrado.</span>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-emerald-50/80 border-b border-emerald-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap w-28">Status</th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Cód. Prod</th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">Descrição</th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Criado em</th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filtered.map((row) => (
                      <tr key={row.id} className={`transition-colors ${row.resolvido ? 'bg-slate-50/50 opacity-75' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-3">
                          {row.resolvido ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                              <CheckCircle2 className="w-3 h-3" /> Resolvido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
                              <AlertCircle className="w-3 h-3" /> Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-800 whitespace-nowrap">{safeStr(row.codProd)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 max-w-sm" title={safeStr(row.descricao)}>
                          <div className="font-medium text-slate-900 mb-0.5 line-clamp-2">{safeStr(row.descricao)}</div>
                          <div className="text-[10px] text-slate-500 font-mono flex gap-3">
                            <span title="Reportado por">🗣 {safeStr(row.userCreate)}</span>
                            {row.resolvido && <span title="Resolvido por">✅ {safeStr(row.userResolve)} ({formatDateTimeBR(row.resolvedAt)})</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{formatDateTimeBR(row.createdAt)}</td>
                        <td className="px-4 py-3">
                          {!row.resolvido ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openAjusteFor(row)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                              >
                                <Settings2 className="w-3 h-3" /> Verificar
                              </button>
                              <button
                                onClick={() => handleOpenFinalizeModal(row)}
                                disabled={finalizandoId === row.id}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-rose-500 hover:bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
                              >
                                {finalizandoId === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardCheck className="w-3 h-3" />}
                                Finalizar
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium italic">Concluído</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Ajuste Modal Completo (Herdado e estilizado) */}
      <AjusteDialog
        open={openAjuste}
        onClose={closeAjuste}
        codProd={selected?.codProd ?? null}
        erroId={selected?.id}
        descricao={selected?.descricao}
        apiBase={API_BASE}
        apiTokenEnv={API_TOKEN}
        onSuccess={async () => {
          toast('Contagem enviada ao Sankhya com sucesso.', 'success');
          await fetchErros();
        }}
        onFinalizarErro={handleFinalizarFromDetalhes}
      />

      {/* Modal Confirmação Finalização Rápida */}
      {confirmFinalizeOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-emerald-900 text-lg">Finalizar Erro</h3>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="text-sm text-slate-600">
                Você está finalizando a divergência do produto <span className="font-mono font-bold text-slate-800">{itemToFinalize?.codProd}</span>.
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 block">Motivo / Solução (Obrigatório)</label>
                <textarea
                  autoFocus
                  value={finalizeReason}
                  onChange={(e) => setFinalizeReason(e.target.value)}
                  placeholder="Ex: Estoque ajustado manualmente; Produto encontrado..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow min-h-[100px] resize-y"
                />
              </div>
            </div>
            
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmFinalizeOpen(false)}
                disabled={isFinalizing}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmFinalize}
                disabled={isFinalizing || !finalizeReason.trim()}
                className="px-6 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isFinalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar / Toast Customizado Principal */}
      <div 
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[150] transition-all duration-300 ease-in-out ${
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