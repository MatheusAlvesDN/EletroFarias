'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  FileText,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  RotateCw,
  ListCollapse,
  CalendarClock,
  Building2,
  BadgeDollarSign,
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';
import { usePersistedState } from '@/hooks/userPersistedState';
import { useRequireAuth } from '@/hooks/useRequireAuth';

type NotaFaturada = {
  nunota: number;
  numnota: number;
  dtneg: string;
  dtprevent: string;
  codemp: number;
  codparc: number;
  razaosocial: string;
  codtipoper: number;
  vlrnota: number;
  raw?: unknown;
};

const ROWS_PER_PAGE = 10;

const toStringSafe = (v: unknown): string => (v == null ? '' : String(v));

const toNumberSafe = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const normalized = v.replace(/\./g, '').replace(',', '.').trim();
    const n = Number(normalized);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
};

const getEmailFromJwt = (jwt: string | null): string | null => {
  if (!jwt) return null;

  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64.padEnd(
      payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4),
      '='
    );

    const jsonPayload = atob(padded);
    const payload = JSON.parse(jsonPayload) as {
      email?: string;
      userEmail?: string;
      sub?: string;
      [k: string]: unknown;
    };

    const email = (payload.email ?? payload.userEmail ?? payload.sub ?? '') as string;
    const cleaned = String(email).trim();
    return cleaned || null;
  } catch {
    return null;
  }
};

function formatDate(iso?: string | null) {
  if (!iso) return '-';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return String(iso);
  return dt.toLocaleDateString('pt-BR');
}

function formatCurrency(value?: number | null) {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return 'R$ 0,00';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(n);
}

function normalizeNotas(input: unknown): NotaFaturada[] {
  const arr: unknown[] = (() => {
    if (Array.isArray(input)) return input;

    if (input && typeof input === 'object') {
      const obj = input as Record<string, unknown>;

      if (Array.isArray(obj.data)) return obj.data;
      if (Array.isArray(obj.notas)) return obj.notas;
      if (Array.isArray(obj.items)) return obj.items;
      if (Array.isArray(obj.result)) return obj.result;
      if (Array.isArray(obj.rows)) return obj.rows;
    }

    return [];
  })();

  return arr
    .map((r) => {
      const rec = r && typeof r === 'object' ? (r as Record<string, unknown>) : {};

      const nunota = toNumberSafe(rec.NUNOTA ?? rec.nunota);
      const numnota = toNumberSafe(rec.NUMNOTA ?? rec.numnota);
      const dtneg = toStringSafe(rec.DTNEG ?? rec.dtneg).trim();
      const dtprevent = toStringSafe(rec.DTPREVENT ?? rec.dtprevent).trim();
      const codemp = toNumberSafe(rec.CODEMP ?? rec.codemp);
      const codparc = toNumberSafe(rec.CODPARC ?? rec.codparc);
      const razaosocial = toStringSafe(rec.RAZAOSOCIAL ?? rec.razaosocial).trim();
      const codtipoper = toNumberSafe(rec.CODTIPOPER ?? rec.codtipoper);
      const vlrnota = toNumberSafe(rec.VLRNOTA ?? rec.vlrnota ?? 0);

      if (!Number.isFinite(nunota) && !Number.isFinite(numnota)) return null;

      return {
        nunota: Number.isFinite(nunota) ? nunota : 0,
        numnota: Number.isFinite(numnota) ? numnota : 0,
        dtneg: dtneg || '',
        dtprevent: dtprevent || '',
        codemp: Number.isFinite(codemp) ? codemp : 0,
        codparc: Number.isFinite(codparc) ? codparc : 0,
        razaosocial: razaosocial || '-',
        codtipoper: Number.isFinite(codtipoper) ? codtipoper : 0,
        vlrnota: Number.isFinite(vlrnota) ? vlrnota : 0,
        raw: r,
      } as NotaFaturada;
    })
    .filter((x): x is NotaFaturada => !!x);
}

