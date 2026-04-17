'use client';
import React from 'react';
import Link from 'next/link';

export default function DuvidasPage() {
    return (
        <div className="max-w-[800px] mx-auto px-4 lg:px-8 pt-6 pb-12 animate-fade-in-up">
            <header className="mb-8 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3 mb-2">
                    <Link href="/clube" className="text-slate-400 hover:text-emerald-600 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dúvidas Frequentes</h1>
                </div>
                <p className="text-sm text-slate-500 font-medium ml-9">Encontre as respostas para as perguntas mais comuns sobre o Clube EletroFarias.</p>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col p-6 space-y-6">
                
                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">1. Como funciona o Clube de Vantagens?</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Ao realizar compras em nossa plataforma, você acumula pontos reais baseados no valor do seu pedido. Esses pontos podem ser convertidos em prêmios no nosso catálogo ou até mesmo resgatados em dinheiro, caso atinjam a cota mínima de R$ 200,00.
                    </p>
                </div>

                <hr className="border-slate-100" />

                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">2. Pontos expiraram?</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Geralmente, os pontos do Clube EletroFarias são consistentes e só expiram após um longo período de inatividade, mas recomendamos a troca regular por novos prêmios no seu catálogo para máxima vantagem. Você pode verificar mais detalhes nas movimentações do Extrato mensalmente.
                    </p>
                </div>

                <hr className="border-slate-100" />

                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">3. O resgate em dinheiro é seguro?</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Sim, 100% seguro e validado internamente. Quando você pede o resgate em dinheiro, a conta registrada no seu CNPJ ou conta bancária pré-configurada será o destino dos valores. Caso tenhamos qualquer contratempo com as informações financeiras, enviaremos um e-mail informando o procedimento.
                    </p>
                </div>

            </div>

            <style jsx global>{`
                @keyframes fadeInUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
}
