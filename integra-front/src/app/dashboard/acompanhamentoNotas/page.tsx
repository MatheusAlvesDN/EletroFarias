'use client';
import DashboardLayout from '@/components/DashboardLayout';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Calendar,
  Loader2,
  AlertCircle,
  Menu,
  CheckCircle2,
  X,
  TableProperties,
  FileText
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

// --- Tipagens ---
interface NotaMes {
  NUNOTA: number;
  NUMNOTA: number;
  CODTIPOPER: number;
  DTNEG: string;
  CODPARC: number;
  NOMEPARC: string;
  UF: string;
  CFOP: string | number;
  DESCRCFO: string;
  VLRNOTA: number;
  CHAVE_ACESSO: string;
}

interface RowConfig {
  label: string;
  tops: number[];
  isFallback?: boolean;
  fallbackType?: 'entrada' | 'saida';
  isDevolucao?: boolean;
}

// --- Configurações das Tabelas baseadas no Excel ---
const CONFIG_DFARIAS_COMPRA: RowConfig[] = [
  { label: 'MATERIA PRIMA (93)', tops: [93] },
  { label: 'CONSUMO (396)', tops: [396] },
  { label: 'REVENDA (425 e 416)', tops: [425, 416] },
  { label: 'OUTRAS ENTRADAS', tops: [], isFallback: true, fallbackType: 'entrada' },
  { label: 'DEVOLUCOES (424)', tops: [424], isDevolucao: true },
];

const CONFIG_ELETRO_COMPRA: RowConfig[] = [
  { label: 'CONSUMO (301)', tops: [301] },
  { label: 'REVENDA (344 e 300)', tops: [344, 300] },
  { label: 'OUTRAS ENTRADAS', tops: [], isFallback: true, fallbackType: 'entrada' },
  { label: 'DEVOLUCOES', tops: [], isDevolucao: true }, // Preencha com os TOPs de devolução
];

const CONFIG_DFARIAS_VENDA: RowConfig[] = [
  { label: 'INDUSTRIALIZACAO (714 e 289)', tops: [714, 289] },
  { label: 'REVENDA (420, 412)', tops: [420, 412] },
  { label: 'OUTRAS SAIDA (278)', tops: [278] },
  { label: 'DEVOLUCOES (421)', tops: [421], isDevolucao: true },
];

const CONFIG_ELETRO_VENDA: RowConfig[] = [
  { label: 'CONSUMO', tops: [] }, // Preencha com os TOPs de consumo
  { label: 'REVENDA (700, 299, 383, 326)', tops: [700, 299, 383, 326] },
  { label: 'REVENDA TRIAG. (417)', tops: [417] },
  { label: 'DEVOLUCOES (800 e 801)', tops: [800, 801], isDevolucao: true },
];

// --- Funções Auxiliares ---
const FormatCurrency = ({ value }: { value: number }) => {
  if (!value || value === 0) return <span className="text-slate-400 font-medium">R$ -</span>;
  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const isNegative = value < 0;
  return <span className={`font-medium ${isNegative ? 'text-rose-600' : 'text-slate-700'}`}>{formatted}</span>;
};

const formatDateBr = (dateStr?: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR');
};

