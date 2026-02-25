'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  AlertTriangle,
  History,
  User,
  CalendarDays,
  Boxes,
  Eye,
  ClipboardCheck
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

// ============================================================================
// TIPAGENS
// ============================================================================
type ErroEstoque = {
  id: string;
  codProd: number;
  descricao: string;
  createdAt: string;
  userCreate: string;
  resolvido: boolean;
  resposta?: string | null;
  userResolve?: string | null;
  resolvedAt?: string | null;
};

type Auditoria = {
  id: string;
  codProd: number;
  descricao: string;
  createdAt: string;
  count: number;
  inStock: number;
  userEmail: string;
  reservado: number;
  diferenca: number;
};

// ============================================================================
// FUNÇÕES UTILITÁRIAS GLOBAIS
// ============================================================================
function formatDateTimeBR(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isSameDate(isoA?: string | null, isoB?: string | null) {
  if (!isoA || !isoB) return false;
  const dA = new Date(isoA);
  const dB = new Date(isoB);
  if (Number.isNaN(dA.getTime()) || Number.isNaN(dB.getTime())) return false;
  return dA.toLocaleDateString('pt-BR') === dB.toLocaleDateString('pt-BR');
}

function getEmailFromJwt(token: string | null): string | null {
  if (!token || typeof window === 'undefined') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const json = window.atob(base64);
    const parsed = JSON.parse(json);
    return parsed?.email ?? parsed?.userEmail ?? parsed?.sub ?? null;
  } catch {
    return null;
  }
}

const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));


