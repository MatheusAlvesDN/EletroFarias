'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Gift, Receipt, LogOut, Home, Menu, X, Lock } from 'lucide-react';

export default function NavbarClube() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Verifica se a URL atual contém a palavra "login"
    const isLoginPage = pathname?.includes('/login');

    return (
        <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
            <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex w-full md:w-auto justify-between items-center px-2">
                    <Link href="/clube" className="flex items-center gap-3">
                        <img
                            src="/eletro_farias2.png"
                            alt="Logo EletroFarias"
                            className="h-12 w-auto object-contain bg-green/10 rounded px-2"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">EletroFarias</h1>
                            <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                                Clube de Vantagens
                            </p>
                        </div>
                    </Link>

                    {!isLoginPage && (
                        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-emerald-50 p-2 hover:bg-emerald-600 rounded-lg transition-colors focus:outline-none">
                            {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
                        </button>
                    )}
                </div>

                {!isLoginPage && (
                    <div className="hidden md:flex items-center gap-6">
                        <Link href="/clube" className="flex items-center gap-2 text-sm font-semibold text-emerald-50 hover:text-white transition-colors">
                            <Home className="w-4 h-4" /> Início
                        </Link>
                        <Link href="/clube/extrato" className="flex items-center gap-2 text-sm font-semibold text-emerald-50 hover:text-white transition-colors">
                            <Receipt className="w-4 h-4" /> Extrato
                        </Link>
                        <Link href="/clube/premios" className="flex items-center gap-2 text-sm font-semibold text-emerald-50 hover:text-white transition-colors">
                            <Gift className="w-4 h-4" /> Prêmios
                        </Link>
                        <Link href="/clube/alterar-senha" className="flex items-center gap-2 text-sm font-semibold text-emerald-50 hover:text-white transition-colors">
                            <Lock className="w-4 h-4" /> Senha
                        </Link>

                        <Link href="/clube/login" className="ml-4 px-5 py-2 bg-white text-emerald-700 rounded-full text-sm font-bold hover:bg-emerald-50 transition-colors shadow-sm flex items-center gap-2">
                            Sair
                            <LogOut className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </div>

            {/* Dropdown Mobile */}
            {!isLoginPage && isOpen && (
                <div className="md:hidden bg-emerald-800 border-t border-emerald-600/50 px-4 py-4 flex flex-col space-y-2 shadow-lg">
                    <Link href="/clube" onClick={() => setIsOpen(false)} className="px-4 py-3 text-emerald-50 font-medium hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-3"><Home className="w-5 h-5" /> Início</Link>
                    <Link href="/clube/extrato" onClick={() => setIsOpen(false)} className="px-4 py-3 text-emerald-50 font-medium hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-3"><Receipt className="w-5 h-5" /> Extrato</Link>
                    <Link href="/clube/premios" onClick={() => setIsOpen(false)} className="px-4 py-3 text-emerald-50 font-medium hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-3"><Gift className="w-5 h-5" /> Prêmios</Link>
                    <Link href="/clube/alterar-senha" onClick={() => setIsOpen(false)} className="px-4 py-3 text-emerald-50 font-medium hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-3"><Lock className="w-5 h-5" /> Alterar Senha</Link>
                    <Link href="/clube/login" onClick={() => setIsOpen(false)} className="px-4 py-3 mt-2 text-white bg-red-500/20 font-medium hover:bg-red-500/30 rounded-xl transition-colors flex items-center gap-3"><LogOut className="w-5 h-5" /> Sair da Conta</Link>
                </div>
            )}
        </header>
    );
}