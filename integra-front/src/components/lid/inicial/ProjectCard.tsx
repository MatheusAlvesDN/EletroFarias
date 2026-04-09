import React from 'react';
import Link from 'next/link';

interface ProjectCardProps {
    variant?: 'overlay' | 'standard';
    imageSrc: string;
    title: string;
    description?: string;
    category?: string;
    href?: string;
    aspectRatio?: string;
    className?: string;
    badge?: string;
}

export default function ProjectCard({
    variant = 'standard', imageSrc, title, description, category, href = "#", aspectRatio = "aspect-[16/9]", className = "", badge
}: ProjectCardProps) {

    if (variant === 'overlay') {
        return (
            <Link href={href} className={`group cursor-pointer block ${className}`}>
                <div className={`relative h-full min-h-[300px] overflow-hidden rounded-xl ${aspectRatio !== 'aspect-[16/9]' ? aspectRatio : ''}`}>
                    <img alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={imageSrc} />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 dark:from-stone-900/90 via-transparent to-transparent opacity-60 dark:opacity-80 transition-colors duration-500"></div>
                    <div className="absolute bottom-0 left-0 p-8 text-white">
                        {category && <span className="text-xs uppercase tracking-widest opacity-80 mb-2 block">{category}</span>}
                        <h3 className="text-xl md:text-2xl font-headline font-bold">{title}</h3>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link href={href} className={`group cursor-pointer flex flex-col ${className}`}>
            <div className={`relative overflow-hidden ${aspectRatio} mb-6 rounded`}>
                <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={title} src={imageSrc} />
                {badge && (
                    <div className="absolute bottom-6 right-6 bg-white/90 dark:bg-stone-900/90 backdrop-blur px-6 py-4 shadow-xl rounded transition-colors duration-500">
                        <span className="font-label text-[10px] uppercase tracking-[0.3em] text-primary dark:text-white font-bold">{badge}</span>
                    </div>
                )}
            </div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                    <h3 className="font-headline text-2xl md:text-3xl text-primary dark:text-white mb-2 transition-colors duration-500">{title}</h3>
                    {description && <p className="font-body text-on-surface-variant dark:text-stone-400 text-sm max-w-md transition-colors duration-500">{description}</p>}

                    {!category && (
                        <div className="mt-4 flex items-center gap-2 group-hover:gap-4 transition-all">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary dark:text-white">Ver Detalhes</span>
                            <div className="h-[1px] w-8 bg-primary dark:bg-white transition-colors duration-500"></div>
                        </div>
                    )}
                </div>
                {category && (
                    <span className="font-label text-[10px] uppercase tracking-widest text-outline dark:text-stone-400 border border-outline-variant/50 dark:border-white/20 px-3 py-1 rounded shrink-0 transition-colors duration-500">
                        {category}
                    </span>
                )}
            </div>
        </Link>
    );
}