export default function Page() {
  const { token, ready, hasAccess } = useRequireAuth();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [items, setItems] = useState<NotaFaturada[]>([]);
  const [filtered, setFiltered] = useState<NotaFaturada[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [search, setSearch] = usePersistedState<string>('notas-top-faturadas:search', '');
  const [page, setPage] = useState(0);

  const [toastState, setToastState] = useState<{
    open: boolean;
    msg: string;
    type: 'success' | 'error';
  }>({
    open: false,
    msg: '',
    type: 'success',
  });

  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('authToken');
    setUserEmail(getEmailFromJwt(t));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.replace('/');
  };

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  // ajuste aqui o endpoint real
  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getNotasTopFaturadas` : `/sync/getNotasTopFaturadas`),
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
        throw new Error(msg || `Falha ao buscar notas (status ${resp.status})`);
      }

      const raw = (await resp.json()) as unknown;
      const normalized = normalizeNotas(raw);

      normalized.sort((a, b) => {
        const da = a.dtprevent ? new Date(a.dtprevent).getTime() : 0;
        const db = b.dtprevent ? new Date(b.dtprevent).getTime() : 0;

        if (db !== da) return db - da;

        return b.numnota - a.numnota;
      });

      setItems(normalized);
      setPage(0);
      toast('Lista carregada', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar notas';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, getHeaders, toast]);

  useEffect(() => {
    if (!ready || !hasAccess) return;
    if (token || API_TOKEN) fetchData();
  }, [ready, hasAccess, token, API_TOKEN, fetchData]);

  useEffect(() => {
    const q = search.trim().toUpperCase();

    const result = items.filter((it) => {
      if (!q) return true;

      return (
        String(it.nunota).includes(q) ||
        String(it.numnota).includes(q) ||
        String(it.codtipoper).includes(q) ||
        String(it.codemp).includes(q) ||
        String(it.codparc).includes(q) ||
        formatDate(it.dtneg).toUpperCase().includes(q) ||
        formatDate(it.dtprevent).toUpperCase().includes(q) ||
        (it.razaosocial ?? '').toUpperCase().includes(q) ||
        formatCurrency(it.vlrnota).toUpperCase().includes(q)
      );
    });

    setFiltered(result);
    setPage(0);
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageRows = filtered.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);

  const totalValor = useMemo(
    () => filtered.reduce((acc, item) => acc + (Number.isFinite(item.vlrnota) ? item.vlrnota : 0), 0),
    [filtered]
  );

  if (!ready || !hasAccess) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        title="Abrir Menu"
      >
        <Menu className="w-7 h-7" />
      </button>

      <SidebarMenu
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 opacity-90 text-emerald-100" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Painel Gerencial</h1>
                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                  Notas TOP Faturadas em Atraso
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <img
                src="/eletro_farias2.png"
                alt="Logo 1"
                className="h-16 w-auto object-contain bg-green/10 rounded px-2"
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

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in-up">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ListCollapse className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-xl font-bold text-emerald-900">Notas TOP 321, 200 e 92</h2>
                </div>
                <p className="text-sm text-slate-600 ml-8">
                  Notas com previsão de faturamento inferior à data atual
                </p>
              </div>

              <button
                onClick={fetchData}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCw className="w-4 h-4 text-emerald-600" />
                )}
                Atualizar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Total de Notas</span>
                </div>
                <div className="text-2xl font-extrabold text-slate-800">{filtered.length}</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <BadgeDollarSign className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Valor Total</span>
                </div>
                <div className="text-2xl font-extrabold text-slate-800">{formatCurrency(totalValor)}</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <CalendarClock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Filtro</span>
                </div>
                <div className="text-sm font-semibold text-slate-700">DTPREVENT menor que hoje</div>
              </div>
            </div>

            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por nota, nro. único, parceiro, TOP, empresa, data ou valor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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

          <div className="p-0 bg-slate-50/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                <span className="text-sm font-bold">Carregando notas...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-b border-slate-100">
                <Search className="w-12 h-12 text-slate-300 mb-3" />
                <span className="text-sm font-medium">Nenhuma nota encontrada.</span>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-emerald-50/80 border-b border-emerald-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Nro. Único
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Nota
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Data Negociação
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Prev. Faturamento
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Parceiro
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        TOP
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Valor da Nota
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pageRows.map((nota) => (
                      <tr key={`${nota.nunota}-${nota.numnota}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-700">
                          {nota.nunota || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">
                          {nota.numnota || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {formatDate(nota.dtneg)}
                        </td>
                        <td className="px-4 py-3 text-sm text-rose-700 font-semibold whitespace-nowrap">
                          {formatDate(nota.dtprevent)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <div className="flex items-start gap-2">
                            <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{nota.razaosocial || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md shadow-sm border border-slate-200 text-xs font-bold text-slate-700">
                            {nota.codtipoper || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right tabular-nums font-bold text-slate-800 whitespace-nowrap">
                          {formatCurrency(nota.vlrnota)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

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

      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-in-out ${
          toastState.open ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm ${
            toastState.type === 'success'
              ? 'bg-emerald-600 border border-emerald-500'
              : 'bg-rose-600 border border-rose-500'
          }`}
        >
          {toastState.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}

          {toastState.msg}

          <button
            onClick={() => setToastState((s) => ({ ...s, open: false }))}
            className="ml-2 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
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