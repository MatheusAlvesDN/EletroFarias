'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ClubeHome() {
    // Estado para armazenar os dados do usuário real
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // Recupera os dados salvos no LoginPage
        const storedUser = localStorage.getItem('@EletroClube:user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Enquanto carrega os dados do localStorage, podemos exibir um estado inicial
    const nomeExibicao = user?.nome?.split(' ')[0] || 'Cliente';
    const saldoExibicao = user?.pontos?.toLocaleString('pt-BR') || '0';

    return (
        <div className="max-w-[1000px] mx-auto px-4 lg:px-8">

            {/* Header Saudação Dinâmico */}
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Olá, {nomeExibicao}!</h1>
                <p className="text-sm text-gray-500">Bem-vindo de volta ao seu clube de vantagens.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

                {/* Card Saldo - Ajustado com altura fixa mínima */}
                <div
                    className="rounded-2xl p-6 text-white shadow-md relative overflow-hidden"
                    style={{
                        backgroundColor: '#16a34a',
                        minHeight: '160px', // Isso garante que ele não vire uma "tripa" de 48px
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}
                >
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-white/90 mb-1">Seu Saldo Disponível</p>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl md:text-5xl font-bold">{saldoExibicao}</span>
                            <span className="text-lg font-medium text-white/80 pb-1">pts</span>
                        </div>
                        <p className="text-xs text-white/70 mt-4">Nenhum ponto expirando este mês.</p>
                    </div>

                    {/* Remova o círculo decorativo por enquanto para garantir que ele não está esmagando o conteúdo */}
                </div>

                {/* Card Nível Dinâmico (Exemplo simples de lógica de nível) */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm font-medium text-gray-500">Nível Atual</p>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                            {user?.pontos > 5000 ? 'Cliente Diamante' : 'Cliente Ouro'}
                        </span>
                    </div>

                    <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                        {/* Exemplo de barra de progresso baseada em pontos reais */}
                        <div
                            className="bg-yellow-400 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((user?.pontos / 5000) * 100, 100)}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 text-right">
                        {user?.pontos < 5000 ? `Faltam ${5000 - user?.pontos} pts para o nível Diamante` : 'Você atingiu o nível máximo!'}
                    </p>
                </div>
            </div>

            {/* Acesso Rápido - Mantido conforme original */}
            <div className="mb-10">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Acesso Rápido</h2>
                <div className="grid grid-cols-3 gap-4">
                    <Link href="/clube/extrato" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-shadow cursor-pointer text-center">
                        <div className="w-12 h-12 bg-gray-50 text-gray-700 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined">receipt_long</span>
                        </div>
                        <span className="text-xs font-medium text-gray-700">Extrato</span>
                    </Link>

                    <Link href="/clube/premios" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-shadow cursor-pointer text-center">
                        <div className="w-12 h-12 bg-eletroGreen/10 text-eletroGreen rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined">redeem</span>
                        </div>
                        <span className="text-xs font-medium text-gray-700">Prêmios</span>
                    </Link>

                    <Link href="/clube/ajuda" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-shadow cursor-pointer text-center">
                        <div className="w-12 h-12 bg-gray-50 text-gray-700 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined">help</span>
                        </div>
                        <span className="text-xs font-medium text-gray-700">Ajuda</span>
                    </Link>
                </div>
            </div>

            {/* Últimas Movimentações - Aqui você poderá futuramente fazer um fetch para o backend */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Últimas Movimentações</h2>
                    <Link href="/clube/extrato" className="text-sm text-eletroGreen font-medium hover:underline">Ver todas</Link>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Se você tiver as movimentações no objeto user, pode mapear aqui */}
                    {[
                        { title: "Sincronizado com sua conta", date: "Hoje", pts: `+${user?.pontos || 0}`, type: "in" },
                    ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'in' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    <span className="material-symbols-outlined text-sm">{item.type === 'in' ? 'add' : 'remove'}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{item.title}</p>
                                    <p className="text-xs text-gray-500">{item.date}</p>
                                </div>
                            </div>
                            <span className={`text-sm font-bold ${item.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                {item.pts}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}