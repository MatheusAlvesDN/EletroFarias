'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-sm">
      <div className="flex justify-between items-start px-4 md:px-8 py-6 max-w-[1600px] mx-auto">

        {/* Logo Customizado (Versão Header) */}
        <Link href="/lid/figma/home" className="flex items-center gap-2 md:gap-3 text-charcoal hover:opacity-80 transition-opacity">
          {/* Símbolo "Phi" estilizado */}
      <div className="relative w-8 h-8 md:w-10 md:h-10">
            {/* Círculo: inset-0 garante o alinhamento perfeito nas bordas */}
            <div className="absolute inset-0 border-2 border-charcoal rounded-circle"></div>
            
            {/* Linha Vertical: Alterado para left-2/3 (deslocada para direita) */}
            <div className="absolute h-[120%] w-[2px] bg-charcoal top-[-10%] left-2/3 -translate-x-1/2"></div>
          </div>

          {/* Texto "Lid" */}
          <div className="text-2xl md:text-3xl font-medium tracking-tight flex items-baseline">
            Lid<span className="text-lime text-3xl md:text-4xl leading-none">.</span>
          </div>

          {/* Texto "ILUMINAÇÃO" Empilhado */}
          <div className="flex flex-col text-[7px] md:text-[8px] tracking-[0.3em] font-medium leading-tight ml-1">
            <span>ILU</span>
            <span>MINA</span>
            <span>ÇÃO</span>
          </div>
        </Link>

        {/* Desktop Menu (Vertical) */}
        <div className="hidden md:flex flex-col text-right space-y-1 mt-2">
          <Link href="/lid/figma/home" className="text-lg hover:text-graytext transition-colors">Início</Link>
          <Link href="/lid/figma/projects" className="text-lg hover:text-graytext transition-colors">Projetos</Link>
          <Link href="/lid/figma/about" className="text-lg hover:text-graytext transition-colors">Sobre</Link>
          <Link href="/lid/figma/contact" className="text-lg hover:text-graytext transition-colors">Contato</Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden flex items-center justify-center w-10 h-10 bg-lime text-charcoal rounded-circle text-2xl font-light mt-1"
        >
          {isOpen ? '×' : '+'}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white w-full px-4 pb-6 flex flex-col space-y-4 border-b border-gray-100">
          <Link href="/lid/figma/home" onClick={() => setIsOpen(false)} className="text-xl">Início</Link>
          <Link href="/lid/figma/projects" onClick={() => setIsOpen(false)} className="text-xl">Projetos</Link>
          <Link href="/lid/figma/about" onClick={() => setIsOpen(false)} className="text-xl">Sobre</Link>
          <Link href="/lid/figma/contact" onClick={() => setIsOpen(false)} className="text-xl">Contato</Link>
        </div>
      )}
    </nav>
  );
}