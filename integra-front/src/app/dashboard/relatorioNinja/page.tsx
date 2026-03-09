'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Calendar,
  Server,
  Loader2,
  AlertCircle,
  Menu,
  CheckCircle2,
  X,
  Tags,
  Receipt,
  Layers,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';

// Ajuste o caminho de importação conforme a estrutura do seu projeto
import SidebarMenu from '@/components/SidebarMenu';

// --- Tipagens Estendidas Baseadas no XML do Gadget ---
interface CFOPAgrupado {
  CODCFO: number;
  QTDREGISTROS: number;
  VLRTOT: number;
  BASEICMS: number;
  VLRICMS: number;
  BASEICMSST: number;
  VLRICMSST: number;
  BASEIPI: number;
  VLRIPI: number;
  BASEPIS: number;
  VLRPIS: number;
  BASECOFINS: number;
  VLRCOFINS: number;
  BASEISS: number;
  VLRISS: number;
  BASEINSS: number;
  VLRINSS: number;
  // Outros impostos podem ser adicionados aqui conforme o XML
}

interface LancamentoAnalitico {
  NUNOTA: number;
  DTMOV: string;
  DTENTSAI: string;
  CODPROD: number;
  DESCRPROD: string;
  CODUFORIGEM: string;
  CODUFDESTINO: string;
  USOPROD: string;
  GRUPOPROD: string;
  MARCA: string;
  VLRTOT: number;
  NCM: string;
  CODEMP: number;
  EMPRAZAOSOCIAL: string;
}

// --- Componentes Auxiliares ---
const FormatCurrencyExcel = ({
  value,
  forceRed = false,
  colorClass
}: {
  value: number;
  forceRed?: boolean;
  colorClass?: string;
}) => {
  const isNegative = value < 0;
  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value || 0));

  let finalClass = isNegative || forceRed ? 'text-rose-600' : 'text-slate-700';
  if (colorClass) finalClass = colorClass;

  return (
    <span className={finalClass}>
      {isNegative ? `-R$ ${formatted.replace('R$', '').trim()}` : formatted}
    </span>
  );
};

const formatDateBr = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
};

