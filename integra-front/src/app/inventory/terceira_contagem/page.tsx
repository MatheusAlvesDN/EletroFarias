'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
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
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Save,
  ArrowUpDown,
  Info
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';
import { usePersistedState } from '@/hooks/userPersistedState';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { parseLocationNumber } from '@/utils/location';

// --- Tipos ---
type InventoryItem = {
  id: string;
  codProd: number;
  count: number;
  inStock: number;
  inplantedDate: string | null;
  createdAt: string;
  descricao?: string | null;
  userEmail?: string | null;
  localizacao: string | null;
  recontagem?: boolean | null;

  reserved?: number | null;
  reservado?: number | null;
};

type ProductInfo = {
  localizacao: string | null;
  AD_localizacao: string | null;
  raw?: unknown;
};

const rowsPerPage = 10;
const PRIMAL_DATE = '1987-11-23T14:01:48.190Z';

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

function decodeJwtEmail(token: string | null): string | null {
  const jwtEmail = decodeJwt(token);
  return jwtEmail?.email ?? null;
}

type LocTab = 'A' | 'B' | 'C' | 'D' | 'E' | 'SEM';
function getLocTab(localizacao: string | null | undefined): LocTab {
  const loc = String(localizacao ?? '').trim().toUpperCase();
  const first = loc.charAt(0);
  if (first === 'A' || first === 'B' || first === 'C' || first === 'D' || first === 'E') {
    return first as LocTab;
  }
  return 'SEM';
}

type OrderBy = 'location' | 'numCounts';
const toStringSafe = (v: unknown): string => (v == null ? '' : String(v));

function normEmail(v: string | null | undefined) {
  return String(v ?? '').trim().toLowerCase();
}

function getItemKey(inv: Pick<InventoryItem, 'codProd' | 'localizacao'>) {
  return `${inv.codProd}__${String(inv.localizacao ?? '').trim().toUpperCase()}`;
}

