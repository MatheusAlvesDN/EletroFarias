'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface Transaction {
    title: string;
    desc: string;
    date: string;
    pts: number;
    type: 'in' | 'out';
    timestamp: number;
}

export default function ExtratoPage() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Padrão exigido
    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);

    useEffect(() => {
        async function fetchExtrato() {
            try {
                const storedUser = localStorage.getItem('@EletroClube:user');
                const token = localStorage.getItem('@EletroClube:token');

                if (!storedUser || !token) {
                    router.replace('/clube/login');
                    return;
                }

                const userData = JSON.parse(storedUser);
                setIsAuthenticated(true);

                if (!userData.codParc) {
                    console.error("codParc não encontrado no LocalStorage!");
                    return;
                }

                // Fetch incluindo o Header de Autorização
                const response = await fetch(`${API_BASE}/eletroclube/clientes/${userData.codParc}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    let movs: Transaction[] = [];

                    const parseDateSafe = (dateString: string) => {
                        const d = new Date(dateString);
                        return isNaN(d.getTime()) ? new Date() : d;
                    };

                    // Mapeia Notas
                    if (data?.notas && Array.isArray(data.notas)) {
                        const notasMovs: Transaction[] = data.notas.map((n: any) => {
                            const validDate = parseDateSafe(n.createdAt);
                            return {
                                title: `Pontuação (${n.tipo || 'COMPRA'})`,
                                desc: `Ref: ${n.nunota || 'N/A'}`,
                                date: validDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                                pts: Number(n.pontos) || 0,
                                type: 'in',
                                timestamp: validDate.getTime()
                            };
                        });
                        movs = [...movs, ...notasMovs];
                    }

                    // Mapeia Resgates
                    if (data?.resgates && Array.isArray(data.resgates)) {
                        const resgatesMovs: Transaction[] = data.resgates.map((r: any) => {
                            const validDate = parseDateSafe(r.createdAt);
                            return {
                                title: r.premio?.nome ? `Resgate: ${r.premio.nome}` : `Resgate de Prêmio`,
                                desc: `Ref: ${r.nunota || 'N/A'}`,
                                date: validDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                                pts: Number(r.pontos) || 0,
                                type: 'out',
                                timestamp: validDate.getTime()
                            };
                        });
                        movs = [...movs, ...resgatesMovs];
                    }

                    movs.sort((a, b) => b.timestamp - a.timestamp);
                    setTransactions(movs);

                    // Atualiza o cache
                    const updatedUserData = { ...userData, ...data };
                    localStorage.setItem('@EletroClube:user', JSON.stringify(updatedUserData));

                } else if (response.status === 401) {
                    // Se o token expirou
                    localStorage.removeItem('@EletroClube:user');
                    localStorage.removeItem('@EletroClube:token');
                    router.replace('/clube/login');
                } else {
                    console.error("Erro na API. Status:", response.status);
                }
            } catch (error) {
                console.error("Erro ao carregar extrato:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchExtrato();
    }, [API_BASE, router]);

    if (!isAuthenticated) return null;

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <span className="animate-spin material-symbols-outlined text-emerald-600 text-4xl">autorenew</span>
            </div>
        );
    }

    return (
        <div className="max-w-[800px] mx-auto px-4 lg:px-8 pt-6 pb-12 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Extrato de Pontos</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Acompanhe as suas entradas e saídas reais.</p>
                </div>

                <select className="bg-white border border-slate-200 text-sm font-medium text-slate-700 rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
                    <option>Todo o período</option>
                    <option>Últimos 30 dias</option>
                    <option>Últimos 60 dias</option>
                    <option>Este Ano</option>
                </select>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {transactions.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-5xl text-slate-300">receipt_long</span>
                        Nenhuma movimentação encontrada.
                    </div>
                ) : (
                    transactions.map((item, i) => (
                        <div key={i} className="flex justify-between items-center p-5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${item.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    <span className="material-symbols-outlined font-bold">{item.type === 'in' ? 'add' : 'remove'}</span>
                                </div>
                                <div>
                                    <p className="text-base font-bold text-slate-800 tracking-tight">{item.title}</p>
                                    <p className="text-xs text-slate-500 font-medium">{item.desc} • {item.date}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <span className={`text-base font-black ${item.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {item.type === 'in' ? '+' : '-'}{item.pts} pts
                                </span>
                            </div>
                        </div>
                    ))
                )}
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