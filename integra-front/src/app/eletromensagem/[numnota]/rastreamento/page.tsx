'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { 
    Package, 
    Clock, 
    BoxSelect, 
    ClipboardCheck, 
    CheckCircle2, 
    Loader2, 
    AlertCircle,
    Store
} from 'lucide-react';

// Reutilizando a tipagem do seu sistema
export interface FilaVirtualRow {
    nunota: number;
    numnota: number;
    codparc: number;
    cliente: string;
    celular: string;
    vendedor: string;
    tipoEntrega: string;
    statusFila: 'FILA' | 'SEPARANDO' | 'CONFERENCIA';
    dtneg: string;
    hrneg: string | null;
}

export default function RastreamentoPage() {
    // Pega o número da nota dinamicamente da URL
    const params = useParams();
    const numnotaUrl = params.numnota as string;

    const [pedido, setPedido] = useState<FilaVirtualRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

    useEffect(() => {
        if (!numnotaUrl) return;

        const fetchPedido = async () => {
            try {
                // Aqui estamos reaproveitando a rota da fila virtual e filtrando no front.
                // Idealmente, você pode criar uma rota no backend ex: /expedicao/rastreio/:numnota para ficar mais leve.
                const resp = await fetch(`${API_BASE}/expedicao/fila-virtual`);
                
                if (!resp.ok) {
                    throw new Error('Falha ao buscar dados do pedido.');
                }

                const data: FilaVirtualRow[] = await resp.json();
                
                // Encontra o pedido específico
                const pedidoEncontrado = data.find(p => p.numnota === Number(numnotaUrl));

                if (!pedidoEncontrado) {
                    throw new Error('Pedido não encontrado ou já finalizado.');
                }

                setPedido(pedidoEncontrado);
            } catch (err: any) {
                setErro(err.message || 'Erro ao carregar o rastreamento.');
            } finally {
                setLoading(false);
            }
        };

        fetchPedido();
        
        // Opcional: Atualizar a página automaticamente a cada 30 segundos
        const interval = setInterval(fetchPedido, 30000);
        return () => clearInterval(interval);

    }, [numnotaUrl, API_BASE]);

    // Lógica para definir a etapa atual na linha do tempo
    const getStepIndex = (status: string) => {
        switch (status) {
            case 'FILA': return 1;
            case 'SEPARANDO': return 2;
            case 'CONFERENCIA': return 3;
            default: return 0;
        }
    };

    const currentStep = pedido ? getStepIndex(pedido.statusFila) : 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
                <p className="text-slate-600 font-medium">Buscando seu pedido...</p>
            </div>
        );
    }

    if (erro || !pedido) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-rose-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Ops!</h2>
                <p className="text-slate-600 mb-6">{erro}</p>
                <p className="text-sm text-slate-500">
                    Seu pedido pode já ter sido entregue ou o número está incorreto. Em caso de dúvida, fale com seu vendedor.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
            {/* Header / Topo */}
            <header className="bg-emerald-700 text-white shadow-md p-6 rounded-b-3xl">
                <div className="max-w-md mx-auto flex flex-col items-center text-center">
                    <Store className="w-10 h-10 mb-3 text-emerald-100" />
                    <h1 className="text-2xl font-bold tracking-tight">Eletro Farias</h1>
                    <p className="text-emerald-100 text-sm mt-1">Rastreamento de Pedido</p>
                </div>
            </header>

            {/* Conteúdo Principal */}
            <main className="flex-1 w-full max-w-md mx-auto p-4 -mt-6">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
                    
                    {/* Resumo do Pedido */}
                    <div className="border-b border-slate-100 pb-4 mb-6">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Cliente</p>
                                <p className="font-bold text-lg text-slate-800 leading-tight">{pedido.cliente}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Nota</p>
                                <p className="font-mono font-bold text-lg text-emerald-600">#{pedido.numnota}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4 inline-flex px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                            <Package className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-600">
                                Tipo: <strong className="text-slate-800">{pedido.tipoEntrega}</strong>
                            </span>
                        </div>
                    </div>

                    {/* Linha do Tempo (Stepper Vertical) */}
                    <div className="relative pl-4 space-y-8">
                        {/* Linha conectora de fundo */}
                        <div className="absolute top-2 bottom-6 left-[27px] w-0.5 bg-slate-200"></div>

                        {/* Etapa 1: Fila */}
                        <div className="relative flex items-start gap-4">
                            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${currentStep >= 1 ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                                <Clock className="w-4 h-4" />
                            </div>
                            <div className="pt-1">
                                <h3 className={`font-bold ${currentStep >= 1 ? 'text-slate-800' : 'text-slate-400'}`}>Na Fila</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Aguardando disponibilidade da equipe.</p>
                            </div>
                        </div>

                        {/* Etapa 2: Separando */}
                        <div className="relative flex items-start gap-4">
                            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${currentStep >= 2 ? 'bg-yellow-500 border-yellow-500 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                                <BoxSelect className="w-4 h-4" />
                            </div>
                            <div className="pt-1">
                                <h3 className={`font-bold ${currentStep >= 2 ? 'text-slate-800' : 'text-slate-400'}`}>Em Separação</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Sua mercadoria está sendo separada.</p>
                            </div>
                        </div>

                        {/* Etapa 3: Conferência */}
                        <div className="relative flex items-start gap-4">
                            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${currentStep >= 3 ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                                <ClipboardCheck className="w-4 h-4" />
                            </div>
                            <div className="pt-1">
                                <h3 className={`font-bold ${currentStep >= 3 ? 'text-slate-800' : 'text-slate-400'}`}>Em Conferência</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Checando itens antes da liberação.</p>
                            </div>
                        </div>

                        {/* Etapa 4: Finalizado (Mock) */}
                        <div className="relative flex items-start gap-4 opacity-50">
                            <div className="relative z-10 w-8 h-8 rounded-full bg-white border-2 border-slate-300 text-slate-400 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="pt-1">
                                <h3 className="font-bold text-slate-400">Liberado</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Pronto para retirada/entrega.</p>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="text-center mt-6">
                    <p className="text-xs text-slate-400">
                        Esta página é atualizada automaticamente.
                    </p>
                </div>
            </main>
        </div>
    );
}