// --- COMPONENTE PRINCIPAL ---
export default function ConferenciaImpostosPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Controle de Filtros Avançados
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Estados de Filtro (Mapeando os prompt-parameters do XML)
  
  const [filtros, setFiltros] = useState(() => {
    const d = new Date();
    const primeiroDia = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];

    return {
      P_TIPDATA: '1',
      P_PERIODO_INI: primeiroDia,
      P_PERIODO_FIN: ultimoDia,
      P_LCTSCOMIMPOSTO: '0',
      P_CODEMPMATRIZ: '9999',
      P_CODEMP: '',
      P_TIPMOV: 'ALL',
      P_STATUSNOTA: 'L',
      P_CODCFO: '',
      P_CODTRIB: '999',
      P_CSTIPI: '999',
      P_NUNOTA: '',
      P_NUMNOTA: '',
      P_CLASSIFICMS: 'ALL',
      P_CODPARC: '',
      P_USOPROD: 'ALL'
    };
  });

  // Estados de Dados
  const [dadosAgrupados, setDadosAgrupados] = useState<CFOPAgrupado[]>([]);
  const [dadosAnaliticos, setDadosAnaliticos] = useState<LancamentoAnalitico[]>([]);
  const [cfopSelecionado, setCfopSelecionado] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingAnalitico, setLoadingAnalitico] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);
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

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const fetchAgrupados = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) {
      toast('Sessão expirada. Faça login novamente.', 'error');
      return;
    }

    setLoading(true);
    setError(null);
    setCfopSelecionado(null);
    setDadosAnaliticos([]);

    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
      
      const res = await fetch(`${API_BASE}/sankhya/agrupado`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(filtros)
      });

      if (!res.ok) {
        let backendMessage = 'Falha ao buscar os dados agrupados.';
        try {
          const errorData = await res.json();
          backendMessage = errorData?.message || errorData?.error || backendMessage;
        } catch (parseError) {
          backendMessage = `Erro do Servidor (Status ${res.status})`;
        }
        throw new Error(backendMessage);
      }

      const json = await res.json();
      setDadosAgrupados(json);

      if (json.length > 0) {
        toast('Conferência gerada com sucesso.', 'success');
      } else {
        toast('Nenhum dado encontrado no período.', 'error');
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão.');
      toast(err.message || 'Erro na consulta', 'error');
      setDadosAgrupados([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalitico = async (cfop: number) => {
    if (!token) return;
    
    setCfopSelecionado(cfop);
    setLoadingAnalitico(true);
    
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);

    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
      
      const res = await fetch(`${API_BASE}/sankhya/analitico/${cfop}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(filtros)
      });

      if (!res.ok) {
        let backendMessage = 'Falha ao buscar os detalhes analíticos.';
        try {
          const errorData = await res.json();
          backendMessage = errorData?.message || errorData?.error || backendMessage;
        } catch (parseError) {
          backendMessage = `Erro do Servidor (Status ${res.status})`;
        }
        throw new Error(backendMessage);
      }

      const json = await res.json();
      setDadosAnaliticos(json);
    } catch (err: any) {
      toast(err.message || 'Erro ao carregar analítico', 'error');
      setDadosAnaliticos([]);
    } finally {
      setLoadingAnalitico(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-emerald-800 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        <Menu className="w-6 h-6" />
      </button>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />

      <header className="bg-[#0f7649] text-white shadow-lg sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 opacity-90 text-emerald-100" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Painel Gerencial</h1>
                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">CONFERÊNCIA DE IMPOSTOS</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 animate-fade-in-up">
        
        {/* --- FORMULÁRIO DE FILTROS --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
          <form onSubmit={fetchAgrupados} className="flex flex-col gap-4">
            {/* Filtros Principais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Tags className="w-3.5 h-3.5" /> Tipo de Data
                </label>
                <select
                  value={filtros.P_TIPDATA}
                  onChange={(e) => handleFiltroChange('P_TIPDATA', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-sm text-slate-700"
                >
                  <option value="1">Data da Negociação</option>
                  <option value="2">Data do Movimento</option>
                  <option value="3">Data da Entrada/Saída</option>
                  <option value="4">Data do Faturamento</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data Inicial
                </label>
                <input
                  type="date"
                  required
                  value={filtros.P_PERIODO_INI}
                  onChange={(e) => handleFiltroChange('P_PERIODO_INI', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-sm text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data Final
                </label>
                <input
                  type="date"
                  required
                  value={filtros.P_PERIODO_FIN}
                  onChange={(e) => handleFiltroChange('P_PERIODO_FIN', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-sm text-slate-700"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-2 h-[42px]"
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm">Filtros</span>
                  {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-8 py-2.5 bg-[#0f7649] hover:bg-emerald-800 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 h-[42px]"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  <span>Consultar</span>
                </button>
              </div>
            </div>

            {/* Filtros Avançados (Colapsáveis) */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 animate-fade-in-up">
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Com Valor de Imposto</label>
                  <select value={filtros.P_LCTSCOMIMPOSTO} onChange={e => handleFiltroChange('P_LCTSCOMIMPOSTO', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm">
                    <option value="0">Todos</option>
                    <option value="1">ICMS</option>
                    <option value="2">ICMS ST</option>
                    <option value="3">IPI</option>
                    <option value="6">PIS</option>
                    <option value="7">COFINS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Empresa</label>
                  <input type="number" placeholder="Cód. Empresa" value={filtros.P_CODEMP} onChange={e => handleFiltroChange('P_CODEMP', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Movimento</label>
                  <select value={filtros.P_TIPMOV} onChange={e => handleFiltroChange('P_TIPMOV', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm">
                    <option value="ALL">Todos</option>
                    <option value="V">Nota de Venda</option>
                    <option value="D">Devolução de Venda</option>
                    <option value="C">Nota de Compra</option>
                    <option value="E">Devolução de Compra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status da Nota</label>
                  <select value={filtros.P_STATUSNOTA} onChange={e => handleFiltroChange('P_STATUSNOTA', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm">
                    <option value="ALL">Todos</option>
                    <option value="L">Liberada</option>
                    <option value="A">Atendimento</option>
                    <option value="P">Pendente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">CFOP</label>
                  <input type="number" placeholder="Ex: 5102" value={filtros.P_CODCFO} onChange={e => handleFiltroChange('P_CODCFO', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">CST ICMS</label>
                  <select value={filtros.P_CODTRIB} onChange={e => handleFiltroChange('P_CODTRIB', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm">
                    <option value="999">Todos</option>
                    <option value="0">00-Tributada integralmente</option>
                    <option value="10">10-Tributada e c/cobrança ST</option>
                    <option value="40">40-Isenta</option>
                    <option value="60">60-ICMS cobrado anter. por ST</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Parceiro</label>
                  <input type="number" placeholder="Cód. Parceiro" value={filtros.P_CODPARC} onChange={e => handleFiltroChange('P_CODPARC', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nº Único (NUNOTA)</label>
                  <input type="number" placeholder="NUNOTA" value={filtros.P_NUNOTA} onChange={e => handleFiltroChange('P_NUNOTA', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                </div>

              </div>
            )}
          </form>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex gap-3 shadow-sm mb-6 animate-fade-in-up">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-800 text-sm">Erro na consulta</p>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {/* --- GRID AGRUPADO POR CFOP (Mestre) --- */}
        {dadosAgrupados.length > 0 && (
          <div className="flex flex-col gap-6 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-wide">
                      Conferência de Impostos pelos Itens da Nota - Agrupados por CFOP
                    </h2>
                    <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      Clique em uma linha para exibir a listagem analítica
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto p-0 custom-table-scroll pb-2">
                <table className="w-full border-collapse text-xs font-medium font-sans min-w-[1800px]">
                  <thead>
                    <tr className="bg-[#dcfce7] border-b border-slate-200 text-slate-700">
                      <th className="p-2 sm:p-3 text-center font-bold text-[11px] border-r border-slate-200 sticky left-0 bg-[#dcfce7] z-10 shadow-[1px_0_0_#e2e8f0]">CFOP</th>
                      <th className="p-2 sm:p-3 text-center font-bold text-[11px] border-r border-slate-200">Qtde. Lançamentos</th>
                      <th className="p-2 sm:p-3 text-right font-bold text-[11px] border-r border-slate-200">Valor Total</th>
                      <th className="p-2 sm:p-3 text-right font-bold text-[11px] border-r border-slate-200">Base do ICMS</th>
                      <th className="p-2 sm:p-3 text-right font-bold text-[11px] border-r border-slate-200">Vlr. do ICMS</th>
                      <th className="p-2 sm:p-3 text-right font-bold text-[11px] border-r border-slate-200">Base ICMS ST</th>
                      <th className="p-2 sm:p-3 text-right font-bold text-[11px] border-r border-slate-200">Vlr. ICMS ST</th>
                      <th className="p-2 sm:p-3 text-right font-bold text-[11px] border-r border-slate-200">Base do IPI</th>
                      <th className="p-2 sm:p-3 text-right font-bold text-[11px] border-r border-slate-200">Vlr. do IPI</th>
                      <th className="p-2 sm:p-3 text-right font-bold text-[11px] border-r border-slate-200">Base do PIS</th>
                      <th className="p-2 sm:p-3 text-right font-bold text-[11px] border-r border-slate-200">Vlr. do PIS</th>
                      <th className="p-2 sm:p-3 text-right font-bold text-[11px] border-r border-slate-200">Base da Cofins</th>
                      <th className="p-2 sm:p-3 text-right font-bold text-[11px] border-r border-slate-200">Vlr. da Cofins</th>
                      <th className="p-2 sm:p-3 text-right font-bold text-[11px] border-r border-slate-200">Base do ISS</th>
                      <th className="p-2 sm:p-3 text-right font-bold text-[11px] border-r border-slate-200">Vlr. do ISS</th>
                      <th className="p-2 sm:p-3 text-right font-bold text-[11px] border-r border-slate-200">Base do INSS</th>
                      <th className="p-2 sm:p-3 text-right font-bold text-[11px]">Vlr. do INSS</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {dadosAgrupados.map((row) => (
                      <tr 
                        key={row.CODCFO}
                        onClick={() => fetchAnalitico(row.CODCFO)}
                        className={`cursor-pointer transition-colors border-b border-slate-100 hover:bg-emerald-50/50 ${
                          cfopSelecionado === row.CODCFO ? 'bg-emerald-50/80 font-semibold' : ''
                        }`}
                      >
                        <td className={`p-2 sm:p-3 text-center border-r border-slate-200 sticky left-0 z-10 shadow-[1px_0_0_#e2e8f0] ${cfopSelecionado === row.CODCFO ? 'bg-[#f0fdf4]' : 'bg-white'}`}>
                          {row.CODCFO}
                        </td>
                        <td className="p-2 sm:p-3 text-center border-r border-slate-200">{row.QTDREGISTROS}</td>
                        <td className="p-2 sm:p-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={row.VLRTOT} /></td>
                        <td className="p-2 sm:p-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={row.BASEICMS} /></td>
                        <td className="p-2 sm:p-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={row.VLRICMS} /></td>
                        <td className="p-2 sm:p-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={row.BASEICMSST} /></td>
                        <td className="p-2 sm:p-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={row.VLRICMSST} /></td>
                        <td className="p-2 sm:p-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={row.BASEIPI} /></td>
                        <td className="p-2 sm:p-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={row.VLRIPI} /></td>
                        <td className="p-2 sm:p-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={row.BASEPIS} /></td>
                        <td className="p-2 sm:p-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={row.VLRPIS} /></td>
                        <td className="p-2 sm:p-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={row.BASECOFINS} /></td>
                        <td className="p-2 sm:p-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={row.VLRCOFINS} /></td>
                        <td className="p-2 sm:p-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={row.BASEISS} /></td>
                        <td className="p-2 sm:p-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={row.VLRISS} /></td>
                        <td className="p-2 sm:p-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={row.BASEINSS} /></td>
                        <td className="p-2 sm:p-3 text-right tabular-nums"><FormatCurrencyExcel value={row.VLRINSS} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- GRID ANALÍTICO (Detalhe) --- */}
            {cfopSelecionado && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
                <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-wide">
                        Listagem analítica do CFOP selecionado: {cfopSelecionado}
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto p-0 custom-table-scroll max-h-[500px] overflow-y-auto pb-2">
                  {loadingAnalitico ? (
                    <div className="flex flex-col items-center justify-center p-12 text-[#0f7649] gap-3">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-sm font-bold uppercase tracking-wider">Buscando Lançamentos...</span>
                    </div>
                  ) : dadosAnaliticos.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic">
                      Nenhum lançamento encontrado para o CFOP {cfopSelecionado}.
                    </div>
                  ) : (
                    <table className="w-full border-collapse text-xs font-medium font-sans min-w-[1600px]">
                      <thead className="sticky top-0 z-20 bg-[#dcfce7] shadow-sm text-slate-700">
                        <tr>
                          <th className="border-b border-r border-slate-200 p-2 text-center font-bold text-[10px] uppercase">Nro. único</th>
                          <th className="border-b border-r border-slate-200 p-2 text-center font-bold text-[10px] uppercase">Dt. do Movimento</th>
                          <th className="border-b border-r border-slate-200 p-2 text-center font-bold text-[10px] uppercase">Dt. Entrada/Saída</th>
                          <th className="border-b border-r border-slate-200 p-2 text-center font-bold text-[10px] uppercase">Cód. Produto</th>
                          <th className="border-b border-r border-slate-200 p-2 text-left font-bold text-[10px] uppercase">Produto</th>
                          <th className="border-b border-r border-slate-200 p-2 text-center font-bold text-[10px] uppercase">UF Orig.</th>
                          <th className="border-b border-r border-slate-200 p-2 text-center font-bold text-[10px] uppercase">UF Dest.</th>
                          <th className="border-b border-r border-slate-200 p-2 text-left font-bold text-[10px] uppercase">Uso do Produto</th>
                          <th className="border-b border-r border-slate-200 p-2 text-left font-bold text-[10px] uppercase">Grupo do Produto</th>
                          <th className="border-b border-r border-slate-200 p-2 text-left font-bold text-[10px] uppercase">Marca do Produto</th>
                          <th className="border-b border-r border-slate-200 p-2 text-right font-bold text-[10px] uppercase">Vlr. total</th>
                          <th className="border-b border-r border-slate-200 p-2 text-center font-bold text-[10px] uppercase">NCM</th>
                          <th className="border-b border-r border-slate-200 p-2 text-center font-bold text-[10px] uppercase">Cód. Emp.</th>
                          <th className="border-b border-slate-200 p-2 text-left font-bold text-[10px] uppercase">Empresa</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {dadosAnaliticos.map((row, idx) => (
                          <tr key={`${row.NUNOTA}-${row.CODPROD}-${idx}`} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 text-[11px]">
                            <td className="border-r border-slate-200 px-3 py-2 text-center font-bold text-slate-700">{row.NUNOTA}</td>
                            <td className="border-r border-slate-200 px-3 py-2 text-center text-slate-500">{formatDateBr(row.DTMOV)}</td>
                            <td className="border-r border-slate-200 px-3 py-2 text-center text-slate-500">{formatDateBr(row.DTENTSAI)}</td>
                            <td className="border-r border-slate-200 px-3 py-2 text-center font-mono text-slate-500">{row.CODPROD}</td>
                            <td className="border-r border-slate-200 px-3 py-2 text-left font-semibold text-slate-700 truncate max-w-[250px]">{row.DESCRPROD}</td>
                            <td className="border-r border-slate-200 px-3 py-2 text-center font-bold text-slate-500">{row.CODUFORIGEM}</td>
                            <td className="border-r border-slate-200 px-3 py-2 text-center font-bold text-slate-500">{row.CODUFDESTINO}</td>
                            <td className="border-r border-slate-200 px-3 py-2 text-left text-slate-600">{row.USOPROD}</td>
                            <td className="border-r border-slate-200 px-3 py-2 text-left text-slate-600 truncate max-w-[150px]">{row.GRUPOPROD}</td>
                            <td className="border-r border-slate-200 px-3 py-2 text-left text-slate-600">{row.MARCA}</td>
                            <td className="border-r border-slate-200 px-3 py-2 text-right tabular-nums bg-emerald-50/30">
                              <FormatCurrencyExcel value={row.VLRTOT} />
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2 text-center font-mono text-slate-500">{row.NCM}</td>
                            <td className="border-r border-slate-200 px-3 py-2 text-center text-slate-600">{row.CODEMP}</td>
                            <td className="px-3 py-2 text-left text-slate-600 truncate max-w-[150px]">{row.EMPRAZAOSOCIAL}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* TOAST NOTIFICATION */}
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
          width: 10px;
          height: 10px;
        }
        .custom-table-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-table-scroll::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 4px;
          border: 2px solid #f1f5f9;
        }
        .custom-table-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
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
    </div>
  );
}