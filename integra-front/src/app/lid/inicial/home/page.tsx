'use client';

import React from 'react';
import Link from 'next/link';
import ProjectCard from '@/components/lid/inicial/ProjectCard';

export default function HomePage() {
    return (
        <main>
            {/* Hero Section */}
            <section className="relative h-screen w-full flex items-center overflow-hidden">
                <div className="absolute inset-0 z-0 bg-stone-950">
                    <img alt="Iluminação Arquitetônica" className="w-full h-full object-cover opacity-90 dark:opacity-50 transition-opacity duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCRSVgdgGiko_ljminOufSonzkYtZJ0ER1najhq_Boss9JT2T7nGJiJZC4sbSbSkDXPm6E6fyrGYPQ32xvdh8KS-LVyg11ijK_gOXKboS47GxWBjvELkXJqBZNBNw7og13x-G9thUrCfJvetYuxIWuBeZjct1Psog0kWQ18oCYGT__gfr0NRAR-rpJ9-ilyUbW9y_p1XxjGWEwTTLt0_oj_jc2tuEQm3k6OgO5nPNERUM7bSSIjSAsS8OP5WoRr9iwrnYxk-rGAuw" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/90 dark:to-stone-950 transition-colors duration-500"></div>
                </div>
                <div className="relative z-10 max-w-7xl mx-auto px-8 w-full">
                    <div className="max-w-3xl">
                        <span className="text-sm md:text-base uppercase tracking-[0.2em] text-secondary dark:text-emerald-400 mb-6 block font-medium transition-colors duration-500">Luminosidade Curada</span>
                        <h1 className="text-6xl md:text-8xl font-headline font-extrabold text-primary dark:text-white tracking-tighter leading-[0.9] mb-8 transition-colors duration-500">A Arte da Luz</h1>
                        <p className="text-xl md:text-2xl text-on-surface-variant dark:text-stone-300 font-light max-w-xl mb-12 leading-relaxed transition-colors duration-500">
                            Iluminando sua visão através de precisão arquitetônica e atmosfera emocional.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <Link href="/lid/inicial/projects" className="bg-primary dark:bg-white text-white dark:text-stone-950 px-8 py-4 rounded font-medium hover:opacity-90 transition-all text-center">
                                Ver Portfólio
                            </Link>
                            <Link href="/lid/inicial/about" className="border border-primary/20 dark:border-white/30 text-primary dark:text-white px-8 py-4 rounded font-medium hover:border-primary dark:hover:border-white transition-all text-center">
                                Nosso Processo
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-12 right-12 hidden lg:flex flex-col gap-4 text-primary/40 dark:text-white/40">
                    <span className="text-xs font-bold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180">Role para Explorar</span>
                    <div className="w-px h-24 bg-gradient-to-b from-primary/40 dark:from-white/40 to-transparent mx-auto"></div>
                </div>
            </section>

            {/* Architectural Breadcrumbs */}
            <div className="max-w-7xl mx-auto px-8 py-12">
                <nav className="flex items-center gap-4 text-sm font-label uppercase tracking-widest text-on-surface-variant/60 dark:text-stone-500 transition-colors duration-500">
                    <span>Residencial</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary dark:bg-emerald-500"></span>
                    <span>Hospitalidade</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary dark:bg-emerald-500"></span>
                    <span className="text-secondary dark:text-emerald-400 font-bold">Espaços Públicos</span>
                </nav>
            </div>

            {/* Our Essence / About Us */}
            <section className="py-24 md:py-40 bg-surface dark:bg-stone-950 transition-colors duration-500">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                        <div className="lg:col-span-5">
                            <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary dark:text-white mb-12 leading-tight transition-colors duration-500">Nossa Essência</h2>
                            <div className="space-y-8 text-lg text-on-surface-variant dark:text-stone-400 leading-relaxed transition-colors duration-500">
                                <p>Acreditamos que a luz é a arquitetura invisível. Ela define a alma de um espaço, alterando o humor e enfatizando a forma.</p>
                                <p className="italic font-light text-2xl text-primary dark:text-white border-l-4 border-secondary dark:border-emerald-500 pl-8 py-2 transition-colors duration-500">
                                    "A luz não é apenas uma utilidade; é um evento arquitetônico que dá vida às sombras."
                                </p>
                                <p>Nossa abordagem combina domínio técnico com um olhar curatorial, garantindo que cada projeto seja um diálogo único entre superfície, sombra e brilho.</p>
                            </div>
                            <div className="mt-16">
                                <Link href="/lid/inicial/about" className="inline-block text-sm uppercase tracking-widest text-primary dark:text-white font-bold border-b border-primary/20 dark:border-white/20 pb-1 hover:border-primary dark:hover:border-white transition-colors">
                                    Descubra a Filosofia
                                </Link>
                            </div>
                        </div>
                        <div className="lg:col-span-7 relative">
                            <div className="relative z-10 rounded-lg overflow-hidden shadow-[0px_20px_40px_rgba(40,24,15,0.06)] dark:shadow-none">
                                <img alt="Detalhe de Luz" className="w-full h-[600px] object-cover dark:opacity-80 transition-opacity duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhgpUu-7dv0CwcY_g5oaB4X0gt7YHThFjEEvNbN6rbS9nWXagUFn0GYviFLZ_n5PJa3q5IYH2krkHzUC-Dh3z5aLgu-E0e2gywOgDd6Yvabqdpioz3EgJvTjXPSXKYEamowwaykyzBnLkQqTTL5xYQRvNngPiQzT6_EZMzbERaAH_lKeLc7_VuDSkZUQLvgulzdQlqS4Df985E0Do5T9JfqtPKQisn9SZDyT3XVd0-we27hfxovcyLOz68KIKFv4MqzOfnzEKHqg" />
                            </div>
                            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-surface-container-high dark:bg-stone-900 rounded-full -z-10 blur-3xl opacity-50 dark:opacity-30 transition-colors duration-500"></div>
                            <div className="absolute -top-12 -right-12 w-80 h-80 bg-surface-variant dark:bg-stone-800 rounded-full -z-10 blur-2xl opacity-40 dark:opacity-20 transition-colors duration-500"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Signature Projects Bento Grid */}
            <section className="py-24 bg-surface-container-low dark:bg-stone-900 transition-colors duration-500">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="flex justify-between items-end mb-16">
                        <div>
                            <span className="text-sm uppercase tracking-widest text-secondary dark:text-emerald-400 font-semibold transition-colors duration-500">Excelência</span>
                            <h2 className="text-4xl font-headline font-bold text-primary dark:text-white mt-2 transition-colors duration-500">Projetos Assinatura</h2>
                        </div>
                        <Link href="/lid/inicial/projects" className="hidden md:block border-b border-primary dark:border-white text-primary dark:text-white font-bold uppercase text-sm tracking-widest pb-1 hover:opacity-70 transition-colors duration-500">
                            Ver Todos os Trabalhos
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <ProjectCard variant="overlay" className="md:row-span-2" aspectRatio="aspect-auto" imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuApXJEuiIKIoQnjZImBGsrAf9f8h9O22aIfBmXMVaccakS404CH4t1U3LJywUtLs9mzHuopvW33zdqZg8DMfhUANfWafj7WA63Qqwm20eU97bS35uzVuIZ81EdA3e08pNJSOTJFVoVjRxUzFWE8BoDboxQlBPzxwrm8pHzUHVpVmlfft3h9qsyn8IsIV03yTXNwfhAfmNGNbaxjeCVz3gWMuQWXeqyJSLFpAGaoYVS6XfuM7xPwzg4Gize4XNI51xU4bG4DRp9rag" category="Residencial" title="Projeto Lorem" href="/lid/inicial/projects" />
                        <ProjectCard variant="overlay" className="md:col-span-2" aspectRatio="aspect-auto h-[300px]" imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuDXztOGNfROVvwbXFCANC8vvGVa8QbmnPajCNvzaBoGh2enbhRa0tnx2Mnmeb1_3k4Fu64fK9Xm3fjJh-C7ZaH_uTdkgkUeMTTZ36DacwQ8TQl4WfE1SkV0KcBAsj-TuF4SKRrclzoYUGc3MnRmXRnIs7KVnLWn-vkqEU8gIW6FguzbBB_47Mvx2tw75JoeE8dDWg4eGVQHF51IMlhSLPbHwNeKA-4aQUipplcVxpWB1EauscL2mTCpmwMZpWqzMtOAutz-cW6HTg" category="Corporativo" title="Projeto Ipsum" href="/lid/inicial/projects" />
                        <ProjectCard variant="overlay" aspectRatio="aspect-auto h-[300px]" imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuDQtmMXaH8I3ICO5YsuTy97Nh7_vCxeME_GFPOxDajnmFDWUVqPJy3ppK2pounZeQZ3l4jXFwKKtIGDodjmDMw1ro5_iNRySvJ7-Jki8pqJu8fm6JLx9gLGLuxD3UVRoDPxSbtpzuZiZBJzYkk3XlGzczUlyx4XbMqqLuJWIdPgMvoY5NxyhHfC6Y3xhsoZmw4uh273ChY5am0i60-Z5XcSeYWAB2perMW64oLKocv0MWnTwIdjK3BsQVG0Ed3yGcHhxOqH-BF8VA" category="Cultural" title="Projeto Sit" href="/lid/inicial/projects" />
                        <ProjectCard variant="overlay" aspectRatio="aspect-auto h-[300px]" imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuDr65yNXalRiC8sMjeeENtcrkIcu2NawhDPon0kf4jN4_HQrTKPKJN1gXNmFKMN7vZNSWn_9g1xcoqrjmraZx76p2NbfDNLfghGhtdQZz5x-oWY1TTs77MV75fGhn_s1CJ78m61m15132eHcsxXQKQvpMBuQCCSq_k8JCnU9XVy8CH8uYnUEhtuQYTtkTOVJABGph9NmRLpK27s6E4vyR5M0EJORf1HF3Ihum6DmFVWateTKzSNs1UXb-N9DtSsP678ISNKwusgKg" category="Hospitalidade" title="Projeto Amet" href="/lid/inicial/projects" />
                    </div>
                </div>
            </section>

            {/* Experience Light Section */}
            <section className="py-32 bg-primary dark:bg-stone-950 border-t border-white/5 text-white overflow-hidden transition-colors duration-500">
                <div className="max-w-7xl mx-auto px-8 relative">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                        <div>
                            <h2 className="text-5xl md:text-6xl font-headline font-extrabold tracking-tighter mb-12">
                                A Luz é a Alma do Design.
                            </h2>
                            <ul className="space-y-10">
                                <li className="flex gap-6">
                                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined">architecture</span>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold mb-2">Precisão Técnica</h4>
                                        <p className="text-white/60 leading-relaxed">Estudos fotométricos avançados para garantir a saída de luz perfeita para cada superfície.</p>
                                    </div>
                                </li>
                                <li className="flex gap-6">
                                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined">auto_awesome</span>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold mb-2">Curadoria Atmosférica</h4>
                                        <p className="text-white/60 leading-relaxed">Projetando a resposta emocional de um espaço através da temperatura de cor e intensidade.</p>
                                    </div>
                                </li>
                                <li className="flex gap-6">
                                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined">eco</span>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold mb-2">Inovação Sustentável</h4>
                                        <p className="text-white/60 leading-relaxed">Utilizando tecnologia LED de ponta para máxima eficiência e mínimo impacto.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <div className="relative">
                            <div className="aspect-square bg-gradient-to-br from-white/10 to-emerald-500/20 rounded-full absolute -inset-10 blur-3xl opacity-30"></div>
                            <img alt="Iluminação de Luxo" className="relative z-10 w-full rounded-2xl shadow-2xl dark:opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtocVlhjJwb5wGSJpcZ6WeuNdwiRji6bc3CqBC--n1Y-2BiOhPFw7pHcp596bfFoSXXLlzmWFuB2YuAm4-AxW2a2CxlU-UVaoE7Da8NtYVZ-bBAqTgsIS7t2hozASkNTfaJrvGDXKkOvc8JBzu26xYtoW1PLgUKGzByYc0MygoRNpzh76hThnBouOPl6dMFK6K4njp0CnBhEkNB5rg1dh7fzAhaHPOgwbSn0ARBY34OaM8koAcuqJSp6B307nUM6vIdjBnMrw0_w" />
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-surface dark:bg-stone-900 text-center transition-colors duration-500">
                <div className="max-w-4xl mx-auto px-8">
                    <span className="text-sm uppercase tracking-[0.3em] text-secondary dark:text-emerald-400 font-bold mb-6 block transition-colors duration-500">Pronto para Transformar?</span>
                    <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary dark:text-white mb-8 transition-colors duration-500">Vamos iluminar sua próxima obra-prima.</h2>
                    <div className="flex flex-col md:flex-row gap-6 justify-center mt-12">
                        <Link href="/lid/inicial/contact" className="bg-primary dark:bg-white text-white dark:text-stone-950 px-12 py-5 text-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3 rounded-lg">
                            Trabalhe conosco
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                        <Link href="/lid/inicial/projects" className="border border-outline-variant dark:border-white/20 text-primary dark:text-white px-12 py-5 text-lg font-bold hover:bg-surface-container-low dark:hover:bg-stone-800 transition-all rounded-lg">
                            Ver Catálogo
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}