const PageInner: React.FC = () => {
  const router = useRouter();
  const { token, ready, hasAccess } = useRequireAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [filterCodProd, setFilterCodProd] = usePersistedState<string>('inventory:terceira:filterCodProd', '');
  const [activeTab, setActiveTab] = usePersistedState<LocTab>('inventory:terceira:activeTab', 'A');
  const [page, setPage] = useState(0);

  // Toast Customizado
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  const [countsByCodProd, setCountsByCodProd] = useState<Record<string, number>>({});

  const [productInfoByCodProd, setProductInfoByCodProd] = useState<Record<string, ProductInfo | undefined>>({});
  const [productLoadingByCodProd, setProductLoadingByCodProd] = useState<Record<string, boolean>>({});
  const [productErrorByCodProd, setProductErrorByCodProd] = useState<Record<string, string | null>>({});

  const [orderBy, setOrderBy] = useState<OrderBy>('location');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});
  const [sentItemKeys, setSentItemKeys] = useState<Record<string, boolean>>({});

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [newCountById, setNewCountById] = useState<Record<string, string>>({});

  const [userEmail, setUserEmail] = useState<string | null>(null);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getinventoryList` : `/sync/getinventoryList`), [API_BASE]);
  const ADDNEWCOUNT_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/addNewCount` : `/sync/addNewCount`), [API_BASE]);
  const GETPRODUCT_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getProduct` : `/sync/getProduct`), [API_BASE]);

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  // ✅ mantém scroll do container ao atualizar estado (evita "voltar pro topo")
  const mainRef = useRef<HTMLDivElement | null>(null);

  // ✅ Guard "à prova de bala" contra refresh/reload causado por submit/enter/click-submit
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const onSubmitCapture = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;

      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();

      if (tag === 'textarea') return;

      if (tag === 'input') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onClickCapture = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const btn = el?.closest?.('button') as HTMLButtonElement | null;
      if (!btn) return;

      const typeAttr = (btn.getAttribute('type') || '').toLowerCase();
      const isSubmit = typeAttr === '' || typeAttr === 'submit';

      if (isSubmit) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('submit', onSubmitCapture, true);
    document.addEventListener('keydown', onKeyDownCapture, true);
    document.addEventListener('click', onClickCapture, true);

    return () => {
      document.removeEventListener('submit', onSubmitCapture, true);
      document.removeEventListener('keydown', onKeyDownCapture, true);
      document.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.replace('/');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('authToken');
    setUserEmail(decodeJwtEmail(t));
  }, []);

  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, open: false }));
    }, 4000);
  }, []);

  const ensureProductInfo = useCallback(
    async (codProd: number) => {
      const key = String(codProd);

      if (productInfoByCodProd[key]) return;
      if (productLoadingByCodProd[key]) return;

      setProductLoadingByCodProd((prev) => ({ ...prev, [key]: true }));
      setProductErrorByCodProd((prev) => ({ ...prev, [key]: null }));

      try {
        const url = `${GETPRODUCT_URL}?codProd=${encodeURIComponent(String(codProd))}`;

        const resp = await fetch(url, {
          method: 'GET',
          headers: getHeaders(),
          cache: 'no-store',
        });

        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha ao buscar produto (status ${resp.status})`);
        }

        const raw = (await resp.json()) as unknown;
        const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

        const localizacao = toStringSafe(rec.localizacao ?? rec.LOCALIZACAO ?? rec.loc ?? rec.LOC) || null;

        const AD_localizacao =
          toStringSafe(
            rec.AD_localizacao ??
              rec.AD_LOCALIZACAO ??
              rec.ad_localizacao ??
              rec.adLocalizacao ??
              rec['AD_LOCALIZACAO'],
          ) || null;

        setProductInfoByCodProd((prev) => ({
          ...prev,
          [key]: { localizacao, AD_localizacao, raw },
        }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao buscar produto';
        setProductErrorByCodProd((prev) => ({ ...prev, [key]: msg }));
      } finally {
        setProductLoadingByCodProd((prev) => ({ ...prev, [key]: false }));
      }
    },
    [GETPRODUCT_URL, getHeaders, productInfoByCodProd, productLoadingByCodProd],
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const resp = await fetch(LIST_URL, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao carregar inventário (status ${resp.status})`);
      }

      const data = (await resp.json()) as InventoryItem[] | null;
      const list = Array.isArray(data) ? data : [];

      const history: Record<string, InventoryItem[]> = {};
      for (const item of list) {
        const key = String(item.codProd);
        if (!history[key]) history[key] = [];
        history[key].push(item);
      }

      const codProdsWithRecount = new Set<string>();
      const counts: Record<string, number> = {};
      for (const [cod, rows] of Object.entries(history)) {
        counts[cod] = rows.length;
        if (rows.some((r) => !!r.recontagem)) codProdsWithRecount.add(cod);
      }
      setCountsByCodProd(counts);

      const currentUserEmail = decodeJwtEmail(token);
      const currentEmailNorm = normEmail(currentUserEmail);

      const alreadyCountedByUser = new Set<string>();
      if (currentEmailNorm) {
        for (const it of list) {
          if (normEmail(it.userEmail) === currentEmailNorm) {
            alreadyCountedByUser.add(getItemKey(it));
          }
        }
      }

      const divergent = list
        .slice()
        .sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        })
        .filter((item) => {
          const codKey = String(item.codProd);
          if (!codProdsWithRecount.has(codKey)) return false;

          if (alreadyCountedByUser.has(getItemKey(item))) return false;

          return item.count !== item.inStock && item.localizacao?.trim() !== 'Z-000' && item.inplantedDate === PRIMAL_DATE;
        });

      const uniqueMap = new Map<string, InventoryItem>();
      for (const item of divergent) {
        const key = getItemKey(item);
        if (!uniqueMap.has(key)) uniqueMap.set(key, item);
      }

      const finalList = Array.from(uniqueMap.values());

      setItems(finalList);
      setFiltered(finalList);

      const lastPage = Math.max(0, Math.ceil(finalList.length / rowsPerPage) - 1);
      setPage((p) => Math.min(p, lastPage));

      setExpandedId(null);
      setOrderBy('location');
      setOrderDirection('asc');

      setSentIds({});
      setSentItemKeys({});
      setSendingId(null);
      setNewCountById({});

      setActiveTab('A');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar inventário';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, getHeaders, token, setActiveTab, toast]);

  useEffect(() => {
    if (!ready || !hasAccess) return;
    if (token || API_TOKEN) fetchData();
  }, [API_TOKEN, fetchData, hasAccess, ready, token]);

  useEffect(() => {
    if (!ready || !hasAccess) return;

    const cod = filterCodProd.trim();

    const result = items.filter((item) => {
      if (getLocTab(item.localizacao) !== activeTab) return false;
      if (cod && String(item.codProd) !== cod) return false;
      return true;
    });

    setFiltered(result);

    const lastPage = Math.max(0, Math.ceil(result.length / rowsPerPage) - 1);
    setPage((p) => Math.min(p, lastPage));
  }, [activeTab, filterCodProd, hasAccess, items, ready]);

  const toggleSortBy = (field: OrderBy) => {
    if (orderBy === field) setOrderDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    else {
      setOrderBy(field);
      setOrderDirection('asc');
    }
  };

  const sorted = useMemo(() => {
    const arr = [...filtered];
    return arr.sort((a, b) => {
      let valA: number;
      let valB: number;

      if (orderBy === 'numCounts') {
        valA = countsByCodProd[String(a.codProd)] ?? 0;
        valB = countsByCodProd[String(b.codProd)] ?? 0;
      } else {
        valA = parseLocationNumber(a.localizacao ?? a.descricao ?? '');
        valB = parseLocationNumber(b.localizacao ?? b.descricao ?? '');
      }

      if (valA === valB && orderBy === 'location') {
        valA = a.codProd;
        valB = b.codProd;
      }

      const cmp = valA - valB;
      return orderDirection === 'asc' ? cmp : -cmp;
    });
  }, [filtered, orderBy, orderDirection, countsByCodProd]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const pageRows = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const tabCounts = useMemo(() => {
    const base: Record<LocTab, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, SEM: 0 };
    for (const it of items) base[getLocTab(it.localizacao)] += 1;
    return base;
  }, [items]);

  if (!ready || !hasAccess) return null;

  const toggleRow = (inv: InventoryItem) => {
    setExpandedId((prev) => {
      const next = prev === inv.id ? null : inv.id;
      if (next) void ensureProductInfo(inv.codProd);
      return next;
    });
  };

  const handleChangeNewCount =
    (id: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value ?? '';
      setNewCountById((prev) => ({ ...prev, [id]: value }));
    };

  const handleEnviarNovaContagem = async (inv: InventoryItem) => {
    const itemKey = getItemKey(inv);

    if (sentIds[inv.id] || sentItemKeys[itemKey]) {
      toast('Você já enviou uma nova contagem para este item (cód. produto + localização).', 'error');
      return;
    }

    const raw = newCountById[inv.id] ?? '';
    if (!raw.trim()) {
      setErro('Informe a nova contagem.');
      toast('Informe a nova contagem.', 'error');
      return;
    }

    const valor = Number(raw.replace(',', '.'));
    if (!Number.isFinite(valor)) {
      setErro('Contagem inválida.');
      toast('Contagem inválida.', 'error');
      return;
    }

    try {
      setErro(null);
      setSendingId(inv.id);

      const userEmailToken = decodeJwtEmail(token) ?? null;

      const body = {
        codProd: inv.codProd,
        contagem: valor,
        descricao: inv.descricao ?? '',
        localizacao: inv.localizacao ?? '',
        userEmail: userEmailToken,
      };

      const resp = await fetch(ADDNEWCOUNT_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao enviar nova contagem (status ${resp.status})`);
      }

      toast('Nova contagem enviada com sucesso!', 'success');

      setSentIds((prev) => ({ ...prev, [inv.id]: true }));
      setSentItemKeys((prev) => ({ ...prev, [itemKey]: true }));

      setNewCountById((prev) => ({ ...prev, [inv.id]: '' }));
      setExpandedId((prev) => (prev === inv.id ? null : prev));

      // ✅ preserva scroll do container (não “volta pro topo”)
      const prevScrollTop = mainRef.current?.scrollTop ?? 0;

      // remove item da lista sem resetar paginação
      setItems((prev) => prev.filter((x) => getItemKey(x) !== itemKey));

      requestAnimationFrame(() => {
        if (mainRef.current) mainRef.current.scrollTop = prevScrollTop;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar nova contagem.';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-y-auto overflow-x-hidden"
      ref={mainRef}
    >
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
                  Recontagem de Inventário
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-xl font-bold text-emerald-900">
                    Produtos com contagem divergente <span className="text-emerald-700 font-medium text-sm">(com recontagem)</span>
                  </h2>
                  <div className="group relative flex items-center ml-2">
                    <Info className="w-5 h-5 text-emerald-400 cursor-pointer hover:text-emerald-600 transition-colors" />
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-72 p-3 bg-slate-800 text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                      Nesta tela, itens já contados por você não aparecem. E você não consegue enviar 2 contagens para o mesmo item (cód. produto + localização).
                      <div className="absolute top-1/2 right-full -translate-y-1/2 border-8 border-transparent border-r-slate-800"></div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-500 font-medium ml-8">
                  Clique em <b className="text-slate-700">Detalhes</b> para ver a <b className="text-slate-700">localização</b> do produto e enviar a <b className="text-slate-700">nova contagem</b>.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4 text-emerald-600" />}
                Atualizar Lista
              </button>
            </div>

            {/* Abas de Localização (Tabs) */}
            <div className="flex overflow-x-auto border-b border-slate-200 mb-4 scrollbar-thin scrollbar-thumb-slate-300 pb-1">
              {(['A', 'B', 'C', 'D', 'E', 'SEM'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as LocTab)}
                  className={`px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition-all mr-1 ${
                    activeTab === tab 
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'SEM' ? 'SEM LOC.' : `Setor ${tab}`} 
                  <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${
                    activeTab === tab ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tabCounts[tab as LocTab]}
                  </span>
                </button>
              ))}
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por código exato do produto..."
                value={filterCodProd}
                onChange={(e) => setFilterCodProd(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              />
            </div>

            {erro && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {erro}
              </div>
            )}
          </div>

          {/* Tabela */}
          <div className="p-0 bg-slate-50/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                <span className="text-sm font-bold">Carregando inventário...</span>
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-b border-slate-100">
                <Search className="w-12 h-12 text-slate-300 mb-3" />
                <span className="text-sm font-medium">Nenhuma contagem divergente encontrada para os critérios atuais.</span>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-emerald-50/80 border-b border-emerald-100">
                    <tr>
                      <th 
                        className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-emerald-100/50 transition-colors"
                        onClick={() => toggleSortBy('location')}
                      >
                        <div className="flex items-center gap-1">
                          Localização
                          {orderBy === 'location' && <ArrowUpDown className="w-3 h-3" />}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Cód. Produto
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th 
                        className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-emerald-100/50 transition-colors"
                        onClick={() => toggleSortBy('numCounts')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Nº Contagens
                          {orderBy === 'numCounts' && <ArrowUpDown className="w-3 h-3" />}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap w-32">
                        Detalhes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pageRows.map((inv) => {
                      const alreadySent = !!sentIds[inv.id] || !!sentItemKeys[getItemKey(inv)];
                      const isExpanded = expandedId === inv.id;

                      const codKey = String(inv.codProd);
                      const prodInfo = productInfoByCodProd[codKey];
                      const prodLoading = !!productLoadingByCodProd[codKey];
                      const prodErr = productErrorByCodProd[codKey];

                      return (
                        <React.Fragment key={inv.id}>
                          {/* Linha Principal */}
                          <tr className={`transition-colors ${alreadySent ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}`}>
                            <td className="px-4 py-3 text-sm font-mono font-bold text-slate-700 whitespace-nowrap">
                              {inv.localizacao ?? '-'}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-700 whitespace-nowrap">
                              {inv.codProd}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[200px]" title={inv.descricao ?? ''}>
                              {inv.descricao ?? '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full text-xs border border-slate-200">
                                {countsByCodProd[String(inv.codProd)] ?? 0}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => toggleRow(inv)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                                  isExpanded 
                                    ? 'bg-slate-100 border-slate-300 text-slate-700' 
                                    : 'bg-white border-emerald-600 text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                {isExpanded ? (
                                  <>Fechar <ChevronUp className="w-3.5 h-3.5" /></>
                                ) : (
                                  <>Detalhes <ChevronDown className="w-3.5 h-3.5" /></>
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Linha Expandida (Detalhes do Produto e Recontagem) */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={5} className="p-0 bg-emerald-50/30 border-b border-slate-200 shadow-inner">
                                <div className="p-4 sm:p-6 animate-fade-in-up">
                                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5 mb-4">
                                    <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Informações do produto</h4>
                                    
                                    {prodLoading ? (
                                      <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Carregando localizações...
                                      </div>
                                    ) : prodErr ? (
                                      <div className="text-rose-600 font-medium text-sm flex items-center gap-1.5">
                                        <AlertCircle className="w-4 h-4" /> {prodErr}
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Localização 1</span>
                                          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-medium text-slate-700">
                                            {prodInfo?.localizacao ?? '-'}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Localização 2</span>
                                          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-medium text-slate-700">
                                            {prodInfo?.AD_localizacao ?? '-'}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-col sm:flex-row items-center gap-4 justify-end">
                                    <span className="text-sm font-bold text-emerald-900 hidden sm:inline">Nova Contagem:</span>
                                    <div className="flex w-full sm:w-auto gap-2">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Qtd..."
                                        autoFocus
                                        value={newCountById[inv.id] ?? ''}
                                        onChange={handleChangeNewCount(inv.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            void handleEnviarNovaContagem(inv);
                                          }
                                        }}
                                        disabled={alreadySent || sendingId === inv.id}
                                        className="flex-1 sm:w-32 px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm disabled:opacity-50 disabled:bg-slate-100 disabled:border-slate-300"
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          void handleEnviarNovaContagem(inv);
                                        }}
                                        disabled={alreadySent || sendingId === inv.id}
                                        className={`px-4 py-2 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 min-w-[110px] ${
                                          alreadySent ? 'bg-slate-500' : 'bg-emerald-600 hover:bg-emerald-700'
                                        }`}
                                      >
                                        {sendingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : alreadySent ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                        {alreadySent ? 'Enviado' : 'Enviar'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginação */}
            {sorted.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
                <span className="text-xs sm:text-sm text-slate-500 font-medium">
                  Página {page + 1} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs sm:text-sm font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs sm:text-sm font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

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
        .animate-fade-in-up { s; 
        }
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forward
      `}</style>
    </div>
  );
};

export default dynamic(() => Promise.resolve(PageInner), { ssr: false });