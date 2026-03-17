'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Calendar,
  Loader2, 
  AlertCircle,
  Menu,
  ShieldAlert,
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
  ArrowUpDown
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

// --- Mock do useRouter ---
const useRouter = () => ({
  replace: (path: string) => console.log(`Navegando para: ${path}`),
  push: (path: string) => console.log(`Navegando para: ${path}`),
});

// --- Tipagens ---
interface NotaAuditoria {
  NUNOTA: number;
  NUMNOTA: number;
  CODTRIB: string;
  CODPROD: number;
  CFOP: number;
  CODALIQICMS: number;
  ALIQICMS: number;
  BASEICMS: number;
  DTENTSAI: string;
}

const INITIAL_COLUMNS = [
  { id: 'NUNOTA', label: 'Nro. Único', align: 'left' },
  { id: 'NUMNOTA', label: 'Nro. Nota', align: 'left' },
  { id: 'DTENTSAI', label: 'Dt. Ent/Saída', align: 'center' },
  { id: 'CODPROD', label: 'Cod. Produto', align: 'center' },
  { id: 'CODTRIB', label: 'Tributação', align: 'center' },
  { id: 'CFOP', label: 'CFOP', align: 'center' },
  { id: 'CODALIQICMS', label: 'Cód. Aliq', align: 'center' },
  { id: 'ALIQICMS', label: 'Aliq. ICMS', align: 'right' },
  { id: 'BASEICMS', label: 'Base ICMS', align: 'right' },
];

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatPercent = (val: number) => 
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0) + '%';

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
               <button onClick={() => onChange([])} className="text-[9px] font-bold text-emerald-600 hover:underline">Limpar</button>
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

