'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  RefreshCw,
  Filter,
  Search,
  DollarSign,
  FileText,
  Info,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Server,
  Menu,
  Settings,
  LogOut,
  Users,
  X
} from 'lucide-react';

// Em seu projeto real, descomente a linha abaixo e remova a declaração local:
// import SidebarMenu from '@/components/SidebarMenu';

// --- Componente SidebarMenu (Definido localmente para compilação) ---
const SidebarMenu = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    return (
      <>
        {/* Overlay */}
        <div 
            className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 backdrop-blur-sm ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
            onClick={onClose} 
        />
        
        {/* Drawer */}
        <aside className={`fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="h-20 flex items-center px-6 border-b border-slate-100 justify-between">
                <div className="flex items-center gap-2">
                    <Server className="w-6 h-6 text-emerald-600" />
                    <span className="font-bold text-lg text-slate-800">Menu</span>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                </button>
            </div>
            
            <div className="p-4 space-y-1 overflow-y-auto flex-1 font-sans">
                 <div className="px-4 py-3 rounded-lg text-slate-600 font-medium flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors">
                    <LayoutDashboard className="w-5 h-5" />
                    Dashboard
                 </div>
                 <div className="px-4 py-3 rounded-lg text-slate-600 font-medium flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors">
                    <TrendingUp className="w-5 h-5" />
                    Entradas
                 </div>
                 <div className="px-4 py-3 rounded-lg text-slate-600 font-medium flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors">
                    <TrendingDown className="w-5 h-5" />
                    Saídas
                 </div>
                 <div className="px-4 py-3 rounded-lg text-slate-600 font-medium flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors">
                    <Users className="w-5 h-5" />
                    Parceiros
                 </div>
                 <div className="px-4 py-3 rounded-lg bg-emerald-50 text-emerald-900 font-medium flex items-center gap-3 border border-emerald-100 cursor-pointer">
                    <Settings className="w-5 h-5" />
                    Triggers
                 </div>
            </div>
  
            <div className="p-4 border-t border-slate-100 font-sans">
                <div className="px-4 py-3 rounded-lg text-red-600 font-medium flex items-center gap-3 hover:bg-red-50 cursor-pointer transition-colors">
                    <LogOut className="w-5 h-5" />
                    Sair
                </div>
            </div>
        </aside>
      </>
    );
};

// --- Tipos ---

type AnyObj = Record<string, any>;

type TopRow = {
  TOPS: string;
  QTD_NOTAS: number;
  DESCRICAO: string;
  VLR_TOTAL_ST: number;
  VLR_TOTAL_TB: number;
  VLR_TOTAL: number;
};

type TipoRow = {
  TIPO_COD: string;
  TIPO_DESC: string;

  FATOR_ST: number;
  FATOR_TRIB: number;

  TOT_VENDAS: number;
  TOT_VENDAS_ST: number;
  TOT_VENDAS_TRIB: number;

  TOT_IMP_ST: number;
  TOT_IMP_TRIB: number;
  TOT_IMPOSTOS: number;

  TOT_ST_PB: number;
  TOT_TRIB_PB: number;
  TOT_REST_ST: number;
  TOT_REST_TRIB: number;
};

type ParceiroRow = {
  CODPARC: number;
  NOMEPARC: string;
  AD_TIPOCLIENTEFATURAR: string;

  QTD_NOTAS: number;

  VLR_DEVOLUCAO: number;
  VLR_VENDAS: number;

  TOTAL: number;
  TOTAL_ST: number;
  TOTAL_TRIB: number;

  IMPOSTOST: number;
  IMPOSTOTRIB: number;
  IMPOSTOS: number;

  ST_IND_PB: number;
  TRIB_IND_PB: number;
  RESTANTE_ST: number;
  RESTANTE_TRIB: number;
  VALOR_RESTANTE: number;

  BK_ST?: string;
  FG_ST?: string;
  BK_TRIB?: string;
  FG_TRIB?: string;
};

type DetalheRow = {
  NUMNOTA: number;
  DTNEG: string;
  CODTIPOPER: number;
  VLRNOTA_AJUSTADO: number;
  IMPOSTOS: number; // percentual (0.07 / 0.10)
  CODEMP: number;
};

// --- Helpers ---

function toNumber(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;

  const s0 = String(v).trim();
  if (!s0) return 0;

  const s = s0.replace(/[^\d,.\-]/g, '');
  if (!s) return 0;

  if (s.includes(',') && s.includes('.')) {
    const br = s.replace(/\./g, '').replace(',', '.');
    const n = Number(br);
    return Number.isFinite(n) ? n : 0;
  }

  if (s.includes(',') && !s.includes('.')) {
    const br = s.replace(',', '.');
    const n = Number(br);
    return Number.isFinite(n) ? n : 0;
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function normalizeKeysUpper(row: AnyObj): AnyObj {
  const out: AnyObj = {};
  for (const k of Object.keys(row || {})) out[String(k).toUpperCase()] = row[k];
  return out;
}

type Visao = 'top' | 'entrada' | 'tipo' | 'parceiro' | 'detalhe';

function extractRows(payload: any, visao: Visao): AnyObj[] {
  if (!payload) return [];

  if (Array.isArray(payload) && payload.length && typeof payload[0] === 'object' && !Array.isArray(payload[0])) {
    return payload.map(normalizeKeysUpper);
  }

  const rb = payload.responseBody ?? payload.RESPONSEBODY ?? null;
  const candidate =
    payload.rows ??
    payload.ROWS ??
    payload.result ??
    payload.RESULT ??
    rb?.rows ??
    rb?.ROWS ??
    rb?.result ??
    rb?.RESULT ??
    payload;

  if (Array.isArray(candidate) && candidate.length && typeof candidate[0] === 'object' && !Array.isArray(candidate[0])) {
    return candidate.map(normalizeKeysUpper);
  }

  if (Array.isArray(candidate) && candidate.length && Array.isArray(candidate[0])) {
    return candidate.map((row: any[]) => {
      if (visao === 'top' || visao === 'entrada') {
        return normalizeKeysUpper({
          TOPS: row[0],
          QTD_NOTAS: row[1],
          DESCRICAO: row[2],
          VLR_TOTAL_ST: row[3],
          VLR_TOTAL_TB: row[4],
          VLR_TOTAL: row[5],
        });
      }

      if (visao === 'tipo') {
        return normalizeKeysUpper({
          TIPO_COD: row[0],
          TIPO_DESC: row[1],
          FATOR_ST: row[2],
          FATOR_TRIB: row[3],
          TOT_VENDAS: row[4],
          TOT_VENDAS_ST: row[5],
          TOT_VENDAS_TRIB: row[6],
          TOT_IMP_ST: row[7],
          TOT_IMP_TRIB: row[8],
          TOT_IMPOSTOS: row[9],
          TOT_ST_PB: row[10],
          TOT_TRIB_PB: row[11],
          TOT_REST_ST: row[12],
          TOT_REST_TRIB: row[13],
        });
      }

      if (visao === 'parceiro') {
        return normalizeKeysUpper({
          CODPARC: row[0],
          NOMEPARC: row[1],
          AD_TIPOCLIENTEFATURAR: row[2],
          VLR_VENDAS: row[3],
          VLR_DEVOLUCAO: row[4],
          IMPOSTOTRIB: row[5],
          IMPOSTOST: row[6],
          IMPOSTOS: row[7],
          QTD_NOTAS: row[8],
          TOTAL: row[9],
          TOTAL_ST: row[10],
          TOTAL_TRIB: row[11],
          ST_IND_PB: row[12],
          TRIB_IND_PB: row[13],
          RESTANTE_ST: row[14],
          RESTANTE_TRIB: row[15],
          VALOR_RESTANTE: row[16],
          BK_ST: row[17],
          FG_ST: row[18],
          BK_TRIB: row[19],
          FG_TRIB: row[20],
        });
      }

      if (visao === 'detalhe') {
        return normalizeKeysUpper({
          NUMNOTA: row[0],
          DTNEG: row[1],
          CODTIPOPER: row[2],
          IMPOSTOS: row[6],
          VLRNOTA_AJUSTADO: row[7],
          CODEMP: row[8],
        });
      }

      return normalizeKeysUpper({});
    });
  }

  return [];
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('pt-BR');
};

const formatPercent = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(v) ? v : 0,
  );

// --- Componentes de UI ---

const TableHeader = ({
  children,
  align = 'left',
  onFilter,
  isFiltered,
  ...props
}: { 
  children: React.ReactNode; 
  align?: 'left' | 'right' | 'center'; 
  onFilter?: () => void;
  isFiltered?: boolean;
} & React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={`px-4 py-3 bg-emerald-50 text-${align} text-xs font-bold text-emerald-800 uppercase tracking-wider sticky top-0 z-10 border-b border-emerald-100 whitespace-nowrap`}
    {...props}
  >
    <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
      {children}
      {onFilter && (
        <button
          onClick={(e) => { e.stopPropagation(); onFilter(); }}
          className={`p-1 rounded transition-colors flex-shrink-0 ${
            isFiltered 
              ? 'text-emerald-700 bg-emerald-200 hover:bg-emerald-300' 
              : 'text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100'
          }`}
          title="Filtrar coluna"
        >
          <Filter className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  </th>
);

const TableCell = ({
  children,
  align = 'left',
  className = '',
  ...props
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
} & React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={`px-4 py-3 text-sm text-slate-700 whitespace-nowrap border-b border-slate-50 text-${align} ${className}`}
    {...props}
  >
    {children}
  </td>
);

const Card = ({ title, icon, children, className = '' }: { title: React.ReactNode; icon?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${className}`}>
    <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50/30 flex justify-between items-center">
      <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
        {icon && <span className="text-emerald-600">{icon}</span>}
        {title}
      </h2>
    </div>
    <div className="flex-1 overflow-hidden flex flex-col relative">
      {children}
    </div>
  </div>
);

