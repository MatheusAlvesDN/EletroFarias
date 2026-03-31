'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="bg-background text-on-surface font-body selection:bg-secondary-container selection:text-on-secondary-container min-h-screen">
            {/* TopNavBar */}
             <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-outline-variant/20">
                <div className="flex justify-between items-center px-8 py-4 max-w-full mx-auto">
                    <div className="flex items-center gap-3">
                        <img alt="Logo da Empresa" className="h-10 w-auto"src="/lid-verde-branco.png" />
                        <span className="text-xl font-bold tracking-tight text-primary">LID Iluminação</span>
                    </div>                    <div className="hidden md:flex items-center space-x-10">
                        <Link href="/lid/inicial/home" className="font-label tracking-wide font-medium uppercase text-xs text-primary border-b-2 border-primary pb-1">Home</Link>
                        <Link href="/lid/inicial/projects" className="font-label tracking-wide font-bold uppercase text-xs text-on-surface-variant hover:text-primary transition-colors">Projetos</Link>
                        <Link href="/lid/inicial/about" className="font-label tracking-wide font-medium uppercase text-xs text-on-surface-variant hover:text-primary transition-colors">Sobre</Link>
                        <Link href="/lid/inicial/contact" className="font-label tracking-wide font-medium uppercase text-xs text-on-surface-variant hover:text-primary transition-colors">Contato</Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors duration-300">light_mode</button>
                        <button className="md:hidden material-symbols-outlined text-on-surface-variant" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? 'close' : 'menu'}
                        </button>
                    </div>
                </div>
            </nav>

            <main>
                {/* Hero Section */}
                <section className="relative h-screen w-full flex items-center overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <img alt="Iluminação Arquitetônica" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCRSVgdgGiko_ljminOufSonzkYtZJ0ER1najhq_Boss9JT2T7nGJiJZC4sbSbSkDXPm6E6fyrGYPQ32xvdh8KS-LVyg11ijK_gOXKboS47GxWBjvELkXJqBZNBNw7og13x-G9thUrCfJvetYuxIWuBeZjct1Psog0kWQ18oCYGT__gfr0NRAR-rpJ9-ilyUbW9y_p1XxjGWEwTTLt0_oj_jc2tuEQm3k6OgO5nPNERUM7bSSIjSAsS8OP5WoRr9iwrnYxk-rGAuw" />
                        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80"></div>
                    </div>
                    <div className="relative z-10 max-w-7xl mx-auto px-8 w-full">
                        <div className="max-w-3xl">
                            <span className="text-sm md:text-base uppercase tracking-[0.2em] text-secondary mb-6 block font-medium">Luminosidade Curada</span>
                            <h1 className="text-6xl md:text-8xl font-headline font-extrabold text-primary tracking-tighter leading-[0.9] mb-8">A Arte da Luz</h1>
                            <p className="text-xl md:text-2xl text-on-surface-variant font-light max-w-xl mb-12 leading-relaxed">
                                Iluminando sua visão através de precisão arquitetônica e atmosfera emocional.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-6">
                                <Link href="/projects" className="bg-primary text-white px-8 py-4 rounded font-medium hover:opacity-90 transition-all text-center">
                                    Ver Portfólio
                                </Link>
                                <Link href="/about" className="border border-primary/20 text-primary px-8 py-4 rounded font-medium hover:border-primary transition-all text-center">
                                    Nosso Processo
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="absolute bottom-12 right-12 hidden lg:flex flex-col gap-4 text-primary/40">
                        <span className="text-xs font-bold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180">Role para Explorar</span>
                        <div className="w-px h-24 bg-gradient-to-b from-primary/40 to-transparent mx-auto"></div>
                    </div>
                </section>

                {/* Architectural Breadcrumbs */}
                <div className="max-w-7xl mx-auto px-8 py-12">
                    <nav className="flex items-center gap-4 text-sm font-label uppercase tracking-widest text-on-surface-variant/60">
                        <span>Residencial</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        <span>Hospitalidade</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        <span className="text-secondary font-bold">Espaços Públicos</span>
                    </nav>
                </div>

                {/* Our Essence / About Us */}
                <section className="py-24 md:py-40 bg-surface">
                    <div className="max-w-7xl mx-auto px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                            <div className="lg:col-span-5">
                                <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-12 leading-tight">Nossa Essência</h2>
                                <div className="space-y-8 text-lg text-on-surface-variant leading-relaxed">
                                    <p>Acreditamos que a luz é a arquitetura invisível. Ela define a alma de um espaço, alterando o humor e enfatizando a forma.</p>
                                    <p className="italic font-light text-2xl text-primary border-l-4 border-secondary pl-8 py-2">
                                        "A luz não é apenas uma utilidade; é um evento arquitetônico que dá vida às sombras."
                                    </p>
                                    <p>Nossa abordagem combina domínio técnico com um olhar curatorial, garantindo que cada projeto seja um diálogo único entre superfície, sombra e brilho.</p>
                                </div>
                                <div className="mt-16">
                                    <Link href="/about" className="inline-block text-sm uppercase tracking-widest text-primary font-bold border-b border-primary/20 pb-1 hover:border-primary transition-colors">
                                        Descubra a Filosofia
                                    </Link>
                                </div>
                            </div>
                            <div className="lg:col-span-7 relative">
                                <div className="relative z-10 rounded-lg overflow-hidden shadow-[0px_20px_40px_rgba(40,24,15,0.06)]">
                                    <img alt="Detalhe de Luz" className="w-full h-[600px] object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhgpUu-7dv0CwcY_g5oaB4X0gt7YHThFjEEvNbN6rbS9nWXagUFn0GYviFLZ_n5PJa3q5IYH2krkHzUC-Dh3z5aLgu-E0e2gywOgDd6Yvabqdpioz3EgJvTjXPSXKYEamowwaykyzBnLkQqTTL5xYQRvNngPiQzT6_EZMzbERaAH_lKeLc7_VuDSkZUQLvgulzdQlqS4Df985E0Do5T9JfqtPKQisn9SZDyT3XVd0-we27hfxovcyLOz68KIKFv4MqzOfnzEKHqg" />
                                </div>
                                <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-surface-container-high rounded-full -z-10 blur-3xl opacity-50"></div>
                                <div className="absolute -top-12 -right-12 w-80 h-80 bg-surface-variant rounded-full -z-10 blur-2xl opacity-40"></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Signature Projects Bento Grid */}
                <section className="py-24 bg-surface-container-low">
                    <div className="max-w-7xl mx-auto px-8">
                        <div className="flex justify-between items-end mb-16">
                            <div>
                                <span className="text-sm uppercase tracking-widest text-secondary font-semibold">Excelência</span>
                                <h2 className="text-4xl font-headline font-bold text-primary mt-2">Projetos Assinatura</h2>
                            </div>
                            <Link href="/projects" className="hidden md:block border-b border-primary text-primary font-bold uppercase text-sm tracking-widest pb-1">
                                Ver Todos os Trabalhos
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Tall Card */}
                            <div className="md:row-span-2 group cursor-pointer">
                                <div className="relative h-full min-h-[500px] overflow-hidden rounded-xl">
                                    <img alt="Projeto Residencial" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuApXJEuiIKIoQnjZImBGsrAf9f8h9O22aIfBmXMVaccakS404CH4t1U3LJywUtLs9mzHuopvW33zdqZg8DMfhUANfWafj7WA63Qqwm20eU97bS35uzVuIZ81EdA3e08pNJSOTJFVoVjRxUzFWE8BoDboxQlBPzxwrm8pHzUHVpVmlfft3h9qsyn8IsIV03yTXNwfhAfmNGNbaxjeCVz3gWMuQWXeqyJSLFpAGaoYVS6XfuM7xPwzg4Gize4XNI51xU4bG4DRp9rag" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-60"></div>
                                    <div className="absolute bottom-0 left-0 p-8 text-white">
                                        <span className="text-xs uppercase tracking-widest opacity-80 mb-2 block">Residencial</span>
                                        <h3 className="text-2xl font-headline font-bold">[Nome do Projeto 1]</h3>
                                    </div>
                                </div>
                            </div>
                            {/* Wide Card */}
                            <div className="md:col-span-2 group cursor-pointer">
                                <div className="relative h-[300px] overflow-hidden rounded-xl">
                                    <img alt="Projeto Corporativo" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXztOGNfROVvwbXFCANC8vvGVa8QbmnPajCNvzaBoGh2enbhRa0tnx2Mnmeb1_3k4Fu64fK9Xm3fjJh-C7ZaH_uTdkgkUeMTTZ36DacwQ8TQl4WfE1SkV0KcBAsj-TuF4SKRrclzoYUGc3MnRmXRnIs7KVnLWn-vkqEU8gIW6FguzbBB_47Mvx2tw75JoeE8dDWg4eGVQHF51IMlhSLPbHwNeKA-4aQUipplcVxpWB1EauscL2mTCpmwMZpWqzMtOAutz-cW6HTg" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-60"></div>
                                    <div className="absolute bottom-0 left-0 p-8 text-white">
                                        <span className="text-xs uppercase tracking-widest opacity-80 mb-2 block">Corporativo</span>
                                        <h3 className="text-2xl font-headline font-bold">[Nome do Projeto 2]</h3>
                                    </div>
                                </div>
                            </div>
                            {/* Square Card 1 */}
                            <div className="group cursor-pointer">
                                <div className="relative h-[300px] overflow-hidden rounded-xl">
                                    <img alt="Projeto Cultural" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQtmMXaH8I3ICO5YsuTy97Nh7_vCxeME_GFPOxDajnmFDWUVqPJy3ppK2pounZeQZ3l4jXFwKKtIGDodjmDMw1ro5_iNRySvJ7-Jki8pqJu8fm6JLx9gLGLuxD3UVRoDPxSbtpzuZiZBJzYkk3XlGzczUlyx4XbMqqLuJWIdPgMvoY5NxyhHfC6Y3xhsoZmw4uh273ChY5am0i60-Z5XcSeYWAB2perMW64oLKocv0MWnTwIdjK3BsQVG0Ed3yGcHhxOqH-BF8VA" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-60"></div>
                                    <div className="absolute bottom-0 left-0 p-8 text-white">
                                        <span className="text-xs uppercase tracking-widest opacity-80 mb-2 block">Cultural</span>
                                        <h3 className="text-xl font-headline font-bold">[Nome do Projeto 3]</h3>
                                    </div>
                                </div>
                            </div>
                            {/* Square Card 2 */}
                            <div className="group cursor-pointer">
                                <div className="relative h-[300px] overflow-hidden rounded-xl">
                                    <img alt="Projeto de Hospitalidade" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDr65yNXalRiC8sMjeeENtcrkIcu2NawhDPon0kf4jN4_HQrTKPKJN1gXNmFKMN7vZNSWn_9g1xcoqrjmraZx76p2NbfDNLfghGhtdQZz5x-oWY1TTs77MV75fGhn_s1CJ78m61m15132eHcsxXQKQvpMBuQCCSq_k8JCnU9XVy8CH8uYnUEhtuQYTtkTOVJABGph9NmRLpK27s6E4vyR5M0EJORf1HF3Ihum6DmFVWateTKzSNs1UXb-N9DtSsP678ISNKwusgKg" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-60"></div>
                                    <div className="absolute bottom-0 left-0 p-8 text-white">
                                        <span className="text-xs uppercase tracking-widest opacity-80 mb-2 block">Hospitalidade</span>
                                        <h3 className="text-xl font-headline font-bold">[Nome do Projeto 4]</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Experience Light Section */}
                <section className="py-32 bg-primary text-white overflow-hidden">
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
                                <div className="aspect-square bg-gradient-to-br from-primary-container to-secondary/20 rounded-full absolute -inset-10 blur-3xl opacity-30"></div>
                                <img alt="Iluminação de Luxo" className="relative z-10 w-full rounded-2xl shadow-2xl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtocVlhjJwb5wGSJpcZ6WeuNdwiRji6bc3CqBC--n1Y-2BiOhPFw7pHcp596bfFoSXXLlzmWFuB2YuAm4-AxW2a2CxlU-UVaoE7Da8NtYVZ-bBAqTgsIS7t2hozASkNTfaJrvGDXKkOvc8JBzu26xYtoW1PLgUKGzByYc0MygoRNpzh76hThnBouOPl6dMFK6K4njp0CnBhEkNB5rg1dh7fzAhaHPOgwbSn0ARBY34OaM8koAcuqJSp6B307nUM6vIdjBnMrw0_w" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-24 bg-surface text-center">
                    <div className="max-w-4xl mx-auto px-8">
                        <span className="text-sm uppercase tracking-[0.3em] text-secondary font-bold mb-6 block">Pronto para Transformar?</span>
                        <h2 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-8">Vamos iluminar sua próxima obra-prima.</h2>
                        <div className="flex flex-col md:flex-row gap-6 justify-center mt-12">
                            <Link href="/contact" className="bg-primary text-white px-12 py-5 text-lg font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-3 rounded-lg">
                                Trabalhe conosco
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </Link>
                            <Link href="/projects" className="border border-outline-variant text-primary px-12 py-5 text-lg font-bold hover:bg-surface-container-low transition-all rounded-lg">
                                Ver Catálogo
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
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