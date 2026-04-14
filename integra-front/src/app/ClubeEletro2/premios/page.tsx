export default function PremiosPage() {
    const premios = [
        { title: "Liquidificador Mondial", pts: "1.200", img: "local_dining" },
        { title: "Batedeira Planetária", pts: "2.500", img: "bakery_dining" },
        { title: "Fritadeira Air Fryer", pts: "3.800", img: "cooking" },
        { title: "Vale Compras R$ 50", pts: "500", img: "payments" },
        { title: "Vale Compras R$ 100", pts: "1.000", img: "payments" },
        { title: "Ventilador de Mesa", pts: "800", img: "mode_fan" },
    ];

    return (
        <div className="max-w-[1000px] mx-auto px-4 lg:px-8">

            <div className="mb-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Catálogo de Prêmios</h1>
                    <p className="text-sm text-gray-500">Troque seus pontos por vantagens incríveis.</p>
                </div>
                <div className="bg-eletroGreen/10 text-eletroGreen px-4 py-2 rounded-lg font-bold text-sm">
                    Seu saldo: 2.450 pts
                </div>
            </div>

            {/* Tabs de Categoria */}
            <div className="flex overflow-x-auto pb-4 mb-6 gap-2 no-scrollbar">
                {['Todos', 'Eletrodomésticos', 'Vale-Compras', 'Casa', 'Cozinha'].map((cat, i) => (
                    <button key={i} className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${i === 0 ? 'bg-eletroGreen text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {cat}
                    </button>
                ))}
            </div>

            {/* Grid de Prêmios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {premios.map((item, i) => (
                    <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">

                        {/* Imagem Placeholder */}
                        <div className="h-48 bg-gray-50 flex items-center justify-center border-b border-gray-100">
                            <span className="material-symbols-outlined text-6xl text-gray-300">{item.img}</span>
                        </div>

                        <div className="p-5 flex flex-col flex-grow">
                            <h3 className="text-sm font-medium text-gray-800 mb-1">{item.title}</h3>
                            <div className="mt-auto pt-4 flex justify-between items-center">
                                <span className="text-lg font-bold text-eletroGreen">{item.pts} <span className="text-xs font-normal">pts</span></span>
                                <button className="bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-eletroGreen transition-colors">
                                    Resgatar
                                </button>
                            </div>
                        </div>

                    </div>
                ))}
            </div>
        </div>
    );
}