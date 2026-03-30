'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '', email: '', subject: '', message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Variável de estado adicionada para controlar o menu mobile
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Mensagem enviada:', formData);
        setIsSubmitting(false);
    };

    return (
        <div className="bg-background text-on-background font-body selection:bg-surface-container-highest selection:text-primary min-h-screen">
            {/* TopNavBar */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-outline-variant/20">
                <div className="flex justify-between items-center px-8 py-4 max-w-full mx-auto">
                    <div className="flex items-center gap-3">
                        <img alt="Logo da Empresa" className="h-10 w-auto" src="/lid-verde-branco.png" />
                        <span className="text-xl font-bold tracking-tight text-primary">LID Iluminação</span>
                    </div>
                    <div className="hidden md:flex items-center space-x-10">
                        {/* Se a sua rota for /lid/home, basta alterar os hrefs abaixo */}
                        <Link href="/lid/home" className="font-label tracking-wide font-medium uppercase text-xs text-on-surface-variant hover:text-primary transition-colors">Home</Link>
                        <Link href="/lid/projects" className="font-label tracking-wide font-medium uppercase text-xs text-on-surface-variant hover:text-primary transition-colors">Projetos</Link>
                        <Link href="/lid/about" className="font-label tracking-wide font-medium uppercase text-xs text-on-surface-variant hover:text-primary transition-colors">Sobre</Link>
                        <Link href="/lid/contact" className="font-label tracking-wide font-bold uppercase text-xs text-primary border-b-2 border-primary pb-1">Contato</Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors duration-300">light_mode</button>
                        <button 
                            className="md:hidden material-symbols-outlined text-on-surface-variant" 
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? 'close' : 'menu'}
                        </button>
                    </div>
                </div>
            </nav>

            <main className="pt-20">
                {/* Hero Section */}
                <section className="relative h-[614px] flex items-center overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <img className="w-full h-full object-cover" alt="Interior moderno" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwtMqv_CJ-0O-rtcAtEJd0MS64tP7jbdurmsGyxOqdtQ_I2l6n3s2w6nNn=s512-c" />
                        <div className="absolute inset-0 bg-primary/40 backdrop-blur-[2px]"></div>
                    </div>
                    <div className="relative z-10 max-w-7xl mx-auto px-8 w-full">
                        <div className="max-w-2xl">
                            <span className="label-md uppercase tracking-[0.2em] text-surface-container-highest mb-4 block font-headline font-bold">Entre em contato</span>
                            <h1 className="font-headline text-5xl md:text-7xl text-white font-extrabold tracking-tighter leading-none mb-6">
                                Ilumine sua <br />próxima visão.
                            </h1>
                            <p className="text-lg text-surface-container-low font-body max-w-lg leading-relaxed opacity-90">
                                Nosso estúdio é especializado na alquimia da luz e do espaço. Entre em contato para discutir seu projeto arquitetônico.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Main Content Grid */}
                <section className="max-w-7xl mx-auto px-8 py-24 md:py-32">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 xl:gap-24">

                        {/* Contact Info & Socials */}
                        <div className="lg:col-span-5 space-y-16">
                            <div>
                                <h2 className="font-headline text-3xl text-primary font-bold tracking-tight mb-8">Nossa Presença</h2>
                                <div className="space-y-10">
                                    <div className="flex items-start gap-6 group">
                                        <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                                            <span className="material-symbols-outlined">location_on</span>
                                        </div>
                                        <div>
                                            <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-2">Localização</h3>
                                            <p className="text-on-surface leading-relaxed text-lg">
                                                Avenida Jornalista Assis Chateaubriand , 2500 <br />
                                                Tambor, Campina Grande — PB<br />
                                                58410-062, Brasil
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-6 group">
                                        <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                                            <span className="material-symbols-outlined">mail</span>
                                        </div>
                                        <div>
                                            <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-2">E-mail</h3>
                                            <p className="text-on-surface text-lg">[contato@lidiluminacao.com.br]</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-6 group">
                                        <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                                            <span className="material-symbols-outlined">call</span>
                                        </div>
                                        <div>
                                            <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-2">Telefone</h3>
                                            <p className="text-on-surface text-lg">[+55 (83) 0000-0000]</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-outline-variant/20">
                                <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6">Conecte-se conosco</h3>
                                <div className="flex gap-4">
                                    <a aria-label="Instagram" className="w-14 h-14 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-300" href="#">
                                        <span className="material-symbols-outlined text-2xl">photo_camera</span>
                                    </a>
                                    <a aria-label="LinkedIn" className="w-14 h-14 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-300" href="#">
                                        <span className="material-symbols-outlined text-2xl">work</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="lg:col-span-7">
                            <div className="bg-surface-container-lowest p-8 md:p-12 shadow-[0px_20px_40px_rgba(40,24,15,0.06)] rounded-lg">
                                <h2 className="font-headline text-3xl text-primary font-bold tracking-tight mb-2">Envie uma Mensagem</h2>
                                <p className="text-on-surface-variant mb-10">Respondemos a todas as consultas dentro de 24 horas úteis.</p>

                                <form className="space-y-8" onSubmit={handleSubmit}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="relative">
                                            <label className="block font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Nome Completo</label>
                                            <input className="w-full bg-transparent border-0 border-b border-outline-variant/40 focus:ring-0 focus:border-primary px-0 py-3 transition-colors placeholder:text-outline-variant/60" placeholder="Seu Nome" type="text" name="name" value={formData.name} onChange={handleChange} />
                                        </div>
                                        <div className="relative">
                                            <label className="block font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Endereço de E-mail</label>
                                            <input className="w-full bg-transparent border-0 border-b border-outline-variant/40 focus:ring-0 focus:border-primary px-0 py-3 transition-colors placeholder:text-outline-variant/60" placeholder="voce@exemplo.com" type="email" name="email" value={formData.email} onChange={handleChange} />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <label className="block font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Assunto</label>
                                        <input className="w-full bg-transparent border-0 border-b border-outline-variant/40 focus:ring-0 focus:border-primary px-0 py-3 transition-colors placeholder:text-outline-variant/60" placeholder="Dúvida sobre projeto" type="text" name="subject" value={formData.subject} onChange={handleChange} />
                                    </div>
                                    <div className="relative">
                                        <label className="block font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Mensagem</label>
                                        <textarea className="w-full bg-transparent border-0 border-b border-outline-variant/40 focus:ring-0 focus:border-primary px-0 py-3 transition-colors placeholder:text-outline-variant/60 resize-none" placeholder="Como podemos iluminar seu espaço?" rows={4} name="message" value={formData.message} onChange={handleChange}></textarea>
                                    </div>
                                    <button className="bg-primary text-white px-12 py-4 font-headline text-sm font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-all active:scale-95 rounded-lg disabled:opacity-50" type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Map Integration */}
                <section className="w-full bg-surface-container-low pt-12 pb-24">
                    <div className="max-w-7xl mx-auto px-8 mb-12 flex justify-between items-end">
                        <div>
                            <h2 className="font-headline text-3xl text-primary font-bold tracking-tight">Visite Nossa Galeria</h2>
                            <p className="text-on-surface-variant mt-2">Experimente nossas coleções de iluminação pessoalmente.</p>
                        </div>
                        <div className="hidden md:block">
                            <span className="label-md uppercase tracking-widest text-primary font-bold font-headline">Campina Grande - PB, Brasil</span>
                        </div>
                    </div>
                    {/* O mapa do Google em Iframe substituindo a imagem fixa */}
                    <div className="w-full h-[500px] relative grayscale hover:grayscale-0 transition-all duration-700 overflow-hidden shadow-inner">
                        <iframe 
                            title="Mapa da Localização - LID Iluminação"
                            src="https://maps.google.com/maps?q=Avenida%20Jornalista%20Assis%20Chateaubriand%2C%202500%2C%20Tambor%2C%20Campina%20Grande%20-%20PB&t=&z=16&ie=UTF8&iwloc=&output=embed" 
                            className="w-full h-full border-0"
                            allowFullScreen={false} 
                            loading="lazy" 
                            referrerPolicy="no-referrer-when-downgrade"
                        ></iframe>
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