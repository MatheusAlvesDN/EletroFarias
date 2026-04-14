'use client';
import { useEffect, useState } from 'react';

export default function PremiosPage() {
    // Estado para guardar os dados reais do usuário
    const [user, setUser] = useState<any>(null);
    // Estado para controlar a aba de categoria selecionada
    const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');

    const categorias = ['Todos', 'Eletrodomésticos', 'Vale-Compras', 'Casa', 'Cozinha'];

    // Mudei os pontos para número (ex: 1200) para facilitar a matemática de bloqueio.
    // Adicionei a propriedade 'cat' para o filtro funcionar.
    const premios = [
        { id: 1, title: "Liquidificador Mondial", pts: 1200, img: "local_dining", cat: "Eletrodomésticos" },
        { id: 2, title: "Batedeira Planetária", pts: 2500, img: "bakery_dining", cat: "Eletrodomésticos" },
        { id: 3, title: "Fritadeira Air Fryer", pts: 3800, img: "cooking", cat: "Cozinha" },
        { id: 4, title: "Vale Compras R$ 50", pts: 500, img: "payments", cat: "Vale-Compras" },
        { id: 5, title: "Vale Compras R$ 100", pts: 1000, img: "payments", cat: "Vale-Compras" },
        { id: 6, title: "Ventilador de Mesa", pts: 800, img: "mode_fan", cat: "Casa" },
    ];

    useEffect(() => {
        // Lê os dados do usuário para pegar o saldo real
        const storedUser = localStorage.getItem('@EletroClube:user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Lógica do filtro
    const premiosFiltrados = premios.filter(
        (premio) => categoriaAtiva === 'Todos' || premio.cat === categoriaAtiva
    );

    const saldoAtual = user?.pontos || 0;

    const handleResgatar = (premio: any) => {
        // Futuramente, aqui você fará um POST para o NestJS confirmando o resgate
        if (confirm(`Deseja resgatar o item: ${premio.title} por ${premio.pts} pts?`)) {
            alert('Solicitação de resgate enviada com sucesso! (Versão de demonstração)');
        }
    };

    return (
        <div className="max-w-[1000px] mx-auto px-4 lg:px-8">

            <div className="mb-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Catálogo de Prêmios</h1>
                    <p className="text-sm text-gray-500">Troque seus pontos por vantagens incríveis.</p>
                </div>
                {/* Saldo Dinâmico */}
                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg font-bold text-sm border border-green-100">
                    Seu saldo: {saldoAtual.toLocaleString('pt-BR')} pts
                </div>
            </div>

            {/* Tabs de Categoria Dinâmicas */}
            <div className="flex overflow-x-auto pb-4 mb-6 gap-2 no-scrollbar">
                {categorias.map((cat, i) => (
                    <button
                        key={i}
                        onClick={() => setCategoriaAtiva(cat)}
                        className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${categoriaAtiva === cat
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Grid de Prêmios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {premiosFiltrados.map((item) => {
                    const podeResgatar = saldoAtual >= item.pts;

                    return (
                        <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">

                            {/* Imagem Placeholder */}
                            <div className="h-48 bg-gray-50 flex items-center justify-center border-b border-gray-100">
                                <span className="material-symbols-outlined text-6xl text-gray-300">{item.img}</span>
                            </div>

                            <div className="p-5 flex flex-col flex-grow">
                                <h3 className="text-sm font-medium text-gray-800 mb-1">{item.title}</h3>
                                <div className="mt-auto pt-4 flex justify-between items-center">
                                    <span className={`text-lg font-bold ${podeResgatar ? 'text-green-600' : 'text-gray-400'}`}>
                                        {item.pts.toLocaleString('pt-BR')} <span className="text-xs font-normal">pts</span>
                                    </span>

                                    {/* Botão Dinâmico: Fica cinza se não tiver pontos */}
                                    <button
                                        onClick={() => handleResgatar(item)}
                                        disabled={!podeResgatar}
                                        className={`text-xs font-medium px-4 py-2 rounded-lg transition-colors ${podeResgatar
                                                ? 'bg-gray-900 text-white hover:bg-green-600'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {podeResgatar ? 'Resgatar' : 'Saldo Insuficiente'}
                                    </button>
                                </div>
                            </div>

                        </div>
                    );
                })}
            </div>

            {/* Mensagem caso a categoria esteja vazia */}
            {premiosFiltrados.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    Nenhum prêmio encontrado nesta categoria.
                </div>
            )}
        </div>
    );
}