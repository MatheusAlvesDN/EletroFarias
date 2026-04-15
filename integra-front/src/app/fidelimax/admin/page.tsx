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
    Users,
    UserPlus,
    Coins,
    Save,
    Trash2,
    Eye,
    User,
    Receipt,
    Gift,
    Calendar,
    Info,
    PlusCircle,
    Package,
    Tag
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu'; // Ajuste o path se necessário

// ============================================================================
// TIPAGENS
// ============================================================================
type NotaPontuada = {
    id: string;
    nunota: string;
    pontos: number;
    tipo: string;
    createdAt: string;
};

type Resgate = {
    id: string;
    nunota: string;
    pontos: number;
    createdAt: string;
};

type Cliente = {
    codParc: string;
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
    pontos: number;
    notas?: NotaPontuada[]; // Alterado de notasPontuadas para notas
    resgates?: Resgate[];
};

type Premio = {
    id: string;
    nome: string;
    codigo: string;
    codProd?: string;
    pontos: number;
};

// ============================================================================
// COMPONENTE: ESTATÍSTICAS
// ============================================================================
const StatCard = ({ label, value, colorClass, icon, bgIconClass, textIconClass }: { label: string; value: string | number; colorClass: string; icon: React.ReactNode; bgIconClass: string; textIconClass: string; }) => (
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
// PÁGINA PRINCIPAL: ADMIN CLUBE ELETRO
// ============================================================================
export default function AdminClubePage() {
    const router = useRouter();

    // Controle de Abas Principais
    const [currentView, setCurrentView] = useState<'membros' | 'premios'>('membros');

    // Estados de Clientes
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [isLoadingClientes, setIsLoadingClientes] = useState(true);
    const [qClientes, setQClientes] = useState('');
    const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
    const [tabModalCliente, setTabModalCliente] = useState<'info' | 'notas' | 'resgates'>('info');
    const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

    // Estados de Prêmios
    const [premios, setPremios] = useState<Premio[]>([]);
    const [isLoadingPremios, setIsLoadingPremios] = useState(true);
    const [qPremios, setQPremios] = useState('');

    // Sidebar e Modais de Criação
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [modalNovoUser, setModalNovoUser] = useState(false);
    const [modalNovoPremio, setModalNovoPremio] = useState(false);

    // Formulários
    const [showFormNota, setShowFormNota] = useState(false);
    const [novaNota, setNovaNota] = useState({ nunota: '', pontos: '', tipo: 'BONUS' });
    const [novoUser, setNovoUser] = useState({ nome: '', cpf: '', email: '', telefone: '', codParc: '', senha: '123' });
    const [novoPremio, setNovoPremio] = useState({ nome: '', codigo: '', codProd: '', pontos: '' });

    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);

    // Feedback Snackbar
    const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({ open: false, msg: '', type: 'success' });
    const toastTimeout = useRef<NodeJS.Timeout | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>("admin@eletrofarias.com");

    const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
        setToastState({ open: true, msg, type });
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        toastTimeout.current = setTimeout(() => setToastState(prev => ({ ...prev, open: false })), 4000);
    }, []);

    // ==========================================
    // FETCH DATA
    // ==========================================
    const carregarClientes = useCallback(async () => {
        try {
            setIsLoadingClientes(true);
            const res = await fetch(`${API_BASE}/eletroclube/clientes`);
            if (res.ok) setClientes(await res.json());
        } catch (error) {
            toast('Erro ao buscar membros', 'error');
        } finally {
            setIsLoadingClientes(false);
        }
    }, [API_BASE, toast]);

    const carregarPremios = useCallback(async () => {
        try {
            setIsLoadingPremios(true);
            const res = await fetch(`${API_BASE}/eletroclube/premios`);
            if (res.ok) setPremios(await res.json());
        } catch (error) {
            toast('Erro ao buscar prêmios', 'error');
        } finally {
            setIsLoadingPremios(false);
        }
    }, [API_BASE, toast]);

    useEffect(() => {
        if (currentView === 'membros') carregarClientes();
        else if (currentView === 'premios') carregarPremios();
    }, [currentView, carregarClientes, carregarPremios]);

    // ==========================================
    // AÇÕES: CLIENTES
    // ==========================================
    const handleCriarCliente = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/eletroclube/clientes`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novoUser)
            });
            if (res.ok) {
                toast('Membro cadastrado!', 'success');
                setNovoUser({ nome: '', cpf: '', email: '', telefone: '', codParc: '', senha: '123' });
                setModalNovoUser(false);
                carregarClientes();
            } else throw new Error();
        } catch { toast('Erro ao cadastrar cliente.', 'error'); }
    };

    const handleAtualizarPontosCliente = async (codParc: string, novosPontos: number) => {
        try {
            const res = await fetch(`${API_BASE}/eletroclube/clientes/${codParc}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pontos: novosPontos })
            });
            if (res.ok) {
                toast('Saldo atualizado!', 'success');
                setClientes(clientes.map(c => c.codParc === codParc ? { ...c, pontos: novosPontos } : c));
                if (clienteSelecionado?.codParc === codParc) setClienteSelecionado(prev => prev ? { ...prev, pontos: novosPontos } : null);
            } else throw new Error();
        } catch { toast('Erro ao atualizar saldo.', 'error'); carregarClientes(); }
    };

    const handleDeletarCliente = async (codParc: string) => {
        if (!confirm('Remover este membro do clube?')) return;
        try {
            const res = await fetch(`${API_BASE}/eletroclube/clientes/${codParc}`, { method: 'DELETE' });
            if (res.ok) { toast('Membro removido.', 'success'); carregarClientes(); }
        } catch { toast('Erro ao deletar membro.', 'error'); }
    };

    const abrirDetalhesCliente = async (clienteBase: Cliente) => {
        setClienteSelecionado(clienteBase);
        setTabModalCliente('info');
        setCarregandoDetalhes(true);
        setShowFormNota(false);
        try {
            const res = await fetch(`${API_BASE}/eletroclube/clientes/${clienteBase.codParc}`);
            if (res.ok) setClienteSelecionado(await res.json());
        } catch { toast('Erro ao carregar histórico.', 'error'); }
        finally { setCarregandoDetalhes(false); }
    };

    const handleLancarNota = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clienteSelecionado) return;
        try {
            const res = await fetch(`${API_BASE}/eletroclube/lancar-notas-pontuadas`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codParc: clienteSelecionado.codParc, nunota: novaNota.nunota, pontos: Number(novaNota.pontos), tipo: novaNota.tipo })
            });
            if (res.ok) {
                toast('Pontuação lançada!', 'success');
                setNovaNota({ nunota: '', pontos: '', tipo: 'BONUS' });
                setShowFormNota(false);
                abrirDetalhesCliente(clienteSelecionado);
                carregarClientes();
            } else {
                const err = await res.json(); throw new Error(err.message);
            }
        } catch (err: any) { toast(err.message || 'Erro ao lançar nota.', 'error'); }
    };

    // ==========================================
    // AÇÕES: PRÊMIOS
    // ==========================================
    const handleCriarPremio = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                nome: novoPremio.nome,
                codigo: novoPremio.codigo,
                codProd: novoPremio.codProd || undefined,
                pontos: Number(novoPremio.pontos)
            };
            const res = await fetch(`${API_BASE}/eletroclube/premios`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (res.ok) {
                toast('Prêmio cadastrado no catálogo!', 'success');
                setNovoPremio({ nome: '', codigo: '', codProd: '', pontos: '' });
                setModalNovoPremio(false);
                carregarPremios();
            } else throw new Error();
        } catch { toast('Erro ao cadastrar prêmio.', 'error'); }
    };

    const handleAtualizarPontosPremio = async (id: string, novosPontos: number) => {
        try {
            const res = await fetch(`${API_BASE}/eletroclube/premios/${id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pontos: novosPontos })
            });
            if (res.ok) {
                toast('Custo do prêmio atualizado!', 'success');
                setPremios(premios.map(p => p.id === id ? { ...p, pontos: novosPontos } : p));
            } else throw new Error();
        } catch { toast('Erro ao atualizar prêmio.', 'error'); carregarPremios(); }
    };

    const handleDeletarPremio = async (codigo: string) => {
        if (!confirm('Remover este prêmio do catálogo?')) return;
        try {
            const res = await fetch(`${API_BASE}/eletroclube/premios/${codigo}`, { method: 'DELETE' });
            if (res.ok) { toast('Prêmio removido.', 'success'); carregarPremios(); }
        } catch { toast('Erro ao deletar prêmio.', 'error'); }
    };

    // ==========================================
    // CÁLCULOS E FILTROS
    // ==========================================
    const filteredClientes = useMemo(() => {
        const needle = qClientes.trim().toLowerCase();
        return needle ? clientes.filter(x => x.nome.toLowerCase().includes(needle) || x.cpf.includes(needle) || x.codParc.includes(needle)) : clientes;
    }, [clientes, qClientes]);

    const filteredPremios = useMemo(() => {
        const needle = qPremios.trim().toLowerCase();
        return needle ? premios.filter(x => x.nome.toLowerCase().includes(needle) || x.codigo.toLowerCase().includes(needle)) : premios;
    }, [premios, qPremios]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
            <button onClick={() => setSidebarOpen(true)} className="fixed top-4 left-4 z-50 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <Menu className="w-7 h-7" />
            </button>

            <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} userEmail={userEmail} onLogout={() => { }} />

            <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
                <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
                        <div className="flex items-center gap-3">
                            <Server className="w-8 h-8 opacity-90 text-emerald-100" />
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Painel Clube Eletro</h1>
                                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">Administração do Programa</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-center">
                            <img src="/eletro_farias2.png" alt="Logo" className="h-16 w-auto object-contain rounded px-2" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-8 animate-fade-in-up">

                {/* NAVEGAÇÃO DAS ABAS PRINCIPAIS */}
                <div className="flex gap-6 border-b border-slate-200 mb-8 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setCurrentView('membros')}
                        className={`pb-3 text-sm md:text-base font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${currentView === 'membros' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Users className="w-5 h-5" /> Gestão de Participantes
                    </button>
                    <button
                        onClick={() => setCurrentView('premios')}
                        className={`pb-3 text-sm md:text-base font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${currentView === 'premios' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Gift className="w-5 h-5" /> Catálogo de Prêmios
                    </button>
                </div>

                {/* ======================================================================= */}
                {/* VIEW: MEMBROS                                                           */}
                {/* ======================================================================= */}
                {currentView === 'membros' && (
                    <div className="animate-fade-in-up">
                        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800">Membros Cadastrados</h2>
                                <p className="text-sm font-medium text-slate-500">Acompanhe saldos e movimentações dos clientes.</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setModalNovoUser(true)} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm">
                                    <UserPlus className="w-4 h-4" /> Novo Membro
                                </button>
                                <button onClick={carregarClientes} disabled={isLoadingClientes} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50">
                                    <RotateCw className={`w-4 h-4 ${isLoadingClientes ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                            <StatCard label="Total de Membros" value={clientes.length} colorClass="text-blue-600" bgIconClass="bg-blue-100" textIconClass="text-blue-600" icon={<Users className="w-6 h-6" />} />
                            <StatCard label="Pontos em Circulação" value={clientes.reduce((a, c) => a + (c.pontos || 0), 0).toLocaleString('pt-BR')} colorClass="text-amber-500" bgIconClass="bg-amber-100" textIconClass="text-amber-500" icon={<Coins className="w-6 h-6" />} />
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center">
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="text" placeholder="Buscar por nome, CPF ou Código..." value={qClientes} onChange={(e) => setQClientes(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow" />
                                </div>
                            </div>
                            <div className="p-0 bg-white">
                                {isLoadingClientes ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-emerald-600"><Loader2 className="w-8 h-8 animate-spin mb-3" /><span className="text-sm font-bold">Carregando...</span></div>
                                ) : filteredClientes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-slate-400"><Search className="w-10 h-10 mb-3" /><span className="text-sm font-medium">Nenhum membro encontrado.</span></div>
                                ) : (
                                    <div className="overflow-x-auto scrollbar-thin">
                                        <table className="min-w-full divide-y divide-slate-200 text-left">
                                            <thead className="bg-emerald-50/80 border-b border-emerald-100 text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-5 py-3 w-24">Cód</th>
                                                    <th className="px-5 py-3">Nome do Cliente</th>
                                                    <th className="px-5 py-3">CPF</th>
                                                    <th className="px-5 py-3 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-sm">
                                                {filteredClientes.map((row) => (
                                                    <tr key={row.codParc} className="hover:bg-slate-50">
                                                        <td className="px-5 py-3 font-mono font-bold text-slate-600">{row.codParc}</td>
                                                        <td className="px-5 py-3 font-bold text-slate-800 whitespace-nowrap">{row.nome}</td>
                                                        <td className="px-5 py-3 text-slate-600">{row.cpf}</td>
                                                        <td className="px-5 py-3 text-right whitespace-nowrap">
                                                            <button onClick={() => abrirDetalhesCliente(row)} className="inline-flex items-center gap-1 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg font-medium text-xs transition-colors mr-2">
                                                                <Eye className="w-4 h-4" /> Detalhes
                                                            </button>
                                                            <button onClick={() => handleDeletarCliente(row.codParc)} className="inline-flex p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors">
                                                                <Trash2 className="w-4 h-4" />
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
                    </div>
                )}

                {/* ======================================================================= */}
                {/* VIEW: PRÊMIOS                                                           */}
                {/* ======================================================================= */}
                {currentView === 'premios' && (
                    <div className="animate-fade-in-up">
                        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800">Catálogo de Prêmios</h2>
                                <p className="text-sm font-medium text-slate-500">Gerencie as recompensas disponíveis para resgate.</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setModalNovoPremio(true)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm">
                                    <Package className="w-4 h-4" /> Adicionar Prêmio
                                </button>
                                <button onClick={carregarPremios} disabled={isLoadingPremios} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50">
                                    <RotateCw className={`w-4 h-4 ${isLoadingPremios ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                            <StatCard label="Prêmios Disponíveis" value={premios.length} colorClass="text-purple-600" bgIconClass="bg-purple-100" textIconClass="text-purple-600" icon={<Gift className="w-6 h-6" />} />
                            <StatCard label="Custo Médio" value={premios.length > 0 ? Math.round(premios.reduce((a, c) => a + c.pontos, 0) / premios.length).toLocaleString('pt-BR') : 0} colorClass="text-emerald-600" bgIconClass="bg-emerald-100" textIconClass="text-emerald-600" icon={<Tag className="w-6 h-6" />} />
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center">
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="text" placeholder="Buscar prêmio por nome ou código..." value={qPremios} onChange={(e) => setQPremios(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow" />
                                </div>
                            </div>
                            <div className="p-0 bg-white">
                                {isLoadingPremios ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-emerald-600"><Loader2 className="w-8 h-8 animate-spin mb-3" /><span className="text-sm font-bold">Carregando...</span></div>
                                ) : filteredPremios.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-slate-400"><Package className="w-10 h-10 mb-3 text-slate-300" /><span className="text-sm font-medium">Nenhum prêmio catalogado.</span></div>
                                ) : (
                                    <div className="overflow-x-auto scrollbar-thin">
                                        <table className="min-w-full divide-y divide-slate-200 text-left">
                                            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-5 py-3">Código</th>
                                                    <th className="px-5 py-3">Nome do Prêmio</th>
                                                    <th className="px-5 py-3">Ref. Produto ERP</th>
                                                    <th className="px-5 py-3 text-center">Custo (pts)</th>
                                                    <th className="px-5 py-3 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-sm">
                                                {filteredPremios.map((row) => (
                                                    <tr key={row.id} className="hover:bg-slate-50">
                                                        <td className="px-5 py-3 font-mono font-bold text-slate-600">{row.codigo}</td>
                                                        <td className="px-5 py-3 font-bold text-slate-800 whitespace-nowrap">{row.nome}</td>
                                                        <td className="px-5 py-3 text-slate-500">{row.codProd || '-'}</td>
                                                        <td className="px-5 py-3 text-center">
                                                            <input
                                                                type="number"
                                                                defaultValue={row.pontos}
                                                                onBlur={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    if (val !== row.pontos) handleAtualizarPontosPremio(row.id, val);
                                                                }}
                                                                className="w-24 px-2 py-1 text-center font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded outline-none focus:ring-2 focus:ring-emerald-400"
                                                            />
                                                        </td>
                                                        <td className="px-5 py-3 text-right">
                                                            <button onClick={() => handleDeletarPremio(row.codigo)} className="inline-flex p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors">
                                                                <Trash2 className="w-4 h-4" />
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
                    </div>
                )}

            </main>

            {/* ============================================================================ */}
            {/* MODAL DE NOVO CLIENTE */}
            {/* ============================================================================ */}
            {modalNovoUser && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><UserPlus className="w-5 h-5 text-emerald-600" /> Cadastrar Novo Membro</h2>
                            <button onClick={() => setModalNovoUser(false)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCriarCliente} className="p-6 bg-slate-50/50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Nome Completo</label><input required value={novoUser.nome} onChange={e => setNovoUser({ ...novoUser, nome: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" /></div>
                                <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">CPF</label><input required value={novoUser.cpf} onChange={e => setNovoUser({ ...novoUser, cpf: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" /></div>
                                <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Cód Parceiro</label><input required value={novoUser.codParc} onChange={e => setNovoUser({ ...novoUser, codParc: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" /></div>
                                <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">E-mail</label><input type="email" value={novoUser.email} onChange={e => setNovoUser({ ...novoUser, email: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" /></div>
                                <div><label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Telefone</label><input value={novoUser.telefone} onChange={e => setNovoUser({ ...novoUser, telefone: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" /></div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setModalNovoUser(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2"><Save className="w-4 h-4" /> Salvar Cliente</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================================ */}
            {/* MODAL DE NOVO PRÊMIO */}
            {/* ============================================================================ */}
            {modalNovoPremio && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Package className="w-5 h-5 text-emerald-600" /> Adicionar Novo Prêmio</h2>
                            <button onClick={() => setModalNovoPremio(false)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCriarPremio} className="p-6 bg-slate-50/50">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Nome do Prêmio</label>
                                    <input required value={novoPremio.nome} onChange={e => setNovoPremio({ ...novoPremio, nome: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" placeholder="Ex: Liquidificador Mondial" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Código Interno</label>
                                        <input required value={novoPremio.codigo} onChange={e => setNovoPremio({ ...novoPremio, codigo: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500 font-mono uppercase" placeholder="Ex: LIQ-MDL" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Custo em Pontos</label>
                                        <input required type="number" value={novoPremio.pontos} onChange={e => setNovoPremio({ ...novoPremio, pontos: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" placeholder="Ex: 1500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Ref. Produto ERP (Opcional)</label>
                                    <input value={novoPremio.codProd} onChange={e => setNovoPremio({ ...novoPremio, codProd: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" placeholder="Ex: 85471" />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setModalNovoPremio(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2"><Save className="w-4 h-4" /> Salvar Prêmio</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================================ */}
            {/* MODAL DE DETALHES DO CLIENTE COM TABS */}
            {/* ============================================================================ */}
            {clienteSelecionado && currentView === 'membros' && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><User className="w-5 h-5 text-emerald-600" /> Detalhes do Membro</h2>
                            <button onClick={() => setClienteSelecionado(null)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="flex border-b border-slate-200 px-6 pt-3 bg-slate-50 gap-6">
                            <button onClick={() => setTabModalCliente('info')} className={`pb-2.5 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${tabModalCliente === 'info' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Info className="w-4 h-4" /> Informações</button>
                            <button onClick={() => setTabModalCliente('notas')} className={`pb-2.5 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${tabModalCliente === 'notas' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Receipt className="w-4 h-4" /> Notas Pontuadas</button>
                            <button onClick={() => setTabModalCliente('resgates')} className={`pb-2.5 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${tabModalCliente === 'resgates' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Gift className="w-4 h-4" /> Resgates</button>
                        </div>

                        <div className="p-6 bg-slate-50/50 max-h-[65vh] overflow-y-auto scrollbar-thin">
                            {tabModalCliente === 'info' && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                                        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-2xl uppercase shadow-inner shrink-0">{clienteSelecionado.nome.charAt(0)}</div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-800 leading-tight">{clienteSelecionado.nome}</h3>
                                            <div className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1">Cód. Sankhya: <span className="font-mono text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">{clienteSelecionado.codParc}</span></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4">
                                        <div className="bg-white p-3.5 rounded-lg border border-slate-100 shadow-sm"><span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">CPF</span><span className="font-medium text-slate-700 text-sm">{clienteSelecionado.cpf}</span></div>
                                        <div className="bg-white p-3.5 rounded-lg border border-slate-100 shadow-sm"><span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Telefone</span><span className="font-medium text-slate-700 text-sm">{clienteSelecionado.telefone || 'Não informado'}</span></div>
                                        <div className="sm:col-span-2 bg-white p-3.5 rounded-lg border border-slate-100 shadow-sm"><span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">E-mail</span><span className="font-medium text-slate-700 text-sm">{clienteSelecionado.email || 'Não informado'}</span></div>
                                        <div className="sm:col-span-2 bg-emerald-50 p-6 rounded-xl border border-emerald-100 shadow-sm flex justify-between items-center mt-2">
                                            <span className="text-base text-emerald-800 uppercase font-black tracking-wider">Saldo Disponível</span>
                                            <span className="font-black text-4xl text-emerald-600">{clienteSelecionado.pontos.toLocaleString('pt-BR')} <span className="text-lg font-bold">pts</span></span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {tabModalCliente === 'notas' && (
                                <div className="animate-fade-in-up">
                                    <div className="flex justify-between items-center mb-5">
                                        <h4 className="font-bold text-slate-700 text-sm">Histórico de Movimentações</h4>
                                        <button onClick={() => setShowFormNota(!showFormNota)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${showFormNota ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'}`}>
                                            {showFormNota ? 'Cancelar Lançamento' : <><PlusCircle className="w-4 h-4" /> Lançar Pontuação</>}
                                        </button>
                                    </div>

                                    {showFormNota && (
                                        <form onSubmit={handleLancarNota} className="bg-white p-5 rounded-xl mb-6 border border-emerald-200 shadow-sm flex flex-wrap gap-4 items-end animate-fade-in-up">
                                            <div className="flex-1 min-w-[200px]">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nº da Nota ou Referência</label>
                                                <input required value={novaNota.nunota} onChange={e => setNovaNota({ ...novaNota, nunota: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:border-emerald-500 outline-none" placeholder="Ex: NF-12345 ou MANUAL-01" />
                                            </div>
                                            <div className="w-32">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pontos (Valor)</label>
                                                <input required type="number" value={novaNota.pontos} onChange={e => setNovaNota({ ...novaNota, pontos: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:border-emerald-500 outline-none" placeholder="Ex: 500" />
                                            </div>
                                            <div className="w-40">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de Lançamento</label>
                                                <select value={novaNota.tipo} onChange={e => setNovaNota({ ...novaNota, tipo: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:border-emerald-500 outline-none">
                                                    <option value="COMPRA">COMPRA</option>
                                                    <option value="BONUS">BÔNUS</option>
                                                    <option value="AJUSTE">AJUSTE</option>
                                                </select>
                                            </div>
                                            <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors h-[42px] flex items-center gap-2 shadow-sm"><Save className="w-4 h-4" /> Salvar</button>
                                        </form>
                                    )}

                                    {carregandoDetalhes ? (
                                        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
                                    ) : (!clienteSelecionado.notas || clienteSelecionado.notas.length === 0) ? (
                                        <div className="text-center py-12 bg-white rounded-lg border border-slate-100 shadow-sm"><Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-sm font-bold text-slate-500">Nenhuma nota registrada.</p></div>
                                    ) : (
                                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                    <tr><th className="px-5 py-3">Nº Nota / Ref</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Data do Lançamento</th><th className="px-5 py-3 text-right">Pontos Ganhos</th></tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                                    {clienteSelecionado.notas.map(nota => (
                                                        <tr key={nota.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-5 py-3 font-mono font-bold text-slate-800">{nota.nunota}</td>
                                                            <td className="px-5 py-3 text-xs"><span className={`px-2 py-1 rounded font-bold border ${nota.tipo === 'COMPRA' ? 'bg-blue-50 text-blue-700 border-blue-100' : nota.tipo === 'BONUS' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>{nota.tipo || 'COMPRA'}</span></td>
                                                            <td className="px-5 py-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> {new Date(nota.createdAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                                                            <td className="px-5 py-3 text-right font-black text-emerald-600 text-base">+{nota.pontos}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {tabModalCliente === 'resgates' && (
                                <div className="animate-fade-in-up">
                                    <div className="flex justify-between items-center mb-5"><h4 className="font-bold text-slate-700 text-sm">Histórico de Prêmios Resgatados</h4></div>
                                    {carregandoDetalhes ? (
                                        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
                                    ) : (!clienteSelecionado.resgates || clienteSelecionado.resgates.length === 0) ? (
                                        <div className="text-center py-12 bg-white rounded-lg border border-slate-100 shadow-sm"><Gift className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-sm font-bold text-slate-500">Nenhum resgate realizado.</p></div>
                                    ) : (
                                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                    <tr><th className="px-5 py-3">Id do Resgate / Ref</th><th className="px-5 py-3">Data da Solicitação</th><th className="px-5 py-3 text-right">Pontos Descontados</th></tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                                    {clienteSelecionado.resgates.map(resgate => (
                                                        <tr key={resgate.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-5 py-3 font-mono font-bold text-slate-800">{resgate.nunota}</td>
                                                            <td className="px-5 py-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> {new Date(resgate.createdAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                                                            <td className="px-5 py-3 text-right font-black text-rose-500 text-base">-{resgate.pontos}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end">
                            <button onClick={() => setClienteSelecionado(null)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Fechar Detalhes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Snackbar */}
            <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[150] transition-all duration-300 ease-in-out ${toastState.open ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm ${toastState.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'}`}>
                    {toastState.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toastState.msg}
                    <button type="button" onClick={() => setToastState(s => ({ ...s, open: false }))} className="ml-2 hover:opacity-75 transition-opacity"><X className="w-4 h-4" /></button>
                </div>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
                .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
                @keyframes fadeInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-fade-in-up { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
}