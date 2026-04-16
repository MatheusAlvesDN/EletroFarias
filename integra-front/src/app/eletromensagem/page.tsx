'use client';
import DashboardLayout from '@/components/DashboardLayout';

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
    MessageCircle, // Ícone atualizado para o WhatsApp
    Users
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

// Tipagem baseada no backend NestJS
export interface FilaVirtualRow {
    nunota: number;
    numnota: number;
    codparc: number;
    cliente: string;
    celular: string;
    vendedor: string;
    tipoEntrega: string;
    statusFila: 'FILA' | 'SEPARANDO' | 'CONFERENCIA';
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

    // Estado para controlar qual botão está enviando mensagem no momento
    const [enviandoMsg, setEnviandoMsg] = useState<number | null>(null);

    // Toast Customizado
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

    // Configuração da API
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

    const fetchFila = useCallback(async () => {
        const canFetch = !!token || !!API_TOKEN;
        if (!canFetch) return;

        setErro(null);
        setLoading(true);

        try {
            const resp = await fetch(FILA_URL, {
                method: 'GET',
                headers: buildHeaders(),
                cache: 'no-store',
            });

            if (!resp.ok) {
                const msg = await resp.text();
                throw new Error(msg || `Falha ao carregar fila (status ${resp.status})`);
            }

            const data = (await resp.json()) as FilaVirtualRow[];
            setFilaList(Array.isArray(data) ? data : []);
            setPage(0);

            toast(`Fila atualizada.`, 'success');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao carregar Fila Virtual.';
            setErro(msg);
            toast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }, [token, API_TOKEN, FILA_URL, buildHeaders, toast]);

    useEffect(() => {
        fetchFila();
    }, [fetchFila]);

    // Contagem para os crachás (badges) das abas
    const tabCounts = useMemo(() => {
        const counts: Record<(typeof TAB_ORDER)[number], number> = {
            TODOS: filaList.length,
            FILA: 0,
            SEPARANDO: 0,
            CONFERENCIA: 0,
        };

        for (const p of filaList) {
            if (counts[p.statusFila] !== undefined) {
                counts[p.statusFila] += 1;
            }
        }
        return counts;
    }, [filaList]);

    // Filtro de pesquisa e aba
    const filteredList = useMemo(() => {
        const f = filter.trim().toUpperCase();
        return filaList.filter((p) => {
            if (activeTab !== 'TODOS' && p.statusFila !== activeTab) return false;

            if (!f) return true;
            // Pesquisa por nome do cliente ou número do pedido
            return (
                p.cliente.toUpperCase().includes(f) ||
                p.numnota.toString().includes(f)
            );
        });
    }, [filter, filaList, activeTab]);

    // Paginação
    const totalPages = Math.max(1, Math.ceil(filteredList.length / rowsPerPage));
    const pagedList = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredList.slice(start, start + rowsPerPage);
    }, [filteredList, page]);

    useEffect(() => {
        setPage(0);
    }, [filter, activeTab]);

    // Ação: Disparar WhatsApp via Backend (Silencioso)
    // Ação: Disparar WhatsApp via Backend (Silencioso)
    const handleEnviarMensagem = async (pedido: FilaVirtualRow) => {
        if (!pedido.celular) {
            toast('Cliente sem número de telefone cadastrado!', 'error');
            return;
        }

        setEnviandoMsg(pedido.numnota);

        try {
            // Gera o link dinâmico apontando para uma rota (ex: /rastreamento/[numnota])
            const linkRastreio = `https://eletrofarias.app.br/eletromensagem/${pedido.numnota}/rastreamento`;

            const response = await fetch(`${API_BASE}/expedicao/disparar-whatsapp`, {
                method: 'POST',
                headers: buildHeaders(),
                body: JSON.stringify({
                    celular: pedido.celular,
                    cliente: pedido.cliente,
                    numnota: pedido.numnota,
                    status: pedido.statusFila,
                    linkRastreio, // <-- Enviando o link para o backend
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Falha ao enviar mensagem pelo servidor.');
            }

            toast(`WhatsApp enviado com sucesso para ${pedido.cliente}!`, 'success');
        } catch (error: any) {
            toast(error.message || 'Erro ao comunicar com o servidor do WhatsApp.', 'error');
        } finally {
            setEnviandoMsg(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        router.replace('/');
    };

    const userEmail = typeof window !== 'undefined' ? (localStorage.getItem('authToken') ? 'Usuário Logado' : null) : null;

    // Utilitário para formatar a aba
    const getTabLabel = (tab: string) => {
        if (tab === 'CONFERENCIA') return 'CONFERÊNCIA';
        return tab;
    };

    // Utilitário para cores de status na tabela
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SEPARANDO': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'CONFERENCIA': return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'FILA': default: return 'bg-slate-100 text-slate-800 border-slate-300';
        }
    };

    return (
        <DashboardLayout subtitle="Fila Virtual de Atendimento">

            {/* Conteúdo Principal */}
            <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 animate-fade-in-up">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                    {/* Cabeçalho do Card */}
                    <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Users className="w-6 h-6 text-emerald-600" />
                                    <h2 className="text-xl font-bold text-emerald-900">Acompanhamento de Pedidos</h2>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium ml-8">
                                    <span>Clientes aguardando na fila: {filteredList.length}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={fetchFila}
                                    disabled={loading}
                                    className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4 text-emerald-600" />}
                                    Atualizar
                                </button>
                            </div>
                        </div>

                        {/* Abas de Localização (Tabs) */}
                        <div className="flex overflow-x-auto border-b border-slate-200 mb-4 scrollbar-thin scrollbar-thumb-slate-300 pb-1">
                            {TAB_ORDER.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition-all mr-1 ${activeTab === tab
                                            ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    {getTabLabel(tab)}
                                    <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${activeTab === tab ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
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
                                placeholder="Filtrar por cliente ou pedido..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
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
                                <span className="text-sm font-bold">Carregando fila...</span>
                            </div>
                        ) : filteredList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-b border-slate-100">
                                <Search className="w-12 h-12 text-slate-300 mb-3" />
                                <span className="text-sm font-medium">Nenhum pedido encontrado.</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-emerald-50/80 border-b border-emerald-100">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                                                Pedido
                                            </th>
                                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
                                                Cliente
                                            </th>
                                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                                                Entrega
                                            </th>
                                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap w-32">
                                                Ação
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {pagedList.map((pedido) => (
                                            <tr key={pedido.nunota} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 text-sm font-mono font-bold text-slate-700 whitespace-nowrap">
                                                    {pedido.numnota}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-bold text-slate-800">{pedido.cliente}</p>
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                        Cel: {pedido.celular || 'Não informado'}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 font-medium">
                                                    {pedido.tipoEntrega}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`inline-flex px-2 py-1 border rounded font-bold text-[10px] uppercase tracking-wider ${getStatusBadge(pedido.statusFila)}`}>
                                                        {pedido.statusFila}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEnviarMensagem(pedido)}
                                                        disabled={!pedido.celular || enviandoMsg === pedido.numnota}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded text-xs font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mx-auto min-w-[90px] justify-center"
                                                    >
                                                        {enviandoMsg === pedido.numnota ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <MessageCircle className="w-3.5 h-3.5" />
                                                        )}
                                                        {enviandoMsg === pedido.numnota ? 'Enviando...' : 'Avisar'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Paginação */}
                        {filteredList.length > 0 && (
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
                className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-in-out ${toastState.open ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
                    }`}
            >
                <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm ${toastState.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'
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
        </DashboardLayout>
    );
}