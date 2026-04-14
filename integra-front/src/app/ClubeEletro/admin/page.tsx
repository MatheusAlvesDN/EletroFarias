// src/app/clube/admin/page.tsx
import React from 'react';
import { Search, Home, Users, Settings } from 'lucide-react';

export default function AdminControle() {
    const resgatesMock = [
        { id: 1, nome: "João Silva", pontos: 850, data: "14 Abr 2026", status: "Aprovado" },
        { id: 2, nome: "Maria Souza", pontos: 1200, data: "13 Abr 2026", status: "Pendente" },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
            {/* TopBar */}
            <div className="bg-red-700 px-6 py-6 rounded-b-3xl shadow-md">
                <h1 className="text-white font-bold text-2xl">Controle Clube</h1>
                <p className="text-red-100 text-sm mt-1">Gerenciamento de pontos e resgates</p>
            </div>

            <div className="px-6 mt-6">
                {/* Barra de Busca */}
                <div className="relative mb-8">
                    <input
                        type="text"
                        placeholder="Buscar por CPF ou CNPJ..."
                        className="w-full bg-white shadow-sm border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-700"
                    />
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                </div>

                {/* Lista de Últimos Resgates */}
                <h2 className="text-lg font-bold text-gray-800 mb-4">Últimos Resgates</h2>

                <div className="space-y-4">
                    {resgatesMock.map((resgate) => (
                        <div key={resgate.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-gray-800">{resgate.nome}</h3>
                                <p className="text-xs text-gray-500 mt-1">{resgate.data} • {resgate.pontos} pts</p>
                            </div>
                            <div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${resgate.status === 'Aprovado'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {resgate.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center pb-safe">
                <button className="flex flex-col items-center text-red-700">
                    <Home size={24} />
                    <span className="text-[10px] mt-1 font-medium">Início</span>
                </button>
                <button className="flex flex-col items-center text-gray-400 hover:text-red-700 transition">
                    <Users size={24} />
                    <span className="text-[10px] mt-1 font-medium">Clientes</span>
                </button>
                <button className="flex flex-col items-center text-gray-400 hover:text-red-700 transition">
                    <Settings size={24} />
                    <span className="text-[10px] mt-1 font-medium">Ajustes</span>
                </button>
            </div>
        </div>
    );
}