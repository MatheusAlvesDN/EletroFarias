// src/app/clube/page.tsx
import React from 'react';
import { Gift } from 'lucide-react';

export default function ClubeLogin() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center text-center">
                {/* Logo Placeholder */}
                <div className="w-24 h-24 bg-red-700 rounded-full flex items-center justify-center mb-6 shadow-lg">
                    <span className="text-white font-bold text-xl">EF</span>
                </div>

                <h1 className="text-3xl font-bold text-gray-800 mb-2">Clube Eletro</h1>
                <p className="text-gray-600 mb-10 text-sm px-4">
                    Acompanhe seus pontos e resgate prêmios exclusivos nas suas compras.
                </p>

                <div className="w-full space-y-4">
                    <button className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-4 px-6 rounded-xl transition duration-200 shadow-md">
                        Entrar com CPF/CNPJ
                    </button>

                    <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-xl transition duration-200 border border-gray-300">
                        Sou Funcionário
                    </button>
                </div>
            </div>
        </div>
    );
}