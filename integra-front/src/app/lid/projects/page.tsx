'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ProjectsPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="bg-background text-on-surface font-body selection:bg-primary/20 selection:text-primary min-h-screen">
            {/* TopNavBar */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-outline-variant/20">
                <div className="flex justify-between items-center px-8 py-4 max-w-full mx-auto">
                    <div className="flex items-center gap-3">
                        <img alt="Logo da Empresa" className="h-10 w-auto"src="/lid-verde-branco.png" />
                        <span className="text-xl font-bold tracking-tight text-primary">LID Iluminação</span>
                    </div>                    <div className="hidden md:flex items-center space-x-10">
                        <Link href="/lid/home" className="font-label tracking-wide font-medium uppercase text-xs text-on-surface-variant hover:text-primary transition-colors">Home</Link>
                        <Link href="/lid/projects" className="font-label tracking-wide font-bold uppercase text-xs text-primary border-b-2 border-primary pb-1">Projetos</Link>
                        <Link href="/lid/about" className="font-label tracking-wide font-medium uppercase text-xs text-on-surface-variant hover:text-primary transition-colors">Sobre</Link>
                        <Link href="/lid/contact" className="font-label tracking-wide font-medium uppercase text-xs text-on-surface-variant hover:text-primary transition-colors">Contato</Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors duration-300">light_mode</button>
                        <button className="md:hidden material-symbols-outlined text-on-surface-variant" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? 'close' : 'menu'}
                        </button>
                    </div>
                </div>
            </nav>

            <main className="pt-32 pb-24">
                <header className="px-8 md:ml-[8.5rem] md:mr-16 mb-20">
                    <div className="max-w-4xl">
                        <p className="font-label text-primary uppercase tracking-[0.2em] text-[10px] font-bold mb-4">Portfólio</p>
                        <h1 className="font-headline text-5xl md:text-7xl text-primary font-extrabold tracking-tight leading-[1.1] mb-8">
                            Criando Atmosferas <br />Através da Luz.
                        </h1>
                        <div className="flex flex-wrap gap-8 mt-12 border-b border-outline-variant/30 pb-6">
                            <button className="font-label text-xs uppercase tracking-widest text-primary font-bold border-b-2 border-primary pb-2">Todos os Projetos</button>
                            <button className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors pb-2">Residencial</button>
                            <button className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors pb-2">Comercial</button>
                            <button className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors pb-2">Espaços Públicos</button>
                        </div>
                    </div>
                </header>

                <section className="px-8 md:px-24">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        <div className="col-span-1 md:col-span-8 group cursor-pointer">
                            <div className="relative overflow-hidden aspect-[16/9] mb-6 rounded">
                                <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Projeto Residencial 1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBX_2UFcnl5PAHl5yV5d7GwuHQiS4bbNuP-gmXM-j3kDu5Fv7d81HEgd5SzagqaKLIOBK0eC6KbsoE2iS88mrHQwJWRf8KlR-7s3asRaKYk8yu0U-4dJZEnnqUUVWLOes798GJbB4DX5gmAZ0fjwHQctjrwu0cO3HAM15mJJ65q3v39l8F1egLD_mtAi8knZozq2T_3TSo4N4qrsykBcXlQLjRdpyDnxWXBriXqjb6rvbknS5UwasAyx2vLTjtwK7RyOb4ajBZvwA" />
                                <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur px-6 py-4 shadow-xl rounded">
                                    <span className="font-label text-[10px] uppercase tracking-[0.3em] text-primary font-bold">Novo Projeto</span>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                                <div>
                                    <h3 className="font-headline text-3xl text-primary mb-2">[Nome do Projeto 1]</h3>
                                    <p className="font-body text-on-surface-variant max-w-md">Um estudo em reflexão e serenidade, onde a iluminação preenche a lacuna entre a estrutura e a natureza.</p>
                                </div>
                                <span className="font-label text-[10px] uppercase tracking-widest text-outline font-medium">Residencial / 2024</span>
                            </div>
                        </div>
                        
                        <div className="col-span-1 md:col-span-4 mt-0 md:mt-24 group cursor-pointer">
                            <div className="relative overflow-hidden aspect-[3/4] mb-6 rounded">
                                <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Galeria de Arte" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXWIaszkn4ejz2ARbjnRa_WilJSYKZhGmzB4BgJ9G9nbMR84V4NGSiYaI_SkAGq2jfH6jhs-lcIh_lj29OBOF6vXub06Iz0sIgU8t0AhRxCwrVBy08zHlMagMYSSB5u7AqnVQhoCRnzn5Al8Z0sU_nyajtABbWxFzSakXxnp9Z578mFob4NnwCR6uyUbU34CjkG0zjIvmatfb0mHHXuwKEH_oTAVu_-3zE9h_egPFhDl5vlvVHEwyMXQq6BkHyl_aM93tKxWb20g" />
                            </div>
                            <div>
                                <h3 className="font-headline text-2xl text-primary mb-2">[Nome do Projeto 2]</h3>
                                <p className="font-body text-on-surface-variant text-sm">Reprodução precisa de cores para preservar a alma das obras-primas contemporâneas.</p>
                                <div className="mt-4 flex items-center gap-2 group/link">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Ver Detalhes</span>
                                    <div className="h-[1px] w-8 bg-primary transition-all group-hover/link:w-12"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="col-span-1 md:col-span-5 md:ml-12 group cursor-pointer">
                            <div className="relative overflow-hidden aspect-square mb-6 rounded">
                                <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Projeto Corporativo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZwZNu813R4XuA12c9zz8_ZF6hIBdtmsPekRxxQJaOCLMBRyU3A6QnZcR4JyQFt_aO8PUj12k-6b-MmwDYRFq83Up9FyK7_Tqsne324ezpar2hKWiJrhTlhmkQe4R7Tfbf7VVShMB6Bmiva6e347CMXY-jDHmjcSTRcCAtU4xl6gEq8gaRHG0NUr3a2ZLiIcSbK9x7Z7JDf-eUGu4nR9CCQNsra4OWJaAvHSQD2EjwEievlOVwN0nPQKqjHMyBJuJZWU-CsgFnFA" />
                            </div>
                            <div>
                                <h3 className="font-headline text-2xl text-primary mb-2">[Nome do Projeto 3]</h3>
                                <p className="font-body text-on-surface-variant text-sm">Ambientes de iluminação dinâmicos para o futuro dos espaços de trabalho colaborativos.</p>
                            </div>
                        </div>
                        
                        <div className="col-span-1 md:col-span-7 group cursor-pointer md:self-center">
                            <div className="relative overflow-hidden aspect-[4/3] mb-6 rounded">
                                <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Projeto de Resort" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAm0ieoAR9TH4aQmXJo_oqSrLF8_r_ZzyH3vd5Ird3WCTfuLJoSmlpckQabcyctaF5ltHuE67vl4Omy4g0fc_7CVEbxboRzGVRSbjZkXkk-NjiyjBqmLf-r75byHRHoazPB0wkz5l4nSVz0aJwZHde18Bqus3cm2i27BAtTFcyVBbh9DPhMZx5tCgMxATnjgr1Pp3x1YwmUm-MmCNgRlRgrfuGihXm_-ADlqrnPH_7oC134HQbizb3vRW684Y2RwiVnbuLxtENefg" />
                            </div>
                            <div className="flex justify-between items-start">
                                <div className="max-w-xs">
                                    <h3 className="font-headline text-2xl text-primary mb-2">[Nome do Projeto 4]</h3>
                                    <p className="font-body text-on-surface-variant text-sm">Esculpindo a paisagem noturna através da iluminação discreta.</p>
                                </div>
                                <span className="font-label text-[10px] uppercase tracking-widest text-outline border border-outline-variant/50 px-3 py-1 rounded">Hospitalidade</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-32 px-8 py-24 bg-surface-container-low text-center">
                    <h2 className="font-headline text-4xl text-primary mb-6 font-bold">Interessado em iluminar o seu espaço?</h2>
                    <p className="font-body text-on-surface-variant mb-10 max-w-xl mx-auto text-lg">Todo projeto começa com uma conversa sobre luz e experiência humana. Vamos criar algo extraordinário.</p>
                    <Link href="/contact" className="inline-block bg-primary text-on-primary px-10 py-4 font-label uppercase tracking-widest text-xs font-bold hover:opacity-90 transition-opacity rounded">
                        Iniciar uma Consulta
                    </Link>
                </section>
            </main>

            <footer className="w-full py-20 border-t border-outline-variant/20 bg-surface text-on-surface font-body">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-3 mb-6">
                                <img alt="Logo da Empresa" className="h-8 w-auto grayscale" src="/lid-verde-branco.png" />
                                <div className="text-xl font-bold tracking-tighter text-primary uppercase font-headline">LID Iluminação</div>
                            </div>
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
        </div>
    );
}