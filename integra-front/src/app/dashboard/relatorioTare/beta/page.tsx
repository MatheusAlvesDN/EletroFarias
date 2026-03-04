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
    CheckCircle2,
    X,
    FileSpreadsheet,
    Users,
    Receipt,
    Tags
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

type JwtPayload = {
    sub?: string;
    email?: string;
    role?: string;
    roles?: string[];
    exp?: number;
    iat?: number;
};

// --- TIPOS PARA O PROCESSAMENTO DA APURAÇÃO TARE ---
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
            {isNegative ? `- ${formatted}` : formatted}
        </span>
    );
};

const formatPercentRound = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
const formatPercent = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

export default function RelatorioIntegrado() {
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

    const [cfopsStr, setCfopsStr] = useState('');

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

    // 🚀 FETCH INTEGRADO
    const fetchNotas = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();

            const params: Record<string, string> = {
                codEmp,
                dtIni,
                dtFim,
                contrib: 'true',
                nContrib: 'true'
            };

            if (cfopsStr.trim() !== '') {
                params.cfops = cfopsStr.trim();
            }

            const qs = new URLSearchParams(params).toString();

            const res = await fetch(`${API_BASE}/sankhya/notas-detalhadas?${qs}`);

            if (!res.ok) throw new Error('Falha ao buscar os dados.');

            const json = await res.json();
            setData(json);
            if (json.length > 0) toast('Relatório gerado com sucesso.', 'success');
            else toast('Nenhum dado encontrado no período.', 'error');
        } catch (err: any) {
            setError(err.message || 'Erro de conexão.');
            toast(err.message || 'Erro na consulta', 'error');
            setData([]);
        } finally {
            setLoading(false);
        }
    };


    // =========================================================================
    // 📊 LÓGICA DA APURAÇÃO TARE
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

            if (cst === '00' && CFOP_ENTRADAS_ICMS.includes(cfop)) {
                baseEntradas00 += valor;
            }

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

        return { buckets, baseEntradas00 };
    }, [data]);

    const { buckets, baseEntradas00 } = tabTareData;

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
                                <input
                                    type="text"
                                    placeholder="Ex: 5102, 5405"
                                    value={cfopsStr}
                                    onChange={(e) => setCfopsStr(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-sm text-slate-700"
                                    title="Deixe em branco para buscar todos ou separe-os por vírgula."
                                />
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
            APURAÇÃO TARE 
        ========================================================= */}
                {data.length > 0 && (
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

                            {/* Container flex-col para forçar um item abaixo do outro */}
                            <div className="p-4 sm:p-5 bg-slate-50/30 flex flex-col gap-6">

                                {/* 1. Resumo Venda Liq TARE */}
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
                                                <td className="px-4 py-3 text-left font-semibold text-slate-600 uppercase border-r border-slate-200">Venda DENTRO DO ESTADO</td>
                                                <td className="px-4 py-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={apForaInterna} /></td>
                                                <td className="px-4 py-3 text-right tabular-nums bg-slate-50/30"><FormatCurrencyExcel value={taxApForaInterna} /></td>
                                            </tr>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 text-left font-semibold text-slate-600 uppercase border-r border-slate-200">Venda Fora DO ESTADO</td>
                                                <td className="px-4 py-3 text-right tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={apForaPB} /></td>
                                                <td className="px-4 py-3 text-right tabular-nums bg-slate-50/30"><FormatCurrencyExcel value={taxApForaPB} /></td>
                                            </tr>
                                        </tbody>
                                        <tfoot className="bg-slate-100/50 border-t border-slate-300">
                                            <tr>
                                                <td className="px-4 py-3 text-right font-black text-slate-800 uppercase tracking-widest border-r border-slate-200">TOTAL</td>
                                                <td className="px-4 py-3 text-right font-bold tabular-nums border-r border-slate-200"><FormatCurrencyExcel value={totalApFora} /></td>
                                                <td className="px-4 py-3 text-right font-bold tabular-nums bg-slate-100"><FormatCurrencyExcel value={totalTaxApFora} /></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                            </div>
                        </div>

                        {/* TERCEIRA LINHA: FECHAMENTO TARE (OCUPANDO TODA A TELA HORIZONTAL COM TABELAS EMPILHADAS) */}
                        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-indigo-100 bg-indigo-50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-xl shadow-sm border border-indigo-200 text-indigo-600">
                                        <Receipt className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm sm:text-base font-bold text-indigo-900 uppercase tracking-wide">Fechamento TARE</h2>
                                        <p className="text-[10px] sm:text-xs text-indigo-700/70 font-bold uppercase tracking-wider mt-0.5">Apuração Final de Impostos</p>
                                    </div>
                                </div>
                            </div>

                            {/* Aqui foi removido o 'lg:flex-row' mantendo apenas 'flex-col' para empilhar */}
                            <div className="p-4 sm:p-5 flex flex-col gap-6 bg-slate-50/30">

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
                                            <tr className="bg-slate-100/50 border-t border-slate-300">
                                                <td className="px-4 py-3 text-right font-black text-slate-800 uppercase tracking-widest border-r border-slate-200">TOTAL</td>
                                                <td className="px-4 py-3 text-right font-bold tabular-nums w-40"><FormatCurrencyExcel value={totalApNormal} /></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm h-fit">
                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-center flex flex-col">
                                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">ENTRADA DE ICMS TRIBUTADA (PRODUTO 00)</h3>
                                        <span className="text-[9px] text-slate-400 font-mono mt-1">1102 1202 1403 1407 1411 1556 1926 1949 2102 2202 2353 2411 2403 2556 2949</span>
                                    </div>
                                    <table className="w-full text-xs font-medium font-sans">
                                        <tbody className="divide-y divide-slate-100">
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 text-right font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200">TOTAL APURADO DAS ENTRADAS</td>
                                                <td className="px-4 py-3 text-right font-bold tabular-nums w-40"><FormatCurrencyExcel value={baseEntradas00} /></td>
                                            </tr>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 text-right font-bold text-emerald-700 uppercase tracking-wider border-r border-slate-200">
                                                    VALOR DO CRÉDITO <br /><span className="text-[9px] text-emerald-600/70">(Base * Pct. N.Contrib)</span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700 w-40"><FormatCurrencyExcel value={creditoCalculado} /></td>
                                            </tr>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 text-right font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200">VALOR A PAGAR</td>
                                                <td className="px-4 py-3 text-right font-bold tabular-nums w-40"><FormatCurrencyExcel value={totalApNormal} /></td>
                                            </tr>
                                            <tr className={saldoFinal < 0 ? 'bg-rose-50/50 border-t border-rose-200' : 'bg-emerald-50/50 border-t border-emerald-200'}>
                                                <td className={`px-4 py-3 text-right font-black uppercase tracking-widest border-r ${saldoFinal < 0 ? 'text-rose-900 border-rose-200' : 'text-emerald-900 border-emerald-200'}`}>SALDO FINAL</td>
                                                <td className="px-4 py-3 text-right text-sm font-black tabular-nums w-40"><FormatCurrencyExcel value={saldoFinal} /></td>
                                            </tr>
                                        </tbody>
                                    </table>
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