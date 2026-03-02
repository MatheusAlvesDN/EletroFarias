'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Calendar, 
  Server,
  Building2, 
  Loader2, 
  AlertCircle,
  Menu,
  MapPin,
  Truck,
  Calculator,
  CheckCircle2,
  X,
  LayoutDashboard,
  FileSpreadsheet
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
  CPF_CNPJ: string;
  CHAVE_ACESSO: string;
  CFOP: string | number;
  DESCRCFO: string;
  CST: string | number;
  VLRNOTA: number;
  CLASSE_CONTRIB: string;
  AD_TIPOCLIENTEFATURAR: string | number;
}

type GrupoTabela = 'VENDA DENTRO ESTADO' | 'VENDA FORA DO ESTADO' | '';

interface RowExcel {
  id: string;
  grupo: GrupoTabela;
  tributacao: string;
  cfop: string;
  descricao: string;
  valContrib: number;
  valNaoContrib: number;
  soma: number;
}

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
  roles?: string[];
  exp?: number;
  iat?: number;
};

// --- TIPOS PARA O PROCESSAMENTO DA ABA TARE ---
interface TabelaConfig {
  id: string;
  title: string;
  isContrib: boolean;
  isST: boolean;
  cfops: string[];
  tax: number;
}

interface RowApuracao {
  cfop: string;
  valor: number;
  taxValue: number;
}

interface BucketData {
  config: TabelaConfig;
  rowsList: RowApuracao[];
  totalBase: number;
  totalTax: number;
}

// Configuração estrita das 8 tabelas TARE conforme regra solicitada
const TABLES_CONFIG: TabelaConfig[] = [
  // CONTRIBUINTE + CONSTRUTORA
  { id: 'c_in_trib', title: 'vendas tributada(ST = 00) tare interna - 4%', isContrib: true, isST: false, cfops: ['5102', '5117', '1202'], tax: 0.04 },
  { id: 'c_out_trib', title: 'vendas tributada tare FORA PB - 1%', isContrib: true, isST: false, cfops: ['6102', '6117', '1202'], tax: 0.01 },
  { id: 'c_in_st', title: 'vendas ST tare interna - 0%', isContrib: true, isST: true, cfops: ['5117', '5405', '1411'], tax: 0 },
  { id: 'c_out_st', title: 'vendas st tare fora pb - 0%', isContrib: true, isST: true, cfops: ['6404', '2411'], tax: 0 },
  
  // NÃO CONTRIBUINTE
  { id: 'nc_in_trib', title: 'vendas tributada(ST = 00) tare interna - 20%', isContrib: false, isST: false, cfops: ['5102', '5117', '1202'], tax: 0.20 },
  { id: 'nc_in_st', title: 'vendas ST tare FORA PB - 4%', isContrib: false, isST: true, cfops: ['5117', '5405', '1411'], tax: 0.04 },
  { id: 'nc_out_st', title: 'vendas ST fora tare fora PB - 4%', isContrib: false, isST: true, cfops: ['6108', '2202'], tax: 0.04 },
  { id: 'nc_out_trib', title: 'vendas tributada fora tare fora pb - 4%', isContrib: false, isST: false, cfops: ['6108', '2202'], tax: 0.04 },
];

const CFOP_ENTRADAS_ICMS = [
  '1102', '1202', '1403', '1407', '1411', '1556', '1926', '1949', 
  '2102', '2202', '2353', '2411', '2403', '2556', '2949'
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

const FormatCurrencyExcel = ({ value }: { value: number }) => {
  const isNegative = value < 0;
  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value));
  return (
    <span className={isNegative ? 'text-rose-600 font-bold' : 'text-slate-700 font-medium'}>
      {isNegative ? `-R$ ${formatted.replace('R$', '').trim()}` : formatted}
    </span>
  );
};

const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(val));
const formatPercentRound = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
const formatPercent = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

