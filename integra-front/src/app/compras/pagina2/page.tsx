'use client';
import DashboardLayout from '@/components/DashboardLayout';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Loader2, 
  AlertCircle,
  Menu,
  Server,
  CheckCircle2,
  X,
  Filter,
  ArrowDownToLine,
  GripHorizontal,
  RotateCcw,
  ChevronDown,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

// --- Mock do useRouter ---
const useRouter = () => ({
  replace: (path: string) => console.log(`Navegando para: ${path}`),
  push: (path: string) => console.log(`Navegando para: ${path}`),
});

// --- Tipagens baseadas no Gadget SQL ---
interface NotaPendente {
  NUNOTA: number;
  NUMNOTA: number;
  DTNEG: string;
  DTFATUR: string;
  CODEMP: number;
  CODPARC: number;
  RAZAOSOCIAL: string;
  CODTIPOPER: number;
  VLRNOTA: number;
}

// Colunas definidas no Gadget
const INITIAL_COLUMNS = [
  { id: 'NUNOTA', label: 'Nro Único', align: 'left' },
  { id: 'NUMNOTA', label: 'Nota', align: 'left' },
  { id: 'CODTIPOPER', label: 'TOP', align: 'center' },
  { id: 'DTNEG', label: 'Data Neg.', align: 'center' },
  { id: 'DTFATUR', label: 'Data Fatur.', align: 'center' },
  { id: 'PARCEIRO', label: 'Parceiro', align: 'left' },
  { id: 'VLRNOTA', label: 'Valor Nota', align: 'right' },
];

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr: string) => { 
  if (!dateStr) return '-'; 
  if (dateStr.includes('/')) return dateStr;
  return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' }); 
};

