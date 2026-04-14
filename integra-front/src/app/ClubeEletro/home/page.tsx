// src/app/clube/cliente/page.tsx
import React from 'react';
import { Gift } from 'lucide-react';

export default function ClienteDashboard() {
    return (
        <div className="min-h-screen bg-gray-100 pb-10">
            {/* Header com curva */}
            <div className="bg-red-700 pt-12 pb-16 px-6 rounded-b-[2.5rem] shadow-md">
                <h2 className="text-red-100 text-sm font-medium mb-1">Olá, Maria Eduarda!</h2>
                <h1 className="text-white text-4xl font-bold">1.250 <span className="text-xl font-normal">pts</span></h1>

                {/* Barra de Progresso */}
                <div className="mt-6">
                    <div className="flex justify-between text-white text-xs mb-2 font-medium">
                        <span>Clube Eletro</span>
                        <span>Meta: 2000 pts</span>
                    </div>
                    <div className="w-full bg-red-900 rounded-full h-3">
                        <div className="bg-yellow-400 h-3 rounded-full" style={{ width: '62%' }}></div>
                    </div>
                </div>
            </div>

            {/* Seção de Prêmios */}
            <div className="px-6 -mt-6">
                <div className="flex items-center justify-between mb-4 mt-8">
                    <h3 className="text-lg font-bold text-gray-800">Prêmios Disponíveis</h3>
                    <Gift className="text-red-700" size={20} />
                </div>

                {/* Card de Produto */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex items-center p-4">
                    <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                        {/* Imagem Placeholder */}
                        <span className="text-gray-400 text-xs text-center px-2">Imagem Produto</span>
                    </div>

                    <div className="ml-4 flex-1">
                        <h4 className="text-gray-800 font-semibold line-clamp-2 text-sm">
                            Liquidificador Britânia Diamante 800W
                        </h4>
                        <p className="text-red-700 font-bold mt-1">850 pts</p>

                        <button className="mt-3 w-full bg-red-700 text-white text-sm font-medium py-2 rounded-lg hover:bg-red-800 transition">
                            Resgatar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}