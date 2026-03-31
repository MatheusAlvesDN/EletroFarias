export default function ContactPage() {
  return (
    <main className="pt-48 md:pt-56 pb-24 max-w-[1600px] mx-auto px-4 md:px-8 min-h-[80vh]">
      
      {/* Seção Superior: Formulário e Informações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32 mb-32">
        
        <div>
          <h1 className="text-3xl md:text-5xl font-medium mb-12">Vamos criar.</h1>
          <p className="text-lg font-light text-graytext mb-16 max-w-md">
            Oferecemos uma gama completa de serviços de design luminotécnico. Entre em contato para ver como podemos transformar seu espaço.
          </p>
          
          <div className="space-y-6 font-light">
            <div>
              <p className="text-sm font-medium mb-1 text-gray-400">E-MAIL</p>
              <p>hello@lid.com</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1 text-gray-400">TELEFONE</p>
              <p>(83) 99999-9999</p>
            </div>
          </div>
        </div>

        {/* Formulário Minimalista */}
        <form className="flex flex-col space-y-12 mt-8 md:mt-0">
          <input 
            type="text" 
            placeholder="Nome" 
            className="w-full bg-transparent border-b border-gray-300 pb-4 text-lg focus:outline-none focus:border-charcoal transition-colors rounded-none placeholder-gray-400"
          />
          <input 
            type="email" 
            placeholder="E-mail" 
            className="w-full bg-transparent border-b border-gray-300 pb-4 text-lg focus:outline-none focus:border-charcoal transition-colors rounded-none placeholder-gray-400"
          />
          <textarea 
            placeholder="Detalhes do Projeto" 
            rows={4}
            className="w-full bg-transparent border-b border-gray-300 pb-4 text-lg focus:outline-none focus:border-charcoal transition-colors resize-none rounded-none placeholder-gray-400"
          />
          <button 
            type="submit" 
            className="bg-charcoal text-white self-start px-12 py-4 text-sm hover:bg-lime hover:text-charcoal transition-colors duration-300"
          >
            Enviar Mensagem
          </button>
        </form>

      </div>

      {/* Seção Inferior: Integração com o Mapa (Design Brutalista) */}
      <section className="mt-24 md:mt-32 border-t border-gray-200 pt-16 md:pt-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h2 className="text-2xl md:text-4xl font-medium mb-2">Visite Nosso Estúdio</h2>
            <p className="text-lg font-light text-graytext mt-2">Experimente nossas coleções de iluminação pessoalmente.</p>
          </div>
          <div className="hidden md:block">
            <span className="text-sm uppercase tracking-widest font-medium text-charcoal">Campina Grande - PB, Brasil</span>
          </div>
        </div>
        
        {/* Iframe do mapa com efeito grayscale e sem bordas arredondadas */}
        <div className="w-full h-[400px] md:h-[600px] relative grayscale hover:grayscale-0 transition-all duration-700 bg-gray-200">
          <iframe 
            title="Mapa da Localização - LID Iluminação"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3957.910352126965!2d-35.8876955!3d-7.251043399999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7ac1d61ffc9771d%3A0xf5630a304d632798!2zTGlkIElsdW1pbmHDp8Ojbw!5e0!3m2!1spt-BR!2sbr!4v1774961315429!5m2!1spt-BR!2sbr" 
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