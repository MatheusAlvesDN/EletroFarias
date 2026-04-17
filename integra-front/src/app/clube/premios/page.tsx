'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
// Se você usa o Axios configurado, importe-o aqui. Exemplo:
// import api from '@/services/api'; 

interface Premio {
    id: string;
    nome: string;
    codigo: string;
    codProd?: string;
    pontos: number;
}

export default function PremiosPage() {
    const [user, setUser] = useState<any>(null);
    const [premios, setPremios] = useState<Premio[]>([]);
    const [loading, setLoading] = useState(true);
    const [premioSelecionado, setPremioSelecionado] = useState<Premio | null>(null);
    const [quantidade, setQuantidade] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMoneyModalOpen, setIsMoneyModalOpen] = useState(false);
    const [valorDinheiro, setValorDinheiro] = useState<number>(200);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000', []);
    const router = useRouter();

    useEffect(() => {
        const storedUser = localStorage.getItem('@EletroClube:user');
        const token = localStorage.getItem('@EletroClube:token');

        if (!storedUser || !token) {
            router.replace('/clube/login');
            return;
        }

        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);

        // 2. Busca os prêmios reais do backend
        const carregarPremios = async () => {
            try {
                const response = await fetch(`${API_BASE}/eletroclube/premios`);
                if (response.ok) {
                    const data = await response.json();
                    setPremios(data.filter((p: Premio) => p.codigo !== 'DINHEIRO'));
                }
            } catch (error) {
                console.error('Erro ao buscar prêmios:', error);
            } finally {
                setLoading(false);
            }
        };

        carregarPremios();
    }, [API_BASE]);

    const saldoAtual = user?.pontos || 0;

    const abrirModalResgate = (premio: Premio) => {
        setPremioSelecionado(premio);
        setQuantidade(1);
    };

    const handleConfirmarResgate = async () => {
        if (!user || !user.codParc || !premioSelecionado) {
            alert('Erro: Usuário não identificado. Faça login novamente.');
            return;
        }

        const pontosTotal = premioSelecionado.pontos * quantidade;

        setIsSubmitting(true);
        try {
            const payload = {
                nunota: `RESG-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // nunota tem que ser único
                pontos: pontosTotal,
                codParc: user.codParc,
                codPremio: premioSelecionado.codigo,
                quantidade: quantidade
            };

            const response = await fetch(`${API_BASE}/eletroclube/resgates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Resgate realizado com sucesso!');
                const novoSaldo = saldoAtual - pontosTotal;
                const updatedUser = { ...user, pontos: novoSaldo };
                setUser(updatedUser);
                localStorage.setItem('@EletroClube:user', JSON.stringify(updatedUser));
                setPremioSelecionado(null);
            } else {
                alert('Erro ao processar o resgate. Tente novamente.');
            }
        } catch (error) {
            console.error('Erro na solicitação de resgate:', error);
            alert('Falha na comunicação com o servidor.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmarResgateDinheiro = async () => {
        if (!user || !user.codParc) {
            alert('Erro: Usuário não identificado. Faça login novamente.');
            return;
        }

        if (valorDinheiro < 200) {
            alert('O valor mínimo de resgate é R$ 200.');
            return;
        }

        const pontosTotal = valorDinheiro * 10;
        if (pontosTotal > saldoAtual) {
            alert('Saldo insuficiente.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                nunota: `RESDIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                valorReais: valorDinheiro,
                codParc: user.codParc
            };

            const response = await fetch(`${API_BASE}/eletroclube/resgates/dinheiro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Resgate em dinheiro realizado com sucesso!');
                const novoSaldo = saldoAtual - pontosTotal;
                const updatedUser = { ...user, pontos: novoSaldo };
                setUser(updatedUser);
                localStorage.setItem('@EletroClube:user', JSON.stringify(updatedUser));
                setIsMoneyModalOpen(false);
                setValorDinheiro(200);
            } else {
                const errData = await response.json().catch(() => ({}));
                alert(`Erro ao processar o resgate: ${errData.message || 'Tente novamente.'}`);
            }
        } catch (error) {
            console.error('Erro na solicitação de resgate em dinheiro:', error);
            alert('Falha na comunicação com o servidor.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="max-w-[1000px] mx-auto px-4 lg:px-8 animate-fade-in-up pb-12 pt-6">

            <div className="mb-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Catálogo de Prêmios</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Troque seus pontos por vantagens incríveis.</p>
                </div>
                <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-bold text-sm border border-emerald-100 shadow-sm">
                    Seu saldo: {saldoAtual.toLocaleString('pt-BR')} pts
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500 font-medium">Carregando prêmios...</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {/* Card Prêmio em Dinheiro */}
                        <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow relative">
                            <div className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded border border-emerald-200">
                                NOVO
                            </div>
                            <div className="h-48 bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center border-b border-emerald-100">
                                <span className="material-symbols-outlined text-6xl text-emerald-500 drop-shadow-sm">
                                    payments
                                </span>
                            </div>

                            <div className="p-5 flex flex-col flex-grow">
                                <h3 className="text-sm font-bold text-slate-800 mb-1 tracking-tight">Resgate em Dinheiro</h3>
                                <p className="text-xs text-slate-500 font-medium">Valor em dinheiro (via transação)</p>

                                <div className="mt-auto pt-4 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className={`text-lg font-black ${(saldoAtual >= 2000) ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            A partir de 2.000 <span className="text-xs font-bold text-slate-400">pts</span>
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">Mín. R$ 200 (10 pts = R$ 1)</span>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setValorDinheiro(200);
                                            setIsMoneyModalOpen(true);
                                        }}
                                        disabled={saldoAtual < 2000}
                                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${(saldoAtual >= 2000)
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-sm hover:-translate-y-0.5 shadow-emerald-500/20'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {(saldoAtual >= 2000) ? 'Resgatar' : 'Saldo Insuficiente'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {premios.map((item) => {
                            const podeResgatar = saldoAtual >= item.pontos;

                            return (
                                <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                                    <div className="h-48 bg-slate-50 flex items-center justify-center border-b border-slate-100 group">
                                        <span className="material-symbols-outlined text-6xl text-slate-300 group-hover:text-emerald-400 transition-colors">
                                            featured_seasonal_and_gifts
                                        </span>
                                    </div>

                                    <div className="p-5 flex flex-col flex-grow">
                                        <h3 className="text-sm font-bold text-slate-800 mb-1 tracking-tight">{item.nome}</h3>
                                        {item.codProd && <p className="text-xs text-slate-400 font-medium">Cód: {item.codProd}</p>}

                                        <div className="mt-auto pt-4 flex justify-between items-center">
                                            <span className={`text-lg font-black ${podeResgatar ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {item.pontos.toLocaleString('pt-BR')} <span className="text-xs font-bold text-slate-400">pts</span>
                                            </span>

                                            <button
                                                onClick={() => abrirModalResgate(item)}
                                                disabled={!podeResgatar}
                                                className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${podeResgatar
                                                    ? 'bg-slate-800 text-white hover:bg-emerald-600 cursor-pointer shadow-sm hover:-translate-y-0.5'
                                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                {podeResgatar ? 'Resgatar' : 'Saldo Insuficiente'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {premios.length === 0 && (
                        <div className="text-center py-12 text-slate-500 font-medium">
                            Nenhum prêmio disponível no momento.
                        </div>
                    )}
                </>
            )}

            {/* Modal de Recompensa */}
            {premioSelecionado && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Confirmar Resgate</h3>
                            <button onClick={() => setPremioSelecionado(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-3xl">featured_seasonal_and_gifts</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{premioSelecionado.nome}</h4>
                                    <p className="text-sm font-medium text-slate-500">Custo: {premioSelecionado.pontos.toLocaleString('pt-BR')} pts/ud</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Quantidade desejada</label>
                                <div className="flex items-center">
                                    <button
                                        onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                                        className="w-10 h-10 rounded-l-lg bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">remove</span>
                                    </button>
                                    <input
                                        type="number"
                                        readOnly
                                        value={quantidade}
                                        className="w-16 h-10 border-y border-slate-200 text-center font-bold text-slate-800 outline-none bg-white"
                                    />
                                    <button
                                        onClick={() => {
                                            if ((quantidade + 1) * premioSelecionado.pontos <= saldoAtual) {
                                                setQuantidade(quantidade + 1);
                                            }
                                        }}
                                        className="w-10 h-10 rounded-r-lg bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-3 border-t border-slate-100 pt-3">
                                    Total a descontar: <span className="font-bold text-rose-500">{(premioSelecionado.pontos * quantidade).toLocaleString('pt-BR')} pts</span>
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setPremioSelecionado(null)}
                                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmarResgate}
                                disabled={isSubmitting || (premioSelecionado.pontos * quantidade > saldoAtual)}
                                className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-500/20"
                            >
                                {isSubmitting ? (
                                    <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        Confirmar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Dinheiro */}
            {isMoneyModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2 tracking-tight">
                                <span className="material-symbols-outlined text-emerald-600">payments</span>
                                Resgate em Dinheiro
                            </h3>
                            <button onClick={() => setIsMoneyModalOpen(false)} className="text-emerald-600 hover:text-emerald-800 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Quantos reais você deseja resgatar?
                                </label>
                                <p className="text-xs text-slate-500 mb-4 font-medium">
                                    Valor mínimo de <strong>R$ 200,00</strong>. Cada 10 pontos equivale a R$ 1,00.
                                </p>

                                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                                    <span className="text-xl font-black text-slate-400">R$</span>
                                    <input
                                        type="number"
                                        min="200"
                                        value={valorDinheiro || ''}
                                        onChange={(e) => setValorDinheiro(Number(e.target.value))}
                                        className="w-full text-2xl font-black text-slate-800 outline-none bg-transparent"
                                        placeholder="200"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                                <p className="text-sm font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">Resumo da Solicitação</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm font-medium">
                                        <span className="text-slate-600">Valor desejado:</span>
                                        <span className="font-bold text-emerald-600">R$ {Number(valorDinheiro).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-medium">
                                        <span className="text-slate-600">Pontos a descontar:</span>
                                        <span className="font-bold text-rose-500">{(valorDinheiro * 10).toLocaleString('pt-BR')} pts</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200 mt-2 font-medium">
                                        <span className="text-slate-600">Seu saldo atual:</span>
                                        <span className="font-bold text-slate-800">{saldoAtual.toLocaleString('pt-BR')} pts</span>
                                    </div>
                                </div>
                            </div>

                            {(valorDinheiro * 10) > saldoAtual && (
                                <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm flex items-start gap-2 border border-rose-100 font-medium">
                                    <span className="material-symbols-outlined text-sm mt-0.5 font-bold">error</span>
                                    <p>Saldo insuficiente para este valor! Você possui {saldoAtual.toLocaleString('pt-BR')} pts.</p>
                                </div>
                            )}
                            {valorDinheiro < 200 && valorDinheiro > 0 && (
                                <div className="bg-amber-50 text-amber-700 p-3 rounded-xl text-sm flex items-start gap-2 border border-amber-100 font-medium">
                                    <span className="material-symbols-outlined text-sm mt-0.5 font-bold">warning</span>
                                    <p>O valor mínimo para resgate em dinheiro é <strong>R$ 200,00</strong>.</p>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setIsMoneyModalOpen(false)}
                                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmarResgateDinheiro}
                                disabled={isSubmitting || (valorDinheiro * 10 > saldoAtual) || valorDinheiro < 200}
                                className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-500/20"
                            >
                                {isSubmitting ? (
                                    <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        Confirmar Solicitação
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}