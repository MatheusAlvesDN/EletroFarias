export default function FooterClube() {
    return (
        <footer className="bg-white border-t border-gray-200 pt-10 pb-6 px-6 mt-12">
            <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

                <div>
                    <div className="text-2xl font-bold text-gray-800 mb-2">
                        Eletro<span className="text-eletroGreen">Farias</span>
                    </div>
                    <p className="text-sm text-gray-500">O seu clube de benefícios e recompensas.</p>
                </div>

                <div className="flex flex-col space-y-2 text-sm text-gray-600">
                    <p className="font-bold text-gray-800 mb-2">Links Úteis</p>
                    <a href="#" className="hover:text-eletroGreen">Regulamento</a>
                    <a href="#" className="hover:text-eletroGreen">Dúvidas Frequentes</a>
                    <a href="#" className="hover:text-eletroGreen">Fale Conosco</a>
                </div>

                <div className="flex flex-col space-y-2 text-sm text-gray-600">
                    <p className="font-bold text-gray-800 mb-2">Atendimento</p>
                    <p>clube@eletrofarias.com.br</p>
                    <p>(83) 99999-9999</p>
                </div>

            </div>

            <div className="max-w-[1200px] mx-auto border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
                © 2026 EletroFarias. Todos os direitos reservados.
            </div>
        </footer>
    );
}