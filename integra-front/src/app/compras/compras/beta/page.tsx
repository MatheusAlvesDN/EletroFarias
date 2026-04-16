'use client';
import DashboardLayout from '@/components/DashboardLayout';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Menu, Server, Search, Loader2, AlertCircle, CheckCircle2, X, RotateCw, Package, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Calendar, ShoppingCart, BarChart3, List, Download, Tag, Boxes, Filter, CheckSquare, Square
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import SidebarMenu from '@/components/SidebarMenu';

// --- INTERFACES: GIRO ESTOQUE ---
export interface ProdutoGiroRow {
    codprod: number; descrprod: string; estoqueAtual: number; vendasPeriodo: number; mediaDiaria: number;
    diasRestantes: number | null; tempoReposicao: number | null; statusEstoque: 'CRITICO' | 'ATENCAO' | 'SEGURO' | 'SEM_SAIDA';
    totalPedidos: number; mediaPorPedido: number; qtdPedidaPendente: number;
}
export interface PedidoProdutoRow {
    numnota: number; dtneg: string; cliente: string; qtd: number;
}

// --- INTERFACES: MARCAS ---
export interface MarcaRow {
    marca: string; marca_raw: string | null; estoque_total: number; reservado_total: number; reposicao: number;
}
export interface ItemMarcaRow {
    codprod: number; descrprod: string; marca: string; ad_curvaabc: string; vlr_unit_venda: number;
    estoque_total: number; reservado_total: number; reposicao: number; qtd_itens_entrada: number;
    nunota_reserva: string; nunota_ult_entrada: number; top_ult_entrada: number; dt_ult_entrada: string;
    vlrliq_ult_entrada: number; custo_unitario: number;
}

const TAB_ORDER: Array<'TODOS' | 'CRITICO' | 'ATENCAO' | 'SEGURO' | 'SEM_SAIDA' | 'ZERADOS' | 'NEGATIVOS' | 'CABOS'> = [
    'TODOS', 'CRITICO', 'ATENCAO', 'SEGURO', 'SEM_SAIDA', 'ZERADOS', 'NEGATIVOS', 'CABOS'
];
type SortField = 'estoqueAtual' | 'vendasPeriodo' | 'mediaDiaria' | 'diasRestantes' | 'tempoReposicao' | null;

