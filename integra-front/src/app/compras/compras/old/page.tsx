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
    AlertTriangle,
    Calendar,
    ShoppingCart,
    BarChart3,
    List,
    Download
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as RechartsTooltip, 
    ResponsiveContainer 
} from 'recharts';

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
    totalPedidos: number;
    mediaPorPedido: number;
    qtdPedidaPendente: number; // NOVO CAMPO ADICIONADO
}

export interface PedidoProdutoRow {
    numnota: number;
    dtneg: string;
    cliente: string;
    qtd: number;
}

const TAB_ORDER: Array<'TODOS' | 'CRITICO' | 'ATENCAO' | 'SEGURO' | 'SEM_SAIDA' | 'ZERADOS' | 'NEGATIVOS' | 'CABOS'> = [
    'TODOS',
    'CRITICO',
    'ATENCAO',
    'SEGURO',
    'SEM_SAIDA',
    'ZERADOS',
    'NEGATIVOS',
    'CABOS'
];

type SortField = 'estoqueAtual' | 'vendasPeriodo' | 'mediaDiaria' | 'diasRestantes' | 'tempoReposicao' | null;

export default function GiroEstoquePage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const [produtos, setProdutos] = useState<ProdutoGiroRow[]>([]);
    const [filter, setFilter] = useState<string>('');
    
    // Mudança para 365 dias por padrão
    const [diasAnalise, setDiasAnalise] = useState<number>(365);
    
    const [selectedProduto, setSelectedProduto] = useState<ProdutoGiroRow | null>(null);
    const [pedidosProduto, setPedidosProduto] = useState<PedidoProdutoRow[]>([]);
    const [loadingPedidos, setLoadingPedidos] = useState(false);

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
    const [userEmail, setUserEmail] = useState<string | null>(null);

    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000', []);
    const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        
        if (storedToken) {
            setToken(storedToken);
            setUserEmail('Usuário Logado');
        } else if (!API_TOKEN) {
            router.replace('/');
        } else {
            setToken(null);
            setUserEmail(null);
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

    const fetchGiro = useCallback(async () => {
        const canFetch = !!token || !!API_TOKEN;
        if (!canFetch) return;
        if (!diasAnalise || diasAnalise <= 0) {
            toast('A quantidade de dias deve ser maior que zero.', 'error');
            return;
        }

        setErro(null);
        setLoading(true);

        try {
            const url = `${API_BASE}/expedicao/giro?dias=${diasAnalise}`;
            const resp = await fetch(url, {
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
            toast(`Projeção atualizada para ${diasAnalise} dias.`, 'success');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao carregar projeção.';
            setErro(msg);
            toast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }, [token, API_TOKEN, API_BASE, diasAnalise, buildHeaders, toast]);

    useEffect(() => {
        if (token || API_TOKEN) {
            fetchGiro();
        }
    }, [token, API_TOKEN]);

    useEffect(() => {
        if (!selectedProduto) {
            setPedidosProduto([]);
            return;
        }

        const fetchPedidos = async () => {
            setLoadingPedidos(true);
            try {
                const url = `${API_BASE}/expedicao/pedidos-produto/${selectedProduto.codprod}?dias=${diasAnalise}`;
                const resp = await fetch(url, {
                    method: 'GET',
                    headers: buildHeaders(),
                });

                if (!resp.ok) throw new Error('Erro ao buscar pedidos');
                
                const data = await resp.json();
                setPedidosProduto(Array.isArray(data) ? data : []);
            } catch (err) {
                toast('Não foi possível carregar a lista de pedidos.', 'error');
            } finally {
                setLoadingPedidos(false);
            }
        };

        fetchPedidos();
    }, [selectedProduto, diasAnalise, API_BASE, buildHeaders, toast]);

    const tabCounts = useMemo(() => {
        const counts: Record<(typeof TAB_ORDER)[number], number> = {
            TODOS: 0,
            CRITICO: 0,
            ATENCAO: 0,
            SEGURO: 0,
            SEM_SAIDA: 0,
            ZERADOS: 0,
            NEGATIVOS: 0,
            CABOS: 0,
        };

        for (const p of produtos) {
            // Ignora os itens com pedido pendente em todas as abas atuais.
            // Os dados continuam salvos no estado `produtos` para sua futura aba.
            if (p.qtdPedidaPendente > 0) continue; 
            
            // Incrementa TODOS apenas para produtos que passaram na verificação
            counts.TODOS += 1; 

            const isCabo = p.descrprod.toUpperCase().includes('CABO');

            if (isCabo) {
                counts.CABOS += 1;
            } else if (p.estoqueAtual === 0) {
                counts.ZERADOS += 1;
            } else if (p.estoqueAtual < 0) {
                counts.NEGATIVOS += 1;
            } else {
                if (counts[p.statusEstoque] !== undefined) {
                    counts[p.statusEstoque] += 1;
                }
            }
        }
        return counts;
    }, [produtos]);

    const filteredList = useMemo(() => {
        const f = filter.trim().toUpperCase();
        
        return produtos.filter((p) => {
            // Regra principal: Esconde totalmente se houver compra pendente
            if (p.qtdPedidaPendente > 0) return false;

            const isCabo = p.descrprod.toUpperCase().includes('CABO');

            // Se NÃO estiver na aba TODOS, aplica as regras de isolamento
            if (activeTab !== 'TODOS') {
                if (activeTab === 'CABOS') {
                    if (!isCabo) return false;
                } else if (activeTab === 'ZERADOS') {
                    if (p.estoqueAtual !== 0 || isCabo) return false;
                } else if (activeTab === 'NEGATIVOS') {
                    if (p.estoqueAtual >= 0 || isCabo) return false;
                } else {
                    // Abas de status: CRITICO, ATENCAO, SEGURO, SEM_SAIDA
                    if (p.estoqueAtual <= 0 || isCabo) return false;
                    if (p.statusEstoque !== activeTab) return false;
                }
            }

            // Filtro por texto (aplica para todas as abas, inclusive a TODOS)
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

    // Lógica do gráfico do Modal (Agrupa as quantidades por Mês)
    const chartData = useMemo(() => {
        if (!pedidosProduto || pedidosProduto.length === 0) return [];
        
        const grouped = new Map<string, number>();
        pedidosProduto.forEach(p => {
            // A data vem no formato DD/MM/YYYY
            const dateParts = p.dtneg.split('/');
            if (dateParts.length === 3) {
                const monthYear = `${dateParts[1]}/${dateParts[2]}`; // MM/YYYY
                grouped.set(monthYear, (grouped.get(monthYear) || 0) + p.qtd);
            }
        });

        // Converte para array e ordena cronologicamente
        const arr = Array.from(grouped, ([date, qtd]) => {
            const [m, y] = date.split('/');
            // sortKey ano+mês (ex: 202603) para ordenação cronológica correta
            return { date, sortKey: parseInt(`${y}${m}`, 10), qtd };
        });

        arr.sort((a, b) => a.sortKey - b.sortKey);
        return arr.map(({ date, qtd }) => ({ date, qtd }));
    }, [pedidosProduto]);

    // Função de Exportação para CSV
    const handleExportCSV = () => {
        if (filteredList.length === 0) {
            toast('Não há dados para exportar.', 'error');
            return;
        }

        const headers = [
            'Código', 
            'Produto', 
            'Estoque Atual', 
            'Vendas no Período', 
            'Média Diária', 
            'Reposição (Dias)', 
            'Previsão Fim (Dias)', 
            'Status'
        ];

        const csvRows = filteredList.map(p => [
            p.codprod,
            `"${p.descrprod.replace(/"/g, '""')}"`, // Escapa aspas duplas no nome
            p.estoqueAtual,
            p.vendasPeriodo,
            p.mediaDiaria.toFixed(2).replace('.', ','),
            p.tempoReposicao !== null ? p.tempoReposicao : '',
            p.diasRestantes !== null ? p.diasRestantes : 'Infinito',
            p.statusEstoque
        ].join(';')); // Ponto e vírgula é melhor para Excel BR

        // \uFEFF força o formato UTF-8 com BOM no Excel para evitar acentos quebrados
        const csvContent = "\uFEFF" + [headers.join(';'), ...csvRows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.setAttribute('download', `giro_estoque_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast('Arquivo exportado com sucesso!', 'success');
    };

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

    const getTabLabel = (tab: string) => {
        switch (tab) {
            case 'CRITICO': return 'CRÍTICO';
            case 'ATENCAO': return 'ATENÇÃO';
            case 'SEM_SAIDA': return 'SEM SAÍDA';
            case 'ZERADOS': return 'ZERADOS';
            case 'NEGATIVOS': return 'NEGATIVOS';
            case 'CABOS': return 'CABOS';
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
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Package className="w-6 h-6 text-emerald-600" />
                                    <h2 className="text-xl font-bold text-emerald-900">Projeção de Estoque</h2>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium ml-8">
                                    <span>Produtos exibidos: {filteredList.length}</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                                <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden shadow-sm">
                                    <div className="px-3 bg-slate-50 border-r border-slate-300 text-slate-500 flex items-center h-full">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        <span className="text-sm font-bold">Dias</span>
                                    </div>
                                    <input 
                                        type="number" 
                                        value={diasAnalise}
                                        onChange={(e) => setDiasAnalise(Number(e.target.value))}
                                        className="w-20 px-3 py-2 text-sm text-center font-bold text-slate-700 focus:outline-none"
                                        min="1"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={fetchGiro}
                                    disabled={loading}
                                    className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                                    Atualizar
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={handleExportCSV}
                                    disabled={loading || filteredList.length === 0}
                                    className="flex-1 sm:flex-none px-5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-emerald-700 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    <Download className="w-4 h-4" />
                                    CSV
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
                                <span className="text-sm font-medium">Nenhum produto encontrado nesta aba.</span>
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
                                                    Vendas
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
                                                <tr 
                                                    key={produto.codprod} 
                                                    onClick={() => setSelectedProduto(produto)}
                                                    className="hover:bg-emerald-50 transition-colors cursor-pointer"
                                                >
                                                    <td className="px-4 py-3 text-sm font-mono font-bold text-slate-700 whitespace-nowrap">
                                                        {produto.codprod}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm font-bold text-slate-800">{produto.descrprod}</p>
                                                    </td>
                                                    <td className={`px-4 py-3 text-sm text-right font-bold ${produto.estoqueAtual < 0 ? 'text-rose-600' : produto.estoqueAtual === 0 ? 'text-slate-400' : 'text-slate-700'}`}>
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

            {selectedProduto && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
                            <h3 className="font-bold text-emerald-900 text-lg flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-emerald-600" />
                                Detalhes de Consumo
                            </h3>
                            <button onClick={() => setSelectedProduto(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[80vh]">
                            <div className="mb-6">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Produto</p>
                                <p className="font-bold text-slate-800 text-lg leading-tight">
                                    <span className="text-emerald-600 mr-2">{selectedProduto.codprod}</span>
                                    {selectedProduto.descrprod}
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                                    <ShoppingCart className="w-6 h-6 text-slate-400 mb-2" />
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Qtd. Pedidos Diferentes</p>
                                    <p className="text-3xl font-bold text-emerald-600 mb-1">{selectedProduto.totalPedidos}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Nos últimos {diasAnalise} dias</p>
                                </div>
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                                    <Package className="w-6 h-6 text-slate-400 mb-2" />
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Média por Pedido</p>
                                    <p className="text-3xl font-bold text-emerald-600 mb-1">
                                        {selectedProduto.mediaPorPedido > 0 ? selectedProduto.mediaPorPedido.toFixed(2).replace('.', ',') : '-'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Unidades</p>
                                </div>
                            </div>

                            {/* Gráfico de Tendência Mensal */}
                            {!loadingPedidos && chartData.length > 0 && (
                                <div className="mb-6 border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                                    <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        Tendência de Vendas (Mensal)
                                    </h4>
                                    <div className="h-48 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis 
                                                    dataKey="date" 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fontSize: 10, fill: '#64748b' }} 
                                                    dy={10}
                                                />
                                                <YAxis 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fontSize: 10, fill: '#64748b' }} 
                                                    allowDecimals={false}
                                                />
                                                <RechartsTooltip 
                                                    cursor={{ fill: '#f1f5f9' }}
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                                                    formatter={(value: any) => [value, 'Qtd']}
                                                />
                                                <Bar dataKey="qtd" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-slate-100 pt-4">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <List className="w-4 h-4 text-emerald-600" /> Relatório de Pedidos 
                                </h4>
                                {loadingPedidos ? (
                                    <div className="flex justify-center p-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                                    </div>
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
                                                {pedidosProduto.length > 0 ? pedidosProduto.map(p => (
                                                    <tr key={p.numnota} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-3 font-bold text-emerald-700">{p.numnota}</td>
                                                        <td className="p-3 text-slate-500 font-medium">{p.dtneg}</td>
                                                        <td className="p-3 text-slate-600 truncate max-w-[200px]" title={p.cliente}>{p.cliente}</td>
                                                        <td className="p-3 text-slate-700 font-bold text-right">{p.qtd}</td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan={4} className="p-6 text-center text-slate-400 font-medium">Nenhum pedido encontrado no período.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
                            <button 
                                onClick={() => setSelectedProduto(null)} 
                                className="px-6 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-bold transition-colors shadow-sm"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                  animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
                }
            `}</style>
        </div>
    );
}