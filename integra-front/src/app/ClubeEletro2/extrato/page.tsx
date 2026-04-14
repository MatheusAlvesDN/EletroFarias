export default function ExtratoPage() {
    const transactions = [
        { title: "Compra Loja Centro", desc: "Pedido #45892", date: "12 Abr 2026", pts: "+150", type: "in" },
        { title: "Compra Site", desc: "Pedido #45800", date: "10 Abr 2026", pts: "+80", type: "in" },
        { title: "Resgate de Prêmio", desc: "Liquidificador", date: "05 Abr 2026", pts: "-1200", type: "out" },
        { title: "Bônus Aniversário", desc: "Presente Clube", date: "01 Abr 2026", pts: "+500", type: "in" },
        { title: "Compra Loja Filial", desc: "Pedido #41102", date: "15 Mar 2026", pts: "+320", type: "in" },
    ];

    return (
        <div className="max-w-[800px] mx-auto px-4 lg:px-8">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Extrato de Pontos</h1>
                    <p className="text-sm text-gray-500">Acompanhe suas entradas e saídas.</p>
                </div>

                {/* Filtro simples */}
                <select className="bg-white border border-gray-200 text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-eletroGreen">
                    <option>Últimos 30 dias</option>
                    <option>Últimos 60 dias</option>
                    <option>Este Ano</option>
                </select>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {transactions.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">

                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${item.type === 'in' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                <span className="material-symbols-outlined">{item.type === 'in' ? 'shopping_bag' : 'redeem'}</span>
                            </div>
                            <div>
                                <p className="text-base font-medium text-gray-800">{item.title}</p>
                                <p className="text-xs text-gray-500">{item.desc} • {item.date}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <span className={`text-base font-bold ${item.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                {item.pts} pts
                            </span>
                        </div>

                    </div>
                ))}
            </div>
        </div>
    );
}