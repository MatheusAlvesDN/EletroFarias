'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Server,
  Search,
  Package,
  MapPin,
  ClipboardList,
  Save,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  PackageSearch
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

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

const MAX_LOC = 15;

export default function Page() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Estados do formulário e dados
  const [cod, setCod] = useState<string>('');
  const [produto, setProduto] = useState<Produto | null>(null);
  const [localizacao, setLocalizacao] = useState<string>('');
  const [adLocalizacao, setAdLocalizacao] = useState<string>('');
  const [contagem, setContagem] = useState<string>('');
  
  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Simulação de loading para envio
  
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
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('authToken');
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);

    // Extrair email do JWT
    try {
      const parts = t.split('.');
      if (parts.length >= 2) {
        const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = atob(payloadBase64);
        const payload = JSON.parse(jsonPayload) as { email?: string; userEmail?: string; sub?: string };
        const emailFromJwt = payload.email ?? payload.userEmail ?? payload.sub ?? null;
        if (emailFromJwt) setUserEmail(emailFromJwt);
      }
    } catch (e) {
      console.error('Erro ao decodificar JWT:', e);
    }
  }, [router]);

  // APIs
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const GET_URL = (id: string) =>
    API_BASE
      ? `${API_BASE}/sync/getProductLocation?id=${encodeURIComponent(id)}`
      : `/sync/getProductLocation?id=${encodeURIComponent(id)}`;

  const ADDCOUNT_URL = API_BASE ? `${API_BASE}/sync/addCount` : `/sync/addCount`;

  // Sincronizar localização editável quando produto muda
  useEffect(() => {
    setLocalizacao((produto?.LOCALIZACAO ?? '').toString().slice(0, MAX_LOC));
    setAdLocalizacao((produto?.AD_LOCALIZACAO ?? '').toString().slice(0, MAX_LOC));
  }, [produto]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Helpers
  const toNum = (v: unknown) => {
    if (v == null) return 0;
    if (typeof v === 'string') {
      const parsed = Number(v.replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const reservadoTotal = useMemo(() => {
    if (!produto?.estoque || produto.estoque.length === 0) return 0;
    return produto.estoque.reduce((acc, item) => acc + toNum(item.RESERVADO), 0);
  }, [produto?.estoque]);

  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, open: false }));
    }, 4000);
  }, []);

  // Handlers
  const handleBuscar = async () => {
    setToastState(p => ({ ...p, open: false }));
    setProduto(null);
    setContagem('');

    const clean = cod.trim();
    if (!clean) return toast('Informe o código do produto.', 'error');
    if (!/^\d+$/.test(clean)) return toast('O código deve conter apenas números.', 'error');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(GET_URL(clean), {
        method: 'GET',
        headers,
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
      // @ts-expect-error Abort check
      if (e?.name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'Erro ao buscar produto';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarContagem = async () => {
    if (!produto?.CODPROD) return toast('Busque um produto antes de lançar a contagem.', 'error');
    if (!contagem.trim()) return toast('Informe a contagem.', 'error');

    const valor = Number(contagem.replace(',', '.'));
    if (!Number.isFinite(valor)) return toast('Contagem inválida.', 'error');

    const codProdNum = Number(produto.CODPROD);
    if (!Number.isFinite(codProdNum)) return toast('CODPROD inválido.', 'error');

    setIsSaving(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const body = {
        codProd: codProdNum,
        contagem: valor,
        descricao: produto.DESCRPROD ?? '',
        localizacao: produto.LOCALIZACAO?.toString() ?? '',
        ad_localizacao: produto.AD_LOCALIZACAO?.toString() ?? '',
        reservado: reservadoTotal,
      };

      const resp = await fetch(ADDCOUNT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao enviar contagem (status ${resp.status})`);
      }

      toast('Contagem enviada com sucesso!', 'success');
      setContagem('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar contagem.';
      toast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApagarBusca = useCallback(() => {
    setCod('');
    setProduto(null);
    setContagem('');
    setToastState(p => ({ ...p, open: false }));
  }, []);

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
                  Controle de Estoque &amp; Inventário
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
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 animate-fade-in-up">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Cabeçalho do Card */}
          <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
            <div className="flex items-center gap-2 mb-4">
              <PackageSearch className="w-6 h-6 text-emerald-600" />
              <h2 className="text-xl font-bold text-emerald-900">Buscar Produto</h2>
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

              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={handleBuscar}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                </button>

                <button
                  onClick={handleApagarBusca}
                  disabled={!cod && !produto}
                  className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-300 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 text-slate-600 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar
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
                <div className="w-full md:w-64 h-64 bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center shrink-0 shadow-sm">
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

                {/* Info */}
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cód. Prod</label>
                      <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                        {produto.CODPROD ?? '-'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Marca</label>
                      <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                        {produto.MARCA ?? '-'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
                    <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                      {produto.DESCRPROD ?? '-'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome Comercial (PDV)</label>
                    <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                      {produto.AD_NOMEPRDLV ?? '-'}
                    </div>
                  </div>

                  {/* Localização (Visualização Apenas) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Localização 1
                      </label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-mono font-medium text-slate-700">
                        {localizacao || '-'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Localização 2
                      </label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-mono font-medium text-slate-700">
                        {adLocalizacao || '-'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Características</label>
                    <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 min-h-[60px]">
                      {produto.CARACTERISTICAS || '-'}
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reservado Total</label>
                    <div className="px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm font-bold w-full sm:w-1/3">
                      {reservadoTotal}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção de Contagem */}
              <div className="mt-8 border-t border-slate-200 pt-6">
                <div className="flex items-center gap-2 mb-4 text-emerald-800">
                  <ClipboardList className="w-5 h-5" />
                  <h3 className="text-lg font-bold">Lançar Contagem</h3>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="w-full sm:flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quantidade Contada</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={contagem}
                      onChange={(e) => setContagem(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                    />
                  </div>
                  
                  <button
                    onClick={handleEnviarContagem}
                    disabled={!contagem.trim() || isSaving}
                    className="w-full sm:w-auto px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Enviar Contagem
                  </button>
                </div>
              </div>
            </div>
          )}
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