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
    variant = 'standard',
    imageSrc,
    title,
    description,
    category,
    href = "#",
    aspectRatio = "aspect-[16/9]",
    className = "",
    badge
}: ProjectCardProps) {
    if (variant === 'overlay') {
        return (
            <Link href={href} className={`group cursor-pointer block ${className}`}>
                <div className={`relative h-full min-h-[300px] overflow-hidden rounded-xl ${aspectRatio !== 'aspect-[16/9]' ? aspectRatio : ''}`}>
                    <img alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={imageSrc} />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-60"></div>
                    <div className="absolute bottom-0 left-0 p-8 text-white">
                        {category && <span className="text-xs uppercase tracking-widest opacity-80 mb-2 block">{category}</span>}
                        <h3 className="text-xl md:text-2xl font-headline font-bold">{title}</h3>
                    </div>
                </div>
            </Link>
        );
    }

    // Standard Variant (Text below/beside image)
    return (
        <Link href={href} className={`group cursor-pointer flex flex-col ${className}`}>
            <div className={`relative overflow-hidden ${aspectRatio} mb-6 rounded`}>
                <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={title} src={imageSrc} />
                {badge && (
                    <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur px-6 py-4 shadow-xl rounded">
                        <span className="font-label text-[10px] uppercase tracking-[0.3em] text-primary font-bold">{badge}</span>
                    </div>
                )}
            </div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                    <h3 className="font-headline text-2xl md:text-3xl text-primary mb-2">{title}</h3>
                    {description && <p className="font-body text-on-surface-variant text-sm max-w-md">{description}</p>}

                    {!category && (
                        <div className="mt-4 flex items-center gap-2 group-hover:gap-4 transition-all">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Ver Detalhes</span>
                            <div className="h-[1px] w-8 bg-primary"></div>
                        </div>
                    )}
                </div>
                {category && (
                    <span className="font-label text-[10px] uppercase tracking-widest text-outline border border-outline-variant/50 px-3 py-1 rounded shrink-0">
                        {category}
                    </span>
                )}
            </div>
        </Link>
    );
}