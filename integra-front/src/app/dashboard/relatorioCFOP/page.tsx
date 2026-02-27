'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Calendar, 
  Building2, 
  Loader2, 
  PieChart, 
  AlertCircle,
  MapPin,
  Truck,
  PackageOpen,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Menu,
  Server
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

// ==========================================
// TIPAGENS & HELPERS
// ==========================================
interface NotaMes {
  NUNOTA: number;
  NUMNOTA: number;
  CODTIPOPER: number;
  DTNEG: string;
  CODPARC: number;
  NOMEPARC: string;
  CPF_CNPJ: string;
  TIPO_PESSOA: string;
  IE: string;
  CHAVE_ACESSO: string;
  CONSTRUTORA: string;
  CONTRIBUINTE: string;
  CFOP: string;
  CST: string;
  VLRNOTA: number;
  AD_TIPOCLIENTEFATURA?: string | number; 
  AD_TIPOCLIENTEFATURAR?: string | number;
}

interface RowAgrupada {
  cfop: string; 
  qtd: number; 
  tribContribuinte: number; 
  tribNaoContribuinte: number;
  stContribuinte: number;
  stNaoContribuinte: number;
  total: number;
}

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
  roles?: string[];
  exp?: number;
  iat?: number;
};

function decodeJwtEmail(token: string | null): string | null {
  if (!token || typeof window === 'undefined') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const json = window.atob(base64);
    const parsed = JSON.parse(json) as JwtPayload;
    return (parsed.email as string) ?? (parsed.sub as string) ?? null;
  } catch {
    return null;
  }
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

// ==========================================
// CONFIGURAÇÃO DINÂMICA DAS COLUNAS
// ==========================================
const COLUMNS_CONFIG: Record<string, { label: string; align: 'left' | 'center' | 'right'; isHighlight?: boolean; isMono?: boolean }> = {
  CFOP: { label: 'CFOP', align: 'left', isMono: true },
  QTD: { label: 'Qtd. Itens', align: 'center' },
  TRIB_C: { label: 'Trib. Contrib. (R$)', align: 'right' },
  TRIB_NC: { label: 'Trib. Não Contrib. (R$)', align: 'right' },
  ST_C: { label: 'ST Contrib. (R$)', align: 'right' },
  ST_NC: { label: 'ST Não Contrib. (R$)', align: 'right' },
  TOTAL: { label: 'Valor Total (R$)', align: 'right', isHighlight: true }
};

const DEFAULT_COL_ORDER = Object.keys(COLUMNS_CONFIG);

