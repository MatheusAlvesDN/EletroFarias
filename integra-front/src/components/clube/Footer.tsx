export default function FooterClube() {
    return (
        <footer className="bg-white border-t border-slate-200 pt-10 pb-6 px-6 mt-12 w-full mx-auto">
            <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

                <div>
                    <div className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                        Eletro<span className="text-emerald-600">Farias</span>
                    </div>
                    <p className="text-sm text-slate-500">O seu clube de benefícios e recompensas.</p>
                </div>

                <div className="flex flex-col space-y-2 text-sm text-slate-600">
                    <p className="font-bold text-slate-800 mb-2">Links Úteis</p>
                    <a href="/clube/regulamento" className="hover:text-emerald-600 transition-colors">Regulamento</a>
                    <a href="/clube/duvidas" className="hover:text-emerald-600 transition-colors">Dúvidas Frequentes</a>
                    <a href="#" className="hover:text-emerald-600 transition-colors">Fale Conosco</a>
                </div>

                <div className="flex flex-col space-y-2 text-sm text-slate-600">
                    <p className="font-bold text-slate-800 mb-2">Atendimento</p>
                    <p>clube@eletrofarias.com.br</p>
                    <p>(83) 99999-9999</p>
                </div>

            </div>

            <div className="max-w-[1200px] mx-auto border-t border-slate-100 pt-6 text-center text-xs text-slate-400 font-medium">
                © {new Date().getFullYear()} EletroFarias. Todos os direitos reservados.
            </div>
        </footer>
    );
}