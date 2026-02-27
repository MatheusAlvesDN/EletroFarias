'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
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
  MapPin,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Save,
  PackageX
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

type NotFoundItem = {
  id: string;
  localizacao: string;
  codProdFaltando: number[];
  codProdContados: number[];
};

function normalizeLoc(loc?: string | null): string {
  return (loc || 'SEM LOCALIZAÇÃO').toString().toUpperCase();
}

function parseLocNumber(loc: string): number | null {
  const m = loc.match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function getStockTab(loc: string): 'A' | 'B' | 'C' | 'D' | 'E' | 'SEM LOCALIZAÇÃO' {
  const l = normalizeLoc(loc);
  const first = l[0];
  if (first === 'A' || first === 'B' || first === 'C' || first === 'D' || first === 'E') return first;
  return 'SEM LOCALIZAÇÃO';
}

const TAB_ORDER: Array<'A' | 'B' | 'C' | 'D' | 'E' | 'SEM LOCALIZAÇÃO'> = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'SEM LOCALIZAÇÃO',
];

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [notFoundList, setNotFoundList] = useState<NotFoundItem[]>([]);
  const [filter, setFilter] = useState<string>('');

  // Toast Customizado
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  const [selectedLoc, setSelectedLoc] = useState<NotFoundItem | null>(null);
  const [countInputs, setCountInputs] = useState<Record<number, string>>({});
  const [sendingCod, setSendingCod] = useState<number | null>(null);

  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  const [activeTab, setActiveTab] = useState<(typeof TAB_ORDER)[number]>('A');

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const NOTFOUND_LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/notFoundList` : `/sync/notFoundList`),
    [API_BASE]
  );

  const NOTFOUND_SYNC_FULL_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/notFoundListFull` : `/sync/notFoundListFull`),
    [API_BASE]
  );

  const ADD_COUNT2_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/addCount2` : `/sync/addCount2`), [API_BASE]);

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    []
  );

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t && !API_TOKEN) {
      router.replace('/');
      return;
    }
    setToken(t ?? null);
  }, [router, API_TOKEN]);

  const buildHeaders = useCallback(() => {
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

  const fetchNotFound = useCallback(async () => {
    const canFetch = !!token || !!API_TOKEN;
    if (!canFetch) return;

    setErro(null);
    setLoading(true);

    try {
      const resp = await fetch(NOTFOUND_LIST_URL, {
        method: 'GET',
        headers: buildHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao carregar NotFound (status ${resp.status})`);
      }

      const data = (await resp.json()) as NotFoundItem[] | null;
      const list = Array.isArray(data) ? data : [];

      const normalizedList: NotFoundItem[] = list
        .map((n) => ({
          ...n,
          localizacao: normalizeLoc(n.localizacao),
          codProdFaltando: n.codProdFaltando ?? [],
          codProdContados: n.codProdContados ?? [],
        }))
        .filter((n) => (n.codProdFaltando?.length ?? 0) > 0);

      normalizedList.sort((a, b) => {
        const an = parseLocNumber(a.localizacao);
        const bn = parseLocNumber(b.localizacao);

        if (an == null && bn == null) return a.localizacao.localeCompare(b.localizacao, 'pt-BR');
        if (an == null) return 1;
        if (bn == null) return -1;

        if (an !== bn) return an - bn;
        return a.localizacao.localeCompare(b.localizacao, 'pt-BR');
      });

      setNotFoundList(normalizedList);
      setPage(0);

      setSelectedLoc((prev) => {
        if (!prev) return null;
        const stillExists = normalizedList.some((n) => n.id === prev.id);
        if (!stillExists) {
          setCountInputs({});
          return null;
        }
        return prev;
      });

      toast(`Encontradas ${normalizedList.length} localizações com produtos faltando.`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar NotFound.';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, API_TOKEN, NOTFOUND_LIST_URL, buildHeaders, toast]);

  useEffect(() => {
    fetchNotFound();
  }, [fetchNotFound]);

  const tabCounts = useMemo(() => {
    const counts: Record<(typeof TAB_ORDER)[number], number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
      'SEM LOCALIZAÇÃO': 0,
    };

    for (const n of notFoundList) counts[getStockTab(n.localizacao)] += 1;
    return counts;
  }, [notFoundList]);

  const filteredLocs = useMemo(() => {
    const f = filter.trim().toUpperCase();
    return notFoundList.filter((n) => {
      if (getStockTab(n.localizacao) !== activeTab) return false;
      if (!f) return true;
      return n.localizacao.includes(f);
    });
  }, [filter, notFoundList, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredLocs.length / rowsPerPage));
  const pagedLocs = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredLocs.slice(start, start + rowsPerPage);
  }, [filteredLocs, page]);

  useEffect(() => {
    setPage(0);
    if (selectedLoc) {
      const stillExists = filteredLocs.some((x) => x.id === selectedLoc.id);
      if (!stillExists) {
        setSelectedLoc(null);
        setCountInputs({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, activeTab]);

  const handleConferir = useCallback(async () => {
    const canFetch = !!token || !!API_TOKEN;
    if (!canFetch) return;

    setErro(null);
    setLoading(true);

    try {
      const resp = await fetch(NOTFOUND_SYNC_FULL_URL, {
        method: 'POST',
        headers: buildHeaders(),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao sincronizar NotFound (status ${resp.status})`);
      }

      await fetchNotFound();

      toast('CONFERÊNCIA concluída e NotFound atualizado.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao executar CONFERIR em NotFound.';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, API_TOKEN, NOTFOUND_SYNC_FULL_URL, fetchNotFound, buildHeaders, toast]);

  const toggleExibir = useCallback((nf: NotFoundItem) => {
    setSelectedLoc((prev) => (prev && prev.id === nf.id ? null : nf));
    setCountInputs({});
  }, []);

  const handleChangeCountInput = (cod: number, value: string) => {
    setCountInputs((prev) => ({ ...prev, [cod]: value }));
  };

  const handleContar = async (codProd: number) => {
    if (!selectedLoc) return;

    const raw = countInputs[codProd];
    const contagem = Number(raw);

    if (!raw || Number.isNaN(contagem)) {
      setErro('Informe uma quantidade numérica válida.');
      toast('Informe uma quantidade numérica válida.', 'error');
      return;
    }

    const canFetch = !!token || !!API_TOKEN;
    if (!canFetch) return;

    setSendingCod(codProd);
    setErro(null);

    try {
      const body = {
        codProd,
        contagem,
        descricao: '',
        localizacao: selectedLoc.localizacao,
        reservado: 0,
      };

      const resp = await fetch(ADD_COUNT2_URL, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao registrar contagem (status ${resp.status})`);
      }

      toast(`Contagem registrada para o produto ${codProd} na localização ${selectedLoc.localizacao}.`, 'success');

      setCountInputs((prev) => {
        const next = { ...prev };
        delete next[codProd];
        return next;
      });

      await fetchNotFound();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar contagem.';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setSendingCod(null);
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.replace('/');
  };

  // Extrair email apenas para passar ao menu
  const userEmail = typeof window !== 'undefined' ? (localStorage.getItem('authToken') ? 'Usuário Logado' : null) : null;

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
                  Produtos Faltando (NotFound)
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <PackageX className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-xl font-bold text-emerald-900">Produtos Faltando por Localização</h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium ml-8">
                  <span>Total de locais com divergência: {filteredLocs.length}</span>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={fetchNotFound}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4 text-emerald-600" />}
                  Atualizar
                </button>
                <button
                  type="button"
                  onClick={handleConferir}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                  CONFERIR
                </button>
              </div>
            </div>

            {/* Abas de Localização (Tabs) */}
            <div className="flex overflow-x-auto border-b border-slate-200 mb-4 scrollbar-thin scrollbar-thumb-slate-300 pb-1">
              {TAB_ORDER.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition-all mr-1 ${
                    activeTab === tab 
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'SEM LOCALIZAÇÃO' ? 'SEM LOC.' : `Setor ${tab}`} 
                  <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${
                    activeTab === tab ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tabCounts[tab]}
                  </span>
                </button>
              ))}
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar localização..."
                value={filter}
                onChange={(e) => setFilter(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow uppercase"
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
                <span className="text-sm font-bold">Carregando lista...</span>
              </div>
            ) : filteredLocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-b border-slate-100">
                <Search className="w-12 h-12 text-slate-300 mb-3" />
                <span className="text-sm font-medium">Nenhuma localização encontrada neste setor.</span>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-emerald-50/80 border-b border-emerald-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Localização
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Qtd. produtos faltando
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap w-32">
                        Produtos faltando
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pagedLocs.map((nf) => {
                      const qtd = nf.codProdFaltando?.length ?? 0;
                      const isOpen = !!selectedLoc && selectedLoc.id === nf.id;

                      return (
                        <React.Fragment key={nf.id}>
                          {/* Linha Principal */}
                          <tr className={`transition-colors ${isOpen ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                            <td className="px-4 py-3 text-sm font-mono font-bold text-slate-700 whitespace-nowrap">
                              {nf.localizacao}
                            </td>
                            <td className="px-4 py-3 text-sm text-right tabular-nums font-medium text-slate-600">
                              {numberFormatter.format(qtd)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleExibir(nf);
                                }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                                  isOpen 
                                    ? 'bg-slate-200 border-slate-300 text-slate-700' 
                                    : 'bg-white border-emerald-600 text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                {isOpen ? (
                                  <>Fechar <ChevronUp className="w-3.5 h-3.5" /></>
                                ) : (
                                  <>Exibir <ChevronDown className="w-3.5 h-3.5" /></>
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Linha Expandida */}
                          {isOpen && (
                            <tr>
                              <td colSpan={3} className="p-0 bg-slate-50 border-b border-slate-200 shadow-inner">
                                <div className="p-4 sm:p-6 animate-fade-in-up">
                                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5">
                                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                                      <MapPin className="w-5 h-5 text-emerald-600" />
                                      <h4 className="text-sm font-bold text-slate-800">
                                        Produtos faltando em: <span className="font-mono text-emerald-700">{selectedLoc.localizacao}</span>
                                      </h4>
                                    </div>
                                    
                                    {(selectedLoc.codProdFaltando.length ?? 0) === 0 ? (
                                      <div className="p-4 text-sm text-slate-500 italic text-center">
                                        Nenhum produto faltando listado.
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                        <table className="min-w-full divide-y divide-slate-100">
                                          <thead className="bg-slate-50/50">
                                            <tr>
                                              <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cód. Produto</th>
                                              <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider w-32">Qtd. contada</th>
                                              <th className="px-4 py-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider w-24">Ação</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-50">
                                            {selectedLoc.codProdFaltando.map((cod) => (
                                              <tr key={cod} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2 text-sm font-bold text-slate-700">{cod}</td>
                                                <td className="px-4 py-2">
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="Qtd"
                                                    value={countInputs[cod] ?? ''}
                                                    onChange={(e) => handleChangeCountInput(cod, e.target.value)}
                                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                                  />
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      handleContar(cod);
                                                    }}
                                                    disabled={sendingCod === cod}
                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50 ml-auto min-w-[80px]"
                                                  >
                                                    {sendingCod === cod ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                    Contar
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
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
            {filteredLocs.length > 0 && (
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