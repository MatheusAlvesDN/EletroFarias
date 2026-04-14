'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation'; // <-- Importamos o hook do Next.js

export default function NavbarClube() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Verifica se a URL atual contém a palavra "login"
    const isLoginPage = pathname?.includes('/login');

    return (
        <nav className="fixed top-0 w-full z-50 bg-white shadow-sm">
            <div className="flex justify-between items-center px-6 md:px-12 py-4 max-w-[1200px] mx-auto">

                {/* Logo Clean (Sempre visível) */}
                {/* O Link aponta para '/' se não estiver logado, ou '/inicio' se preferir */}
                <Link href="/clube" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-eletroGreen rounded-lg flex items-center justify-center text-white font-bold">
                        E
                    </div>
                    <span className="text-xl font-bold text-gray-800">Eletro<span className="text-eletroGreen">Farias</span></span>
                </Link>

                {/* ======================================================== */}
                {/* RENDERIZAR O MENU APENAS SE *NÃO* FOR A PÁGINA DE LOGIN  */}
                {/* ======================================================== */}
                {!isLoginPage && (
                    <>
                        {/* Menu Desktop */}
                        <div className="hidden md:flex space-x-6 items-center">
                            <Link href="/clube" className="text-sm font-medium text-gray-600 hover:text-eletroGreen transition-colors">Início</Link>
                            <Link href="/clube/extrato" className="text-sm font-medium text-gray-600 hover:text-eletroGreen transition-colors">Extrato</Link>
                            <Link href="/clube/premios" className="text-sm font-medium text-gray-600 hover:text-eletroGreen transition-colors">Prêmios</Link>

                            {/* Botão de Sair Arredondado */}
                            <Link href="/clube/login" className="ml-4 px-5 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors">
                                Sair
                            </Link>
                        </div>

                        {/* Botão Menu Mobile */}
                        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-gray-600">
                            <span className="material-symbols-outlined text-3xl">{isOpen ? 'close' : 'menu'}</span>
                        </button>
                    </>
                )}
            </div>

            {/* Dropdown Mobile (Também oculto no login) */}
            {!isLoginPage && isOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 flex flex-col space-y-4 shadow-lg">
                    <Link href="/clube" onClick={() => setIsOpen(false)} className="text-gray-700 font-medium">Início</Link>
                    <Link href="/clube/extrato" onClick={() => setIsOpen(false)} className="text-gray-700 font-medium">Extrato</Link>
                    <Link href="/clube/premios" onClick={() => setIsOpen(false)} className="text-gray-700 font-medium">Prêmios</Link>
                    <Link href="/clubelogin" onClick={() => setIsOpen(false)} className="text-red-500 font-medium pt-2">Sair da Conta</Link>
                </div>
            )}
        </nav>
    );
}