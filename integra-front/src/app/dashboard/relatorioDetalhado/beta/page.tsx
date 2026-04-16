'use client';
import DashboardLayout from '@/components/DashboardLayout';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Calendar, 
  Building2, 
  Loader2, 
  AlertCircle,
  Menu,
  Server,
  FileText,
  CheckCircle2,
  X,
  Filter,
  ArrowDownToLine,
  GripHorizontal,
  RotateCcw,
  LogOut,
  LayoutDashboard,
  ChevronRight,
  ChevronDown,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

// --- Mock do useRouter para evitar erro de compilação no ambiente sandbox ---
const useRouter = () => ({
  replace: (path: string) => console.log(`Navegando para: ${path}`),
  push: (path: string) => console.log(`Navegando para: ${path}`),
});

// --- Tipagens ---
interface NotaDetalhada {
  NUNOTA: number;
  NUMNOTA: number;
  CODTIPOPER: number;
  DTNEG: string;
  CODPARC: number;
  NOMEPARC: string;
  UF: string;
  CPF_CNPJ: string;
  TIPO_PESSOA: string;
  IE: string;
  CHAVE_ACESSO: string;
  AD_TIPOCLIENTEFATURAR_DESC: string;
  CONSTRUTORA: string;
  CONTRIBUINTE: string;
  CFOP: string | number;
  DESCRCFO: string;
  CST: string | number;
  VLRTRIB?: number; // Novo Campo
  VLRST?: number;   // Novo Campo
  VLRNOTA: number;
}

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
  roles?: string[];
  exp?: number;
  iat?: number;
};

// Definição das colunas disponíveis para facilitar a reordenação
const INITIAL_COLUMNS = [
  { id: 'NUNOTA', label: 'Nro Único', align: 'left' },
  { id: 'NUMNOTA', label: 'Nota', align: 'left' },
  { id: 'CODTIPOPER', label: 'TOP', align: 'center' },
  { id: 'DTNEG', label: 'Data Neg.', align: 'center' },
  { id: 'PARCEIRO', label: 'Parceiro', align: 'left' },
  { id: 'UF', label: 'UF', align: 'center' },
  { id: 'CPF_CNPJ', label: 'CPF/CNPJ', align: 'left' },
  { id: 'IE', label: 'IE', align: 'left' },
  { id: 'CHAVE_ACESSO', label: 'Chave', align: 'left' },
  { id: 'AD_TIPOCLIENTEFATURAR_DESC', label: 'Tipo Cliente', align: 'left' },
  { id: 'CONSTRUTORA', label: 'Const.', align: 'center' },
  { id: 'CONTRIBUINTE', label: 'Contrib.', align: 'center' },
  { id: 'CFOP', label: 'CFOP', align: 'center' },
  { id: 'DESCRCFO', label: 'Desc. CFOP', align: 'left' },
  { id: 'CST', label: 'CST', align: 'center' },
  { id: 'TBST', label: 'TB/ST', align: 'center' },
  { id: 'VLRTRIB', label: 'Vlr. Trib.', align: 'right' },
  { id: 'VLRST', label: 'Vlr. ST', align: 'right' },
  { id: 'VLRNOTA', label: 'Valor Nota', align: 'right' },
];

// --- Funções Auxiliares ---
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

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr: string) => { 
  if (!dateStr) return ''; 
  if (dateStr.includes('/')) return dateStr;
  return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' }); 
};

// ==========================================
// COMPONENTE: Filtro com Multi-seleção (Autocomplete)
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
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-300 hover:text-slate-500 transition-colors"
          >
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

