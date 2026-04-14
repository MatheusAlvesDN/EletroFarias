export default function LoginPage() {
    return (
        <div className="max-w-md mx-auto px-4 py-16">
            <div className="bg-white rounded-2xl shadow-lg p-8">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-eletroGreen/10 text-eletroGreen rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl">loyalty</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Clube EletroFarias</h1>
                    <p className="text-sm text-gray-500 mt-2">Faça login para ver seus pontos e resgatar prêmios.</p>
                </div>

                <form className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CPF ou E-mail</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:border-eletroGreen focus:ring-1 focus:ring-eletroGreen transition-all"
                            placeholder="000.000.000-00"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Senha</label>
                            <a href="#" className="text-xs text-eletroGreen hover:underline">Esqueceu?</a>
                        </div>
                        <input
                            type="password"
                            className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:border-eletroGreen focus:ring-1 focus:ring-eletroGreen transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                    <button className="w-full bg-eletroGreen text-white font-medium rounded-xl py-3.5 hover:bg-green-700 transition-colors shadow-sm mt-4">
                        Acessar Minha Conta
                    </button>
                </form>

            </div>
        </div>
    );
}