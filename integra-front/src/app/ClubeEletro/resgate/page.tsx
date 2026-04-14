// src/app/clube/resgate/page.tsx
import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function ResgateProduto() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* TopBar */}
            <div className="bg-white px-6 py-4 flex items-center shadow-sm">
                <button className="text-gray-600 hover:text-gray-900">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="flex-1 text-center font-bold text-gray-800 text-lg mr-6">
                    Resgatar Recompensa
                </h1>
            </div>

            <div className="flex-1 px-6 pt-6 pb-8">
                {/* Resumo do Produto */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center border border-gray-100">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg mr-4"></div>
                    <div>
                        <h3 className="font-semibold text-gray-800 text-sm">Liquidificador Britânia</h3>
                        <p className="text-red-700 font-bold text-sm mt-1">- 850 pts</p>
                    </div>
                </div>

                {/* Resumo de Pontos */}
                <div className="bg-gray-100 rounded-xl p-5 mb-8">
                    <div className="flex justify-between mb-2 text-sm">
                        <span className="text-gray-600">Saldo Atual</span>
                        <span className="font-semibold text-gray-800">1.250 pts</span>
                    </div>
                    <div className="flex justify-between mb-2 text-sm">
                        <span className="text-gray-600">Custo do Resgate</span>
                        <span className="font-semibold text-red-600">- 850 pts</span>
                    </div>
                    <div className="w-full h-px bg-gray-300 my-3"></div>
                    <div className="flex justify-between font-bold text-base">
                        <span className="text-gray-800">Saldo Final</span>
                        <span className="text-green-600">400 pts</span>
                    </div>
                </div>

                {/* Formulário de Nota */}
                <div className="mb-6">
                    <label className="block text-gray-700 font-medium mb-2 text-sm">
                        Nº da Nota Fiscal <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="Digite o número da nota"
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-700"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        Insira o número da nota fiscal para validar o resgate do seu prêmio.
                    </p>
                </div>
            </div>

            {/* Bottom Button Fixed */}
            <div className="p-6 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-4 rounded-xl transition duration-200">
                    Confirmar Resgate
                </button>
            </div>
        </div>
    );
}