export default function RelatorioIntegrado() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Estado das Abas
  const [activeTab, setActiveTab] = useState<'cfop' | 'tare'>('cfop');

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
    setUserEmail(decodeJwtEmail(t));
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

  const mesAno = useMemo(() => {
    if (!dtIni) return '';
    return new Date(dtIni + 'T00:00:00').toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  }, [dtIni]);

  // 🚀 FETCH INTEGRADO (Traz dados para ambas as abas)
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
        contrib: 'true', 
        nContrib: 'true' 
      }).toString();
      
      const res = await fetch(`${API_BASE}/sankhya/notas-detalhadas?${qs}`);
      
      if (!res.ok) throw new Error('Falha ao buscar os dados.');
      
      const json = await res.json();
      setData(json);
      if (json.length > 0) toast('Relatório gerado com sucesso.', 'success');
    } catch (err: any) {
      setError(err.message || 'Erro de conexão.');
      toast(err.message || 'Erro na consulta', 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 📊 LÓGICA DA ABA 1: RESUMO CFOP (MANTIDA INTACTA)
  // =========================================================================
  const tabCfopData = useMemo(() => {
    const cfopsPermitidos = ['5102', '5405', '5117', '6102', '6108', '6404', '6117', '1202', '1411', '2202', '2411'];
    const mapVendas = new Map<string, RowExcel>();
    const mapDev = new Map<string, RowExcel>();

    data.forEach(nota => {
      const cfop = String(nota.CFOP || '').trim();
      if (!cfopsPermitidos.includes(cfop)) return;

      const firstChar = cfop.charAt(0);
      const isVenda = firstChar === '5' || firstChar === '6';
      const isDev = firstChar === '1' || firstChar === '2';

      if (!isVenda && !isDev) return;

      const cst = String(nota.CST || '').trim();
      let tributacao = '';

      if (cfop === '5117') {
        if (cst === '10' || cst === '60') tributacao = 'ST';
        else if (cst === '00') tributacao = 'tributado';
        else return;
      }

      let valor = Number(nota.VLRNOTA) || 0;
      if (isDev) valor = -Math.abs(valor); 

      const key = cfop === '5117' ? `${cfop}-${tributacao}` : cfop; 
      const targetMap = isVenda ? mapVendas : mapDev;

      let grupoLocal: GrupoTabela = '';
      if (firstChar === '5') grupoLocal = 'VENDA DENTRO ESTADO';
      else if (firstChar === '6') grupoLocal = 'VENDA FORA DO ESTADO';

      if (!targetMap.has(key)) {
        targetMap.set(key, { id: key, grupo: grupoLocal, tributacao: tributacao, cfop, descricao: nota.DESCRCFO || '', valContrib: 0, valNaoContrib: 0, soma: 0 });
      }

      const row = targetMap.get(key)!;
      const isContrib = nota.CLASSE_CONTRIB === 'CONTRIBUINTE';

      if (isContrib) row.valContrib += valor;
      else row.valNaoContrib += valor;
      
      row.soma += valor;
    });

    const vendas = Array.from(mapVendas.values()).sort((a, b) => {
      if (a.grupo !== b.grupo) return b.grupo.localeCompare(a.grupo); 
      if (a.cfop !== b.cfop) return a.cfop.localeCompare(b.cfop);
      return b.tributacao.localeCompare(a.tributacao); 
    });

    const totaisVendas = vendas.reduce((acc, r) => ({
      valContrib: acc.valContrib + r.valContrib, valNaoContrib: acc.valNaoContrib + r.valNaoContrib, soma: acc.soma + r.soma
    }), { valContrib: 0, valNaoContrib: 0, soma: 0 });

    const devolucoes = Array.from(mapDev.values()).sort((a, b) => a.cfop.localeCompare(b.cfop));
    
    const totaisDevolucoes = devolucoes.reduce((acc, r) => ({
      valContrib: acc.valContrib + r.valContrib, valNaoContrib: acc.valNaoContrib + r.valNaoContrib, soma: acc.soma + r.soma
    }), { valContrib: 0, valNaoContrib: 0, soma: 0 });

    return { vendas, devolucoes, totaisVendas, totaisDevolucoes };
  }, [data]);

  const totalGeralVendas = tabCfopData.totaisVendas.soma + tabCfopData.totaisDevolucoes.soma;
  const vendasAtacado10 = totalGeralVendas * 0.10;
  const vendasVarejo7 = totalGeralVendas * 0.07;


  // =========================================================================
  // 📊 LÓGICA DA ABA 2: APURAÇÃO TARE
  // =========================================================================
  const tabTareData = useMemo(() => {
    const buckets: Record<string, BucketData> = {};
    const rowsMap: Record<string, Record<string, RowApuracao>> = {};

    TABLES_CONFIG.forEach(t => {
      buckets[t.id] = { config: t, rowsList: [], totalBase: 0, totalTax: 0 };
      rowsMap[t.id] = {};
      t.cfops.forEach(cfop => {
        rowsMap[t.id][cfop] = { cfop, valor: 0, taxValue: 0 };
      });
    });

    let baseEntradas00 = 0;

    data.forEach(nota => {
      const cfop = String(nota.CFOP || '').trim();
      const cst = String(nota.CST || '').trim();
      let valor = Number(nota.VLRNOTA) || 0;

      // 1. REGRA EXCLUSIVA: ENTRADAS DE ICMS TRIBUTADAS (CST 00)
      if (cst === '00' && CFOP_ENTRADAS_ICMS.includes(cfop)) {
        baseEntradas00 += Math.abs(valor);
      }

      // 2. DISTRIBUIÇÃO DAS 8 TABELAS DE VENDAS/DEVOLUÇÕES
      const firstChar = cfop.charAt(0);
      const isContrib = nota.CLASSE_CONTRIB === 'CONTRIBUINTE';
      
      let isST = false;
      let isTrib = false;

      if (cst === '10' || cst === '60') isST = true;
      else if (cst === '00') isTrib = true;

      // Se for devolução (1, 2)
      if (firstChar === '1' || firstChar === '2') valor = -Math.abs(valor); 

      if (!isST && !isTrib) return;

      const bucketId = TABLES_CONFIG.find(b => 
        b.isContrib === isContrib && 
        b.isST === isST && 
        b.cfops.includes(cfop)
      )?.id;

      if (bucketId) {
        rowsMap[bucketId][cfop].valor += valor;
        buckets[bucketId].totalBase += valor;
      }
    });

    Object.keys(buckets).forEach(key => {
      const bucket = buckets[key];
      bucket.rowsList = bucket.config.cfops.map(cfop => rowsMap[key][cfop]);
      bucket.rowsList.forEach(r => {
        r.taxValue = r.valor * bucket.config.tax;
      });
      bucket.totalTax = bucket.totalBase * bucket.config.tax;
    });

    return { buckets, baseEntradas00 };
  }, [data]);

  const { buckets, baseEntradas00 } = tabTareData;

  // Cálculos de Rodapé TARE
  const vlrContrib = buckets['c_in_trib']?.totalBase + buckets['c_out_trib']?.totalBase + buckets['c_in_st']?.totalBase + buckets['c_out_st']?.totalBase;
  const vlrNaoContrib = buckets['nc_in_trib']?.totalBase + buckets['nc_in_st']?.totalBase + buckets['nc_out_st']?.totalBase + buckets['nc_out_trib']?.totalBase;
  const totalLiq = (vlrContrib || 0) + (vlrNaoContrib || 0);
  const pctLiqContrib = totalLiq ? (vlrContrib / totalLiq) : 0;
  const pctLiqNaoContrib = totalLiq ? (vlrNaoContrib / totalLiq) : 0;

  const apForaInterna = buckets['nc_in_st']?.totalBase || 0; 
  const apForaPB = buckets['nc_out_st']?.totalBase || 0;      
  const totalApFora = apForaInterna + apForaPB;
  const taxApForaInterna = buckets['nc_in_st']?.totalTax || 0;
  const taxApForaPB = buckets['nc_out_st']?.totalTax || 0;
  const totalTaxApFora = taxApForaInterna + taxApForaPB;

  const tribContrib = buckets['c_in_trib']?.totalBase || 0; 
  const tribNaoContrib = buckets['nc_in_trib']?.totalBase || 0;
  const totalTrib = tribContrib + tribNaoContrib;
  const pctTribContrib = totalTrib ? (tribContrib / totalTrib) : 0;
  const pctTribNaoContrib = totalTrib ? (tribNaoContrib / totalTrib) : 0;

  const apNorm20 = buckets['nc_in_trib']?.totalTax || 0;
  const apNorm4 = buckets['c_in_trib']?.totalTax || 0;
  const apNorm1 = buckets['c_out_trib']?.totalTax || 0;
  const totalApNormal = apNorm20 + apNorm4 + apNorm1;

  const creditoCalculado = baseEntradas00 * pctTribNaoContrib;
  const saldoFinal = totalApNormal - creditoCalculado;

  // --- Função Renderizadora da Tabela TARE ---
  const renderBucketTable = (bucketId: string) => {
    const bucket = buckets[bucketId];
    if (!bucket) return null;

    return (
      <table className="w-full border-collapse border border-black text-[11px] font-medium bg-white mb-6 shadow-sm">
        <thead>
          <tr>
            <th colSpan={5} className="border border-black px-2 py-1.5 text-center font-bold uppercase bg-yellow-300 text-black">
              {bucket.config.title}
            </th>
          </tr>
        </thead>
        <tbody>
          {bucket.rowsList.map(r => (
            <tr key={r.cfop}>
              <td className={`border border-black px-2 py-1 text-center w-16 font-mono ${r.valor < 0 ? 'text-red-600 font-bold' : ''}`}>{r.cfop}</td>
              <td className={`border border-black px-1 py-1 text-left w-8 ${r.valor < 0 ? 'text-red-600' : ''}`}>{r.valor < 0 ? '-R$' : 'R$'}</td>
              <td className={`border border-black px-2 py-1 text-right tabular-nums w-28 ${r.valor < 0 ? 'text-red-600 font-bold' : ''}`}>{formatNumber(r.valor)}</td>
              <td className={`border border-black px-1 py-1 text-left w-8 ${r.taxValue < 0 ? 'text-red-600' : ''}`}>{bucket.config.tax > 0 ? (r.taxValue < 0 ? '-R$' : 'R$') : ''}</td>
              <td className={`border border-black px-2 py-1 text-right tabular-nums w-28 ${r.taxValue < 0 ? 'text-red-600 font-bold' : ''}`}>
                {bucket.config.tax > 0 ? formatNumber(r.taxValue) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 font-bold">
            <td className="border border-black px-2 py-1 text-center uppercase text-black">total</td>
            <td className={`border border-black px-1 py-1 text-left ${bucket.totalBase < 0 ? 'text-red-600' : ''}`}>{bucket.totalBase < 0 ? '-R$' : 'R$'}</td>
            <td className={`border border-black px-2 py-1 text-right tabular-nums ${bucket.totalBase < 0 ? 'text-red-600' : ''}`}>{formatNumber(bucket.totalBase)}</td>
            <td className={`border border-black px-1 py-1 text-left ${bucket.totalTax < 0 ? 'text-red-600' : ''}`}>{bucket.config.tax > 0 ? (bucket.totalTax < 0 ? '-R$' : 'R$') : ''}</td>
            <td className={`border border-black px-2 py-1 text-right tabular-nums ${bucket.totalTax < 0 ? 'text-red-600' : ''}`}>
              {bucket.config.tax > 0 ? formatNumber(bucket.totalTax) : '-'}
            </td>
          </tr>
        </tfoot>
      </table>
    );
  };


  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
      {/* Botão flutuante sidebar */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-emerald-800 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        title="Abrir Menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} userEmail={userEmail} onLogout={handleLogout} />

      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 opacity-90 text-emerald-100" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Painel Gerencial</h1>
                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                  Fiscal & Contábil
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <img src="/eletro_farias2.png" alt="Logo 1" className="h-16 w-auto object-contain bg-green/10 rounded px-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <img src="/lid-verde-branco.png" alt="Logo 2" className="h-12 w-auto object-contain hidden md:block" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 animate-fade-in-up">
        
        {/* FILTROS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-6">
          <form onSubmit={fetchNotas} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Empresa
              </label>
              <input type="number" required value={codEmp} onChange={(e) => setCodEmp(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-sm" />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Data Inicial
              </label>
              <input type="date" required value={dtIni} onChange={(e) => setDtIni(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-sm text-slate-700" />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Data Final
              </label>
              <input type="date" required value={dtFim} onChange={(e) => setDtFim(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-sm text-slate-700" />
            </div>
            <button type="submit" disabled={loading} className="w-full md:w-auto px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 h-[42px] mt-2 md:mt-0">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              <span>{loading ? 'Calculando...' : 'Consultar'}</span>
            </button>
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

        {/* NAVEGAÇÃO POR ABAS */}
        {data.length > 0 && (
          <div className="flex gap-2 sm:gap-6 mb-6 border-b border-slate-200 overflow-x-auto custom-table-scroll">
            <button 
              onClick={() => setActiveTab('cfop')} 
              className={`pb-3 px-2 flex items-center gap-2 font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'cfop' ? 'text-emerald-700 border-b-2 border-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutDashboard className="w-4 h-4" /> Resumo por CFOP
            </button>
            <button 
              onClick={() => setActiveTab('tare')} 
              className={`pb-3 px-2 flex items-center gap-2 font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'tare' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileSpreadsheet className="w-4 h-4" /> Apuração TARE (Detalhamento)
            </button>
          </div>
        )}

        {data.length > 0 && (
          <div className="animate-fade-in-up">
            
            {/* =========================================================
                ABA 1: RESUMO POR CFOP
            ========================================================= */}
            {activeTab === 'cfop' && (
              <div className="flex flex-col gap-6">
                {/* VENDAS */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl shadow-sm border border-emerald-200 text-emerald-600">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-emerald-900 uppercase tracking-wide">Vendas - {mesAno}</h2>
                        <p className="text-[10px] sm:text-xs text-emerald-700/70 font-bold uppercase tracking-wider mt-0.5">Saídas Internas e Interestaduais</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto p-0 custom-table-scroll">
                    <table className="w-full border-collapse text-xs font-medium font-sans min-w-[900px]">
                      <colgroup>
                        <col className="w-12 bg-slate-50/50" />
                        <col className="w-[120px]" />
                        <col className="w-auto" />
                        <col className="w-[200px]" />
                        <col className="w-[150px]" />
                        <col className="w-[120px]" />
                      </colgroup>
                      <thead>
                        <tr className="bg-slate-100/50">
                          <th className="border-b border-r border-slate-200 p-2 sm:p-3 text-center font-bold text-[10px] uppercase tracking-wider text-slate-500"></th>
                          <th className="border-b border-r border-slate-200 p-2 sm:p-3 text-center font-bold text-[10px] uppercase tracking-wider text-slate-600">CFOP</th>
                          <th className="border-b border-r border-slate-200 p-2 sm:p-3 text-left font-bold text-[10px] uppercase tracking-wider text-slate-600">DESCRIÇÃO CFOP</th>
                          <th className="border-b border-r border-slate-200 p-2 sm:p-3 text-right font-bold text-[10px] uppercase tracking-wider text-slate-600">CONTRIBUINTE+CONSTRUTORA</th>
                          <th className="border-b border-r border-slate-200 p-2 sm:p-3 text-right font-bold text-[10px] uppercase tracking-wider text-slate-600">NÃO CONTRIBUINTE</th>
                          <th className="border-b border-slate-200 p-2 sm:p-3 text-right font-bold text-[10px] uppercase tracking-wider text-slate-600">SOMA</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {tabCfopData.vendas.length === 0 ? (
                          <tr><td colSpan={6} className="border-b border-slate-200 p-6 text-center text-slate-400 italic">Sem dados de Venda no período</td></tr>
                        ) : (
                          tabCfopData.vendas.map((row, i) => {
                            const isFirstInGroup = i === 0 || row.grupo !== tabCfopData.vendas[i - 1]?.grupo;
                            const groupCount = tabCfopData.vendas.filter(v => v.grupo === row.grupo).length;
                            const displayCfop = row.cfop === '5117' ? `5117 ${row.tributacao}` : row.cfop;

                            return (
                              <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                                {isFirstInGroup && (
                                  <td rowSpan={groupCount} className="border-b border-r border-slate-200 align-middle bg-slate-50/50">
                                    <div className="flex items-center justify-center h-full min-h-[60px]">
                                      <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-[10px] font-bold text-slate-500 tracking-widest whitespace-nowrap px-1 py-2 uppercase">
                                        {row.grupo}
                                      </span>
                                    </div>
                                  </td>
                                )}
                                <td className="border-b border-r border-slate-200 px-3 py-2 text-center whitespace-nowrap font-mono text-slate-600">{displayCfop}</td>
                                <td className="border-b border-r border-slate-200 px-3 py-2 text-left truncate text-slate-700">{row.descricao}</td>
                                <td className="border-b border-r border-slate-200 px-3 py-2 text-right tabular-nums"><FormatCurrencyExcel value={row.valContrib} /></td>
                                <td className="border-b border-r border-slate-200 px-3 py-2 text-right tabular-nums"><FormatCurrencyExcel value={row.valNaoContrib} /></td>
                                <td className="border-b border-slate-200 px-3 py-2 text-right tabular-nums bg-slate-50/50"><FormatCurrencyExcel value={row.soma} /></td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {tabCfopData.vendas.length > 0 && (
                        <tfoot className="bg-slate-50 border-t border-slate-300">
                          <tr>
                            <td colSpan={3} className="border-r border-slate-200 px-3 py-2.5 text-right font-black text-slate-800 uppercase tracking-widest">TOTAL</td>
                            <td className="border-r border-slate-200 px-3 py-2.5 text-right font-bold tabular-nums"><FormatCurrencyExcel value={tabCfopData.totaisVendas.valContrib} /></td>
                            <td className="border-r border-slate-200 px-3 py-2.5 text-right font-bold tabular-nums"><FormatCurrencyExcel value={tabCfopData.totaisVendas.valNaoContrib} /></td>
                            <td className="px-3 py-2.5 text-right font-black tabular-nums bg-slate-100/80"><FormatCurrencyExcel value={tabCfopData.totaisVendas.soma} /></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* DEVOLUÇÕES */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-blue-100 bg-blue-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl shadow-sm border border-blue-200 text-blue-600">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-blue-900 uppercase tracking-wide">Devolução Vendas - {mesAno}</h2>
                        <p className="text-[10px] sm:text-xs text-blue-700/70 font-bold uppercase tracking-wider mt-0.5">CFOPs Iniciados em 1 ou 2</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto p-0 custom-table-scroll">
                    <table className="w-full border-collapse text-xs font-medium font-sans min-w-[900px]">
                      <colgroup>
                        <col className="w-12 bg-slate-50/50" /> 
                        <col className="w-[120px]" />
                        <col className="w-auto" />
                        <col className="w-[200px]" />
                        <col className="w-[150px]" />
                        <col className="w-[120px]" />
                      </colgroup>
                      <thead>
                        <tr className="bg-slate-100/50">
                          <th className="border-b border-r border-slate-200 p-2 sm:p-3 text-center font-bold text-[10px] uppercase tracking-wider text-slate-500"></th>
                          <th className="border-b border-r border-slate-200 p-2 sm:p-3 text-center font-bold text-[10px] uppercase tracking-wider text-slate-600">CFOP</th>
                          <th className="border-b border-r border-slate-200 p-2 sm:p-3 text-left font-bold text-[10px] uppercase tracking-wider text-slate-600">DESCRIÇÃO CFOP</th>
                          <th className="border-b border-r border-slate-200 p-2 sm:p-3 text-right font-bold text-[10px] uppercase tracking-wider text-slate-600">CONTRIBUINTE+CONSTRUTORA</th>
                          <th className="border-b border-r border-slate-200 p-2 sm:p-3 text-right font-bold text-[10px] uppercase tracking-wider text-slate-600">NÃO CONTRIBUINTE</th>
                          <th className="border-b border-slate-200 p-2 sm:p-3 text-right font-bold text-[10px] uppercase tracking-wider text-slate-600">SOMA</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {tabCfopData.devolucoes.length === 0 ? (
                          <tr><td colSpan={6} className="border-b border-slate-200 p-6 text-center text-slate-400 italic">Sem dados de Devolução no período</td></tr>
                        ) : (
                          tabCfopData.devolucoes.map((row, idx) => (
                            <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                              {idx === 0 ? (
                                <td rowSpan={tabCfopData.devolucoes.length} className="border-b border-r border-slate-200 align-middle bg-slate-50/50">
                                  <div className="flex items-center justify-center h-full min-h-[60px]">
                                    <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-[10px] font-bold text-slate-500 tracking-widest whitespace-nowrap px-1 py-2 uppercase">
                                      DEVOLUÇÕES
                                    </span>
                                  </div>
                                </td>
                              ) : null}
                              <td className="border-b border-r border-slate-200 px-3 py-2 text-center whitespace-nowrap font-mono text-slate-600">{row.cfop}</td>
                              <td className="border-b border-r border-slate-200 px-3 py-2 text-left truncate text-slate-700">{row.descricao}</td>
                              <td className="border-b border-r border-slate-200 px-3 py-2 text-right tabular-nums"><FormatCurrencyExcel value={row.valContrib} /></td>
                              <td className="border-b border-r border-slate-200 px-3 py-2 text-right tabular-nums"><FormatCurrencyExcel value={row.valNaoContrib} /></td>
                              <td className="border-b border-slate-200 px-3 py-2 text-right tabular-nums bg-slate-50/50"><FormatCurrencyExcel value={row.soma} /></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {tabCfopData.devolucoes.length > 0 && (
                        <tfoot className="bg-slate-50 border-t border-slate-300">
                          <tr>
                            <td colSpan={3} className="border-r border-slate-200 px-3 py-2.5 text-right font-black text-slate-800 uppercase tracking-widest">TOTAL</td>
                            <td className="border-r border-slate-200 px-3 py-2.5 text-right font-bold tabular-nums"><FormatCurrencyExcel value={tabCfopData.totaisDevolucoes.valContrib} /></td>
                            <td className="border-r border-slate-200 px-3 py-2.5 text-right font-bold tabular-nums"><FormatCurrencyExcel value={tabCfopData.totaisDevolucoes.valNaoContrib} /></td>
                            <td className="px-3 py-2.5 text-right font-black tabular-nums bg-slate-100/80"><FormatCurrencyExcel value={tabCfopData.totaisDevolucoes.soma} /></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* TOTAIS E PORCENTAGENS */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-2">
                  <div className="px-5 py-4 border-b border-purple-100 bg-purple-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl shadow-sm border border-purple-200 text-purple-600">
                        <Calculator className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-purple-900 uppercase tracking-wide">Apuração de Valores</h2>
                        <p className="text-[10px] sm:text-xs text-purple-700/70 font-bold uppercase tracking-wider mt-0.5">Líquido e Estimativas</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto p-0 custom-table-scroll">
                    <table className="w-full border-collapse text-xs font-medium font-sans min-w-[900px]">
                      <colgroup>
                        <col className="w-12" />
                        <col className="w-[120px]" />
                        <col className="w-auto" />
                        <col className="w-[200px]" />
                        <col className="w-[150px]" />
                        <col className="w-[120px]" />
                      </colgroup>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="bg-emerald-50/50 hover:bg-emerald-100/50 transition-colors">
                          <td colSpan={5} className="px-4 py-3 text-right font-black text-emerald-900 uppercase tracking-widest border-r border-slate-200">
                            TOTAL LÍQUIDO DE VENDAS (VENDAS - DEVOLUÇÕES)
                          </td>
                          <td className="px-4 py-3 text-right font-black tabular-nums text-emerald-700 text-sm">
                            <FormatCurrencyExcel value={totalGeralVendas} />
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td colSpan={5} className="px-4 py-3 text-right font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200">
                            ESTIMATIVA VENDAS ATACADO / INDÚSTRIA (10%)
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-800">
                            <FormatCurrencyExcel value={vendasAtacado10} />
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td colSpan={5} className="px-4 py-3 text-right font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200">
                            ESTIMATIVA VENDAS NO VAREJO (7%)
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-800">
                            <FormatCurrencyExcel value={vendasVarejo7} />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                ABA 2: APURAÇÃO TARE
            ========================================================= */}
            {activeTab === 'tare' && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-300 overflow-x-auto custom-table-scroll">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start min-w-[1000px]">
                  
                  {/* COLUNA ESQUERDA: CONTRIBUINTE + CONSTRUTORA */}
                  <div>
                    <h2 className="text-center font-bold text-sm uppercase mb-4 border-b border-black pb-1">contribuinte + construtora</h2>
                    {renderBucketTable('c_in_trib')}
                    {renderBucketTable('c_out_trib')}
                    {renderBucketTable('c_in_st')}
                    {renderBucketTable('c_out_st')}
                    
                    {/* Resumo Venda Liq */}
                    <table className="w-full border-collapse border border-black text-[11px] font-medium bg-white mb-6 shadow-sm">
                      <tbody>
                        <tr>
                          <td className="border border-black px-2 py-1 uppercase">VENDA LIQ TARE CONTRIBUINTE</td>
                          <td className="border border-black px-1 py-1 text-left w-8">R$</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums w-28">{formatNumber(vlrContrib)}</td>
                          <td className="border border-black px-2 py-1 text-right w-16">{formatPercent(pctLiqContrib)}</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 py-1 uppercase">VENDA LIQ FORA TARE NÃO CONTRIBUINTE</td>
                          <td className="border border-black px-1 py-1 text-left">R$</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums">{formatNumber(vlrNaoContrib)}</td>
                          <td className="border border-black px-2 py-1 text-right">{formatPercent(pctLiqNaoContrib)}</td>
                        </tr>
                        <tr className="font-bold bg-slate-50">
                          <td className="border border-black px-2 py-1 uppercase">TOTAL</td>
                          <td className="border border-black px-1 py-1 text-left">R$</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums">{formatNumber(totalLiq)}</td>
                          <td className="border border-black px-2 py-1"></td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Resumo Venda Tributado */}
                    <table className="w-full border-collapse border border-black text-[11px] font-medium bg-white mb-6 shadow-sm mt-12">
                      <tbody>
                        <tr>
                          <td className="border border-black px-2 py-1 uppercase">VENDA TRIBUTADO CONTRIBUINTE</td>
                          <td className="border border-black px-1 py-1 text-left w-8">R$</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums w-28">{formatNumber(tribContrib)}</td>
                          <td className="border border-black px-2 py-1 text-right w-16">{formatPercentRound(pctTribContrib)}</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 py-1 uppercase">VENDA TRIBUTADO NAO CONTRIBUINTE</td>
                          <td className="border border-black px-1 py-1 text-left">R$</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums">{formatNumber(tribNaoContrib)}</td>
                          <td className="border border-black px-2 py-1 text-right bg-emerald-400 font-bold text-black">{formatPercentRound(pctTribNaoContrib)}</td>
                        </tr>
                        <tr className="font-bold bg-slate-50">
                          <td className="border border-black px-2 py-1 uppercase">TOTAL</td>
                          <td className="border border-black px-1 py-1 text-left">R$</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums">{formatNumber(totalTrib)}</td>
                          <td className="border border-black px-2 py-1"></td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Apuracao Normal */}
                    <table className="w-full border-collapse border border-black text-[11px] font-medium bg-white mb-6 shadow-sm mt-8">
                      <thead>
                        <tr>
                          <th colSpan={3} className="border border-black px-2 py-1 text-center font-normal uppercase">APURACAO NORMAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black px-2 py-1">Vendas tributada tare interna 20%</td>
                          <td className="border border-black px-1 py-1 text-left w-8">R$</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums w-28">{formatNumber(apNorm20)}</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 py-1">vendas tributada tare interna - 4%</td>
                          <td className="border border-black px-1 py-1 text-left">R$</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums">{formatNumber(apNorm4)}</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 py-1">vendas tributada tare FORA PB - 1%</td>
                          <td className="border border-black px-1 py-1 text-left">R$</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums">{formatNumber(apNorm1)}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-slate-50">
                          <td className="border border-black px-2 py-1 text-right uppercase">TOTAL</td>
                          <td className="border border-black px-1 py-1 text-left">R$</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums">{formatNumber(totalApNormal)}</td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Entrada ICMS (Apuracao Final) */}
                    <table className="w-full border-collapse border border-black text-[11px] font-medium bg-white shadow-sm mt-8">
                      <thead>
                        <tr>
                          <th colSpan={3} className="border border-black px-2 py-1 text-center font-normal uppercase">ENTRADA DE ICMS TRIBUTADA produto 00</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black px-2 py-1 text-[9px] tracking-tighter text-slate-700" colSpan={3}>
                            1102 1202 1403 1407 1411 1556 1926 1949 <br />
                            2102 2202 2353 2411 2403 2556 2949
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 py-1 font-bold text-right text-[10px]">TOTAL APURADO DAS ENTRADAS</td>
                          <td className="border border-black px-1 py-1 text-left w-8">R$</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums w-28">{formatNumber(baseEntradas00)}</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 py-1 font-bold uppercase text-right text-[10px]">VALOR DO CREDITO (Base * Pct. N.Contrib)</td>
                          <td className="border border-black px-1 py-1 text-left font-bold">R$</td>
                          <td className="border border-black px-2 py-1 text-right font-bold tabular-nums text-emerald-700">
                            {formatNumber(creditoCalculado)}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 py-1 font-bold uppercase text-right">VALOR A PAGAR</td>
                          <td className="border border-black px-1 py-1 text-left">R$</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums">{formatNumber(totalApNormal)}</td>
                        </tr>
                        <tr className="bg-slate-100">
                          <td className="border border-black px-2 py-1 font-bold uppercase text-right">SALDO</td>
                          <td className={`border border-black px-1 py-1 text-left font-bold ${saldoFinal < 0 ? 'text-red-600' : ''}`}>{saldoFinal < 0 ? '-R$' : 'R$'}</td>
                          <td className={`border border-black px-2 py-1 text-right font-bold tabular-nums ${saldoFinal < 0 ? 'text-red-600' : ''}`}>{formatNumber(saldoFinal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* COLUNA DIREITA: NÃO CONTRIBUINTE */}
                  <div>
                    <h2 className="text-center font-bold text-sm uppercase mb-4 border-b border-black pb-1">nao contribuinte (PF, Juridica sem IE)</h2>
                    {renderBucketTable('nc_in_trib')}
                    {renderBucketTable('nc_in_st')}
                    {renderBucketTable('nc_out_st')}
                    {renderBucketTable('nc_out_trib')}
                    
                    {/* Apuracao Fora Tare */}
                    <table className="w-full border-collapse border border-black text-[11px] font-medium bg-white shadow-sm mt-[95px]">
                      <thead>
                        <tr>
                          <th colSpan={4} className="border border-black px-2 py-1 text-center font-normal uppercase">
                            APURACAO FORA TARE - VENDAS NAO CONTRIBUINTE - APURACAO ST - (1132) - 4%
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black px-2 py-1 uppercase">VENDA INTERNA</td>
                          <td className="border border-black px-1 py-1 text-left w-8">R$</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums w-28">{formatNumber(apForaInterna)}</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums w-28">{formatNumber(taxApForaInterna)}</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 py-1 uppercase">VENDA FORA PB</td>
                          <td className="border border-black px-1 py-1 text-left">R$</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums">{formatNumber(apForaPB)}</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums">{formatNumber(taxApForaPB)}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-slate-50">
                          <td className="border border-black px-2 py-1 text-center uppercase">TOTAL</td>
                          <td className="border border-black px-1 py-1 text-left"></td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums">{formatNumber(totalApFora)}</td>
                          <td className="border border-black px-2 py-1 text-right tabular-nums">{formatNumber(totalTaxApFora)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Snackbar / Toast Customizado */}
      <div 
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-in-out ${
          toastState.open ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
      >
        <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm ${
          toastState.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'
        }`}>
          {toastState.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toastState.msg}
          <button 
            type="button"
            onClick={() => setToastState(s => ({ ...s, open: false }))} 
            className="ml-2 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

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
      `}</style>
    </div>
  );
}