export default function App() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Estados de Tabela Dinâmica e Ordenação
  const [columnOrder, setColumnOrder] = useState(INITIAL_COLUMNS);
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Filtros Globais (API)
  const [codEmp, setCodEmp] = useState('1');
  const [dtIni, setDtIni] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dtFim, setDtFim] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [contrib, setContrib] = useState(true);
  const [nContrib, setNContrib] = useState(true);
  const [cfop, setCfop] = useState('');
  
  // Estado de Dados
  const [data, setData] = useState<NotaDetalhada[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toast
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const t = localStorage.getItem('authToken');
        if (t) {
            setToken(t);
            setUserEmail(decodeJwtEmail(t));
        }
    }
  }, []);

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

    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
      const qs = new URLSearchParams({ 
        codEmp, 
        dtIni, 
        dtFim, 
        contrib: String(contrib), 
        nContrib: String(nContrib),
        ...(cfop ? { cfop } : {}) 
      }).toString();
      
      const res = await fetch(`${API_BASE}/sankhya/notas-detalhadas?${qs}`);
      
      if (!res.ok) throw new Error('Falha ao buscar os dados.');
      
      const json = await res.json();
      setData(json);
      if (json.length > 0) toast(`Foram encontradas ${json.length} notas.`, 'success');
      else toast('Nenhum registro encontrado.', 'error');
    } catch (err: any) {
      setError(err.message || 'Erro de conexão.');
      toast(err.message || 'Erro na consulta', 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Lógica de Sugestões Únicas ---
  const columnSuggestions = useMemo(() => {
    const map: Record<string, string[]> = {};
    INITIAL_COLUMNS.forEach(col => {
      const uniqueValues = new Set<string>();
      data.forEach(item => {
        let val = '';
        if (col.id === 'PARCEIRO') val = `${item.CODPARC} ${item.NOMEPARC}`;
        else if (col.id === 'TBST') {
          const cstStr = String(item.CST).trim();
          val = (cstStr === '10' || cstStr === '60') ? 'ST' : cstStr === '00' ? 'TRIB' : '-';
        } else if (col.id === 'DTNEG') {
          val = formatDate(item.DTNEG);
        } else if (col.id === 'VLRTRIB' || col.id === 'VLRST') {
            // Não geramos sugestões para campos de valores calculados dinamicamente no componente 
            return;
        } else {
          val = String((item as any)[col.id] || '');
        }
        if (val) uniqueValues.add(val);
      });
      map[col.id] = Array.from(uniqueValues).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
    return map;
  }, [data]);

  // --- Lógica de Filtro em Memória ---
  const filteredData = useMemo(() => {
    return data.filter(row => {
      return Object.entries(columnFilters).every(([key, filterValues]) => {
        if (!filterValues || filterValues.length === 0) return true;
        
        let rowValue = '';
        if (key === 'PARCEIRO') {
            rowValue = `${row.CODPARC} ${row.NOMEPARC}`;
        } else if (key === 'TBST') {
            const cstStr = String(row.CST).trim();
            rowValue = (cstStr === '10' || cstStr === '60') ? 'ST' : cstStr === '00' ? 'TRIB' : '-';
        } else if (key === 'DTNEG') {
            rowValue = formatDate(row.DTNEG);
        } else {
            rowValue = String((row as any)[key] || '');
        }

        return filterValues.some(fv => rowValue.toLowerCase().includes(fv.toLowerCase()));
      });
    });
  }, [data, columnFilters]);

  // --- Lógica de Ordenação em Memória ---
  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const getSortValue = (item: any, colId: string) => {
            if (colId === 'PARCEIRO') return `${item.CODPARC} ${item.NOMEPARC}`;
            if (colId === 'TBST') {
                const cstStr = String(item.CST).trim();
                return (cstStr === '10' || cstStr === '60') ? 'ST' : cstStr === '00' ? 'TRIB' : '-';
            }
            if (colId === 'DTNEG') return new Date(item.DTNEG).getTime();
            
            // Tratamento dinâmico para valores caso a API não envie diretamente
            if (colId === 'VLRTRIB') {
                const isTrib = String(item.CST).trim() === '00';
                return item.VLRTRIB !== undefined ? item.VLRTRIB : (isTrib ? item.VLRNOTA : 0);
            }
            if (colId === 'VLRST') {
                const isSt = String(item.CST).trim() === '10' || String(item.CST).trim() === '60';
                return item.VLRST !== undefined ? item.VLRST : (isSt ? item.VLRNOTA : 0);
            }

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
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // --- Cálculo de Totais ---
  const totals = useMemo(() => {
    return filteredData.reduce((acc, row) => {
        const cstStr = String(row.CST).trim();
        const isTrib = cstStr === '00';
        const isSt = cstStr === '10' || cstStr === '60';

        const trib = row.VLRTRIB !== undefined ? Number(row.VLRTRIB) : (isTrib ? Number(row.VLRNOTA) : 0);
        const st = row.VLRST !== undefined ? Number(row.VLRST) : (isSt ? Number(row.VLRNOTA) : 0);

        return {
            nota: acc.nota + (Number(row.VLRNOTA) || 0),
            trib: acc.trib + (trib || 0),
            st: acc.st + (st || 0),
        };
    }, { nota: 0, trib: 0, st: 0 });
  }, [filteredData]);

  // --- Funções de Drag & Drop e Configuração da Tabela ---
  const handleDragStart = (index: number) => {
    setDraggedColumn(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedColumn === null) return;
    const newOrder = [...columnOrder];
    const item = newOrder.splice(draggedColumn, 1)[0];
    newOrder.splice(index, 0, item);
    setColumnOrder(newOrder);
    setDraggedColumn(null);
  };

  const removeColumn = (columnId: string) => {
    if (columnOrder.length <= 1) {
      toast('A tabela deve conter pelo menos uma coluna.', 'error');
      return;
    }
    setColumnOrder(prev => prev.filter(col => col.id !== columnId));
    setColumnFilters(prev => {
        const next = { ...prev };
        delete next[columnId];
        return next;
    });
  };

  const updateFilter = (columnId: string, values: string[]) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: values }));
  };

  const resetTable = () => {
    setColumnOrder(INITIAL_COLUMNS);
    setColumnFilters({});
    setSortConfig(null);
    toast('Configurações da tabela resetadas.', 'success');
  };

  return (
    <DashboardLayout subtitle="Gestão de Usuários">

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 animate-fade-in-up text-left">
        
        {/* Parâmetros de Filtro */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
          <form onSubmit={fetchNotas} className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Empresa
                </label>
                <input 
                  type="number" 
                  required 
                  value={codEmp} 
                  onChange={(e) => setCodEmp(e.target.value)} 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm" 
                />
              </div>
              
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data Inicial
                </label>
                <input 
                  type="date" 
                  required 
                  value={dtIni} 
                  onChange={(e) => setDtIni(e.target.value)} 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm text-slate-700" 
                />
              </div>
              
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data Final
                </label>
                <input 
                  type="date" 
                  required 
                  value={dtFim} 
                  onChange={(e) => setDtFim(e.target.value)} 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm text-slate-700" 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full md:w-auto px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 h-[46px]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                <span>{loading ? 'Buscando...' : 'Pesquisar Notas'}</span>
              </button>
            </div>

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={contrib} 
                    onChange={(e) => setContrib(e.target.checked)} 
                    className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600" 
                  />
                  <span className="text-sm font-bold text-slate-600 group-hover:text-emerald-700 transition-colors">Contribuinte / Construtora</span>
                </label>
                
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={nContrib} 
                    onChange={(e) => setNContrib(e.target.checked)} 
                    className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600" 
                  />
                  <span className="text-sm font-bold text-slate-600 group-hover:text-emerald-700 transition-colors">Não Contribuinte</span>
                </label>
                
                <div className="flex items-center gap-3 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">CFOP:</span>
                  <input 
                    type="number" 
                    placeholder="Ex: 5102" 
                    value={cfop} 
                    onChange={(e) => setCfop(e.target.value)} 
                    className="w-24 px-2 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-emerald-700" 
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${showFilters ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  {showFilters ? 'Ocultar Filtros' : 'Filtros Coluna'}
                </button>
                <button
                  type="button"
                  onClick={resetTable}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Resetar Tabela
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[400px] h-[65vh]">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Resultados ({sortedData.length} Notas Localizadas)
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
               <GripHorizontal className="w-3 h-3" /> Arraste para reordenar ou use o X para remover. Clique na coluna para ordenar.
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
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={() => handleDrop(index)}
                      className={`px-4 py-3 text-${col.align} text-[10px] font-black text-slate-500 uppercase whitespace-nowrap border-b border-slate-200 border-r border-slate-100 last:border-r-0 hover:bg-slate-200 transition-all select-none group`}
                    >
                      <div className={`flex items-center gap-2 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        {/* Area Clicável de Ordenação e Drag */}
                        <div 
                          className="flex items-center gap-1.5 cursor-pointer hover:text-emerald-600 transition-colors"
                          onClick={() => requestSort(col.id)}
                          title={`Ordenar por ${col.label}`}
                        >
                            <GripHorizontal className="w-3 h-3 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0 cursor-grab active:cursor-grabbing" />
                            {col.label}
                            {/* Ícone de ordenação */}
                            <span className="ml-0.5">
                              {sortConfig?.key === col.id ? (
                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                              )}
                            </span>
                        </div>
                        {/* Botão de Remover Coluna */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeColumn(col.id);
                          }}
                          className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-500 hover:text-white rounded-md transition-all text-slate-400"
                          title="Remover coluna"
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
                      // Colunas numéricas calculadas não tem input de autocomplete
                      if (col.id === 'VLRTRIB' || col.id === 'VLRST' || col.id === 'VLRNOTA') {
                        return <th key={`filter-${col.id}`} className="px-2 py-2 border-b border-slate-200 border-r border-slate-100 last:border-r-0 bg-slate-50/50"></th>;
                      }
                      
                      return (
                      <th key={`filter-${col.id}`} className="px-2 py-2 border-b border-slate-200 border-r border-slate-100 last:border-r-0 bg-slate-50/50">
                        <ColumnFilterAutocomplete
                          columnId={col.id}
                          selectedValues={columnFilters[col.id] || []}
                          onChange={(vals) => updateFilter(col.id, vals)}
                          suggestions={columnSuggestions[col.id] || []}
                        />
                      </th>
                    )})}
                  </tr>
                )}
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedData.length === 0 && !loading && (
                  <tr>
                    <td colSpan={columnOrder.length} className="px-4 py-16 text-center text-slate-400 text-sm italic">
                      Nenhum registro encontrado para os filtros informados.
                    </td>
                  </tr>
                )}
                {sortedData.map((row, idx) => (
                  <tr key={`${row.NUNOTA}-${idx}`} className="hover:bg-emerald-50/30 transition-colors group">
                    {columnOrder.map((col) => {
                      let content: React.ReactNode = (row as any)[col.id];

                      // Custom rendering logic
                      if (col.id === 'NUNOTA') content = <span className="text-slate-400 font-mono group-hover:text-slate-600">{row.NUNOTA}</span>;
                      if (col.id === 'NUMNOTA') content = <span className="font-black text-slate-900">{row.NUMNOTA}</span>;
                      if (col.id === 'CODTIPOPER') content = <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 font-bold text-[10px]">{row.CODTIPOPER}</span>;
                      if (col.id === 'DTNEG') content = <span className="whitespace-nowrap">{formatDate(row.DTNEG)}</span>;
                      if (col.id === 'PARCEIRO') content = (
                        <div className="font-bold truncate max-w-[200px]" title={row.NOMEPARC}>
                          <span className="text-slate-400 font-normal mr-1">{row.CODPARC}</span> {row.NOMEPARC}
                        </div>
                      );
                      if (col.id === 'UF') content = <span className="font-black text-slate-700">{row.UF || '-'}</span>;
                      if (col.id === 'CPF_CNPJ') content = <span className="text-slate-500 tabular-nums">{row.CPF_CNPJ}</span>;
                      if (col.id === 'CHAVE_ACESSO') content = <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]" title={row.CHAVE_ACESSO}>{row.CHAVE_ACESSO || '-'}</span>;
                      if (col.id === 'CFOP') content = <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded font-black">{row.CFOP}</span>;
                      if (col.id === 'DESCRCFO') content = <span className="text-slate-500 truncate max-w-[180px]" title={row.DESCRCFO}>{row.DESCRCFO || '-'}</span>;
                      if (col.id === 'CST') content = <span className="font-mono bg-slate-50/50 px-1 rounded">{row.CST}</span>;
                      if (col.id === 'VLRNOTA') content = <span className="text-emerald-700 font-black tabular-nums">{formatCurrency(row.VLRNOTA)}</span>;
                      
                      if (col.id === 'VLRTRIB') {
                          const isTrib = String(row.CST).trim() === '00';
                          const valTrib = row.VLRTRIB !== undefined ? row.VLRTRIB : (isTrib ? row.VLRNOTA : 0);
                          content = <span className="text-blue-700 font-medium tabular-nums">{formatCurrency(valTrib)}</span>;
                      }

                      if (col.id === 'VLRST') {
                          const isSt = String(row.CST).trim() === '10' || String(row.CST).trim() === '60';
                          const valSt = row.VLRST !== undefined ? row.VLRST : (isSt ? row.VLRNOTA : 0);
                          content = <span className="text-amber-700 font-medium tabular-nums">{formatCurrency(valSt)}</span>;
                      }

                      if (col.id === 'TBST') {
                        const cstStr = String(row.CST).trim();
                        let label = '-';
                        let css = 'text-slate-200';
                        if (cstStr === '10' || cstStr === '60') {
                          label = 'ST';
                          css = 'bg-amber-100 text-amber-800 border-amber-200';
                        } else if (cstStr === '00') {
                          label = 'TRIB';
                          css = 'bg-blue-100 text-blue-800 border-blue-200';
                        }
                        content = label === '-' ? label : <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tighter ${css}`}>{label}</span>;
                      }

                      return (
                        <td 
                          key={`${row.NUNOTA}-${col.id}`} 
                          className={`px-4 py-2 text-xs text-${col.align} border-r border-slate-50 last:border-r-0 ${col.id === 'VLRNOTA' || col.id === 'VLRTRIB' || col.id === 'VLRST' ? 'bg-emerald-50/5' : ''}`}
                        >
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
              <div className="px-6 py-4 flex flex-wrap justify-end items-center gap-6 sm:gap-12">
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1 text-right">Total Tributado</p>
                    <p className="text-lg sm:text-xl font-bold text-blue-800 tabular-nums leading-none text-right">
                    {formatCurrency(totals.trib)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1 text-right">Total ST</p>
                    <p className="text-lg sm:text-xl font-bold text-amber-800 tabular-nums leading-none text-right">
                    {formatCurrency(totals.st)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1 text-right">Total Geral Filtrado</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-800 tabular-nums leading-none text-right">
                    {formatCurrency(totals.nota)}
                    </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast flutuante */}
      {toastState.open && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] transition-all animate-fade-in-up">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white font-bold text-sm ${
            toastState.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}>
            {toastState.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toastState.msg}
            <button onClick={() => setToastState(s => ({ ...s, open: false }))} className="ml-2 hover:opacity-75 transition-opacity">
                <X className="w-4 h-4" />
            </button>
            </div>
        </div>
      )}

      <style jsx global>{`
        .custom-table-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-table-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-table-scroll::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        @keyframes fadeInUp { 
          from { transform: translateY(20px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }
        .animate-fade-in-up { 
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
        @keyframes fadeInRight { 
          from { transform: translateX(-20px); opacity: 0; } 
          to { transform: translateX(0); opacity: 1; } 
        }
        .animate-fade-in-right { 
          animation: fadeInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
      `}</style>
    </DashboardLayout>
  );
}