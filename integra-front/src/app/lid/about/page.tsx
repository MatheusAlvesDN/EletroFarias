'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function AboutPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="bg-surface text-on-surface font-body selection:bg-secondary-fixed selection:text-on-secondary-fixed min-h-screen">
            {/* TopNavBar */}
             <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-outline-variant/20">
                <div className="flex justify-between items-center px-8 py-4 max-w-full mx-auto">
                    <div className="flex items-center gap-3">
                        <img alt="Logo da Empresa" className="h-10 w-auto"src="/lid-verde-branco.png" />
                        <span className="text-xl font-bold tracking-tight text-primary">LID Iluminação</span>
                    </div>                    <div className="hidden md:flex items-center space-x-10">
                        <Link href="/lid/home" className="font-label tracking-wide font-medium uppercase text-xs text-on-surface-variant hover:text-primary transition-colors">Home</Link>
                        <Link href="/lid/projects" className="font-label tracking-wide font-bold uppercase text-xs text-on-surface-variant hover:text-primary transition-colors">Projetos</Link>
                        <Link href="/lid/about" className="font-label tracking-wide font-medium uppercase text-xs text-primary border-b-2 border-primary pb-1">Sobre</Link>
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

            {/* Hero Section */}
            <section className="relative h-screen w-full flex items-center justify-start overflow-hidden pt-20">
                <div className="absolute inset-0 z-0">
                    <img className="w-full h-full object-cover" alt="Detalhe arquitetônico de interior" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwtMqv_CJ-00-rtcAtEJd0MS64tP7jbdurmsGyxOqdtQ_HzZxxFW3CvtNkoY5ekvCtYAsBTlvPiG_pPthJNS0tO5rbc5Oey0trisfO_pWrh5-ZoHD3bRiEvKGV6_Iu7-mfsF1m51vz8v1XHz7GjevfUPaNCkFz5cp6_m2VFzF4xm_zgeY9lPrrHx4zFI5bQsKv1LxY3kfgGY3F3ZEDRUDQ_D4Sz3xnzmCZfXql2r6k0NdfU7x-qcpgMh_najxkJfC-59IEnAu8Xw" />
                    <div className="absolute inset-0 bg-primary/20 mix-blend-multiply"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/40 to-transparent"></div>
                </div>
                <div className="relative z-10 px-8 md:ml-32 max-w-3xl">
                    <span className="font-label text-secondary uppercase tracking-[0.3em] text-xs mb-6 block">Arquitetura de Luz</span>
                    <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-primary leading-[1.1] tracking-tighter text-balance">
                        A Arte da Luz e do Espaço
                    </h1>
                    <p className="mt-8 text-lg md:text-xl text-on-surface-variant max-w-xl font-light leading-relaxed">
                        Transformamos ambientes através da precisão técnica e da sensibilidade estética, criando atmosferas que transcendem o visível.
                    </p>
                </div>
            </section>

            {/* Our Story Section */}
            <section className="py-24 md:py-40 px-8 bg-surface">
                <div className="max-w-screen-xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16 items-center">
                    <div className="md:col-span-5 order-2 md:order-1">
                        <div className="relative group">
                            <img className="w-full aspect-[4/5] object-cover rounded-sm shadow-2xl" alt="Luminária de design" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBoMPoiNlglGBSXL6zjHtw1jIrWjHBI9zDb9eWDs1uZs1d85S4EZC8qeqAd9424VaajoXXZeIujKU26XkLcPYMAdLThXIS6VriPOZKJ6eMkyGZPKghS6ebGF-MFczXKYwL3AJhgjr3Tkyvlf25MWbZobcXWXd1HxktA2fGygVpBJOTfH7ng1BMD2O8wDtcpsqfvowPVkYBnK_1I2PFCKFRGvmfoSnT-RduYgKz8FOzOeCMJD-ZwS0LEV6se1k_bzJ5ZurgeBaPzKw" />
                            <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-surface-container-high -z-10 transition-transform group-hover:translate-x-4 group-hover:translate-y-4"></div>
                        </div>
                    </div>
                    <div className="md:col-span-7 order-1 md:order-2 md:pl-16">
                        <h2 className="font-headline text-3xl md:text-5xl font-bold text-primary mb-12">Nossa História</h2>
                        <div className="space-y-8 font-body text-on-surface-variant leading-loose text-lg font-light">
                            <p>Fundada sob a premissa de que a luz é a matéria-prima invisível da arquitetura, nosso estúdio nasceu do desejo de unir rigor técnico à curadoria artística.</p>
                            <p>Ao longo de uma década, nossa equipe refinou um olhar capaz de identificar o potencial latente em cada espaço. Para nós, iluminar não é apenas afastar a escuridão, mas revelar texturas, guiar o olhar e despertar emoções profundas.</p>
                            <p>Nossa missão é contínua: elevar o padrão do design de iluminação no Brasil, oferecendo soluções que respeitam a sustentabilidade, a funcionalidade e a beleza atemporal.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Philosophy Section */}
            <section className="py-24 bg-surface-container-low px-8">
                <div className="max-w-screen-xl mx-auto">
                    <div className="text-center mb-24">
                        <h2 className="font-headline text-3xl md:text-5xl font-bold text-primary">Nossa Filosofia</h2>
                        <div className="h-px w-24 bg-secondary mx-auto mt-8 opacity-40"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
                        {/* Pillar 1 */}
                        <div className="group">
                            <div className="w-16 h-16 bg-surface-container-highest flex items-center justify-center mb-8 rounded-sm transition-all group-hover:scale-110">
                                <span className="material-symbols-outlined text-secondary text-3xl">auto_awesome</span>
                            </div>
                            <h3 className="font-headline text-xl font-bold text-primary mb-4">Curadoria</h3>
                            <p className="font-body text-on-surface-variant font-light leading-relaxed">
                                Selecionamos meticulosamente cada peça e luminária, garantindo que o design dialogue harmoniosamente com o projeto arquitetônico original.
                            </p>
                        </div>
                        {/* Pillar 2 */}
                        <div className="group">
                            <div className="w-16 h-16 bg-surface-container-highest flex items-center justify-center mb-8 rounded-sm transition-all group-hover:scale-110">
                                <span className="material-symbols-outlined text-secondary text-3xl">precision_manufacturing</span>
                            </div>
                            <h3 className="font-headline text-xl font-bold text-primary mb-4">Precisão Técnica</h3>
                            <p className="font-body text-on-surface-variant font-light leading-relaxed">
                                Cálculos luminotécnicos avançados e tecnologia de ponta asseguram o conforto visual, a eficiência energética e a durabilidade técnica.
                            </p>
                        </div>
                        {/* Pillar 3 */}
                        <div className="group">
                            <div className="w-16 h-16 bg-surface-container-highest flex items-center justify-center mb-8 rounded-sm transition-all group-hover:scale-110">
                                <span className="material-symbols-outlined text-secondary text-3xl">wb_incandescent</span>
                            </div>
                            <h3 className="font-headline text-xl font-bold text-primary mb-4">Impacto Atmosférico</h3>
                            <p className="font-body text-on-surface-variant font-light leading-relaxed">
                                O resultado final é mais do que visibilidade; é uma experiência sensorial que altera a percepção do tempo e do espaço.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Process Section */}
            <section className="py-32 px-8 overflow-hidden">
                <div className="max-w-screen-xl mx-auto">
                    <h2 className="font-headline text-3xl md:text-5xl font-bold text-primary mb-24 md:ml-12">Nosso Processo</h2>
                    <div className="relative grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-0">
                        <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-outline-variant opacity-20 -translate-y-1/2"></div>
                        {/* Step 1 */}
                        <div className="relative z-10 p-8 md:p-12 hover:bg-surface-container-low transition-colors group">
                            <span className="font-headline text-5xl font-extrabold text-surface-container-high absolute top-4 right-4 transition-colors group-hover:text-secondary/20">01</span>
                            <h4 className="font-label text-secondary text-xs uppercase tracking-widest mb-6">Fase 01</h4>
                            <h3 className="font-headline text-xl font-bold text-primary mb-4">Consulta</h3>
                            <p className="text-sm text-on-surface-variant font-light">Entendimento profundo dos desejos do cliente e análise das nuances arquitetônicas do local.</p>
                        </div>
                        {/* Step 2 */}
                        <div className="relative z-10 p-8 md:p-12 hover:bg-surface-container-low transition-colors group md:border-l border-outline-variant/10">
                            <span className="font-headline text-5xl font-extrabold text-surface-container-high absolute top-4 right-4 transition-colors group-hover:text-secondary/20">02</span>
                            <h4 className="font-label text-secondary text-xs uppercase tracking-widest mb-6">Fase 02</h4>
                            <h3 className="font-headline text-xl font-bold text-primary mb-4">Design</h3>
                            <p className="text-sm text-on-surface-variant font-light">Criação de conceitos visuais e layouts que definem a hierarquia da luz no ambiente.</p>
                        </div>
                        {/* Step 3 */}
                        <div className="relative z-10 p-8 md:p-12 hover:bg-surface-container-low transition-colors group md:border-l border-outline-variant/10">
                            <span className="font-headline text-5xl font-extrabold text-surface-container-high absolute top-4 right-4 transition-colors group-hover:text-secondary/20">03</span>
                            <h4 className="font-label text-secondary text-xs uppercase tracking-widest mb-6">Fase 03</h4>
                            <h3 className="font-headline text-xl font-bold text-primary mb-4">Especificação</h3>
                            <p className="text-sm text-on-surface-variant font-light">Seleção técnica de luminárias, fontes e sistemas de controle inteligentes.</p>
                        </div>
                        {/* Step 4 */}
                        <div className="relative z-10 p-8 md:p-12 hover:bg-surface-container-low transition-colors group md:border-l border-outline-variant/10">
                            <span className="font-headline text-5xl font-extrabold text-surface-container-high absolute top-4 right-4 transition-colors group-hover:text-secondary/20">04</span>
                            <h4 className="font-label text-secondary text-xs uppercase tracking-widest mb-6">Fase 04</h4>
                            <h3 className="font-headline text-xl font-bold text-primary mb-4">Instalação</h3>
                            <p className="text-sm text-on-surface-variant font-light">Acompanhamento executivo para garantir que a luz real seja fiel à visão projetada.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Team Section */}
            <section className="py-32 px-8 bg-surface-container-lowest">
                <div className="max-w-screen-xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
                        <div className="max-w-2xl">
                            <h2 className="font-headline text-3xl md:text-5xl font-bold text-primary mb-6">Nossa Equipe</h2>
                            <p className="text-on-surface-variant font-light text-lg">Mentes criativas dedicadas a materializar a luz ideal.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {/* Member 1 */}
                        <div className="group">
                            <div className="overflow-hidden rounded-sm mb-6 aspect-[3/4]">
                                <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Membro da Equipe 1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-LUXsnhxzGvHyba3xP2esXrzqIy8-AJwSE1U9p8iFLrmmrugZDCzQVzNr4VJf8XY3CCxhUOhOk-fbrrO59EjjMcecY95KdzfZkqzliAk8iD7cIT6fb8uYKSulczlNhIWd35RjdB2YYjv9fGgZ2X8QnlvG41I443-MQXeXqO5W7VfA2KURaHTPkS83BjsxJdsNOSEqEUDLLQxb47EJ4rzynQ49RSzSiwobGeCxVgUy86L0OUdEF292-RvQeUSgYafOJ5JdJxudXw" />
                            </div>
                            <h4 className="font-headline text-xl font-bold text-primary">[Nome do Profissional 1]</h4>
                            <p className="font-label text-secondary text-xs uppercase tracking-widest mt-1">Diretor(a) Fundador(a)</p>
                            <p className="mt-4 text-on-surface-variant text-sm font-light leading-relaxed">Especialista em iluminação de alto padrão com vasta experiência no mercado nacional e internacional.</p>
                        </div>
                        {/* Member 2 */}
                        <div className="group">
                            <div className="overflow-hidden rounded-sm mb-6 aspect-[3/4]">
                                <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Membro da Equipe 2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDIE8horKkNMzU1S09v1z8IvMaOiRx3TQDpCuEVb1sQvfr5DVzdrHAmTJIOuN1vVCqKPFprgQ3B-nYA-UO60EYskHGfqP50gDBry3g8PF-tRvPiUckxehiOXBSYxSHrwHvU3HCMhOetuAuyQd8XDmslBz80Evl_7UH6K3OR655qBUb0UKANDYw2cAUVtsNYWcUrihEHspoCD0eLwLrOP-y0mT4lhztfhqgOin4n0KGxbToAsWbPIUZj8twjO0jnf7ilv9jEX6D82A" />
                            </div>
                            <h4 className="font-headline text-xl font-bold text-primary">[Nome do Profissional 2]</h4>
                            <p className="font-label text-secondary text-xs uppercase tracking-widest mt-1">Designer de Iluminação Principal</p>
                            <p className="mt-4 text-on-surface-variant text-sm font-light leading-relaxed">Focado em tecnologia e sistemas de automação para criar os melhores ambientes visuais.</p>
                        </div>
                        {/* Member 3 */}
                        <div className="group">
                            <div className="overflow-hidden rounded-sm mb-6 aspect-[3/4]">
                                <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Membro da Equipe 3" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJxEmm3uEhJoXBF5ohb0Z3Wg7Dwmacst5HEhyv8p3-FnkdNn7dH5551xY3mXM-hnh5gzAosJssPomHpQnzzNtjzdK-j1HUkPrLFwCPbxXX8m4ljACIBGnoHxsIPGFfFV5a-tRLfwocxMbCBcGCFdoF7ePnbabhfPX_qnPBOeppV_TLEdsoYqP9JxasqjeHlM8AaD_56iHeto-fAl7C8mdSHMKnSJF7Oxiwi6M3qQeXpXh44wynADBWerpMeUknaLds-sQYize2jA" />
                            </div>
                            <h4 className="font-headline text-xl font-bold text-primary">[Nome do Profissional 3]</h4>
                            <p className="font-label text-secondary text-xs uppercase tracking-widest mt-1">Especialista em Curadoria e Produto</p>
                            <p className="mt-4 text-on-surface-variant text-sm font-light leading-relaxed">Responsável pela seleção técnica e parcerias com fornecedores premium do design de interiores.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-40 px-8 relative overflow-hidden text-center bg-primary">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-secondary via-transparent to-transparent"></div>
                </div>
                <div className="relative z-10 max-w-4xl mx-auto">
                    <h2 className="font-headline text-4xl md:text-6xl font-extrabold text-on-primary mb-10 tracking-tight">Pronto para transformar seu projeto?</h2>
                    <p className="text-on-primary-container text-lg md:text-xl font-light mb-12 max-w-2xl mx-auto">
                        Vamos criar juntos a atmosfera perfeita para o seu espaço. Atendemos projetos residenciais, corporativos e comerciais em todo o país.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                        <Link href="/contact" className="px-10 py-5 bg-on-primary text-primary font-bold uppercase tracking-widest text-xs hover:bg-secondary-fixed transition-all flex items-center justify-center gap-2">
                            Iniciar um projeto
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                        <Link href="/projects" className="px-10 py-5 border border-on-primary/20 text-on-primary font-bold uppercase tracking-widest text-xs hover:bg-on-primary/5 transition-all">
                            Ver Portfólio
                        </Link>
                    </div>
                </div>
            </section>

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