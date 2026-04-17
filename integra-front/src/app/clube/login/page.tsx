'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [identificacao, setIdentificacao] = useState('');
    const [senha, setSenha] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Padrão exigido
    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const username = identificacao;
            const password = senha;
            const response = await fetch(`${API_BASE}/eletroclube/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Credenciais inválidas.');
            }

            // Salva os dados reais
            localStorage.setItem('@EletroClube:token', data.access_token);
            if (data.user) {
                localStorage.setItem('@EletroClube:user', JSON.stringify(data.user));
            }

            router.push('/clube');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto px-4 py-16 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl">loyalty</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Clube EletroFarias</h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">Faça login para ver seus pontos reais.</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl text-center font-bold">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1 tracking-tight">CPF ou E-mail</label>
                        <input
                            type="text"
                            required
                            value={identificacao}
                            onChange={(e) => setIdentificacao(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-800 bg-slate-50 focus:bg-white"
                            placeholder="000.000.000-00"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-bold text-slate-700 tracking-tight">Senha</label>
                            <a href="#" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors">Esqueceu?</a>
                        </div>
                        <input
                            type="password"
                            required
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-800 bg-slate-50 focus:bg-white"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center bg-emerald-600 text-white font-bold rounded-xl py-3.5 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20 hover:-translate-y-0.5 mt-6 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                    >
                        {isLoading ? (
                            <span className="material-symbols-outlined animate-spin">autorenew</span>
                        ) : (
                            'Acessar Minha Conta'
                        )}
                    </button>
                </form>
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