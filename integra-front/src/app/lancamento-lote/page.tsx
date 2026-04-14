"use client";

import React, { useState } from 'react';

export default function LancamentoLotePage() {
  const [codParc, setCodParc] = useState(1);
  const [codTipOper, setCodTipOper] = useState(314);
  const [codTipVenda, setCodTipVenda] = useState(40);
  const [tipMov, setTipMov] = useState('V');
  const [tsvData, setTsvData] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLancarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!tsvData.trim()) throw new Error('Cole os dados da tabela primeiro.');

      // Parsing local na interface
      const lines = tsvData.split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) throw new Error('A tabela precisa de cabeçalho e pelo menos um produto.');

      const headers = lines[0].split('\t');
      const getIdx = (name: string) => headers.findIndex(h => h.toUpperCase().includes(name));
      const idxProd = getIdx('CODPROD');
      const idxVlr = getIdx('VLRUNIT');
      const idxVlrIcms = getIdx('VLRICMS');
      const idxBaseIcms = getIdx('BASEICMS');
      const idxBaseIpi = getIdx('BASEIPI');
      const idxAliIpi = getIdx('ALIPI');
      const idxVlrIpi = getIdx('VLRIPI');

      if (idxProd === -1) {
        throw new Error('Cabeçalho inválido. Certifique-se de que {CODPROD} está presente na tabela colada.');
      }

      const produtosFormatados: any[] = [];
      const parseVal = (idx: number, colStr: string[]) => {
        if (idx !== -1 && colStr[idx]) {
          return parseFloat(colStr[idx].replace(/\./g, '').replace(',', '.')) || 0;
        }
        return 0;
      };

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        if (cols.length <= idxProd) continue;

        let codProd = parseInt(cols[idxProd], 10);
        let vlrUnit = parseVal(idxVlr, cols);
        let vlrIcms = parseVal(idxVlrIcms, cols);
        let baseIcms = parseVal(idxBaseIcms, cols);
        let baseIpi = parseVal(idxBaseIpi, cols);
        let aliIpi = parseVal(idxAliIpi, cols);
        let vlrIpi = parseVal(idxVlrIpi, cols);

        if (!isNaN(codProd)) {
          produtosFormatados.push({
            codProd,
            vlrUnit,
            vlrIcms,
            baseIcms,
            baseIpi,
            aliIpi,
            vlrIpi
          });
        }
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

      const response = await fetch(`${apiUrl}/sankhya/lancamento-lote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN || ''}`
        },
        body: JSON.stringify({
          codParc,
          codTipOper,
          codTipVenda,
          tipMov,
          produtos: produtosFormatados
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao enviar a requisição');
      }

      // Sankhya returns status '0' format for logical API errors even if HTTP is 200
      if (data.status === '0') {
        throw new Error(data.statusMessage || JSON.stringify(data.tsError) || 'Erro na API do Sankhya');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6 md:p-8 font-sans flex justify-center">
      <div className="w-full max-w-5xl flex flex-col gap-6">

        {/* Cabeçalho da Página */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Lançamento em Lote Sankhya
          </h1>
          <p className="text-gray-500 mt-2 text-sm md:text-base">
            Cole as linhas da planilha com os códigos dos produtos e as quantidades para gerar uma única nota.
          </p>
        </div>

        {/* Formulário Principal */}
        <form onSubmit={handleLancarNota} className="bg-white border border-gray-100 p-6 md:p-8 rounded-xl shadow flex flex-col gap-6">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Cód. Parceiro</label>
              <input
                type="number"
                value={codParc}
                onChange={(e) => setCodParc(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">TOP (Operação)</label>
              <input
                type="number"
                value={codTipOper}
                onChange={(e) => setCodTipOper(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Cód. Tipo Venda</label>
              <input
                type="number"
                value={codTipVenda}
                onChange={(e) => setCodTipVenda(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo Movimento</label>
              <select
                value={tipMov}
                onChange={(e) => setTipMov(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="V">V - Venda</option>
                <option value="P">P - Pedido</option>
                <option value="C">C - Compra</option>
                <option value="O">O - Outro</option>
                <option value="D">D - Devolução</option>
                <option value="T">T - Transferência</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex justify-between items-end">
              <span>Dados da Planilha (TSV / Excel)</span>
              <span className="text-gray-500 text-xs font-normal bg-gray-100 px-2 py-1 rounded">Requer colunas: {'{CODPROD}'}, {'{CODVOL}'}, {'{QTDNEG}'}, {'{VLRUNIT}'}</span>
            </label>
            <textarea
              value={tsvData}
              onChange={(e) => setTsvData(e.target.value)}
              placeholder={`Ex:\n{NUNOTA}\t{CODPROD}\t{CODVOL}\t{QTDNEG}\t{VLRUNIT}\n369071\t466\tUN\t3\t62,01`}
              className="w-full h-64 bg-gray-50 border border-gray-300 text-gray-800 rounded-lg p-4 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-lg font-bold text-lg shadow transition-all ${loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processando...
              </span>
            ) : 'Lançar Nota no Sankhya'}
          </button>
        </form>

        {/* Mensagem de Erro */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-5 rounded-r-xl shadow-sm flex items-start gap-3">
            <svg className="w-6 h-6 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <div>
              <h3 className="font-bold text-lg">Ocorreu um erro</h3>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Mensagem de Sucesso */}
        {result && (
          <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-xl shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-green-700">
              <svg className="w-8 h-8 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <h3 className="font-bold text-2xl">Sucesso!</h3>
            </div>
            <div className="bg-white border border-green-200 p-4 rounded-lg max-h-96 overflow-auto shadow-inner">
              <pre className="text-sm font-mono text-gray-800">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}