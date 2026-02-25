'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
  ArrowUpDown
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
};

type OrderBy = 'location' | 'numCounts';
type LocTab = 'A' | 'B' | 'C' | 'D' | 'E' | 'SEM';

// --- Helpers ---
const rowsPerPage = 10;

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

function getLocTab(localizacao: string | null): LocTab {
  const loc = String(localizacao ?? '').trim().toUpperCase();
  const first = loc.charAt(0);
  if (first === 'A' || first === 'B' || first === 'C' || first === 'D' || first === 'E') {
    return first as LocTab;
  }
  return 'SEM';
}

function formatDateTime(iso: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR');
}

export default function Page() {
  const { token, ready, hasAccess } = useRequireAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dados
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [countsByCodProd, setCountsByCodProd] = useState<Record<string, number>>({});
  const [recountedIds, setRecountedIds] = useState<Record<string, boolean>>({});

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  
  // Filtros Persistidos
  const [filterCodProd, setFilterCodProd] = usePersistedState<string>('inventory:recontagem:filterCodProd', '');
  const [activeTab, setActiveTab] = usePersistedState<LocTab>('inventory:recontagem:activeTab', 'A');

  // Paginação e Ordenação
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState<OrderBy>('location');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');

  // Ações
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [countById, setCountById] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Toast
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, open: false }));
    }, 4000);
  }, []);

  // APIs
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getinventoryList` : `/sync/getinventoryList`),
    [API_BASE]
  );

  const ADDNEWCOUNT_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/addNewCount` : `/sync/addNewCount`),
    [API_BASE]
  );

  // Contagem de abas
  const tabCounts = useMemo(() => {
    const base: Record<LocTab, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, SEM: 0 };
    for (const it of items) base[getLocTab(it.localizacao)] += 1;
    return base;
  }, [items]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(LIST_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao carregar inventário (status ${resp.status})`);
      }

      const data = (await resp.json()) as InventoryItem[] | null;
      let list = Array.isArray(data) ? data : [];

      const counts: Record<string, number> = {};
      for (const item of list) {
        const key = String(item.codProd);
        counts[key] = (counts[key] ?? 0) + 1;
      }
      setCountsByCodProd(counts);

      list = list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      // Filtra apenas itens divergentes e que não são do local Z-000
      const divergent = list.filter((item) => item.count !== item.inStock && item.localizacao?.trim() !== 'Z-000');

      const currentUserEmail = decodeJwtEmail(token);

      const forbiddenKeys = new Set<string>();
      if (currentUserEmail) {
        for (const item of divergent) {
          const compare = list.filter((compara) => compara.codProd === item.codProd);
          for (const same of compare) {
            if (same.userEmail === currentUserEmail || same.recontagem) {
              forbiddenKeys.add(`${same.codProd}-${same.localizacao ?? ''}`);
            }
          }

          if (item.userEmail === currentUserEmail || item.recontagem) {
            forbiddenKeys.add(`${item.codProd}-${item.localizacao ?? ''}`);
          }
        }
      }

      const uniqueMap = new Map<string, InventoryItem>();
      for (const item of divergent) {
        const key = `${item.codProd}-${item.localizacao ?? ''}`;
        if (forbiddenKeys.has(key)) continue;
        if (!uniqueMap.has(key)) uniqueMap.set(key, item);
      }

      const finalList = Array.from(uniqueMap.values());

      setItems(finalList);
      setPage(0);
      setExpandedId(null);
      setCountById({});
      setRecountedIds({});
      setOrderBy('location');
      setOrderDirection('asc');
      
      if (finalList.length > 0) toast('Lista atualizada com sucesso', 'success');
      
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

    const result = items.filter((item) => {
      if (cod && String(item.codProd) !== cod) return false;
      if (getLocTab(item.localizacao) !== activeTab) return false;
      return true;
    });

    setFiltered(result);
    setPage(0);
    setExpandedId(null);
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

  const toggleRow = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const handleChangeCount = (id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ?? '';
    setCountById((prev) => ({ ...prev, [id]: value }));
  };

  const handleEnviarContagem = async (inv: InventoryItem) => {
    if (recountedIds[inv.id]) {
      toast('Este item já teve uma recontagem enviada.', 'error');
      return;
    }

    const raw = countById[inv.id] ?? '';
    if (!raw.trim()) {
      toast('Informe a nova contagem.', 'error');
      return;
    }

    const valor = Number(raw.replace(',', '.'));
    if (!Number.isFinite(valor)) {
      toast('Contagem inválida.', 'error');
      return;
    }

    setErro(null);
    setSavingId(inv.id);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const body = {
        codProd: inv.codProd,
        contagem: valor,
        descricao: inv.descricao ?? '',
        localizacao: inv.localizacao ?? '',
      };

      const resp = await fetch(ADDNEWCOUNT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao enviar recontagem (status ${resp.status})`);
      }

      toast('Recontagem enviada com sucesso!', 'success');

      setRecountedIds((prev) => ({ ...prev, [inv.id]: true }));
      setCountById((prev) => ({ ...prev, [inv.id]: '' }));
      setExpandedId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar recontagem.';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (!ready || !hasAccess) return null;

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

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 animate-fade-in-up">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Cabeçalho do Card */}
          <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-xl font-bold text-emerald-900">Itens Divergentes</h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium ml-8">
                  <span>Itens para recontagem: {sorted.length}</span>
                </div>
              </div>

              <button
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
                <span className="text-sm font-medium">Nenhuma divergência encontrada neste setor.</span>
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
                          Contagens
                          {orderBy === 'numCounts' && <ArrowUpDown className="w-3 h-3" />}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap w-32">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pageRows.map((inv) => {
                      const alreadyRecounted = !!recountedIds[inv.id];
                      const isExpanded = expandedId === inv.id;

                      return (
                        <React.Fragment key={inv.id}>
                          {/* Linha Principal */}
                          <tr className={`transition-colors ${alreadyRecounted ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
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
                              {alreadyRecounted ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                  <CheckCircle2 className="w-3 h-3" /> Enviado
                                </span>
                              ) : (
                                <button
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
                                    <>Recontar <ChevronDown className="w-3.5 h-3.5" /></>
                                  )}
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Linha Expandida (Input de Recontagem) */}
                          {isExpanded && !alreadyRecounted && (
                            <tr>
                              <td colSpan={5} className="p-0 bg-emerald-50/30 border-b border-slate-200 shadow-inner">
                                <div className="p-4 flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up justify-end">
                                  <span className="text-sm font-medium text-emerald-900 hidden sm:inline">Nova Contagem:</span>
                                  <div className="flex w-full sm:w-auto gap-2">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="Qtd..."
                                      autoFocus
                                      value={countById[inv.id] ?? ''}
                                      onChange={handleChangeCount(inv.id)}
                                      className="flex-1 sm:w-32 px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                                    />
                                    <button
                                      onClick={() => handleEnviarContagem(inv)}
                                      disabled={savingId === inv.id}
                                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 min-w-[100px]"
                                    >
                                      {savingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                      Enviar
                                    </button>
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