// ==========================================
// SUBCOMPONENTE: Tabela de CFOP Dinâmica
// ==========================================
const CfopTableCard = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  colorTheme, 
  dados, 
  loading 
}: { 
  title: string; 
  subtitle: string; 
  icon: any; 
  colorTheme: 'emerald' | 'blue' | 'purple'; 
  dados: RowAgrupada[]; 
  loading: boolean;
}) => {
  
  // Estados
  const [colOrder, setColOrder] = useState<string[]>(DEFAULT_COL_ORDER);
  const [localData, setLocalData] = useState<RowAgrupada[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string, dir: 'asc' | 'desc' } | null>({ key: 'TOTAL', dir: 'desc' });

  // Sincroniza e ordena inicialmente
  useEffect(() => {
    const initialSort = [...dados].sort((a, b) => b.total - a.total);
    setLocalData(initialSort);
    setSortConfig({ key: 'TOTAL', dir: 'desc' });
  }, [dados]);

  // Totais Gerais do Rodapé
  const totaisGerais = useMemo(() => {
    return dados.reduce((acc, row) => {
      acc.qtd += row.qtd;
      acc.tribContribuinte += row.tribContribuinte;
      acc.tribNaoContribuinte += row.tribNaoContribuinte;
      acc.stContribuinte += row.stContribuinte;
      acc.stNaoContribuinte += row.stNaoContribuinte;
      acc.total += row.total;
      return acc;
    }, { qtd: 0, tribContribuinte: 0, tribNaoContribuinte: 0, stContribuinte: 0, stNaoContribuinte: 0, total: 0 });
  }, [dados]);

  // --- LÓGICA DE DRAG & DROP PARA COLUNAS ---
  const handleColDragStart = (e: React.DragEvent<HTMLTableCellElement>, colId: string) => {
    e.dataTransfer.setData('drag_type', 'col');
    e.dataTransfer.setData('col_id', colId);
  };

  const handleColDrop = (e: React.DragEvent<HTMLTableCellElement>, targetColId: string) => {
    e.preventDefault();
    if (e.dataTransfer.getData('drag_type') !== 'col') return;
    
    const draggedColId = e.dataTransfer.getData('col_id');
    if (draggedColId && draggedColId !== targetColId) {
      setColOrder(prev => {
        const newOrder = [...prev];
        const draggedIdx = newOrder.indexOf(draggedColId);
        const targetIdx = newOrder.indexOf(targetColId);
        newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, draggedColId);
        return newOrder;
      });
    }
  };

  // --- LÓGICA DE DRAG & DROP PARA LINHAS ---
  const handleRowDragStart = (e: React.DragEvent<HTMLTableRowElement>, cfop: string) => {
    e.dataTransfer.setData('drag_type', 'row');
    e.dataTransfer.setData('row_id', cfop);
  };

  const handleRowDrop = (e: React.DragEvent<HTMLTableRowElement>, targetCfop: string) => {
    e.preventDefault();
    if (e.dataTransfer.getData('drag_type') !== 'row') return;

    const draggedCfop = e.dataTransfer.getData('row_id');
    if (draggedCfop && draggedCfop !== targetCfop) {
      const newData = [...localData];
      const draggedIdx = newData.findIndex(r => r.cfop === draggedCfop);
      const targetIdx = newData.findIndex(r => r.cfop === targetCfop);
      
      const [draggedItem] = newData.splice(draggedIdx, 1);
      newData.splice(targetIdx, 0, draggedItem);
      
      setLocalData(newData);
      setSortConfig(null);
    }
  };

  // --- LÓGICA DE ORDENAÇÃO POR CLIQUE ---
  const handleSort = (colId: string) => {
    const newDir = sortConfig?.key === colId && sortConfig.dir === 'desc' ? 'asc' : 'desc';
    setSortConfig({ key: colId, dir: newDir });

    const sorted = [...localData].sort((a, b) => {
      let valA: any = 0; let valB: any = 0;
      
      if (colId === 'CFOP') { valA = a.cfop; valB = b.cfop; }
      else if (colId === 'QTD') { valA = a.qtd; valB = b.qtd; }
      else if (colId === 'TRIB_C') { valA = a.tribContribuinte; valB = b.tribContribuinte; }
      else if (colId === 'TRIB_NC') { valA = a.tribNaoContribuinte; valB = b.tribNaoContribuinte; }
      else if (colId === 'ST_C') { valA = a.stContribuinte; valB = b.stContribuinte; }
      else if (colId === 'ST_NC') { valA = a.stNaoContribuinte; valB = b.stNaoContribuinte; }
      else if (colId === 'TOTAL') { valA = a.total; valB = b.total; }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return newDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return newDir === 'asc' ? valA - valB : valB - valA;
    });
    setLocalData(sorted);
  };

  const themeClasses = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: 'text-emerald-700', highlight: 'bg-emerald-50/50' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: 'text-blue-700', highlight: 'bg-blue-50/50' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', icon: 'text-purple-700', highlight: 'bg-purple-50/50' }
  }[colorTheme];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden resize-y min-h-[300px] h-[400px] pb-1 relative animate-fade-in-up">
      
      <div className={`px-5 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 ${themeClasses.bg}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-white rounded-lg shadow-sm border ${themeClasses.border}`}>
            <Icon className={`w-5 h-5 ${themeClasses.icon}`} />
          </div>
          <div>
            <span className={`text-sm font-bold uppercase tracking-wider block ${themeClasses.text}`}>
              {title}
            </span>
            <span className="text-xs text-slate-500 font-medium">{subtitle}</span>
          </div>
        </div>
        <div className="hidden sm:flex gap-4 text-[10px] font-bold text-slate-500 uppercase">
          <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div> Tributado</span>
          <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> ST</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 relative">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              {colOrder.map((colId) => {
                const col = COLUMNS_CONFIG[colId];
                const isSorted = sortConfig?.key === colId;
                
                let headerBgClass = 'bg-slate-50 hover:bg-slate-100';
                if (colId === 'ST_C' || colId === 'ST_NC') headerBgClass = 'bg-amber-50/50 hover:bg-amber-100/50 text-amber-700';
                if (col.isHighlight) headerBgClass = `${themeClasses.highlight} hover:bg-opacity-70 ${themeClasses.text}`;

                return (
                  <th
                    key={colId}
                    draggable
                    onDragStart={(e) => handleColDragStart(e, colId)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleColDrop(e, colId)}
                    className={`px-4 py-3 border-r border-slate-200 text-${col.align} text-[11px] font-bold text-slate-500 uppercase align-middle whitespace-nowrap transition-colors cursor-grab active:cursor-grabbing ${headerBgClass}`}
                    title="Arraste para mover a coluna, clique no texto para ordenar"
                  >
                    <div 
                      className={`flex items-center gap-2 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-start'}`}
                      onClick={() => handleSort(colId)}
                    >
                      {/* Envolvendo o ícone em um span para resolver o erro do TypeScript */}
                      <span 
                        title="Arraste a coluna" 
                        onClick={e => e.stopPropagation()} 
                        className="cursor-move shrink-0 flex items-center justify-center"
                      >
                        <GripVertical className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                      </span>

                      <span className="cursor-pointer">{col.label}</span>
                      
                      <div className="w-3 h-3 flex items-center justify-center shrink-0">
                        {isSorted && sortConfig.dir === 'asc' && <ChevronUp className="w-3 h-3 text-slate-600" />}
                        {isSorted && sortConfig.dir === 'desc' && <ChevronDown className="w-3 h-3 text-slate-600" />}
                        {!isSorted && <ChevronsUpDown className="w-3 h-3 text-slate-300" />}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {localData.length === 0 && !loading && (
              <tr>
                <td colSpan={colOrder.length} className="px-6 py-12 text-center text-slate-400 text-sm">
                  Nenhum CFOP desta categoria encontrado.
                </td>
              </tr>
            )}
            {localData.map((row) => (
              <tr 
                key={row.cfop} 
                className="hover:bg-slate-50 transition-colors bg-white"
                draggable
                onDragStart={(e) => handleRowDragStart(e, row.cfop)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleRowDrop(e, row.cfop)}
              >
                {colOrder.map(colId => {
                  const col = COLUMNS_CONFIG[colId];
                  let valor: any;
                  
                  if (colId === 'CFOP') {
                    valor = (
                      <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing">
                        <span title="Arraste para reordenar a linha" className="shrink-0 flex items-center justify-center">
                          <GripVertical className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                        </span>
                        <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded-md font-mono text-slate-700 pointer-events-none">{row.cfop}</span>
                      </div>
                    );
                  }
                  else if (colId === 'QTD') valor = row.qtd.toLocaleString('pt-BR');
                  else if (colId === 'TRIB_C') valor = formatCurrency(row.tribContribuinte);
                  else if (colId === 'TRIB_NC') valor = formatCurrency(row.tribNaoContribuinte);
                  else if (colId === 'ST_C') valor = formatCurrency(row.stContribuinte);
                  else if (colId === 'ST_NC') valor = formatCurrency(row.stNaoContribuinte);
                  else if (colId === 'TOTAL') valor = formatCurrency(row.total);

                  let extraClass = 'text-slate-700';
                  if (colId === 'CFOP') extraClass = '';
                  else if (colId === 'ST_C' || colId === 'ST_NC') extraClass = 'text-amber-700 bg-amber-50/10';
                  else if (col.isHighlight) extraClass = `font-black ${themeClasses.highlight} ${themeClasses.text}`;

                  return (
                    <td key={colId} className={`px-4 py-3 border-r border-slate-50 text-sm font-medium tabular-nums text-${col.align} ${extraClass}`}>
                      {valor}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          
          {localData.length > 0 && (
            <tfoot className="sticky bottom-0 z-20 bg-slate-50/95 backdrop-blur-md border-t-2 border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <tr>
                {colOrder.map(colId => {
                  const col = COLUMNS_CONFIG[colId];
                  let valor: any = '';

                  if (colId === 'CFOP') valor = 'Totais';
                  else if (colId === 'QTD') valor = totaisGerais.qtd.toLocaleString('pt-BR');
                  else if (colId === 'TRIB_C') valor = formatCurrency(totaisGerais.tribContribuinte);
                  else if (colId === 'TRIB_NC') valor = formatCurrency(totaisGerais.tribNaoContribuinte);
                  else if (colId === 'ST_C') valor = formatCurrency(totaisGerais.stContribuinte);
                  else if (colId === 'ST_NC') valor = formatCurrency(totaisGerais.stNaoContribuinte);
                  else if (colId === 'TOTAL') valor = formatCurrency(totaisGerais.total);

                  let extraClass = 'text-slate-800';
                  if (colId === 'CFOP') extraClass = 'font-black uppercase tracking-wider text-left';
                  else if (colId === 'ST_C' || colId === 'ST_NC') extraClass = 'text-amber-800 font-bold';
                  else if (col.isHighlight) extraClass = `font-black text-base whitespace-nowrap ${themeClasses.highlight} ${themeClasses.text}`;

                  return (
                    <td key={colId} className={`px-4 py-4 border-r border-slate-200 text-sm text-${col.align} tabular-nums ${extraClass}`}>
                      {valor}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL (PÁGINA)
// ==========================================
export default function ResumoCfopDetalhadoGadget() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);
    setUserEmail(decodeJwtEmail(t));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.replace('/');
  };

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

  const { cfops5, cfops6, cfopsEntrada } = useMemo(() => {
    const resumo: Record<string, RowAgrupada> = {};
    
    const cstsST = ['10', '30', '60', '70', '90'];
    const idsContribuinte = ['1', '4', '5', '6'];

    data.forEach(nota => {
      // CORREÇÃO: Forçando string e usando trim para não quebrar a leitura do charAt
      const cfopStr = String(nota.CFOP || 'Sem CFOP').trim();
      const cst = String(nota.CST).trim();
      const valor = Number(nota.VLRNOTA) || 0;
      const tipoCliente = String(nota.AD_TIPOCLIENTEFATURA || nota.AD_TIPOCLIENTEFATURAR || '').trim();

      const isST = cstsST.includes(cst);
      const isContribuinte = idsContribuinte.includes(tipoCliente);
      
      if (!resumo[cfopStr]) {
        resumo[cfopStr] = { cfop: cfopStr, qtd: 0, tribContribuinte: 0, tribNaoContribuinte: 0, stContribuinte: 0, stNaoContribuinte: 0, total: 0 };
      }
      
      resumo[cfopStr].qtd += 1;
      resumo[cfopStr].total += valor;

      if (isST) {
        if (isContribuinte) resumo[cfopStr].stContribuinte += valor;
        else resumo[cfopStr].stNaoContribuinte += valor;
      } else {
        if (isContribuinte) resumo[cfopStr].tribContribuinte += valor;
        else resumo[cfopStr].tribNaoContribuinte += valor;
      }
    });

    const list5: RowAgrupada[] = [];
    const list6: RowAgrupada[] = [];
    const listEntrada: RowAgrupada[] = [];

    Object.values(resumo).forEach(row => {
      // CORREÇÃO: Convertendo para string antes de usar o charAt
      const char1 = String(row.cfop).charAt(0);
      if (char1 === '5') list5.push(row);
      else if (char1 === '6') list6.push(row);
      else if (char1 === '1' || char1 === '2') listEntrada.push(row);
    });

    return {
      cfops5: list5,
      cfops6: list6,
      cfopsEntrada: listEntrada
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
      {/* Botão flutuante sidebar */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        title="Abrir Menu"
      >
        <Menu className="w-7 h-7" />
      </button>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} userEmail={userEmail} onLogout={handleLogout} />

      {/* Header Padronizado */}
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 opacity-90 text-emerald-100" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Painel Gerencial</h1>
                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                  Resumo por Operações Fiscais
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <img
                src="/eletro_farias2.png"
                alt="Logo 1"
                className="h-16 w-auto object-contain bg-green/10 rounded px-2"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <img
                src="/lid-verde-branco.png"
                alt="Logo 2"
                className="h-12 w-auto object-contain hidden md:block"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 md:p-8 animate-fade-in-up">
        
        {/* Parâmetros de Filtro */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
          <form onSubmit={fetchNotas} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Empresa
              </label>
              <input 
                type="number" 
                required 
                value={codEmp} 
                onChange={(e) => setCodEmp(e.target.value)} 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow" 
              />
            </div>
            
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Data Inicial
              </label>
              <input 
                type="date" 
                required 
                value={dtIni} 
                onChange={(e) => setDtIni(e.target.value)} 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow" 
              />
            </div>
            
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Data Final
              </label>
              <input 
                type="date" 
                required 
                value={dtFim} 
                onChange={(e) => setDtFim(e.target.value)} 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow" 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 h-[46px] w-full sm:w-auto"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              <span>{loading ? 'Calculando...' : 'Consultar'}</span>
            </button>
          </form>
        </div>

        {/* Alertas */}
        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl flex gap-3 shadow-sm mb-6 animate-fade-in-up">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-800 text-sm">Erro na consulta</p>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {/* Renderização em Coluna (um abaixo do outro) */}
        <div className="flex flex-col gap-6 w-full">
          
          <CfopTableCard 
            title="Saídas Internas (Dentro do Estado)" 
            subtitle="CFOPs iniciados em 5"
            icon={MapPin}
            colorTheme="emerald"
            dados={cfops5}
            loading={loading}
          />

          <CfopTableCard 
            title="Saídas Interestaduais (Fora do Estado)" 
            subtitle="CFOPs iniciados em 6"
            icon={Truck}
            colorTheme="blue"
            dados={cfops6}
            loading={loading}
          />

          <CfopTableCard 
            title="Entradas (Compras/Devoluções)" 
            subtitle="CFOPs iniciados em 1 ou 2"
            icon={PackageOpen}
            colorTheme="purple"
            dados={cfopsEntrada}
            loading={loading}
          />

        </div>
      </main>

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        @keyframes fadeInUp { 
          from { transform: translateY(20px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }
        .animate-fade-in-up { 
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
      `}</style>
    </div>
  );
}