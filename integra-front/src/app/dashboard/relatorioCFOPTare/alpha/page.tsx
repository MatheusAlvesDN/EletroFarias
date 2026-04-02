'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, AlertCircle, Database, Receipt, Eye, X, FileCode2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface NotaEntrada {
  NUNOTA: number;
  NUMNOTA: number;
  DTENTSAI: string;
  NOMEPARC: string;
  UF: string;
  CFOP: string | number;
  ALIQICMS: number;
  VLR_TRIBUTADO: number;
  VLR_ST_CLASSIFICADO: number;
  ICMS: number;
  VLRNOTA: number;
  NCM: string;
  XML?: string; 
}

const FormatCurrency = ({ value }: { value: number }) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function PaginaLaboratorioEntradas() {
  const [codEmp, setCodEmp] = useState('1');
  const [dtIni, setDtIni] = useState('');
  const [dtFim, setDtFim] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notas, setNotas] = useState<NotaEntrada[]>([]);
  const [tabelaNcm, setTabelaNcm] = useState<Record<string, any>>({});

  // Estados para o Modal de XML
  const [dlgOpen, setDlgOpen] = useState(false);
  const [selectedXml, setSelectedXml] = useState('');
  const [selectedXmlTitle, setSelectedXmlTitle] = useState('');

  // Estado de Ordenação da Tabela Raio-X
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // 1. CARREGAR NCMS E NORMALIZAR CHAVES
  useEffect(() => {
    const fetchNcms = async () => {
      try {
        const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
        const res = await fetch(`${API_BASE}/prisma/getAllNcm`);
        if (res.ok) {
          const dadosNcm = await res.json();
          const map: Record<string, any> = {};
          
          dadosNcm.forEach((item: any) => {
            // Remove pontos do NCM do banco (Ex: 8311.10.00 -> 83111000)
            const ncmLimpo = String(item.ncm).replace(/\./g, '').trim();
            map[ncmLimpo] = {
              mva4: Number(item.mva4) || 0,
              mva7: Number(item.mva7) || 0,
              mva12: Number(item.mva12) || 0,
            };
          });
          setTabelaNcm(map);
        }
      } catch (err) { console.error('Erro ao carregar NCMs:', err); }
    };

    const hoje = new Date();
    setDtIni(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]);
    setDtFim(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0]);
    fetchNcms();
  }, []);

  const buscarDados = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
      const qs = new URLSearchParams({ codEmp, dtIni, dtFim }).toString();
      const res = await fetch(`${API_BASE}/sankhya/notas-entradas?${qs}`);
      if (!res.ok) throw new Error('Falha ao buscar as notas do servidor.');
      const dados = await res.json();
      setNotas(Array.isArray(dados) ? dados : Array.isArray(dados?.data) ? dados.data : []);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const openXml = (nota: NotaEntrada) => {
    if (!nota.XML) {
      alert("Conteúdo XML não encontrado para esta nota.");
      return;
    }
    setSelectedXmlTitle(`Nota: ${nota.NUMNOTA} - ${nota.NOMEPARC}`);
    setSelectedXml(nota.XML);
    setDlgOpen(true);
  };

  // --- LÓGICA DE CÁLCULO ---
  const resumo = useMemo(() => {
    const pb = { origem: 'Dentro do Estado (PB)', baseTrib: 0, baseSt: 0, credIcms: 0, impTrib: 0, impSt: 0, impTotal: 0 };
    const nne = { origem: 'Fora (Norte/Nordeste/CO)', baseTrib: 0, baseSt: 0, credIcms: 0, impTrib: 0, impSt: 0, impTotal: 0 };
    const sul = { origem: 'Fora (Sul/Sudeste)', baseTrib: 0, baseSt: 0, credIcms: 0, impTrib: 0, impSt: 0, impTotal: 0 };

    const estadosSulSudeste = ['PR', 'RS', 'SC', 'ES', 'MG', 'RJ', 'SP'];
    const cfopsValidos = ['1102', '2102', '1403', '2403'];
    const detalhesCalculo: any[] = [];

    notas.forEach((nota) => {
      const cfopStr = String(nota.CFOP || '').trim();
      if (!cfopsValidos.includes(cfopStr)) return;

      const uf = String(nota.UF || '').trim().toUpperCase();
      const baseTrib = Number(nota.VLR_TRIBUTADO) || 0;
      const baseSt = Number(nota.VLR_ST_CLASSIFICADO) || 0;
      const icmsLivro = Number(nota.ICMS) || 0;
      const pIcms = Number(nota.ALIQICMS) || 0;
      
      // NORMALIZAR NCM DA NOTA PARA BUSCA
      const ncmNota = String(nota.NCM || '').replace(/\./g, '').trim();

      const totalBase = baseTrib + baseSt;
      const impTrib = totalBase > 0 ? icmsLivro * (baseTrib / totalBase) : icmsLivro;
      
      let impSt = 0;
      let mvaAplicado = 0;

      if (uf === 'PB') {
        impSt = 0;
      } else {
        if (ncmNota && tabelaNcm[ncmNota]) {
          const dadosNcm = tabelaNcm[ncmNota];
          if (pIcms === 4) mvaAplicado = dadosNcm.mva4;
          else if (pIcms === 7) mvaAplicado = dadosNcm.mva7;
          else mvaAplicado = dadosNcm.mva12;
        }

        if (baseSt > 0) {
          if (mvaAplicado > 0) {
            // FÓRMULA DE CÁLCULO
            impSt = (baseSt * ((100 + mvaAplicado) / 100)) * 0.05;
          } else {
            impSt = baseSt * 0.05;
          }
        }
      }

      let target = uf === 'PB' ? pb : (estadosSulSudeste.includes(uf) ? sul : nne);
      target.baseTrib += baseTrib;
      target.baseSt += baseSt;
      target.impTrib += impTrib;
      target.impSt += impSt;
      target.impTotal += (impTrib + impSt);

      // Calculamos o valor numérico da taxa efetiva para facilitar a ordenação
      const taxaEfetivaNum = baseSt > 0 ? (impSt / baseSt) * 100 : 0;

      detalhesCalculo.push({ 
        ...nota, 
        mva: mvaAplicado, 
        impStCalc: impSt, 
        uf,
        taxaEfetivaNum 
      });
    });

    return { 
      linhas: [pb, nne, sul], 
      detalhes: detalhesCalculo,
      totalGeral: {
        baseTrib: pb.baseTrib + nne.baseTrib + sul.baseTrib,
        baseSt: pb.baseSt + nne.baseSt + sul.baseSt,
        impTrib: pb.impTrib + nne.impTrib + sul.impTrib,
        impSt: pb.impSt + nne.impSt + sul.impSt,
        impTotal: pb.impTotal + nne.impTotal + sul.impTotal,
      }
    };
  }, [notas, tabelaNcm]);

  // Função de Ordenação
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Dados Ordenados do Raio-X
  const sortedDetalhes = useMemo(() => {
    // Filtramos primeiro (mesma regra de antes)
    let sortableItems = [...resumo.detalhes.filter(d => d.VLR_ST_CLASSIFICADO > 0 && d.uf !== 'PB')];
    
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Normalizar strings para não diferenciar maiúsculas/minúsculas
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [resumo.detalhes, sortConfig]);

  // Componente do Ícone de Ordenação
  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) {
      return <ChevronsUpDown className="w-3 h-3 ml-1 inline text-slate-300" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-3 h-3 ml-1 inline text-emerald-600" />
    ) : (
      <ChevronDown className="w-3 h-3 ml-1 inline text-emerald-600" />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        <header className="bg-emerald-700 text-white p-6 rounded-2xl shadow-md flex items-center gap-4">
          <Database className="w-8 h-8 text-emerald-200" />
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight">Entradas</h1>
            <p className="text-sm text-emerald-100 opacity-80 font-medium">Teste isolado do cálculo de NCM e MVA</p>
          </div>
        </header>

        <form onSubmit={buscarDados} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Empresa</label>
            <input type="number" value={codEmp} onChange={e => setCodEmp(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Data Inicial</label>
            <input type="date" value={dtIni} onChange={e => setDtIni(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Data Final</label>
            <input type="date" value={dtFim} onChange={e => setDtFim(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
          </div>
          <button type="submit" disabled={loading} className="bg-emerald-600 text-white px-10 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm active:scale-95">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Consultar
          </button>
        </form>

        {notas.length > 0 && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-emerald-50/50 p-4 border-b border-emerald-100">
                <h2 className="font-black text-emerald-900 uppercase text-xs tracking-widest">Resumo Calculado</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b">
                    <tr>
                      <th className="p-4 text-left">Origem</th>
                      <th className="p-4">Base Trib.</th>
                      <th className="p-4">Base ST</th>
                      <th className="p-4">Imp. Trib</th>
                      <th className="p-4 text-emerald-700 font-black">Imp. ST (Calculado)</th>
                      <th className="p-4">Imp. Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                    {resumo.linhas.map((linha, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-left font-bold text-slate-800">{linha.origem}</td>
                        <td className="p-4"><FormatCurrency value={linha.baseTrib} /></td>
                        <td className="p-4"><FormatCurrency value={linha.baseSt} /></td>
                        <td className="p-4"><FormatCurrency value={linha.impTrib} /></td>
                        <td className="p-4 font-black text-emerald-700 bg-emerald-50/30"><FormatCurrency value={linha.impSt} /></td>
                        <td className="p-4 font-bold text-slate-900"><FormatCurrency value={linha.impTotal} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-200">
                    <tr>
                      <td className="p-4 text-left uppercase">Total Geral</td>
                      <td className="p-4"><FormatCurrency value={resumo.totalGeral.baseTrib} /></td>
                      <td className="p-4"><FormatCurrency value={resumo.totalGeral.baseSt} /></td>
                      <td className="p-4"><FormatCurrency value={resumo.totalGeral.impTrib} /></td>
                      <td className="p-4 text-emerald-700"><FormatCurrency value={resumo.totalGeral.impSt} /></td>
                      <td className="p-4"><FormatCurrency value={resumo.totalGeral.impTotal} /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
                <h2 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-widest">
                  <Receipt className="w-4 h-4 text-emerald-400"/> Raio-X do Cálculo ST (Linha a Linha)
                </h2>
                <div className="text-[10px] text-slate-400 font-medium">Apenas linhas com Base ST &gt; 0 e Fora da PB</div>
              </div>
              <div className="overflow-x-auto max-h-[600px] custom-table-scroll">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-slate-100 text-slate-500 sticky top-0 z-10 shadow-sm uppercase font-bold text-[10px] select-none">
                    <tr>
                      <th className="p-3 text-left cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => requestSort('NUMNOTA')}>
                        Nº Nota <SortIcon columnKey="NUMNOTA" />
                      </th>
                      <th className="p-3 text-left cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => requestSort('NOMEPARC')}>
                        Parceiro <SortIcon columnKey="NOMEPARC" />
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => requestSort('uf')}>
                        UF <SortIcon columnKey="uf" />
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => requestSort('CFOP')}>
                        CFOP <SortIcon columnKey="CFOP" />
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => requestSort('NCM')}>
                        NCM <SortIcon columnKey="NCM" />
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => requestSort('ALIQICMS')}>
                        ALIQ ICMS <SortIcon columnKey="ALIQICMS" />
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => requestSort('mva')}>
                        MVA ENC. <SortIcon columnKey="mva" />
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-200 transition-colors group" onClick={() => requestSort('VLR_ST_CLASSIFICADO')}>
                        Base ST <SortIcon columnKey="VLR_ST_CLASSIFICADO" />
                      </th>
                      <th className="p-3 text-emerald-700 cursor-pointer hover:bg-emerald-100 transition-colors group" onClick={() => requestSort('impStCalc')}>
                        Imp. ST Gerado <SortIcon columnKey="impStCalc" />
                      </th>
                      <th className="p-3 text-center text-emerald-700 cursor-pointer hover:bg-emerald-100 transition-colors group" onClick={() => requestSort('taxaEfetivaNum')}>
                        Taxa Efetiva (%) <SortIcon columnKey="taxaEfetivaNum" />
                      </th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedDetalhes.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50 group transition-colors">
                        <td className="p-3 text-left font-mono font-bold text-slate-900">{d.NUMNOTA}</td>
                        <td className="p-3 text-left truncate max-w-[200px] text-slate-600" title={d.NOMEPARC}>{d.NOMEPARC}</td>
                        <td className="p-3 text-center font-bold">{d.uf}</td>
                        <td className="p-3 text-center text-slate-400 font-medium">{d.CFOP}</td>
                        <td className="p-3 text-center font-bold text-indigo-600 bg-indigo-50/20">{d.NCM || 'S/ NCM'}</td>
                        <td className="p-3 text-center font-bold text-slate-500">{d.ALIQICMS}%</td>
                        <td className="p-3 text-center font-bold">
                          {d.mva > 0 ? (
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{d.mva}%</span>
                          ) : (
                            <span className="text-slate-400 italic">Não achou (Usa 5%)</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500 font-medium"><FormatCurrency value={d.VLR_ST_CLASSIFICADO} /></td>
                        <td className="p-3 font-black text-emerald-700 bg-emerald-50/50"><FormatCurrency value={d.impStCalc} /></td>
                        
                        <td className="p-3 text-center font-bold text-emerald-600 bg-emerald-50/30">
                          {d.taxaEfetivaNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                        </td>

                        <td className="p-3 text-center">
                          <button 
                            onClick={() => openXml(d)}
                            className={`p-1.5 rounded-lg transition-all ${d.XML ? 'text-emerald-600 hover:bg-emerald-100' : 'text-slate-200 cursor-not-allowed'}`}
                            disabled={!d.XML}
                            title={d.XML ? "Ver XML" : "Sem XML"}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sortedDetalhes.length === 0 && (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-400 italic">
                          Nenhuma nota Fora da PB com Base ST encontrada neste período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL XML */}
      {dlgOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center shrink-0">
              <h2 className="text-sm font-black text-slate-700 truncate flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-emerald-600" /> {selectedXmlTitle}
              </h2>
              <button onClick={() => setDlgOpen(false)} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-auto bg-[#1e1e1e] p-6">
              <pre className="text-emerald-400 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">
                {selectedXml}
              </pre>
            </div>
            <div className="bg-slate-50 p-4 border-t flex justify-end gap-3">
               <button onClick={() => setDlgOpen(false)} className="px-8 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs transition-all shadow-sm">Fechar</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-table-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-table-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-table-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}