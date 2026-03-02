'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, Calendar, Building2, Loader2, AlertCircle 
} from 'lucide-react';

interface NotaMes {
  NUNOTA: number;
  NUMNOTA: number;
  CODTIPOPER: number;
  DTNEG: string;
  CODPARC: number;
  NOMEPARC: string;
  UF: string;
  CPF_CNPJ: string;
  CHAVE_ACESSO: string;
  CFOP: string | number;
  DESCRCFO: string;
  CST: string | number;
  VLRNOTA: number;
  CLASSE_CONTRIB: string;
  AD_TIPOCLIENTEFATURAR: string | number;
}

type GrupoTabela = 'VENDA DENTRO ESTADO' | 'VENDA FORA DO ESTADO' | 'DEVOLUCAO DENTRO ESTADO' | 'DEVOLUCAO FORA ESTADO' | '';

interface RowExcel {
  id: string;
  grupo: GrupoTabela;
  cfop: string;
  descricao: string;
  tribContrib: number;
  tribNaoContrib: number;
  stContrib: number;
  stNaoContrib: number;
  soma: number;
}

// Formatador que injeta cor vermelha em valores negativos
const FormatCurrencyExcel = ({ value }: { value: number }) => {
  const isNegative = value < 0;
  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value));
  return (
    <span className={isNegative ? 'text-red-600' : 'text-slate-900'}>
      {isNegative ? `-${formatted}` : formatted}
    </span>
  );
};