// ============================================================================
// COMPONENTE: ESTATÍSTICAS
// ============================================================================
const StatCard = ({ label, value, colorClass, icon, bgIconClass, textIconClass }: { label: string; value: number; colorClass: string; icon: React.ReactNode; bgIconClass: string; textIconClass: string; }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${bgIconClass} ${textIconClass}`}>
      {icon}
    </div>
    <div>
      <div className={`text-2xl font-black ${colorClass}`}>
        {value}
      </div>
      <div className="text-sm font-bold text-slate-500">
        {label}
      </div>
    </div>
  </div>
);


// ============================================================================
// MODAL DE DETALHES E AUDITORIAS
// ============================================================================
function ErroDetalhesDialog({
  open,
  onClose,
  erro,
  apiBase,
  getHeaders,
}: {
  open: boolean;
  onClose: () => void;
  erro: ErroEstoque | null;
  apiBase: string;
  getHeaders: () => Record<string, string>;
}) {
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);

  useEffect(() => {
    if (open && erro) {
      const fetchRelatedAudits = async () => {
        if (!erro.resolvido || !erro.userResolve || !erro.resolvedAt) {
            setAuditorias([]);
            return;
        }

        setLoadingAudits(true);
        try {
          const url = `${apiBase}/sync/getAllAuditorias`; 
          const res = await fetch(url, { method: 'GET', headers: getHeaders() });
          if (res.ok) {
            const allAudits: Auditoria[] = await res.json();
            const filtered = allAudits
                .filter(a => 
                    a.codProd === erro.codProd &&
                    a.userEmail === erro.userResolve && 
                    isSameDate(a.createdAt, erro.resolvedAt)
                )
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setAuditorias(filtered);
          }
        } catch (e) {
          console.error("Erro ao buscar auditorias", e);
        } finally {
          setLoadingAudits(false);
        }
      };
      fetchRelatedAudits();
    } else {
      setAuditorias([]);
    }
  }, [open, erro, apiBase, getHeaders]);

  if (!open || !erro) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-full flex flex-col overflow-hidden">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Detalhes da Inconsistência
            </h2>
            {erro.resolvido ? (
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 text-xs">
                <CheckCircle2 className="w-3 h-3" /> Resolvido
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200 text-xs">
                <AlertCircle className="w-3 h-3" /> Pendente
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Modal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/50">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Coluna Esquerda: Produto e Info do Erro */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
                <div className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-center mb-4">
                  <img 
                    src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${erro.codProd}.dbimage`} 
                    alt="Produto"
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2JkNWUxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiPjwvcmVjdD48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSI+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSI+PC9wb2x5bGluZT48L3N2Zz4=';
                      (e.target as HTMLImageElement).className = 'w-16 h-16 opacity-40';
                    }}
                  />
                </div>
                <h3 className="font-black text-2xl text-slate-800">{erro.codProd}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Cód. Produto</p>
                
                <hr className="border-slate-100 mb-4" />

                <div className="text-left space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Reportado por</span>
                    <div className="flex items-center gap-2 text-sm text-slate-700 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <User className="w-4 h-4 text-slate-400" /> {erro.userCreate}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Data da ocorrência</span>
                    <div className="flex items-center gap-2 text-sm text-slate-700 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <CalendarDays className="w-4 h-4 text-slate-400" /> {formatDateTimeBR(erro.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-left p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3" /> Descrição do Problema
                  </span>
                  <p className="text-sm font-medium text-amber-900 leading-relaxed">
                    {erro.descricao}
                  </p>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Resolução e Auditorias */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Box de Resolução */}
              {erro.resolvido && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-emerald-900 mb-4 flex items-center gap-2 border-b border-emerald-100 pb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Informações da Solução
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Resolvido por</span>
                      <div className="text-sm font-medium text-slate-800">{erro.userResolve || '-'}</div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data da Solução</span>
                      <div className="text-sm font-medium text-slate-800">{formatDateTimeBR(erro.resolvedAt)}</div>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nota de Resolução</span>
                    <div className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-emerald-100 italic">
                      {erro.resposta || 'Sem observações adicionais.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Tabela de Auditoria Relacionada */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" /> Auditoria de Resolução
                  </h3>
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {auditorias.length} registros
                  </span>
                </div>

                <div className="flex-1 overflow-auto bg-slate-50/30">
                  {loadingAudits ? (
                    <div className="flex items-center justify-center p-8 gap-2 text-slate-500 font-medium text-sm">
                      <Loader2 className="w-5 h-5 animate-spin" /> Carregando auditorias...
                    </div>
                  ) : !erro.resolvido ? (
                    <div className="p-8 text-center text-slate-500 text-sm italic">
                      O erro ainda não foi resolvido, portanto não há auditoria vinculada a esta correção.
                    </div>
                  ) : auditorias.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm italic">
                      Nenhuma contagem de auditoria encontrada para <b className="text-slate-700">{erro.userResolve}</b> na data da resolução.
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-5 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data</th>
                          <th className="px-5 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Auditor</th>
                          <th className="px-5 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contagem</th>
                          <th className="px-5 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estoque Sist.</th>
                          <th className="px-5 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Diferença</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {auditorias.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-2.5 text-xs text-slate-600 whitespace-nowrap">{formatDateTimeBR(a.createdAt)}</td>
                            <td className="px-5 py-2.5 text-xs font-mono text-slate-700">{a.userEmail}</td>
                            <td className="px-5 py-2.5 text-sm text-right tabular-nums font-bold text-slate-800">{a.count}</td>
                            <td className="px-5 py-2.5 text-sm text-right tabular-nums text-slate-600">{a.inStock}</td>
                            <td className="px-5 py-2.5 text-right">
                              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold border ${
                                a.diferenca === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {a.diferenca > 0 ? `+${a.diferenca}` : a.diferenca}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================
export default function ErroEstoquePage() {
  const router = useRouter();
  const [data, setData] = useState<ErroEstoque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para filtro
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDENTES' | 'RESOLVIDOS'>('PENDENTES');
  
  // Sidebar e Modais
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openAjuste, setOpenAjuste] = useState(false);
  const [selected, setSelected] = useState<ErroEstoque | null>(null);
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null);

  // Feedback Snackbar
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success',
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Autenticação
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);
    setUserEmail(getEmailFromJwt(t));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.replace('/');
  };

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const GET_ALL_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getAllErroEstoque` : `/sync/getAllErroEstoque`),
    [API_BASE],
  );

  const FINALIZAR_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/finalizarErroEstoque` : `/sync/finalizarErroEstoque`),
    [API_BASE],
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

  const fetchErros = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      setError(null);
      setIsLoading(true);

      const res = await fetch(GET_ALL_URL, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
        signal: ac.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Erro HTTP ${res.status}`);
      }

      const json = (await res.json()) as ErroEstoque[];
      if (!mountedRef.current) return;

      const sorted = [...(json ?? [])].sort((a, b) => {
        if (a.resolvido !== b.resolvido) return a.resolvido ? 1 : -1;
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return db - da;
      });

      setData(sorted);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setError(e?.message || 'Falha ao buscar erros de estoque.');
    } finally {
      if (!mountedRef.current) return;
      setIsLoading(false);
    }
  }, [GET_ALL_URL, getHeaders]);

  useEffect(() => {
    mountedRef.current = true;
    if (token || API_TOKEN) fetchErros();
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [fetchErros, token, API_TOKEN]);

  const handleFinalizar = useCallback(
    async (row: ErroEstoque) => {
      try {
        setFinalizandoId(row.id);

        const res = await fetch(FINALIZAR_URL, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ id: row.id }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(txt || `Erro HTTP ${res.status}`);
        }

        toast('Erro finalizado com sucesso.', 'success');
        await fetchErros();
      } catch (e: any) {
        toast(e?.message || 'Falha ao finalizar.', 'error');
      } finally {
        setFinalizandoId(null);
      }
    },
    [FINALIZAR_URL, fetchErros, getHeaders, toast],
  );

  const openAjusteFor = (row: ErroEstoque) => {
    setSelected(row);
    setOpenAjuste(true);
  };

  const closeAjuste = () => {
    setOpenAjuste(false);
    setSelected(null);
  };

  const counts = useMemo(() => {
    const total = data.length;
    const pend = data.filter((x) => !x.resolvido).length;
    const res = total - pend;
    return { total, pend, res };
  }, [data]);

  const filteredData = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return data.filter((x) => {
      if (statusFilter === 'PENDENTES' && x.resolvido) return false;
      if (statusFilter === 'RESOLVIDOS' && !x.resolvido) return false;

      if (!needle) return true;

      const hay = [x.id, String(x.codProd ?? ''), x.descricao ?? '', x.userCreate ?? '', x.userResolve ?? '']
        .join(' ')
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [data, q, statusFilter]);

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
                  Tratativa de Erros de Estoque
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
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-8 animate-fade-in-up">
        
        {/* Cabecalho e Estatísticas */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">Monitoramento de Inconsistências</h2>
            <p className="text-sm font-medium text-slate-500">Acompanhe os erros reportados e o histórico de resolução.</p>
          </div>
          <button
            onClick={fetchErros}
            disabled={isLoading}
            className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
            Atualizar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard label="Total de Registros" value={counts.total} colorClass="text-blue-600" bgIconClass="bg-blue-100" textIconClass="text-blue-600" icon={<Boxes className="w-6 h-6" />} />
          <StatCard label="Pendentes" value={counts.pend} colorClass="text-amber-500" bgIconClass="bg-amber-100" textIconClass="text-amber-500" icon={<AlertCircle className="w-6 h-6" />} />
          <StatCard label="Resolvidos" value={counts.res} colorClass="text-emerald-600" bgIconClass="bg-emerald-100" textIconClass="text-emerald-600" icon={<CheckCircle2 className="w-6 h-6" />} />
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Filtros */}
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative w-full lg:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código, descrição ou usuário..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              />
            </div>

            <div className="flex bg-slate-200/60 p-1 rounded-lg border border-slate-200 w-full lg:w-auto">
              <button
                onClick={() => setStatusFilter('PENDENTES')}
                className={`flex-1 px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${
                  statusFilter === 'PENDENTES' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setStatusFilter('RESOLVIDOS')}
                className={`flex-1 px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${
                  statusFilter === 'RESOLVIDOS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                Resolvidos
              </button>
              <button
                onClick={() => setStatusFilter('TODOS')}
                className={`flex-1 px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${
                  statusFilter === 'TODOS' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                Todos
              </button>
            </div>
          </div>

          {error && (
            <div className="m-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Tabela Principal */}
          <div className="p-0 bg-white">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                <span className="text-sm font-bold">Carregando dados...</span>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <Search className="w-12 h-12 text-slate-300 mb-3" />
                <span className="text-sm font-medium">Nenhum registro encontrado.</span>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-emerald-50/80 border-b border-emerald-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap w-28">Status</th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Cód. Prod</th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">Descrição do Erro</th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Reportado Por</th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Data</th>
                      <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap w-32">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredData.map((row) => (
                      <tr key={row.id} className={`transition-colors ${row.resolvido ? 'bg-slate-50/50 opacity-75' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-3">
                          {row.resolvido ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                              <CheckCircle2 className="w-3 h-3" /> Resolvido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
                              <AlertCircle className="w-3 h-3" /> Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-800 whitespace-nowrap">{safeStr(row.codProd)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 max-w-xs truncate" title={safeStr(row.descricao)}>{safeStr(row.descricao)}</td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-600 truncate max-w-[150px]">{safeStr(row.userCreate)}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{formatDateTimeBR(row.createdAt)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openAjusteFor(row)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-500 hover:bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm min-w-[90px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <Eye className="w-3 h-3" /> Detalhes
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
      </main>

      {/* Modal Interno para Detalhes e Auditoria */}
      <ErroDetalhesDialog 
        open={openAjuste} 
        onClose={closeAjuste} 
        erro={selected}
        apiBase={API_BASE}
        getHeaders={getHeaders}
      />

      {/* Snackbar / Toast Customizado Principal */}
      <div 
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[150] transition-all duration-300 ease-in-out ${
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