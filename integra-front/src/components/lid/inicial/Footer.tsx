import React from 'react';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="w-full py-20 border-t border-outline-variant/20 bg-surface text-on-surface font-body">
            <div className="max-w-7xl mx-auto px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="md:col-span-2">

                        {/* Logo Customizado em CSS (Versão Maior para o Footer) */}
                        <Link href="/lid/inicial/home" className="flex items-center gap-3 mb-6 text-primary hover:opacity-80 transition-opacity">
                            <div className="relative w-12 h-12 md:w-16 md:h-16">
                                <div className="absolute inset-0 border-[3px] border-primary rounded-circle"></div>
                                <div className="absolute h-[120%] w-[3px] bg-primary top-[-10%] left-2/3 -translate-x-1/2"></div>
                            </div>
                            <div className="text-4xl md:text-5xl font-medium tracking-tight flex items-baseline">
                                Lid<span className="text-secondary">.</span>
                            </div>
                            <div className="flex flex-col text-[8px] md:text-[10px] tracking-[0.3em] font-medium leading-tight ml-2">
                                <span>ILU</span>
                                <span>MINA</span>
                                <span>ÇÃO</span>
                            </div>
                        </Link>

                    </div>
                    <div>
                        <h4 className="font-headline font-bold text-primary mb-6 uppercase tracking-widest text-sm">Conectar</h4>
                        <ul className="space-y-4">
                            <li><a className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 group" href="#">Instagram <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span></a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-headline font-bold text-primary mb-6 uppercase tracking-widest text-sm">Contato</h4>
                        <ul className="space-y-4 text-on-surface-variant">
                            <li>Campina Grande - PB, Brasil</li>
                            <li>[contato@lidiluminacao.com.br]</li>
                            <li>[+55 (83) 0000-0000]</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-20 pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-on-surface-variant/60">
                    <p>© 2024 LID Iluminação. Todos os direitos reservados.</p>
                    <div className="flex gap-8">
                        <a className="hover:text-primary transition-colors" href="#">Política de Privacidade</a>
                        <a className="hover:text-primary transition-colors" href="#">Termos de Serviço</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}