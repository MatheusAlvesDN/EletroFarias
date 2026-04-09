'use client';

import React, { useState } from 'react';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '', email: '', subject: '', message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        <main className="pt-20 bg-background dark:bg-stone-950 transition-colors duration-500">
            {/* Hero Section */}
            <section className="relative h-[614px] flex items-center overflow-hidden">
                <div className="absolute inset-0 z-0 bg-stone-950">
                    <img className="w-full h-full object-cover dark:opacity-60 transition-opacity duration-500" alt="Interior moderno" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwtMqv_CJ-0O-rtcAtEJd0MS64tP7jbdurmsGyxOqdtQ_I2l6n3s2w6nNn=s512-c" />
                    <div className="absolute inset-0 bg-primary/40 dark:bg-stone-900/60 backdrop-blur-[2px] transition-colors duration-500"></div>
                </div>
                <div className="relative z-10 max-w-7xl mx-auto px-8 w-full">
                    <div className="max-w-2xl">
                        <span className="label-md uppercase tracking-[0.2em] text-surface-container-highest dark:text-emerald-400 mb-4 block font-headline font-bold transition-colors duration-500">Entre em contato</span>
                        <h1 className="font-headline text-5xl md:text-7xl text-white font-extrabold tracking-tighter leading-none mb-6">
                            Ilumine sua <br />próxima visão.
                        </h1>
                        <p className="text-lg text-surface-container-low dark:text-stone-300 font-body max-w-lg leading-relaxed opacity-90 transition-colors duration-500">
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
                            <h2 className="font-headline text-3xl text-primary dark:text-white font-bold tracking-tight mb-8 transition-colors duration-500">Nossa Presença</h2>
                            <div className="space-y-10">
                                <div className="flex items-start gap-6 group">
                                    <div className="w-12 h-12 rounded-full bg-surface-container-low dark:bg-stone-800 flex items-center justify-center text-primary dark:text-white transition-all group-hover:scale-110 duration-500">
                                        <span className="material-symbols-outlined">location_on</span>
                                    </div>
                                    <div>
                                        <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant dark:text-stone-400 mb-2 transition-colors duration-500">Localização</h3>
                                        <p className="text-on-surface dark:text-stone-200 leading-relaxed text-lg transition-colors duration-500">
                                            Avenida Jornalista Assis Chateaubriand , 2500 <br />
                                            Tambor, Campina Grande — PB<br />
                                            58410-062, Brasil
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-6 group">
                                    <div className="w-12 h-12 rounded-full bg-surface-container-low dark:bg-stone-800 flex items-center justify-center text-primary dark:text-white transition-all group-hover:scale-110 duration-500">
                                        <span className="material-symbols-outlined">mail</span>
                                    </div>
                                    <div>
                                        <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant dark:text-stone-400 mb-2 transition-colors duration-500">E-mail</h3>
                                        <p className="text-on-surface dark:text-stone-200 text-lg transition-colors duration-500">[contato@lidiluminacao.com.br]</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-6 group">
                                    <div className="w-12 h-12 rounded-full bg-surface-container-low dark:bg-stone-800 flex items-center justify-center text-primary dark:text-white transition-all group-hover:scale-110 duration-500">
                                        <span className="material-symbols-outlined">call</span>
                                    </div>
                                    <div>
                                        <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant dark:text-stone-400 mb-2 transition-colors duration-500">Telefone</h3>
                                        <p className="text-on-surface dark:text-stone-200 text-lg transition-colors duration-500">[+55 (83) 0000-0000]</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-outline-variant/20 dark:border-white/10 transition-colors duration-500">
                            <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant dark:text-stone-400 mb-6 transition-colors duration-500">Conecte-se connosco</h3>
                            <div className="flex gap-4">
                                <a aria-label="Instagram" className="w-14 h-14 rounded-full border border-outline-variant/30 dark:border-white/20 flex items-center justify-center text-primary dark:text-white hover:bg-primary dark:hover:bg-white hover:text-white dark:hover:text-stone-900 transition-all duration-500" href="#">
                                    <span className="material-symbols-outlined text-2xl">photo_camera</span>
                                </a>
                                <a aria-label="LinkedIn" className="w-14 h-14 rounded-full border border-outline-variant/30 dark:border-white/20 flex items-center justify-center text-primary dark:text-white hover:bg-primary dark:hover:bg-white hover:text-white dark:hover:text-stone-900 transition-all duration-500" href="#">
                                    <span className="material-symbols-outlined text-2xl">work</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-7">
                        <div className="bg-surface-container-lowest dark:bg-stone-900 p-8 md:p-12 shadow-[0px_20px_40px_rgba(40,24,15,0.06)] dark:shadow-none rounded-lg transition-colors duration-500">
                            <h2 className="font-headline text-3xl text-primary dark:text-white font-bold tracking-tight mb-2 transition-colors duration-500">Envie uma Mensagem</h2>
                            <p className="text-on-surface-variant dark:text-stone-400 mb-10 transition-colors duration-500">Respondemos a todas as consultas dentro de 24 horas úteis.</p>

                            <form className="space-y-8" onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="relative">
                                        <label className="block font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-stone-400 mb-2 transition-colors duration-500">Nome Completo</label>
                                        <input className="w-full bg-transparent border-0 border-b border-outline-variant/40 dark:border-stone-600 focus:ring-0 focus:border-primary dark:focus:border-white px-0 py-3 text-on-surface dark:text-white placeholder:text-outline-variant/60 dark:placeholder:text-stone-500 transition-colors duration-500" placeholder="Seu Nome" type="text" name="name" value={formData.name} onChange={handleChange} />
                                    </div>
                                    <div className="relative">
                                        <label className="block font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-stone-400 mb-2 transition-colors duration-500">Endereço de E-mail</label>
                                        <input className="w-full bg-transparent border-0 border-b border-outline-variant/40 dark:border-stone-600 focus:ring-0 focus:border-primary dark:focus:border-white px-0 py-3 text-on-surface dark:text-white placeholder:text-outline-variant/60 dark:placeholder:text-stone-500 transition-colors duration-500" placeholder="voce@exemplo.com" type="email" name="email" value={formData.email} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="relative">
                                    <label className="block font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-stone-400 mb-2 transition-colors duration-500">Assunto</label>
                                    <input className="w-full bg-transparent border-0 border-b border-outline-variant/40 dark:border-stone-600 focus:ring-0 focus:border-primary dark:focus:border-white px-0 py-3 text-on-surface dark:text-white placeholder:text-outline-variant/60 dark:placeholder:text-stone-500 transition-colors duration-500" placeholder="Dúvida sobre projeto" type="text" name="subject" value={formData.subject} onChange={handleChange} />
                                </div>
                                <div className="relative">
                                    <label className="block font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-stone-400 mb-2 transition-colors duration-500">Mensagem</label>
                                    <textarea className="w-full bg-transparent border-0 border-b border-outline-variant/40 dark:border-stone-600 focus:ring-0 focus:border-primary dark:focus:border-white px-0 py-3 text-on-surface dark:text-white placeholder:text-outline-variant/60 dark:placeholder:text-stone-500 resize-none transition-colors duration-500" placeholder="Como podemos iluminar seu espaço?" rows={4} name="message" value={formData.message} onChange={handleChange}></textarea>
                                </div>
                                <button className="bg-primary dark:bg-white text-white dark:text-stone-950 px-12 py-4 font-headline text-sm font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-all active:scale-95 rounded-lg disabled:opacity-50" type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* Map Integration */}
            <section className="w-full bg-surface-container-low dark:bg-stone-900 pt-12 pb-24 transition-colors duration-500">
                <div className="max-w-7xl mx-auto px-8 mb-12 flex justify-between items-end">
                    <div>
                        <h2 className="font-headline text-3xl text-primary dark:text-white font-bold tracking-tight transition-colors duration-500">Visite Nossa Loja</h2>
                        <p className="text-on-surface-variant dark:text-stone-400 mt-2 transition-colors duration-500">Experimente nossos projetos de iluminação pessoalmente.</p>
                    </div>
                    <div className="hidden md:block">
                        <span className="label-md uppercase tracking-widest text-primary dark:text-white font-bold font-headline transition-colors duration-500">Campina Grande - PB, Brasil</span>
                    </div>
                </div>
                <div className="w-full h-[500px] relative grayscale hover:grayscale-0 dark:opacity-80 dark:hover:opacity-100 transition-all duration-700 overflow-hidden shadow-inner">
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
    );
}