// --- Motor de Cálculo do Relatório ---
const buildTableData = (data: NotaMes[], config: RowConfig[]) => {
  // Mapeia todos os TOPs explícitos para usar na regra de fallback (Outras Entradas/Saídas)
  const mappedTops = new Set<number>();
  config.forEach(c => {
    if (c.tops) {
      c.tops.forEach(t => mappedTops.add(t));
    }
  });

  return config.map(rowConfig => {
    // 1. Primeiro, isolamos APENAS as notas que pertencem a esta linha específica
    const notasFiltradasDaLinha: NotaMes[] = [];

    data.forEach(nota => {
      const top = Number(nota.CODTIPOPER);
      const cfopPrefix = String(nota.CFOP || '').charAt(0);
      let match = false;

      // Regra de Match Estrita
      if (rowConfig.tops && rowConfig.tops.length > 0) {
        if (rowConfig.tops.includes(top)) {
          match = true;
        }
      } else if (rowConfig.isFallback) {
        // Se for fallback (Outras Entradas/Saídas), só entra se o TOP não estiver nas outras linhas
        if (!mappedTops.has(top)) {
          if (rowConfig.fallbackType === 'entrada' && ['1', '2', '3'].includes(cfopPrefix)) {
            match = true;
          } else if (rowConfig.fallbackType === 'saida' && ['5', '6', '7'].includes(cfopPrefix)) {
            match = true;
          }
        }
      }

      // Se a nota pertence a esta linha, jogamos no array
      if (match) {
        notasFiltradasDaLinha.push({ ...nota });
      }
    });

    // 2. Agora, calculamos os totais baseados EXCLUSIVAMENTE nas notas filtradas
    let dentro = 0;
    let fora = 0;

    const notasFinaisTratadas = notasFiltradasDaLinha.map(n => {
      let valor = Number(n.VLRNOTA) || 0;
      
      // Se for devolução, o valor fica negativo para bater com o cálculo
      if (rowConfig.isDevolucao) {
        valor = -Math.abs(valor);
      }

      // Identifica vendas para dentro ou fora do estado (PB)
      const isPB = n.UF?.toUpperCase() === 'PB';
      if (isPB) {
        dentro += valor;
      } else {
        fora += valor;
      }

      // Atualiza a nota com o valor final tratado para o Modal exibir perfeitamente
      return { ...n, VLRNOTA: valor };
    });

    return {
      label: rowConfig.label,
      isDevolucao: rowConfig.isDevolucao,
      dentro,
      fora,
      total: dentro + fora,
      notas: notasFinaisTratadas // <-- O Modal vai receber estritamente isso aqui
    };
  });
};

