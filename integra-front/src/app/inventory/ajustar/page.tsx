'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
  ArrowUpDown,
  Settings2,
  Filter,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';
import { usePersistedState } from '@/hooks/userPersistedState';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { parseLocationNumber } from '@/utils/location';

// Mesmo shape do backend (prisma.inventory)
type InventoryItem = {
  id: string;
  codProd: number;
  count: number;
  inStock: number;
  inplantedDate: string | null;
  createdAt: string;
  descricao?: string | null;
  userEmail?: string | null;

  localizacao?: string | null;

  reserved?: number | null;
  reservado?: number | null;
  recontagem?: boolean | null;
};

type OrderBy = 'location' | 'codProd' | 'descricao' | 'count' | 'inStock' | 'diff';

const RESET_DATE = '1981-11-23T14:01:48.190Z';
const PRIMAL_DATE = '1987-11-23T14:01:48.190Z';

type LocTab = 'A' | 'B' | 'C' | 'D' | 'E' | 'SEM';

function getLocTab(localizacao?: string | null): LocTab {
  const loc = String(localizacao ?? '').trim().toUpperCase();
  const first = loc.charAt(0);
  if (first === 'A' || first === 'B' || first === 'C' || first === 'D' || first === 'E') {
    return first as LocTab;
  }
  return 'SEM';
}

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
  return jwtEmail?.email ?? null;
}

