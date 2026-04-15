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
    Info
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
    notasPontuadas?: NotaPontuada[];
    resgates?: Resgate[];
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
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [q, setQ] = useState('');

    // Sidebar e Modais
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [modalNovoUser, setModalNovoUser] = useState(false);

    const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
    const [tabModal, setTabModal] = useState<'info' | 'notas' | 'resgates'>('info');
    const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);

    // Estado do formulário
    const [novoUser, setNovoUser] = useState({
        nome: '',
        cpf: '',
        email: '',
        telefone: '',
        codParc: '',
        senha: '123'
    });

    // Feedback Snackbar
    const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
        open: false,
        msg: '',
        type: 'success',
    });
    const toastTimeout = useRef<NodeJS.Timeout | null>(null);

    // Utils de Autenticação simulada baseada na referência
    const [userEmail, setUserEmail] = useState<string | null>("admin@eletrofarias.com");

    const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
        setToastState({ open: true, msg, type });
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        toastTimeout.current = setTimeout(() => {
            setToastState((prev) => ({ ...prev, open: false }));
        }, 4000);
    }, []);

    const carregarClientes = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_BASE}/eletroclube/clientes`);
            if (res.ok) {
                const data = await res.json();
                setClientes(data);
            } else {
                throw new Error('Falha ao buscar membros');
            }
        } catch (error) {
            toast('Erro ao comunicar com o servidor', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [API_BASE, toast]);

    useEffect(() => {
        carregarClientes();
    }, [carregarClientes]);

    // Ações CRUD
    const handleCriarCliente = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE}/eletroclube/clientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoUser)
            });

            if (response.ok) {
                toast('Membro cadastrado com sucesso!', 'success');
                setNovoUser({ nome: '', cpf: '', email: '', telefone: '', codParc: '', senha: '123' });
                setModalNovoUser(false);
                carregarClientes();
            } else {
                throw new Error('Falha no cadastro');
            }
        } catch (error) {
            toast('Erro ao cadastrar cliente.', 'error');
        }
    };

    const handleAtualizarPontos = async (codParc: string, novosPontos: number) => {
        try {
            const response = await fetch(`${API_BASE}/eletroclube/clientes/${codParc}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pontos: novosPontos })
            });

            if (response.ok) {
                toast('Saldo atualizado com sucesso!', 'success');
                // Atualiza localmente para não precisar fazer fetch de toda a lista
                setClientes(clientes.map(c => c.codParc === codParc ? { ...c, pontos: novosPontos } : c));

                if (clienteSelecionado?.codParc === codParc) {
                    setClienteSelecionado(prev => prev ? { ...prev, pontos: novosPontos } : null);
                }
            } else {
                throw new Error('Erro na atualização');
            }
        } catch (error) {
            toast('Erro ao atualizar saldo.', 'error');
            carregarClientes(); // Recarrega para voltar ao valor real do banco
        }
    };

    const handleDeletarCliente = async (codParc: string) => {
        if (!confirm('Tem certeza que deseja remover este membro do clube?')) return;

        try {
            const response = await fetch(`${API_BASE}/eletroclube/clientes/${codParc}`, { method: 'DELETE' });
            if (response.ok) {
                toast('Membro removido.', 'success');
                carregarClientes();
            }
        } catch (error) {
            toast('Erro ao deletar membro.', 'error');
        }
    }

    const abrirDetalhesCliente = async (clienteBase: Cliente) => {
        setClienteSelecionado(clienteBase);
        setTabModal('info');
        setCarregandoDetalhes(true);

        try {
            // Busca o cliente específico para garantir que os arrays de notas e resgates venham populados
            const res = await fetch(`${API_BASE}/eletroclube/clientes/${clienteBase.codParc}`);
            if (res.ok) {
                const dataFull = await res.json();
                setClienteSelecionado(dataFull);
            }
        } catch (error) {
            toast('Erro ao carregar o histórico do membro.', 'error');
        } finally {
            setCarregandoDetalhes(false);
        }
    };

    // Filtros e Cálculos
    const counts = useMemo(() => {
        const total = clientes.length;
        const pontosCirculando = clientes.reduce((acc, curr) => acc + (curr.pontos || 0), 0);
        return { total, pontosCirculando };
    }, [clientes]);

    const filteredData = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return clientes;
        return clientes.filter(x =>
            x.nome.toLowerCase().includes(needle) ||
            x.cpf.includes(needle) ||
            x.codParc.includes(needle)
        );
    }, [clientes, q]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">

            {/* Botão flutuante sidebar */}
            <button
                onClick={() => setSidebarOpen(true)}
                className="fixed top-4 left-4 z-50 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
                <Menu className="w-7 h-7" />
            </button>

            <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} userEmail={userEmail} onLogout={() => { }} />

            {/* Header Padronizado */}
            <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
                <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
                        <div className="flex items-center gap-3">
                            <Server className="w-8 h-8 opacity-90 text-emerald-100" />
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Painel Clube Eletro</h1>
                                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                                    Gerenciamento de Membros e Pontos
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-center">
                            <img
                                src="/eletro_farias2.png"
                                alt="Logo 1"
                                className="h-16 w-auto object-contain rounded px-2"
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
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">Gestão de Participantes</h2>
                        <p className="text-sm font-medium text-slate-500">Administre o saldo de recompensas e a base de clientes do clube.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setModalNovoUser(true)}
                            className="w-full md:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                            <UserPlus className="w-4 h-4" /> Novo Membro
                        </button>
                        <button
                            onClick={carregarClientes}
                            disabled={isLoading}
                            className="w-full md:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                        >
                            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <StatCard label="Membros Cadastrados" value={counts.total} colorClass="text-blue-600" bgIconClass="bg-blue-100" textIconClass="text-blue-600" icon={<Users className="w-6 h-6" />} />
                    <StatCard label="Pontos em Circulação" value={counts.pontosCirculando.toLocaleString('pt-BR')} colorClass="text-amber-500" bgIconClass="bg-amber-100" textIconClass="text-amber-500" icon={<Coins className="w-6 h-6" />} />
                </div>

                {/* Card Principal e Tabela */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                    {/* Filtros */}
                    <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col lg:flex-row gap-4 items-center">
                        <div className="relative w-full lg:flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, CPF ou Código Sankhya..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                            />
                        </div>
                    </div>

                    {/* Tabela Principal */}
                    <div className="p-0 bg-white">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
                                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                                <span className="text-sm font-bold">Carregando membros...</span>
                            </div>
                        ) : filteredData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                                <Search className="w-12 h-12 text-slate-300 mb-3" />
                                <span className="text-sm font-medium">Nenhum membro encontrado.</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-emerald-50/80 border-b border-emerald-100">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap w-24">Cód. Parc</th>
                                            <th className="px-5 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Nome do Cliente</th>
                                            <th className="px-5 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">CPF</th>
                                            <th className="px-5 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">Saldo (pts)</th>
                                            <th className="px-5 py-3 text-right text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap w-32">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {filteredData.map((row) => (
                                            <tr key={row.codParc} className="transition-colors hover:bg-slate-50">
                                                <td className="px-5 py-3 text-sm font-mono font-bold text-slate-600">{row.codParc}</td>
                                                <td className="px-5 py-3 text-sm font-bold text-slate-800 whitespace-nowrap">{row.nome}</td>
                                                <td className="px-5 py-3 text-sm text-slate-600">{row.cpf}</td>
                                                <td className="px-5 py-3 text-center">
                                                    <input
                                                        type="number"
                                                        defaultValue={row.pontos}
                                                        onBlur={(e) => {
                                                            const val = Number(e.target.value);
                                                            if (val !== row.pontos) handleAtualizarPontos(row.codParc, val);
                                                        }}
                                                        className="w-24 px-2 py-1 text-center font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded outline-none focus:ring-2 focus:ring-amber-400"
                                                    />
                                                </td>
                                                <td className="px-5 py-3 text-right whitespace-nowrap">
                                                    <button
                                                        onClick={() => abrirDetalhesCliente(row)}
                                                        className="inline-flex items-center justify-center p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none mr-2"
                                                        title="Ver Detalhes do Membro"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletarCliente(row.codParc)}
                                                        className="inline-flex items-center justify-center p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus:outline-none"
                                                        title="Remover Membro"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
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

            {/* ============================================================================ */}
            {/* MODAL DE NOVO CADASTRO */}
            {/* ============================================================================ */}
            {modalNovoUser && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-full flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-emerald-600" /> Cadastrar Novo Membro
                            </h2>
                            <button onClick={() => setModalNovoUser(false)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCriarCliente} className="p-6 overflow-y-auto bg-slate-100/50">
                            {/* ... (formulário permanece igual) ... */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Nome Completo</label>
                                    <input required value={novoUser.nome} onChange={e => setNovoUser({ ...novoUser, nome: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">CPF</label>
                                    <input required value={novoUser.cpf} onChange={e => setNovoUser({ ...novoUser, cpf: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Cód Parceiro (Sankhya)</label>
                                    <input required value={novoUser.codParc} onChange={e => setNovoUser({ ...novoUser, codParc: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">E-mail</label>
                                    <input type="email" value={novoUser.email} onChange={e => setNovoUser({ ...novoUser, email: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Telefone</label>
                                    <input value={novoUser.telefone} onChange={e => setNovoUser({ ...novoUser, telefone: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" />
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <button type="button" onClick={() => setModalNovoUser(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2 transition-colors">
                                    <Save className="w-4 h-4" /> Salvar Cliente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================================ */}
            {/* MODAL DE DETALHES DO CLIENTE COM TABS */}
            {/* ============================================================================ */}
            {clienteSelecionado && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">

                        {/* Header do Modal */}
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <User className="w-5 h-5 text-emerald-600" /> Detalhes do Membro
                            </h2>
                            <button onClick={() => setClienteSelecionado(null)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Sistema de Abas */}
                        <div className="flex border-b border-slate-200 px-6 pt-3 bg-slate-50 gap-6">
                            <button
                                onClick={() => setTabModal('info')}
                                className={`pb-2.5 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${tabModal === 'info' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <Info className="w-4 h-4" /> Informações
                            </button>
                            <button
                                onClick={() => setTabModal('notas')}
                                className={`pb-2.5 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${tabModal === 'notas' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <Receipt className="w-4 h-4" /> Notas Pontuadas
                            </button>
                            <button
                                onClick={() => setTabModal('resgates')}
                                className={`pb-2.5 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${tabModal === 'resgates' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <Gift className="w-4 h-4" /> Resgates
                            </button>
                        </div>

                        {/* Corpo do Modal com Rolagem */}
                        <div className="p-6 bg-slate-50/50 max-h-[60vh] overflow-y-auto scrollbar-thin">

                            {/* ABA: INFORMAÇÕES BÁSICAS */}
                            {tabModal === 'info' && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                                        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-2xl uppercase shadow-inner shrink-0">
                                            {clienteSelecionado.nome.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800 leading-tight">{clienteSelecionado.nome}</h3>
                                            <div className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1">
                                                Cód. Sankhya: <span className="font-mono text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">{clienteSelecionado.codParc}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4">
                                        <div className="bg-white p-3.5 rounded-lg border border-slate-100 shadow-sm">
                                            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">CPF</span>
                                            <span className="font-medium text-slate-700 text-sm">{clienteSelecionado.cpf}</span>
                                        </div>
                                        <div className="bg-white p-3.5 rounded-lg border border-slate-100 shadow-sm">
                                            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Telefone</span>
                                            <span className="font-medium text-slate-700 text-sm">{clienteSelecionado.telefone || 'Não informado'}</span>
                                        </div>
                                        <div className="sm:col-span-2 bg-white p-3.5 rounded-lg border border-slate-100 shadow-sm">
                                            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">E-mail</span>
                                            <span className="font-medium text-slate-700 text-sm">{clienteSelecionado.email || 'Não informado'}</span>
                                        </div>
                                        <div className="sm:col-span-2 bg-emerald-50 p-5 rounded-xl border border-emerald-100 shadow-sm flex justify-between items-center mt-2">
                                            <span className="text-sm text-emerald-800 uppercase font-black tracking-wider">Saldo Disponível</span>
                                            <span className="font-black text-3xl text-emerald-600">{clienteSelecionado.pontos.toLocaleString('pt-BR')} <span className="text-sm font-bold">pts</span></span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ABA: NOTAS PONTUADAS */}
                            {tabModal === 'notas' && (
                                <div className="animate-fade-in-up">
                                    {carregandoDetalhes ? (
                                        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
                                    ) : (!clienteSelecionado.notasPontuadas || clienteSelecionado.notasPontuadas.length === 0) ? (
                                        <div className="text-center py-12 bg-white rounded-lg border border-slate-100 shadow-sm">
                                            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                            <p className="text-sm font-bold text-slate-500">Nenhuma nota registrada para este cliente.</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                    <tr>
                                                        <th className="px-4 py-3">Nº Nota</th>
                                                        <th className="px-4 py-3">Tipo</th>
                                                        <th className="px-4 py-3">Data</th>
                                                        <th className="px-4 py-3 text-right">Pontos Ganhos</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                                    {clienteSelecionado.notasPontuadas.map(nota => (
                                                        <tr key={nota.id} className="hover:bg-slate-50">
                                                            <td className="px-4 py-3 font-mono font-bold text-slate-800">{nota.nunota}</td>
                                                            <td className="px-4 py-3 text-xs"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold border border-blue-100">{nota.tipo || 'COMPRA'}</span></td>
                                                            <td className="px-4 py-3 flex items-center gap-2"><Calendar className="w-3 h-3 text-slate-400" /> {new Date(nota.createdAt).toLocaleDateString('pt-BR')}</td>
                                                            <td className="px-4 py-3 text-right font-black text-emerald-600">+{nota.pontos}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ABA: HISTÓRICO DE RESGATES */}
                            {tabModal === 'resgates' && (
                                <div className="animate-fade-in-up">
                                    {carregandoDetalhes ? (
                                        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
                                    ) : (!clienteSelecionado.resgates || clienteSelecionado.resgates.length === 0) ? (
                                        <div className="text-center py-12 bg-white rounded-lg border border-slate-100 shadow-sm">
                                            <Gift className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                            <p className="text-sm font-bold text-slate-500">Este cliente ainda não realizou resgates.</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                    <tr>
                                                        <th className="px-4 py-3">Id / Ref</th>
                                                        <th className="px-4 py-3">Data</th>
                                                        <th className="px-4 py-3 text-right">Pontos Gastos</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                                    {clienteSelecionado.resgates.map(resgate => (
                                                        <tr key={resgate.id} className="hover:bg-slate-50">
                                                            <td className="px-4 py-3 font-mono font-bold text-slate-800">{resgate.nunota}</td>
                                                            <td className="px-4 py-3 flex items-center gap-2"><Calendar className="w-3 h-3 text-slate-400" /> {new Date(resgate.createdAt).toLocaleDateString('pt-BR')}</td>
                                                            <td className="px-4 py-3 text-right font-black text-rose-500">-{resgate.pontos}</td>
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
                            <button
                                onClick={() => setClienteSelecionado(null)}
                                className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Snackbar / Toast Customizado Principal */}
            <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[150] transition-all duration-300 ease-in-out ${toastState.open ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm ${toastState.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'}`}>
                    {toastState.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {toastState.msg}
                    <button type="button" onClick={() => setToastState(s => ({ ...s, open: false }))} className="ml-2 hover:opacity-75 transition-opacity">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        @keyframes fadeInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fade-in-up { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
        </div>
    );
}