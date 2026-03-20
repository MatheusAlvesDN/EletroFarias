'use client';

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  Search,
  Calendar,
  Loader2,
  AlertCircle,
  Menu,
  CheckCircle2,
  X,
  Building2,
  Hash,
  TrendingUp,
  ArrowDownToLine,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  GripVertical,
  EyeOff,
  RotateCcw,
  Settings2,
  FilterX
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

// --- Tipagens ---
interface SalesNoteRow {
  nunota: number;
  numnota: number;
  dtneg: string;
  codemp: number;
  codparc: number;
  razaosocial: string;
  codtipoper: number;
  codvend: number;
  vendedor: string;
  codgerente: number;
  gerente: string;
  vlrnota: number;
  vlrdesctot: number;
  vlrnota_liq: number;
  vlrcusto: number;
  margem_valor: number;
  custos_fixos: number;
  lucro: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  if (dateStr.includes('/')) return dateStr;
  return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const COLUMNS = [
  { id: 'nunota', label: 'Nro. Único', align: 'left', numeric: true, type: 'text' },
  { id: 'numnota', label: 'Nota', align: 'left', numeric: true, type: 'text' },
  { id: 'dtneg', label: 'Data', align: 'center', numeric: false, type: 'date' },
  { id: 'razaosocial', label: 'Cliente', align: 'left', numeric: false, type: 'text' },
  { id: 'codtipoper', label: 'TOP', align: 'center', numeric: true, type: 'text' },
  { id: 'vendedor_gerente', label: 'Vendedor / Gerente', align: 'left', numeric: false, type: 'text' },
  { id: 'vlrnota', label: 'Vlr. Bruto', align: 'right', numeric: true, type: 'money' },
  { id: 'vlrdesctot', label: 'Desconto', align: 'right', numeric: true, type: 'money' },
  { id: 'vlrnota_liq', label: 'Vlr. Líquido', align: 'right', numeric: true, type: 'money' },
  { id: 'vlrcusto', label: 'Custo', align: 'right', numeric: true, type: 'money' },
  { id: 'margem_valor', label: 'Margem', align: 'right', numeric: true, type: 'money' },
  { id: 'custos_fixos', label: 'C. Fixo', align: 'right', numeric: true, type: 'money' },
  { id: 'lucro', label: 'Lucro Estimado', align: 'right', numeric: true, type: 'money' },
] as const;

export default function NotasVendaPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const diaAtual = hoje.toISOString().split('T')[0];

  const [filtros, setFiltros] = useState({
    empresa: 1,
    dtIni: primeiroDia,
    dtFin: diaAtual,
    nunota: '',
    mostrarOrcamentos: false,
    mostrarVendas: true,
    mostrarPedidos: false,
  });