// --- Componente da Tabela do Relatório ---
const ReportBlock = ({ 
  title, 
  rows, 
  onRowClick 
}: { 
  title: string, 
  rows: any[],
  onRowClick: (label: string, notas: NotaMes[]) => void
}) => {
  const totalDentro = rows.reduce((acc, r) => acc + r.dentro, 0);
  const totalFora = rows.reduce((acc, r) => acc + r.fora, 0);
  const totalGeral = totalDentro + totalFora;

  return (
    <div className="border border-slate-300 rounded bg-white shadow-sm flex flex-col h-full overflow-hidden">
      <div className="text-center font-bold text-xs sm:text-sm py-2.5 border-b border-slate-300 uppercase tracking-widest bg-slate-50 text-slate-800 shrink-0">
        {title}
      </div>
      
      <div className="flex-1 flex flex-col overflow-x-auto">
        <div className="min-w-[500px] flex-1 flex flex-col">
          <table className="w-full text-xs text-left whitespace-nowrap table-fixed">
            <thead className="border-b border-slate-300 bg-slate-100/50">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-300 uppercase font-bold text-slate-600 w-[40%]">Natureza</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-right uppercase font-bold text-slate-600 w-[20%]">Fora do Estado</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-right uppercase font-bold text-slate-600 w-[20%]">Dentro do Estado</th>
                <th className="py-2.5 px-3 text-right uppercase font-bold text-slate-600 w-[20%]">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr 
                  key={i} 
                  onClick={(e) => {
                    e.stopPropagation(); // Evita que o clique vaze para o container pai
                    onRowClick(`${title} - ${r.label}`, r.notas);
                  }}
                  className={`border-b border-slate-200 cursor-pointer transition-colors ${r.isDevolucao ? 'hover:bg-rose-50' : 'hover:bg-emerald-50'}`}
                  title="Clique para ver os detalhes apenas desta linha"
                >
                  <td className={`py-2 px-3 border-r border-slate-300 font-bold truncate ${r.isDevolucao ? 'text-rose-600' : 'text-slate-600'}`}>
                      {r.label}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-300 text-right tabular-nums"><FormatCurrency value={r.fora} /></td>
                  <td className="py-2 px-3 border-r border-slate-300 text-right tabular-nums"><FormatCurrency value={r.dentro} /></td>
                  <td className="py-2 px-3 text-right tabular-nums font-bold bg-slate-50/50"><FormatCurrency value={r.total} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-auto bg-slate-100/80 border-t-2 border-slate-300 shrink-0">
            <table className="w-full text-xs text-left whitespace-nowrap table-fixed">
              <tfoot>
                <tr>
                  <td className="py-3 px-3 border-r border-slate-300 text-right uppercase font-black text-slate-800 tracking-widest w-[40%] truncate">Total do Mês</td>
                  <td className="py-3 px-3 border-r border-slate-300 text-right tabular-nums font-bold text-slate-800 w-[20%]"><FormatCurrency value={totalFora} /></td>
                  <td className="py-3 px-3 border-r border-slate-300 text-right tabular-nums font-bold text-slate-800 w-[20%]"><FormatCurrency value={totalDentro} /></td>
                  <td className="py-3 px-3 text-right tabular-nums font-black text-emerald-800 w-[20%]"><FormatCurrency value={totalGeral} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function AcompanhamentoNotasExcel() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [dtIni, setDtIni] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dtFim, setDtFim] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [dataEletro, setDataEletro] = useState<NotaMes[]>([]);
  const [dataDfarias, setDataDfarias] = useState<NotaMes[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Estados para o Modal de Detalhes
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalNotas, setModalNotas] = useState<NotaMes[]>([]);

  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) {
      router.replace('/');
      return;
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.replace('/');
  };

  const toast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, open: false }));
    }, 4000);
  };

  const fetchNotas = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
      
      const qsEletro = new URLSearchParams({ codEmp: '1', dtIni, dtFim }).toString();
      const qsDfarias = new URLSearchParams({ codEmp: '2', dtIni, dtFim }).toString();

      const [resEletro, resDfarias] = await Promise.all([
        fetch(`${API_BASE}/expedicao/wesley?${qsEletro}`),
        fetch(`${API_BASE}/expedicao/wesley?${qsDfarias}`)
      ]);

      if (!resEletro.ok || !resDfarias.ok) {
        throw new Error('Falha ao buscar os dados das empresas.');
      }

      const jsonEletro = await resEletro.json();
      const jsonDfarias = await resDfarias.json();

      setDataEletro(Array.isArray(jsonEletro) ? jsonEletro : jsonEletro.data || []);
      setDataDfarias(Array.isArray(jsonDfarias) ? jsonDfarias : jsonDfarias.data || []);
      
      toast('Acompanhamento gerado com sucesso.', 'success');
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com o servidor.');
      toast(err.message || 'Erro na consulta', 'error');
      setDataEletro([]);
      setDataDfarias([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetalhes = (label: string, notas: NotaMes[]) => {
    const sortedNotas = [...notas].sort((a, b) => {
      const dateDiff = new Date(b.DTNEG).getTime() - new Date(a.DTNEG).getTime();
      return dateDiff !== 0 ? dateDiff : b.NUMNOTA - a.NUMNOTA;
    });

    setModalTitle(label);
    setModalNotas(sortedNotas);
    setModalOpen(true);
  };

  // Processamento via useMemo
  const reportDfariasCompra = useMemo(() => buildTableData(dataDfarias, CONFIG_DFARIAS_COMPRA), [dataDfarias]);
  const reportDfariasVenda = useMemo(() => buildTableData(dataDfarias, CONFIG_DFARIAS_VENDA), [dataDfarias]);
  const reportEletroCompra = useMemo(() => buildTableData(dataEletro, CONFIG_ELETRO_COMPRA), [dataEletro]);
  const reportEletroVenda = useMemo(() => buildTableData(dataEletro, CONFIG_ELETRO_VENDA), [dataEletro]);

  return (
    <DashboardLayout subtitle="Planilha Analítica de Notas">

      <main className="flex-1 w-full max-w-[1500px] mx-auto p-4 md:p-6 lg:p-8 animate-fade-in-up">
        {/* Bloco de Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-300 p-4 sm:p-5 mb-6">
          <form onSubmit={fetchNotas} className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1 flex flex-col sm:flex-row gap-4 w-full">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data Inicial
                </label>
                <input
                  type="date"
                  required
                  value={dtIni}
                  onChange={(e) => setDtIni(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data Final
                </label>
                <input
                  type="date"
                  required
                  value={dtFim}
                  onChange={(e) => setDtFim(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full lg:w-auto px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 h-[42px] mt-2 lg:mt-0 shrink-0"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              <span>{loading ? 'Calculando Planilha...' : 'Gerar Relatório'}</span>
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex gap-3 shadow-sm mb-6">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-800 text-sm">Erro na consulta</p>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {/* Planilha Virtual */}
        {hasSearched && !loading && !error && (
          <div className="animate-fade-in-up">
            <div className="w-full bg-white border border-slate-300 py-3 text-center shadow-sm mb-6 flex flex-col justify-center items-center">
              <h2 className="font-black text-slate-800 uppercase tracking-widest text-lg">Acompanhamento de Notas</h2>
              <span className="text-xs text-slate-500 mt-1">Clique em qualquer linha da tabela para visualizar os detalhes das notas.</span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
              {/* Top Row: Compras */}
              <ReportBlock title="COMPRA - DFARIAS" rows={reportDfariasCompra} onRowClick={handleOpenDetalhes} />
              <ReportBlock title="COMPRA - ELETROFARIAS" rows={reportEletroCompra} onRowClick={handleOpenDetalhes} />

              {/* Bottom Row: Vendas */}
              <ReportBlock title="VENDA - DFARIAS" rows={reportDfariasVenda} onRowClick={handleOpenDetalhes} />
              <ReportBlock title="VENDA - ELETROFARIAS" rows={reportEletroVenda} onRowClick={handleOpenDetalhes} />
            </div>
          </div>
        )}
      </main>

      {/* Modal de Detalhes das Notas */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Cabecalho Modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg uppercase">{modalTitle}</h3>
                  <p className="text-xs font-medium text-slate-500">{modalNotas.length} nota(s) encontrada(s)</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo Modal (Tabela) */}
            <div className="p-0 overflow-auto flex-1 custom-table-scroll bg-slate-50/30">
              <table className="w-full text-xs font-medium font-sans min-w-[1000px]">
                <thead className="sticky top-0 bg-slate-100 shadow-sm z-10">
                  <tr>
                    <th className="p-3 text-center border-b border-r border-slate-200 font-bold text-[10px] uppercase text-slate-600">Nº Nota</th>
                    <th className="p-3 text-center border-b border-r border-slate-200 font-bold text-[10px] uppercase text-slate-600">Data</th>
                    <th className="p-3 text-center border-b border-r border-slate-200 font-bold text-[10px] uppercase text-slate-600">TOP</th>
                    <th className="p-3 text-left border-b border-r border-slate-200 font-bold text-[10px] uppercase text-slate-600">Parceiro</th>
                    <th className="p-3 text-center border-b border-r border-slate-200 font-bold text-[10px] uppercase text-slate-600">UF</th>
                    <th className="p-3 text-center border-b border-r border-slate-200 font-bold text-[10px] uppercase text-slate-600">CFOP</th>
                    <th className="p-3 text-right border-b border-slate-200 font-bold text-[10px] uppercase text-slate-600">Valor Nota</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {modalNotas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">Nenhuma nota para esta operação no período.</td>
                    </tr>
                  ) : (
                    modalNotas.map((nota, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                        <td className="p-3 text-center border-r border-slate-100 font-bold text-slate-700">{nota.NUMNOTA}</td>
                        <td className="p-3 text-center border-r border-slate-100 text-slate-600">{formatDateBr(nota.DTNEG)}</td>
                        <td className="p-3 text-center border-r border-slate-100 text-slate-600 font-mono">{nota.CODTIPOPER}</td>
                        <td className="p-3 text-left border-r border-slate-100 text-slate-700 truncate max-w-[300px]" title={nota.NOMEPARC}>{nota.NOMEPARC}</td>
                        <td className="p-3 text-center border-r border-slate-100 font-bold text-slate-600">{nota.UF}</td>
                        <td className="p-3 text-center border-r border-slate-100 font-mono text-emerald-700 bg-emerald-50/20">{nota.CFOP}</td>
                        <td className="p-3 text-right text-slate-800 font-bold tabular-nums">
                          <FormatCurrency value={Number(nota.VLRNOTA)} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Rodapé Modal */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center">
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-widest font-black text-slate-500 mr-4">Soma das Notas Listadas</span>
                <span className="text-lg font-black text-emerald-800">
                  <FormatCurrency value={modalNotas.reduce((acc, curr) => acc + (Number(curr.VLRNOTA) || 0), 0)} />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Container de Toasts */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-in-out ${
          toastState.open ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm ${
            toastState.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'
          }`}
        >
          {toastState.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toastState.msg}
          <button
            type="button"
            onClick={() => setToastState((s) => ({ ...s, open: false }))}
            className="ml-2 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style jsx global>{`
        .custom-table-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-table-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-table-scroll::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        @keyframes fadeInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </DashboardLayout>
  );
}