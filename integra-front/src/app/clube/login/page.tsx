'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [identificacao, setIdentificacao] = useState('');
    const [senha, setSenha] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000', []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const username = identificacao
            const password = senha
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
        <div className="max-w-md mx-auto px-4 py-16">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl">loyalty</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Clube EletroFarias</h1>
                    <p className="text-sm text-gray-500 mt-2">Faça login para ver seus pontos reais.</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CPF ou E-mail</label>
                        <input
                            type="text"
                            required
                            value={identificacao}
                            onChange={(e) => setIdentificacao(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-green-500 outline-none transition-all text-gray-800"
                            placeholder="000.000.000-00"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Senha</label>
                            <a href="#" className="text-xs text-green-600 hover:underline">Esqueceu?</a>
                        </div>
                        <input
                            type="password"
                            required
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-green-500 outline-none transition-all text-gray-800"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        /* CORREÇÃO AQUI: Espaço adicionado antes de disabled e cores explícitas */
                        className="w-full flex justify-center items-center bg-green-600 text-white font-semibold rounded-xl py-3.5 hover:bg-green-700 transition-all shadow-md mt-4 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="material-symbols-outlined animate-spin">autorenew</span>
                        ) : (
                            'Acessar Minha Conta'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}