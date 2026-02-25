'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Server,
  Search,
  Plus,
  Send,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  PackageSearch,
  X
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

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
  Produto_AD_NOMEPRDLV?: string | null;
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
  DESCRGRUPOPROD?: string | null;
  AD_NOMEPRDLV?: string | null;
  estoque?: EstoqueItem[];
};

type JwtPayload = {
  email?: string;
  userEmail?: string;
  sub?: string;
  [key: string]: unknown;
};

function safeDecodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64.padEnd(payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4), '=');
    const jsonPayload = atob(padded);
    const payload = JSON.parse(jsonPayload) as unknown;

    if (payload && typeof payload === 'object') return payload as JwtPayload;
    return null;
  } catch {
    return null;
  }
}

const MAX_LOC = 15;

type CartItem = {
  codProduto: number;
  descricao: string;
  nomeProd: string;
  localizacao: string;
  adLocalizacao: string;
  quantidadeStr: string; // input
  produtoRaw?: Produto;
};

function toNumberSafe(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function parsePositiveNumber(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [cod, setCod] = useState<string>('');
  const [produto, setProduto] = useState<Produto | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);

  // Toast / Snackbar Customizado
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const router = useRouter();
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

    const payload = safeDecodeJwt(t);
    const emailFromJwt = payload?.email ?? payload?.userEmail ?? payload?.sub ?? null;
    if (emailFromJwt) setUserEmail(String(emailFromJwt));
  }, [router]);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const GET_URL = useCallback(
    (id: string) =>
      API_BASE
        ? `${API_BASE}/sync/getProductLocation?id=${encodeURIComponent(id)}`
        : `/sync/getProductLocation?id=${encodeURIComponent(id)}`,
    [API_BASE]
  );

  const SOLICITAR_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/solicitarProduto` : `/sync/solicitarProduto`),
    [API_BASE]
  );

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const toast = useCallback((msg: string, type: 'success' | 'error') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, open: false }));
    }, 4000);
  }, []);

  const handleBuscar = async () => {
    setToastState((prev) => ({ ...prev, open: false }));
    setProduto(null);

    const clean = cod.trim();
    if (!clean) return toast('Informe o código do produto.', 'error');
    if (!/^\d+$/.test(clean)) return toast('O código deve conter apenas números.', 'error');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);

      const resp = await fetch(GET_URL(clean), {
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
        setProduto(null);
        return toast('Produto não encontrado.', 'error');
      }

      setProduto(data);
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((e as any)?.name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'Erro ao buscar produto';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!produto?.CODPROD) return toast('Busque um produto antes de adicionar.', 'error');

    const codProdNum = toNumberSafe(produto.CODPROD);
    if (!Number.isFinite(codProdNum)) return toast('CODPROD inválido.', 'error');

    if (cart.some((c) => c.codProduto === codProdNum)) {
      return toast('Este produto já está na lista.', 'error');
    }

    setLoadingAdd(true);
    try {
      const item: CartItem = {
        codProduto: codProdNum,
        descricao: String(produto.DESCRPROD ?? ''),
        nomeProd: String(produto.AD_NOMEPRDLV ?? ''),
        localizacao: String(produto.LOCALIZACAO ?? '').slice(0, MAX_LOC),
        adLocalizacao: String(produto.AD_LOCALIZACAO ?? '').slice(0, MAX_LOC),
        quantidadeStr: '',
        produtoRaw: produto,
      };

      setCart((prev) => [item, ...prev]);
      setProduto(null);
      setCod('');
      toast('Produto adicionado à lista.', 'success');
    } finally {
      setLoadingAdd(false);
    }
  };

  const handleRemoveFromCart = (codProduto: number) => {
    setCart((prev) => prev.filter((x) => x.codProduto !== codProduto));
  };

  const handleChangeQty = (codProduto: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ?? '';
    setCart((prev) => prev.map((x) => (x.codProduto === codProduto ? { ...x, quantidadeStr: value } : x)));
  };

  const handleSolicitarTodos = async () => {
    if (!userEmail) return toast('Não foi possível identificar o e-mail do usuário logado.', 'error');
    if (cart.length === 0) return toast('Adicione pelo menos um produto na lista.', 'error');

    const invalid = cart.find((x) => parsePositiveNumber(x.quantidadeStr) == null);
    if (invalid) return toast(`Informe uma quantidade válida para o produto ${invalid.codProduto}.`, 'error');

    const produtos = cart.map((it) => {
      const quantidade = parsePositiveNumber(it.quantidadeStr);
      if (quantidade == null) throw new Error(`Quantidade inválida para ${it.codProduto}`);

      return {
        codProduto: it.codProduto,
        quantidade,
        descricao: it.descricao ?? '',
      };
    });

    setLoadingSend(true);
    try {
      const body = { userEmail, produtos };

      const resp = await fetch(SOLICITAR_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao solicitar produtos (status ${resp.status})`);
      }

      toast('Solicitações enviadas com sucesso!', 'success');
      setCart([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao solicitar produtos.';
      toast(msg, 'error');
    } finally {
      setLoadingSend(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') handleBuscar();
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
                  Solicitação de Produtos
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <img
                src="/eletro_farias2.png"
                alt="Logo 1"
                className="h-12 w-auto object-contain bg-green/10 rounded px-2"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <img
                src="/lid-verde-branco.png"
                alt="Logo 2"
                className="h-12 w-auto object-contain hidden md:block"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 animate-fade-in-up">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Seção Superior - Busca e Ações */}
          <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
            <div className="flex items-center gap-2 mb-4">
              <PackageSearch className="w-6 h-6 text-emerald-600" />
              <h2 className="text-xl font-bold text-emerald-900">Buscar por Código</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Código do produto"
                  value={cod}
                  onChange={(e) => setCod(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                />
              </div>

              <button
                onClick={handleBuscar}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
              </button>

              <div className="hidden sm:block flex-1"></div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                <button
                  onClick={handleAddToCart}
                  disabled={loadingAdd || !produto?.CODPROD}
                  className="w-full sm:w-auto px-6 py-2 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-white whitespace-nowrap"
                >
                  {loadingAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Adicionar à lista
                </button>

                <button
                  onClick={handleSolicitarTodos}
                  disabled={loadingSend || cart.length === 0}
                  className="w-full sm:w-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm whitespace-nowrap"
                >
                  {loadingSend ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Solicitar todos
                </button>
              </div>
            </div>
          </div>

          {/* Resultado da Busca */}
          {produto && (
            <div className="p-6 bg-white border-b border-slate-100 animate-fade-in-up">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Resultado da busca</h3>
              
              <div className="flex flex-col md:flex-row gap-6">
                {/* Imagem do Produto */}
                <div className="w-full md:w-48 h-48 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-2 shrink-0">
                  <img
                    src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${produto.CODPROD}.dbimage`}
                    alt={produto.DESCRPROD ?? 'Imagem do produto'}
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2JkNWUxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiPjwvcmVjdD48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSI+PC9jaXJjbGU+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSI+PC9wb2x5bGluZT48L3N2Zz4=';
                      (e.target as HTMLImageElement).className = 'w-16 h-16 opacity-50';
                    }}
                  />
                </div>

                {/* Detalhes (Readonly inputs) */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cód. Prod</label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
                      {produto.CODPROD ?? '-'}
                    </div>
                  </div>
                  
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium truncate" title={produto.DESCRPROD ?? ''}>
                      {produto.DESCRPROD ?? '-'}
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome Comercial (PDV)</label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium truncate" title={produto.AD_NOMEPRDLV ?? ''}>
                      {produto.AD_NOMEPRDLV ?? '-'}
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-1 lg:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Localização</label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium font-mono">
                      {String(produto.LOCALIZACAO ?? '').slice(0, MAX_LOC) || '-'}
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-1 lg:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Localização 2</label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium font-mono">
                      {String(produto.AD_LOCALIZACAO ?? '').slice(0, MAX_LOC) || '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Solicitações (Carrinho) */}
          <div className="p-6 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Lista de solicitações</h3>

            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl bg-white">
                <Search className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-slate-500 font-medium text-sm">Nenhum item adicionado ainda.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-emerald-50/80">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                          Cód. Produto
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
                          Descrição
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                          Localização
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                          Localização 2
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider w-32">
                          Quantidade
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider w-24">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {cart.map((it) => {
                        const qtyOk = parsePositiveNumber(it.quantidadeStr) != null;
                        const isEmpty = it.quantidadeStr.trim().length === 0;

                        return (
                          <tr key={it.codProduto} className="hover:bg-emerald-50/30 transition-colors">
                            <td className="px-4 py-3 text-sm font-bold text-slate-800 whitespace-nowrap">
                              {it.codProduto}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[200px]" title={it.descricao}>
                              {it.descricao || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-slate-600 whitespace-nowrap">
                              {it.localizacao || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-slate-600 whitespace-nowrap">
                              {it.adLocalizacao || '-'}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={it.quantidadeStr}
                                onChange={handleChangeQty(it.codProduto)}
                                className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                  !isEmpty && !qtyOk 
                                    ? 'border-rose-300 bg-rose-50 text-rose-900 focus:ring-rose-500 focus:border-rose-500' 
                                    : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                                }`}
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleRemoveFromCart(it.codProduto)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                title="Remover item"
                              >
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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