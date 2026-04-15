'use client';
import { useEffect, useMemo, useState } from 'react';
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
    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000', []);




    useEffect(() => {

        // 1. Lê os dados do usuário para pegar o saldo real e o codParc
        const storedUser = localStorage.getItem('@EletroClube:user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

        // 2. Busca os prêmios reais do backend NestJS
        const carregarPremios = async () => {
            try {
                // Substitua a URL base pela sua API ou use a sua instância do axios (ex: api.get('/eletroclube/premios'))
                const response = await fetch(`${API_BASE}/eletroclube/premios`);
                if (response.ok) {
                    const data = await response.json();
                    setPremios(data);
                }
            } catch (error) {
                console.error('Erro ao buscar prêmios:', error);
            } finally {
                setLoading(false);
            }
        };

        carregarPremios();
    }, []);

    const saldoAtual = user?.pontos || 0;

    const handleResgatar = async (premio: Premio) => {
        if (!user || !user.codParc) {
            alert('Erro: Usuário não identificado. Faça login novamente.');
            return;
        }

        if (confirm(`Deseja confirmar o resgate de: ${premio.nome} por ${premio.pontos} pts?`)) {
            try {
                // Monta o payload conforme esperado pelo nosso novo método criarResgate
                const payload = {
                    nunota: `RESG-${Date.now()}`, // Gerando um nunota fictício para o resgate, ajuste conforme sua regra de negócio
                    pontos: premio.pontos,
                    codParc: user.codParc,
                    codPremio: premio.codigo
                };

                // Enviando o POST para o backend
                const response = await fetch(`${API_BASE}/eletroclube/resgates`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    alert('Resgate realizado com sucesso!');

                    // Atualiza o saldo do usuário localmente para refletir na tela imediatamente
                    const novoSaldo = saldoAtual - premio.pontos;
                    const updatedUser = { ...user, pontos: novoSaldo };
                    setUser(updatedUser);
                    localStorage.setItem('@EletroClube:user', JSON.stringify(updatedUser));
                } else {
                    alert('Erro ao processar o resgate. Tente novamente.');
                }
            } catch (error) {
                console.error('Erro na solicitação de resgate:', error);
                alert('Falha na comunicação com o servidor.');
            }
        }
    };

    return (
        <div className="max-w-[1000px] mx-auto px-4 lg:px-8">

            <div className="mb-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Catálogo de Prêmios</h1>
                    <p className="text-sm text-gray-500">Troque seus pontos por vantagens incríveis.</p>
                </div>
                {/* Saldo Dinâmico */}
                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg font-bold text-sm border border-green-100">
                    Seu saldo: {saldoAtual.toLocaleString('pt-BR')} pts
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Carregando prêmios...</div>
            ) : (
                <>
                    {/* Grid de Prêmios Dinâmico */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {premios.map((item) => {
                            const podeResgatar = saldoAtual >= item.pontos;

                            return (
                                <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">

                                    {/* Imagem Placeholder - Pode ser dinâmica se adicionar campo no banco */}
                                    <div className="h-48 bg-gray-50 flex items-center justify-center border-b border-gray-100">
                                        <span className="material-symbols-outlined text-6xl text-gray-300">
                                            featured_seasonal_and_gifts
                                        </span>
                                    </div>

                                    <div className="p-5 flex flex-col flex-grow">
                                        <h3 className="text-sm font-medium text-gray-800 mb-1">{item.nome}</h3>
                                        {item.codProd && <p className="text-xs text-gray-400">Cód: {item.codProd}</p>}

                                        <div className="mt-auto pt-4 flex justify-between items-center">
                                            <span className={`text-lg font-bold ${podeResgatar ? 'text-green-600' : 'text-gray-400'}`}>
                                                {item.pontos.toLocaleString('pt-BR')} <span className="text-xs font-normal">pts</span>
                                            </span>

                                            <button
                                                onClick={() => handleResgatar(item)}
                                                disabled={!podeResgatar}
                                                className={`text-xs font-medium px-4 py-2 rounded-lg transition-colors ${podeResgatar
                                                    ? 'bg-gray-900 text-white hover:bg-green-600 cursor-pointer'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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

                    {/* Mensagem caso não haja prêmios cadastrados */}
                    {premios.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Nenhum prêmio disponível no momento.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}