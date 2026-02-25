'use client';

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
  Settings2,
  Undo2,
  CheckSquare
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

type InventoryRow = {
  id?: string;
  codProd?: number;
  descricao?: string | null;
  localizacao?: string | null;
  count?: number;
  inStock?: number;
  reservado?: number | null;
  reserved?: number | null;
  userEmail?: string | null;
  createdAt?: string | null;
  inplantedDate?: string | null;
  recontagem?: boolean | null;

  [key: string]: unknown;
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

export default function Page() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<InventoryRow[]>([]);
  const [filtered, setFiltered] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Toast Customizado
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  // filtros
  const [filterCodProd, setFilterCodProd] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterLoc, setFilterLoc] = useState('');

  // seleção
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ação ajustar e retornar
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  // auth
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

  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getNotaNegativa` : `/sync/getNotaNegativa`),
    [API_BASE]
  );

  const AJUSTE_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/ajusteNegativo` : `/sync/ajusteNegativo`),
    [API_BASE]
  );

  const RETORNAR_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/retornarProdutos` : `/sync/retornarProdutos`),
    [API_BASE]
  );

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

  const getReservado = (it: InventoryRow) => {
    const v = (it.reserved ?? it.reservado ?? 0) as unknown;
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

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
        throw new Error(msg || `Falha ao buscar contagens (status ${resp.status})`);
      }

      const data = (await resp.json()) as unknown;

      const list: InventoryRow[] = Array.isArray(data)
        ? (data as unknown[]).map((x) => (typeof x === 'object' && x ? (x as InventoryRow) : ({} as InventoryRow)))
        : [];

      list.sort((a, b) => {
        const ta = a.createdAt ? new Date(String(a.createdAt)).getTime() : 0;
        const tb = b.createdAt ? new Date(String(b.createdAt)).getTime() : 0;
        return tb - ta;
      });

      setItems(list);
      setSelectedIds(new Set());
      if (list.length > 0) toast('Lista carregada com sucesso.', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar contagens';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, getHeaders, toast]);

  useEffect(() => {
    if (token || API_TOKEN) fetchData();
  }, [fetchData, token, API_TOKEN]);

  useEffect(() => {
    const cod = filterCodProd.trim();
    const user = filterUser.trim().toUpperCase();
    const loc = filterLoc.trim().toUpperCase();

    const result = items.filter((it) => {
      if (cod && String(it.codProd ?? '') !== cod) return false;

      if (user) {
        const email = String(it.userEmail ?? '').toUpperCase();
        if (!email.includes(user)) return false;
      }

      if (loc) {
        const l = String(it.localizacao ?? '').toUpperCase();
        if (!l.includes(loc)) return false;
      }

      return true;
    });

    setFiltered(result);
  }, [items, filterCodProd, filterUser, filterLoc]);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '-';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return String(iso);
    return dt.toLocaleString('pt-BR');
  };

  const toggleRow = (rowId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((it, idx) => {
      const rowId = String((it.id as string) ?? `${it.userEmail ?? 'u'}-${idx}`);
      return selectedIds.has(rowId);
    });

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((it, idx) => {
          const rowId = String((it.id as string) ?? `${it.userEmail ?? 'u'}-${idx}`);
          next.delete(rowId);
        });
      } else {
        filtered.forEach((it, idx) => {
          const rowId = String((it.id as string) ?? `${it.userEmail ?? 'u'}-${idx}`);
          next.add(rowId);
        });
      }
      return next;
    });
  };

  const handleAjustar = async () => {
    if (isAdjusting) return;

    const produtos: { codProd: number; diference: number }[] = [];

    filtered.forEach((it, idx) => {
      const rowId = String((it.id as string) ?? `${it.userEmail ?? 'u'}-${idx}`);
      if (!selectedIds.has(rowId)) return;

      const codProd = Number(it.codProd);
      if (!Number.isFinite(codProd)) return;

      const reservado = getReservado(it);
      const count = Number(it.count ?? 0);
      const inStock = Number(it.inStock ?? 0);

      const diference = count - (inStock + reservado);
      produtos.push({ codProd, diference });
    });

    if (produtos.length === 0) {
      toast('Selecione linhas válidas (com codProd) para ajustar.', 'error');
      return;
    }

    setIsAdjusting(true);
    setErro(null);

    try {
      const resp = await fetch(AJUSTE_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify({ produtos }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao ajustar (status ${resp.status})`);
      }

      toast('Ajuste enviado com sucesso!', 'success');
      await fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao ajustar';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleRetornar = async () => {
    if (isReturning) return;

    const cods = new Set<number>();

    filtered.forEach((it, idx) => {
      const rowId = String((it.id as string) ?? `${it.userEmail ?? 'u'}-${idx}`);
      if (!selectedIds.has(rowId)) return;

      const codProd = Number(it.codProd);
      if (Number.isFinite(codProd) && codProd > 0) cods.add(codProd);
    });

    const codProds = Array.from(cods);

    if (codProds.length === 0) {
      toast('Selecione linhas válidas (com codProd) para retornar.', 'error');
      return;
    }

    setIsReturning(true);
    setErro(null);

    try {
      const resp = await fetch(RETORNAR_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify({ codProds }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao retornar (status ${resp.status})`);
      }

      toast('Produtos retornados com sucesso!', 'success');
      await fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao retornar produtos';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setIsReturning(false);
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
                  Listagem e Ajuste de Contagens
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
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-8 animate-fade-in-up">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Cabeçalho do Card */}
          <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckSquare className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-xl font-bold text-emerald-900">
                    Todas as contagens (Nota Positiva / Negativa)
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium ml-8">
                  <span>Total listado: {filtered.length}</span>
                  <span>•</span>
                  <span className={selectedIds.size > 0 ? "text-emerald-700 font-bold" : ""}>Selecionados: {selectedIds.size}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading || isAdjusting || isReturning}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4 text-emerald-600" />}
                  Atualizar
                </button>

                <button
                  type="button"
                  onClick={handleRetornar}
                  disabled={loading || isAdjusting || isReturning || selectedIds.size === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isReturning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                  RETORNAR
                </button>

                <button
                  type="button"
                  onClick={handleAjustar}
                  disabled={loading || isAdjusting || isReturning || selectedIds.size === 0}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isAdjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
                  AJUSTAR
                </button>
              </div>
            </div>

            {/* Barras de Pesquisa */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar Cód. Prod..."
                  value={filterCodProd}
                  onChange={(e) => setFilterCodProd(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                />
              </div>

              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por contador..."
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                />
              </div>

              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar localização..."
                  value={filterLoc}
                  onChange={(e) => setFilterLoc(e.target.value)}
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
                <span className="text-sm font-bold">Carregando lista...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-b border-slate-100">
                <Search className="w-12 h-12 text-slate-300 mb-3" />
                <span className="text-sm font-medium">Nenhuma contagem encontrada para os critérios atuais.</span>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-emerald-50/80 border-b border-emerald-100">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">
                        <input 
                          type="checkbox"
                          checked={allFilteredSelected}
                          ref={input => { if (input) input.indeterminate = !allFilteredSelected && selectedIds.size > 0; }}
                          onChange={toggleSelectAllFiltered}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Data
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Localização
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Cód. Produto
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Contador
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Contagem
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Estoque
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Reservado
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Diferença
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap w-24">
                        Recontagem?
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filtered.map((it, idx) => {
                      const reservado = getReservado(it);
                      const count = Number(it.count ?? 0);
                      const inStock = Number(it.inStock ?? 0);
                      const diff = count - (inStock + reservado);

                      const rowId = String((it.id as string) ?? `${it.userEmail ?? 'u'}-${idx}`);
                      const isSelected = selectedIds.has(rowId);

                      return (
                        <tr 
                          key={rowId} 
                          onClick={() => toggleRow(rowId)}
                          className={`transition-colors cursor-pointer border-b border-black/5 ${
                            isSelected ? "bg-blue-200 hover:bg-blue-300/80" : "bg-blue-50 hover:bg-blue-100"
                          }`}
                        >
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(rowId)}
                              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                            {formatDateTime((it.createdAt as string) ?? null)}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono font-bold text-slate-700 whitespace-nowrap">
                            {String(it.localizacao ?? '-')}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">
                            {String(it.codProd ?? '-')}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 truncate max-w-[200px]" title={String(it.descricao ?? '')}>
                            {String(it.descricao ?? '-')}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-slate-600 truncate max-w-[150px]" title={String(it.userEmail ?? '')}>
                            {String(it.userEmail ?? '-')}
                          </td>
                          <td className="px-4 py-3 text-sm text-right tabular-nums">
                            {Number.isFinite(count) ? count : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right tabular-nums">
                            {Number.isFinite(inStock) ? inStock : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right tabular-nums text-slate-500">
                            {reservado}
                          </td>
                          <td className="px-4 py-3 text-sm text-right tabular-nums font-bold">
                            {Number.isFinite(diff) ? diff : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-center">
                            {it.recontagem ? <span className="bg-white/50 px-1.5 py-0.5 rounded text-fuchsia-800 border border-fuchsia-200 font-bold">Sim</span> : 'Não'}
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