export default function Page() {
  const router = useRouter();
  const { token, ready, hasAccess } = useRequireAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [filterCodProd, setFilterCodProd] = usePersistedState<string>('inventory:contagens:filterCodProd', '');
  const [filterUserEmail, setFilterUserEmail] = usePersistedState<string>('inventory:contagens:filterUserEmail', '');
  const [showOnlyPendentes, setShowOnlyPendentes] = usePersistedState<boolean>('inventory:contagens:showOnlyPendentes', false);
  const [showOnlyRecontagens, setShowOnlyRecontagens] = usePersistedState<boolean>('inventory:contagens:showOnlyRecontagens', false);

  const [activeTab, setActiveTab] = usePersistedState<LocTab>('inventory:contagens:activeTab', 'A');

  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  const [orderBy, setOrderBy] = useState<OrderBy>('codProd');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');
  const [hasUserSorted, setHasUserSorted] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyByCodProd, setHistoryByCodProd] = useState<Record<string, InventoryItem[]>>({});

  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('authToken');
    setUserEmail(decodeJwtEmail(t));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.replace('/');
  };

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getinventoryList` : `/sync/getinventoryList`),
    [API_BASE]
  );

  const INPLANT_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/inplantCount` : `/sync/inplantCount`),
    [API_BASE]
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      }),
    []
  );

  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, open: false }));
    }, 4000);
  }, []);

  const getReservado = useCallback((item: InventoryItem): number => {
    const v = item.reserved ?? item.reservado ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '-';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleString('pt-BR');
  };

  const getRowVisual = useCallback(
    (inv: InventoryItem): { bg: string; precisaAjustar: boolean; diff: number } => {
      const reservado = getReservado(inv);
      const diff = inv.count - (inv.inStock + reservado);

      const isPrimal = inv.inplantedDate === PRIMAL_DATE;
      const precisaAjustar = isPrimal && (diff !== 0 || !!inv.recontagem);

      let rowBg = '#9FC5E8'; // azul = “alterado em sistema”
      if (isPrimal) {
        if (diff === 0) rowBg = '#B6D7A8'; // verde
        else if (diff > 0) rowBg = '#FFE599'; // amarelo
        else rowBg = '#EA9999'; // vermelho
      } else if (inv.inplantedDate === RESET_DATE) {
        rowBg = '#D9D9D9'; // cinza
      }

      return { bg: rowBg, precisaAjustar, diff };
    },
    [getReservado]
  );

  const uniqueCodProdCount = useMemo(() => new Set(items.map((i) => i.codProd)).size, [items]);

  const tabCounts = useMemo(() => {
    const base: Record<LocTab, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, SEM: 0 };
    for (const it of items) base[getLocTab(it.localizacao)] += 1;
    return base;
  }, [items]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);
      setHasUserSorted(false);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(LIST_URL, { method: 'GET', headers, cache: 'no-store' });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao carregar inventário (status ${resp.status})`);
      }

      const data = (await resp.json()) as InventoryItem[] | null;
      let list = Array.isArray(data) ? data : [];

      const history: Record<string, InventoryItem[]> = {};
      for (const item of list) {
        const key = String(item.codProd);
        if (!history[key]) history[key] = [];
        history[key].push(item);
      }

      for (const k of Object.keys(history)) {
        history[k] = history[k].slice().sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
      }
      setHistoryByCodProd(history);

      list = list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      const divergent = list.filter(
        (item) => item.count !== item.inStock && item.localizacao?.trim() !== 'Z-000' && item.inplantedDate === PRIMAL_DATE
      );

      const uniqueMap = new Map<string, InventoryItem>();
      for (const item of divergent) {
        const key = `${item.codProd}-${item.localizacao ?? ''}`;
        if (!uniqueMap.has(key)) uniqueMap.set(key, item);
      }

      const finalList = Array.from(uniqueMap.values());

      setItems(finalList);
      setFiltered(finalList);
      setPage(0);
      setExpandedId(null);
      setOrderBy('location');
      setOrderDirection('asc');
      
      if (list.length > 0) toast('Inventário carregado com sucesso.', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar inventário';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, token, API_TOKEN, toast]);

  useEffect(() => {
    if (!ready || !hasAccess) return;
    if (token || API_TOKEN) fetchData();
  }, [API_TOKEN, fetchData, hasAccess, ready, token]);

  useEffect(() => {
    if (!ready || !hasAccess) return;

    const cod = filterCodProd.trim();
    const emailFilter = filterUserEmail.trim().toUpperCase();

    const result = items.filter((item) => {
      if (getLocTab(item.localizacao) !== activeTab) return false;
      if (cod && String(item.codProd) !== cod) return false;

      if (emailFilter) {
        const email = String(item.userEmail ?? '').toUpperCase();
        if (!email.includes(emailFilter)) return false;
      }

      const reservado = getReservado(item);
      const diff = item.count - (item.inStock + reservado);
      const dateStr = item.inplantedDate === PRIMAL_DATE;
      const precisaAjustar = dateStr && diff !== 0;

      if (showOnlyPendentes && !precisaAjustar) return false;
      if (showOnlyRecontagens && !item.recontagem) return false;

      return true;
    });

    setFiltered(result);
    
    const lastPage = Math.max(0, Math.ceil(result.length / rowsPerPage) - 1);
    setPage((p) => Math.min(p, lastPage));
  }, [activeTab, filterCodProd, filterUserEmail, hasAccess, items, ready, showOnlyPendentes, showOnlyRecontagens, getReservado]);

  const handleSort = (field: OrderBy) => {
    setHasUserSorted(true);
    setOrderBy((prev) => {
      if (prev === field) {
        setOrderDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setOrderDirection('asc');
      return field;
    });
  };

  const sorted = useMemo(() => {
    if (!hasUserSorted) return filtered;

    const arr = [...filtered];
    return arr.sort((a, b) => {
      const reservA = getReservado(a);
      const reservB = getReservado(b);

      const diffA = a.count - (a.inStock + reservA);
      const diffB = b.count - (b.inStock + reservB);

      let valA: string | number;
      let valB: string | number;

      switch (orderBy) {
        case 'location': {
          valA = parseLocationNumber(a.localizacao ?? null);
          valB = parseLocationNumber(b.localizacao ?? null);
          break;
        }
        case 'codProd':
          valA = a.codProd;
          valB = b.codProd;
          break;
        case 'descricao':
          valA = (a.descricao ?? '').toUpperCase();
          valB = (b.descricao ?? '').toUpperCase();
          break;
        case 'count':
          valA = a.count;
          valB = b.count;
          break;
        case 'inStock':
          valA = a.inStock;
          valB = b.inStock;
          break;
        case 'diff':
          valA = diffA;
          valB = diffB;
          break;
        default:
          valA = 0;
          valB = 0;
      }

      let cmp: number;

      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB;
        if (cmp === 0 && orderBy === 'location') {
          cmp = a.codProd - b.codProd;
        }
      } else {
        cmp = String(valA).localeCompare(String(valB), 'pt-BR');
      }

      return orderDirection === 'asc' ? cmp : -cmp;
    });
  }, [filtered, orderBy, orderDirection, hasUserSorted, getReservado]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const pageRows = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (!ready || !hasAccess) return null;

  const toggleRow = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const handleUpdateRow = async (inv: InventoryItem, diference: number) => {
    try {
      if (updatingId) return;
      setUpdatingId(inv.id);
      setErro(null);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(INPLANT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ diference, codProd: inv.codProd, id: inv.id }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao ajustar inventário (status ${resp.status})`);
      }

      const nowIso = new Date().toISOString();
      const codKey = String(inv.codProd);

      setHistoryByCodProd((prev) => {
        const next = { ...prev };
        const arr = next[codKey] ? [...next[codKey]] : [];

        next[codKey] = arr.map((it) => {
          if (it.id === inv.id) return { ...it, inplantedDate: nowIso };
          return { ...it, inplantedDate: RESET_DATE };
        });

        return next;
      });

      toast('Inventário atualizado com sucesso.', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao ajustar inventário.';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
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
                  Controle de Inventário e Ajustes
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <img
                src="/eletro_farias2.png"
                alt="Logo 1"
                className="h-12 w-auto object-contain bg-green/10 rounded px-2"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
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
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in-up">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Cabeçalho do Card */}
          <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-xl font-bold text-emerald-900">
                    Produtos com contagem divergente
                  </h2>
                  <div className="group relative flex items-center ml-2">
                    <Info className="w-5 h-5 text-emerald-400 cursor-pointer hover:text-emerald-600 transition-colors" />
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-72 p-4 bg-slate-800 text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#EA9999] rounded-sm"></div> Vermelho: contagem menor que estoque</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#FFE599] rounded-sm"></div> Amarelo: contagem maior que estoque</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#B6D7A8] rounded-sm"></div> Verde: contagem igual ao estoque</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#9FC5E8] rounded-sm"></div> Azul: ajuste realizado no sistema</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#D9D9D9] rounded-sm"></div> Cinza: alterado com base em outra contagem</div>
                        <div className="border-t border-slate-600 pt-2 mt-2">Linha com degradê indica <b>recontagem</b>.</div>
                      </div>
                      <div className="absolute top-1/2 right-full -translate-y-1/2 border-8 border-transparent border-r-slate-800"></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium ml-8">
                  <span>Clique em <b>Detalhes</b> para ver o histórico e ajustar.</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4 text-emerald-600" />}
                  Atualizar
                </button>

                <button
                  type="button"
                  onClick={() => setShowOnlyPendentes((prev) => !prev)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm ${
                    showOnlyPendentes 
                      ? 'bg-amber-500 hover:bg-amber-600 text-white border border-transparent' 
                      : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  {showOnlyPendentes ? 'Mostrar todas' : 'Apenas pendentes'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowOnlyRecontagens((prev) => !prev)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm ${
                    showOnlyRecontagens 
                      ? 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white border border-transparent' 
                      : 'bg-white border border-fuchsia-300 text-fuchsia-700 hover:bg-fuchsia-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  {showOnlyRecontagens ? 'Mostrar todas' : 'Apenas recontagens'}
                </button>
              </div>
            </div>

            {/* Abas de Localização (Tabs) */}
            <div className="flex overflow-x-auto border-b border-slate-200 mb-4 scrollbar-thin scrollbar-thumb-slate-300 pb-1">
              {(['A', 'B', 'C', 'D', 'E', 'SEM'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
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
                    {tabCounts[tab]}
                  </span>
                </button>
              ))}
            </div>

            {/* Barras de Pesquisa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por código exato do produto..."
                  value={filterCodProd}
                  onChange={(e) => setFilterCodProd(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                />
              </div>

              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por contador (e-mail)..."
                  value={filterUserEmail}
                  onChange={(e) => setFilterUserEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                />
              </div>
            </div>

            {erro && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {erro}
              </div>
            )}
          </div>

          {/* Tabela Principal */}
          <div className="p-0 bg-slate-50/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                <span className="text-sm font-bold">Carregando inventário...</span>
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-b border-slate-100">
                <Search className="w-12 h-12 text-slate-300 mb-3" />
                <span className="text-sm font-medium">Nenhuma contagem divergente encontrada.</span>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-emerald-50/80 border-b border-emerald-100">
                    <tr>
                      <th 
                        className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-emerald-100/50 transition-colors"
                        onClick={() => handleSort('location')}
                      >
                        <div className="flex items-center gap-1">
                          Localização
                          {orderBy === 'location' && <ArrowUpDown className="w-3 h-3" />}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-emerald-100/50 transition-colors"
                        onClick={() => handleSort('codProd')}
                      >
                        <div className="flex items-center gap-1">
                          Cód. Produto
                          {orderBy === 'codProd' && <ArrowUpDown className="w-3 h-3" />}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider cursor-pointer hover:bg-emerald-100/50 transition-colors"
                        onClick={() => handleSort('descricao')}
                      >
                        <div className="flex items-center gap-1">
                          Descrição
                          {orderBy === 'descricao' && <ArrowUpDown className="w-3 h-3" />}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Nº Contagens
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap w-24">
                        Detalhes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pageRows.map((inv) => {
                      const isExpanded = expandedId === inv.id;
                      const history = historyByCodProd[String(inv.codProd)] ?? [];

                      return (
                        <React.Fragment key={inv.id}>
                          {/* Linha Resumo */}
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-mono font-bold text-slate-700 whitespace-nowrap">
                              {inv.localizacao ?? '-'}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">
                              {inv.codProd}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700 truncate max-w-[200px]" title={inv.descricao ?? ''}>
                              {inv.descricao ?? '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full text-xs border border-slate-200">
                                {history.length}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => toggleRow(inv.id)}
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

                          {/* Linha Expandida (Histórico e Ajuste) */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={5} className="p-0 bg-slate-50 border-b border-slate-200 shadow-inner">
                                <div className="p-4 sm:p-6 animate-fade-in-up">
                                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-4">
                                    <div className="px-4 py-3 bg-emerald-50/50 border-b border-slate-100 flex items-center justify-between">
                                      <h4 className="text-sm font-bold text-emerald-900">
                                        Histórico de Contagens — Produto <span className="font-mono text-emerald-700 bg-emerald-100 px-1 rounded">{inv.codProd}</span>
                                      </h4>
                                    </div>
                                    
                                    {history.length === 0 ? (
                                      <div className="p-4 text-sm text-slate-500 italic text-center">
                                        Nenhum histórico encontrado.
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-100">
                                          <thead className="bg-slate-50/50">
                                            <tr>
                                              <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Data</th>
                                              <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Localização</th>
                                              <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contador</th>
                                              <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Contagem</th>
                                              <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Estoque Sist.</th>
                                              <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Reservado</th>
                                              <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Diferença</th>
                                              <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Recontagem?</th>
                                              <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ação</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-white">
                                            {history.map((h) => {
                                              const reservado = getReservado(h);
                                              const { bg, precisaAjustar, diff } = getRowVisual(h);
                                              const isRecontagem = !!h.recontagem;

                                              // Processa a cor para as classes do Tailwind baseadas nos hex originais do sistema do cliente
                                              let rowBgClass = '';
                                              let customBgStyle = {};

                                              if (bg === '#B6D7A8') rowBgClass = 'bg-[#B6D7A8]/60';
                                              else if (bg === '#FFE599') rowBgClass = 'bg-[#FFE599]/60';
                                              else if (bg === '#EA9999') rowBgClass = 'bg-[#EA9999]/60';
                                              else if (bg === '#D9D9D9') rowBgClass = 'bg-[#D9D9D9]/60';
                                              else if (bg === '#9FC5E8') rowBgClass = 'bg-[#9FC5E8]/60';

                                              if (isRecontagem) {
                                                customBgStyle = {
                                                  background: `linear-gradient(90deg, #E1BEE7 0%, #E1BEE7 25%, ${bg} 60%, ${bg} 100%)`
                                                };
                                                rowBgClass = ''; 
                                              }

                                              return (
                                                <tr 
                                                  key={h.id} 
                                                  className={`hover:brightness-95 transition-all ${rowBgClass} ${isRecontagem ? 'font-bold' : ''}`}
                                                  style={customBgStyle}
                                                >
                                                  <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{formatDateTime(h.createdAt)}</td>
                                                  <td className="px-3 py-2.5 text-xs font-mono text-slate-700 whitespace-nowrap">{h.localizacao ?? '-'}</td>
                                                  <td className="px-3 py-2.5 text-xs text-slate-600 truncate max-w-[120px]" title={h.userEmail ?? ''}>{h.userEmail ?? '-'}</td>
                                                  <td className="px-3 py-2.5 text-xs text-right tabular-nums">{numberFormatter.format(h.count)}</td>
                                                  <td className="px-3 py-2.5 text-xs text-right tabular-nums">{numberFormatter.format(h.inStock)}</td>
                                                  <td className="px-3 py-2.5 text-xs text-right tabular-nums text-slate-500">{numberFormatter.format(reservado)}</td>
                                                  <td className="px-3 py-2.5 text-xs text-right tabular-nums font-bold">{numberFormatter.format(diff)}</td>
                                                  <td className="px-3 py-2.5 text-xs text-center">
                                                    {isRecontagem ? <span className="bg-white/50 px-1.5 py-0.5 rounded text-fuchsia-800 border border-fuchsia-200">Sim</span> : 'Não'}
                                                  </td>
                                                  <td className="px-3 py-2 text-center">
                                                    {precisaAjustar && (
                                                      <button
                                                        type="button"
                                                        onClick={() => handleUpdateRow(h, diff)}
                                                        disabled={updatingId === h.id}
                                                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-black text-white rounded text-[10px] font-bold transition-colors disabled:opacity-50 min-w-[72px] focus:outline-none focus:ring-2 focus:ring-slate-500"
                                                      >
                                                        {updatingId === h.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Settings2 className="w-3 h-3" />}
                                                        Ajustar
                                                      </button>
                                                    )}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
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
            {filtered.length > 0 && (
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
        .animate-fade-in-up { 
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
      `}</style>
    </div>
  );
}