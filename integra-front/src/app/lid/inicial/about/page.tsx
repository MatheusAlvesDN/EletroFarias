'use client';

import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
    return (
        <main className="bg-background dark:bg-stone-950 transition-colors duration-500">
            {/* Hero Section */}
            <section className="relative h-screen w-full flex items-center justify-start overflow-hidden pt-20">
                <div className="absolute inset-0 z-0 bg-stone-950">
                    <img className="w-full h-full object-cover opacity-90 dark:opacity-50 transition-opacity duration-500" alt="Detalhe arquitetônico de interior" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwtMqv_CJ-00-rtcAtEJd0MS64tP7jbdurmsGyxOqdtQ_HzZxxFW3CvtNkoY5ekvCtYAsBTlvPiG_pPthJNS0tO5rbc5Oey0trisfO_pWrh5-ZoHD3bRiEvKGV6_Iu7-mfsF1m51vz8v1XHz7GjevfUPaNCkFz5cp6_m2VFzF4xm_zgeY9lPrrHx4zFI5bQsKv1LxY3kfgGY3F3ZEDRUDQ_D4Sz3xnzmCZfXql2r6k0NdfU7x-qcpgMh_najxkJfC-59IEnAu8Xw" />
                    <div className="absolute inset-0 bg-gradient-to-r from-surface dark:from-stone-950 via-surface/40 dark:via-stone-950/60 to-transparent transition-colors duration-500"></div>
                </div>
                <div className="relative z-10 px-8 md:ml-32 max-w-3xl">
                    <span className="font-label text-secondary dark:text-emerald-400 uppercase tracking-[0.3em] text-xs mb-6 block transition-colors duration-500">Arquitetura de Luz</span>
                    <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-primary dark:text-white leading-[1.1] tracking-tighter text-balance transition-colors duration-500">
                        A Arte da Luz e do Espaço
                    </h1>
                    <p className="mt-8 text-lg md:text-xl text-on-surface-variant dark:text-stone-300 max-w-xl font-light leading-relaxed transition-colors duration-500">
                        Transformamos ambientes através da precisão técnica e da sensibilidade estética, criando atmosferas que transcendem o visível.
                    </p>
                </div>
            </section>

            {/* Our Story Section */}
            <section className="py-24 md:py-40 px-8 bg-surface dark:bg-stone-950 transition-colors duration-500">
                <div className="max-w-screen-xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16 items-center">
                    <div className="md:col-span-5 order-2 md:order-1">
                        <div className="relative group">
                            <img className="w-full aspect-[4/5] object-cover rounded-sm shadow-2xl dark:opacity-90" alt="Luminária de design" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBoMPoiNlglGBSXL6zjHtw1jIrWjHBI9zDb9eWDs1uZs1d85S4EZC8qeqAd9424VaajoXXZeIujKU26XkLcPYMAdLThXIS6VriPOZKJ6eMkyGZPKghS6ebGF-MFczXKYwL3AJhgjr3Tkyvlf25MWbZobcXWXd1HxktA2fGygVpBJOTfH7ng1BMD2O8wDtcpsqfvowPVkYBnK_1I2PFCKFRGvmfoSnT-RduYgKz8FOzOeCMJD-ZwS0LEV6se1k_bzJ5ZurgeBaPzKw" />
                            <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-surface-container-high dark:bg-stone-900 -z-10 transition-transform group-hover:translate-x-4 group-hover:translate-y-4 duration-500"></div>
                        </div>
                    </div>
                    <div className="md:col-span-7 order-1 md:order-2 md:pl-16">
                        <h2 className="font-headline text-3xl md:text-5xl font-bold text-primary dark:text-white mb-12 transition-colors duration-500">Nossa História</h2>
                        <div className="space-y-8 font-body text-on-surface-variant dark:text-stone-400 leading-loose text-lg font-light transition-colors duration-500">
                            <p>Fundada sob a premissa de que a luz é a matéria-prima invisível da arquitetura, nosso estúdio nasceu do desejo de unir rigor técnico à curadoria artística.</p>
                            <p>Ao longo de uma década, nossa equipe refinou um olhar capaz de identificar o potencial latente em cada espaço. Para nós, iluminar não é apenas afastar a escuridão, mas revelar texturas, guiar o olhar e despertar emoções profundas.</p>
                            <p>Nossa missão é contínua: elevar o padrão do design de iluminação no Brasil, oferecendo soluções que respeitam a sustentabilidade, a funcionalidade e a beleza atemporal.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Philosophy Section */}
            <section className="py-24 bg-surface-container-low dark:bg-stone-900 px-8 transition-colors duration-500">
                <div className="max-w-screen-xl mx-auto">
                    <div className="text-center mb-24">
                        <h2 className="font-headline text-3xl md:text-5xl font-bold text-primary dark:text-white transition-colors duration-500">Nossa Filosofia</h2>
                        <div className="h-px w-24 bg-secondary dark:bg-emerald-500 mx-auto mt-8 opacity-40"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
                        <div className="group">
                            <div className="w-16 h-16 bg-surface-container-highest dark:bg-stone-800 flex items-center justify-center mb-8 rounded-sm transition-all group-hover:scale-110 duration-500">
                                <span className="material-symbols-outlined text-secondary dark:text-emerald-400 text-3xl">auto_awesome</span>
                            </div>
                            <h3 className="font-headline text-xl font-bold text-primary dark:text-white mb-4 transition-colors duration-500">Curadoria</h3>
                            <p className="font-body text-on-surface-variant dark:text-stone-400 font-light leading-relaxed transition-colors duration-500">
                                Selecionamos meticulosamente cada peça e luminária, garantindo que o design dialogue harmoniosamente com o projeto arquitetônico original.
                            </p>
                        </div>
                        <div className="group">
                            <div className="w-16 h-16 bg-surface-container-highest dark:bg-stone-800 flex items-center justify-center mb-8 rounded-sm transition-all group-hover:scale-110 duration-500">
                                <span className="material-symbols-outlined text-secondary dark:text-emerald-400 text-3xl">precision_manufacturing</span>
                            </div>
                            <h3 className="font-headline text-xl font-bold text-primary dark:text-white mb-4 transition-colors duration-500">Precisão Técnica</h3>
                            <p className="font-body text-on-surface-variant dark:text-stone-400 font-light leading-relaxed transition-colors duration-500">
                                Cálculos luminotécnicos avançados e tecnologia de ponta asseguram o conforto visual, a eficiência energética e a durabilidade técnica.
                            </p>
                        </div>
                        <div className="group">
                            <div className="w-16 h-16 bg-surface-container-highest dark:bg-stone-800 flex items-center justify-center mb-8 rounded-sm transition-all group-hover:scale-110 duration-500">
                                <span className="material-symbols-outlined text-secondary dark:text-emerald-400 text-3xl">wb_incandescent</span>
                            </div>
                            <h3 className="font-headline text-xl font-bold text-primary dark:text-white mb-4 transition-colors duration-500">Impacto Atmosférico</h3>
                            <p className="font-body text-on-surface-variant dark:text-stone-400 font-light leading-relaxed transition-colors duration-500">
                                O resultado final é mais do que visibilidade; é uma experiência sensorial que altera a percepção do tempo e do espaço.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Process Section */}
            <section className="py-32 px-8 overflow-hidden bg-surface dark:bg-stone-950 transition-colors duration-500">
                <div className="max-w-screen-xl mx-auto">
                    <h2 className="font-headline text-3xl md:text-5xl font-bold text-primary dark:text-white mb-24 md:ml-12 transition-colors duration-500">Nosso Processo</h2>
                    <div className="relative grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-0">
                        <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-outline-variant dark:bg-white opacity-20 -translate-y-1/2"></div>

                        <div className="relative z-10 p-8 md:p-12 hover:bg-surface-container-low dark:hover:bg-stone-900 transition-colors duration-500 group">
                            <span className="font-headline text-5xl font-extrabold text-surface-container-high dark:text-stone-800 absolute top-4 right-4 transition-colors group-hover:text-secondary/20 dark:group-hover:text-emerald-500/20">01</span>
                            <h4 className="font-label text-secondary dark:text-emerald-400 text-xs uppercase tracking-widest mb-6 transition-colors duration-500">Fase 01</h4>
                            <h3 className="font-headline text-xl font-bold text-primary dark:text-white mb-4 transition-colors duration-500">Consulta</h3>
                            <p className="text-sm text-on-surface-variant dark:text-stone-400 font-light transition-colors duration-500">Entendimento profundo dos desejos do cliente e análise das nuances arquitetônicas do local.</p>
                        </div>
                        <div className="relative z-10 p-8 md:p-12 hover:bg-surface-container-low dark:hover:bg-stone-900 transition-colors duration-500 group md:border-l border-outline-variant/10 dark:border-white/5">
                            <span className="font-headline text-5xl font-extrabold text-surface-container-high dark:text-stone-800 absolute top-4 right-4 transition-colors group-hover:text-secondary/20 dark:group-hover:text-emerald-500/20">02</span>
                            <h4 className="font-label text-secondary dark:text-emerald-400 text-xs uppercase tracking-widest mb-6 transition-colors duration-500">Fase 02</h4>
                            <h3 className="font-headline text-xl font-bold text-primary dark:text-white mb-4 transition-colors duration-500">Design</h3>
                            <p className="text-sm text-on-surface-variant dark:text-stone-400 font-light transition-colors duration-500">Criação de conceitos visuais e layouts que definem a hierarquia da luz no ambiente.</p>
                        </div>
                        <div className="relative z-10 p-8 md:p-12 hover:bg-surface-container-low dark:hover:bg-stone-900 transition-colors duration-500 group md:border-l border-outline-variant/10 dark:border-white/5">
                            <span className="font-headline text-5xl font-extrabold text-surface-container-high dark:text-stone-800 absolute top-4 right-4 transition-colors group-hover:text-secondary/20 dark:group-hover:text-emerald-500/20">03</span>
                            <h4 className="font-label text-secondary dark:text-emerald-400 text-xs uppercase tracking-widest mb-6 transition-colors duration-500">Fase 03</h4>
                            <h3 className="font-headline text-xl font-bold text-primary dark:text-white mb-4 transition-colors duration-500">Especificação</h3>
                            <p className="text-sm text-on-surface-variant dark:text-stone-400 font-light transition-colors duration-500">Seleção técnica de luminárias, fontes e sistemas de controle inteligentes.</p>
                        </div>
                        <div className="relative z-10 p-8 md:p-12 hover:bg-surface-container-low dark:hover:bg-stone-900 transition-colors duration-500 group md:border-l border-outline-variant/10 dark:border-white/5">
                            <span className="font-headline text-5xl font-extrabold text-surface-container-high dark:text-stone-800 absolute top-4 right-4 transition-colors group-hover:text-secondary/20 dark:group-hover:text-emerald-500/20">04</span>
                            <h4 className="font-label text-secondary dark:text-emerald-400 text-xs uppercase tracking-widest mb-6 transition-colors duration-500">Fase 04</h4>
                            <h3 className="font-headline text-xl font-bold text-primary dark:text-white mb-4 transition-colors duration-500">Instalação</h3>
                            <p className="text-sm text-on-surface-variant dark:text-stone-400 font-light transition-colors duration-500">Acompanhamento executivo para garantir que a luz real seja fiel à visão projetada.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Team Section */}
            <section className="py-32 px-8 bg-surface-container-lowest dark:bg-stone-900 transition-colors duration-500">
                <div className="max-w-screen-xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
                        <div className="max-w-2xl">
                            <h2 className="font-headline text-3xl md:text-5xl font-bold text-primary dark:text-white mb-6 transition-colors duration-500">Nossa Equipe</h2>
                            <p className="text-on-surface-variant dark:text-stone-400 font-light text-lg transition-colors duration-500">Mentes criativas dedicadas a materializar a luz ideal.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        <div className="group">
                            <div className="overflow-hidden rounded-sm mb-6 aspect-[3/4]">
                                <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Membro da Equipe 1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-LUXsnhxzGvHyba3xP2esXrzqIy8-AJwSE1U9p8iFLrmmrugZDCzQVzNr4VJf8XY3CCxhUOhOk-fbrrO59EjjMcecY95KdzfZkqzliAk8iD7cIT6fb8uYKSulczlNhIWd35RjdB2YYjv9fGgZ2X8QnlvG41I443-MQXeXqO5W7VfA2KURaHTPkS83BjsxJdsNOSEqEUDLLQxb47EJ4rzynQ49RSzSiwobGeCxVgUy86L0OUdEF292-RvQeUSgYafOJ5JdJxudXw" />
                            </div>
                            <h4 className="font-headline text-xl font-bold text-primary dark:text-white transition-colors duration-500">Profissional 1</h4>
                            <p className="font-label text-secondary dark:text-emerald-400 text-xs uppercase tracking-widest mt-1 transition-colors duration-500">Diretor(a) Fundador(a)</p>
                            <p className="mt-4 text-on-surface-variant dark:text-stone-400 text-sm font-light leading-relaxed transition-colors duration-500">Especialista em iluminação de alto padrão com vasta experiência no mercado.</p>
                        </div>
                        <div className="group">
                            <div className="overflow-hidden rounded-sm mb-6 aspect-[3/4]">
                                <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Membro da Equipe 2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDIE8horKkNMzU1S09v1z8IvMaOiRx3TQDpCuEVb1sQvfr5DVzdrHAmTJIOuN1vVCqKPFprgQ3B-nYA-UO60EYskHGfqP50gDBry3g8PF-tRvPiUckxehiOXBSYxSHrwHvU3HCMhOetuAuyQd8XDmslBz80Evl_7UH6K3OR655qBUb0UKANDYw2cAUVtsNYWcUrihEHspoCD0eLwLrOP-y0mT4lhztfhqgOin4n0KGxbToAsWbPIUZj8twjO0jnf7ilv9jEX6D82A" />
                            </div>
                            <h4 className="font-headline text-xl font-bold text-primary dark:text-white transition-colors duration-500">Profissional 2</h4>
                            <p className="font-label text-secondary dark:text-emerald-400 text-xs uppercase tracking-widest mt-1 transition-colors duration-500">Designer Principal</p>
                            <p className="mt-4 text-on-surface-variant dark:text-stone-400 text-sm font-light leading-relaxed transition-colors duration-500">Focado em tecnologia e sistemas de automação para os melhores ambientes visuais.</p>
                        </div>
                        <div className="group">
                            <div className="overflow-hidden rounded-sm mb-6 aspect-[3/4]">
                                <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Membro da Equipe 3" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJxEmm3uEhJoXBF5ohb0Z3Wg7Dwmacst5HEhyv8p3-FnkdNn7dH5551xY3mXM-hnh5gzAosJssPomHpQnzzNtjzdK-j1HUkPrLFwCPbxXX8m4ljACIBGnoHxsIPGFfFV5a-tRLfwocxMbCBcGCFdoF7ePnbabhfPX_qnPBOeppV_TLEdsoYqP9JxasqjeHlM8AaD_56iHeto-fAl7C8mdSHMKnSJF7Oxiwi6M3qQeXpXh44wynADBWerpMeUknaLds-sQYize2jA" />
                            </div>
                            <h4 className="font-headline text-xl font-bold text-primary dark:text-white transition-colors duration-500">Profissional 3</h4>
                            <p className="font-label text-secondary dark:text-emerald-400 text-xs uppercase tracking-widest mt-1 transition-colors duration-500">Especialista em Curadoria</p>
                            <p className="mt-4 text-on-surface-variant dark:text-stone-400 text-sm font-light leading-relaxed transition-colors duration-500">Responsável pela seleção técnica e parcerias com fornecedores premium.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-40 px-8 relative overflow-hidden text-center bg-primary dark:bg-stone-950 border-t border-white/5 transition-colors duration-500">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-secondary dark:from-emerald-400 via-transparent to-transparent"></div>
                </div>
                <div className="relative z-10 max-w-4xl mx-auto">
                    <h2 className="font-headline text-4xl md:text-6xl font-extrabold text-on-primary dark:text-white mb-10 tracking-tight">Pronto para transformar seu projeto?</h2>
                    <p className="text-on-primary-container dark:text-stone-300 text-lg md:text-xl font-light mb-12 max-w-2xl mx-auto">
                        Vamos criar juntos a atmosfera perfeita para o seu espaço. Atendemos projetos residenciais, corporativos e comerciais em todo o país.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                        <Link href="/lid/inicial/contact" className="px-10 py-5 bg-on-primary dark:bg-white text-primary dark:text-stone-950 font-bold uppercase tracking-widest text-xs hover:bg-secondary-fixed dark:hover:bg-stone-200 transition-all flex items-center justify-center gap-2">
                            Iniciar um projeto
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                        <Link href="/lid/inicial/projects" className="px-10 py-5 border border-on-primary/20 dark:border-white/20 text-on-primary dark:text-white font-bold uppercase tracking-widest text-xs hover:bg-on-primary/5 dark:hover:bg-white/5 transition-all">
                            Ver Portfólio
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}