export default function RelatorioCfopExcel() {
  const [codEmp, setCodEmp] = useState('1');
  const [dtIni, setDtIni] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dtFim, setDtFim] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  
  const [data, setData] = useState<NotaMes[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mesAno = useMemo(() => {
    if (!dtIni) return '';
    return new Date(dtIni + 'T00:00:00').toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  }, [dtIni]);

  const fetchNotas = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
      const qs = new URLSearchParams({ codEmp, dtIni, dtFim }).toString();
      const res = await fetch(`${API_BASE}/sankhya/notas-mes?${qs}`);
      
      if (!res.ok) throw new Error('Falha ao buscar os dados.');
      
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Erro de conexão.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 Lógica de Conversão da API para a Tabela
  const { vendas, devolucoes, totaisVendas, totaisDevolucoes } = useMemo(() => {
    const cfopsPermitidos = ['5102', '5405', '5117', '6102', '6108', '6404', '6117', '1202', '1411', '2202', '2411'];
    
    const mapVendas = new Map<string, RowExcel>();
    const mapDev = new Map<string, RowExcel>();

    data.forEach(nota => {
      const cfop = String(nota.CFOP || '').trim();
      if (!cfopsPermitidos.includes(cfop)) return;

      const firstChar = cfop.charAt(0);
      const isVenda = firstChar === '5' || firstChar === '6';
      const isDev = firstChar === '1' || firstChar === '2';

      if (!isVenda && !isDev) return;

      const cst = String(nota.CST || '').trim();
      
      // Regra Estrita CST:
      let tributacao: 'tributado' | 'ST' | '' = '';
      if (cst === '10' || cst === '60') {
        tributacao = 'ST';
      } else if (cst === '00') {
        tributacao = 'tributado';
      }
      
      if (isVenda && tributacao === '') return;

      let valor = Number(nota.VLRNOTA) || 0;
      if (isDev) valor = -Math.abs(valor);

      const key = cfop; 
      const targetMap = isVenda ? mapVendas : mapDev;

      // Define o grupo (Dentro vs Fora) para Vendas (5,6) e Devoluções (1,2)
      let grupoLocal: GrupoTabela = '';
      if (firstChar === '5') grupoLocal = 'VENDA DENTRO ESTADO';
      else if (firstChar === '6') grupoLocal = 'VENDA FORA DO ESTADO';
      else if (firstChar === '1') grupoLocal = 'DEVOLUCAO DENTRO ESTADO';
      else if (firstChar === '2') grupoLocal = 'DEVOLUCAO FORA ESTADO';

      if (!targetMap.has(key)) {
        targetMap.set(key, {
          id: key,
          grupo: grupoLocal,
          cfop,
          descricao: nota.DESCRCFO || '',
          tribContrib: 0,
          tribNaoContrib: 0,
          stContrib: 0,
          stNaoContrib: 0,
          soma: 0
        });
      }

      const row = targetMap.get(key)!;
      const isContrib = nota.CLASSE_CONTRIB === 'CONTRIBUINTE';

      if (tributacao === 'ST') {
        if (isContrib) row.stContrib += valor;
        else row.stNaoContrib += valor;
      } else {
        if (isContrib) row.tribContrib += valor;
        else row.tribNaoContrib += valor;
      }

      row.soma += valor;
    });

    // Ordenação de Vendas (Garante que DENTRO fique antes de FORA)
    const listVendas = Array.from(mapVendas.values()).sort((a, b) => {
      if (a.grupo !== b.grupo) return a.grupo.localeCompare(b.grupo); 
      return a.cfop.localeCompare(b.cfop);
    });

    const sumVendas = listVendas.reduce((acc, r) => ({
      tribContrib: acc.tribContrib + r.tribContrib,
      tribNaoContrib: acc.tribNaoContrib + r.tribNaoContrib,
      stContrib: acc.stContrib + r.stContrib,
      stNaoContrib: acc.stNaoContrib + r.stNaoContrib,
      soma: acc.soma + r.soma
    }), { tribContrib: 0, tribNaoContrib: 0, stContrib: 0, stNaoContrib: 0, soma: 0 });

    // Ordenação de Devoluções (Garante que DENTRO fique antes de FORA)
    const listDev = Array.from(mapDev.values()).sort((a, b) => {
      if (a.grupo !== b.grupo) return a.grupo.localeCompare(b.grupo); 
      return a.cfop.localeCompare(b.cfop);
    });
    
    const sumDev = listDev.reduce((acc, r) => ({
      tribContrib: acc.tribContrib + r.tribContrib,
      tribNaoContrib: acc.tribNaoContrib + r.tribNaoContrib,
      stContrib: acc.stContrib + r.stContrib,
      stNaoContrib: acc.stNaoContrib + r.stNaoContrib,
      soma: acc.soma + r.soma
    }), { tribContrib: 0, tribNaoContrib: 0, stContrib: 0, stNaoContrib: 0, soma: 0 });

    return { vendas: listVendas, devolucoes: listDev, totaisVendas: sumVendas, totaisDevolucoes: sumDev };
  }, [data]);

  // Contadores para o rowSpan das Vendas
  const countVendaDentro = vendas.filter(v => v.grupo === 'VENDA DENTRO ESTADO').length;
  const countVendaFora = vendas.filter(v => v.grupo === 'VENDA FORA DO ESTADO').length;

  // Contadores para o rowSpan das Devoluções
  const countDevDentro = devolucoes.filter(v => v.grupo === 'DEVOLUCAO DENTRO ESTADO').length;
  const countDevFora = devolucoes.filter(v => v.grupo === 'DEVOLUCAO FORA ESTADO').length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col p-4 sm:p-8">
      <div className="max-w-[1600px] w-full mx-auto flex flex-col gap-6">
        
        {/* Parâmetros de Filtro */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <form onSubmit={fetchNotas} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Empresa
              </label>
              <input type="number" required value={codEmp} onChange={(e) => setCodEmp(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Data Inicial
              </label>
              <input type="date" required value={dtIni} onChange={(e) => setDtIni(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Data Final
              </label>
              <input type="date" required value={dtFim} onChange={(e) => setDtFim(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors flex items-center gap-2 h-[42px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Consultar
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 flex gap-3"><AlertCircle className="text-red-600 w-5 h-5"/>{error}</div>
        )}

        {/* CONTAINER DO RELATÓRIO */}
        {data.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow border border-slate-300 overflow-x-auto">
            
            {/* TABELA 1: VENDAS */}
            <table className="w-full border-collapse text-[11px] sm:text-xs font-medium font-sans">
              <colgroup>
                <col className="w-12" /> {/* Estado */}
                <col className="w-16" /> {/* CFOP */}
                <col className="w-auto" /> {/* DESC */}
                <col className="w-28" /> {/* TRIB CONTRIB */}
                <col className="w-28" /> {/* TRIB NAO CONTRIB */}
                <col className="w-28" /> {/* ST CONTRIB */}
                <col className="w-28" /> {/* ST NAO CONTRIB */}
                <col className="w-32" /> {/* SOMA */}
              </colgroup>
              <thead>
                <tr>
                  <th colSpan={8} className="border border-slate-800 bg-white py-1.5 text-center text-sm font-bold uppercase tracking-wider">
                    Vendas - {mesAno}
                  </th>
                </tr>
                <tr className="bg-slate-50">
                  <th rowSpan={2} className="border border-slate-800 p-1"></th>
                  <th rowSpan={2} className="border border-slate-800 p-1 text-center font-bold">CFOP</th>
                  <th rowSpan={2} className="border border-slate-800 p-1 text-left font-bold">DESCRICAO CFOP</th>
                  <th colSpan={2} className="border border-slate-800 p-1 text-center font-bold bg-blue-50/50">TRIBUTADO (00)</th>
                  <th colSpan={2} className="border border-slate-800 p-1 text-center font-bold bg-amber-50/50">ST (10, 60)</th>
                  <th rowSpan={2} className="border border-slate-800 p-1 text-center font-bold bg-emerald-50/50">SOMA</th>
                </tr>
                <tr className="bg-slate-50 text-[10px]">
                  <th className="border border-slate-800 p-1 text-center font-bold bg-blue-50/50">CONTRIBUINTE</th>
                  <th className="border border-slate-800 p-1 text-center font-bold bg-blue-50/50">NÃO CONTRIB.</th>
                  <th className="border border-slate-800 p-1 text-center font-bold bg-amber-50/50">CONTRIBUINTE</th>
                  <th className="border border-slate-800 p-1 text-center font-bold bg-amber-50/50">NÃO CONTRIB.</th>
                </tr>
              </thead>
              <tbody>
                {vendas.length === 0 ? (
                  <tr><td colSpan={8} className="border border-slate-800 p-4 text-center text-slate-500">Sem dados de Venda</td></tr>
                ) : (
                  vendas.map((row, i) => {
                    const isFirstDentro = i === 0 && row.grupo === 'VENDA DENTRO ESTADO';
                    const isFirstFora = i === countVendaDentro && row.grupo === 'VENDA FORA DO ESTADO';

                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        {isFirstDentro && (
                          <td rowSpan={countVendaDentro} className="border border-slate-800 align-middle bg-white">
                            <div className="flex items-center justify-center h-full">
                              <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-[10px] font-bold whitespace-nowrap p-2">
                                DENTRO DO ESTADO
                              </span>
                            </div>
                          </td>
                        )}
                        {isFirstFora && (
                          <td rowSpan={countVendaFora} className="border border-slate-800 align-middle bg-white">
                             <div className="flex items-center justify-center h-full">
                              <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-[10px] font-bold whitespace-nowrap p-2">
                                FORA DO ESTADO
                              </span>
                            </div>
                          </td>
                        )}
                        <td className="border border-slate-800 px-2 py-1.5 text-center font-mono">{row.cfop}</td>
                        <td className="border border-slate-800 px-2 py-1.5 text-left uppercase truncate max-w-[200px]">{row.descricao}</td>
                        <td className="border border-slate-800 px-2 py-1.5 text-right tabular-nums"><FormatCurrencyExcel value={row.tribContrib} /></td>
                        <td className="border border-slate-800 px-2 py-1.5 text-right tabular-nums"><FormatCurrencyExcel value={row.tribNaoContrib} /></td>
                        <td className="border border-slate-800 px-2 py-1.5 text-right tabular-nums bg-amber-50/20"><FormatCurrencyExcel value={row.stContrib} /></td>
                        <td className="border border-slate-800 px-2 py-1.5 text-right tabular-nums bg-amber-50/20"><FormatCurrencyExcel value={row.stNaoContrib} /></td>
                        <td className="border border-slate-800 px-2 py-1.5 text-right tabular-nums font-bold bg-emerald-50/30"><FormatCurrencyExcel value={row.soma} /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {vendas.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100">
                    <td colSpan={3} className="border border-slate-800 px-2 py-2 text-right font-black uppercase tracking-wider">TOTAL</td>
                    <td className="border border-slate-800 px-2 py-2 text-right font-bold tabular-nums"><FormatCurrencyExcel value={totaisVendas.tribContrib} /></td>
                    <td className="border border-slate-800 px-2 py-2 text-right font-bold tabular-nums"><FormatCurrencyExcel value={totaisVendas.tribNaoContrib} /></td>
                    <td className="border border-slate-800 px-2 py-2 text-right font-bold tabular-nums"><FormatCurrencyExcel value={totaisVendas.stContrib} /></td>
                    <td className="border border-slate-800 px-2 py-2 text-right font-bold tabular-nums"><FormatCurrencyExcel value={totaisVendas.stNaoContrib} /></td>
                    <td className="border border-slate-800 px-2 py-2 text-right font-black tabular-nums bg-emerald-100/50"><FormatCurrencyExcel value={totaisVendas.soma} /></td>
                  </tr>
                </tfoot>
              )}
            </table>

            {/* ESPAÇAMENTO */}
            <div className="h-8"></div>

            {/* TABELA 2: DEVOLUÇÃO */}
            <table className="w-full border-collapse text-[11px] sm:text-xs font-medium font-sans">
              <colgroup>
                <col className="w-12" />
                <col className="w-16" />
                <col className="w-auto" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-32" />
              </colgroup>
              <thead>
                <tr>
                  <th colSpan={8} className="border border-slate-800 bg-white py-1.5 text-center text-sm font-bold uppercase tracking-wider">
                    Devolucoes - {mesAno}
                  </th>
                </tr>
                <tr className="bg-slate-50">
                  <th rowSpan={2} className="border border-slate-800 p-1"></th>
                  <th rowSpan={2} className="border border-slate-800 p-1 text-center font-bold">CFOP</th>
                  <th rowSpan={2} className="border border-slate-800 p-1 text-left font-bold">DESCRICAO CFOP</th>
                  <th colSpan={2} className="border border-slate-800 p-1 text-center font-bold bg-blue-50/50">TRIBUTADO (00)</th>
                  <th colSpan={2} className="border border-slate-800 p-1 text-center font-bold bg-amber-50/50">ST (10, 60)</th>
                  <th rowSpan={2} className="border border-slate-800 p-1 text-center font-bold bg-emerald-50/50">SOMA</th>
                </tr>
                <tr className="bg-slate-50 text-[10px]">
                  <th className="border border-slate-800 p-1 text-center font-bold bg-blue-50/50">CONTRIBUINTE</th>
                  <th className="border border-slate-800 p-1 text-center font-bold bg-blue-50/50">NÃO CONTRIB.</th>
                  <th className="border border-slate-800 p-1 text-center font-bold bg-amber-50/50">CONTRIBUINTE</th>
                  <th className="border border-slate-800 p-1 text-center font-bold bg-amber-50/50">NÃO CONTRIB.</th>
                </tr>
              </thead>
              <tbody>
                {devolucoes.length === 0 ? (
                  <tr><td colSpan={8} className="border border-slate-800 p-4 text-center text-slate-500">Sem dados de Devolução</td></tr>
                ) : (
                  devolucoes.map((row, i) => {
                    // Lógica espelhada para agrupar DENTRO (CFOP 1) e FORA (CFOP 2)
                    const isFirstDentro = i === 0 && row.grupo === 'DEVOLUCAO DENTRO ESTADO';
                    const isFirstFora = i === countDevDentro && row.grupo === 'DEVOLUCAO FORA ESTADO';

                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        {isFirstDentro && (
                          <td rowSpan={countDevDentro} className="border border-slate-800 align-middle bg-white">
                            <div className="flex items-center justify-center h-full">
                              <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-[10px] font-bold whitespace-nowrap p-2">
                                DENTRO DO ESTADO
                              </span>
                            </div>
                          </td>
                        )}
                        {isFirstFora && (
                          <td rowSpan={countDevFora} className="border border-slate-800 align-middle bg-white">
                             <div className="flex items-center justify-center h-full">
                              <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-[10px] font-bold whitespace-nowrap p-2">
                                FORA DO ESTADO
                              </span>
                            </div>
                          </td>
                        )}
                        <td className="border border-slate-800 px-2 py-1.5 text-center font-mono">{row.cfop}</td>
                        <td className="border border-slate-800 px-2 py-1.5 text-left uppercase truncate max-w-[200px]">{row.descricao}</td>
                        <td className="border border-slate-800 px-2 py-1.5 text-right tabular-nums"><FormatCurrencyExcel value={row.tribContrib} /></td>
                        <td className="border border-slate-800 px-2 py-1.5 text-right tabular-nums"><FormatCurrencyExcel value={row.tribNaoContrib} /></td>
                        <td className="border border-slate-800 px-2 py-1.5 text-right tabular-nums bg-amber-50/20"><FormatCurrencyExcel value={row.stContrib} /></td>
                        <td className="border border-slate-800 px-2 py-1.5 text-right tabular-nums bg-amber-50/20"><FormatCurrencyExcel value={row.stNaoContrib} /></td>
                        <td className="border border-slate-800 px-2 py-1.5 text-right tabular-nums font-bold bg-emerald-50/30"><FormatCurrencyExcel value={row.soma} /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {devolucoes.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100">
                    <td colSpan={3} className="border border-slate-800 px-2 py-2 text-right font-black uppercase tracking-wider">TOTAL</td>
                    <td className="border border-slate-800 px-2 py-2 text-right font-bold tabular-nums"><FormatCurrencyExcel value={totaisDevolucoes.tribContrib} /></td>
                    <td className="border border-slate-800 px-2 py-2 text-right font-bold tabular-nums"><FormatCurrencyExcel value={totaisDevolucoes.tribNaoContrib} /></td>
                    <td className="border border-slate-800 px-2 py-2 text-right font-bold tabular-nums"><FormatCurrencyExcel value={totaisDevolucoes.stContrib} /></td>
                    <td className="border border-slate-800 px-2 py-2 text-right font-bold tabular-nums"><FormatCurrencyExcel value={totaisDevolucoes.stNaoContrib} /></td>
                    <td className="border border-slate-800 px-2 py-2 text-right font-black tabular-nums bg-emerald-100/50"><FormatCurrencyExcel value={totaisDevolucoes.soma} /></td>
                  </tr>
                </tfoot>
              )}
            </table>

          </div>
        )}

      </div>
    </div>
  );
}