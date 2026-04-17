'use client';
import React from 'react';
import Link from 'next/link';

export default function RegulamentoPage() {
    return (
        <div className="max-w-[800px] mx-auto px-4 lg:px-8 pt-6 pb-12 animate-fade-in-up">
            <header className="mb-8 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3 mb-2">
                    <Link href="/clube" className="text-slate-400 hover:text-emerald-600 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Regulamento</h1>
                </div>
                <p className="text-sm text-slate-500 font-medium ml-9">Conheça as regras aplicáveis ao nosso Clube de Vantagens EletroFarias.</p>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col p-6 space-y-4">
                <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
                    <p className="mb-4">
                        O Programa <strong>Clube de Vantagens EletroFarias</strong> tem o propósito de recompensar nossos clientes por sua preferência. Ao aceitar participar, o cliente concorda com todos os termos explicitados ou futuros.
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">Artigo 1: Inscrição e Uso</h3>
                    <p className="mb-4">
                        A inscrição no programa é totalmente automática e vinculada à sua conta de cliente principal. É pessoal, inalienável e não-transferível sob nenhuma hipótese.
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">Artigo 2: Acúmulo de Pontos</h3>
                    <p className="mb-4">
                        O saldo de pontos cresce a depender dos produtos e quantidade de emissões com a loja EletroFarias. Caso aconteçam trocas ou devoluções de mercadorias pontuadas, os pontos recebidos pelas mesmas serão deduzidos do extrato real paralelamente no sistema.
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">Artigo 3: Resgates</h3>
                    <p>
                        A EletroFarias reserva o direito de alterar os prêmios disponíveis no catálogo sem nenhum aviso prévio. Ao solicitar um resgate, processaremos internamente o seu pedido e pode haver uma análise do uso da conta durante a entrega em sua localização. O valor mínimo para o resgate do tipo 'dinheiro' será sempre de duzentos reais (R$ 200,00), convertidos a taxa pré-fixada.
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
