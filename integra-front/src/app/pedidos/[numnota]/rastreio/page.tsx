'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Package,
    Clock,
    BoxSelect,
    ClipboardCheck,
    CheckCircle2,
    Loader2,
    AlertCircle
} from 'lucide-react';

export interface FilaVirtualRow {
    nunota: number;
    numnota: number;
    codparc: number;
    cliente: string;
    celular: string;
    vendedor: string;
    tipoEntrega: string;
    statusFila: 'FILA' | 'SEPARANDO' | 'CONFERENCIA' | 'LIBERADO';
    dtneg: string;
    hrneg: string | null;
}

// Interface para mapear os dados vindos do Prisma
export interface TemposAcompanhamento {
    fila: string | null;
    separacao: string | null;
    conferencia: string | null;
    liberado: string | null;
}

export default function RastreamentoPage() {
    const params = useParams();
    const numnotaUrl = params.numnota as string;

    const [pedido, setPedido] = useState<FilaVirtualRow | null>(null);
    const [tempos, setTempos] = useState<TemposAcompanhamento | null>(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

    useEffect(() => {
        if (!numnotaUrl) return;

        const fetchDados = async () => {
            try {
                // 1. Busca os dados principais do Sankhya
                const respSankhya = await fetch(`${API_BASE}/expedicao/rastreio/${numnotaUrl}`);

                if (!respSankhya.ok) {
                    if (respSankhya.status === 404) {
                        throw new Error('Pedido não encontrado ou já finalizado.');
                    }
                    throw new Error('Falha ao buscar dados do pedido.');
                }

                const data: FilaVirtualRow = await respSankhya.json();
                setPedido(data);
                setErro(null);

                // 2. Busca os tempos de status no Prisma usando o NUNOTA obtido
                try {
                    const respTempos = await fetch(`${API_BASE}/expedicao/acompanhamento/${data.nunota}`);
                    if (respTempos.ok) {
                        const dadosTempos = await respTempos.json();
                        setTempos(dadosTempos);
                    }
                } catch (errTempos) {
                    console.error("Não foi possível carregar os tempos:", errTempos);
                }

            } catch (err: any) {
                setErro(err.message || 'Erro ao carregar o rastreamento.');
                setPedido(null);
            } finally {
                setLoading(false);
            }
        };

        fetchDados();

        const interval = setInterval(fetchDados, 5000);
        return () => clearInterval(interval);

    }, [numnotaUrl, API_BASE]);

    const getStepIndex = (status: string) => {
        switch (status) {
            case 'FILA': return 1;
            case 'SEPARANDO': return 2;
            case 'CONFERENCIA': return 3;
            case 'LIBERADO': return 4;
            default: return 0;
        }
    };

    const formatarHora = (isoDateString?: string | null) => {
        if (!isoDateString) return null;
        const date = new Date(isoDateString);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const currentStep = pedido ? getStepIndex(pedido.statusFila) : 0;

    if (loading && !pedido) {
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
            <header className="bg-emerald-700 text-white shadow-md p-6 rounded-b-3xl">
                <div className="max-w-md mx-auto flex flex-col items-center text-center">
                    <img
                        src="/eletro_farias2.png"
                        alt="Logo 1"
                        className="h-20 w-auto object-contain bg-green/10 rounded px-2"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <h1 className="text-2xl font-bold tracking-tight">Eletro Farias</h1>
                    <p className="text-emerald-100 text-sm mt-1">Rastreamento de Pedido</p>
                </div>
            </header>

            <main className="flex-1 w-full max-w-md mx-auto p-4 -mt-6">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">

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

                    <div className="relative pl-4 space-y-8">
                        <div className="absolute top-2 bottom-6 left-[27px] w-0.5 bg-slate-200"></div>

                        {/* Etapa 1: Fila */}
                        <div className={`relative flex items-start gap-4 transition-opacity w-full ${currentStep > 1 ? 'opacity-50' : ''}`}>
                            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${currentStep >= 1 ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                                <Clock className="w-4 h-4" />
                            </div>
                            <div className="pt-1 flex-1 flex justify-between items-start">
                                <div>
                                    <h3 className={`font-bold ${currentStep >= 1 ? 'text-slate-800' : 'text-slate-400'}`}>Na Fila</h3>
                                    <p className="text-xs text-slate-500 mt-0.5 pr-2">Aguardando disponibilidade da equipe.</p>
                                </div>
                                {tempos?.fila && (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md mt-0.5 shrink-0">
                                        {formatarHora(tempos.fila)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Etapa 2: Separando */}
                        <div className={`relative flex items-start gap-4 transition-opacity w-full ${currentStep > 2 ? 'opacity-50' : ''}`}>
                            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${currentStep >= 2 ? 'bg-yellow-500 border-yellow-500 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                                <BoxSelect className="w-4 h-4" />
                            </div>
                            <div className="pt-1 flex-1 flex justify-between items-start">
                                <div>
                                    <h3 className={`font-bold ${currentStep >= 2 ? 'text-slate-800' : 'text-slate-400'}`}>Em Separação</h3>
                                    <p className="text-xs text-slate-500 mt-0.5 pr-2">Sua mercadoria está sendo separada.</p>
                                </div>
                                {tempos?.separacao && (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md mt-0.5 shrink-0">
                                        {formatarHora(tempos.separacao)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Etapa 3: Conferência */}
                        <div className={`relative flex items-start gap-4 transition-opacity w-full ${currentStep > 3 ? 'opacity-50' : ''}`}>
                            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${currentStep >= 3 ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                                <ClipboardCheck className="w-4 h-4" />
                            </div>
                            <div className="pt-1 flex-1 flex justify-between items-start">
                                <div>
                                    <h3 className={`font-bold ${currentStep >= 3 ? 'text-slate-800' : 'text-slate-400'}`}>Em Conferência</h3>
                                    <p className="text-xs text-slate-500 mt-0.5 pr-2">Checando itens antes da liberação.</p>
                                </div>
                                {tempos?.conferencia && (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md mt-0.5 shrink-0">
                                        {formatarHora(tempos.conferencia)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Etapa 4: Finalizado */}
                        <div className={`relative flex items-start gap-4 transition-opacity w-full`}>
                            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${currentStep >= 4 ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="pt-1 flex-1 flex justify-between items-start">
                                <div>
                                    <h3 className={`font-bold ${currentStep >= 4 ? 'text-slate-800' : 'text-slate-400'}`}>Liberado</h3>
                                    <p className="text-xs text-slate-500 mt-0.5 pr-2">Pronto para retirada/entrega.</p>
                                </div>
                                {tempos?.liberado && (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md mt-0.5 shrink-0">
                                        {formatarHora(tempos.liberado)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center mt-6 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin mb-1 opacity-50" />
                    <p className="text-[10px] uppercase tracking-wider font-bold">
                        Página atualizada em tempo real
                    </p>
                </div>
            </main>
        </div>
    );
}