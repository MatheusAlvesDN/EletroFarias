'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
    Save,
    RefreshCw,
    Server,
    LayoutDashboard,
    Edit3,
    AlertCircle,
    CheckCircle2,
    Clock,
    Search,
    PlayCircle,
    PauseCircle,
    Info,
    Filter,
    MessageSquare,
    CheckSquare,
    XCircle,
    Activity
} from 'lucide-react';



// Tipagem dos dados
interface Demanda {
    id: number;
    solicitacao: string;
    descricao: string;
    dataAbertura?: string;
    andamento: string; // 'Aberto' | 'EmAndamento' | 'Finalizado' | 'Abandonado' | 'Pausado'
    comentario?: string;
}

export default function AdminApp() {
        const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
        const GET_DEMANDAS_URL = useMemo(
            () => (API_BASE ? `${API_BASE}/sync/getAllDemandasTI` : `/sync/getAllDemandasTI`),
            [API_BASE]
        );
    
        const POST_DEMANDAS_URL = useMemo(
            () => (API_BASE ? `${API_BASE}/sync/atualizarDemanda` : `/sync/atualizarDemanda`),
            [API_BASE]
        );

    // Estados de seleção e edição
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [editStatus, setEditStatus] = useState<string>('');
    const [editComentario, setEditComentario] = useState<string>('');

    // Estados de dados e UI
    const [demandas, setDemandas] = useState<Demanda[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>('Todos');
    const [loading, setLoading] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string>('');

    // Simulação de dados atualizada
    const mockData: Demanda[] = [
        { 
            id: 1, 
            solicitacao: 'Solicitação de Mouse', 
            descricao: 'Mouse parou de funcionar.', 
            dataAbertura: new Date().toISOString(),
            andamento: 'Aberto',
            comentario: ''
        },
        { 
            id: 2, 
            solicitacao: 'Instalação Docker', 
            descricao: 'Docker Desktop na máquina nova.', 
            dataAbertura: new Date(Date.now() - 86400000).toISOString(),
            andamento: 'Pausado',
            comentario: 'Aguardando aprovação do gestor.'
        },
        { 
            id: 3, 
            solicitacao: 'Troca de Monitor', 
            descricao: 'Monitor piscando.', 
            dataAbertura: new Date(Date.now() - 172800000).toISOString(),
            andamento: 'Abandonado',
            comentario: 'Usuário desistiu da troca.'
        },
        { 
            id: 4, 
            solicitacao: 'Formatação PC', 
            descricao: 'Limpeza completa.', 
            dataAbertura: new Date(Date.now() - 250000000).toISOString(),
            andamento: 'Finalizado',
            comentario: 'Entregue ao usuário.'
        },
        { 
            id: 5, 
            solicitacao: 'Acesso VPN', 
            descricao: 'Acesso remoto.', 
            dataAbertura: new Date(Date.now() - 3600000).toISOString(),
            andamento: 'EmAndamento',
            comentario: 'Configurando permissões.'
        },
    ];

    // GET: Consultar todas as demandas
    const fetchAllDemandas = async () => {
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
            console.warn("Backend off, usando mock.");
            setDemandas((prev) => prev.length > 0 ? prev : mockData);
            setError('Modo Visualização: Backend não detectado.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllDemandas();
    }, []);

    // Selecionar demanda para edição
    const handleSelectDemanda = (demanda: Demanda) => {
        setSelectedId(demanda.id);
        // Se o status for nulo/vazio, assume Aberto
        setEditStatus(demanda.andamento || 'Aberto');
        setEditComentario(demanda.comentario || '');
        setSuccessMsg('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // POST: Atualizar demanda
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId) return;

        setSubmitting(true);
        setSuccessMsg('');
        setError(null);

        try {
            const response = await fetch(POST_DEMANDAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedId,
                    comentario: editComentario,
                    status: editStatus
                }),
            });

            if (!response.ok) throw new Error('Erro ao atualizar demanda');

            setSuccessMsg('Demanda atualizada com sucesso!');
            await fetchAllDemandas();
            setTimeout(() => setSuccessMsg(''), 3000);

        } catch (err) {
            console.warn("Simulação de update:", err);
            setDemandas(prev => prev.map(d => 
                d.id === selectedId 
                    ? { ...d, andamento: editStatus, comentario: editComentario }
                    : d
            ));
            setSuccessMsg('Atualizado (Modo Simulação)');
            setTimeout(() => setSuccessMsg(''), 3000);
        } finally {
            setSubmitting(false);
        }
    };

    // Estilos Visuais Atualizados
    const getCardStyle = (andamento: string, isSelected: boolean) => {
        const baseStyle = isSelected 
            ? 'ring-2 ring-emerald-500 shadow-md transform scale-[1.02]' 
            : 'hover:shadow-md hover:border-slate-400';

        switch (andamento) {
            case 'EmAndamento': // Azul
                return `bg-blue-100 border-blue-300 ${baseStyle}`;
            case 'Finalizado': // Verde
                return `bg-green-100 border-green-300 ${baseStyle}`;
            case 'Abandonado': // Vermelho
                return `bg-red-100 border-red-300 ${baseStyle}`;
            case 'Pausado': // Cinza
                return `bg-slate-200 border-slate-300 ${baseStyle}`;
            case 'Aberto': // Branco
            default:
                // Branco com borda padrão
                return `bg-white border-l-4 border-l-emerald-500 border-y border-r border-slate-200 ${baseStyle}`;
        }
    };

    const getStatusInfo = (andamento: string) => {
        switch (andamento) {
            case 'EmAndamento': // Azul
                return { icon: <Activity className="w-3 h-3" />, text: 'Em Andamento', badgeClass: 'bg-blue-600 text-white' };
            case 'Finalizado': // Verde
                return { icon: <CheckSquare className="w-3 h-3" />, text: 'Finalizado', badgeClass: 'bg-green-600 text-white' };
            case 'Abandonado': // Vermelho
                return { icon: <XCircle className="w-3 h-3" />, text: 'Abandonado', badgeClass: 'bg-red-600 text-white' };
            case 'Pausado': // Cinza
                return { icon: <PauseCircle className="w-3 h-3" />, text: 'Pausado', badgeClass: 'bg-slate-600 text-white' };
            case 'Aberto': // Branco/Neutro (Emerald badge para destaque)
            default:
                return { icon: <Clock className="w-3 h-3" />, text: 'Aberto', badgeClass: 'bg-emerald-600 text-white' };
        }
    };

    const filteredDemandas = demandas.filter(d => 
        filterStatus === 'Todos' ? true : d.andamento === filterStatus
    );

    const selectedDemandaInfo = demandas.find(d => d.id === selectedId);

    // Verifica se a demanda selecionada está "Aberta" para controlar a exibição da opção no select
    const isDemandaAberta = selectedDemandaInfo?.andamento === 'Aberto';

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
                                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider hidden sm:block">Gerenciamento de Demandas</p>
                            </div>
                        </div>
                        <img src="/eletro_farias2.png" alt="Logo 1" className="h-16 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        <img src="/lid-verde-branco.png" alt="Logo 2" className="h-16 w-auto object-contain hidden md:block" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <button onClick={fetchAllDemandas} className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:outline-none">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-6 md:py-8">
                {/* Mensagens de Feedback */}
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
                    
                    {/* COLUNA ESQUERDA: FORMULÁRIO DE ATUALIZAÇÃO */}
                    <div className="lg:col-span-4 xl:col-span-4">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden lg:sticky lg:top-24 transition-all duration-300">
                            <div className="bg-emerald-50/50 p-4 border-b border-emerald-100">
                                <h2 className="font-semibold text-emerald-900 flex items-center gap-2">
                                    <Edit3 className="w-5 h-5 text-emerald-600" />
                                    {selectedId ? `Editando ID #${selectedId}` : 'Atualizar Demanda'}
                                </h2>
                            </div>

                            {selectedId && selectedDemandaInfo ? (
                                <form onSubmit={handleUpdate} className="p-5 md:p-6 space-y-5">
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-2">
                                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Solicitação</p>
                                        <p className="text-sm font-medium text-slate-800">{selectedDemandaInfo.solicitacao}</p>
                                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{selectedDemandaInfo.descricao}</p>
                                    </div>

                                    <div>
                                        <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">
                                            Status do Andamento
                                        </label>
                                        <div className="relative">
                                            <select
                                                id="status"
                                                value={editStatus}
                                                onChange={(e) => setEditStatus(e.target.value)}
                                                className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none"
                                            >
                                                {/* Opção Aberto só aparece se já estiver aberto (para não permitir voltar para Aberto) */}
                                                {isDemandaAberta && <option value="Aberto">Aberto</option>}
                                                
                                                <option value="EmAndamento">Em Andamento</option>
                                                <option value="Pausado">Pausado</option>
                                                <option value="Finalizado">Finalizado</option>
                                                <option value="Abandonado">Abandonado</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <Filter className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="comentario" className="block text-sm font-medium text-slate-700 mb-1">
                                            Adicionar Comentário / Parecer
                                        </label>
                                        <textarea
                                            id="comentario"
                                            value={editComentario}
                                            onChange={(e) => setEditComentario(e.target.value)}
                                            placeholder="Ex: Peça solicitada ao fornecedor..."
                                            rows={4}
                                            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(null)}
                                            className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="flex-[2] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                                        >
                                            {submitting ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar Alterações</>}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="p-8 text-center flex flex-col items-center text-slate-500">
                                    <div className="bg-slate-100 p-3 rounded-full mb-3">
                                        <LayoutDashboard className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <p className="font-medium text-slate-700">Nenhuma demanda selecionada</p>
                                    <p className="text-sm mt-1 max-w-[200px]">Clique em um cartão na lista ao lado para editar o status.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUNA DIREITA: LISTA DE DEMANDAS */}
                    <div className="lg:col-span-8 xl:col-span-8 w-full">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-4 gap-3">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <LayoutDashboard className="w-5 h-5 text-slate-500" />
                                Gestão de Demandas
                                <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                                    {filteredDemandas.length}
                                </span>
                            </h2>

                            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                                <div className="relative">
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full sm:w-48 pl-3 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 transition-all appearance-none bg-white cursor-pointer"
                                    >
                                        <option value="Todos">Todos os Status</option>
                                        <option value="Aberto">Aberto</option>
                                        <option value="EmAndamento">Em Andamento</option>
                                        <option value="Pausado">Pausado</option>
                                        <option value="Finalizado">Finalizado</option>
                                        <option value="Abandonado">Abandonado</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <Filter className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="relative w-full sm:w-auto flex-grow">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" placeholder="Pesquisar..." className="w-full sm:w-48 xl:w-64 pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 transition-all" />
                                </div>
                            </div>
                        </div>

                        {/* Legenda Atualizada */}
                        <div className="mb-6 bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center overflow-x-auto">
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                                <Info className="w-3 h-3" /> Legenda:
                            </span>
                            {/* Aberto - Branco (Neutro) */}
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-slate-400 rounded-full"></div><span className="text-xs font-medium text-slate-600">Aberto</span></div>
                            {/* Em Andamento - Azul */}
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span className="text-xs font-medium text-slate-600">Em Andamento</span></div>
                             {/* Pausado - Cinza */}
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-500 rounded-full"></div><span className="text-xs font-medium text-slate-600">Pausado</span></div>
                            {/* Finalizado - Verde */}
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span className="text-xs font-medium text-slate-600">Finalizado</span></div>
                             {/* Abandonado - Vermelho */}
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div><span className="text-xs font-medium text-slate-600">Abandonado</span></div>
                        </div>

                        {loading && filteredDemandas.length === 0 ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="bg-white h-24 rounded-xl border border-slate-100 shadow-sm animate-pulse" />)}
                            </div>
                        ) : filteredDemandas.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                                <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><CheckSquare className="w-8 h-8 text-emerald-400" /></div>
                                <h3 className="text-lg font-medium text-slate-900">Nenhum registro encontrado</h3>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredDemandas.map((item) => {
                                    const statusInfo = getStatusInfo(item.andamento);
                                    const isSelected = selectedId === item.id;
                                    
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleSelectDemanda(item)}
                                            className={`group rounded-xl p-5 border transition-all duration-200 cursor-pointer ${getCardStyle(item.andamento, isSelected)}`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                                <h3 className="text-lg font-bold text-slate-800 transition-colors">
                                                    {item.solicitacao}
                                                </h3>
                                                <span className={`self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${statusInfo.badgeClass}`}>
                                                    {statusInfo.icon} {statusInfo.text}
                                                </span>
                                            </div>

                                            {item.comentario && (
                                                <div className="mt-3 mb-3 bg-white/50 p-2 rounded border border-slate-200/60 flex gap-2">
                                                    <MessageSquare className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                                    <p className="text-sm text-slate-600 italic">"{item.comentario}"</p>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between pt-3 border-t border-black/5 mt-2">
                                                <div className="text-xs text-slate-600 font-bold">
                                                    ID: #{String(item.id).padStart(4, '0')}
                                                </div>
                                                <div className="text-xs text-slate-600 font-medium">
                                                    {item.dataAbertura ? new Date(item.dataAbertura).toLocaleDateString() : 'Data n/d'}
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