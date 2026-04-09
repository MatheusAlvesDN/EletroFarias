'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ProjectCard from '@/components/lid/inicial/ProjectCard';

export default function ProjectsPage() {
    // Estado para controlar a aba ativa
    const [activeTab, setActiveTab] = useState('Todos');

    const tabs = [
        'Todos',
        'Residencial',
        'Comercial',
        'Hospitalidade'
    ];

    const loremDescription = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare.";

    return (
        <main className="pt-32 pb-24">
            <header className="px-8 md:ml-[8.5rem] md:mr-16 mb-20">
                <div className="max-w-4xl">
                    <p className="font-label text-primary uppercase tracking-[0.2em] text-[10px] font-bold mb-4">Portfólio</p>
                    <h1 className="font-headline text-5xl md:text-7xl text-primary font-extrabold tracking-tight leading-[1.1] mb-8">
                        Criando Atmosferas <br />Através da Luz.
                    </h1>

                    {/* Abas com flex-wrap */}
                    <div className="mt-12 w-full border-b border-outline-variant/30">
                        <div className="flex flex-wrap gap-6 md:gap-10 pb-[2px]">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`font-label text-xs uppercase tracking-widest pb-3 border-b-2 transition-all duration-300 ${activeTab === tab
                                        ? 'text-primary font-bold border-primary'
                                        : 'text-on-surface-variant font-medium border-transparent hover:text-primary hover:border-outline-variant/50'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            <section className="px-8 md:px-24">

                {/* CONTEÚDO DA ABA: TODOS */}
                {activeTab === 'Todos' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in duration-700">
                        <ProjectCard
                            className="col-span-1 md:col-span-8"
                            imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuBX_2UFcnl5PAHl5yV5d7GwuHQiS4bbNuP-gmXM-j3kDu5Fv7d81HEgd5SzagqaKLIOBK0eC6KbsoE2iS88mrHQwJWRf8KlR-7s3asRaKYk8yu0U-4dJZEnnqUUVWLOes798GJbB4DX5gmAZ0fjwHQctjrwu0cO3HAM15mJJ65q3v39l8F1egLD_mtAi8knZozq2T_3TSo4N4qrsykBcXlQLjRdpyDnxWXBriXqjb6rvbknS5UwasAyx2vLTjtwK7RyOb4ajBZvwA"
                            title="Projeto Lorem Ipsum"
                            description={loremDescription}
                            category="Residencial"
                            badge="Novo Projeto"
                            aspectRatio="aspect-[16/9]"
                        />
                        <ProjectCard
                            className="col-span-1 md:col-span-4 mt-0 md:mt-24"
                            imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuBXWIaszkn4ejz2ARbjnRa_WilJSYKZhGmzB4BgJ9G9nbMR84V4NGSiYaI_SkAGq2jfH6jhs-lcIh_lj29OBOF6vXub06Iz0sIgU8t0AhRxCwrVBy08zHlMagMYSSB5u7AqnVQhoCRnzn5Al8Z0sU_nyajtABbWxFzSakXxnp9Z578mFob4NnwCR6uyUbU34CjkG0zjIvmatfb0mHHXuwKEH_oTAVu_-3zE9h_egPFhDl5vlvVHEwyMXQq6BkHyl_aM93tKxWb20g"
                            title="Projeto Dolor Sit"
                            description={loremDescription}
                            category="Comercial"
                            aspectRatio="aspect-[3/4]"
                        />
                        <ProjectCard
                            className="col-span-1 md:col-span-5 md:ml-12"
                            imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuCZwZNu813R4XuA12c9zz8_ZF6hIBdtmsPekRxxQJaOCLMBRyU3A6QnZcR4JyQFt_aO8PUj12k-6b-MmwDYRFq83Up9FyK7_Tqsne324ezpar2hKWiJrhTlhmkQe4R7Tfbf7VVShMB6Bmiva6e347CMXY-jDHmjcSTRcCAtU4xl6gEq8gaRHG0NUr3a2ZLiIcSbK9x7Z7JDf-eUGu4nR9CCQNsra4OWJaAvHSQD2EjwEievlOVwN0nPQKqjHMyBJuJZWU-CsgFnFA"
                            title="Projeto Amet Consectetur"
                            description={loremDescription}
                            category="Comercial"
                            aspectRatio="aspect-square"
                        />
                        <ProjectCard
                            className="col-span-1 md:col-span-7 md:self-center"
                            imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuAm0ieoAR9TH4aQmXJo_oqSrLF8_r_ZzyH3vd5Ird3WCTfuLJoSmlpckQabcyctaF5ltHuE67vl4Omy4g0fc_7CVEbxboRzGVRSbjZkXkk-NjiyjBqmLf-r75byHRHoazPB0wkz5l4nSVz0aJwZHde18Bqus3cm2i27BAtTFcyVBbh9DPhMZx5tCgMxATnjgr1Pp3x1YwmUm-MmCNgRlRgrfuGihXm_-ADlqrnPH_7oC134HQbizb3vRW684Y2RwiVnbuLxtENefg"
                            title="Projeto Adipiscing Elit"
                            description={loremDescription}
                            category="Hospitalidade"
                            aspectRatio="aspect-[4/3]"
                        />
                    </div>
                )}

                {/* CONTEÚDO DA ABA: RESIDENCIAL */}
                {activeTab === 'Residencial' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <ProjectCard
                            className="col-span-1 md:col-span-6"
                            imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuDwtMqv_CJ-00-rtcAtEJd0MS64tP7jbdurmsGyxOqdtQ_HzZxxFW3CvtNkoY5ekvCtYAsBTlvPiG_pPthJNS0tO5rbc5Oey0trisfO_pWrh5-ZoHD3bRiEvKGV6_Iu7-mfsF1m51vz8v1XHz7GjevfUPaNCkFz5cp6_m2VFzF4xm_zgeY9lPrrHx4zFI5bQsKv1LxY3kfgGY3F3ZEDRUDQ_D4Sz3xnzmCZfXql2r6k0NdfU7x-qcpgMh_najxkJfC-59IEnAu8Xw"
                            title="Projeto Suspendisse Varius"
                            description={loremDescription}
                            aspectRatio="aspect-[4/5]"
                        />
                        <ProjectCard
                            className="col-span-1 md:col-span-6 mt-0 md:mt-32"
                            imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuBX_2UFcnl5PAHl5yV5d7GwuHQiS4bbNuP-gmXM-j3kDu5Fv7d81HEgd5SzagqaKLIOBK0eC6KbsoE2iS88mrHQwJWRf8KlR-7s3asRaKYk8yu0U-4dJZEnnqUUVWLOes798GJbB4DX5gmAZ0fjwHQctjrwu0cO3HAM15mJJ65q3v39l8F1egLD_mtAi8knZozq2T_3TSo4N4qrsykBcXlQLjRdpyDnxWXBriXqjb6rvbknS5UwasAyx2vLTjtwK7RyOb4ajBZvwA"
                            title="Projeto Enim In Eros"
                            description={loremDescription}
                            badge="Destaque"
                            aspectRatio="aspect-[4/5]"
                        />
                        <ProjectCard
                            className="col-span-1 md:col-span-12 mt-8"
                            imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuApXJEuiIKIoQnjZImBGsrAf9f8h9O22aIfBmXMVaccakS404CH4t1U3LJywUtLs9mzHuopvW33zdqZg8DMfhUANfWafj7WA63Qqwm20eU97bS35uzVuIZ81EdA3e08pNJSOTJFVoVjRxUzFWE8BoDboxQlBPzxwrm8pHzUHVpVmlfft3h9qsyn8IsIV03yTXNwfhAfmNGNbaxjeCVz3gWMuQWXeqyJSLFpAGaoYVS6XfuM7xPwzg4Gize4XNI51xU4bG4DRp9rag"
                            title="Projeto Elementum"
                            description={loremDescription}
                            aspectRatio="aspect-[21/9]"
                        />
                    </div>
                )}

                {/* CONTEÚDO DA ABA: COMERCIAL */}
                {activeTab === 'Comercial' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <ProjectCard
                            className="col-span-1 md:col-span-12"
                            imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuCZwZNu813R4XuA12c9zz8_ZF6hIBdtmsPekRxxQJaOCLMBRyU3A6QnZcR4JyQFt_aO8PUj12k-6b-MmwDYRFq83Up9FyK7_Tqsne324ezpar2hKWiJrhTlhmkQe4R7Tfbf7VVShMB6Bmiva6e347CMXY-jDHmjcSTRcCAtU4xl6gEq8gaRHG0NUr3a2ZLiIcSbK9x7Z7JDf-eUGu4nR9CCQNsra4OWJaAvHSQD2EjwEievlOVwN0nPQKqjHMyBJuJZWU-CsgFnFA"
                            title="Projeto Tristique Duis"
                            description={loremDescription}
                            badge="Corporativo"
                            aspectRatio="aspect-[16/9]"
                        />
                        <ProjectCard
                            className="col-span-1 md:col-span-7 mt-8 md:ml-16"
                            imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuBXWIaszkn4ejz2ARbjnRa_WilJSYKZhGmzB4BgJ9G9nbMR84V4NGSiYaI_SkAGq2jfH6jhs-lcIh_lj29OBOF6vXub06Iz0sIgU8t0AhRxCwrVBy08zHlMagMYSSB5u7AqnVQhoCRnzn5Al8Z0sU_nyajtABbWxFzSakXxnp9Z578mFob4NnwCR6uyUbU34CjkG0zjIvmatfb0mHHXuwKEH_oTAVu_-3zE9h_egPFhDl5vlvVHEwyMXQq6BkHyl_aM93tKxWb20g"
                            title="Projeto Cursus Mi Quis"
                            description={loremDescription}
                            aspectRatio="aspect-square"
                        />
                    </div>
                )}

                {/* CONTEÚDO DA ABA: HOSPITALIDADE */}
                {activeTab === 'Hospitalidade' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <ProjectCard
                            className="col-span-1 md:col-span-8 md:col-start-3 text-center"
                            imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuAm0ieoAR9TH4aQmXJo_oqSrLF8_r_ZzyH3vd5Ird3WCTfuLJoSmlpckQabcyctaF5ltHuE67vl4Omy4g0fc_7CVEbxboRzGVRSbjZkXkk-NjiyjBqmLf-r75byHRHoazPB0wkz5l4nSVz0aJwZHde18Bqus3cm2i27BAtTFcyVBbh9DPhMZx5tCgMxATnjgr1Pp3x1YwmUm-MmCNgRlRgrfuGihXm_-ADlqrnPH_7oC134HQbizb3vRW684Y2RwiVnbuLxtENefg"
                            title="Projeto Viverra Ornare"
                            description={loremDescription}
                            badge="Premiado"
                            aspectRatio="aspect-[16/9]"
                        />
                        <ProjectCard
                            className="col-span-1 md:col-span-4"
                            imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuDr65yNXalRiC8sMjeeENtcrkIcu2NawhDPon0kf4jN4_HQrTKPKJN1gXNmFKMN7vZNSWn_9g1xcoqrjmraZx76p2NbfDNLfghGhtdQZz5x-oWY1TTs77MV75fGhn_s1CJ78m61m15132eHcsxXQKQvpMBuQCCSq_k8JCnU9XVy8CH8uYnUEhtuQYTtkTOVJABGph9NmRLpK27s6E4vyR5M0EJORf1HF3Ihum6DmFVWateTKzSNs1UXb-N9DtSsP678ISNKwusgKg"
                            title="Projeto Lorem Ipsum"
                            description={loremDescription}
                            aspectRatio="aspect-[3/4]"
                        />
                        <ProjectCard
                            className="col-span-1 md:col-span-8"
                            imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuBtocVlhjJwb5wGSJpcZ6WeuNdwiRji6bc3CqBC--n1Y-2BiOhPFw7pHcp596bfFoSXXLlzmWFuB2YuAm4-AxW2a2CxlU-UVaoE7Da8NtYVZ-bBAqTgsIS7t2hozASkNTfaJrvGDXKkOvc8JBzu26xYtoW1PLgUKGzByYc0MygoRNpzh76hThnBouOPl6dMFK6K4njp0CnBhEkNB5rg1dh7fzAhaHPOgwbSn0ARBY34OaM8koAcuqJSp6B307nUM6vIdjBnMrw0_w"
                            title="Projeto Dolor Sit Amet"
                            description={loremDescription}
                            aspectRatio="aspect-[16/9]"
                        />
                    </div>
                )}

            </section>

            <section className="mt-32 px-8 py-24 bg-surface-container-low text-center">
                <h2 className="font-headline text-4xl text-primary mb-6 font-bold">Interessado em iluminar o seu espaço?</h2>
                <p className="font-body text-on-surface-variant mb-10 max-w-xl mx-auto text-lg">Todo projeto começa com uma conversa sobre luz e experiência humana. Vamos criar algo extraordinário.</p>
                <Link href="/lid/inicial/contact" className="inline-block bg-primary text-white px-10 py-4 font-label uppercase tracking-widest text-xs font-bold hover:opacity-90 transition-opacity rounded">
                    Iniciar uma Consulta
                </Link>
            </section>
        </main>
    );
}