export default function AuditoriaTributacao() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filtros de Data (Padronizados para o dia atual)
  const [dtIni, setDtIni] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  });
  const [dtFim, setDtFim] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  });

  // Estados da Tabela
  const [columnOrder, setColumnOrder] = useState(INITIAL_COLUMNS);
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Dados e Controle
  const [data, setData] = useState<NotaAuditoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({ open: false, msg: '', type: 'success' });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  const toast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToastState(prev => ({ ...prev, open: false })), 4000);
  };

  const fetchAuditoria = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
      const qs = new URLSearchParams({ dtIni, dtFim }).toString();
      const res = await fetch(`${API_BASE}/expedicao/auditoria-tributacao?${qs}`);
      
      if (!res.ok) throw new Error('Falha ao buscar os dados.');
      
      const json = await res.json();
      setData(json);
      if (json.length > 0) toast(`Foram encontradas ${json.length} notas nas regras.`, 'success');
      else toast('Nenhuma inconsistência encontrada.', 'success');
    } catch (err: any) {
      toast(err.message || 'Erro na consulta', 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Carrega ao abrir
  useEffect(() => {
    fetchAuditoria();
  }, []);

  // Sugestões do Autocomplete
  const columnSuggestions = useMemo(() => {
    const map: Record<string, string[]> = {};
    INITIAL_COLUMNS.forEach(col => {
      const uniqueValues = new Set<string>();
      data.forEach(item => {
        let val = '';
        if (col.id === 'DTENTSAI') val = formatDate((item as any)[col.id]);
        else if (col.id === 'ALIQICMS') val = formatPercent((item as any)[col.id]);
        else if (col.id !== 'BASEICMS') val = String((item as any)[col.id] || '');
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
        if (key === 'DTENTSAI') rowValue = formatDate((row as any)[key]);
        else if (key === 'ALIQICMS') rowValue = formatPercent((row as any)[key]);
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
            if (colId === 'DTENTSAI') return new Date(item[colId]).getTime();
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

  const totalBaseIcms = useMemo(() => filteredData.reduce((acc, row) => acc + (Number(row.BASEICMS) || 0), 0), [filteredData]);

  // Funções de Tabela
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
  
  const updateFilter = (columnId: string, values: string[]) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: values }));
  };

  const resetTable = () => { setColumnOrder(INITIAL_COLUMNS); setColumnFilters({}); setSortConfig(null); };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-emerald-800 hover:bg-slate-50 border border-slate-100 transition-all"
      >
        <Menu className="w-6 h-6" />
      </button>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} userEmail={null} onLogout={() => {}} />

      <header className="bg-emerald-600 text-white shadow-lg sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 opacity-90 text-emerald-100" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Validação Tributária</h1>
                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                  Auditoria de CFOP x Alíquota (Itens)
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 animate-fade-in-up text-left">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          <form onSubmit={fetchAuditoria} className="flex-1 flex flex-col sm:flex-row items-end gap-4 w-full">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="flex-1 sm:w-48">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data Inicial
                </label>
                <input
                  type="date"
                  required
                  value={dtIni}
                  onChange={(e) => setDtIni(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm"
                />
              </div>
              <div className="flex-1 sm:w-48">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data Final
                </label>
                <input
                  type="date"
                  required
                  value={dtFim}
                  onChange={(e) => setDtFim(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                  type="submit"
                  disabled={loading} 
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 h-[46px]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>{loading ? 'Consultando...' : 'Atualizar Dados'}</span>
                </button>
            </div>
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-slate-200 pt-4 sm:pt-0 sm:pl-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border h-[46px] ${showFilters ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Ocultar Filtros' : 'Filtros'}
            </button>
            <button
              onClick={resetTable}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors h-[46px]"
              title="Resetar Tabela"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[400px] h-[65vh]">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Resultados ({sortedData.length} Itens Encontrados)
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
                          className="flex items-center gap-1.5 cursor-pointer hover:text-emerald-600 transition-colors"
                          onClick={() => requestSort(col.id)}
                        >
                            <GripHorizontal className="w-3 h-3 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0 cursor-grab active:cursor-grabbing" />
                            {col.label}
                            <span className="ml-0.5">
                              {sortConfig?.key === col.id ? (
                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
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
                      if (col.id === 'BASEICMS') return <th key={`filter-${col.id}`} className="px-2 py-2 border-b border-slate-200 border-r border-slate-100 last:border-r-0 bg-slate-50/50"></th>;
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
                      Nenhum registro encontrado nas regras fiscais para este período.
                    </td>
                  </tr>
                )}
                {sortedData.map((row, idx) => (
                  <tr key={`${row.NUNOTA}-${row.CODPROD}-${idx}`} className="hover:bg-emerald-50/30 transition-colors group">
                    {columnOrder.map((col) => {
                      let content: React.ReactNode = (row as any)[col.id];

                      if (col.id === 'NUNOTA') content = <span className="text-slate-400 font-mono">{row.NUNOTA}</span>;
                      if (col.id === 'NUMNOTA') content = <span className="font-black text-slate-900">{row.NUMNOTA}</span>;
                      if (col.id === 'DTENTSAI') content = <span className="whitespace-nowrap text-slate-600">{formatDate(row.DTENTSAI)}</span>;
                      if (col.id === 'CODPROD') content = <span className="font-bold text-slate-700">{row.CODPROD}</span>;
                      if (col.id === 'CODTRIB') content = <span className="font-bold text-emerald-700 px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-200 text-[10px]">{row.CODTRIB}</span>;
                      if (col.id === 'CFOP') content = <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono font-bold text-[10px]">{row.CFOP}</span>;
                      if (col.id === 'CODALIQICMS') content = <span className="text-slate-500 font-mono">{row.CODALIQICMS}</span>;
                      if (col.id === 'ALIQICMS') content = <span className="text-slate-800 font-bold">{formatPercent(row.ALIQICMS)}</span>;
                      if (col.id === 'BASEICMS') content = <span className="text-slate-800 font-black tabular-nums">{formatCurrency(row.BASEICMS)}</span>;

                      return (
                        <td key={`${row.NUNOTA}-${col.id}`} className={`px-4 py-2 text-xs text-${col.align} border-r border-slate-50 last:border-r-0 ${col.id === 'BASEICMS' ? 'bg-emerald-50/10' : ''}`}>
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
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1 text-right">Total Base ICMS Filtro</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-800 tabular-nums leading-none text-right">
                      {formatCurrency(totalBaseIcms)}
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
    </div>
  );
}