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
  FileText,
  Users,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Receipt,
  Tags,
  FileDown
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

// --- Tipagens ---
interface NotaMes {
  NUNOTA: number;
  NUMNOTA: number;
  CODTIPOPER: number;
  DTREF?: string;
  DTNEG: string;
  DTENTSAI?: string;
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
  AD_TIPOCLIENTEFATURAR_DESC?: string;
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

// --- Tipos TARE ---
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

// --- Mapeamento do Tipo de Cliente (Sankhya) ---
const TIPOS_CLIENTE: Record<string, string> = {
  '1': 'Construtora',
  '2': 'Pessoa Fisica',
  '3': 'Juridica sem IE',
  '4': 'Juridica com IE',
  '5': 'Atacadista / Industria',
  '6': 'Fora do estado com IE',
  '7': 'Fora do estado (PF+PJ sem IE+Construtora)'
};

// Configuração estrita das 8 tabelas TARE conforme regra
const TABLES_CONFIG: TabelaConfig[] = [
  { id: 'c_in_trib', title: 'vendas tributada - c/Tare DENTRO PB - 4%', isContrib: true, isST: false, cfops: ['5102', '5117', '1202'], tax: 0.04 },
  { id: 'c_out_trib', title: 'vendas tributada - c/Tare FORA PB - 1%', isContrib: true, isST: false, cfops: ['6102', '6117', '1202'], tax: 0.01 },
  { id: 'c_in_st', title: 'vendas ST - c/tare dentro pb - 0%', isContrib: true, isST: true, cfops: ['5117', '5405', '1411'], tax: 0 },
  { id: 'c_out_st', title: 'vendas st - c/tare fora pb - 0%', isContrib: true, isST: true, cfops: ['6404', '2411'], tax: 0 },
  { id: 'nc_in_trib', title: 'vendas tributada - s/tare dentro pb - 20%', isContrib: false, isST: false, cfops: ['5102', '5117', '1202'], tax: 0.20 },
  { id: 'nc_out_trib', title: 'vendas tributada - s/tare fora pb - 4%', isContrib: false, isST: false, cfops: ['6108', '6117', '2202'], tax: 0.04 },
  { id: 'nc_in_st', title: 'vendas ST - s/tare dentro PB - 4%', isContrib: false, isST: true, cfops: ['5117', '5405', '1411'], tax: 0.04 },
  { id: 'nc_out_st', title: 'vendas ST - s/tare fora PB - 4%', isContrib: false, isST: true, cfops: ['6108', '2202'], tax: 0.04 },
];

const CFOP_ENTRADAS_ICMS = [
  '1102', '2102'
];

// --- Funções Auxiliares ---
function safeString(v: any) { 
  if (v === null || v === undefined) return ''; 
  if (typeof v === 'string') return v; 
  if (typeof v === 'number' || typeof v === 'boolean') return String(v); 
  try { return JSON.stringify(v); } catch { return String(v); } 
}

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

const formatDif = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const formatNumberForSearch = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

const formatPercentRound = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
const formatPercent = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

// --- Componente de Bloco de Apuração Comercial ---
const TabelaApuracao = ({
  titulo,
  subtitulo,
  totaisTributacao,
  totalGeral,
  estimativaAtacado,
  estimativaVarejo
}: {
  titulo: string;
  subtitulo: string;
  totaisTributacao: { tributado: number, st: number };
  totalGeral: number;
  estimativaAtacado: number;
  estimativaVarejo: number;
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-2">
    <div className="px-5 py-4 border-b border-purple-100 bg-purple-50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-xl shadow-sm border border-purple-200 text-purple-600">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-bold text-purple-900 uppercase tracking-wide">{titulo}</h2>
          <p className="text-[10px] sm:text-xs text-purple-700/70 font-bold uppercase tracking-wider mt-0.5">{subtitulo}</p>
        </div>
      </div>
    </div>

    <div className="overflow-x-auto p-0">
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
            <td colSpan={3} className="px-4 py-3 text-right font-black text-emerald-900 uppercase tracking-widest border-r border-slate-200 align-middle">
              TOTAL LÍQUIDO DE VENDAS (VENDAS - DEVOLUÇÕES)
            </td>
            <td className="px-4 py-2 text-right border-r border-slate-200 align-middle">
              <div className="text-[10px] text-emerald-700/70 font-bold uppercase mb-0.5">Tributado (CST 00)</div>
              <div className="font-bold tabular-nums text-emerald-700"><FormatCurrencyExcel value={totaisTributacao.tributado} /></div>
            </td>
            <td className="px-4 py-2 text-right border-r border-slate-200 align-middle">
              <div className="text-[10px] text-emerald-700/70 font-bold uppercase mb-0.5">ST (CST 10, 60, etc)</div>
              <div className="font-bold tabular-nums text-emerald-700"><FormatCurrencyExcel value={totaisTributacao.st} /></div>
            </td>
            <td className="px-4 py-2 text-right align-middle bg-emerald-100/50">
              <div className="text-[10px] text-emerald-900/70 font-black uppercase mb-0.5">Total Geral</div>
              <div className="font-black tabular-nums text-emerald-900 text-sm"><FormatCurrencyExcel value={totalGeral} /></div>
            </td>
          </tr>

          <tr className="bg-emerald-50/50 hover:bg-emerald-100/50 transition-colors">
            <td colSpan={3} className="px-4 py-3 text-right font-black text-emerald-900 uppercase tracking-widest border-r border-slate-200 align-middle">
              ESTIMATIVA VENDAS ATACADO / INDÚSTRIA (10%)
            </td>
            <td className="px-4 py-2 text-right border-r border-slate-200 align-middle">
              <div className="text-[10px] text-emerald-700/70 font-bold uppercase mb-0.5">Tributado (CST 00)</div>
              <div className="font-bold tabular-nums text-emerald-700"><FormatCurrencyExcel value={totaisTributacao.tributado * 0.10} /></div>
            </td>
            <td className="px-4 py-2 text-right border-r border-slate-200 align-middle">
              <div className="text-[10px] text-emerald-700/70 font-bold uppercase mb-0.5">ST (CST 10, 60, etc)</div>
              <div className="font-bold tabular-nums text-emerald-700"><FormatCurrencyExcel value={totaisTributacao.st * 0.10} /></div>
            </td>
            <td className="px-4 py-2 text-right align-middle bg-emerald-100/50">
              <div className="text-[10px] text-emerald-900/70 font-black uppercase mb-0.5">Total Atacado</div>
              <div className="font-black tabular-nums text-emerald-900 text-sm"><FormatCurrencyExcel value={estimativaAtacado} /></div>
            </td>
          </tr>

          <tr className="bg-emerald-50/50 hover:bg-emerald-100/50 transition-colors">
            <td colSpan={3} className="px-4 py-3 text-right font-black text-emerald-900 uppercase tracking-widest border-r border-slate-200 align-middle">
              ESTIMATIVA VENDAS NO VAREJO (7%)
            </td>
            <td className="px-4 py-2 text-right border-r border-slate-200 align-middle">
              <div className="text-[10px] text-emerald-700/70 font-bold uppercase mb-0.5">Tributado (CST 00)</div>
              <div className="font-bold tabular-nums text-emerald-700"><FormatCurrencyExcel value={totaisTributacao.tributado * 0.07} /></div>
            </td>
            <td className="px-4 py-2 text-right border-r border-slate-200 align-middle">
              <div className="text-[10px] text-emerald-700/70 font-bold uppercase mb-0.5">ST (CST 10, 60, etc)</div>
              <div className="font-bold tabular-nums text-emerald-700"><FormatCurrencyExcel value={totaisTributacao.st * 0.07} /></div>
            </td>
            <td className="px-4 py-2 text-right align-middle bg-emerald-100/50">
              <div className="text-[10px] text-emerald-900/70 font-black uppercase mb-0.5">Total Varejo</div>
              <div className="font-black tabular-nums text-emerald-900 text-sm"><FormatCurrencyExcel value={estimativaVarejo} /></div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

// --- COMPONENTE PRINCIPAL ---
export default function RelatorioUnificado() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Estados de Filtro
  const [codEmp, setCodEmp] = useState('1');
  const [dtIni, setDtIni] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dtFim, setDtFim] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [cfopsStr, setCfopsStr] = useState('');

  // Controle de Abas
  const [activeTab, setActiveTab] = useState<'comercial' | 'tare'>('comercial');

  // Estados de Dados
  const [data, setData] = useState<NotaMes[]>([]);
  const [dataAnterior, setDataAnterior] = useState<NotaMes[]>([]);
  const [entradasDataGlob, setEntradasDataGlob] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de Ordenação e Filtro da Tabela de Parceiros
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'valorTotal', direction: 'desc' });
  const [tableFilters, setTableFilters] = useState<Record<string, string>>({
    parceiro: '',
    tipoClienteDesc: '',
    qtdNotas: '',
    cfopStr: '',
    valorTributado: '',
    valorST: '',
    valorTotal: ''
  });

  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false, msg: '', type: 'success'
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

  const mesAnoAnterior = useMemo(() => {
    if (!dtIni) return '';
    const d = new Date(dtIni + 'T00:00:00');
    d.setMonth(d.getMonth() - 1);
    return d.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  }, [dtIni]);

  // 🚀 FETCH UNIFICADO
  const fetchNotas = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();

      const paramsAtual: Record<string, string> = {
        codEmp, dtIni, dtFim, contrib: 'true', nContrib: 'true'
      };
      if (cfopsStr.trim() !== '') paramsAtual.cfops = cfopsStr.trim();
      const qsAtual = new URLSearchParams(paramsAtual).toString();

      const iniDate = new Date(dtIni + 'T00:00:00');
      const prevIniDate = new Date(iniDate.getFullYear(), iniDate.getMonth() - 1, 1);
      const prevFimDate = new Date(iniDate.getFullYear(), iniDate.getMonth(), 0);

      const prevDtIni = prevIniDate.toISOString().split('T')[0];
      const prevDtFim = prevFimDate.toISOString().split('T')[0];
      const paramsAnterior = { ...paramsAtual, dtIni: prevDtIni, dtFim: prevDtFim };
      const qsAnterior = new URLSearchParams(paramsAnterior).toString();

      // Busca Entradas do Mês Atual via nova rota no backend
      const qsEntradas = new URLSearchParams({ codEmp, dtIni, dtFim }).toString();

      const [resAtual, resAnterior, resEntradas] = await Promise.all([
        fetch(`${API_BASE}/sankhya/notas-detalhadas?${qsAtual}`),
        fetch(`${API_BASE}/sankhya/notas-detalhadas?${qsAnterior}`),
        fetch(`${API_BASE}/sankhya/notas-entradas?${qsEntradas}`, { headers: { Accept: 'application/json' }, cache: 'no-store' }).catch(() => null)
      ]);

      if (!resAtual.ok) throw new Error('Falha ao buscar os dados do mês atual.');

      const jsonAtual = await resAtual.json();
      const jsonAnterior = resAnterior.ok ? await resAnterior.json() : [];
      
      let dEntradas = [];
      if (resEntradas && resEntradas.ok) {
        const parsed = await resEntradas.json();
        dEntradas = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];
      }

      setData(jsonAtual);
      setDataAnterior(jsonAnterior);
      setEntradasDataGlob(dEntradas);

      if (jsonAtual.length > 0 || jsonAnterior.length > 0) toast('Relatórios gerados com sucesso.', 'success');
      else toast('Nenhum dado encontrado no período.', 'error');
    } catch (err: any) {
      setError(err.message || 'Erro de conexão.');
      toast(err.message || 'Erro na consulta', 'error');
      setData([]);
      setDataAnterior([]);
      setEntradasDataGlob([]);
    } finally {
      setLoading(false);
    }
  };


  // =================================================================================
  // 1. LÓGICA: COMERCIAL E PARCEIROS
  // =================================================================================
  const { vendas, devolucoes, totaisVendas, totaisDevolucoes, totaisTributacao } = useMemo(() => {
    const cfopsPermitidos = ['5102', '5405', '5117', '6102', '6108', '6404', '6117', '1202', '1411', '2202', '2411'];

    const mapVendas = new Map<string, RowExcel>();
    const mapDev = new Map<string, RowExcel>();

    let totalTributado = 0;
    let totalST = 0;

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

      const cstSufixo = cst.length >= 2 ? cst.slice(-2) : cst;
      if (cstSufixo === '00' || cstSufixo === '20') {
        totalTributado += valor;
      } else if (cstSufixo === '10' || cstSufixo === '30' || cstSufixo === '60' || cstSufixo === '70') {
        totalST += valor;
      }

      const key = cfop === '5117' ? `${cfop}-${tributacao}` : cfop;
      const targetMap = isVenda ? mapVendas : mapDev;

      let grupoLocal: GrupoTabela = '';
      if (firstChar === '5') grupoLocal = 'VENDA DENTRO ESTADO';
      else if (firstChar === '6') grupoLocal = 'VENDA FORA DO ESTADO';

      if (!targetMap.has(key)) {
        targetMap.set(key, {
          id: key, grupo: grupoLocal, tributacao, cfop, descricao: nota.DESCRCFO || '',
          valContrib: 0, valNaoContrib: 0, soma: 0
        });
      }

      const row = targetMap.get(key)!;
      const isContrib = nota.CLASSE_CONTRIB === 'CONTRIBUINTE';

      if (isContrib) row.valContrib += valor;
      else row.valNaoContrib += valor;

      row.soma += valor;
    });

    const listVendas = Array.from(mapVendas.values()).sort((a, b) => {
      if (a.grupo !== b.grupo) return b.grupo.localeCompare(a.grupo);
      if (a.cfop !== b.cfop) return a.cfop.localeCompare(b.cfop);
      return b.tributacao.localeCompare(a.tributacao);
    });

    const sumVendas = listVendas.reduce((acc, r) => ({
      valContrib: acc.valContrib + r.valContrib,
      valNaoContrib: acc.valNaoContrib + r.valNaoContrib,
      soma: acc.soma + r.soma
    }), { valContrib: 0, valNaoContrib: 0, soma: 0 });

    const listDev = Array.from(mapDev.values()).sort((a, b) => a.cfop.localeCompare(b.cfop));
    const sumDev = listDev.reduce((acc, r) => ({
      valContrib: acc.valContrib + r.valContrib,
      valNaoContrib: acc.valNaoContrib + r.valNaoContrib,
      soma: acc.soma + r.soma
    }), { valContrib: 0, valNaoContrib: 0, soma: 0 });

    return {
      vendas: listVendas, devolucoes: listDev,
      totaisVendas: sumVendas, totaisDevolucoes: sumDev,
      totaisTributacao: { tributado: totalTributado, st: totalST }
    };
  }, [data]);

  const totalGeralVendas = totaisVendas.soma + totaisDevolucoes.soma;
  const vendasAtacado10 = totalGeralVendas * 0.10;
  const vendasVarejo7 = totalGeralVendas * 0.07;

  const totaisAnterior = useMemo(() => {
    const cfopsPermitidos = ['5102', '5405', '5117', '6102', '6108', '6404', '6117', '1202', '1411', '2202', '2411'];
    let somaVendas = 0;
    let somaDevolucoes = 0;
    let totalTributado = 0;
    let totalST = 0;

    dataAnterior.forEach(nota => {
      const cfop = String(nota.CFOP || '').trim();
      if (!cfopsPermitidos.includes(cfop)) return;

      const firstChar = cfop.charAt(0);
      const isVenda = firstChar === '5' || firstChar === '6';
      const isDev = firstChar === '1' || firstChar === '2';

      if (!isVenda && !isDev) return;

      const cst = String(nota.CST || '').trim();
      if (cfop === '5117' && cst !== '10' && cst !== '60' && cst !== '00') return;

      let valor = Number(nota.VLRNOTA) || 0;
      if (isDev) valor = -Math.abs(valor);

      const cstSufixo = cst.length >= 2 ? cst.slice(-2) : cst;
      if (cstSufixo === '00' || cstSufixo === '20') totalTributado += valor;
      else if (cstSufixo === '10' || cstSufixo === '30' || cstSufixo === '60' || cstSufixo === '70') totalST += valor;

      if (isVenda) somaVendas += valor;
      if (isDev) somaDevolucoes += valor;
    });

    const totalGeral = somaVendas + somaDevolucoes;

    return {
      totaisTributacao: { tributado: totalTributado, st: totalST },
      totalGeral,
      atacado10: totalGeral * 0.10,
      varejo7: totalGeral * 0.07
    };
  }, [dataAnterior]);

  // Agrupa e soma valores por PARCEIRO (CODPARC)
  const baseParceirosAgrupados = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const cfopsVenda = ['5102', '5405', '5117', '6102', '6108', '6404', '6117'];
    const map = new Map<number, any>();

    data.forEach(nota => {
      const cfop = String(nota.CFOP || '').trim();
      if (!cfopsVenda.includes(cfop)) return;

      const cst = String(nota.CST || '').trim();
      if (cfop === '5117' && cst !== '10' && cst !== '60' && cst !== '00') return;

      const valor = Number(nota.VLRNOTA) || 0;
      if (valor <= 0) return;

      const codParc = nota.CODPARC;
      const tipoClienteVal = String(nota.AD_TIPOCLIENTEFATURAR || '').trim();
      const tipoClienteDesc = TIPOS_CLIENTE[tipoClienteVal] || nota.AD_TIPOCLIENTEFATURAR_DESC || 'N/D';

      if (!map.has(codParc)) {
        map.set(codParc, {
          codParc: codParc,
          parceiro: nota.NOMEPARC || 'Consumidor',
          tipoClienteVal: tipoClienteVal, 
          tipoClienteDesc: tipoClienteDesc,
          cfops: new Set<string>(),
          notas: new Set<number>(),
          valorTributado: 0,
          valorST: 0,
          valorTotal: 0
        });
      }

      const p = map.get(codParc);
      p.cfops.add(cfop);
      p.notas.add(nota.NUMNOTA);
      p.valorTotal += valor;

      const cstSufixo = cst.length >= 2 ? cst.slice(-2) : cst;
      if (cstSufixo === '00' || cstSufixo === '20') p.valorTributado += valor;
      else if (cstSufixo === '10' || cstSufixo === '30' || cstSufixo === '60' || cstSufixo === '70') p.valorST += valor;
    });

    return Array.from(map.values()).map(p => ({
      ...p,
      qtdNotas: p.notas.size,
      cfopStr: Array.from(p.cfops).join(', ')
    }));
  }, [data]);

  // Filtro e Ordenação aplicados à tabela Geral
  const parceirosTodosFiltradosEOrdenados = useMemo(() => {
    let result = [...baseParceirosAgrupados];

    Object.keys(tableFilters).forEach(key => {
      const filterValue = tableFilters[key].toLowerCase();
      if (filterValue) {
        result = result.filter(row => {
          let cellValue = row[key];
          if (key === 'valorTributado' || key === 'valorST' || key === 'valorTotal') {
            cellValue = formatNumberForSearch(row[key]); 
          } else {
            cellValue = String(cellValue).toLowerCase();
          }
          return String(cellValue).toLowerCase().includes(filterValue);
        });
      }
    });

    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [baseParceirosAgrupados, tableFilters, sortConfig]);

  // Compara os valores com as Metas e calcula o IMPOSTO (Parceiros Alto Valor)
  const parceirosSuperiores = useMemo(() => {
    if (!dataAnterior || dataAnterior.length === 0) return [];

    const metaTributado = totaisAnterior.totaisTributacao.tributado;
    const metaST = totaisAnterior.totaisTributacao.st;

    const filtradas = baseParceirosAgrupados.map(p => {
      let exibir = false;
      let superouTrib = false, superouST = false;
      let difTrib = 0, difST = 0;
      let impostoTrib = 0, impostoST = 0;

      const isAtacadista = p.tipoClienteVal === '5';
      const metaPct = isAtacadista ? 0.10 : 0.07;
      const metaLabel = isAtacadista ? '10% (ATACADISTA/INDUSTRIA)' : '7% (OUTROS)';

      const metaTribCalc = metaTributado * metaPct;
      const metaSTCalc = metaST * metaPct;

      if (metaTributado > 0 && p.valorTributado > metaTribCalc) {
        superouTrib = true;
        difTrib = p.valorTributado - metaTribCalc;
        impostoTrib = difTrib * 0.20; 
      }
      if (metaST > 0 && p.valorST > metaSTCalc) {
        superouST = true;
        difST = p.valorST - metaSTCalc;
        impostoST = difST * 0.04; 
      }
      exibir = superouTrib || superouST;

      return {
        ...p,
        superouTrib, superouST, difTrib, difST, impostoTrib, impostoST, metaLabel, exibir
      };
    }).filter(p => p.exibir);

    return filtradas.sort((a, b) => b.valorTotal - a.valorTotal);
  }, [baseParceirosAgrupados, dataAnterior, totaisAnterior]);

  // CALCULA O SOMA TOTAL DOS IMPOSTOS PARA O FOOTER DO ALTO VALOR E PARA A ABA FISCAL
  const totaisExcedentes = useMemo(() => {
      return parceirosSuperiores.reduce((acc, p) => {
          acc.trib += p.impostoTrib;
          acc.st += p.impostoST;
          return acc;
      }, { trib: 0, st: 0 });
  }, [parceirosSuperiores]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (key: string, value: string) => {
    setTableFilters(prev => ({ ...prev, [key]: value }));
  };

  const renderSortableHeader = (label: string, key: string, align: 'left' | 'center' | 'right' = 'left') => (
    <th className="border-b border-r border-slate-200 p-2 bg-slate-100/80 align-top">
      <div className="flex flex-col gap-2 w-full h-full">
        <button 
          type="button"
          onClick={() => handleSort(key)}
          className={`flex items-center gap-1.5 font-bold text-[10px] uppercase text-slate-600 hover:text-emerald-700 transition-colors w-full ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}
        >
          {label}
          {sortConfig.key === key ? (
            sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />
          ) : (
            <ArrowUpDown className="w-3 h-3 shrink-0 opacity-30" />
          )}
        </button>
        <input 
          type="text"
          placeholder="Filtrar..."
          value={tableFilters[key] || ''}
          onChange={(e) => handleFilterChange(key, e.target.value)}
          className={`w-full px-1.5 py-1 text-[10px] font-normal border border-slate-300 rounded shadow-inner bg-white text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400 ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}
        />
      </div>
    </th>
  );

  // =================================================================================
  // 2. LÓGICA: FISCAL TARE
  // =================================================================================
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

    data.forEach(nota => {
        const cfop = String(nota.CFOP || '').trim();
        const cst = String(nota.CST || '').trim();
        let valor = Number(nota.VLRNOTA) || 0;

        const firstChar = cfop.charAt(0);
        const isContrib = nota.CLASSE_CONTRIB === 'CONTRIBUINTE';

        let isST = false;
        let isTrib = false;

        if (cst === '10' || cst === '60') isST = true;
        else if (cst === '00') isTrib = true;

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

    return { buckets };
  }, [data]);

  // Lista de Entradas baseada nos dados do backend, AGrupada por NUMNOTA
  const notasEntrada = useMemo(() => {
    const grouped = new Map<string, any>();

    entradasDataGlob.forEach(r => {
      const cfop = String(r.CFOP || '').trim();
      if (!CFOP_ENTRADAS_ICMS.includes(cfop)) return;

      const num = safeString(r.NUMNOTA);
      const emitente = safeString(r.NOMEPARC || '-');
      
      const vlrNota = Number(r.VLRNOTA) || 0;
      const aliqIcms = Number(r.ALIQICMS) || 0;
      
      const creditoIcms = vlrNota * (aliqIcms / 100);
      
      let dateObj = new Date(0);
      let dataFormatada = '-';
      
      if (r.DTENTSAI) {
        const dtStr = String(r.DTENTSAI).substring(0, 10);
        dateObj = new Date(dtStr + 'T00:00:00'); 
        dataFormatada = dtStr.split('-').reverse().join('/');
      } else if (r.DTNEG) {
        const dtStr = String(r.DTNEG).substring(0, 10);
        dateObj = new Date(dtStr + 'T00:00:00'); 
        dataFormatada = dtStr.split('-').reverse().join('/');
      }

      if (!grouped.has(num)) {
        grouped.set(num, {
          num,
          emitente,
          dateObj,
          dataFormatada,
          vlrNota: 0,
          creditoIcms: 0,
          cfops: new Set<string>(),
          aliquotas: new Set<number>()
        });
      }

      const group = grouped.get(num);
      group.vlrNota += vlrNota;
      group.creditoIcms += creditoIcms;
      group.cfops.add(cfop);
      group.aliquotas.add(aliqIcms);
    });

    return Array.from(grouped.values()).map(g => ({
      ...g,
      cfopStr: Array.from(g.cfops).join(', '),
      aliqStr: Array.from(g.aliquotas).map(a => `${a}%`).join(', ')
    })).sort((a, b) => {
      const timeA = isNaN(a.dateObj.getTime()) ? 0 : a.dateObj.getTime();
      const timeB = isNaN(b.dateObj.getTime()) ? 0 : b.dateObj.getTime();
      return timeB - timeA; // Mais recentes primeiro
    });
  }, [entradasDataGlob]);

  const totalIcmsEntradas = useMemo(() => {
    return notasEntrada.reduce((acc, n) => acc + n.creditoIcms, 0);
  }, [notasEntrada]);

  const { buckets } = tabTareData;

  const vlrContrib = (buckets['c_in_trib']?.totalBase || 0) + (buckets['c_out_trib']?.totalBase || 0) + (buckets['c_in_st']?.totalBase || 0) + (buckets['c_out_st']?.totalBase || 0);
  const vlrNaoContrib = (buckets['nc_in_trib']?.totalBase || 0) + (buckets['nc_in_st']?.totalBase || 0) + (buckets['nc_out_st']?.totalBase || 0) + (buckets['nc_out_trib']?.totalBase || 0);
  const totalLiq = (vlrContrib || 0) + (vlrNaoContrib || 0);
  const pctLiqContrib = totalLiq ? (vlrContrib / totalLiq) : 0;
  const pctLiqNaoContrib = totalLiq ? (vlrNaoContrib / totalLiq) : 0;

  const apForaInterna = buckets['nc_in_st']?.totalBase || 0;
  const apForaPB = buckets['nc_out_st']?.totalBase || 0;
  const totalApFora = apForaInterna + apForaPB;
  const taxApForaInterna = buckets['nc_in_st']?.totalTax || 0;
  const taxApForaPB = buckets['nc_out_st']?.totalTax || 0;
  const totalTaxApFora = taxApForaInterna + taxApForaPB;

  const tribContrib = (buckets['c_in_trib']?.totalBase || 0) + (buckets['c_out_trib']?.totalBase || 0);
  const tribNaoContrib = (buckets['nc_in_trib']?.totalBase || 0) + (buckets['nc_out_trib']?.totalBase || 0);
  const totalTrib = tribContrib + tribNaoContrib;
  const pctTribContrib = totalTrib ? (tribContrib / totalTrib) : 0;
  const pctTribNaoContrib = totalTrib ? (tribNaoContrib / totalTrib) : 0;

  const apNorm20 = buckets['nc_in_trib']?.totalTax || 0;
  const apNorm4 = buckets['c_in_trib']?.totalTax || 0;
  const apNorm1 = buckets['c_out_trib']?.totalTax || 0;
  const totalApNormal = apNorm20 + apNorm4 + apNorm1 + totaisExcedentes.trib;

  const creditoCalculado = totalIcmsEntradas * pctTribNaoContrib;
  const saldoFinal = totalApNormal - creditoCalculado;

  const renderBucketTable = (bucketId: string) => {
    const bucket = buckets[bucketId];
    if (!bucket) return null;

    return (
        <div className="mb-5 overflow-hidden border border-slate-200 rounded-xl shadow-sm bg-white">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{bucket.config.title}</h3>
                {bucket.config.tax > 0 && (
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                        Aliquota: {formatPercentRound(bucket.config.tax)}
                    </span>
                )}
            </div>
            <div className="overflow-x-auto custom-table-scroll">
                <table className="w-full border-collapse text-xs font-medium font-sans">
                    <colgroup>
                        <col className="w-20" />
                        <col className="w-auto" />
                        <col className="w-auto" />
                    </colgroup>
                    <thead>
                        <tr className="bg-slate-100/50">
                            <th className="border-b border-r border-slate-200 p-2 text-center font-bold text-[10px] uppercase tracking-wider text-slate-600">CFOP</th>
                            <th className="border-b border-r border-slate-200 p-2 text-right font-bold text-[10px] uppercase tracking-wider text-slate-600">Base Cálculo</th>
                            <th className="border-b border-slate-200 p-2 text-right font-bold text-[10px] uppercase tracking-wider text-slate-600">Imposto Apurado</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {bucket.rowsList.map(r => (
                            <tr key={r.cfop} className="hover:bg-slate-50/70 transition-colors">
                                <td className="border-b border-r border-slate-200 px-3 py-2 text-center font-mono text-slate-600">{r.cfop}</td>
                                <td className="border-b border-r border-slate-200 px-3 py-2 text-right tabular-nums">
                                    <FormatCurrencyExcel value={r.valor} />
                                </td>
                                <td className="border-b border-slate-200 px-3 py-2 text-right tabular-nums bg-slate-50/30">
                                    {bucket.config.tax > 0 ? <FormatCurrencyExcel value={r.taxValue} /> : <span className="text-slate-400">-</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-300">
                        <tr>
                            <td className="border-r border-slate-200 px-3 py-2.5 text-right font-black text-slate-800 uppercase tracking-widest">TOTAL</td>
                            <td className="border-r border-slate-200 px-3 py-2.5 text-right font-bold tabular-nums">
                                <FormatCurrencyExcel value={bucket.totalBase} />
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold tabular-nums bg-slate-100/80">
                                {bucket.config.tax > 0 ? <FormatCurrencyExcel value={bucket.totalTax} /> : <span className="text-slate-400">-</span>}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
  };


  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
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
                  Relatório Integrado
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

        {/* FILTROS (Compartilhados entre as abas) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-6">
          <form onSubmit={fetchNotas} className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:flex gap-4 flex-1 w-full">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Empresa
                </label>
                <input type="number" required value={codEmp} onChange={(e) => setCodEmp(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-sm" />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data Inicial
                </label>
                <input type="date" required value={dtIni} onChange={(e) => setDtIni(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-sm text-slate-700" />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data Final
                </label>
                <input type="date" required value={dtFim} onChange={(e) => setDtFim(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-sm text-slate-700" />
              </div>
              <div className="flex-1 min-w-[160px] md:col-span-2 lg:col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Tags className="w-3.5 h-3.5" /> CFOPs (Opcional)
                </label>
                <input type="text" placeholder="Ex: 5102, 5405" value={cfopsStr} onChange={(e) => setCfopsStr(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-sm text-slate-700" title="Deixe em branco para buscar todos ou separe-os por vírgula." />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full lg:w-auto px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 h-[42px] mt-2 lg:mt-0 shrink-0">
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

        {/* =========================================================
            MENU DE ABAS ESTILO TOGGLE
        ========================================================= */}
        {data.length > 0 && (
          <div className="flex items-center justify-center w-full mb-8 mt-2 overflow-x-auto pb-2 animate-fade-in-up">
            <div className="flex items-center gap-4 sm:gap-8">
              
              <button
                onClick={() => setActiveTab(activeTab === 'comercial' ? 'tare' : 'comercial')}
                className={`flex items-center gap-2 text-sm sm:text-base font-bold transition-all whitespace-nowrap ${
                  activeTab === 'comercial'
                    ? 'bg-white border border-slate-200 shadow-sm px-5 py-2.5 rounded-full text-slate-800'
                    : 'text-slate-400 hover:text-slate-600 px-2 py-2.5'
                }`}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                Análise Comercial
              </button>

              <div 
                className="flex items-center gap-2 shrink-0 cursor-pointer px-2 py-4" 
                onClick={() => setActiveTab(prev => prev === 'comercial' ? 'tare' : 'comercial')}
              >
                <div className={`transition-all duration-300 rounded-full ${activeTab === 'comercial' ? 'w-8 h-2 bg-emerald-600' : 'w-2 h-2 bg-slate-300'}`}></div>
                <div className={`transition-all duration-300 rounded-full ${activeTab === 'tare' ? 'w-8 h-2 bg-emerald-600' : 'w-2 h-2 bg-slate-300'}`}></div>
              </div>

              <button
                onClick={() => setActiveTab(activeTab === 'tare' ? 'comercial' : 'tare')}
                className={`flex items-center gap-2 text-sm sm:text-base font-bold transition-all whitespace-nowrap ${
                  activeTab === 'tare'
                    ? 'bg-white border border-slate-200 shadow-sm px-5 py-2.5 rounded-full text-slate-800'
                    : 'text-slate-400 hover:text-slate-600 px-2 py-2.5'
                }`}
              >
                Fechamento TARE
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

            </div>
          </div>
        )}

        {/* =========================================================
            CONTEÚDO ABA 1: COMERCIAL E PARCEIROS
        ========================================================= */}
        {data.length > 0 && activeTab === 'comercial' && (
          <div className="flex flex-col gap-6 animate-fade-in-up">

            {/* CARD: VENDAS */}
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
                    {vendas.length === 0 ? (
                      <tr><td colSpan={6} className="border-b border-slate-200 p-6 text-center text-slate-400 italic">Sem dados de Venda no período</td></tr>
                    ) : (
                      vendas.map((row, i) => {
                        const isFirstInGroup = i === 0 || row.grupo !== vendas[i - 1]?.grupo;
                        const groupCount = vendas.filter(v => v.grupo === row.grupo).length;
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
                  {vendas.length > 0 && (
                    <tfoot className="bg-slate-50 border-t border-slate-300">
                      <tr>
                        <td colSpan={3} className="border-r border-slate-200 px-3 py-2.5 text-right font-black text-slate-800 uppercase tracking-widest">TOTAL</td>
                        <td className="border-r border-slate-200 px-3 py-2.5 text-right font-bold tabular-nums"><FormatCurrencyExcel value={totaisVendas.valContrib} /></td>
                        <td className="border-r border-slate-200 px-3 py-2.5 text-right font-bold tabular-nums"><FormatCurrencyExcel value={totaisVendas.valNaoContrib} /></td>
                        <td className="px-3 py-2.5 text-right font-black tabular-nums bg-slate-100/80"><FormatCurrencyExcel value={totaisVendas.soma} /></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* CARD: DEVOLUÇÕES */}
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
                    {devolucoes.length === 0 ? (
                      <tr><td colSpan={6} className="border-b border-slate-200 p-6 text-center text-slate-400 italic">Sem dados de Devolução no período</td></tr>
                    ) : (
                      devolucoes.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                          {idx === 0 ? (
                            <td rowSpan={devolucoes.length} className="border-b border-r border-slate-200 align-middle bg-slate-50/50">
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
                  {devolucoes.length > 0 && (
                    <tfoot className="bg-slate-50 border-t border-slate-300">
                      <tr>
                        <td colSpan={3} className="border-r border-slate-200 px-3 py-2.5 text-right font-black text-slate-800 uppercase tracking-widest">TOTAL</td>
                        <td className="border-r border-slate-200 px-3 py-2.5 text-right font-bold tabular-nums"><FormatCurrencyExcel value={totaisDevolucoes.valContrib} /></td>
                        <td className="border-r border-slate-200 px-3 py-2.5 text-right font-bold tabular-nums"><FormatCurrencyExcel value={totaisDevolucoes.valNaoContrib} /></td>
                        <td className="px-3 py-2.5 text-right font-black tabular-nums bg-slate-100/80"><FormatCurrencyExcel value={totaisDevolucoes.soma} /></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* APURAÇÕES EM COLUNA */}
            <div className="flex flex-col gap-6 mt-2">

              {/* CARD: APURAÇÃO MÊS ATUAL */}
              <TabelaApuracao
                titulo={`Apuração - Mês Atual (${mesAno})`}
                subtitulo="Líquido e Estimativas"
                totaisTributacao={totaisTributacao}
                totalGeral={totalGeralVendas}
                estimativaAtacado={vendasAtacado10}
                estimativaVarejo={vendasVarejo7}
              />

              {/* CARD: APURAÇÃO MÊS ANTERIOR */}
              {dataAnterior.length > 0 && (
                <TabelaApuracao
                  titulo={`Apuração - Mês Anterior (${mesAnoAnterior})`}
                  subtitulo="Comparativo de Valores Líquidos"
                  totaisTributacao={totaisAnterior.totaisTributacao}
                  totalGeral={totaisAnterior.totalGeral}
                  estimativaAtacado={totaisAnterior.atacado10}
                  estimativaVarejo={totaisAnterior.varejo7}
                />
              )}

              {/* ==================================
                  CARD NOVO: RESUMO GERAL DE TODOS OS PARCEIROS (COM FILTRO E ORDENAÇÃO)
              ================================== */}
              {parceirosTodosFiltradosEOrdenados.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-indigo-100 bg-indigo-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl shadow-sm border border-indigo-200 text-indigo-600">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-indigo-900 uppercase tracking-wide">Resumo de Vendas por Parceiro</h2>
                        <p className="text-[10px] sm:text-xs text-indigo-700/70 font-bold uppercase tracking-wider mt-0.5">Filtre e ordene todas as vendas agrupadas por parceiro</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-1 rounded">
                      Exibindo: {parceirosTodosFiltradosEOrdenados.length}
                    </div>
                  </div>

                  <div className="overflow-x-auto p-0 max-h-[600px] overflow-y-auto custom-table-scroll">
                    <table className="w-full border-collapse text-xs font-medium font-sans min-w-[1100px]">
                      <thead className="sticky top-0 z-10 shadow-sm">
                        <tr>
                          {renderSortableHeader('Parceiro', 'parceiro', 'left')}
                          {renderSortableHeader('Qtd', 'qtdNotas', 'center')}
                          {renderSortableHeader('CFOP(s)', 'cfopStr', 'center')}
                          {renderSortableHeader('Tipo Cliente (Desc)', 'tipoClienteDesc', 'center')}
                          {renderSortableHeader('Vlr Tributado', 'valorTributado', 'right')}
                          {renderSortableHeader('Vlr ST', 'valorST', 'right')}
                          {renderSortableHeader('Total Somado', 'valorTotal', 'right')}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {parceirosTodosFiltradosEOrdenados.map((row, idx) => (
                          <tr key={`${row.codParc}-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="border-r border-slate-200 px-4 py-3 text-left font-semibold text-slate-700 truncate max-w-[250px]">{row.parceiro}</td>
                            <td className="border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-600">{row.qtdNotas}</td>
                            <td className="border-r border-slate-200 px-4 py-3 text-center font-mono text-[10px] text-slate-500">{row.cfopStr}</td>
                            <td className="border-r border-slate-200 px-4 py-3 text-center">
                              <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded text-[9px] font-bold uppercase whitespace-nowrap">
                                {row.tipoClienteDesc}
                              </span>
                            </td>
                            <td className="border-r border-slate-200 px-4 py-3 text-right tabular-nums text-emerald-700 bg-emerald-50/20"><FormatCurrencyExcel value={row.valorTributado} /></td>
                            <td className="border-r border-slate-200 px-4 py-3 text-right tabular-nums text-orange-700 bg-orange-50/20"><FormatCurrencyExcel value={row.valorST} /></td>
                            <td className="px-4 py-3 text-right tabular-nums font-black text-slate-800"><FormatCurrencyExcel value={row.valorTotal} /></td>
                          </tr>
                        ))}
                        {parceirosTodosFiltradosEOrdenados.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400 italic">Nenhum resultado encontrado para os filtros aplicados.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}


              {/* ==================================
                  CARD: PARCEIROS DE ALTO VALOR (SOMA DE NOTAS E CÁLCULO DE IMPOSTO)
              ================================== */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-orange-100 bg-orange-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-orange-200 text-orange-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-orange-900 uppercase tracking-wide">Parceiros Excedentes</h2>
                      <p className="text-[10px] sm:text-xs text-orange-700/70 font-bold uppercase tracking-wider mt-0.5">Imposto estimado sobre o valor excedente das compras somadas do parceiro no mês</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto p-0 custom-table-scroll">
                  <table className="w-full border-collapse text-xs font-medium font-sans min-w-[1300px]">
                    <thead>
                      <tr className="bg-slate-100/50 text-slate-600">
                        <th className="border-b border-r border-slate-200 p-3 text-left font-bold text-[10px] uppercase">Parceiro</th>
                        <th className="border-b border-r border-slate-200 p-3 text-center font-bold text-[10px] uppercase">Qtd Notas</th>
                        <th className="border-b border-r border-slate-200 p-3 text-center font-bold text-[10px] uppercase">CFOP(s)</th>
                        <th className="border-b border-r border-slate-200 p-3 text-center font-bold text-[10px] uppercase">Tipo Cliente</th>
                        <th className="border-b border-r border-slate-200 p-3 text-right font-bold text-[10px] uppercase text-emerald-800 bg-emerald-50/50">Valor Tributado</th>
                        <th className="border-b border-r border-slate-200 p-3 text-right font-bold text-[10px] uppercase text-orange-800 bg-orange-50/50">Valor ST</th>
                        <th className="border-b border-r border-slate-200 p-3 text-right font-bold text-[10px] uppercase text-slate-800">Total Somado</th>
                        <th className="border-b border-r border-slate-200 p-3 text-center font-bold text-[10px] uppercase">Metas e Diferença</th>
                        <th className="border-b border-slate-200 p-3 text-right font-bold text-[10px] uppercase text-rose-800 bg-rose-50/50">Imposto (Excedente)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {parceirosSuperiores.length > 0 ? (
                        parceirosSuperiores.map((row, idx) => (
                          <tr key={`${row.codParc}-${idx}`} className="hover:bg-orange-50/30 transition-colors">
                            <td className="border-b border-r border-slate-200 px-4 py-3 text-left font-bold text-slate-700 truncate max-w-[200px]">{row.parceiro}</td>
                            <td className="border-b border-r border-slate-200 px-4 py-3 text-center font-bold text-slate-600">{row.qtdNotas}</td>
                            <td className="border-b border-r border-slate-200 px-4 py-3 text-center font-mono text-[10px] text-slate-500">{row.cfopStr}</td>
                            <td className="border-b border-r border-slate-200 px-4 py-3 text-center text-slate-600">
                              <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded text-[9px] font-bold uppercase whitespace-nowrap">
                                {row.tipoClienteDesc}
                              </span>
                            </td>
                            <td className="border-b border-r border-slate-200 px-4 py-3 text-right tabular-nums text-emerald-700 bg-emerald-50/20"><FormatCurrencyExcel value={row.valorTributado} /></td>
                            <td className="border-b border-r border-slate-200 px-4 py-3 text-right tabular-nums text-orange-700 bg-orange-50/20"><FormatCurrencyExcel value={row.valorST} /></td>
                            <td className="border-b border-r border-slate-200 px-4 py-3 text-right tabular-nums font-black text-slate-800"><FormatCurrencyExcel value={row.valorTotal} /></td>
                            <td className="border-b border-r border-slate-200 px-4 py-3">
                              <div className="flex flex-col gap-1.5 items-center">
                                {/* TAGS TRIBUTADO */}
                                {row.superouTrib && (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                                    TRIB SUPEROU {row.metaLabel} <span className="text-emerald-900 bg-emerald-100/50 px-1 rounded">+{formatDif(row.difTrib)}</span>
                                  </span>
                                )}
                                
                                {/* TAGS ST */}
                                {row.superouST && (
                                  <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                                    ST SUPEROU {row.metaLabel} <span className="text-orange-900 bg-orange-100/50 px-1 rounded">+{formatDif(row.difST)}</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="border-b border-slate-200 px-4 py-3 bg-rose-50/20">
                              <div className="flex flex-col items-end gap-1.5">
                                {row.impostoTrib > 0 && (
                                  <span className="text-[10px] text-rose-700 bg-white px-2 py-0.5 rounded font-bold border border-rose-200 shadow-sm flex items-center gap-1">
                                    TRIB (20%): <span className="text-rose-900">{formatDif(row.impostoTrib)}</span>
                                  </span>
                                )}
                                {row.impostoST > 0 && (
                                  <span className="text-[10px] text-rose-700 bg-white px-2 py-0.5 rounded font-bold border border-rose-200 shadow-sm flex items-center gap-1">
                                    ST (4%): <span className="text-rose-900">{formatDif(row.impostoST)}</span>
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                            Nenhum parceiro excedeu as metas estimadas em relação ao mês anterior.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {/* FOOTER COM SOMA TOTAL DOS IMPOSTOS EXCEDENTES */}
                    <tfoot className="bg-rose-50/80 border-t-2 border-rose-200">
                      <tr>
                        <td colSpan={8} className="px-4 py-3 text-right font-black text-rose-900 uppercase tracking-widest border-r border-rose-200">
                          SOMA TOTAL DOS IMPOSTOS SOBRE EXCEDENTES
                        </td>
                        <td className="px-4 py-3 bg-rose-100/30">
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-[11px] text-rose-800 bg-white px-2 py-0.5 rounded font-black border border-rose-300 shadow-sm flex items-center gap-1">
                              TRIB TOTAL: <span className="text-rose-900">{formatDif(totaisExcedentes.trib)}</span>
                            </span>
                            <span className="text-[11px] text-rose-800 bg-white px-2 py-0.5 rounded font-black border border-rose-300 shadow-sm flex items-center gap-1">
                              ST TOTAL: <span className="text-rose-900">{formatDif(totaisExcedentes.st)}</span>
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* =========================================================
            CONTEÚDO ABA 2: FISCAL TARE
        ========================================================= */}
        {data.length > 0 && activeTab === 'tare' && (
          <div className="animate-fade-in-up flex flex-col gap-6">

            {/* PRIMEIRA LINHA: QUADROS PRINCIPAIS */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

                {/* Contribuinte */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-xl shadow-sm border border-amber-200 text-amber-600">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm sm:text-base font-bold text-amber-900 uppercase tracking-wide">Contribuinte</h2>
                                <p className="text-[10px] sm:text-xs text-amber-700/70 font-bold uppercase tracking-wider mt-0.5">Pessoa Juridica com IE, Atacadista/Industria e Construtora</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 sm:p-5 bg-slate-50/30 flex flex-col">
                        {renderBucketTable('c_in_trib')}
                        {renderBucketTable('c_out_trib')}
                        {renderBucketTable('c_in_st')}
                        {renderBucketTable('c_out_st')}
                    </div>
                </div>

                {/* Não Contribuinte */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-sky-100 bg-sky-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-xl shadow-sm border border-sky-200 text-sky-600">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm sm:text-base font-bold text-sky-900 uppercase tracking-wide">Não Contribuinte</h2>
                                <p className="text-[10px] sm:text-xs text-sky-700/70 font-bold uppercase tracking-wider mt-0.5">PF e Jurídica sem IE</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 sm:p-5 bg-slate-50/30 flex flex-col">
                        {renderBucketTable('nc_in_trib')}
                        {renderBucketTable('nc_out_trib')}
                        {renderBucketTable('nc_in_st')}
                        {renderBucketTable('nc_out_st')}
                    </div>
                </div>
            </div>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-xs font-medium font-sans">
                    <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200">VENDA LIQ C/TARE CONTRIBUINTE</td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums border-r border-slate-200 w-32"><FormatCurrencyExcel value={vlrContrib} /></td>
                            <td className="px-4 py-3 text-center text-slate-500 w-20 font-bold bg-slate-50">{formatPercent(pctLiqContrib)}</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200">VENDA LIQ C/TARE NÃO CONTRIBUINTE</td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums border-r border-slate-200 w-32"><FormatCurrencyExcel value={vlrNaoContrib} /></td>
                            <td className="px-4 py-3 text-center text-slate-500 w-20 font-bold bg-slate-50">{formatPercent(pctLiqNaoContrib)}</td>
                        </tr>
                        <tr className="bg-slate-100/50 border-t border-slate-300">
                            <td className="px-4 py-3 text-right font-black text-slate-800 uppercase tracking-widest border-r border-slate-200">TOTAL</td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums border-r border-slate-200 w-32"><FormatCurrencyExcel value={totalLiq} /></td>
                            <td className="px-4 py-3 bg-slate-100"></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* SEGUNDA LINHA: ELEMENTOS EMPILHADOS NO MESMO CARD */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600">
                        <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-800 uppercase tracking-wide">Resumos de Vendas e Apuração Externa</h2>
                    </div>
                </div>

                <div className="p-4 sm:p-5 bg-slate-50/30 flex flex-col gap-6">

                    {/* 2. Resumo Venda Tributado */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-xs font-medium font-sans">
                            <tbody className="divide-y divide-slate-100">
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200">VENDA TRIBUTADO CONTRIBUINTE</td>
                                    <td className="px-4 py-3 text-right font-bold tabular-nums border-r border-slate-200 w-32"><FormatCurrencyExcel value={tribContrib} /></td>
                                    <td className="px-4 py-3 text-center text-slate-500 w-20 font-bold bg-slate-50">{formatPercentRound(pctTribContrib)}</td>
                                </tr>
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200">VENDA TRIBUTADO NAO CONTRIBUINTE</td>
                                    <td className="px-4 py-3 text-right font-bold tabular-nums border-r border-slate-200 w-32"><FormatCurrencyExcel value={tribNaoContrib} /></td>
                                    <td className="px-4 py-3 text-center text-emerald-900 w-20 font-black bg-emerald-200">{formatPercentRound(pctTribNaoContrib)}</td>
                                </tr>
                                <tr className="bg-slate-100/50 border-t border-slate-300">
                                    <td className="px-4 py-3 text-right font-black text-slate-800 uppercase tracking-widest border-r border-slate-200">TOTAL</td>
                                    <td className="px-4 py-3 text-right font-bold tabular-nums border-r border-slate-200 w-32"><FormatCurrencyExcel value={totalTrib} /></td>
                                    <td className="px-4 py-3 bg-slate-100"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* 3. Apuração Fora Tare */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-center">
                            <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">APURAÇÃO S/TARE - VENDAS NÃO CONTRIBUINTE<br />APURAÇÃO ST - (1132) - 4%</h3>
                        </div>
                        <table className="w-full text-xs font-medium font-sans">
                            <colgroup>
                                <col className="w-auto" />
                                <col className="w-32" />
                                <col className="w-32" />
                            </colgroup>
                            <thead>
                                <tr className="bg-slate-100/50">
                                    <th className="border-b border-r border-slate-200 p-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-600">Descrição</th>
                                    <th className="border-b border-r border-slate-200 p-2 text-right font-bold text-[10px] uppercase tracking-wider text-slate-600">Base Cálculo</th>
                                    <th className="border-b border-slate-200 p-2 text-right font-bold text-[10px] uppercase tracking-wider text-slate-600">Imposto Apurado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-left font-semibold text-slate-600 uppercase border-r border-slate-200">VENDA C/TARE DENTRO DO ESTADO</td>
                                    <td className="px-4 py-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={apForaInterna} /></td>
                                    <td className="px-4 py-3 text-right tabular-nums bg-slate-50/30"><FormatCurrencyExcel value={taxApForaInterna} /></td>
                                </tr>
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-left font-semibold text-slate-600 uppercase border-r border-slate-200">VENDA S/TARE FORA DO ESTADO</td>
                                    <td className="px-4 py-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={apForaPB} /></td>
                                    <td className="px-4 py-3 text-right tabular-nums bg-slate-50/30"><FormatCurrencyExcel value={taxApForaPB} /></td>
                                </tr>
                                {/* LINHA ST EXCEDENTE */}
                                <tr className="hover:bg-orange-50 transition-colors">
                                    <td className="px-4 py-3 text-left font-bold text-orange-700 uppercase border-r border-slate-200">
                                        IMPOSTO SOBRE ST (PARCEIROS EXCEDENTES)
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums border-r border-slate-200 text-slate-400">-</td>
                                    <td className="px-4 py-3 text-right tabular-nums bg-orange-50/30 font-bold text-orange-800"><FormatCurrencyExcel value={totaisExcedentes.st} /></td>
                                </tr>
                            </tbody>
                            <tfoot className="bg-slate-100/50 border-t border-slate-300">
                                <tr>
                                    <td className="px-4 py-3 text-right font-black text-slate-800 uppercase tracking-widest border-r border-slate-200">TOTAL</td>
                                    <td className="px-4 py-3 text-right font-bold tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={totalApFora} /></td>
                                    {/* SOMA INCLUINDO O EXCEDENTE */}
                                    <td className="px-4 py-3 text-right font-black text-slate-800 tabular-nums bg-slate-100"><FormatCurrencyExcel value={totalTaxApFora + totaisExcedentes.st} /></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm h-fit">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-center">
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">APURAÇÃO NORMAL</h3>
                        </div>
                        <table className="w-full text-xs font-medium font-sans">
                            <tbody className="divide-y divide-slate-100">
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">VENDA TRIBUTADA S/TARE DENTRO DO ESTADO(20%)</td>
                                    <td className="px-4 py-3 text-right tabular-nums w-40"><FormatCurrencyExcel value={apNorm20} /></td>
                                </tr>
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">VENDA ST S/TARE FORA DO ESTADO(4%)</td>
                                    <td className="px-4 py-3 text-right tabular-nums w-40"><FormatCurrencyExcel value={apNorm4} /></td>
                                </tr>
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">VENDA TRIBUTADA C/TARE FORA DO ESTADO (1%)</td>
                                    <td className="px-4 py-3 text-right tabular-nums w-40"><FormatCurrencyExcel value={apNorm1} /></td>
                                </tr>
                                <tr className="hover:bg-orange-50 transition-colors">
                                    <td className="px-4 py-3 text-left font-bold text-orange-700 border-r border-slate-200">IMPOSTO SOBRE TRIBUTADOS (PARCEIROS EXCEDENTES)</td>
                                    <td className="px-4 py-3 text-right tabular-nums bg-orange-50/30 font-bold text-orange-800 w-40"><FormatCurrencyExcel value={totaisExcedentes.trib} /></td>
                                </tr>
                                <tr className="bg-slate-100/50 border-t border-slate-300">
                                    <td className="px-4 py-3 text-right font-black text-slate-800 uppercase tracking-widest border-r border-slate-200">TOTAL</td>
                                    <td className="px-4 py-3 text-right font-bold tabular-nums w-40"><FormatCurrencyExcel value={totalApNormal} /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>

            {/* TERCEIRA LINHA: FECHAMENTO TARE E CRÉDITOS */}
            <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-indigo-100 bg-indigo-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-indigo-200 text-indigo-600">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-indigo-900 uppercase tracking-wide">Fechamento TARE e Créditos de Entrada</h2>
                            <p className="text-[10px] sm:text-xs text-indigo-700/70 font-bold uppercase tracking-wider mt-0.5">Apuração Final de Impostos baseada no ICMS das Entradas (CFOP 1102 e 2102)</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-5 flex flex-col gap-6 bg-slate-50/30">

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm h-fit">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-center flex flex-col">
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">CRÉDITO DE ICMS DE ENTRADAS (BASEADO NO XML)</h3>
                            <span className="text-[9px] text-slate-400 font-mono mt-1">CFOPs contabilizados: 1102 e 2102</span>
                        </div>
                        <table className="w-full text-xs font-medium font-sans">
                            <tbody className="divide-y divide-slate-100">
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-right font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200">TOTAL ICMS EFETIVO DAS ENTRADAS (XML)</td>
                                    <td className="px-4 py-3 text-right font-bold tabular-nums w-40"><FormatCurrencyExcel value={totalIcmsEntradas} /></td>
                                </tr>
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-right font-bold text-emerald-700 uppercase tracking-wider border-r border-slate-200">
                                        VALOR DO CRÉDITO <br /><span className="text-[9px] text-emerald-600/70">(ICMS Efetivo * Pct. N.Contrib)</span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700 w-40"><FormatCurrencyExcel value={creditoCalculado} /></td>
                                </tr>
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-right font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200">VALOR A PAGAR (APURAÇÃO NORMAL)</td>
                                    <td className="px-4 py-3 text-right font-bold tabular-nums w-40"><FormatCurrencyExcel value={totalApNormal} /></td>
                                </tr>
                                <tr className={saldoFinal < 0 ? 'bg-rose-50/50 border-t border-rose-200' : 'bg-emerald-50/50 border-t border-emerald-200'}>
                                    <td className={`px-4 py-3 text-right font-black uppercase tracking-widest border-r ${saldoFinal < 0 ? 'text-rose-900 border-rose-200' : 'text-emerald-900 border-emerald-200'}`}>SALDO FINAL</td>
                                    <td className="px-4 py-3 text-right text-sm font-black tabular-nums w-40"><FormatCurrencyExcel value={saldoFinal} /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ==================================
                        CARD NOVO: LISTA DE TODAS AS NOTAS DE ENTRADA
                    ================================== */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm mt-4">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-500" />
                          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Detalhamento das Notas de Entrada (CFOP 1102 e 2102)</h3>
                        </div>
                        <button 
                          onClick={() => {
                            const csvContent = "Data,Nº Nota,Emitente,CFOP,Vlr Base,Alíquota,ICMS Creditado\n" 
                              + notasEntrada.map(e => `${e.dataFormatada},${e.num},"${e.emitente}","${e.cfopStr}",${e.vlrNota},"${e.aliqStr}",${e.creditoIcms}`).join("\n");
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = `notas_entrada_credito_${mesAno}.csv`;
                            link.click();
                          }}
                          className="flex items-center gap-1.5 text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded hover:bg-slate-50 transition-colors font-bold"
                          title="Exportar CSV"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          Exportar
                        </button>
                      </div>
                      <div className="overflow-x-auto p-0 max-h-[500px] overflow-y-auto custom-table-scroll">
                        <table className="w-full text-xs font-medium font-sans min-w-[800px]">
                          <thead className="sticky top-0 z-10 shadow-sm">
                            <tr className="bg-slate-100/90 backdrop-blur-sm text-slate-600">
                              <th className="border-b border-r border-slate-200 px-4 py-2 text-center font-bold text-[10px] uppercase w-24">Data</th>
                              <th className="border-b border-r border-slate-200 px-4 py-2 text-left font-bold text-[10px] uppercase w-32">Nº Nota</th>
                              <th className="border-b border-r border-slate-200 px-4 py-2 text-center font-bold text-[10px] uppercase w-24">CFOP</th>
                              <th className="border-b border-r border-slate-200 px-4 py-2 text-left font-bold text-[10px] uppercase">Emitente</th>
                              <th className="border-b border-r border-slate-200 px-4 py-2 text-right font-bold text-[10px] uppercase">Base Cálc.</th>
                              <th className="border-b border-r border-slate-200 px-4 py-2 text-center font-bold text-[10px] uppercase">Alíquota</th>
                              <th className="border-b border-slate-200 px-4 py-2 text-right font-bold text-[10px] uppercase text-emerald-800 w-32">ICMS Creditado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {notasEntrada.length > 0 ? (
                              notasEntrada.map((n, idx) => (
                                <tr key={`${n.num}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                  <td className="border-r border-slate-200 px-4 py-2 text-center text-slate-500 whitespace-nowrap">{n.dataFormatada}</td>
                                  <td className="border-r border-slate-200 px-4 py-2 text-left font-mono text-slate-600">{n.num}</td>
                                  <td className="border-r border-slate-200 px-4 py-2 text-center font-mono text-slate-500">{n.cfopStr}</td>
                                  <td className="border-r border-slate-200 px-4 py-2 text-left text-slate-700 truncate max-w-[250px]">{n.emitente}</td>
                                  <td className="border-r border-slate-200 px-4 py-2 text-right tabular-nums text-slate-600"><FormatCurrencyExcel value={n.vlrNota} /></td>
                                  <td className="border-r border-slate-200 px-4 py-2 text-center font-bold text-slate-500">{n.aliqStr}</td>
                                  <td className="px-4 py-2 text-right tabular-nums font-bold text-emerald-700 bg-emerald-50/20"><FormatCurrencyExcel value={n.creditoIcms} /></td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                                  Nenhuma nota de entrada com CFOP 1102 ou 2102 encontrada no período.
                                </td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot className="sticky bottom-0 z-10 bg-emerald-50 border-t-2 border-emerald-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <tr>
                              <td colSpan={6} className="border-r border-emerald-200 px-4 py-3 text-right font-black text-emerald-900 uppercase tracking-widest">
                                SOMA TOTAL DE CRÉDITOS
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums font-black text-emerald-800">
                                <FormatCurrencyExcel value={totalIcmsEntradas} />
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                </div>
            </div>

          </div>
        )}
      </main>

      {/* Snackbar / Toast Customizado */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-in-out ${toastState.open ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
          }`}
      >
        <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm ${toastState.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'
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