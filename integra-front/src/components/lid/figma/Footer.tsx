import Link from 'next/link';
import { SiFacebook, SiInstagram,  SiX } from 'react-icons/si';
import { FaLinkedin } from "react-icons/fa";


export default function Footer() {
  return (
    <footer className="bg-charcoal text-white pt-16 pb-8 px-4 md:px-8 mt-16">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Top Section: Logo & Links Grid */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
          
          {/* Custom Logo Creation */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 md:w-20 md:h-20">
              <div className="absolute inset-0 border-[3px] border-white rounded-circle"></div>
              <div className="absolute h-[120%] w-[3px] bg-white top-[-10%] left-2/3 -translate-x-1/2"></div>
            </div>
            
            <div className="text-5xl md:text-6xl font-medium tracking-tight">
              Lid<span className="text-lime">.</span>
            </div>
            
            <div className="flex flex-col text-[10px] md:text-xs tracking-[0.3em] font-medium leading-tight ml-2">
              <span>ILU</span>
              <span>MINA</span>
              <span>ÇÃO</span>
            </div>
          </div>

          {/* Links & Info */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-12 text-sm font-light w-full md:w-auto">
            <div className="flex flex-col space-y-3">
              <Link href="/lid/figma/about" className="hover:text-lime transition-colors">Empresa</Link>
              <Link href="/lid/figma/projects" className="hover:text-lime transition-colors">Projetos</Link>
              <Link href="/lid/figma/contact" className="hover:text-lime transition-colors">Contato</Link>
            </div>
            
            <div className="flex flex-col space-y-6">
              <div>
                <p>Av. Jorn. Assis Chateaubriand, 2500</p>
                <p>Distrito Industrial, Campina Grande - PB</p>
              </div>
              <div>
                <p>contato@lid.com.br</p>
                <p>(83) 99999-9999</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar com Ícones Reais */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end mt-16 border-t border-gray-800 pt-8 text-sm font-light gap-4">
          <div className="flex space-x-6">
            
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" 
               className="hover:text-lime transition-colors duration-300" aria-label="Facebook">
              <SiFacebook size={20} />
            </a>

            <a href="https://x.com" target="_blank" rel="noopener noreferrer" 
               className="hover:text-lime transition-colors duration-300" aria-label="X (Twitter)">
              <SiX size={18} />
            </a>

            <a href="https://www.instagram.com/lid.iluminacao/" target="_blank" rel="noopener noreferrer" 
               className="hover:text-lime transition-colors duration-300" aria-label="Instagram">
              <SiInstagram size={20} />
            </a>

            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" 
               className="hover:text-lime transition-colors duration-300" aria-label="LinkedIn">
              <FaLinkedin size={20} />
            </a>

          </div>
          <p className="text-gray-400">© 2026 Todos os Direitos Reservados</p>
        </div>
      </div>
    </footer>
  );
}