'use client';

import React, { useState } from 'react';

export default function DatabaseTestPage() {
  const [codProd, setCodProd] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testQuery = async () => {
    setLoading(true);
    setResult(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/database/detail/${codProd}`);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      console.error(error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Consulta de Produto (Oracle)</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 mb-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Código do Produto (CODPROD)</label>
            <input
              type="text"
              value={codProd}
              onKeyDown={(e) => e.key === 'Enter' && testQuery()}
              onChange={(e) => setCodProd(e.target.value)}
              placeholder="Digite o código (ex: 123)"
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={testQuery}
            disabled={loading || !codProd}
            className="md:self-end bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-8 rounded-md transition duration-200 disabled:bg-gray-400 h-10 shadow-sm"
          >
            {loading ? 'Buscando...' : 'Pesquisar'}
          </button>
        </div>
      </div>

      {result && !result.error && (
        <div className="space-y-6">
          {Array.isArray(result) && result.length > 0 ? (
            result.map((item: any, i: number) => (
              <div key={i} className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200 flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="md:w-1/3 bg-gray-50 flex items-center justify-center p-6 border-r border-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={item.IMAGEM_URL} 
                    alt={item.DESCRPROD} 
                    className="max-w-full max-h-64 object-contain rounded-lg shadow-sm bg-white p-2"
                    onError={(e) => {
                      (e.target as any).src = 'https://via.placeholder.com/300?text=Sem+Imagem';
                    }}
                  />
                </div>
                <div className="md:w-2/3 p-8 flex flex-col justify-between">
                  <div>
                    <div className="mb-2">
                      <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                        SKU: {item.CODPROD}
                      </span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">{item.DESCRPROD}</h2>
                    
                    {item.COMPLEMENTO && (
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Descrição Detalhada:</h3>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                          {item.COMPLEMENTO}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-8 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400 italic">
                    <span>Fonte: Banco de Dados Oracle Nuvemdatacom</span>
                    <span>Sincronizado em tempo real</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg text-amber-800 flex items-center gap-3">
              <span className="text-2xl">🔍</span>
              <div>
                <p className="font-bold">Nenhum produto encontrado</p>
                <p className="text-sm">O código {codProd} não existe na base de dados ou está inativo.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {result && result.error && (
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg text-red-800 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold">Erro na conexão</p>
            <p className="text-sm">{result.error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
