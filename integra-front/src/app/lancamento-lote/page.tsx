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
    <div className="min-h-screen bg-neutral-900 text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Lançamento em Lote Sankhya
          </h1>
          <p className="text-neutral-400 text-lg">
            Cole as linhas da planilha com os códigos dos produtos e as quantidades para gerar uma única nota.
          </p>
        </div>

        <form onSubmit={handleLancarNota} className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-8 rounded-2xl shadow-2xl space-y-8">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Código do Parceiro (CODPARC)</label>
              <input
                type="number"
                value={codParc}
                onChange={(e) => setCodParc(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Tipo de Operação (CODTIPOPER)</label>
              <input
                type="number"
                value={codTipOper}
                onChange={(e) => setCodTipOper(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Tipo de Venda (CODTIPVENDA)</label>
              <input
                type="number"
                value={codTipVenda}
                onChange={(e) => setCodTipVenda(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Tipo de Movimento (TIPMOV)</label>
              <select
                value={tipMov}
                onChange={(e) => setTipMov(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300 flex justify-between">
              <span>Dados da Planilha (TSV / Excel)</span>
              <span className="text-neutral-500 text-xs">Requer colunas: {'{CODPROD}'}, {'{CODVOL}'}, {'{QTDNEG}'}, {'{VLRUNIT}'}</span>
            </label>
            <textarea
              value={tsvData}
              onChange={(e) => setTsvData(e.target.value)}
              placeholder="Ex:&#10;{NUNOTA}&#9;{CODPROD}&#9;{CODVOL}&#9;{QTDNEG}&#9;{VLRUNIT}&#10;369071&#9;466&#9;{UN}&#9;3&#9;62,01"
              className="w-full h-64 bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-y"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-all hover:scale-[1.01] active:scale-[0.98] ${loading
                ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white'
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processando...
              </span>
            ) : 'Lançar Nota no Sankhya'}
          </button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-6 rounded-2xl flex items-start gap-4">
            <svg className="w-6 h-6 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <div>
              <h3 className="font-bold text-lg">Ocorreu um erro</h3>
              <p className="opacity-80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-8 h-8 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <h3 className="font-bold text-2xl text-emerald-300">Sucesso!</h3>
            </div>
            <div className="bg-neutral-900 border border-emerald-500/20 p-4 rounded-xl max-h-96 overflow-auto">
              <pre className="text-sm font-mono text-emerald-200">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
