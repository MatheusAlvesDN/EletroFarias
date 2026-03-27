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
    Package,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    AlertTriangle
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

export interface ProdutoGiroRow {
    codprod: number;
    descrprod: string;
    estoqueAtual: number;
    vendasPeriodo: number;
    mediaDiaria: number;
    diasRestantes: number | null;
    tempoReposicao: number | null;
    statusEstoque: 'CRITICO' | 'ATENCAO' | 'SEGURO' | 'SEM_SAIDA';
}

const TAB_ORDER: Array<'TODOS' | 'CRITICO' | 'ATENCAO' | 'SEGURO' | 'SEM_SAIDA'> = [
    'TODOS',
    'CRITICO',
    'ATENCAO',
    'SEGURO',
    'SEM_SAIDA'
];

type SortField = 'estoqueAtual' | 'vendasPeriodo' | 'mediaDiaria' | 'diasRestantes' | 'tempoReposicao' | null;

export default function GiroEstoquePage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const [produtos, setProdutos] = useState<ProdutoGiroRow[]>([]);
    const [filter, setFilter] = useState<string>('');

    const [sortField, setSortField] = useState<SortField>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
        open: false,
        msg: '',
        type: 'success'
    });
    const toastTimeout = useRef<NodeJS.Timeout | null>(null);

    const [page, setPage] = useState(0);
    const rowsPerPage = 15;

    const [activeTab, setActiveTab] = useState<(typeof TAB_ORDER)[number]>('TODOS');

    const router = useRouter();
    const [token, setToken] = useState<string | null>(null);

    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000', []);
    const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);
    const GIRO_URL = useMemo(() => `${API_BASE}/expedicao/giro`, [API_BASE]);

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

    const fetchGiro = useCallback(async () => {
        const canFetch = !!token || !!API_TOKEN;
        if (!canFetch) return;

        setErro(null);
        setLoading(true);

        try {
            const resp = await fetch(GIRO_URL, {
                method: 'GET',
                headers: buildHeaders(),
                cache: 'no-store',
            });

            if (!resp.ok) {
                const msg = await resp.text();
                throw new Error(msg || `Falha ao carregar projeção de estoque (status ${resp.status})`);
            }

            const data = (await resp.json()) as ProdutoGiroRow[];
            
            const sortedData = Array.isArray(data) ? data.sort((a, b) => {
                if (a.statusEstoque === 'CRITICO' && b.statusEstoque !== 'CRITICO') return -1;
                if (a.statusEstoque !== 'CRITICO' && b.statusEstoque === 'CRITICO') return 1;
                return (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999);
            }) : [];

            setProdutos(sortedData);
            setSortField(null);
            setPage(0);
            toast(`Projeção atualizada.`, 'success');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao carregar projeção.';
            setErro(msg);
            toast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }, [token, API_TOKEN, GIRO_URL, buildHeaders, toast]);

    useEffect(() => {
        fetchGiro();
    }, [fetchGiro]);

    const tabCounts = useMemo(() => {
        const counts: Record<(typeof TAB_ORDER)[number], number> = {
            TODOS: produtos.length,
            CRITICO: 0,
            ATENCAO: 0,
            SEGURO: 0,
            SEM_SAIDA: 0,
        };

        for (const p of produtos) {
            if (counts[p.statusEstoque] !== undefined) {
                counts[p.statusEstoque] += 1;
            }
        }
        return counts;
    }, [produtos]);

    const filteredList = useMemo(() => {
        const f = filter.trim().toUpperCase();
        return produtos.filter((p) => {
            if (activeTab !== 'TODOS' && p.statusEstoque !== activeTab) return false;
            if (!f) return true;
            return (
                p.descrprod.toUpperCase().includes(f) ||
                p.codprod.toString().includes(f)
            );
        });
    }, [filter, produtos, activeTab]);

    const sortedList = useMemo(() => {
        if (!sortField) return filteredList;

        return [...filteredList].sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (sortField === 'diasRestantes' || sortField === 'tempoReposicao') {
                valA = valA === null ? Infinity : valA;
                valB = valB === null ? Infinity : valB;
            } else {
                valA = valA ?? 0;
                valB = valB ?? 0;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredList, sortField, sortDirection]);

    const totalPages = Math.max(1, Math.ceil(sortedList.length / rowsPerPage));
    
    const pagedList = useMemo(() => {
        const start = page * rowsPerPage;
        return sortedList.slice(start, start + rowsPerPage);
    }, [sortedList, page]);

    useEffect(() => {
        setPage(0);
    }, [filter, activeTab, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const renderSortIcon = (field: SortField) => {
        if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-emerald-300 opacity-50" />;
        return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-700" /> : <ArrowDown className="w-3 h-3 text-emerald-700" />;
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        router.replace('/');
    };

    const userEmail = typeof window !== 'undefined' ? (localStorage.getItem('authToken') ? 'Usuário Logado' : null) : null;

    const getTabLabel = (tab: string) => {
        switch (tab) {
            case 'CRITICO': return 'CRÍTICO';
            case 'ATENCAO': return 'ATENÇÃO';
            case 'SEM_SAIDA': return 'SEM SAÍDA';
            default: return tab;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'CRITICO': return 'bg-rose-100 text-rose-800 border-rose-300';
            case 'ATENCAO': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'SEGURO': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
            case 'SEM_SAIDA': default: return 'bg-slate-100 text-slate-800 border-slate-300';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
            <button
                onClick={() => setSidebarOpen(true)}
                className="fixed top-4 left-4 z-50 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                title="Abrir Menu"
            >
                <Menu className="w-7 h-7" />
            </button>

            <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} userEmail={userEmail} onLogout={handleLogout} />

            <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
                <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
                        <div className="flex items-center gap-3">
                            <Server className="w-8 h-8 opacity-90 text-emerald-100" />
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Painel Gerencial</h1>
                                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                                    Controle e Giro de Estoque
                                </p>
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

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in-up">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Package className="w-6 h-6 text-emerald-600" />
                                    <h2 className="text-xl font-bold text-emerald-900">Projeção de Estoque</h2>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium ml-8">
                                    <span>Produtos analisados (últimos 30 dias): {filteredList.length}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={fetchGiro}
                                    disabled={loading}
                                    className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4 text-emerald-600" />}
                                    Atualizar
                                </button>
                            </div>
                        </div>

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

                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filtrar por código ou descrição..."
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

                    <div className="p-0 bg-slate-50/50">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
                                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                                <span className="text-sm font-bold">Processando dados de estoque...</span>
                            </div>
                        ) : sortedList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-b border-slate-100">
                                <Search className="w-12 h-12 text-slate-300 mb-3" />
                                <span className="text-sm font-medium">Nenhum produto encontrado.</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-emerald-50/80 border-b border-emerald-100 select-none">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                                                Cód.
                                            </th>
                                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
                                                Produto
                                            </th>
                                            <th 
                                                onClick={() => handleSort('estoqueAtual')}
                                                className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-emerald-100/50 transition-colors"
                                            >
                                                <div className="flex items-center justify-end gap-1.5">
                                                    Estoque Atual
                                                    {renderSortIcon('estoqueAtual')}
                                                </div>
                                            </th>
                                            <th 
                                                onClick={() => handleSort('vendasPeriodo')}
                                                className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-emerald-100/50 transition-colors"
                                            >
                                                <div className="flex items-center justify-end gap-1.5">
                                                    Vendas (30d)
                                                    {renderSortIcon('vendasPeriodo')}
                                                </div>
                                            </th>
                                            <th 
                                                onClick={() => handleSort('mediaDiaria')}
                                                className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-emerald-100/50 transition-colors"
                                            >
                                                <div className="flex items-center justify-end gap-1.5">
                                                    Média/Dia
                                                    {renderSortIcon('mediaDiaria')}
                                                </div>
                                            </th>
                                            <th 
                                                onClick={() => handleSort('tempoReposicao')}
                                                className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-emerald-100/50 transition-colors"
                                            >
                                                <div className="flex items-center justify-end gap-1.5">
                                                    Reposição (Dias)
                                                    {renderSortIcon('tempoReposicao')}
                                                </div>
                                            </th>
                                            <th 
                                                onClick={() => handleSort('diasRestantes')}
                                                className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-emerald-100/50 transition-colors"
                                            >
                                                <div className="flex items-center justify-end gap-1.5">
                                                    Previsão Fim (Dias)
                                                    {renderSortIcon('diasRestantes')}
                                                </div>
                                            </th>
                                            <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {pagedList.map((produto) => {
                                            const isRiscoRuptura = produto.statusEstoque === 'CRITICO';

                                            return (
                                                <tr key={produto.codprod} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 text-sm font-mono font-bold text-slate-700 whitespace-nowrap">
                                                        {produto.codprod}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm font-bold text-slate-800">{produto.descrprod}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right font-bold text-slate-700">
                                                        {produto.estoqueAtual}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right text-slate-600 font-medium">
                                                        {produto.vendasPeriodo}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right text-slate-600 font-medium">
                                                        {produto.mediaDiaria > 0 ? produto.mediaDiaria.toFixed(2).replace('.', ',') : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right text-slate-600 font-medium">
                                                        {produto.tempoReposicao !== null ? produto.tempoReposicao : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {isRiscoRuptura && (
                                                                <span title="Risco de Ruptura: O tempo de reposição é maior que a previsão para o estoque acabar">
                                                                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                                                                </span>
                                                            )}
                                                            <span className={`text-sm font-bold ${isRiscoRuptura ? 'text-rose-600' : 'text-slate-800'}`}>
                                                                {produto.diasRestantes !== null ? produto.diasRestantes : '∞'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex px-2 py-1 border rounded font-bold text-[10px] uppercase tracking-wider ${getStatusBadge(produto.statusEstoque)}`}>
                                                            {getTabLabel(produto.statusEstoque)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {sortedList.length > 0 && (
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
        </div>
    );
}