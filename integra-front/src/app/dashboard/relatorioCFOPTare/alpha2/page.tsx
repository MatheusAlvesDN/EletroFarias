'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Database, Receipt, Eye, X, FileCode2, FileText, ScrollText, Calculator } from 'lucide-react';

interface NotaEntrada {
  NUNOTA: number;
  NUMNOTA: number;
  DTENTSAI: string;
  DTNEG: string;
  NOMEPARC: string;
  UF: string;
  CFOP: string | number;
  NCM: string;
  VALORCONTABIL: number;
  VLR_TRIBUTADO: number;
  VLR_ST_CLASSIFICADO: number;
  VLRNOTA: number;
  XML?: string;
}

const FormatCurrency = ({ value }: { value: number }) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

export default function PaginaLaboratorioEntradas() {
  const [codEmp, setCodEmp] = useState('1');
  const [dtIni, setDtIni] = useState('');
  const [dtFim, setDtFim] = useState('');
  const [aplicarMvaAjustada, setAplicarMvaAjustada] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notas, setNotas] = useState<NotaEntrada[]>([]);
  const [tabelaNcm, setTabelaNcm] = useState<Record<string, any>>({});

  const [activeTab, setActiveTab] = useState<'resumo' | '1154' | '1106'>('resumo');

  const [dlgOpen, setDlgOpen] = useState(false);
  const [selectedXml, setSelectedXml] = useState('');
  const [selectedXmlTitle, setSelectedXmlTitle] = useState('');

  useEffect(() => {
    const fetchNcms = async () => {
      try {
        const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
        const res = await fetch(`${API_BASE}/prisma/getAllNcm`);
        if (res.ok) {
          const dadosNcm = await res.json();
          const map: Record<string, any> = {};

          dadosNcm.forEach((item: any) => {
            const ncmLimpo = String(item.ncm).replace(/\./g, '').trim();
            // Focamos na MVA de 12% como base para a maioria das operações interestaduais
            map[ncmLimpo] = {
              mva12: Number(item.mva12) || 0,
            };
          });
          setTabelaNcm(map);
        }
      } catch (err) { console.error('Erro ao carregar NCMs:', err); }
    };

    const hoje = new Date();
    // Inicia com o primeiro e último dia do mês atual
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

  // --- MOTOR CONTÁBIL: MVA AJUSTADA ---
  const calcularMVA = (mvaOriginal: number, ufOrigem: string) => {
    if (!aplicarMvaAjustada || mvaOriginal === 0) return mvaOriginal;

    // Alíquota Interestadual: 7% para Sul/Sudeste (exceto ES), 12% para o resto
    const estados7 = ['RS', 'SC', 'PR', 'SP', 'MG', 'RJ'];
    const aliqInter = estados7.includes(ufOrigem.toUpperCase()) ? 0.07 : 0.12;
    const aliqIntra = 0.20; // Alíquota interna padrão da Paraíba (Atualizada)

    // Fórmula SEFAZ: MVA Ajustada = { [(1 + MVA_Original) * (1 - ALIQ_Inter) / (1 - ALIQ_Intra)] - 1 } * 100
    const fatorOriginal = 1 + (mvaOriginal / 100);
    const fatorInter = 1 - aliqInter;
    const fatorIntra = 1 - aliqIntra;

    const mvaAjustada = ((fatorOriginal * fatorInter) / fatorIntra) - 1;
    return mvaAjustada * 100;
  };

  const relatorio = useMemo(() => {
    const guia1154: any[] = [];
    const guia1106: any[] = [];

    let totalGuia1154 = 0;
    let totalGuia1106 = 0;

    notas.forEach((nota) => {
      const baseTrib = Number(nota.VLR_TRIBUTADO) || 0;
      const baseSt = Number(nota.VLR_ST_CLASSIFICADO) || 0;
      const ncmNota = String(nota.NCM || '').replace(/\./g, '').trim();
      const ufOrigem = nota.UF || '';

      let mvaBanco = 0;
      if (ncmNota && tabelaNcm[ncmNota]) {
        mvaBanco = tabelaNcm[ncmNota].mva12;
      }

      let mvaFinal = calcularMVA(mvaBanco, ufOrigem);

      // --- 1. RECEITA 1154 (FRONTEIRA NORMAL - 3%) ---
      if (baseTrib > 0) {
        const impFronteira = baseTrib * 0.03;
        totalGuia1154 += impFronteira;
        guia1154.push({
          ...nota,
          baseFronteira: baseTrib,
          imposto: impFronteira
        });
      }

      // --- 2. RECEITA 1106 (ST ENTRADAS - 5%) ---
      if (baseSt > 0) {
        const baseStComMva = mvaFinal > 0 ? baseSt * ((100 + mvaFinal) / 100) : baseSt;
        const impSt = baseStComMva * 0.05;
        totalGuia1106 += impSt;
        guia1106.push({
          ...nota,
          mva: mvaFinal,
          baseStSemMva: baseSt,
          baseStComMva: baseStComMva,
          imposto: impSt
        });
      }
    });

    return {
      guia1154,
      guia1106,
      totais: {
        rec1154: totalGuia1154,
        rec1106: totalGuia1106,
        geral: totalGuia1154 + totalGuia1106
      }
    };
  }, [notas, tabelaNcm, aplicarMvaAjustada]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex items-center justify-between border-b-4 border-emerald-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
              <ScrollText className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-widest text-slate-50">Auditoria SEFAZ/PB</h1>
              <p className="text-sm text-slate-400 font-medium">Reconciliação de Entradas com MVA Ajustada</p>
            </div>
          </div>
        </header>

        {/* FORMULÁRIO DE FILTRO */}
        <form onSubmit={buscarDados} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Empresa</label>
            <input type="number" value={codEmp} onChange={e => setCodEmp(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-slate-700" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Chegada Inicial</label>
            <input type="date" value={dtIni} onChange={e => setDtIni(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-slate-700" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Chegada Final</label>
            <input type="date" value={dtFim} onChange={e => setDtFim(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-slate-700" />
          </div>

          <div
            className="flex items-center gap-2 bg-amber-50 p-2.5 rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
            onClick={() => setAplicarMvaAjustada(!aplicarMvaAjustada)}
          >
            <input type="checkbox" checked={aplicarMvaAjustada} onChange={() => { }} className="w-4 h-4 accent-amber-600 cursor-pointer" />
            <span className="text-xs font-bold text-amber-800 flex items-center gap-1 select-none">
              <Calculator className="w-3 h-3" /> Aplicar MVA Ajustada (SEFAZ)
            </span>
          </div>

          <button type="submit" disabled={loading} className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-md active:scale-95">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Consultar Guias
          </button>
        </form>

        {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 font-bold shadow-sm">{error}</div>}

        {notas.length > 0 && (
          <div className="space-y-4">

            {/* TABS (NAVEGAÇÃO) */}
            <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
              <button
                onClick={() => setActiveTab('resumo')}
                className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'resumo' ? 'bg-slate-800 text-white shadow-md' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}
              >
                Capa das Guias
              </button>
              <button
                onClick={() => setActiveTab('1154')}
                className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === '1154' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}
              >
                Anexo I - Receita 1154 (Fronteira 3%)
              </button>
              <button
                onClick={() => setActiveTab('1106')}
                className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === '1106' ? 'bg-emerald-600 text-white shadow-md' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}
              >
                Anexo II - Receita 1106 (ST 5%)
              </button>
            </div>

            {/* ABA: RESUMO (CAPA) */}
            {activeTab === 'resumo' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 text-center flex flex-col justify-center items-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">ICMS-Normal Fronteira</h3>
                  <div className="text-4xl font-black text-blue-600 mb-2"><FormatCurrency value={relatorio.totais.rec1154} /></div>
                  <p className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Receita: 1154 • {relatorio.guia1154.length} Notas Mapeadas</p>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 text-center flex flex-col justify-center items-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">ICMS-Substituição Entradas</h3>
                  <div className="text-4xl font-black text-emerald-600 mb-2"><FormatCurrency value={relatorio.totais.rec1106} /></div>
                  <p className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Receita: 1106 • {relatorio.guia1106.length} Notas Mapeadas</p>
                </div>
              </div>
            )}

            {/* ABA: RECEITA 1154 */}
            {activeTab === '1154' && (
              <div className="bg-white rounded-2xl shadow-sm border border-blue-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-blue-50/50 p-5 border-b border-blue-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <h2 className="font-black text-blue-900 uppercase text-sm tracking-widest flex items-center gap-2">
                      <FileText className="w-5 h-5" /> Extrato Demonstrativo - Receita 1154
                    </h2>
                    <p className="text-xs font-medium text-blue-700/70 mt-1">Imposto calculado a 3% sobre a Base de Cálculo Normal</p>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-xl border border-blue-200 shadow-sm flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL A RECOLHER:</span>
                    <span className="text-lg font-black text-blue-700"><FormatCurrency value={relatorio.totais.rec1154} /></span>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[600px] custom-table-scroll">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm uppercase font-bold text-[10px]">
                      <tr>
                        <th className="p-4 text-left">Nota Fiscal</th>
                        <th className="p-4 text-center border-l">Data Chegada</th>
                        <th className="p-4 text-left border-l">Nome Empresarial</th>
                        <th className="p-4 text-center border-l">UF</th>
                        <th className="p-4 border-l">Total BC (Base)</th>
                        <th className="p-4 font-black text-blue-700 border-l bg-blue-50/50">Total ICMS (3%)</th>
                        <th className="p-4 text-center border-l">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {relatorio.guia1154.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-4 text-left font-mono font-bold text-slate-900">
                            {d.NUMNOTA}
                            <div className="text-[9px] text-slate-400 mt-1">Emissão: {d.DTNEG}</div>
                          </td>
                          <td className="p-4 text-center font-bold text-slate-700 border-l">{d.DTENTSAI}</td>
                          <td className="p-4 text-left truncate max-w-[200px] text-slate-700 border-l" title={d.NOMEPARC}>{d.NOMEPARC}</td>
                          <td className="p-4 text-center font-bold text-slate-800 border-l">{d.UF}</td>
                          <td className="p-4 text-slate-600 border-l"><FormatCurrency value={d.baseFronteira} /></td>
                          <td className="p-4 font-black text-blue-700 bg-blue-50/20 border-l"><FormatCurrency value={d.imposto} /></td>
                          <td className="p-4 text-center border-l">
                            <button onClick={() => openXml(d)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Ver XML">
                              <Eye className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {relatorio.guia1154.length === 0 && (
                        <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-bold">Nenhuma nota para a Guia 1154 neste período.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA: RECEITA 1106 */}
            {activeTab === '1106' && (
              <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-emerald-50/50 p-5 border-b border-emerald-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <h2 className="font-black text-emerald-900 uppercase text-sm tracking-widest flex items-center gap-2">
                      <Receipt className="w-5 h-5" /> Extrato Demonstrativo - Receita 1106
                    </h2>
                    <p className="text-xs font-medium text-emerald-700/70 mt-1">Imposto calculado a exatos 5% sobre a Base ST (já com MVA embutida)</p>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-xl border border-emerald-200 shadow-sm flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL A RECOLHER:</span>
                    <span className="text-lg font-black text-emerald-700"><FormatCurrency value={relatorio.totais.rec1106} /></span>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[600px] custom-table-scroll">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm uppercase font-bold text-[10px]">
                      <tr>
                        <th className="p-4 text-left">Nota Fiscal</th>
                        <th className="p-4 text-center border-l">Data Chegada</th>
                        <th className="p-4 text-left border-l">Nome Empresarial</th>
                        <th className="p-4 text-center border-l">NCM (Sankhya)</th>
                        <th className="p-4 border-l">Base ST (Sem MVA)</th>
                        <th className="p-4 border-l">Total BC (Com MVA)</th>
                        <th className="p-4 font-black text-emerald-700 border-l bg-emerald-50/50">Total ICMS (5%)</th>
                        <th className="p-4 text-center border-l">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {relatorio.guia1106.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-4 text-left font-mono font-bold text-slate-900">
                            {d.NUMNOTA}
                            <div className="text-[9px] text-slate-400 mt-1">Emissão: {d.DTNEG}</div>
                          </td>
                          <td className="p-4 text-center font-bold text-slate-700 border-l">{d.DTENTSAI}</td>
                          <td className="p-4 text-left truncate max-w-[150px] text-slate-700 border-l" title={d.NOMEPARC}>{d.NOMEPARC}</td>

                          <td className="p-4 text-center border-l">
                            <div className="font-mono text-slate-500">{d.NCM || '-'}</div>
                            {d.mva > 0 && <div className="text-[9px] text-amber-600 bg-amber-50 mt-1 rounded inline-block px-1.5 py-0.5 border border-amber-200 font-bold">MVA {d.mva.toFixed(2)}%</div>}
                          </td>

                          <td className="p-4 text-slate-400 border-l"><FormatCurrency value={d.baseStSemMva} /></td>
                          <td className="p-4 text-slate-800 font-bold border-l"><FormatCurrency value={d.baseStComMva} /></td>
                          <td className="p-4 font-black text-emerald-700 bg-emerald-50/20 border-l"><FormatCurrency value={d.imposto} /></td>
                          <td className="p-4 text-center border-l">
                            <button onClick={() => openXml(d)} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Ver XML">
                              <Eye className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {relatorio.guia1106.length === 0 && (
                        <tr><td colSpan={8} className="p-8 text-center text-slate-400 font-bold">Nenhuma nota para a Guia 1106 neste período.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL XML */}
      {dlgOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
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