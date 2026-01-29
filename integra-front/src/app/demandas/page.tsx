'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
    Send,
    RefreshCw,
    Server,
    LayoutDashboard,
    PlusCircle,
    AlertCircle,
    CheckCircle2,
    Clock,
    Search,
    PlayCircle,
    PauseCircle,
    Info,
    Filter
} from 'lucide-react';


// Definição da tipagem para os dados
interface Demanda {
    id: number | string;
    solicitacao: string;
    descricao: string;
    dataAbertura?: string;
    andamento?: 'Aberto' | 'EmAndamento' | 'Pausado';
}

export default function App() {

    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
    const GET_DEMANDAS_URL = useMemo(
        () => (API_BASE ? `${API_BASE}/sync/getDemandasTI` : `/sync/getDemandasTI`),
        [API_BASE]
    );

    const PUT_DEMANDAS_URL = useMemo(
        () => (API_BASE ? `${API_BASE}/sync/criarSolicitacaoTI` : `/sync/criarSolicitacaoTI`),
        [API_BASE]
    );

    // Estados para o formulário
    const [solicitacao, setSolicitacao] = useState<string>('');
    const [descricao, setDescricao] = useState<string>('');

    // Estados para a lista e controle de UI
    const [demandas, setDemandas] = useState<Demanda[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>('Todos');

    const [loading, setLoading] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string>('');

    // Simulação de dados
    const mockData: Demanda[] = [
        {
            id: 1,
            solicitacao: 'Acesso VPN',
            descricao: 'Necessito de liberação...',
            dataAbertura: new Date().toISOString(),
            andamento: 'Aberto'
        },
        {
            id: 2,
            solicitacao: 'Instalação Docker',
            descricao: 'Instalação do Docker...',
            dataAbertura: new Date(Date.now() - 86400000).toISOString(),
            andamento: 'EmAndamento'
        },
        {
            id: 3,
            solicitacao: 'Troca de Teclado',
            descricao: 'Teclado com defeito...',
            dataAbertura: new Date(Date.now() - 172800000).toISOString(),
            andamento: 'Pausado'
        },
    ];

    const fetchDemandas = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(GET_DEMANDAS_URL);

            if (!response.ok) {
                throw new Error('Falha ao conectar com o servidor');
            }

            const data = await response.json();
            setDemandas(Array.isArray(data) ? data : []);
        } catch (err) {
            console.warn("Backend não detectado, usando dados mockados para visualização.");
            setDemandas((prev) => prev.length > 0 ? prev : mockData);
            setError('Modo de Visualização: Não foi possível conectar ao backend real.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDemandas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!solicitacao || !descricao) return;

        setSubmitting(true);
        setSuccessMsg('');
        setError(null);

        try {
            const response = await fetch(PUT_DEMANDAS_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    solicitacao: solicitacao,
                    descricao: descricao
                }),
            });

            if (!response.ok) {
                throw new Error('Erro ao criar solicitação');
            }

            setSuccessMsg('Solicitação criada com sucesso!');
            setSolicitacao('');
            setDescricao('');
            fetchDemandas();

            setTimeout(() => setSuccessMsg(''), 3000);

        } catch (err) {
            console.warn("Simulando criação pois o backend falhou:", err);
            const novaDemanda: Demanda = {
                id: Date.now(),
                solicitacao,
                descricao,
                dataAbertura: new Date().toISOString(),
                andamento: 'Aberto'
            };
            setDemandas((prev) => [novaDemanda, ...prev]);
            setSolicitacao('');
            setDescricao('');
            setSuccessMsg('Solicitação registrada (Modo Simulação)');
            setTimeout(() => setSuccessMsg(''), 3000);
        } finally {
            setSubmitting(false);
        }
    };

    // Estilos de Cartão Fortalecidos
    const getCardStyle = (andamento?: string) => {
        switch (andamento) {
            case 'EmAndamento':
                // Azul mais forte
                return 'bg-blue-100 border-blue-300 hover:border-blue-400 hover:shadow-md';
            case 'Pausado':
                // Cinza mais forte
                return 'bg-slate-200 border-slate-300 hover:border-slate-400 hover:shadow-md';
            case 'Aberto':
            default:
                // Branco com borda lateral verde forte
                return 'bg-white border-l-4 border-l-emerald-500 border-y border-r border-slate-200 hover:shadow-md hover:border-r-emerald-200';
        }
    };

    // Informações de Status com Cores Sólidas
    const getStatusInfo = (andamento?: string) => {
        switch (andamento) {
            case 'EmAndamento':
                return { icon: <PlayCircle className="w-3 h-3" />, text: 'Em Andamento', badgeClass: 'bg-blue-600 text-white shadow-sm' };
            case 'Pausado':
                return { icon: <PauseCircle className="w-3 h-3" />, text: 'Pausado', badgeClass: 'bg-slate-600 text-white shadow-sm' };
            case 'Aberto':
            default:
                return { icon: <Clock className="w-3 h-3" />, text: 'Aberto', badgeClass: 'bg-emerald-600 text-white shadow-sm' };
        }
    };

    // Lógica de Filtragem
    const filteredDemandas = demandas.filter(demanda => {
        if (filterStatus === 'Todos') return true;
        return demanda.andamento === filterStatus;
    });

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
            {/* Header */}
            <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-20">
                <div className="w-full max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <Server className="w-8 h-8 opacity-90" />
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Portal TI</h1>
                                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider hidden sm:block">Sistema de abertura de demandas</p>
                            </div>
                        </div>

                        <img
                            src="/eletro_farias2.png"
                            alt="Logo 1"
                            className="h-16 w-auto object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <img
                            src="/lid-verde-branco.png"
                            alt="Logo 2"
                            className="h-16 w-auto object-contain hidden md:block"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    </div>

                    <button
                        onClick={fetchDemandas}
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:outline-none"
                        title="Atualizar lista"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-6 md:py-8">

                {error && (
                    <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-amber-800">Atenção</p>
                            <p className="text-sm text-amber-700">{error}</p>
                        </div>
                    </div>
                )}

                {successMsg && (
                    <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r shadow-sm flex items-start gap-3 animate-fade-in">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-emerald-800">Sucesso</p>
                            <p className="text-sm text-emerald-700">{successMsg}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

                    {/* Form */}
                    <div className="lg:col-span-4 xl:col-span-4">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden lg:sticky lg:top-24 transition-all duration-300">
                            <div className="bg-emerald-50/50 p-4 border-b border-emerald-100">
                                <h2 className="font-semibold text-emerald-900 flex items-center gap-2">
                                    <PlusCircle className="w-5 h-5 text-emerald-600" />
                                    Abrir Chamado
                                </h2>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-5">
                                <div>
                                    <label htmlFor="solicitacao" className="block text-sm font-medium text-slate-700 mb-1">
                                        Título da Solicitação
                                    </label>
                                    <input
                                        id="solicitacao"
                                        type="text"
                                        value={solicitacao}
                                        onChange={(e) => setSolicitacao(e.target.value)}
                                        placeholder="Ex: Instalação de Software"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="descricao" className="block text-sm font-medium text-slate-700 mb-1">
                                        Descrição Detalhada
                                    </label>
                                    <textarea
                                        id="descricao"
                                        value={descricao}
                                        onChange={(e) => setDescricao(e.target.value)}
                                        placeholder="Descreva sua necessidade..."
                                        rows={4}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Enviar Solicitação
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* List */}
                    <div className="lg:col-span-8 xl:col-span-8 w-full">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-4 gap-3">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <LayoutDashboard className="w-5 h-5 text-slate-500" />
                                Demandas Recentes
                                <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                                    {filteredDemandas.length}
                                </span>
                            </h2>

                            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                                {/* FILTRO DE STATUS */}
                                <div className="relative">
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full sm:w-48 pl-3 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 transition-all appearance-none bg-white cursor-pointer text-slate-700 font-medium"
                                    >
                                        <option value="Todos">Todos os Status</option>
                                        <option value="Aberto">Aberto</option>
                                        <option value="EmAndamento">Em Andamento</option>
                                        <option value="Pausado">Pausado</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <Filter className="w-4 h-4" />
                                    </div>
                                </div>

                                {/* Busca (Mantida como layout, sem funcionalidade específica pedida) */}
                                <div className="relative w-full sm:w-auto flex-grow">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Pesquisar..."
                                        className="w-full sm:w-48 xl:w-64 pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* LEGENDA */}
                        <div className="mb-6 bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                                <Info className="w-3 h-3" /> Legenda:
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-4 bg-white border-l-4 border-emerald-500 border border-slate-200 rounded-sm"></div>
                                <span className="text-xs font-medium text-slate-600">Aberto</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-4 bg-blue-100 border border-blue-300 rounded-sm"></div>
                                <span className="text-xs font-medium text-slate-600">Em Andamento</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-4 bg-slate-200 border border-slate-300 rounded-sm"></div>
                                <span className="text-xs font-medium text-slate-600">Pausado</span>
                            </div>
                        </div>

                        {loading && filteredDemandas.length === 0 ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm animate-pulse">
                                        <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
                                        <div className="h-3 bg-slate-100 rounded w-3/4"></div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredDemandas.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                                <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Filter className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">Nenhuma demanda encontrada</h3>
                                <p className="text-slate-500 max-w-sm mx-auto mt-2">
                                    {filterStatus !== 'Todos'
                                        ? `Não há demandas com o status "${filterStatus}".`
                                        : "Utilize o formulário para criar a primeira solicitação de TI."}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredDemandas.map((item, index) => {
                                    const statusInfo = getStatusInfo(item.andamento);

                                    return (
                                        <div
                                            key={item.id || index}
                                            className={`group rounded-xl p-5 shadow-sm border transition-all duration-200 ${getCardStyle(item.andamento)}`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                                <h3 className="text-lg font-bold text-slate-800 transition-colors">
                                                    {item.solicitacao}
                                                </h3>
                                                <span className={`self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${statusInfo.badgeClass}`}>
                                                    {statusInfo.icon}
                                                    {statusInfo.text}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t border-black/5 mt-4">
                                                <div className="text-xs text-slate-600 font-bold">
                                                    ID: #{String(item.id || index + 1).padStart(4, '0')}
                                                </div>
                                                <div className="text-xs text-slate-600 font-medium">
                                                    {item.dataAbertura ? new Date(item.dataAbertura).toLocaleDateString() : 'Data não informada'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}