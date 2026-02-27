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
  Filter
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
  inplantedDate: string | null; // agora permite null
  createdAt: string; // usado para ordenação inicial
  descricao?: string | null;
  userEmail?: string | null;

  // localização
  localizacao?: string | null;

  // Reservado / recontagem vindos do backend
  reserved?: number | null;
  reservado?: number | null; // fallback se o backend usar esse nome
  recontagem?: boolean | null;
};

// ✅ agora inclui location
type OrderBy = 'location' | 'codProd' | 'descricao' | 'count' | 'inStock' | 'diff';

const RESET_DATE = '1981-11-23T14:01:48.190Z';
const PRIMAL_DATE = '1987-11-23T14:01:48.190Z';

// abas
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
  return jwtEmail?.email;
}

// ✅ extrai só o número da localização (A-001 -> 1, B-120 -> 120)
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

  // ABA ATIVA
  const [activeTab, setActiveTab] = usePersistedState<LocTab>('inventory:contagens:activeTab', 'A');

  // PAGINAÇÃO
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  // ORDENAÇÃO
  const [orderBy, setOrderBy] = useState<OrderBy>('codProd');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');
  const [hasUserSorted, setHasUserSorted] = useState(false);

  // Toast Customizado
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  // controle de “loading” do botão por linha
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Email logado
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('authToken');
    setUserEmail(decodeJwtEmail(t) ?? null);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.replace('/');
  };

  // Base da API
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getinventoryList` : `/sync/getinventoryList`),
    [API_BASE]
  );

  // endpoint para ajustar inventário (inplantCount)
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

  // helper pra pegar reservado de forma segura (suporta reserved ou reservado)
  const getReservado = (item: InventoryItem): number => {
    const v = item.reserved ?? item.reservado ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // contagem de códigos distintos
  const uniqueCodProdCount = useMemo(() => new Set(items.map((i) => i.codProd)).size, [items]);

  // contador por aba (pra mostrar no label)
  const tabCounts = useMemo(() => {
    const base: Record<LocTab, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, SEM: 0 };
    for (const it of items) base[getLocTab(it.localizacao)] += 1;
    return base;
  }, [items]);

  // Carrega lista
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

      // ordena por createdAt desc
      list = list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setItems(list);
      setPage(0);
      
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

  // Filtro: aba + código exato + contador (contains) + pendentes + recontagens
  useEffect(() => {
    if (!ready || !hasAccess) return;

    const cod = filterCodProd.trim();
    const emailFilter = filterUserEmail.trim().toUpperCase();

    const result = items.filter((item) => {
      // filtro por aba de localização
      if (getLocTab(item.localizacao) !== activeTab) return false;

      // filtro por código exato
      if (cod && String(item.codProd) !== cod) return false;

      // filtro por contador (userEmail contém)
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
    
    // Ajusta a paginação se os filtros resultarem numa página inexistente
    const lastPage = Math.max(0, Math.ceil(result.length / rowsPerPage) - 1);
    setPage((p) => Math.min(p, lastPage));
  }, [activeTab, filterCodProd, filterUserEmail, hasAccess, items, ready, showOnlyPendentes, showOnlyRecontagens]);

  // Ordenação manual
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
        // ✅ desempate quando ordenar por localização: codProd
        if (cmp === 0 && orderBy === 'location') {
          cmp = a.codProd - b.codProd;
        }
      } else {
        cmp = String(valA).localeCompare(String(valB), 'pt-BR');
      }

      return orderDirection === 'asc' ? cmp : -cmp;
    });
  }, [filtered, orderBy, orderDirection, hasUserSorted]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const pageRows = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (!ready || !hasAccess) return null;

  // Botão "Ajustar"
  const handleUpdateRow = async (inv: InventoryItem, diference: number) => {
    try {
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

      setItems((prev) =>
        prev.map((item) => {
          if (item.id === inv.id) return { ...item, inplantedDate: nowIso };
          if (item.codProd === inv.codProd) return { ...item, inplantedDate: RESET_DATE };
          return item;
        })
      );

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
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in-up">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Cabeçalho do Card */}
          <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-xl font-bold text-emerald-900">
                    Contagens de Produtos
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium ml-8">
                  <span>Total de produtos distintos contados: {uniqueCodProdCount}</span>
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
                <span className="text-sm font-medium">Nenhuma contagem encontrada para os critérios atuais.</span>
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
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Contador
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-emerald-100/50 transition-colors"
                        onClick={() => handleSort('count')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Contagem
                          {orderBy === 'count' && <ArrowUpDown className="w-3 h-3" />}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-emerald-100/50 transition-colors"
                        onClick={() => handleSort('inStock')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Estoque Sist.
                          {orderBy === 'inStock' && <ArrowUpDown className="w-3 h-3" />}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Reservado
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-emerald-100/50 transition-colors"
                        onClick={() => handleSort('diff')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Diferença
                          {orderBy === 'diff' && <ArrowUpDown className="w-3 h-3" />}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap w-24">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pageRows.map((inv) => {
                      const reservado = getReservado(inv);
                      const diff = inv.count - (inv.inStock + reservado);
                      const dateStr = inv.inplantedDate === PRIMAL_DATE;
                      const precisaAjustar = dateStr && diff !== 0;

                      // Determinação das cores das linhas conforme a regra original
                      let rowBgClass = '';
                      let customBgStyle = {};

                      if (dateStr) {
                        if (diff === 0) rowBgClass = 'bg-[#B6D7A8]/50'; // Verde
                        else if (diff > 0) rowBgClass = 'bg-[#FFE599]/50'; // Amarelo
                        else rowBgClass = 'bg-[#EA9999]/50'; // Vermelho
                      } else if (inv.inplantedDate === RESET_DATE) {
                        rowBgClass = 'bg-[#D9D9D9]/50'; // Cinza (Zerad)
                      } else {
                        rowBgClass = 'bg-[#9FC5E8]/50'; // Azul (Já processado/outro status)
                      }

                      const isRecontagem = !!inv.recontagem;

                      // O degradê da recontagem necessita de estilo inline pois mapear Tailwind arbitrário para degradês complexos é ruim de ler
                      if (isRecontagem) {
                        // Extrair a cor base baseada na class acima para compor o gradiente (simplificado)
                        let baseColorHex = '#ffffff';
                        if (rowBgClass.includes('#B6D7A8')) baseColorHex = '#B6D7A8';
                        else if (rowBgClass.includes('#FFE599')) baseColorHex = '#FFE599';
                        else if (rowBgClass.includes('#EA9999')) baseColorHex = '#EA9999';
                        else if (rowBgClass.includes('#D9D9D9')) baseColorHex = '#D9D9D9';
                        else if (rowBgClass.includes('#9FC5E8')) baseColorHex = '#9FC5E8';

                        customBgStyle = {
                          background: `linear-gradient(90deg, #E1BEE7 0%, #E1BEE7 25%, ${baseColorHex} 60%, ${baseColorHex} 100%)`
                        };
                        rowBgClass = ''; // Limpa a classe pois o estilo inline sobrepõe
                      }

                      return (
                        <tr 
                          key={inv.id} 
                          className={`hover:brightness-95 transition-all ${rowBgClass} ${isRecontagem ? 'font-bold' : ''}`}
                          style={customBgStyle}
                        >
                          <td className="px-4 py-3 text-sm font-mono text-slate-700 whitespace-nowrap">
                            {inv.localizacao ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-800 whitespace-nowrap">
                            {inv.codProd}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 truncate max-w-[200px]" title={inv.descricao ?? ''}>
                            {inv.descricao ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[150px]" title={inv.userEmail ?? ''}>
                            {inv.userEmail ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right tabular-nums">
                            {numberFormatter.format(inv.count)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right tabular-nums">
                            {numberFormatter.format(inv.inStock)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-500">
                            {numberFormatter.format(reservado)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right tabular-nums font-bold">
                            {numberFormatter.format(diff)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {precisaAjustar && (
                              <button
                                type="button"
                                onClick={() => handleUpdateRow(inv, diff)}
                                disabled={updatingId === inv.id}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 min-w-[85px] focus:outline-none focus:ring-2 focus:ring-slate-500"
                              >
                                {updatingId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings2 className="w-3.5 h-3.5" />}
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