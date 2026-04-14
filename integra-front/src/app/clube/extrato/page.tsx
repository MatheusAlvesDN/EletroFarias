'use client';
import { useEffect, useState } from 'react';

interface Transaction {
    title: string;
    desc: string;
    date: string;
    pts: string;
    type: 'in' | 'out';
}

export default function ExtratoPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchExtrato() {
            try {
                const token = localStorage.getItem('@EletroClube:token');
                const userData = JSON.parse(localStorage.getItem('@EletroClube:user') || '{}');

                // Chamada real para o seu NestJS
                // Assumindo que você tem um endpoint que recebe o CPF ou ID do parceiro (codParc)
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/eletroclube/extrato/${userData.codParc}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setTransactions(data);
                }
            } catch (error) {
                console.error("Erro ao carregar extrato:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchExtrato();
    }, []);

    // Estado de Loading
    if (isLoading) {
        return <div className="flex justify-center py-20"><span className="animate-spin material-symbols-outlined text-eletroGreen text-4xl">autorenew</span></div>;
    }

    return (
        <div className="max-w-[800px] mx-auto px-4 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Extrato de Pontos</h1>
                    <p className="text-sm text-gray-500">Acompanhe suas entradas e saídas reais.</p>
                </div>

                <select className="bg-white border border-gray-200 text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-green-600">
                    <option>Últimos 30 dias</option>
                    <option>Últimos 60 dias</option>
                    <option>Este Ano</option>
                </select>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {transactions.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">Nenhuma movimentação encontrada.</div>
                ) : (
                    transactions.map((item, i) => (
                        <div key={i} className="flex justify-between items-center p-5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${item.type === 'in' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    <span className="material-symbols-outlined">{item.type === 'in' ? 'shopping_bag' : 'redeem'}</span>
                                </div>
                                <div>
                                    <p className="text-base font-medium text-gray-800">{item.title}</p>
                                    <p className="text-xs text-gray-500">{item.desc} • {item.date}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <span className={`text-base font-bold ${item.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.type === 'in' ? '+' : ''}{item.pts} pts
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}