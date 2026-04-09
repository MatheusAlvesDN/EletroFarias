'use client';

import React from 'react';
import Link from 'next/link';
import ProjectCard from '@/components/lid/inicial/ProjectCard';

export default function ProjectsPage() {
    return (
        <main className="pt-32 pb-24">
            <header className="px-8 md:ml-[8.5rem] md:mr-16 mb-20">
                <div className="max-w-4xl">
                    <p className="font-label text-primary uppercase tracking-[0.2em] text-[10px] font-bold mb-4">Portfólio</p>
                    <h1 className="font-headline text-5xl md:text-7xl text-primary font-extrabold tracking-tight leading-[1.1] mb-8">
                        Criando Atmosferas <br />Através da Luz.
                    </h1>

                    {/* Filtros / Abas de Categorias */}
                    <div className="flex flex-wrap gap-6 md:gap-8 mt-12 border-b border-outline-variant/30 pb-6">
                        <button className="font-label text-xs uppercase tracking-widest text-primary font-bold border-b-2 border-primary pb-2">
                            Todos os Projetos
                        </button>
                        <button className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors pb-2">
                            Residencial
                        </button>
                        <button className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors pb-2">
                            Comercial
                        </button>
                        <button className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors pb-2">
                            Corporativo
                        </button>
                        <button className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors pb-2">
                            Hospitalidade
                        </button>
                        <button className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors pb-2">
                            Cultural
                        </button>
                        <button className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors pb-2">
                            Espaços Públicos
                        </button>
                    </div>
                </div>
            </header>

            <section className="px-8 md:px-24">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                    <ProjectCard
                        className="col-span-1 md:col-span-8"
                        imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuBX_2UFcnl5PAHl5yV5d7GwuHQiS4bbNuP-gmXM-j3kDu5Fv7d81HEgd5SzagqaKLIOBK0eC6KbsoE2iS88mrHQwJWRf8KlR-7s3asRaKYk8yu0U-4dJZEnnqUUVWLOes798GJbB4DX5gmAZ0fjwHQctjrwu0cO3HAM15mJJ65q3v39l8F1egLD_mtAi8knZozq2T_3TSo4N4qrsykBcXlQLjRdpyDnxWXBriXqjb6rvbknS5UwasAyx2vLTjtwK7RyOb4ajBZvwA"
                        title="[Nome do Projeto 1]"
                        description="Um estudo em reflexão e serenidade, onde a iluminação preenche a lacuna entre a estrutura e a natureza."
                        category="Residencial / 2024"
                        badge="Novo Projeto"
                        aspectRatio="aspect-[16/9]"
                    />

                    <ProjectCard
                        className="col-span-1 md:col-span-4 mt-0 md:mt-24"
                        imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuBXWIaszkn4ejz2ARbjnRa_WilJSYKZhGmzB4BgJ9G9nbMR84V4NGSiYaI_SkAGq2jfH6jhs-lcIh_lj29OBOF6vXub06Iz0sIgU8t0AhRxCwrVBy08zHlMagMYSSB5u7AqnVQhoCRnzn5Al8Z0sU_nyajtABbWxFzSakXxnp9Z578mFob4NnwCR6uyUbU34CjkG0zjIvmatfb0mHHXuwKEH_oTAVu_-3zE9h_egPFhDl5vlvVHEwyMXQq6BkHyl_aM93tKxWb20g"
                        title="[Nome do Projeto 2]"
                        description="Reprodução precisa de cores para preservar a alma das obras-primas contemporâneas."
                        aspectRatio="aspect-[3/4]"
                        category="Cultural"
                    />

                    <ProjectCard
                        className="col-span-1 md:col-span-5 md:ml-12"
                        imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuCZwZNu813R4XuA12c9zz8_ZF6hIBdtmsPekRxxQJaOCLMBRyU3A6QnZcR4JyQFt_aO8PUj12k-6b-MmwDYRFq83Up9FyK7_Tqsne324ezpar2hKWiJrhTlhmkQe4R7Tfbf7VVShMB6Bmiva6e347CMXY-jDHmjcSTRcCAtU4xl6gEq8gaRHG0NUr3a2ZLiIcSbK9x7Z7JDf-eUGu4nR9CCQNsra4OWJaAvHSQD2EjwEievlOVwN0nPQKqjHMyBJuJZWU-CsgFnFA"
                        title="[Nome do Projeto 3]"
                        description="Ambientes de iluminação dinâmicos para o futuro dos espaços de trabalho colaborativos."
                        aspectRatio="aspect-square"
                        category="Corporativo"
                    />

                    <ProjectCard
                        className="col-span-1 md:col-span-7 md:self-center"
                        imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuAm0ieoAR9TH4aQmXJo_oqSrLF8_r_ZzyH3vd5Ird3WCTfuLJoSmlpckQabcyctaF5ltHuE67vl4Omy4g0fc_7CVEbxboRzGVRSbjZkXkk-NjiyjBqmLf-r75byHRHoazPB0wkz5l4nSVz0aJwZHde18Bqus3cm2i27BAtTFcyVBbh9DPhMZx5tCgMxATnjgr1Pp3x1YwmUm-MmCNgRlRgrfuGihXm_-ADlqrnPH_7oC134HQbizb3vRW684Y2RwiVnbuLxtENefg"
                        title="[Nome do Projeto 4]"
                        description="Esculpindo a paisagem noturna através da iluminação discreta."
                        category="Hospitalidade"
                        aspectRatio="aspect-[4/3]"
                    />

                </div>
            </section>

            <section className="mt-32 px-8 py-24 bg-surface-container-low text-center">
                <h2 className="font-headline text-4xl text-primary mb-6 font-bold">Interessado em iluminar o seu espaço?</h2>
                <p className="font-body text-on-surface-variant mb-10 max-w-xl mx-auto text-lg">Todo projeto começa com uma conversa sobre luz e experiência humana. Vamos criar algo extraordinário.</p>
                <Link href="/lid/inicial/contact" className="inline-block bg-primary text-on-primary px-10 py-4 font-label uppercase tracking-widest text-xs font-bold hover:opacity-90 transition-opacity rounded">
                    Iniciar uma Consulta
                </Link>
            </section>
        </main>
    );
}