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
    MessageCircle,
    Users,
    Bell,
    BellOff
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

export interface FilaVirtualRow {
    nunota: number;
    numnota: number;
    codparc: number;
    cliente: string;
    celular: string;
    vendedor: string;
    tipoEntrega: string;
    statusFila: 'FILA' | 'SEPARANDO' | 'CONFERENCIA' | 'LIBERADO';
    dtneg: string;
    hrneg: string | null;
}

const TAB_ORDER: Array<'TODOS' | 'FILA' | 'SEPARANDO' | 'CONFERENCIA'> = [
    'TODOS',
    'FILA',
    'SEPARANDO',
    'CONFERENCIA',
];

export default function FilaVirtualPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [filaList, setFilaList] = useState<FilaVirtualRow[]>([]);
    const [filter, setFilter] = useState<string>('');
    const [enviandoMsg, setEnviandoMsg] = useState<number | null>(null);

    const [autoSendEnabled, setAutoSendEnabled] = useState(true);

    const isInitialLoad = useRef(true);
    const processadosRef = useRef<Set<number>>(new Set());
    
    // NOVO: Ref para guardar a memória do último status conhecido de cada nota
    const statusConhecidosRef = useRef<Record<number, string>>({});

    const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
        open: false,
        msg: '',
        type: 'success'
    });
    const toastTimeout = useRef<NodeJS.Timeout | null>(null);

    const [page, setPage] = useState(0);
    const rowsPerPage = 10;
    const [activeTab, setActiveTab] = useState<(typeof TAB_ORDER)[number]>('TODOS');

    const router = useRouter();
    const [token, setToken] = useState<string | null>(null);

    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000', []);
    const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);
    const FILA_URL = useMemo(() => `${API_BASE}/expedicao/fila-virtual`, [API_BASE]);

    useEffect(() => {
        const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!t && !API_TOKEN) {
            router.replace('/');
            return;
        }
        setToken(t ?? null);

        const saved = localStorage.getItem('notas_avisadas_auto');
        if (saved) {
            try {
                processadosRef.current = new Set(JSON.parse(saved));
            } catch (e) {
                processadosRef.current = new Set();
            }
        }
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

    const handleEnviarMensagem = async (pedido: FilaVirtualRow, isAutomatic = false) => {
    if (!pedido.celular) return;
    if (isAutomatic && !autoSendEnabled) return;

    setEnviandoMsg(pedido.numnota);
    try {
      const linkRastreio = `https://eletrofarias.app.br/pedidos/${pedido.numnota}/rastreio`;
      const response = await fetch(`${API_BASE}/expedicao/disparar-whatsapp`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          celular: pedido.celular,
          cliente: pedido.cliente,
          numnota: pedido.numnota,
          status: pedido.statusFila,
          linkRastreio,
        }),
      });

      // ADIÇÃO AQUI: Marca a nota como processada ANTES de checar o response.ok. 
      // Assim, mesmo se o cliente não tiver WhatsApp, o sistema não tentará novamente.
      processadosRef.current.add(pedido.numnota);
      localStorage.setItem('notas_avisadas_auto', JSON.stringify(Array.from(processadosRef.current)));

      if (!response.ok) {
        // Tenta pegar a mensagem de erro do backend (ex: "Este número não possui conta...")
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Falha no disparo');
      }
      
      toast(`${isAutomatic ? 'Automático: ' : ''}Aviso enviado para ${pedido.cliente}`, 'success');
    } catch (error: any) {
      console.error("Erro no envio:", error);
      // Opcional: Mostra um toast de erro para o usuário saber que falhou
      toast(`Erro no envio (${pedido.numnota}): ${error.message}`, 'error');
    } finally {
      setEnviandoMsg(null);
    }
  };

    const fetchFila = useCallback(async (isAuto = false) => {
        const canFetch = !!token || !!API_TOKEN;
        if (!canFetch) return;

        if (!isAuto) setLoading(true);
        try {
            const resp = await fetch(FILA_URL, {
                method: 'GET',
                headers: buildHeaders(),
                cache: 'no-store',
            });

            if (!resp.ok) throw new Error(`Status ${resp.status}`);

            const data = (await resp.json()) as FilaVirtualRow[];
            const novaLista = Array.isArray(data) ? data : [];

            // NOVO: Lógica de rastreamento de mudança de status
            novaLista.forEach(pedido => {
                const lastStatus = statusConhecidosRef.current[pedido.nunota];
                
                // Se não conhecíamos essa nota ou o status mudou...
                if (lastStatus !== pedido.statusFila) {
                    // 1. Atualiza a memória local
                    statusConhecidosRef.current[pedido.nunota] = pedido.statusFila;
                    
                    // 2. Dispara requisição assíncrona para o backend salvar no banco
                    fetch(`${API_BASE}/expedicao/acompanhamento`, {
                        method: 'POST',
                        headers: buildHeaders(),
                        body: JSON.stringify({ nunota: pedido.nunota, status: pedido.statusFila }),
                    }).catch(e => console.error("Erro ao sincronizar status no BD:", e));
                }
            });

            if (isInitialLoad.current) {
                novaLista.forEach(p => processadosRef.current.add(p.numnota));
                isInitialLoad.current = false;
            } else if (autoSendEnabled) {
                for (const pedido of novaLista) {
                    if (!processadosRef.current.has(pedido.numnota)) {
                        handleEnviarMensagem(pedido, true);
                    }
                }
            }

            setFilaList(novaLista);
            if (!isAuto) toast(`Fila atualizada.`, 'success');
        } catch (err) {
            setErro('Falha ao conectar com o servidor.');
        } finally {
            setLoading(false);
        }
    }, [token, API_TOKEN, FILA_URL, buildHeaders, toast, autoSendEnabled]);

    useEffect(() => {
        const interval = setInterval(() => fetchFila(true), 5000); 
        return () => clearInterval(interval);
    }, [fetchFila]);

    useEffect(() => {
        fetchFila();
    }, [fetchFila]);

    const tabCounts = useMemo(() => {
        const counts: Record<(typeof TAB_ORDER)[number], number> = { TODOS: filaList.length, FILA: 0, SEPARANDO: 0, CONFERENCIA: 0 };
        for (const p of filaList) { 
            // Ignora o status LIBERADO das abas, caso ele venha do backend
            if (counts[p.statusFila as keyof typeof counts] !== undefined) {
                counts[p.statusFila as keyof typeof counts] += 1; 
            }
        }
        return counts;
    }, [filaList]);

    const filteredList = useMemo(() => {
        const f = filter.trim().toUpperCase();
        return filaList.filter((p) => {
            if (activeTab !== 'TODOS' && p.statusFila !== activeTab) return false;
            if (!f) return true;
            return (p.cliente.toUpperCase().includes(f) || p.numnota.toString().includes(f));
        });
    }, [filter, filaList, activeTab]);

    const totalPages = Math.max(1, Math.ceil(filteredList.length / rowsPerPage));
    const pagedList = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredList.slice(start, start + rowsPerPage);
    }, [filteredList, page]);

    useEffect(() => { setPage(0); }, [filter, activeTab]);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('notas_avisadas_auto');
        router.replace('/');
    };

    const userEmail = typeof window !== 'undefined' ? (localStorage.getItem('authToken') ? 'Logado' : null) : null;
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SEPARANDO': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'CONFERENCIA': return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'LIBERADO': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
            default: return 'bg-slate-100 text-slate-800 border-slate-300';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
            <button
                onClick={() => setSidebarOpen(true)}
                className="fixed top-4 left-4 z-50 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 border border-slate-100"
            >
                <Menu className="w-7 h-7" />
            </button>

            <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} userEmail={userEmail} onLogout={handleLogout} />

            <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
                <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
                        <div className="flex items-center gap-3">
                            <Server className="w-8 h-8 text-emerald-100" />
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Painel Gerencial</h1>
                                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">Fila Virtual de Atendimento</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 animate-fade-in-up">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Users className="w-6 h-6 text-emerald-600" />
                                    <h2 className="text-xl font-bold text-emerald-900">Acompanhamento de Pedidos</h2>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    <button 
                                        onClick={() => setAutoSendEnabled(!autoSendEnabled)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                            autoSendEnabled 
                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm' 
                                            : 'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}
                                    >
                                        {autoSendEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                                        {autoSendEnabled ? 'ENVIO AUTOMÁTICO ATIVO' : 'ENVIO AUTOMÁTICO DESLIGADO'}
                                        <div className={`w-8 h-4 rounded-full relative transition-colors ${autoSendEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${autoSendEnabled ? 'left-4.5' : 'left-0.5'}`} style={{ left: autoSendEnabled ? '1.1rem' : '0.125rem' }}></div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => fetchFila()}
                                disabled={loading}
                                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4 text-emerald-600" />}
                                Atualizar Agora
                            </button>
                        </div>

                        <div className="flex overflow-x-auto border-b border-slate-200 mb-4 pb-1">
                            {TAB_ORDER.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition-all mr-1 ${activeTab === tab ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500'}`}
                                >
                                    {tab === 'CONFERENCIA' ? 'CONFERÊNCIA' : tab}
                                    <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${activeTab === tab ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                                        {tabCounts[tab]}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filtrar por cliente ou pedido..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 uppercase"
                            />
                        </div>
                    </div>

                    <div className="p-0 bg-slate-50/50">
                        {loading && filaList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
                                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                                <span className="text-sm font-bold">Carregando fila...</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-emerald-50/80">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-emerald-800 uppercase">Pedido</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-emerald-800 uppercase">Cliente</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-emerald-800 uppercase">Status</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-emerald-800 uppercase w-32">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {pagedList.map((pedido) => (
                                            <tr key={pedido.nunota} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-sm font-mono font-bold text-slate-700">{pedido.numnota}</td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-bold text-slate-800">{pedido.cliente}</p>
                                                    <p className="text-xs text-slate-500">Cel: {pedido.celular || 'N/I'}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2 py-1 border rounded font-bold text-[10px] uppercase ${getStatusBadge(pedido.statusFila)}`}>
                                                        {pedido.statusFila}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEnviarMensagem(pedido)}
                                                        disabled={!pedido.celular || enviandoMsg === pedido.numnota}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded text-xs font-bold transition-colors min-w-[90px] justify-center"
                                                    >
                                                        {enviandoMsg === pedido.numnota ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                                                        Avisar
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

            {/* Toast/Snackbar */}
            <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${toastState.open ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm ${toastState.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    {toastState.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {toastState.msg}
                    <button onClick={() => setToastState(s => ({ ...s, open: false }))} className="ml-2 hover:opacity-75"><X className="w-4 h-4" /></button>
                </div>
            </div>

            <style jsx global>{`
                @keyframes fadeInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-fade-in-up { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
}