export default function GiroEstoquePage() {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [mainView, setMainView] = useState<'GIRO' | 'MARCAS'>('GIRO');
    
    // Auth & Base
    const [token, setToken] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000', []);
    const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

    // Toasts
    const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({ open: false, msg: '', type: 'success' });
    const toastTimeout = useRef<NodeJS.Timeout | null>(null);
    const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
        setToastState({ open: true, msg, type });
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        toastTimeout.current = setTimeout(() => setToastState(s => ({ ...s, open: false })), 4000);
    }, []);

    const buildHeaders = useCallback(() => {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
        return headers;
    }, [token, API_TOKEN]);

    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) { setToken(storedToken); setUserEmail('Usuário Logado'); } 
        else if (!API_TOKEN) router.replace('/');
        else { setToken(null); setUserEmail(null); }
    }, [router, API_TOKEN]);

    const handleLogout = () => { localStorage.removeItem('authToken'); router.replace('/'); };

    // =========================================================================
    // VIEW 1: GIRO ESTOQUE STATES & LOGIC
    // =========================================================================
    const [produtosGiro, setProdutosGiro] = useState<ProdutoGiroRow[]>([]);
    const [filterGiro, setFilterGiro] = useState<string>('');
    const [diasAnalise, setDiasAnalise] = useState<number>(365);
    const [selectedProdutoGiro, setSelectedProdutoGiro] = useState<ProdutoGiroRow | null>(null);
    const [pedidosProdutoGiro, setPedidosProdutoGiro] = useState<PedidoProdutoRow[]>([]);
    const [loadingGiro, setLoadingGiro] = useState(false);
    const [loadingPedidosGiro, setLoadingPedidosGiro] = useState(false);
    const [erroGiro, setErroGiro] = useState<string | null>(null);
    const [sortFieldGiro, setSortFieldGiro] = useState<SortField>(null);
    const [sortDirectionGiro, setSortDirectionGiro] = useState<'asc' | 'desc'>('desc');
    const [pageGiro, setPageGiro] = useState(0);
    const [activeTabGiro, setActiveTabGiro] = useState<(typeof TAB_ORDER)[number]>('TODOS');
    const rowsPerPage = 15;

    const fetchGiro = useCallback(async () => {
        if (!token && !API_TOKEN) return;
        if (!diasAnalise || diasAnalise <= 0) return toast('Dias > 0.', 'error');
        setErroGiro(null); setLoadingGiro(true);
        try {
            const resp = await fetch(`${API_BASE}/expedicao/giro?dias=${diasAnalise}`, { headers: buildHeaders() });
            if (!resp.ok) throw new Error(await resp.text());
            const data = (await resp.json()) as ProdutoGiroRow[];
            setProdutosGiro(Array.isArray(data) ? data.sort((a, b) => {
                if (a.statusEstoque === 'CRITICO' && b.statusEstoque !== 'CRITICO') return -1;
                if (a.statusEstoque !== 'CRITICO' && b.statusEstoque === 'CRITICO') return 1;
                return (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999);
            }) : []);
            setSortFieldGiro(null); setPageGiro(0); toast(`Giro atualizado.`, 'success');
        } catch (err: any) {
            setErroGiro(err.message); toast(err.message, 'error');
        } finally { setLoadingGiro(false); }
    }, [token, API_TOKEN, API_BASE, diasAnalise, buildHeaders, toast]);

    useEffect(() => { if (mainView === 'GIRO' && produtosGiro.length === 0 && (token || API_TOKEN)) fetchGiro(); }, [mainView, token, API_TOKEN]);

    useEffect(() => {
        if (!selectedProdutoGiro) return setPedidosProdutoGiro([]);
        const fetchPedidos = async () => {
            setLoadingPedidosGiro(true);
            try {
                const resp = await fetch(`${API_BASE}/expedicao/pedidos-produto/${selectedProdutoGiro.codprod}?dias=${diasAnalise}`, { headers: buildHeaders() });
                if (!resp.ok) throw new Error('Erro');
                setPedidosProdutoGiro(await resp.json());
            } catch (err) { toast('Erro ao buscar pedidos.', 'error'); } 
            finally { setLoadingPedidosGiro(false); }
        };
        fetchPedidos();
    }, [selectedProdutoGiro, diasAnalise, API_BASE, buildHeaders, toast]);

    const tabCounts = useMemo(() => {
        const counts = { TODOS: 0, CRITICO: 0, ATENCAO: 0, SEGURO: 0, SEM_SAIDA: 0, ZERADOS: 0, NEGATIVOS: 0, CABOS: 0 };
        for (const p of produtosGiro) {
            if (p.qtdPedidaPendente > 0) continue; 
            counts.TODOS += 1; 
            const isCabo = p.descrprod.toUpperCase().includes('CABO');
            if (isCabo) counts.CABOS += 1;
            else if (p.estoqueAtual === 0) counts.ZERADOS += 1;
            else if (p.estoqueAtual < 0) counts.NEGATIVOS += 1;
            else if (counts[p.statusEstoque] !== undefined) counts[p.statusEstoque] += 1;
        }
        return counts;
    }, [produtosGiro]);

    const filteredListGiro = useMemo(() => {
        const f = filterGiro.trim().toUpperCase();
        return produtosGiro.filter((p) => {
            if (p.qtdPedidaPendente > 0) return false;
            const isCabo = p.descrprod.toUpperCase().includes('CABO');
            if (activeTabGiro !== 'TODOS') {
                if (activeTabGiro === 'CABOS' && !isCabo) return false;
                else if (activeTabGiro === 'ZERADOS' && (p.estoqueAtual !== 0 || isCabo)) return false;
                else if (activeTabGiro === 'NEGATIVOS' && (p.estoqueAtual >= 0 || isCabo)) return false;
                else if (!['CABOS', 'ZERADOS', 'NEGATIVOS'].includes(activeTabGiro)) {
                    if (p.estoqueAtual <= 0 || isCabo) return false;
                    if (p.statusEstoque !== activeTabGiro) return false;
                }
            }
            if (!f) return true;
            return p.descrprod.toUpperCase().includes(f) || p.codprod.toString().includes(f);
        });
    }, [filterGiro, produtosGiro, activeTabGiro]);

    const sortedListGiro = useMemo(() => {
        if (!sortFieldGiro) return filteredListGiro;
        return [...filteredListGiro].sort((a, b) => {
            let valA = a[sortFieldGiro]; let valB = b[sortFieldGiro];
            if (sortFieldGiro === 'diasRestantes' || sortFieldGiro === 'tempoReposicao') {
                valA = valA === null ? Infinity : valA; valB = valB === null ? Infinity : valB;
            } else { valA = valA ?? 0; valB = valB ?? 0; }
            if (valA < valB) return sortDirectionGiro === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirectionGiro === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredListGiro, sortFieldGiro, sortDirectionGiro]);

    const pagedListGiro = useMemo(() => sortedListGiro.slice(pageGiro * rowsPerPage, (pageGiro + 1) * rowsPerPage), [sortedListGiro, pageGiro]);

    const chartDataGiro = useMemo(() => {
        if (!pedidosProdutoGiro.length) return [];
        const grouped = new Map<string, number>();
        pedidosProdutoGiro.forEach(p => {
            const parts = p.dtneg.split('/');
            if (parts.length === 3) grouped.set(`${parts[1]}/${parts[2]}`, (grouped.get(`${parts[1]}/${parts[2]}`) || 0) + p.qtd);
        });
        return Array.from(grouped, ([date, qtd]) => {
            const [m, y] = date.split('/');
            return { date, sortKey: parseInt(`${y}${m}`, 10), qtd };
        }).sort((a, b) => a.sortKey - b.sortKey).map(({ date, qtd }) => ({ date, qtd }));
    }, [pedidosProdutoGiro]);

    useEffect(() => setPageGiro(0), [filterGiro, activeTabGiro, sortFieldGiro, sortDirectionGiro]);


    // =========================================================================
    // VIEW 2: MARCAS STATES & LOGIC
    // =========================================================================
    const [marcas, setMarcas] = useState<MarcaRow[]>([]);
    const [filterMarca, setFilterMarca] = useState<string>('');
    const [itensMarca, setItensMarca] = useState<ItemMarcaRow[]>([]);
    const [selectedMarca, setSelectedMarca] = useState<string | null>(null);
    const [loadingMarcas, setLoadingMarcas] = useState(false);
    const [loadingItensMarca, setLoadingItensMarca] = useState(false);
    
    // Parâmetros Gadget
    const [pApenasNegativos, setPApenasNegativos] = useState(false);
    const [pEletroFarias, setPEletroFarias] = useState(false);
    const [pLid, setPLid] = useState(false);

    const fetchMarcas = useCallback(async () => {
        if (!token && !API_TOKEN) return;
        setLoadingMarcas(true);
        try {
            const query = new URLSearchParams({ 
                apenasNegativos: String(pApenasNegativos), 
                eletroFarias: String(pEletroFarias), 
                lid: String(pLid) 
            }).toString();
            const resp = await fetch(`${API_BASE}/expedicao/marcas?${query}`, { headers: buildHeaders() });
            if (!resp.ok) throw new Error(await resp.text());
            setMarcas(await resp.json());
            toast('Marcas carregadas', 'success');
        } catch (err: any) { toast('Erro ao buscar marcas', 'error'); } 
        finally { setLoadingMarcas(false); }
    }, [token, API_TOKEN, API_BASE, buildHeaders, toast, pApenasNegativos, pEletroFarias, pLid]);

    useEffect(() => { if (mainView === 'MARCAS' && marcas.length === 0 && (token || API_TOKEN)) fetchMarcas(); }, [mainView, token, API_TOKEN]);

    useEffect(() => {
        if (!selectedMarca) return setItensMarca([]);
        const fetchItens = async () => {
            setLoadingItensMarca(true);
            try {
                const query = new URLSearchParams({ 
                    marca: selectedMarca,
                    apenasNegativos: String(pApenasNegativos), 
                    eletroFarias: String(pEletroFarias), 
                    lid: String(pLid) 
                }).toString();
                const resp = await fetch(`${API_BASE}/expedicao/marcas/itens?${query}`, { headers: buildHeaders() });
                if (!resp.ok) throw new Error(await resp.text());
                setItensMarca(await resp.json());
            } catch (err) { toast('Erro ao buscar itens da marca', 'error'); } 
            finally { setLoadingItensMarca(false); }
        };
        fetchItens();
    }, [selectedMarca, API_BASE, buildHeaders, toast, pApenasNegativos, pEletroFarias, pLid]);

    const filteredMarcas = useMemo(() => {
        const f = filterMarca.trim().toUpperCase();
        if (!f) return marcas;
        return marcas.filter(m => m.marca.toUpperCase().includes(f));
    }, [marcas, filterMarca]);

    // Helpers
    const getTabLabel = (t: string) => { const l:any = { CRITICO:'CRÍTICO', ATENCAO:'ATENÇÃO', SEM_SAIDA:'SEM SAÍDA', ZERADOS:'ZERADOS', NEGATIVOS:'NEGATIVOS', CABOS:'CABOS' }; return l[t] || t; };
    const getStatusBadge = (s: string) => { const b:any = { CRITICO:'bg-rose-100 text-rose-800 border-rose-300', ATENCAO:'bg-yellow-100 text-yellow-800 border-yellow-300', SEGURO:'bg-emerald-100 text-emerald-800 border-emerald-300' }; return b[s] || 'bg-slate-100 text-slate-800 border-slate-300'; };

    return (
        <DashboardLayout subtitle="Controle e Giro de Estoque">

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in-up">
                
                {/* --------------------------------------------------------------------------------- */}
                {/* VISÃO: GIRO DE ESTOQUE */}
                {/* --------------------------------------------------------------------------------- */}
                {mainView === 'GIRO' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Package className="w-6 h-6 text-emerald-600" />
                                    <h2 className="text-xl font-bold text-emerald-900">Projeção de Estoque</h2>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium ml-8">
                                    <span>Produtos exibidos: {filteredListGiro.length}</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                                <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden shadow-sm">
                                    <div className="px-3 bg-slate-50 border-r border-slate-300 text-slate-500 flex items-center h-full">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        <span className="text-sm font-bold">Dias</span>
                                    </div>
                                    <input type="number" value={diasAnalise} onChange={(e) => setDiasAnalise(Number(e.target.value))} className="w-20 px-3 py-2 text-sm text-center font-bold text-slate-700 focus:outline-none" min="1"/>
                                </div>

                                <button type="button" onClick={fetchGiro} disabled={loadingGiro} className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
                                    {loadingGiro ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                                    Atualizar
                                </button>
                            </div>
                        </div>

                        <div className="flex overflow-x-auto border-b border-slate-200 mb-4 scrollbar-thin pb-1">
                            {TAB_ORDER.map((tab) => (
                                <button key={tab} onClick={() => setActiveTabGiro(tab)} className={`px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition-all mr-1 ${activeTabGiro === tab ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                                    {getTabLabel(tab)}
                                    <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${activeTabGiro === tab ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                                        {tabCounts[tab]}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Filtrar por código ou descrição..." value={filterGiro} onChange={(e) => setFilterGiro(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow uppercase"/>
                        </div>
                    </div>

                    <div className="p-0 bg-slate-50/50">
                        {loadingGiro ? (
                            <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
                                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                                <span className="text-sm font-bold">Processando dados de estoque...</span>
                            </div>
                        ) : sortedListGiro.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-b border-slate-100">
                                <Search className="w-12 h-12 text-slate-300 mb-3" />
                                <span className="text-sm font-medium">Nenhum produto encontrado nesta aba.</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-emerald-50/80 border-b border-emerald-100 select-none">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Cód.</th>
                                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">Produto</th>
                                            <th className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Estoque Atual</th>
                                            <th className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Vendas</th>
                                            <th className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Previsão Fim (Dias)</th>
                                            <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {pagedListGiro.map((p) => {
                                            const isRiscoRuptura = p.statusEstoque === 'CRITICO';
                                            return (
                                                <tr key={p.codprod} onClick={() => setSelectedProdutoGiro(p)} className="hover:bg-emerald-50 transition-colors cursor-pointer">
                                                    <td className="px-4 py-3 text-sm font-mono font-bold text-slate-700 whitespace-nowrap">{p.codprod}</td>
                                                    <td className="px-4 py-3"><p className="text-sm font-bold text-slate-800">{p.descrprod}</p></td>
                                                    <td className={`px-4 py-3 text-sm text-right font-bold ${p.estoqueAtual < 0 ? 'text-rose-600' : p.estoqueAtual === 0 ? 'text-slate-400' : 'text-slate-700'}`}>{p.estoqueAtual}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-slate-600 font-medium">{p.vendasPeriodo}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {isRiscoRuptura && (<span title="Risco de Ruptura"><AlertTriangle className="w-4 h-4 text-rose-500" /></span>)}
                                                            <span className={`text-sm font-bold ${isRiscoRuptura ? 'text-rose-600' : 'text-slate-800'}`}>{p.diasRestantes !== null ? p.diasRestantes : '∞'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex px-2 py-1 border rounded font-bold text-[10px] uppercase tracking-wider ${getStatusBadge(p.statusEstoque)}`}>{getTabLabel(p.statusEstoque)}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {sortedListGiro.length > 0 && (
                            <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
                                <span className="text-xs sm:text-sm text-slate-500 font-medium">Página {pageGiro + 1} de {Math.max(1, Math.ceil(sortedListGiro.length / rowsPerPage))}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setPageGiro(p => Math.max(0, p - 1))} disabled={pageGiro === 0} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs sm:text-sm font-bold transition-colors disabled:opacity-50">Anterior</button>
                                    <button onClick={() => setPageGiro(p => Math.min(Math.ceil(sortedListGiro.length / rowsPerPage) - 1, p + 1))} disabled={pageGiro >= Math.ceil(sortedListGiro.length / rowsPerPage) - 1} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs sm:text-sm font-bold transition-colors disabled:opacity-50">Próxima</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                )}


                {/* --------------------------------------------------------------------------------- */}
                {/* VISÃO: POR MARCAS (NOVA) */}
                {/* --------------------------------------------------------------------------------- */}
                {mainView === 'MARCAS' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Boxes className="w-6 h-6 text-emerald-600" />
                                    <h2 className="text-xl font-bold text-emerald-900">Análise por Marcas</h2>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium ml-8">
                                    <span>Marcas exibidas: {filteredMarcas.length}</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                                <button type="button" onClick={fetchMarcas} disabled={loadingMarcas} className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
                                    {loadingMarcas ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                                    Atualizar
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 mb-4 pb-4">
                            <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Filter className="w-4 h-4 text-emerald-600"/> Filtros Rápidos:
                            </span>
                            
                            <button onClick={() => setPApenasNegativos(!pApenasNegativos)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border ${pApenasNegativos ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                                {pApenasNegativos ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                                Apenas Reposição Negativa
                            </button>
                            
                            <button onClick={() => setPEletroFarias(!pEletroFarias)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border ${pEletroFarias ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                                {pEletroFarias ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                                Eletro Farias
                            </button>

                            <button onClick={() => setPLid(!pLid)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border ${pLid ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                                {pLid ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                                LID
                            </button>
                        </div>

                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Filtrar por marca..." value={filterMarca} onChange={(e) => setFilterMarca(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow uppercase"/>
                        </div>
                    </div>

                    <div className="p-0 bg-slate-50/50">
                        {loadingMarcas ? (
                            <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
                                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                                <span className="text-sm font-bold">Processando dados de marcas...</span>
                            </div>
                        ) : filteredMarcas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-b border-slate-100">
                                <Tag className="w-12 h-12 text-slate-300 mb-3" />
                                <span className="text-sm font-medium">Nenhuma marca encontrada.</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-emerald-50/80 border-b border-emerald-100 select-none">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Marca</th>
                                            <th className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Estoque Total</th>
                                            <th className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Reservado</th>
                                            <th className="px-4 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Reposição</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {filteredMarcas.map((m, i) => (
                                            <tr key={i} onClick={() => setSelectedMarca(m.marca_raw || '(Sem marca)')} className="hover:bg-emerald-50 cursor-pointer transition-colors">
                                                <td className="px-4 py-3 text-sm font-bold text-slate-800">{m.marca}</td>
                                                <td className="px-4 py-3 text-sm font-mono text-right text-slate-600">{m.estoque_total.toLocaleString('pt-BR')}</td>
                                                <td className="px-4 py-3 text-sm font-mono text-right text-slate-600">{m.reservado_total.toLocaleString('pt-BR')}</td>
                                                <td className={`px-4 py-3 text-sm font-bold font-mono text-right ${m.reposicao < 0 ? 'text-rose-600' : 'text-slate-700'}`}>{m.reposicao.toLocaleString('pt-BR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
                )}

            </main>

            {/* MODAL: DETALHES DA MARCA */}
            {selectedMarca && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
                            <h3 className="font-bold text-emerald-900 text-lg flex items-center gap-2">
                                <List className="w-5 h-5 text-emerald-600" /> Itens da Marca: {selectedMarca}
                            </h3>
                            <button onClick={() => setSelectedMarca(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-0 overflow-y-auto flex-1 bg-slate-50/50">
                            {loadingItensMarca ? (
                                <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
                                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                                    <span className="text-sm font-bold">Carregando Itens...</span>
                                </div>
                            ) : (
                                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-emerald-50/80 border-b border-emerald-100 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-emerald-800 uppercase whitespace-nowrap">Cód.</th>
                                                <th className="px-3 py-2 text-left text-[10px] font-bold text-emerald-800 uppercase whitespace-nowrap min-w-[200px]">Descrição</th>
                                                <th className="px-3 py-2 text-center text-[10px] font-bold text-emerald-800 uppercase whitespace-nowrap">Curva ABC</th>
                                                <th className="px-3 py-2 text-right text-[10px] font-bold text-emerald-800 uppercase whitespace-nowrap">Vlr Unit</th>
                                                <th className="px-3 py-2 text-right text-[10px] font-bold text-emerald-800 uppercase whitespace-nowrap">Estoque</th>
                                                <th className="px-3 py-2 text-right text-[10px] font-bold text-emerald-800 uppercase whitespace-nowrap">Reserva</th>
                                                <th className="px-3 py-2 text-right text-[10px] font-bold text-emerald-800 uppercase whitespace-nowrap">Reposição</th>
                                                <th className="px-3 py-2 text-right text-[10px] font-bold text-emerald-800 uppercase whitespace-nowrap">Entrada P.</th>
                                                <th className="px-3 py-2 text-right text-[10px] font-bold text-emerald-800 uppercase whitespace-nowrap">Custo Unit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {itensMarca.length === 0 ? (
                                                <tr><td colSpan={9} className="text-center p-6 text-sm text-slate-400">Nenhum item retornado</td></tr>
                                            ) : itensMarca.map((i, idx) => (
                                                <tr key={idx} className="hover:bg-emerald-50 transition-colors">
                                                    <td className="px-3 py-2 text-xs font-mono font-bold text-slate-700">{i.codprod}</td>
                                                    <td className="px-3 py-2 text-xs font-bold text-slate-800">{i.descrprod}</td>
                                                    <td className="px-3 py-2 text-xs font-bold text-center text-slate-500">{i.ad_curvaabc || '-'}</td>
                                                    <td className="px-3 py-2 text-xs font-mono text-right text-emerald-600">R$ {i.vlr_unit_venda.toFixed(2)}</td>
                                                    <td className="px-3 py-2 text-xs font-mono text-right text-slate-600">{i.estoque_total}</td>
                                                    <td className="px-3 py-2 text-xs font-mono text-right text-slate-600">{i.reservado_total}</td>
                                                    <td className={`px-3 py-2 text-xs font-bold font-mono text-right ${i.reposicao < 0 ? 'text-rose-600' : 'text-slate-700'}`}>{i.reposicao}</td>
                                                    <td className="px-3 py-2 text-xs font-mono text-right text-slate-500">{i.qtd_itens_entrada}</td>
                                                    <td className="px-3 py-2 text-xs font-mono text-right text-slate-500">R$ {i.custo_unitario.toFixed(4)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
                            <button onClick={() => setSelectedMarca(null)} className="px-6 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-bold transition-colors shadow-sm">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETALHES GIRO */}
            {selectedProdutoGiro && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
                 <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in-up">
                     <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
                         <h3 className="font-bold text-emerald-900 text-lg flex items-center gap-2">
                             <BarChart3 className="w-5 h-5 text-emerald-600" /> Detalhes de Consumo
                         </h3>
                         <button onClick={() => setSelectedProdutoGiro(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                             <X className="w-5 h-5" />
                         </button>
                     </div>
                     <div className="p-6 overflow-y-auto max-h-[80vh]">
                         <div className="mb-6">
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Produto</p>
                            <p className="font-bold text-slate-800 text-lg leading-tight">
                                <span className="text-emerald-600 mr-2">{selectedProdutoGiro.codprod}</span>
                                {selectedProdutoGiro.descrprod}
                            </p>
                         </div>
                         <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                                <ShoppingCart className="w-6 h-6 text-slate-400 mb-2" />
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Qtd. Pedidos Diferentes</p>
                                <p className="text-3xl font-bold text-emerald-600 mb-1">{selectedProdutoGiro.totalPedidos}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Nos últimos {diasAnalise} dias</p>
                            </div>
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                                <Package className="w-6 h-6 text-slate-400 mb-2" />
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Média por Pedido</p>
                                <p className="text-3xl font-bold text-emerald-600 mb-1">
                                    {selectedProdutoGiro.mediaPorPedido > 0 ? selectedProdutoGiro.mediaPorPedido.toFixed(2).replace('.', ',') : '-'}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Unidades</p>
                            </div>
                         </div>
                         {!loadingPedidosGiro && chartDataGiro.length > 0 && (
                            <div className="mb-6 border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                                <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">Tendência de Vendas (Mensal)</h4>
                                <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartDataGiro}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10}/>
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false}/>
                                            <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }} formatter={(value: any) => [value, 'Qtd']}/>
                                            <Bar dataKey="qtd" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                         )}
                         <div className="border-t border-slate-100 pt-4">
                            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><List className="w-4 h-4 text-emerald-600" /> Relatório de Pedidos</h4>
                            {loadingPedidosGiro ? (
                                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
                            ) : (
                                <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 border border-slate-200 rounded-lg">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 shadow-sm z-10">
                                            <tr>
                                                <th className="p-3 font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Pedido</th>
                                                <th className="p-3 font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Data</th>
                                                <th className="p-3 font-bold text-slate-600 uppercase tracking-wider w-full">Cliente</th>
                                                <th className="p-3 font-bold text-slate-600 uppercase tracking-wider text-right whitespace-nowrap">Qtd.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {pedidosProdutoGiro.length > 0 ? pedidosProdutoGiro.map(p => (
                                                <tr key={p.numnota} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 font-bold text-emerald-700">{p.numnota}</td>
                                                    <td className="p-3 text-slate-500 font-medium">{p.dtneg}</td>
                                                    <td className="p-3 text-slate-600 truncate max-w-[200px]" title={p.cliente}>{p.cliente}</td>
                                                    <td className="p-3 text-slate-700 font-bold text-right">{p.qtd}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={4} className="p-6 text-center text-slate-400 font-medium">Nenhum pedido encontrado.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                         </div>
                     </div>
                     <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
                        <button onClick={() => setSelectedProdutoGiro(null)} className="px-6 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-bold transition-colors shadow-sm">Fechar</button>
                     </div>
                 </div>
             </div>
            )}

            <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${toastState.open ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm ${toastState.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    {toastState.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toastState.msg}
                    <button onClick={() => setToastState(s => ({ ...s, open: false }))} className="ml-2"><X className="w-4 h-4" /></button>
                </div>
            </div>

            <style jsx global>{`
                .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
                @keyframes fadeInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-fade-in-up { animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </DashboardLayout>
    );
}