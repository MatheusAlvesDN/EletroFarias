import Link from 'next/link';

export default function Footer() {
  return (
    // Reduzimos o pt-24 para pt-16 e mt-24 para mt-16 para um rodapé mais compacto
    <footer className="bg-charcoal text-white pt-16 pb-8 px-4 md:px-8 mt-16">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Top Section: Logo & Links Grid */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
          
          {/* Custom Logo Creation (imitando a imagem) */}
          <div className="flex items-center gap-4">
            
            {/* Símbolo "Phi" estilizado - REMOVIDO o flex centering */}
            <div className="relative w-16 h-16 md:w-20 md:h-20">
              {/* Círculo */}
              <div className="absolute inset-0 border-[3px] border-white rounded-circle"></div>
              
              {/* Linha Vertical: Alterado para left-2/3 (deslocada para direita) */}
              <div className="absolute h-[120%] w-[3px] bg-white top-[-10%] left-2/3 -translate-x-1/2"></div>
            </div>
            
            {/* Texto "Lid" */}
            <div className="text-5xl md:text-6xl font-medium tracking-tight">
              Lid<span className="text-lime">.</span>
            </div>
            
            {/* Texto "ILUMINAÇÃO" Empilhado */}
            <div className="flex flex-col text-[10px] md:text-xs tracking-[0.3em] font-medium leading-tight ml-2">
              <span>ILU</span>
              <span>MINA</span>
              <span>ÇÃO</span>
            </div>
          </div>

          {/* Links & Info (Compactados) */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-12 text-sm font-light w-full md:w-auto">
            <div className="flex flex-col space-y-3">
              <Link href="/lid/figma/about" className="hover:text-lime transition-colors">Empresa</Link>
              <Link href="/lid/figma/projects" className="hover:text-lime transition-colors">Projetos</Link>
              <Link href="/lid/figma/contact" className="hover:text-lime transition-colors">Contato</Link>
            </div>
            
            <div className="flex flex-col space-y-6">
              <div>
                <p>Av. Jorn. Assis Chateaubriand, 2500</p>
                <p>Distrito Industrial, Campina Grande - PB, 58410-062</p>
              </div>
              <div>
                <p>contato@lid.com.br</p>
                <p>(83) 99999-9999</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar (Margem superior reduzida de mt-32 para mt-16) */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end mt-16 border-t border-gray-800 pt-8 text-sm font-light gap-4">
          <div className="flex space-x-6">
            <a href="#" className="hover:text-lime transition-colors">Fb</a>
            <a href="#" className="hover:text-lime transition-colors">Ig</a>
            <a href="#" className="hover:text-lime transition-colors">In</a>
          </div>
          <p className="text-gray-400">© 2026 Todos os Direitos Reservados</p>
        </div>
      </div>
    </footer>
  );
}