// ==========================================
// COMPONENTE: Filtro com Multi-seleção
// ==========================================
const ColumnFilterAutocomplete = ({ 
  columnId, 
  selectedValues, 
  onChange, 
  suggestions 
}: { 
  columnId: string, 
  selectedValues: string[], 
  onChange: (vals: string[]) => void, 
  suggestions: string[] 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = useMemo(() => {
    if (!inputValue) return suggestions.slice(0, 100); 
    return suggestions
      .filter(s => s.toLowerCase().includes(inputValue.toLowerCase()))
      .slice(0, 100);
  }, [inputValue, suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleValue = (val: string) => {
    const next = selectedValues.includes(val)
      ? selectedValues.filter(v => v !== val)
      : [...selectedValues, val];
    onChange(next);
  };

  const clearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setInputValue('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative group">
        <input
          type="text"
          placeholder={selectedValues.length > 0 ? `${selectedValues.length} sel.` : "Filtrar..."}
          value={inputValue}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          className={`w-full pl-2 pr-8 py-1 text-[10px] font-medium border rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-inner ${
            selectedValues.length > 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200'
          }`}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {selectedValues.length > 0 && (
            <button onClick={clearFilter} className="text-slate-400 hover:text-rose-500 transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          )}
          <button onClick={() => setIsOpen(!isOpen)} className="text-slate-300 hover:text-slate-500 transition-colors">
            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-full min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-xl z-50 animate-fade-in-up max-h-64 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center shrink-0">
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Sugestões ({filteredSuggestions.length})</span>
             {selectedValues.length > 0 && (
               <button onClick={() => onChange([])} className="text-[9px] font-bold text-emerald-600 hover:underline">Limpar tudo</button>
             )}
          </div>
          <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-300">
            {filteredSuggestions.length === 0 ? (
              <div className="px-3 py-4 text-center text-[10px] text-slate-400 italic">Nenhum resultado</div>
            ) : (
              filteredSuggestions.map((suggestion, idx) => {
                const isSelected = selectedValues.includes(suggestion);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleValue(suggestion)}
                    className={`w-full text-left px-3 py-2 text-[10px] transition-colors border-b border-slate-50 last:border-0 truncate font-medium flex items-center justify-between gap-2 ${
                      isSelected ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="truncate">{suggestion}</span>
                    {isSelected && <Check className="w-3 h-3 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function NotasPendentes() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Estados de Tabela
  const [columnOrder, setColumnOrder] = useState(INITIAL_COLUMNS);
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Dados
  const [data, setData] = useState<NotaPendente[]>([]);
  const [loading, setLoading] = useState(false);

  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({ open: false, msg: '', type: 'success' });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  const toast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToastState(prev => ({ ...prev, open: false })), 4000);
  };

  const fetchNotas = async () => {
    setLoading(true);
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
      const res = await fetch(`${API_BASE}/sankhya/notas-pendentes-faturamento`);
      if (!res.ok) throw new Error('Falha ao buscar os dados.');
      
      const json = await res.json();
      setData(json);
      if (json.length > 0) toast(`Foram encontradas ${json.length} notas pendentes.`, 'success');
      else toast('Nenhum registro pendente encontrado.', 'success');
    } catch (err: any) {
      toast(err.message || 'Erro na consulta', 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Buscar dados logo ao carregar a página
  useEffect(() => {
    fetchNotas();
  }, []);

  // Sugestões Únicas
  const columnSuggestions = useMemo(() => {
    const map: Record<string, string[]> = {};
    INITIAL_COLUMNS.forEach(col => {
      const uniqueValues = new Set<string>();
      data.forEach(item => {
        let val = '';
        if (col.id === 'PARCEIRO') val = `${item.CODPARC} ${item.RAZAOSOCIAL}`;
        else if (col.id === 'DTNEG' || col.id === 'DTFATUR') val = formatDate((item as any)[col.id]);
        else if (col.id !== 'VLRNOTA') val = String((item as any)[col.id] || '');
        if (val) uniqueValues.add(val);
      });
      map[col.id] = Array.from(uniqueValues).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
    return map;
  }, [data]);

  // Filtro
  const filteredData = useMemo(() => {
    return data.filter(row => {
      return Object.entries(columnFilters).every(([key, filterValues]) => {
        if (!filterValues || filterValues.length === 0) return true;
        
        let rowValue = '';
        if (key === 'PARCEIRO') rowValue = `${row.CODPARC} ${row.RAZAOSOCIAL}`;
        else if (key === 'DTNEG' || key === 'DTFATUR') rowValue = formatDate((row as any)[key]);
        else rowValue = String((row as any)[key] || '');

        return filterValues.some(fv => rowValue.toLowerCase().includes(fv.toLowerCase()));
      });
    });
  }, [data, columnFilters]);

  // Ordenação
  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const getSortValue = (item: any, colId: string) => {
            if (colId === 'PARCEIRO') return `${item.CODPARC} ${item.RAZAOSOCIAL}`;
            if (colId === 'DTNEG' || colId === 'DTFATUR') return new Date(item[colId]).getTime();
            return item[colId];
        };

        const aValue = getSortValue(a, sortConfig.key);
        const bValue = getSortValue(b, sortConfig.key);

        if (aValue === bValue) return 0;
        if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
        if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortConfig.direction === 'asc'
                ? aValue.localeCompare(bValue, undefined, { numeric: true })
                : bValue.localeCompare(aValue, undefined, { numeric: true });
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const totalGeral = useMemo(() => filteredData.reduce((acc, row) => acc + (Number(row.VLRNOTA) || 0), 0), [filteredData]);

  // Drag & Drop / Configurações
  const handleDragStart = (index: number) => setDraggedColumn(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (index: number) => {
    if (draggedColumn === null) return;
    const newOrder = [...columnOrder];
    const item = newOrder.splice(draggedColumn, 1)[0];
    newOrder.splice(index, 0, item);
    setColumnOrder(newOrder);
    setDraggedColumn(null);
  };
  
  const removeColumn = (columnId: string) => {
    if (columnOrder.length <= 1) return toast('A tabela deve conter pelo menos uma coluna.', 'error');
    setColumnOrder(prev => prev.filter(col => col.id !== columnId));
    setColumnFilters(prev => { const next = { ...prev }; delete next[columnId]; return next; });
  };
  const updateFilter = (columnId: string, values: string[]) => setColumnFilters(prev => ({ ...prev, [columnId]: values }));
  const resetTable = () => { setColumnOrder(INITIAL_COLUMNS); setColumnFilters({}); setSortConfig(null); };

  return (
    <DashboardLayout subtitle="Módulo do Sistema">

      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 animate-fade-in-up text-left">
        {/* Barra de Ações Rápidas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <button 
                onClick={fetchNotas}
                disabled={loading} 
                className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>{loading ? 'Atualizando...' : 'Atualizar Dados'}</span>
              </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border ${showFilters ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Ocultar Filtros' : 'Filtros'}
            </button>
            <button
              onClick={resetTable}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabela de Resultados */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[400px] h-[65vh]">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                Resultados ({sortedData.length} Pendentes)
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
               <GripHorizontal className="w-3 h-3" /> Arraste para reordenar. Clique na coluna para ordenar.
            </div>
          </div>
          
          <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 relative custom-table-scroll">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-slate-100 sticky top-0 z-20">
                <tr>
                  {columnOrder.map((col, index) => (
                    <th
                      key={col.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      className={`px-4 py-3 text-${col.align} text-[10px] font-black text-slate-500 uppercase whitespace-nowrap border-b border-slate-200 border-r border-slate-100 last:border-r-0 hover:bg-slate-200 transition-all select-none group`}
                    >
                      <div className={`flex items-center gap-2 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        <div 
                          className="flex items-center gap-1.5 cursor-pointer hover:text-rose-600 transition-colors"
                          onClick={() => requestSort(col.id)}
                        >
                            <GripHorizontal className="w-3 h-3 text-slate-300 group-hover:text-rose-500 transition-colors shrink-0 cursor-grab active:cursor-grabbing" />
                            {col.label}
                            <span className="ml-0.5">
                              {sortConfig?.key === col.id ? (
                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-rose-600" /> : <ArrowDown className="w-3 h-3 text-rose-600" />
                              ) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />}
                            </span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeColumn(col.id); }}
                          className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-500 hover:text-white rounded-md transition-all text-slate-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
                {showFilters && (
                  <tr className="bg-white sticky top-[41px] z-10 shadow-sm animate-fade-in-up">
                    {columnOrder.map((col) => {
                      if (col.id === 'VLRNOTA') return <th key={`filter-${col.id}`} className="px-2 py-2 border-b border-slate-200 border-r border-slate-100 last:border-r-0 bg-slate-50/50"></th>;
                      return (
                      <th key={`filter-${col.id}`} className="px-2 py-2 border-b border-slate-200 border-r border-slate-100 last:border-r-0 bg-slate-50/50">
                        <ColumnFilterAutocomplete columnId={col.id} selectedValues={columnFilters[col.id] || []} onChange={(vals) => updateFilter(col.id, vals)} suggestions={columnSuggestions[col.id] || []} />
                      </th>
                    )})}
                  </tr>
                )}
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedData.length === 0 && !loading && (
                  <tr>
                    <td colSpan={columnOrder.length} className="px-4 py-16 text-center text-slate-400 text-sm italic">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
                {sortedData.map((row, idx) => (
                  <tr key={`${row.NUNOTA}-${idx}`} className="hover:bg-rose-50/30 transition-colors group">
                    {columnOrder.map((col) => {
                      let content: React.ReactNode = (row as any)[col.id];

                      if (col.id === 'NUNOTA') content = <span className="text-slate-400 font-mono">{row.NUNOTA}</span>;
                      if (col.id === 'NUMNOTA') content = <span className="font-black text-rose-900">{row.NUMNOTA}</span>;
                      if (col.id === 'CODTIPOPER') content = <span className="px-1.5 py-0.5 bg-slate-100 rounded font-bold text-[10px]">{row.CODTIPOPER}</span>;
                      if (col.id === 'DTNEG') content = <span className="whitespace-nowrap">{formatDate(row.DTNEG)}</span>;
                      if (col.id === 'DTFATUR') content = <span className="whitespace-nowrap text-rose-600 font-bold">{formatDate(row.DTFATUR)}</span>;
                      if (col.id === 'PARCEIRO') content = (
                        <div className="font-bold truncate max-w-[250px]" title={row.RAZAOSOCIAL}>
                          <span className="text-slate-400 font-normal mr-1">{row.CODPARC}</span> {row.RAZAOSOCIAL}
                        </div>
                      );
                      if (col.id === 'VLRNOTA') content = <span className="text-rose-700 font-black tabular-nums">{formatCurrency(row.VLRNOTA)}</span>;

                      return (
                        <td key={`${row.NUNOTA}-${col.id}`} className={`px-4 py-2 text-xs text-${col.align} border-r border-slate-50 last:border-r-0`}>
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedData.length > 0 && (
            <div className="shrink-0 bg-slate-50 border-t-2 border-slate-300 z-30">
              <div className="px-6 py-4 flex justify-end items-center gap-4">
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1 text-right">Total Pendente</p>
                    <p className="text-lg sm:text-xl font-black text-rose-800 tabular-nums leading-none text-right">
                      {formatCurrency(totalGeral)}
                    </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {toastState.open && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] transition-all animate-fade-in-up">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white font-bold text-sm ${toastState.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            {toastState.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toastState.msg}
            <button onClick={() => setToastState(s => ({ ...s, open: false }))} className="ml-2 hover:opacity-75"><X className="w-4 h-4" /></button>
            </div>
        </div>
      )}
      <style jsx global>{`
        .custom-table-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-table-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-table-scroll::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        @keyframes fadeInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fade-in-up { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </DashboardLayout>
  );
}