'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  ArrowUpDown,
  Plus,
  Save,
  List,
  Edit2,
  Trash2
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

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
  STATUS?: string; 
  ERRORS?: {
    CFOP: boolean;
    CODTRIB: boolean;
    CODALIQICMS: boolean;
    ALIQICMS: boolean;
    BASEICMS: boolean; 
  };
}

interface RegraAliquota {
  id?: number;
  aliquota?: string;
  descricao?: string;
  cfop: string;
  tributacao: string;
  aliquotaICMS?: string;
  baseICMS?: string; 
}

const INITIAL_COLUMNS = [
  { id: 'STATUS', label: 'Status', align: 'center' },
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

  // Filtros de Data
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
  const [regras, setRegras] = useState<RegraAliquota[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modais e Form de Regras
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegrasModalOpen, setIsRegrasModalOpen] = useState(false);
  const [loadingRegra, setLoadingRegra] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [novaRegra, setNovaRegra] = useState({
    aliquota: '',
    descricao: '',
    cfop: '',
    tributacao: '',
    aliquotaICMS: '',
    baseICMS: '' 
  });

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
      
      const [resNotas, resRegras] = await Promise.all([
        fetch(`${API_BASE}/expedicao/auditoria-tributacao?${qs}`),
        fetch(`${API_BASE}/prisma/getRegrasAliquota`)
      ]);
      
      if (!resNotas.ok) throw new Error('Falha ao buscar as notas.');
      if (!resRegras.ok) throw new Error('Falha ao buscar as regras no banco.');
      
      const jsonNotas: NotaAuditoria[] = await resNotas.json();
      const jsonRegras: RegraAliquota[] = await resRegras.json();

      setRegras(jsonRegras);

      const notasProcessadas = jsonNotas.map((nota) => {
        const formattedTrib = String(nota.CODTRIB || '0').padStart(2, '0');
        const notaCfop = String(nota.CFOP || '').trim();
        const notaCodAliq = String(nota.CODALIQICMS || '').trim();
        const notaAliq = Number(nota.ALIQICMS || 0);
        const notaBaseIcms = Number(nota.BASEICMS || 0);

        let errCfop = false;
        let errTrib = false;
        let errCodAliq = false;
        let errAliq = false;
        let errBase = false;
        let statusResult = '';

        const regrasDoCfop = jsonRegras.filter(r => String(r.cfop).trim() === notaCfop);

        if (regrasDoCfop.length === 0) {
          statusResult = 'Sem Regra';
        } else {
          const regrasComMesmoTrib = regrasDoCfop.filter(r => String(r.tributacao || '0').padStart(2, '0') === formattedTrib);
          
          if (regrasComMesmoTrib.length === 0) {
            errTrib = true;
            statusResult = 'Inconsistente';
            errCodAliq = !regrasDoCfop.some(r => !r.aliquota || String(r.aliquota).trim() === notaCodAliq);
            errAliq = !regrasDoCfop.some(r => !r.aliquotaICMS || Number(r.aliquotaICMS) === notaAliq);
            errBase = !regrasDoCfop.some(r => !r.baseICMS || Number(r.baseICMS) === notaBaseIcms);
          } else {
            const valida = regrasComMesmoTrib.some(r => {
              const matchAliqCod = !r.aliquota || String(r.aliquota).trim() === notaCodAliq;
              const matchAliqIcms = !r.aliquotaICMS || Number(r.aliquotaICMS) === notaAliq;
              const matchBase = !r.baseICMS || Number(r.baseICMS) === notaBaseIcms;
              return matchAliqCod && matchAliqIcms && matchBase;
            });

            if (!valida) {
               errCodAliq = !regrasComMesmoTrib.some(r => !r.aliquota || String(r.aliquota).trim() === notaCodAliq);
               errAliq = !regrasComMesmoTrib.some(r => !r.aliquotaICMS || Number(r.aliquotaICMS) === notaAliq);
               errBase = !regrasComMesmoTrib.some(r => !r.baseICMS || Number(r.baseICMS) === notaBaseIcms);
               statusResult = 'Inconsistente';
            } else {
               statusResult = 'Válido';
            }
          }
        }

        return {
          ...nota,
          CODTRIB: formattedTrib, 
          STATUS: statusResult,
          ERRORS: {
            CFOP: errCfop,
            CODTRIB: errTrib,
            CODALIQICMS: errCodAliq,
            ALIQICMS: errAliq,
            BASEICMS: errBase 
          }
        };
      });

      setData(notasProcessadas);
      if (notasProcessadas.length > 0) toast(`Foram listadas ${notasProcessadas.length} notas auditadas.`, 'success');
      else toast('Nenhum dado encontrado para o período.', 'success');
    } catch (err: any) {
      toast(err.message || 'Erro na consulta', 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Funções de Manipulação de Regras ---
  const abrirModalNovaRegra = () => {
    setNovaRegra({ aliquota: '', descricao: '', cfop: '', tributacao: '', aliquotaICMS: '', baseICMS: '' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const abrirModalEdicao = (regra: RegraAliquota) => {
    setNovaRegra({
      aliquota: regra.aliquota || '',
      descricao: regra.descricao || '',
      cfop: regra.cfop,
      tributacao: regra.tributacao,
      aliquotaICMS: regra.aliquotaICMS ? String(regra.aliquotaICMS) : '',
      baseICMS: regra.baseICMS ? String(regra.baseICMS) : ''
    });
    setEditingId(regra.id || null);
    setIsRegrasModalOpen(false);
    setIsModalOpen(true);
  };

  const fecharModalRegra = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setNovaRegra({ aliquota: '', descricao: '', cfop: '', tributacao: '', aliquotaICMS: '', baseICMS: '' });
  };

  const handleSalvarRegra = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingRegra(true);
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
      const bodyFormatado = {
        ...novaRegra,
        tributacao: String(novaRegra.tributacao || '0').padStart(2, '0')
      };

      let res;
      if (editingId) {
        res = await fetch(`${API_BASE}/prisma/alterarRegra`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...bodyFormatado })
        });
      } else {
        res = await fetch(`${API_BASE}/prisma/criarRegra`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyFormatado)
        });
      }
      
      if (!res.ok) throw new Error(`Falha ao ${editingId ? 'editar' : 'registrar'} regra`);
      
      toast(`Regra ${editingId ? 'atualizada' : 'adicionada'} com sucesso!`, 'success');
      fecharModalRegra();
      fetchAuditoria(); 
    } catch (err: any) {
      toast(err.message || 'Erro ao salvar a regra', 'error');
    } finally {
      setLoadingRegra(false);
    }
  };

  const handleExcluirRegra = async (id?: number) => {
    if (!id) return;
    if (!window.confirm('Tem certeza que deseja excluir esta regra? Essa ação não pode ser desfeita.')) return;

    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
      const res = await fetch(`${API_BASE}/prisma/excluirRegra`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (!res.ok) throw new Error('Falha ao excluir regra');
      
      toast('Regra excluída com sucesso!', 'success');
      fetchAuditoria(); 
    } catch (err: any) {
      toast(err.message || 'Erro ao excluir a regra', 'error');
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col xl:flex-row justify-between items-center gap-4">
          
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

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto border-t xl:border-t-0 xl:border-l border-slate-200 pt-4 xl:pt-0 xl:pl-4">
            
            <button
              onClick={() => setIsRegrasModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm h-[46px]"
            >
              <List className="w-4 h-4" />
              Ver Regras
            </button>

            <button
              onClick={abrirModalNovaRegra}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-sm h-[46px]"
            >
              <Plus className="w-4 h-4" />
              Nova Regra
            </button>
            
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
                {sortedData.map((row, idx) => {
                  const errors = row.ERRORS;
                  
                  return (
                    <tr key={`${row.NUNOTA}-${row.CODPROD}-${idx}`} className="hover:bg-emerald-50/30 transition-colors group">
                      {columnOrder.map((col) => {
                        let content: React.ReactNode = (row as any)[col.id];

                        if (col.id === 'STATUS') {
                          if (row.STATUS === 'Válido') {
                            content = (
                              <span className="px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-fit mx-auto bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                                <CheckCircle2 className="w-3 h-3"/> Válido
                              </span>
                            );
                          } else if (row.STATUS === 'Sem Regra') {
                            content = (
                              <span className="px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-fit mx-auto bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">
                                <AlertCircle className="w-3 h-3"/> Sem Regra
                              </span>
                            );
                          } else {
                            content = (
                              <span className="px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-fit mx-auto bg-rose-100 text-rose-700 border border-rose-200 shadow-sm">
                                <AlertCircle className="w-3 h-3"/> Inconsistente
                              </span>
                            );
                          }
                        }

                        if (col.id === 'NUNOTA') content = <span className="text-slate-400 font-mono">{row.NUNOTA}</span>;
                        if (col.id === 'NUMNOTA') content = <span className="font-black text-slate-900">{row.NUMNOTA}</span>;
                        if (col.id === 'DTENTSAI') content = <span className="whitespace-nowrap text-slate-600">{formatDate(row.DTENTSAI)}</span>;
                        if (col.id === 'CODPROD') content = <span className="font-bold text-slate-700">{row.CODPROD}</span>;
                        
                        if (col.id === 'CODTRIB') {
                          if (row.STATUS === 'Sem Regra') {
                            content = <span className="font-bold px-1.5 py-0.5 rounded border text-[10px] bg-slate-50 border-slate-200 text-slate-600">{row.CODTRIB}</span>;
                          } else if (errors?.CODTRIB) {
                            content = <span className="font-bold px-1.5 py-0.5 rounded border text-[10px] bg-rose-100 border-rose-300 text-rose-700">{row.CODTRIB}</span>;
                          } else {
                            content = <span className="font-bold px-1.5 py-0.5 rounded border text-[10px] bg-emerald-50 border-emerald-200 text-emerald-700">{row.CODTRIB}</span>;
                          }
                        }

                        if (col.id === 'CFOP') {
                          if (row.STATUS === 'Sem Regra') {
                            content = <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">{row.CFOP}</span>;
                          } else if (errors?.CFOP) {
                            content = <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-rose-100 text-rose-700 border border-rose-300">{row.CFOP}</span>;
                          } else {
                            content = <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">{row.CFOP}</span>;
                          }
                        }
                        
                        if (col.id === 'CODALIQICMS') {
                          if (row.STATUS === 'Sem Regra') {
                            content = <span className="font-mono font-bold text-slate-500">{row.CODALIQICMS}</span>;
                          } else if (errors?.CODALIQICMS) {
                            content = <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">{row.CODALIQICMS}</span>;
                          } else {
                            content = <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">{row.CODALIQICMS}</span>;
                          }
                        }
                        
                        if (col.id === 'ALIQICMS') {
                          if (row.STATUS === 'Sem Regra') {
                            content = <span className="font-bold text-slate-800">{formatPercent(row.ALIQICMS)}</span>;
                          } else if (errors?.ALIQICMS) {
                            content = <span className="font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">{formatPercent(row.ALIQICMS)}</span>;
                          } else {
                            content = <span className="font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">{formatPercent(row.ALIQICMS)}</span>;
                          }
                        }

                        if (col.id === 'BASEICMS') {
                          if (row.STATUS === 'Sem Regra') {
                            content = <span className="font-black tabular-nums text-slate-800">{formatCurrency(row.BASEICMS)}</span>;
                          } else if (errors?.BASEICMS) {
                            content = <span className="font-black tabular-nums text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">{formatCurrency(row.BASEICMS)}</span>;
                          } else {
                            content = <span className="font-black tabular-nums text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">{formatCurrency(row.BASEICMS)}</span>;
                          }
                        }

                        return (
                          <td key={`${row.NUNOTA}-${col.id}`} className={`px-4 py-2 text-xs text-${col.align} border-r border-slate-50 last:border-r-0 ${col.id === 'BASEICMS' && !errors?.BASEICMS && row.STATUS !== 'Sem Regra' ? 'bg-emerald-50/10' : ''}`}>
                            {content}
                          </td>
                        );
                      })}
                    </tr>
                  )
                })}
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

      {/* Modal de Visualização das Regras */}
      {isRegrasModalOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <List className="w-5 h-5 text-emerald-400" />
                Regras de Alíquota Cadastradas
              </h2>
              <button onClick={() => setIsRegrasModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-0 flex-1 overflow-auto bg-slate-50 custom-table-scroll">
              <table className="w-full border-collapse text-xs font-medium font-sans relative">
                <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="border-b border-r border-slate-200 p-3 text-left font-bold text-[10px] uppercase text-slate-500">Descrição</th>
                    <th className="border-b border-r border-slate-200 p-3 text-center font-bold text-[10px] uppercase text-slate-500">CFOP</th>
                    <th className="border-b border-r border-slate-200 p-3 text-center font-bold text-[10px] uppercase text-slate-500">CST (Trib)</th>
                    <th className="border-b border-r border-slate-200 p-3 text-center font-bold text-[10px] uppercase text-slate-500">Cód. Alíquota</th>
                    <th className="border-b border-r border-slate-200 p-3 text-right font-bold text-[10px] uppercase text-slate-500">Alíquota ICMS</th>
                    <th className="border-b border-r border-slate-200 p-3 text-right font-bold text-[10px] uppercase text-slate-500">Base ICMS</th>
                    <th className="border-b border-slate-200 p-3 text-center font-bold text-[10px] uppercase text-slate-500 w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {regras.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">Nenhuma regra cadastrada.</td>
                    </tr>
                  ) : (
                    regras.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 border-r border-slate-100 text-slate-700">{r.descricao || '-'}</td>
                        <td className="p-3 border-r border-slate-100 text-center font-mono font-bold text-slate-600 bg-slate-50/50">{r.cfop}</td>
                        <td className="p-3 border-r border-slate-100 text-center font-mono font-bold text-slate-600">{r.tributacao}</td>
                        <td className="p-3 border-r border-slate-100 text-center font-mono font-bold text-slate-600 bg-slate-50/50">{r.aliquota || '-'}</td>
                        <td className="p-3 border-r border-slate-100 text-right font-bold text-emerald-700 bg-emerald-50/10">{r.aliquotaICMS ? formatPercent(Number(r.aliquotaICMS)) : '-'}</td>
                        <td className="p-3 border-r border-slate-100 text-right font-bold text-slate-700">{r.baseICMS ? formatCurrency(Number(r.baseICMS)) : '-'}</td>
                        <td className="p-3 text-center align-middle">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => abrirModalEdicao(r)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar Regra"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleExcluirRegra(r.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Excluir Regra"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="bg-white border-t border-slate-100 p-4 flex justify-end shrink-0 gap-3">
               <button
                  onClick={() => setIsRegrasModalOpen(false)}
                  className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Fechar
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição de Regra */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                {editingId ? <Edit2 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-emerald-400" />}
                {editingId ? 'Editar Regra de Alíquota' : 'Nova Regra de Alíquota'}
              </h2>
              <button onClick={fecharModalRegra} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSalvarRegra} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cód. Alíquota (Opcional)</label>
                  <input
                    type="text"
                    value={novaRegra.aliquota}
                    onChange={e => setNovaRegra({ ...novaRegra, aliquota: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    placeholder="Ex: 1, 2, 3..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Alíquota ICMS % (Opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={novaRegra.aliquotaICMS}
                    onChange={e => setNovaRegra({ ...novaRegra, aliquotaICMS: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    placeholder="Ex: 18"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">CFOP (Obrigatório)</label>
                  <input
                    type="text"
                    required
                    value={novaRegra.cfop}
                    onChange={e => setNovaRegra({ ...novaRegra, cfop: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-mono"
                    placeholder="Ex: 5102, 6102"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">CST Tributação (Obrigatório)</label>
                  <input
                    type="text"
                    required
                    value={novaRegra.tributacao}
                    onChange={e => setNovaRegra({ ...novaRegra, tributacao: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    placeholder="Ex: 00, 60, 20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Base ICMS (Opcional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={novaRegra.baseICMS}
                  onChange={e => setNovaRegra({ ...novaRegra, baseICMS: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  placeholder="Ex: 1000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição Breve (Opcional)</label>
                <input
                  type="text"
                  value={novaRegra.descricao}
                  onChange={e => setNovaRegra({ ...novaRegra, descricao: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  placeholder="Ex: Tributação Padrão PB"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={fecharModalRegra}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingRegra}
                  className={`px-5 py-2.5 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70 text-sm ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {loadingRegra ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingId ? 'Salvar Alterações' : 'Salvar Regra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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