  const [dados, setDados] = useState<SalesNoteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({ open: false, msg: '', type: 'success' });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  const toast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToastState(prev => ({ ...prev, open: false })), 4000);
  };

  const consultar = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErro(null);

    const url = `${API_BASE}/expedicao/sales-notes-custo`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...filtros,
          empresa: Number(filtros.empresa),
          nunota: filtros.nunota ? Number(filtros.nunota) : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao buscar dados do relatório.');
      }

      const result = await response.json();
      setDados(result);

      if (result.length > 0) toast(`Foram listadas ${result.length} notas de venda.`, 'success');
      else toast('Nenhum dado encontrado para o período.', 'error');
    } catch (err: any) {
      console.error(err);
      setErro(err.message || 'Não foi possível carregar os dados. Verifique sua conexão.');
      toast(err.message || 'Erro na consulta', 'error');
      setDados([]);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  const [columnOrder, setColumnOrder] = useState<string[]>(COLUMNS.map(c => c.id));
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(COLUMNS.map(c => c.id)));
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: '', direction: null });
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showFilterInputs, setShowFilterInputs] = useState(false);

  const toggleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: '', direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredAndSortedDados = useMemo(() => {
    let result = [...dados];

    // --- Filtros por Coluna ---
    Object.entries(columnFilters).forEach(([key, val]) => {
      if (!val) return;
      const search = val.toLowerCase();
      result = result.filter(row => {
        if (key === 'vendedor_gerente') {
          return row.vendedor.toLowerCase().includes(search) || row.gerente.toLowerCase().includes(search);
        }
        const cellValue = String((row as any)[key] || '').toLowerCase();
        return cellValue.includes(search);
      });
    });

    // --- Ordenação ---
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a: any, b: any) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        return sortConfig.direction === 'asc'
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      });
    }

    return result;
  }, [dados, columnFilters, sortConfig]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFiltros((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const totaisVisible = useMemo(() => {
    return filteredAndSortedDados.reduce(
      (acc, curr) => ({
        vlrnota: acc.vlrnota + (Number(curr.vlrnota) || 0),
        vlrdesctot: acc.vlrdesctot + (Number(curr.vlrdesctot) || 0),
        vlrnota_liq: acc.vlrnota_liq + (Number(curr.vlrnota_liq) || 0),
        vlrcusto: acc.vlrcusto + (Number(curr.vlrcusto) || 0),
        margem_valor: acc.margem_valor + (Number(curr.margem_valor) || 0),
        custos_fixos: acc.custos_fixos + (Number(curr.custos_fixos) || 0),
        lucro: acc.lucro + (Number(curr.lucro) || 0),
      }),
      { vlrnota: 0, vlrdesctot: 0, vlrnota_liq: 0, vlrcusto: 0, margem_valor: 0, custos_fixos: 0, lucro: 0 }
    );
  }, [filteredAndSortedDados]);

  // --- Drag and Drop for Columns ---
  const [draggedCol, setDraggedCol] = useState<string | null>(null);

  const onDragStart = (id: string) => setDraggedCol(id);
  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedCol === id) return;
    const newOrder = [...columnOrder];
    const oldIdx = newOrder.indexOf(draggedCol!);
    const newIdx = newOrder.indexOf(id);
    newOrder.splice(oldIdx, 1);
    newOrder.splice(newIdx, 0, draggedCol!);
    setColumnOrder(newOrder);
  };

  const getPercentageInfo = (valor: number, vlrBruto: number) => {
    if (!vlrBruto || vlrBruto === 0) return 'N/A';
    const pct = ((valor / vlrBruto) * 100).toFixed(1);
    return `${pct}% do Vlr. Bruto`;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-emerald-800 hover:bg-slate-50 border border-slate-100 transition-all"
      >
        <Menu className="w-6 h-6" />
      </button>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} userEmail={null} onLogout={() => { }} />

      <header className="bg-emerald-600 text-white shadow-lg sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 opacity-90 text-emerald-100" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Relatório de Vendas e Custos</h1>
                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                  Notas de Venda com Custo da Última Entrada
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 animate-fade-in-up text-left">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-6 flex flex-col gap-4">
          <form onSubmit={consultar} className="flex flex-col lg:flex-row items-end gap-4 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-4 flex-1 w-full">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Empresa
                </label>
                <input
                  type="number"
                  required
                  name="empresa"
                  value={filtros.empresa}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data Inicial
                </label>
                <input
                  type="date"
                  required
                  name="dtIni"
                  value={filtros.dtIni}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm text-slate-700"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data Final
                </label>
                <input
                  type="date"
                  required
                  name="dtFin"
                  value={filtros.dtFin}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm text-slate-700"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Nro. Único
                </label>
                <input
                  type="number"
                  name="nunota"
                  value={filtros.nunota}
                  onChange={handleChange}
                  placeholder="Opcional"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm text-slate-700"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
              <button
                type="submit"
                disabled={loading}
                className="w-full lg:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 h-[46px] shrink-0"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                <span>{loading ? 'Processando...' : 'Consultar Relatório'}</span>
              </button>
            </div>
          </form>

          {/* Filtros de Checkbox */}
          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-100">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer group select-none">
              <input
                type="checkbox"
                name="mostrarOrcamentos"
                checked={filtros.mostrarOrcamentos}
                onChange={handleChange}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <span className="group-hover:text-emerald-700 transition-colors">Orçamentos (TOP 600)</span>
            </label>

            <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer group select-none">
              <input
                type="checkbox"
                name="mostrarVendas"
                checked={filtros.mostrarVendas}
                onChange={handleChange}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <span className="group-hover:text-emerald-700 transition-colors">Vendas (700, 701, 417, 11)</span>
            </label>

            <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer group select-none">
              <input
                type="checkbox"
                name="mostrarPedidos"
                checked={filtros.mostrarPedidos}
                onChange={handleChange}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <span className="group-hover:text-emerald-700 transition-colors">Pedidos (TOP 601)</span>
            </label>
          </div>
        </div>

        {erro && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex gap-3 shadow-sm mb-6 animate-fade-in-up">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-800 text-sm">Erro na consulta</p>
              <p className="text-sm text-rose-700">{erro}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[400px] h-[65vh]">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Resultados ({filteredAndSortedDados.length} Notas)
                </span>
              </div>

              <div className="h-4 w-px bg-slate-200" />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilterInputs(!showFilterInputs)}
                  className={`p-1.5 rounded-lg transition-colors ${showFilterInputs ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-100'}`}
                  title="Filtros por Coluna"
                >
                  <Search className="w-4 h-4" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowColumnManager(!showColumnManager)}
                    className={`p-1.5 rounded-lg transition-colors ${showColumnManager ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-100'}`}
                    title="Gerenciar Colunas"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                  {showColumnManager && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-[100] p-4 animate-fade-in-up">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-black text-slate-700 uppercase">Colunas Visíveis</span>
                        <button onClick={() => {
                          setVisibleColumns(new Set(COLUMNS.map(c => c.id)));
                          setColumnOrder(COLUMNS.map(c => c.id));
                        }} className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-table-scroll">
                        {COLUMNS.map(col => (
                          <label key={col.id} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={visibleColumns.has(col.id)}
                              onChange={(e) => {
                                const next = new Set(visibleColumns);
                                if (e.target.checked) next.add(col.id);
                                else if (next.size > 1) next.delete(col.id);
                                setVisibleColumns(next);
                              }}
                              className="w-3.5 h-3.5 text-emerald-600 rounded"
                            />
                            <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors">{col.label}</span>
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowColumnManager(false)}
                        className="mt-4 w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                      >
                        Fechar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 relative custom-table-scroll">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-slate-100 sticky top-0 z-20">
                <tr>
                  {columnOrder.filter(id => visibleColumns.has(id)).map((id) => {
                    const col = COLUMNS.find(c => c.id === id)!;
                    const isSorting = sortConfig.key === id;
                    return (
                      <th
                        key={id}
                        draggable
                        onDragStart={() => onDragStart(id)}
                        onDragOver={(e) => onDragOver(e, id)}
                        className="px-4 py-3 text-left border-b border-slate-200 border-r border-slate-100 group/head bg-slate-100 transition-colors hover:bg-slate-200/50"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <div
                              onClick={() => toggleSort(id)}
                              className="flex items-center gap-2 cursor-pointer select-none"
                            >
                              <GripVertical className="w-3 h-3 text-slate-300 group-hover/head:text-slate-400 cursor-grab active:cursor-grabbing shrink-0" />
                              <span className={`text-[10px] font-black uppercase tracking-wider transition-colors ${isSorting ? 'text-emerald-700' : 'text-slate-500'}`}>
                                {col.label}
                              </span>
                              {isSorting ? (
                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover/head:opacity-100 transition-all" />
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const next = new Set(visibleColumns);
                                if (next.size > 1) {
                                  next.delete(id);
                                  setVisibleColumns(next);
                                }
                              }}
                              className="opacity-0 group-hover/head:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-400 transition-all shrink-0"
                            >
                              <EyeOff className="w-3 h-3" />
                            </button>
                          </div>
                          {showFilterInputs && (
                            <div className="relative">
                              <input
                                type="text"
                                placeholder={`Filtrar...`}
                                value={columnFilters[id] || ''}
                                onChange={(e) => setColumnFilters(prev => ({ ...prev, [id]: e.target.value }))}
                                className="w-full pl-7 pr-2 py-1 text-[10px] border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                              <Search className="absolute left-2 top-1.5 w-3 h-3 text-slate-300" />
                              {columnFilters[id] && (
                                <button
                                  onClick={() => setColumnFilters(prev => ({ ...prev, [id]: '' }))}
                                  className="absolute right-2 top-1.5 text-slate-300 hover:text-slate-500"
                                >
                                  <FilterX className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredAndSortedDados.length === 0 && !loading && (
                  <tr>
                    <td colSpan={visibleColumns.size} className="px-4 py-16 text-center text-slate-400 text-sm italic">
                      Nenhum registro encontrado. {Object.keys(columnFilters).length > 0 ? "Limpe os filtros de coluna." : "Ajuste os filtros globais e clique em consultar."}
                    </td>
                  </tr>
                )}
                {filteredAndSortedDados.map((n) => (
                  <tr key={n.nunota} className="hover:bg-emerald-50/30 transition-colors group">
                    {columnOrder.filter(id => visibleColumns.has(id)).map((id) => {
                      const col = COLUMNS.find(c => c.id === id)!;
                      const value = (n as any)[id];

                      let content: React.ReactNode = value;
                      let className = `px-4 py-2.5 border-r border-slate-50 text-xs transition-all`;
                      let hoverTitle = '';

                      if (id === 'vendedor_gerente') {
                        content = (
                          <>
                            <div className="text-[11px] font-bold text-slate-700">{n.vendedor}</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase">G: {n.gerente}</div>
                          </>
                        );
                      } else if (col.type === 'money') {
                        content = formatarMoeda(value);
                        className += ` text-right tabular-nums font-medium`;
                        if (id === 'vlrnota_liq') className += ' font-black text-emerald-700 bg-emerald-50/10';
                        if (id === 'margem_valor') className += ' font-black text-blue-600 bg-blue-50/5';
                        if (id === 'lucro') className += ` font-black ${value > 0 ? 'text-emerald-600 bg-emerald-50/20' : 'text-rose-600 bg-rose-50/20'}`;
                        if (id === 'vlrdesctot' && value > 0) className += ' text-rose-600 font-bold';
                        
                        // Percentage hover logic
                        if (id !== 'vlrnota' && id !== 'vlrdesctot' && id !== 'custos_fixos') {
                          hoverTitle = getPercentageInfo(value, n.vlrnota);
                        }
                      } else if (col.type === 'date') {
                        content = formatDate(value);
                        className += ' text-center text-slate-600 whitespace-nowrap';
                      } else if (id === 'razaosocial') {
                        className += ' font-bold text-slate-700 truncate max-w-[200px] text-left';
                      } else if (id === 'nunota') {
                        className += ' font-mono text-slate-400 text-left';
                      } else if (id === 'numnota') {
                        className += ' font-black text-slate-900 text-left';
                      } else if (id === 'codtipoper') {
                        className += ' text-center';
                        content = (
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 font-bold text-[10px] text-slate-600">
                            {value}
                          </span>
                        );
                      }

                      return (
                        <td key={id} className={className} title={hoverTitle}>
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>

              {filteredAndSortedDados.length > 0 && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-300 shadow-sm sticky bottom-0 z-10">
                  <tr>
                    {(() => {
                      const visibleCols = columnOrder.filter(id => visibleColumns.has(id));
                      const firstNumericIdx = visibleCols.findIndex(id => 
                        ['vlrnota', 'vlrdesctot', 'vlrnota_liq', 'vlrcusto', 'margem_valor', 'custos_fixos', 'lucro'].includes(id)
                      );

                      return visibleCols.map((id, idx) => {
                        const col = COLUMNS.find(c => c.id === id)!;
                        const isTotalLabelPos = idx === firstNumericIdx - 1 || (firstNumericIdx === 0 && idx === 0);

                        if (idx < firstNumericIdx) {
                          return (
                            <td key={id} className={`px-4 py-3 text-right font-black text-slate-800 uppercase tracking-widest border-r border-slate-200`}>
                              {isTotalLabelPos ? 'TOTAL' : ''}
                            </td>
                          );
                        }

                        let totalValue = (totaisVisible as any)[id];
                        let className = "px-4 py-3 text-right text-xs font-bold tabular-nums border-r border-slate-200 ";
                        
                        if (id === 'vlrnota_liq') className += "font-black text-emerald-800 bg-emerald-100/50";
                        else if (id === 'margem_valor') className += "font-black text-blue-800 bg-blue-100/50";
                        else if (id === 'vlrdesctot') className += "text-rose-700";
                        else if (id === 'lucro') className += `text-sm font-black ${totalValue > 0 ? 'text-emerald-700 bg-emerald-100/50' : 'text-rose-700 bg-rose-100/50'}`;
                        else className += "text-slate-600";

                        return (
                          <td key={id} className={className}>
                            {formatarMoeda(totalValue)}
                          </td>
                        );
                      });
                    })()}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toastState.open && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] transition-all animate-fade-in-up">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white font-bold text-sm ${toastState.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            {toastState.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toastState.msg}
            <button onClick={() => setToastState(s => ({ ...s, open: false }))} className="ml-2 hover:opacity-75"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* CSS Global Injectado */}
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