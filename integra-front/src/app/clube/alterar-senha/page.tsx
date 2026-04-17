'use client';
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AlterarSenhaPage() {
    const router = useRouter();
    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);

    const [senhaAtual, setSenhaAtual] = useState('');
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [codParc, setCodParc] = useState('');

    useEffect(() => {
        const userStr = localStorage.getItem('@EletroClube:user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setCodParc(user.codParc || '');
        } else {
            router.push('/clube/login');
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (novaSenha.length < 6) {
            setError('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (novaSenha !== confirmarSenha) {
            setError('A nova senha e a confirmação não coincidem.');
            return;
        }

        if (senhaAtual === novaSenha) {
            setError('A nova senha deve ser diferente da senha atual.');
            return;
        }

        setIsLoading(true);

        try {
            const token = localStorage.getItem('@EletroClube:token');
            const response = await fetch(`${API_BASE}/eletroclube/alterar-senha`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    codParc,
                    senhaAtual,
                    novaSenha,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao alterar a senha.');
            }

            setSuccess('Senha alterada com sucesso!');
            setSenhaAtual('');
            setNovaSenha('');
            setConfirmarSenha('');

            setTimeout(() => router.push('/clube'), 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto px-4 pt-6 pb-12 animate-fade-in-up">
            <header className="mb-8 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3 mb-2">
                    <Link href="/clube" className="text-slate-400 hover:text-emerald-600 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Alterar Senha</h1>
                </div>
                <p className="text-sm text-slate-500 font-medium ml-9">Atualize a senha da sua conta no Clube.</p>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                {error && (
                    <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl text-center font-bold flex items-center gap-2 justify-center">
                        <span className="material-symbols-outlined text-base">error</span>
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl text-center font-bold flex items-center gap-2 justify-center">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1 tracking-tight">Senha Atual</label>
                        <input
                            type="password"
                            required
                            value={senhaAtual}
                            onChange={(e) => setSenhaAtual(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-800 bg-slate-50 focus:bg-white"
                            placeholder="••••••••"
                        />
                    </div>

                    <hr className="border-slate-100" />

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1 tracking-tight">Nova Senha</label>
                        <input
                            type="password"
                            required
                            value={novaSenha}
                            onChange={(e) => setNovaSenha(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-800 bg-slate-50 focus:bg-white"
                            placeholder="Mínimo de 6 caracteres"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1 tracking-tight">Confirmar Nova Senha</label>
                        <input
                            type="password"
                            required
                            value={confirmarSenha}
                            onChange={(e) => setConfirmarSenha(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-800 bg-slate-50 focus:bg-white"
                            placeholder="Repita a nova senha"
                        />
                        {novaSenha && confirmarSenha && novaSenha !== confirmarSenha && (
                            <p className="text-xs text-rose-500 font-bold mt-1.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">error</span>
                                As senhas não coincidem.
                            </p>
                        )}
                        {novaSenha && confirmarSenha && novaSenha === confirmarSenha && (
                            <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                As senhas coincidem.
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !senhaAtual || !novaSenha || !confirmarSenha}
                        className="w-full flex justify-center items-center gap-2 bg-emerald-600 text-white font-bold rounded-xl py-3.5 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20 hover:-translate-y-0.5 mt-6 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                    >
                        {isLoading ? (
                            <span className="material-symbols-outlined animate-spin">autorenew</span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-lg">lock_reset</span>
                                Salvar Nova Senha
                            </>
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
