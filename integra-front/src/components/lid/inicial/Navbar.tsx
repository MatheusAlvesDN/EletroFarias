'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [theme, setTheme] = useState('light');
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem('theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
            setTheme('dark');
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const isActive = (path: string) => pathname === path;

    const linkClass = (path: string) =>
        `font-label tracking-wide uppercase text-xs transition-colors ${isActive(path)
            ? 'font-bold text-primary dark:text-white border-b-2 border-primary dark:border-white pb-1'
            : 'font-medium text-on-surface-variant dark:text-stone-400 hover:text-primary dark:hover:text-white'
        }`;

    return (
        <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-outline-variant/20 dark:border-white/10 transition-colors duration-500">
            <div className="flex justify-between items-center px-8 py-4 max-w-full mx-auto">

                <Link href="/lid/inicial/home" className="flex items-center gap-2 md:gap-3 text-primary dark:text-white hover:opacity-80 transition-opacity">
                    <div className="relative w-8 h-8 md:w-10 md:h-10">
                        <div className="absolute inset-0 border-2 border-primary dark:border-white rounded-circle"></div>
                        <div className="absolute h-[120%] w-[2px] bg-primary dark:bg-white top-[-10%] left-2/3 -translate-x-1/2"></div>
                    </div>
                    <div className="text-2xl md:text-3xl font-medium tracking-tight flex items-baseline">
                        Lid<span className="text-secondary dark:text-emerald-400 text-3xl md:text-4xl leading-none">.</span>
                    </div>
                    <div className="flex flex-col text-[7px] md:text-[8px] tracking-[0.3em] font-medium leading-tight ml-1">
                        <span>ILU</span>
                        <span>MINA</span>
                        <span>ÇÃO</span>
                    </div>
                </Link>

                <div className="hidden md:flex items-center space-x-10">
                    <Link href="/lid/inicial/home" className={linkClass('/lid/inicial/home')}>Home</Link>
                    <Link href="/lid/inicial/projects" className={linkClass('/lid/inicial/projects')}>Projetos</Link>
                    <Link href="/lid/inicial/about" className={linkClass('/lid/inicial/about')}>Sobre</Link>
                    <Link href="/lid/inicial/contact" className={linkClass('/lid/inicial/contact')}>Contato</Link>
                </div>

                <div className="flex items-center gap-4">
                    {mounted && (
                        <button
                            onClick={toggleTheme}
                            className="material-symbols-outlined text-on-surface-variant dark:text-stone-400 hover:text-primary dark:hover:text-white transition-colors duration-300"
                        >
                            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                        </button>
                    )}
                    <button
                        className="md:hidden material-symbols-outlined text-on-surface-variant dark:text-stone-400"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? 'close' : 'menu'}
                    </button>
                </div>
            </div>

            {mobileMenuOpen && (
                <div className="md:hidden bg-white dark:bg-stone-950 border-b border-outline-variant/20 dark:border-white/10 px-8 py-4 flex flex-col space-y-4">
                    <Link href="/lid/inicial/home" onClick={() => setMobileMenuOpen(false)} className={linkClass('/lid/inicial/home')}>Home</Link>
                    <Link href="/lid/inicial/projects" onClick={() => setMobileMenuOpen(false)} className={linkClass('/lid/inicial/projects')}>Projetos</Link>
                    <Link href="/lid/inicial/about" onClick={() => setMobileMenuOpen(false)} className={linkClass('/lid/inicial/about')}>Sobre</Link>
                    <Link href="/lid/inicial/contact" onClick={() => setMobileMenuOpen(false)} className={linkClass('/lid/inicial/contact')}>Contato</Link>
                </div>
            )}
        </nav>
    );
}