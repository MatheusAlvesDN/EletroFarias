'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Server,
  Loader2,
  AlertCircle,
  Menu,
  CheckCircle2,
  X,
  FileWarning,
  RefreshCcw,
  Search
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

// --- Tipagens ---
export interface NotaPendenteRow {
  nunota: number;
  numnota: number;
  dtneg: string;
  dtprevent: string;
  codemp: number;
  codparc: number;
  razaosocial: string;
  codtipoper: number;
  vlrnota: number;
}

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
  roles?: string[];
  exp?: number;
  iat?: number;
};

// --- Funções Auxiliares ---
function decodeJwtEmail(token: string | null): string | null {
  if (!token || typeof window === 'undefined') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const json = window.atob(base64);
    const parsed = JSON.parse(json) as JwtPayload;
    return (parsed.email as string) ?? (parsed.sub as string) ?? null;
  } catch {
    return null;
  }
}

const FormatCurrencyExcel = ({
  value,
  forceRed = false,
  colorClass
}: {
  value: number;
  forceRed?: boolean;
  colorClass?: string;
}) => {
  const isNegative = value < 0;
  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value));

  let finalClass = isNegative || forceRed ? 'text-rose-600 font-bold' : 'text-slate-700 font-medium';
  if (colorClass) finalClass = `${colorClass} font-bold`;

  return (
    <span className={finalClass}>
      {isNegative ? `-R$ ${formatted.replace('R$', '').trim()}` : formatted}
    </span>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function NotasPendentesPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [data, setData] = useState<NotaPendenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtro de busca local
  const [searchTerm, setSearchTerm] = useState('');

  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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

  const toast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, open: false }));
    }, 4000);
  };

  const fetchNotas = async () => {
    setLoading(true);
    setError(null);

    try {
      const resp = await fetch(`${API_BASE}/expedicao/notas-pendentes`);

      if (!resp.ok) {
        throw new Error('Falha ao buscar as notas pendentes.');
      }

      const json: NotaPendenteRow[] = await resp.json();
      setData(Array.isArray(json) ? json : []);
      
      // Só exibe o toast de sucesso se foi um refresh manual (data já tinha itens)
      if (data.length > 0) {
        toast('Dados atualizados com sucesso.', 'success');
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão.');
      toast(err.message || 'Erro na consulta', 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Busca inicial e auto-refresh
  useEffect(() => {
    fetchNotas();
    const interval = setInterval(fetchNotas, 60000); // 1 minuto
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE]);

  // Aplica o filtro de busca localmente
  const notasFiltradas = useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(
      (n) =>
        n.razaosocial.toLowerCase().includes(lower) ||
        String(n.numnota).includes(lower) ||
        String(n.nunota).includes(lower)
    );
  }, [data, searchTerm]);

  // Cálculo do totalizador com base nas notas filtradas
  const valorTotal = notasFiltradas.reduce((acc, nota) => acc + nota.vlrnota, 0);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
      {/* Botão do Menu Mobile/Sidebar */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-emerald-800 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        title="Abrir Menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} userEmail={userEmail} onLogout={handleLogout} />

      {/* Header */}
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 opacity-90 text-emerald-100" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Painel Gerencial</h1>
                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">Top 600 Faturadas</p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <img
                src="/eletro_farias2.png"
                alt="Logo 1"
                className="h-16 w-auto object-contain bg-green/10 rounded px-2"
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

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 animate-fade-in-up">
        
        {/* Controle e Busca */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" /> Buscar na lista
              </label>
              <input
                type="text"
                placeholder="Pesquisar por Nro. Nota ou Parceiro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-sm text-slate-700"
              />
            </div>
            <button
              onClick={fetchNotas}
              disabled={loading}
              className="w-full lg:w-auto px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 h-[42px] shrink-0"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
              <span>{loading ? 'Atualizando...' : 'Atualizar Dados'}</span>
            </button>
          </div>
        </div>

        {/* Alerta de Erro */}
        {error && data.length === 0 && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex gap-3 shadow-sm mb-6 animate-fade-in-up">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-800 text-sm">Erro de conexão</p>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {/* Tabela de Notas */}
        <div className="flex flex-col gap-6 animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-emerald-200 text-emerald-600">
                  <FileWarning className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-emerald-900 uppercase tracking-wide">Notas TOP 600 Faturadas</h2>
                  <p className="text-[10px] sm:text-xs text-emerald-700/70 font-bold uppercase tracking-wider mt-0.5">
                    TOPs 321, 200 e 92 com data de faturamento inferior à atual
                  </p>
                </div>
              </div>
              <div className="hidden sm:block">
                 <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-3 py-1 rounded-md uppercase tracking-wide">
                   {notasFiltradas.length} Registro(s)
                 </span>
              </div>
            </div>

            <div className="overflow-x-auto p-0 custom-table-scroll">
              <table className="w-full border-collapse text-xs font-medium font-sans min-w-[900px]">
                <colgroup>
                  <col className="w-[100px]" />
                  <col className="w-[100px]" />
                  <col className="w-[120px]" />
                  <col className="w-auto" />
                  <col className="w-[80px]" />
                  <col className="w-[120px]" />
                  <col className="w-[150px]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-100/50">
                    <th className="border-b border-r border-slate-200 p-3 text-center font-bold text-[10px] uppercase tracking-wider text-slate-600">Nro. Único</th>
                    <th className="border-b border-r border-slate-200 p-3 text-center font-bold text-[10px] uppercase tracking-wider text-slate-600">Nota</th>
                    <th className="border-b border-r border-slate-200 p-3 text-center font-bold text-[10px] uppercase tracking-wider text-slate-600">Data Negoc.</th>
                    <th className="border-b border-r border-slate-200 p-3 text-left font-bold text-[10px] uppercase tracking-wider text-slate-600">Parceiro</th>
                    <th className="border-b border-r border-slate-200 p-3 text-center font-bold text-[10px] uppercase tracking-wider text-slate-600">TOP</th>
                    <th className="border-b border-r border-slate-200 p-3 text-center font-bold text-[10px] uppercase tracking-wider text-rose-700">Prev. Fat.</th>
                    <th className="border-b border-slate-200 p-3 text-right font-bold text-[10px] uppercase tracking-wider text-slate-600">Valor da Nota</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {loading && data.length === 0 ? (
                     <tr>
                       <td colSpan={7} className="border-b border-slate-200 p-12 text-center text-emerald-600">
                         <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="font-bold text-sm tracking-wide">Buscando notas...</span>
                         </div>
                       </td>
                     </tr>
                  ) : notasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border-b border-slate-200 p-8 text-center text-slate-400 italic">
                        Nenhuma nota encontrada.
                      </td>
                    </tr>
                  ) : (
                    notasFiltradas.map((nota) => (
                      <tr key={nota.nunota} className="hover:bg-slate-50/70 transition-colors">
                        <td className="border-b border-r border-slate-200 px-3 py-2 text-center font-mono text-slate-500">{nota.nunota}</td>
                        <td className="border-b border-r border-slate-200 px-3 py-2 text-center font-mono font-bold text-emerald-700">{nota.numnota}</td>
                        <td className="border-b border-r border-slate-200 px-3 py-2 text-center text-slate-600">{nota.dtneg}</td>
                        <td className="border-b border-r border-slate-200 px-3 py-2 text-left truncate text-slate-700 font-bold max-w-[300px]" title={nota.razaosocial}>
                          {nota.razaosocial}
                        </td>
                        <td className="border-b border-r border-slate-200 px-3 py-2 text-center">
                           <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                              {nota.codtipoper}
                           </span>
                        </td>
                        <td className="border-b border-r border-slate-200 px-3 py-2 text-center font-medium text-rose-600 bg-rose-50/20">{nota.dtprevent}</td>
                        <td className="border-b border-slate-200 px-3 py-2 text-right tabular-nums bg-slate-50/30">
                          <FormatCurrencyExcel value={nota.vlrnota} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {notasFiltradas.length > 0 && (
                  <tfoot className="bg-slate-50 border-t border-slate-300">
                    <tr>
                      <td colSpan={6} className="border-r border-slate-200 px-3 py-3 text-right font-black text-slate-800 uppercase tracking-widest">
                        TOTAL
                      </td>
                      <td className="px-3 py-3 text-right font-black tabular-nums bg-slate-100/80 text-sm">
                        <FormatCurrencyExcel value={valorTotal} colorClass="text-emerald-800" />
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Toasts */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-in-out ${
          toastState.open ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm ${
            toastState.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'
          }`}
        >
          {toastState.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toastState.msg}
          <button
            type="button"
            onClick={() => setToastState((s) => ({ ...s, open: false }))}
            className="ml-2 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Estilos Globais */}
      <style jsx global>{`
        .custom-table-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-table-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-table-scroll::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        @keyframes fadeInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}