// --- Componente Principal ---

export default function DashboardSankhya() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [dtRef, setDtRef] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dataTop, setDataTop] = useState<TopRow[]>([]);
  const [dataEntradaTop, setDataEntradaTop] = useState<TopRow[]>([]);
  const [dataTipo, setDataTipo] = useState<TipoRow[]>([]);
  const [dataParc, setDataParc] = useState<ParceiroRow[]>([]);
  const [selectedParc, setSelectedParc] = useState<number | null>(null);
  const [dataDetalhe, setDataDetalhe] = useState<DetalheRow[]>([]);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  // --- Estados de Filtros para Parceiros ---
  const [filterPerfil, setFilterPerfil] = useState<string>('Todos');
  const [filterCol, setFilterCol] = useState<keyof ParceiroRow>('TOTAL');
  const [filterMin, setFilterMin] = useState<string>('');
  const [filterMax, setFilterMax] = useState<string>('');

  // --- Estados do Modal de Filtros ---
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [modalFilterPerfil, setModalFilterPerfil] = useState<string>('Todos');
  const [modalFilterCol, setModalFilterCol] = useState<keyof ParceiroRow>('TOTAL');
  const [modalFilterMin, setModalFilterMin] = useState<string>('');
  const [modalFilterMax, setModalFilterMax] = useState<string>('');

  const API_BASE = useMemo(() => (process.env.NEXT_PUBLIC_API_URL ?? '').trim(), []);
  const DASH_URL = useMemo(() => {
    if (!API_BASE) return '/dash/relatorioSaidaIncentivoGerencia';
    return `${API_BASE.replace(/\/$/, '')}/dash/relatorioSaidaIncentivoGerencia`;
  }, [API_BASE]);

  const fetchVisao = useCallback(
    async (visao: Visao, codParc?: number) => {
      const params = new URLSearchParams();
      params.set('dtRef', `${dtRef}-01`);
      params.set('visao', visao === 'tipo' ? 'perfil' : visao);
      if (typeof codParc === 'number') params.set('codParc', String(codParc));

      const url = `${DASH_URL}?${params.toString()}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const text = await res.text();

      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = { _notJson: true, text };
      }

      if (!res.ok) throw new Error(`${visao}: Falha ao buscar dados.`);
      return extractRows(json, visao);
    },
    [DASH_URL, dtRef],
  );

  const loadAll = useCallback(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      setSelectedParc(null);
      setDataDetalhe([]);

      try {
        const [entradaRaw, topRaw, tipoRaw, parcRaw] = await Promise.all([
          fetchVisao('entrada'),
          fetchVisao('top'),
          fetchVisao('tipo'),
          fetchVisao('parceiro'),
        ]);

        setDataEntradaTop(entradaRaw.map((r) => ({
            TOPS: String(r.TOPS ?? ''),
            QTD_NOTAS: toNumber(r.QTD_NOTAS),
            DESCRICAO: String(r.DESCRICAO ?? ''),
            VLR_TOTAL_ST: toNumber(r.VLR_TOTAL_ST),
            VLR_TOTAL_TB: toNumber(r.VLR_TOTAL_TB),
            VLR_TOTAL: toNumber(r.VLR_TOTAL),
          })));

        setDataTop(topRaw.map((r) => ({
          TOPS: String(r.TOPS ?? ''),
          QTD_NOTAS: toNumber(r.QTD_NOTAS),
          DESCRICAO: String(r.DESCRICAO ?? ''),
          VLR_TOTAL_ST: toNumber(r.VLR_TOTAL_ST),
          VLR_TOTAL_TB: toNumber(r.VLR_TOTAL_TB),
          VLR_TOTAL: toNumber(r.VLR_TOTAL),
        })));

        setDataTipo(tipoRaw.map((r) => ({
          TIPO_COD: String(r.TIPO_COD ?? ''),
          TIPO_DESC: String(r.TIPO_DESC ?? ''),
          FATOR_ST: toNumber(r.FATOR_ST),
          FATOR_TRIB: toNumber(r.FATOR_TRIB),
          TOT_VENDAS: toNumber(r.TOT_VENDAS),
          TOT_VENDAS_ST: toNumber(r.TOT_VENDAS_ST),
          TOT_VENDAS_TRIB: toNumber(r.TOT_VENDAS_TRIB),
          TOT_IMP_ST: toNumber(r.TOT_IMP_ST),
          TOT_IMP_TRIB: toNumber(r.TOT_IMP_TRIB),
          TOT_IMPOSTOS: toNumber(r.TOT_IMPOSTOS),
          TOT_ST_PB: toNumber(r.TOT_ST_PB),
          TOT_TRIB_PB: toNumber(r.TOT_TRIB_PB),
          TOT_REST_ST: toNumber(r.TOT_REST_ST),
          TOT_REST_TRIB: toNumber(r.TOT_REST_TRIB),
        })));

        setDataParc(parcRaw.map((r) => ({
          CODPARC: toNumber(r.CODPARC),
          NOMEPARC: String(r.NOMEPARC ?? ''),
          AD_TIPOCLIENTEFATURAR: String(r.AD_TIPOCLIENTEFATURAR ?? ''),
          QTD_NOTAS: toNumber(r.QTD_NOTAS),
          VLR_DEVOLUCAO: toNumber(r.VLR_DEVOLUCAO),
          VLR_VENDAS: toNumber(r.VLR_VENDAS),
          TOTAL: toNumber(r.TOTAL),
          TOTAL_ST: toNumber(r.TOTAL_ST),
          TOTAL_TRIB: toNumber(r.TOTAL_TRIB),
          IMPOSTOST: toNumber(r.IMPOSTOST),
          IMPOSTOTRIB: toNumber(r.IMPOSTOTRIB),
          IMPOSTOS: toNumber(r.IMPOSTOS),
          ST_IND_PB: toNumber(r.ST_IND_PB),
          TRIB_IND_PB: toNumber(r.TRIB_IND_PB),
          RESTANTE_ST: toNumber(r.RESTANTE_ST),
          RESTANTE_TRIB: toNumber(r.RESTANTE_TRIB),
          VALOR_RESTANTE: toNumber(r.VALOR_RESTANTE),
          BK_ST: String(r.BK_ST ?? ''),
          FG_ST: String(r.FG_ST ?? ''),
          BK_TRIB: String(r.BK_TRIB ?? ''),
          FG_TRIB: String(r.FG_TRIB ?? ''),
        })));
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? 'Ocorreu um erro ao carregar o painel.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [dtRef, fetchVisao]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedParc) return;
    const run = async () => {
      setLoadingDetalhe(true);
      try {
        const detRaw = await fetchVisao('detalhe', selectedParc);
        setDataDetalhe(detRaw.map((r) => ({
          NUMNOTA: toNumber(r.NUMNOTA),
          DTNEG: String(r.DTNEG ?? ''),
          CODTIPOPER: toNumber(r.CODTIPOPER),
          IMPOSTOS: toNumber(r.IMPOSTOS),
          VLRNOTA_AJUSTADO: toNumber(r.VLRNOTA_AJUSTADO),
          CODEMP: toNumber(r.CODEMP),
        })));
      } catch (e) {
        console.error(e);
        setDataDetalhe([]);
      } finally {
        setLoadingDetalhe(false);
      }
    };
    run();
  }, [selectedParc, fetchVisao]);

  // Lista de perfis FAT únicos para o filtro
  const perfisFat = useMemo(() => {
      const perfis = new Set(dataParc.map(p => p.AD_TIPOCLIENTEFATURAR).filter(Boolean));
      return Array.from(perfis).sort();
  }, [dataParc]);

  // Aplicação dos filtros nos parceiros
  const filteredParc = useMemo(() => {
      return dataParc.filter(row => {
          if (filterPerfil !== 'Todos' && row.AD_TIPOCLIENTEFATURAR !== filterPerfil) {
              return false;
          }

          const val = Number(row[filterCol]) || 0;
          const min = filterMin !== '' ? Number(filterMin) : -Infinity;
          const max = filterMax !== '' ? Number(filterMax) : Infinity;

          if (val < min || val > max) {
              return false;
          }

          return true;
      });
  }, [dataParc, filterPerfil, filterCol, filterMin, filterMax]);

  // Funções do Modal de Filtros
  const handleOpenFilterModal = (col: keyof ParceiroRow | 'PERFIL') => {
      setModalFilterPerfil(filterPerfil);
      setModalFilterMin(filterMin);
      setModalFilterMax(filterMax);
      
      if (col === 'PERFIL') {
          setModalFilterCol(filterCol);
      } else {
          setModalFilterCol(col as keyof ParceiroRow);
      }
      setIsFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
      setFilterPerfil(modalFilterPerfil);
      setFilterCol(modalFilterCol);
      setFilterMin(modalFilterMin);
      setFilterMax(modalFilterMax);
      setIsFilterModalOpen(false);
  };

  const handleClearFilters = () => {
      setFilterPerfil('Todos');
      setFilterCol('TOTAL');
      setFilterMin('');
      setFilterMax('');
      setIsFilterModalOpen(false);
  };

  const hasValueFilters = filterMin !== '' || filterMax !== '';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative">
      {/* Sidebar Button (Fixed) */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100"
        title="Abrir Menu"
      >
        <Menu className="w-7 h-7" />
      </button>

      {/* Sidebar Component */}
      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header Styled like Example */}
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
                 <div className="flex items-center gap-3">
                    <Server className="w-8 h-8 opacity-90 text-emerald-100" />
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Painel Gerencial</h1>
                        <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">Incentivos Fiscais & Saídas</p>
                    </div>
                 </div>

                 <div className="flex gap-4 items-center">
                     <img
                        src="/eletro_farias2.png"
                        alt="Logo 1"
                        className="h-12 w-auto object-contain bg-white/10 rounded px-2"
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

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <div className="flex items-center gap-2 bg-emerald-800/50 px-3 py-1.5 rounded-lg border border-emerald-600 shadow-inner">
                    <Calendar className="w-4 h-4 text-emerald-300" />
                    <span className="text-xs font-bold text-emerald-100 uppercase">Competência:</span>
                    <input
                        type="month"
                        value={dtRef}
                        onChange={(e) => setDtRef(e.target.value)}
                        className="bg-transparent text-sm text-white font-bold focus:outline-none cursor-pointer [color-scheme:dark]"
                    />
                </div>

                <button
                    onClick={loadAll}
                    className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:outline-none shadow-sm border border-emerald-500"
                    title="Atualizar lista"
                >
                    <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 md:p-6 space-y-6">
        
        {error && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="font-medium text-amber-800">Atenção</p>
                    <p className="text-sm text-amber-700">{error}</p>
                </div>
            </div>
        )}

        {/* TOP Cards Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Card ENTRADA */}
          <Card 
            title="Faturamento Entrada (Mês Passado)" 
            icon={<TrendingUp className="w-5 h-5" />}
            className="h-[400px]"
          >
            <div className="overflow-auto h-full scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-emerald-50/50">
                  <tr>
                    <TableHeader>TOP</TableHeader>
                    <TableHeader align="right">Qtd</TableHeader>
                    <TableHeader>Descrição</TableHeader>
                    <TableHeader align="right">Vlr ST</TableHeader>
                    <TableHeader align="right">Vlr TB</TableHeader>
                    <TableHeader align="right">Total</TableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {dataEntradaTop.map((row, idx) => (
                    <tr key={`${row.TOPS}-${idx}`} className="hover:bg-emerald-50/50 transition-colors">
                      <TableCell className="font-medium text-emerald-900">{row.TOPS}</TableCell>
                      <TableCell align="right">{row.QTD_NOTAS}</TableCell>
                      <TableCell className="text-xs truncate max-w-[150px]" title={row.DESCRICAO}>{row.DESCRICAO}</TableCell>
                      <TableCell align="right" className="tabular-nums">{formatCurrency(row.VLR_TOTAL_ST)}</TableCell>
                      <TableCell align="right" className="tabular-nums">{formatCurrency(row.VLR_TOTAL_TB)}</TableCell>
                      <TableCell align="right" className="font-bold text-emerald-700 tabular-nums">{formatCurrency(row.VLR_TOTAL)}</TableCell>
                    </tr>
                  ))}
                  {dataEntradaTop.length === 0 && !loading && (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-400 text-sm italic">Sem dados de entrada para o período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Card SAÍDA TOP */}
          <Card 
            title="Faturamento Saída por TOP (Mês Passado)" 
            icon={<TrendingDown className="w-5 h-5" />}
            className="h-[400px]"
          >
             <div className="overflow-auto h-full scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-emerald-50/50">
                        <tr>
                            <TableHeader>TOP</TableHeader>
                            <TableHeader align="right">Qtd</TableHeader>
                            <TableHeader>Descrição</TableHeader>
                            <TableHeader align="right">Vlr ST</TableHeader>
                            <TableHeader align="right">Vlr TB</TableHeader>
                            <TableHeader align="right">Total</TableHeader>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                         {dataTop.map((row, idx) => (
                            <tr key={`${row.TOPS}-${idx}`} className="hover:bg-emerald-50/50 transition-colors">
                                <TableCell className="font-medium text-emerald-900">{row.TOPS}</TableCell>
                                <TableCell align="right">{row.QTD_NOTAS}</TableCell>
                                <TableCell className="text-xs truncate max-w-[150px]" title={row.DESCRICAO}>{row.DESCRICAO}</TableCell>
                                <TableCell align="right" className="tabular-nums">{formatCurrency(row.VLR_TOTAL_ST)}</TableCell>
                                <TableCell align="right" className="tabular-nums">{formatCurrency(row.VLR_TOTAL_TB)}</TableCell>
                                <TableCell align="right" className="font-bold text-emerald-700 tabular-nums">{formatCurrency(row.VLR_TOTAL)}</TableCell>
                            </tr>
                        ))}
                         {dataTop.length === 0 && !loading && (
                            <tr><td colSpan={6} className="p-12 text-center text-slate-400 text-sm italic">Sem dados de saída para o período.</td></tr>
                         )}
                    </tbody>
                </table>
             </div>
          </Card>
        </div>

        {/* Card TIPO */}
        <Card 
            title="Totais por Tipo" 
            icon={<Filter className="w-5 h-5" />}
            className="h-[400px]"
        >
           <div className="overflow-auto h-full scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
              <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-emerald-50/50">
                      <tr>
                          <TableHeader>Tipo</TableHeader>
                          <TableHeader>Perfil</TableHeader>
                          <TableHeader align="right">Total ST</TableHeader>
                          <TableHeader align="right">Total TB</TableHeader>
                          <TableHeader align="right">Total Vendas</TableHeader>
                          <TableHeader align="right">Fat ST</TableHeader>
                          <TableHeader align="right">Fat TB</TableHeader>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 bg-white">
                       {dataTipo.map((row, idx) => (
                          <tr key={`${row.TIPO_COD}-${idx}`} className="hover:bg-emerald-50/50 transition-colors">
                              <TableCell className="text-slate-500">{row.TIPO_COD}</TableCell>
                              <TableCell className="font-medium truncate max-w-[120px]" title={row.TIPO_DESC}>{row.TIPO_DESC}</TableCell>
                              <TableCell align="right" className="tabular-nums">{formatCurrency(row.TOT_VENDAS_ST)}</TableCell>
                              <TableCell align="right" className="tabular-nums">{formatCurrency(row.TOT_VENDAS_TRIB)}</TableCell>
                              <TableCell align="right" className="font-bold text-emerald-700 tabular-nums">{formatCurrency(row.TOT_VENDAS)}</TableCell>
                              <TableCell align="right" className="tabular-nums">{formatCurrency(row.FATOR_ST)}</TableCell>
                              <TableCell align="right" className="tabular-nums">{formatCurrency(row.FATOR_TRIB)}</TableCell>
                          </tr>
                      ))}
                       {dataTipo.length === 0 && !loading && (
                          <tr><td colSpan={7} className="p-12 text-center text-slate-400 text-sm italic">Sem dados de tipo.</td></tr>
                       )}
                  </tbody>
              </table>
           </div>
        </Card>

        {/* PARCEIROS */}
        <Card 
            title={
                <div className="flex justify-between w-full items-center">
                    <div className="flex items-center gap-3">
                        <span>Resumo por Parceiro</span>
                        {(filterPerfil !== 'Todos' || filterMin !== '' || filterMax !== '') && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                                Filtros Ativos
                                <button onClick={handleClearFilters} className="hover:text-red-600 transition-colors" title="Limpar Filtros"><X className="w-3 h-3" /></button>
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] md:text-xs font-normal normal-case bg-emerald-100 text-emerald-800 px-2 py-1 rounded border border-emerald-200">
                        Clique na linha para detalhar
                    </span>
                </div>
            }
            icon={<LayoutDashboard className="w-5 h-5" />}
            className="w-full min-h-[600px]"
        >
            <div className="overflow-auto h-[600px] scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-emerald-50/50">
                        <tr>
                            <TableHeader>Cód</TableHeader>
                            <TableHeader>Parceiro</TableHeader>
                            <TableHeader 
                                onFilter={() => handleOpenFilterModal('PERFIL')} 
                                isFiltered={filterPerfil !== 'Todos'}
                            >
                                Perfil Fat.
                            </TableHeader>
                            <TableHeader align="right">Qtd</TableHeader>
                            <TableHeader 
                                align="right" 
                                onFilter={() => handleOpenFilterModal('VLR_DEVOLUCAO')}
                                isFiltered={filterCol === 'VLR_DEVOLUCAO' && hasValueFilters}
                            >
                                Devolução
                            </TableHeader>
                            <TableHeader 
                                align="right"
                                onFilter={() => handleOpenFilterModal('VLR_VENDAS')}
                                isFiltered={filterCol === 'VLR_VENDAS' && hasValueFilters}
                            >
                                Vendas
                            </TableHeader>
                            <TableHeader 
                                align="right"
                                onFilter={() => handleOpenFilterModal('TOTAL')}
                                isFiltered={filterCol === 'TOTAL' && hasValueFilters}
                            >
                                Líquido
                            </TableHeader>
                            <TableHeader 
                                align="right"
                                onFilter={() => handleOpenFilterModal('TOTAL_ST')}
                                isFiltered={filterCol === 'TOTAL_ST' && hasValueFilters}
                            >
                                Tot. ST
                            </TableHeader>
                            <TableHeader 
                                align="right"
                                onFilter={() => handleOpenFilterModal('TOTAL_TRIB')}
                                isFiltered={filterCol === 'TOTAL_TRIB' && hasValueFilters}
                            >
                                Tot. Trib
                            </TableHeader>
                            <TableHeader 
                                align="right"
                                onFilter={() => handleOpenFilterModal('IMPOSTOST')}
                                isFiltered={filterCol === 'IMPOSTOST' && hasValueFilters}
                            >
                                Imp. ST
                            </TableHeader>
                            <TableHeader 
                                align="right"
                                onFilter={() => handleOpenFilterModal('IMPOSTOTRIB')}
                                isFiltered={filterCol === 'IMPOSTOTRIB' && hasValueFilters}
                            >
                                Imp. Trib
                            </TableHeader>
                            <TableHeader 
                                align="right"
                                onFilter={() => handleOpenFilterModal('IMPOSTOS')}
                                isFiltered={filterCol === 'IMPOSTOS' && hasValueFilters}
                            >
                                Impostos
                            </TableHeader>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                        {filteredParc.map((row) => {
                             const isSelected = selectedParc === row.CODPARC;
                             return (
                                <tr
                                    key={row.CODPARC}
                                    onClick={() => setSelectedParc(isSelected ? null : row.CODPARC)}
                                    className={`cursor-pointer transition-colors duration-150 ${
                                        isSelected 
                                        ? 'bg-emerald-50 text-emerald-900 border-l-4 border-l-emerald-600' 
                                        : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                                    }`}
                                >
                                    <TableCell className={isSelected ? 'font-bold' : ''}>{row.CODPARC}</TableCell>
                                    <TableCell className={`${isSelected ? 'font-bold' : ''} truncate max-w-[200px]`} title={row.NOMEPARC}>
                                        {row.NOMEPARC}
                                    </TableCell>
                                    <TableCell>{row.AD_TIPOCLIENTEFATURAR}</TableCell>
                                    <TableCell align="right">{row.QTD_NOTAS}</TableCell>
                                    <TableCell align="right" className="text-red-600 tabular-nums">{formatCurrency(row.VLR_DEVOLUCAO)}</TableCell>
                                    <TableCell align="right" className="text-emerald-700 tabular-nums">{formatCurrency(row.VLR_VENDAS)}</TableCell>
                                    <TableCell align="right" className="font-bold tabular-nums">{formatCurrency(row.TOTAL)}</TableCell>
                                    <TableCell align="right" className="tabular-nums text-slate-500">{formatCurrency(row.TOTAL_ST)}</TableCell>
                                    <TableCell align="right" className="tabular-nums text-slate-500">{formatCurrency(row.TOTAL_TRIB)}</TableCell>
                                    <TableCell align="right" className="tabular-nums">{formatCurrency(row.IMPOSTOST)}</TableCell>
                                    <TableCell align="right" className="tabular-nums">{formatCurrency(row.IMPOSTOTRIB)}</TableCell>
                                    <TableCell align="right" className="font-black text-emerald-700 tabular-nums bg-emerald-50/50">{formatCurrency(row.IMPOSTOS)}</TableCell>
                                </tr>
                             );
                        })}
                        {filteredParc.length === 0 && !loading && (
                            <tr>
                                <td colSpan={12} className="p-12 text-center text-slate-400 text-sm">
                                    Nenhum parceiro encontrado com os filtros selecionados.
                                    <div className="mt-4">
                                        <button 
                                            onClick={handleClearFilters}
                                            className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium hover:bg-emerald-200 transition-colors"
                                        >
                                            Limpar Filtros
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>

        {/* DETALHE - Slide Up Panel */}
        {selectedParc && (
             <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-emerald-600 transform transition-transform duration-300 max-h-[60vh] flex flex-col animate-fade-in-up">
                 <div className="bg-emerald-700 text-white px-6 py-3 flex justify-between items-center shadow-md">
                     <div className="flex items-center gap-3">
                         <div className="bg-white/10 p-1.5 rounded-lg">
                            <FileText className="w-5 h-5" />
                         </div>
                         <div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono bg-emerald-900 px-2 py-0.5 rounded text-xs text-emerald-100 border border-emerald-600">{selectedParc}</span>
                                <h3 className="font-bold text-sm uppercase tracking-wide">Detalhamento de Notas</h3>
                            </div>
                            <p className="text-[10px] text-emerald-200 mt-0.5">Visualizando notas fiscais vinculadas ao parceiro</p>
                         </div>
                     </div>
                     <button 
                        onClick={() => setSelectedParc(null)} 
                        className="bg-emerald-800 hover:bg-emerald-900 text-emerald-100 hover:text-white p-2 rounded-lg transition-all border border-emerald-600"
                        title="Fechar painel"
                     >
                        <ChevronRight className="w-5 h-5 rotate-90" />
                     </button>
                 </div>
                 <div className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
                     {loadingDetalhe ? (
                         <div className="flex flex-col justify-center items-center h-48 gap-3">
                             <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-200 border-t-emerald-600" />
                             <span className="text-emerald-700 font-medium text-sm animate-pulse">Carregando notas...</span>
                         </div>
                     ) : (
                         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-[1920px] mx-auto">
                            <table className="min-w-full divide-y divide-emerald-100">
                                <thead className="bg-emerald-50">
                                    <tr>
                                        <TableHeader>Nº Nota</TableHeader>
                                        <TableHeader>Data</TableHeader>
                                        <TableHeader align="center">TOP</TableHeader>
                                        <TableHeader align="right">Valor Líquido</TableHeader>
                                        <TableHeader align="right">Impostos (%)</TableHeader>
                                        <TableHeader align="right">Cód Emp</TableHeader>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-emerald-50">
                                    {dataDetalhe.map((nota, idx) => (
                                        <tr key={`${nota.NUMNOTA}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-medium text-emerald-900 bg-emerald-50/30">{nota.NUMNOTA}</TableCell>
                                            <TableCell>{formatDate(nota.DTNEG)}</TableCell>
                                            <TableCell align="center"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs border border-slate-200 font-medium">{nota.CODTIPOPER}</span></TableCell>
                                            <TableCell align="right" className="font-bold text-slate-800 tabular-nums">{formatCurrency(nota.VLRNOTA_AJUSTADO)}</TableCell>
                                            <TableCell align="right" className="text-slate-600 tabular-nums">{formatPercent(nota.IMPOSTOS)}</TableCell>
                                            <TableCell align="right" className="text-slate-400">{nota.CODEMP}</TableCell>
                                        </tr>
                                    ))}
                                    {dataDetalhe.length === 0 && (
                                        <tr><td colSpan={6} className="p-12 text-center text-slate-400 text-sm">Nenhuma nota encontrada para este parceiro.</td></tr>
                                    )}
                                </tbody>
                            </table>
                         </div>
                     )}
                 </div>
             </div>
        )}

      </main>

      {/* MODAL DE FILTROS */}
      {isFilterModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in-up">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200">
                  <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50/50 flex justify-between items-center">
                      <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                          <Filter className="w-4 h-4 text-emerald-600" />
                          Filtrar Parceiros
                      </h3>
                      <button 
                          onClick={() => setIsFilterModalOpen(false)}
                          className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-full hover:bg-slate-100"
                      >
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-5 space-y-4">
                      <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Perfil FAT</label>
                          <select
                              value={modalFilterPerfil}
                              onChange={(e) => setModalFilterPerfil(e.target.value)}
                              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-700"
                          >
                              <option value="Todos">Todos os Perfis</option>
                              {perfisFat.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                      </div>

                      <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Coluna de Valor</label>
                          <select
                              value={modalFilterCol}
                              onChange={(e) => setModalFilterCol(e.target.value as keyof ParceiroRow)}
                              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-700"
                          >
                              <option value="TOTAL">Total Líquido</option>
                              <option value="VLR_VENDAS">Total Vendas</option>
                              <option value="VLR_DEVOLUCAO">Devolução</option>
                              <option value="TOTAL_ST">Total ST</option>
                              <option value="TOTAL_TRIB">Total Trib.</option>
                              <option value="IMPOSTOST">Imp. ST</option>
                              <option value="IMPOSTOTRIB">Imp. Trib</option>
                              <option value="IMPOSTOS">Total Impostos</option>
                          </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mínimo (R$)</label>
                              <input
                                  type="number"
                                  value={modalFilterMin}
                                  onChange={(e) => setModalFilterMin(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-700"
                              />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Máximo (R$)</label>
                              <input
                                  type="number"
                                  value={modalFilterMax}
                                  onChange={(e) => setModalFilterMax(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-700"
                              />
                          </div>
                      </div>
                  </div>

                  <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <button 
                          onClick={handleClearFilters}
                          className="text-sm font-bold text-slate-500 hover:text-red-600 transition-colors"
                      >
                          Limpar
                      </button>
                      <div className="flex gap-2">
                          <button 
                              onClick={() => setIsFilterModalOpen(false)}
                              className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={handleApplyFilters}
                              className="px-4 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors"
                          >
                              Aplicar
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        @keyframes fadeInUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}