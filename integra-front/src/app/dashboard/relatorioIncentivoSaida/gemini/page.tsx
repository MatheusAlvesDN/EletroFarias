    'use client';

    import React, { useCallback, useEffect, useMemo, useState } from 'react';
    import {
    LayoutDashboard,
    Calendar,
    Filter,
    Search,
    FileText,
    ChevronRight,
    TrendingDown,
    AlertCircle,
    Server,
    Menu,
    Settings,
    LogOut,
    Users,
    X,
    FileCode2,
    ExternalLink,
    Eye,
    PlusCircle,
    GripHorizontal,
    Loader2,
    RotateCw,
    } from 'lucide-react';

    import { Responsive } from 'react-grid-layout';
    import type { Layout, ResponsiveProps } from 'react-grid-layout';

    // Tipamos manualmente os layouts do react-grid-layout:
    type AllLayouts = Partial<Record<string, Layout>>;

    /**
     * ✅ Wrapper que substitui o WidthProvider (evita erro no Turbopack/ESM)
     * Injeta width via ResizeObserver.
     */
    type ResponsiveWrapperProps = Omit<ResponsiveProps, 'width'> & {
    className?: string;
    compactType?: 'vertical' | 'horizontal' | null;
    preventCollision?: boolean;
    isResizable?: boolean;
    isDraggable?: boolean;
    draggableHandle?: string;
    resizeHandles?: ('s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne')[];
    };

    function ResponsiveGridLayoutWrapper({
    children,
    className,
    ...props
    }: ResponsiveWrapperProps) {
    const ref = React.useRef<HTMLDivElement | null>(null);
    const [width, setWidth] = React.useState<number>(1200);

    React.useEffect(() => {
        if (!ref.current) return;

        const el = ref.current;

        const update = () => {
        const w = Math.floor(el.getBoundingClientRect().width || 1200);
        if (w > 0) setWidth(w);
        };

        update();

        const ro = new ResizeObserver(() => update());
        ro.observe(el);

        return () => ro.disconnect();
    }, []);

    return (
        <div ref={ref} className="w-full">
        <Responsive width={width} className={className} {...props}>
            {children}
        </Responsive>
        </div>
    );
    }

    // --- Componente SidebarMenu ---
    const SidebarMenu = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    return (
        <>
        <div
            className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 backdrop-blur-sm ${
            open ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={onClose}
        />
        <aside
            className={`fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
            open ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
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
            <div className="px-4 py-3 rounded-lg bg-emerald-50 text-emerald-900 font-medium flex items-center gap-3 border border-emerald-100 cursor-pointer transition-colors">
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
            </div>
            <div className="px-4 py-3 rounded-lg text-slate-600 font-medium flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors">
                <TrendingDown className="w-5 h-5" />
                Saídas
            </div>
            <div className="px-4 py-3 rounded-lg text-slate-600 font-medium flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors">
                <Users className="w-5 h-5" />
                Parceiros
            </div>
            <div className="px-4 py-3 rounded-lg text-slate-600 font-medium flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors">
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

    // --- Tipos & Helpers ---

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
    IMPOSTOS: number;
    CODEMP: number;
    };
    type XmlRow = { NUMNOTA?: number | string; VLRNOTA?: number | string; XML?: string };
    type NumericFilter = { min: string; max: string };

    type MonthData = {
    dataTop: TopRow[];
    dataTipo: TipoRow[];
    dataParc: ParceiroRow[];
    xmlRows: XmlRow[];
    };

    function toNumber(v: any): number {
    if (v == null) return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = String(v).trim().replace(/[^\d,.\-]/g, '');
    if (!s) return 0;
    if (s.includes(',') && s.includes('.'))
        return Number.isFinite(Number(s.replace(/\./g, '').replace(',', '.')))
        ? Number(s.replace(/\./g, '').replace(',', '.'))
        : 0;
    if (s.includes(',') && !s.includes('.'))
        return Number.isFinite(Number(s.replace(',', '.'))) ? Number(s.replace(',', '.')) : 0;
    return Number.isFinite(Number(s)) ? Number(s) : 0;
    }

    function normalizeKeysUpper(row: AnyObj): AnyObj {
    const out: AnyObj = {};
    for (const k of Object.keys(row || {})) out[String(k).toUpperCase()] = row[k];
    return out;
    }

    type Visao = 'top' | 'tipo' | 'parceiro' | 'detalhe' | 'entrada';

    function extractRows(payload: any, visao: Visao): AnyObj[] {
    if (!payload) return [];
    if (
        Array.isArray(payload) &&
        payload.length &&
        typeof payload[0] === 'object' &&
        !Array.isArray(payload[0])
    )
        return payload.map(normalizeKeysUpper);

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

    if (
        Array.isArray(candidate) &&
        candidate.length &&
        typeof candidate[0] === 'object' &&
        !Array.isArray(candidate[0])
    )
        return candidate.map(normalizeKeysUpper);

    if (Array.isArray(candidate) && candidate.length && Array.isArray(candidate[0])) {
        return candidate.map((row: any[]) => {
        if (visao === 'top' || visao === 'entrada')
            return normalizeKeysUpper({
            TOPS: row[0],
            QTD_NOTAS: row[1],
            DESCRICAO: row[2],
            VLR_TOTAL_ST: row[3],
            VLR_TOTAL_TB: row[4],
            VLR_TOTAL: row[5],
            });
        if (visao === 'tipo')
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
        if (visao === 'parceiro')
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
        if (visao === 'detalhe')
            return normalizeKeysUpper({
            NUMNOTA: row[0],
            DTNEG: row[1],
            CODTIPOPER: row[2],
            IMPOSTOS: row[6],
            VLRNOTA_AJUSTADO: row[7],
            CODEMP: row[8],
            });
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
    new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(v) ? v : 0);

    function safeString(v: any) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    try {
        return JSON.stringify(v);
    } catch {
        return String(v);
    }
    }

    function maybeBase64ToText(input: string) {
    const s = (input ?? '').trim();
    if (!s) return s;
    const looksB64 = /^[A-Za-z0-9+/=\s]+$/.test(s) && s.length % 4 === 0 && s.length > 40;
    if (!looksB64) return s;
    try {
        const cleaned = s.replace(/\s+/g, '');
        const decoded = atob(cleaned);
        const printableRatio =
        decoded.split('').filter((c) => c >= ' ' || c === '\n' || c === '\r' || c === '\t').length /
        decoded.length;
        return printableRatio > 0.9 ? decoded : s;
    } catch {
        return s;
    }
    }

    function xmlPretty(xml: string) {
    const s = (xml ?? '').trim();
    if (!s) return '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(s, 'text/xml');
        if (doc.getElementsByTagName('parsererror')?.[0]?.textContent) return s;
    } catch {
        return s;
    }
    try {
        const reg = /(>)(<)(\/*)/g;
        let formatted = s.replace(reg, '$1\n$2$3');
        let pad = 0;
        return formatted
        .split('\n')
        .map((line) => {
            let indent = 0;
            if (line.match(/.+<\/\w[^>]*>$/)) indent = 0;
            else if (line.match(/^<\/\w/)) {
            if (pad > 0) pad -= 1;
            } else if (line.match(/^<\w([^>]*[^/])?>.*$/)) indent = 1;
            else indent = 0;
            const out = '  '.repeat(pad) + line;
            pad += indent;
            return out;
        })
        .join('\n');
    } catch {
        return s;
    }
    }

    function escapeHtml(s: string) {
    return s
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function first(el: Element | null | undefined, tag: string): Element | null {
    if (!el) return null;
    return el.getElementsByTagName(tag)[0] ?? null;
    }

    function extractEmitNome(xmlRaw: string) {
    const s = safeString(xmlRaw);
    const decoded = maybeBase64ToText(s);
    if (!decoded) return '-';
    const match =
        decoded.match(/<emit[^>]*>[\s\S]*?<xNome>([\s\S]*?)<\/xNome>[\s\S]*?<\/emit>/i) ||
        decoded.match(/<xNome>([\s\S]*?)<\/xNome>/i);
    return match ? match[1].trim() : 'Não identificado';
    }

    function getRegionColorClass(uf: string) {
    const state = (uf || '').trim().toUpperCase();
    if (state === 'PB') return 'bg-emerald-50 border-emerald-200';
    const sulSudeste = ['PR', 'RS', 'SC', 'ES', 'MG', 'RJ', 'SP'];
    if (sulSudeste.includes(state)) return 'bg-rose-50 border-rose-200';
    return 'bg-amber-50 border-amber-200';
    }

    function getCstPercentage(cst: string, uf: string) {
    if (!cst) return '-';
    const c = String(cst).trim();
    const u = String(uf || '').trim().toUpperCase();
    
    if (c === '60') return '0%';
    if (c === '00') {
        if (u === 'PB') return '0%';
        const sulSudeste = ['PR', 'RS', 'SC', 'ES', 'MG', 'RJ', 'SP'];
        if (sulSudeste.includes(u)) return '3%';
        return '2%';
    }
    return '-';
    }

    const COLUMN_NAMES: Record<string, string> = {
    PERFIL: 'Perfil Fat.',
    QTD_NOTAS: 'Qtd Notas',
    VLR_DEVOLUCAO: 'Devolução',
    VLR_VENDAS: 'Vendas',
    TOTAL: 'Líquido',
    TOTAL_ST: 'Tot. ST',
    TOTAL_TRIB: 'Tot. Trib',
    IMPOSTOST: 'Imp. ST',
    IMPOSTOTRIB: 'Imp. Trib',
    IMPOSTOS: 'Impostos',
    };

    // --- Componentes de UI ---

    interface TableHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
    align?: 'left' | 'right' | 'center';
    onFilter?: () => void;
    isFiltered?: boolean;
    width?: string | number;
    }

    const TableHeader: React.FC<TableHeaderProps> = ({
    children,
    align = 'left',
    onFilter,
    isFiltered,
    width,
    ...props
    }) => (
    <th
        style={{ width }}
        className={`px-4 py-3 bg-emerald-50 text-${align} text-xs font-bold text-emerald-800 uppercase tracking-wider sticky top-0 z-10 border-b border-emerald-100 whitespace-nowrap`}
        {...props}
    >
        <div
        className={`flex items-center gap-1.5 ${
            align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
        }`}
        >
        {children}
        {onFilter && (
            <button
            onClick={(e) => {
                e.stopPropagation();
                onFilter();
            }}
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

    interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
    align?: 'left' | 'right' | 'center';
    }

    const TableCell: React.FC<TableCellProps> = ({ children, align = 'left', className = '', ...props }) => (
    <td
        className={`px-4 py-3 text-sm text-slate-700 whitespace-nowrap border-b border-slate-50 text-${align} ${className}`}
        {...props}
    >
        {children}
    </td>
    );

    // --- Visualizador XML (NF-e e CT-e) ---
    function NfeVisualizer({ xml }: { xml: string }) {
    const parsedData = useMemo(() => {
        if (typeof window === 'undefined' || !xml) return null;
        try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        if (doc.getElementsByTagName('parsererror')?.[0]) return null;
        
        const getText = (parent: Element | null, tag: string) =>
            parent?.getElementsByTagName(tag)[0]?.textContent || '';
        
        const isCTe = doc.getElementsByTagName('infCte').length > 0;

        if (isCTe) {
            const ide = doc.getElementsByTagName('ide')[0];
            const emit = doc.getElementsByTagName('emit')[0];
            const dest = doc.getElementsByTagName('dest')[0];
            const vPrest = doc.getElementsByTagName('vPrest')[0];
            const compNodes = Array.from(vPrest?.getElementsByTagName('Comp') || []);
            const enderEmitNode = first(emit, 'enderEmit');
            const enderDestNode = first(dest, 'enderDest');

            const cstCte = doc.getElementsByTagName('imp')[0]?.getElementsByTagName('CST')[0]?.textContent || '';

            return {
            title: 'CT-e (Conhecimento de Transporte Eletrônico)',
            ide: {
                nNF: getText(ide, 'nCT'),
                natOp: getText(ide, 'natOp'),
                dhEmi: getText(ide, 'dhEmi').split('T')[0],
            },
            emit: {
                xNome: getText(emit, 'xNome'),
                xFant: getText(emit, 'xFant') || getText(emit, 'xNome'),
                CNPJ: getText(emit, 'CNPJ'),
                enderEmit: { UF: getText(enderEmitNode, 'UF') },
            },
            dest: { 
                xNome: getText(dest, 'xNome'), 
                CNPJ: getText(dest, 'CNPJ') || getText(dest, 'CPF'),
                UF: getText(enderDestNode, 'UF')
            },
            total: { 
                vNF: getText(vPrest, 'vTPrest') || '0', 
                vProd: getText(vPrest, 'vRec') || '0' 
            },
            items: compNodes
                .map((comp, idx) => ({
                cProd: `COMP-${String(idx + 1).padStart(2, '0')}`,
                xProd: getText(comp, 'xNome'),
                qCom: '1',
                vUnCom: getText(comp, 'vComp'),
                vProd: getText(comp, 'vComp'),
                cst: cstCte
                }))
                .filter(item => Number(item.vProd) > 0),
            };
        } else {
            const ide = doc.getElementsByTagName('ide')[0];
            const emit = doc.getElementsByTagName('emit')[0];
            const dest = doc.getElementsByTagName('dest')[0];
            const total = doc.getElementsByTagName('ICMSTot')[0];
            const detNodes = Array.from(doc.getElementsByTagName('det'));
            const enderEmitNode = first(emit, 'enderEmit');
            const enderDestNode = first(dest, 'enderDest');
            
            return {
            title: 'NF-e (Nota Fiscal Eletrônica)',
            ide: {
                nNF: getText(ide, 'nNF'),
                natOp: getText(ide, 'natOp'),
                dhEmi: getText(ide, 'dhEmi').split('T')[0],
            },
            emit: {
                xNome: getText(emit, 'xNome'),
                xFant: getText(emit, 'xFant'),
                CNPJ: getText(emit, 'CNPJ'),
                enderEmit: { UF: getText(enderEmitNode, 'UF') },
            },
            dest: { 
                xNome: getText(dest, 'xNome'), 
                CNPJ: getText(dest, 'CNPJ') || getText(dest, 'CPF'),
                UF: getText(enderDestNode, 'UF')
            },
            total: { 
                vNF: getText(total, 'vNF') || '0', 
                vProd: getText(total, 'vProd') || '0' 
            },
            items: detNodes.map((det) => {
                const prod = det.getElementsByTagName('prod')[0];
                const cst = det.getElementsByTagName('CST')[0]?.textContent || det.getElementsByTagName('CSOSN')[0]?.textContent || '';
                return {
                cProd: getText(prod, 'cProd'),
                xProd: getText(prod, 'xProd'),
                qCom: getText(prod, 'qCom'),
                vUnCom: getText(prod, 'vUnCom'),
                vProd: getText(prod, 'vProd'),
                cst
                };
            }),
            };
        }
        } catch {
        return null;
        }
    }, [xml]);

    // ✅ Cálculo do valor total de impostos baseado no CST
    const totalImpostosNota = useMemo(() => {
        if (!parsedData || !parsedData.items) return 0;
        return parsedData.items.reduce((acc, item) => {
        const percStr = getCstPercentage(item.cst, parsedData.dest.UF);
        let percNum = 0;
        if (percStr === '2%') percNum = 0.02;
        else if (percStr === '3%') percNum = 0.03;
        // '0%' ou '-' mantém percNum como 0
        
        return acc + (Number(item.vProd || 0) * percNum);
        }, 0);
    }, [parsedData]);

    if (!parsedData || !parsedData.ide.nNF) {
        return (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm flex items-start gap-3 m-4">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
            <p className="font-medium text-amber-800">Atenção</p>
            <p className="text-sm text-amber-700">
                Não foi possível montar a visualização gráfica. Alterne para o "XML Bruto".
            </p>
            </div>
        </div>
        );
    }

    const emitenteBgClass = getRegionColorClass(parsedData.emit.enderEmit.UF);

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-slate-50 min-h-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{parsedData.title}</h4>
            <p className="text-sm text-slate-700 mb-1.5">
                <span className="font-bold text-slate-900">Número:</span> {parsedData.ide.nNF}
            </p>
            <p className="text-sm text-slate-700 mb-1.5">
                <span className="font-bold text-slate-900">Emissão:</span> {parsedData.ide.dhEmi}
            </p>
            <p className="text-sm text-slate-700">
                <span className="font-bold text-slate-900">Natureza:</span> {parsedData.ide.natOp}
            </p>
            </div>
            <div className={`border rounded-xl p-4 shadow-sm transition-colors ${emitenteBgClass}`}>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Emitente</h4>
            <p className="text-sm text-slate-800 mb-1.5 line-clamp-1" title={parsedData.emit.xNome}>
                <span className="font-bold text-slate-900">Nome:</span> {parsedData.emit.xNome}
            </p>
            <p className="text-sm text-slate-800 mb-1.5">
                <span className="font-bold text-slate-900">Fantasia:</span> {parsedData.emit.xFant}
            </p>
            <div className="flex gap-4">
                <p className="text-sm text-slate-800">
                <span className="font-bold text-slate-900">CNPJ:</span> {parsedData.emit.CNPJ}
                </p>
                <p className="text-sm text-slate-800">
                <span className="font-bold text-slate-900">UF:</span> {parsedData.emit.enderEmit.UF}
                </p>
            </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Destinatário</h4>
            <p className="text-sm text-slate-700 mb-1.5 line-clamp-2" title={parsedData.dest.xNome}>
                <span className="font-bold text-slate-900">Nome:</span> {parsedData.dest.xNome}
            </p>
            <div className="flex gap-4">
                <p className="text-sm text-slate-700">
                <span className="font-bold text-slate-900">CNPJ/CPF:</span> {parsedData.dest.CNPJ}
                </p>
                <p className="text-sm text-slate-700">
                <span className="font-bold text-slate-900">UF:</span> {parsedData.dest.UF || '-'}
                </p>
            </div>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800">Itens / Componentes</h3>
            </div>
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                <tr>
                    <TableHeader>Código</TableHeader>
                    <TableHeader>Descrição</TableHeader>
                    <TableHeader align="center">CST</TableHeader>
                    <TableHeader align="center">Tx (%)</TableHeader>
                    <TableHeader align="right">Qtd</TableHeader>
                    <TableHeader align="right">Vlr Unit</TableHeader>
                    <TableHeader align="right">Vlr Total</TableHeader>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                {parsedData.items.map((item, i) => {
                    const perc = getCstPercentage(item.cst, parsedData.dest.UF);
                    return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium text-slate-900">{item.cProd}</TableCell>
                        <TableCell className="max-w-[300px] truncate" title={item.xProd}>
                        {item.xProd}
                        </TableCell>
                        <TableCell align="center" className="font-mono text-slate-600">
                        {item.cst || '-'}
                        </TableCell>
                        <TableCell align="center">
                        {item.cst && perc !== '-' ? (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            {perc}
                            </span>
                        ) : (
                            <span className="text-slate-400">-</span>
                        )}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums">
                        {Number(item.qCom).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums">
                        R$ {Number(item.vUnCom).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell align="right" className="font-bold text-emerald-700 tabular-nums">
                        R$ {Number(item.vProd).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                    </tr>
                    );
                })}
                </tbody>
            </table>
            </div>
        </div>

        {/* ✅ NOVA EXIBIÇÃO: Total do Documento e Total de Impostos (Calculado) lado a lado */}
        <div className="flex justify-end gap-4">
            <div className="bg-white text-slate-800 rounded-xl px-6 py-4 shadow-md border border-slate-200 flex flex-col items-end">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Impostos (Calc.)</span>
            <span className="text-2xl font-black tabular-nums text-rose-600">
                R$ {totalImpostosNota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            </div>

            <div className="bg-emerald-600 text-white rounded-xl px-6 py-4 shadow-md border border-emerald-500 flex flex-col items-end">
            <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Total do Documento</span>
            <span className="text-2xl font-black tabular-nums">
                R$ {Number(parsedData.total.vNF).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            </div>
        </div>
        </div>
    );
    }

    // --- Widgets (layout livre + responsivo via react-grid-layout) ---
    type WidgetConfig = {
    id: string;
    type: 'saida' | 'tipo' | 'parceiros' | 'xml';
    dtRef: string;
    title: string;
    icon: any;

    // RGL layout
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    };

    // ⚠️ Importante: no react-grid-layout, "Layout" JÁ é o array de itens
    const widgetsToLayout = (widgets: WidgetConfig[]): Layout =>
    widgets.map((w) => ({
        i: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: w.minW ?? 2,
        minH: w.minH ?? 6,
    }));

    const applyLayoutToWidgets = (widgets: WidgetConfig[], layout: Layout) => {
    const map = new Map(layout.map((l) => [l.i, l]));
    return widgets.map((w) => {
        const l = map.get(w.id);
        if (!l) return w;
        return { ...w, x: l.x, y: l.y, w: l.w, h: l.h };
    });
    };

    // --- Componente Principal ---
    export default function DashboardSankhya() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [dtInput, setDtInput] = useState<string>(new Date().toISOString().slice(0, 7));
    const [loadingMeses, setLoadingMeses] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);

    const [monthsData, setMonthsData] = useState<Record<string, MonthData>>({});
    const [activeMonths, setActiveMonths] = useState<string[]>([]);

    const [xmlStates, setXmlStates] = useState<Record<string, { q: string; page: number }>>({});
    const xmlPageSize = 25;

    const [selectedParc, setSelectedParc] = useState<{ cod: number; dtRef: string } | null>(null);
    const [dataDetalhe, setDataDetalhe] = useState<DetalheRow[]>([]);
    const [loadingDetalhe, setLoadingDetalhe] = useState(false);

    const [dlgOpen, setDlgOpen] = useState(false);
    const [dlgTitle, setDlgTitle] = useState('');
    const [dlgXml, setDlgXml] = useState('');
    const [dlgWarn, setDlgWarn] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'visual' | 'raw'>('visual');

    const [perfilFilter, setPerfilFilter] = useState<string[]>([]);
    const [numericFilters, setNumericFilters] = useState<Record<string, NumericFilter>>({});
    const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
    const [modalPerfil, setModalPerfil] = useState<string[]>([]);
    const [modalMin, setModalMin] = useState<string>('');
    const [modalMax, setModalMax] = useState<string>('');

    const [widgets, setWidgets] = useState<WidgetConfig[]>([]);

    const removeWidget = useCallback((id: string) => {
        setWidgets((prev) => prev.filter((w) => w.id !== id));
        setXmlStates((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
        });
    }, []);

    const API_BASE = useMemo(() => (process.env.NEXT_PUBLIC_API_URL ?? '').trim(), []);
    const DASH_URL = useMemo(
        () => `${API_BASE.replace(/\/$/, '')}/dash/relatorioSaidaIncentivoGerencia`,
        [API_BASE]
    );
    const XML_URL = useMemo(() => `${API_BASE.replace(/\/$/, '')}/sankhya/nfe`, [API_BASE]);

    const fetchVisao = useCallback(
        async (visao: Visao, dtRefStr: string, codParc?: number) => {
        const params = new URLSearchParams();
        params.set('dtRef', `${dtRefStr}-01`);
        params.set('visao', visao === 'tipo' ? 'perfil' : visao);
        if (typeof codParc === 'number') params.set('codParc', String(codParc));

        const res = await fetch(`${DASH_URL}?${params.toString()}`, {
            headers: { Accept: 'application/json' },
        });
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
        [DASH_URL]
    );

    const refreshMonth = useCallback(
        async (monthStr: string) => {
        if (!monthStr) return;
        setLoadingMeses((p) => ({ ...p, [monthStr]: true }));
        setError(null);

        try {
            const [year, month] = monthStr.split('-');
            const dtIniXml = `${monthStr}-01`;
            const lastDay = new Date(Number(year), Number(month), 0).getDate();
            const dtFimXml = `${monthStr}-${lastDay}`;
            const xmlQs = `dtIni=${encodeURIComponent(dtIniXml)}&dtFim=${encodeURIComponent(dtFimXml)}`;

            const [topRaw, tipoRaw, parcRaw, xmlRes] = await Promise.all([
            fetchVisao('top', monthStr),
            fetchVisao('tipo', monthStr),
            fetchVisao('parceiro', monthStr),
            fetch(`${XML_URL}?${xmlQs}`, { headers: { Accept: 'application/json' }, cache: 'no-store' }).catch(
                () => null
            ),
            ]);

            const dTop = topRaw.map((r) => ({
            TOPS: String(r.TOPS ?? ''),
            QTD_NOTAS: toNumber(r.QTD_NOTAS),
            DESCRICAO: String(r.DESCRICAO ?? ''),
            VLR_TOTAL_ST: toNumber(r.VLR_TOTAL_ST),
            VLR_TOTAL_TB: toNumber(r.VLR_TOTAL_TB),
            VLR_TOTAL: toNumber(r.VLR_TOTAL),
            }));

            const dTipo = tipoRaw.map((r) => ({
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
            }));

            const dParc = parcRaw.map((r) => ({
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
            }));

            let dXml: XmlRow[] = [];
            if (xmlRes && xmlRes.ok) {
            const xmlData = await xmlRes.json();
            dXml = Array.isArray(xmlData) ? xmlData : Array.isArray(xmlData?.data) ? xmlData.data : [];
            }

            setMonthsData((prev) => ({
            ...prev,
            [monthStr]: { dataTop: dTop, dataTipo: dTipo, dataParc: dParc, xmlRows: dXml },
            }));
        } catch (e: any) {
            console.error(e);
            setError(`Erro ao atualizar dados de ${monthStr}: ` + (e?.message ?? ''));
        } finally {
            setLoadingMeses((p) => ({ ...p, [monthStr]: false }));
        }
        },
        [fetchVisao, XML_URL]
    );

    const loadMonth = useCallback(
        async (monthStr: string) => {
        if (!monthStr) return;

        if (!activeMonths.includes(monthStr)) {
            setActiveMonths((prev) => [...prev, monthStr]);
            setLoadingMeses((p) => ({ ...p, [monthStr]: true }));
            setError(null);

            setXmlStates((p) => ({ ...p, [`xml-${monthStr}`]: { q: '', page: 0 } }));

            setWidgets((prev) => {
            const nextY = prev.length ? Math.max(...prev.map((w) => w.y + w.h)) : 0;

            return [
                ...prev,
                {
                id: `saida-${monthStr}`,
                type: 'saida',
                dtRef: monthStr,
                title: `Saídas (${monthStr})`,
                icon: TrendingDown,
                x: 0,
                y: nextY,
                w: 8,       
                h: 11,      
                minW: 4,
                minH: 8,
                },
                {
                id: `tipo-${monthStr}`,
                type: 'tipo',
                dtRef: monthStr,
                title: `Tipos (${monthStr})`,
                icon: Filter,
                x: 0,
                y: nextY + 11,
                w: 8,       
                h: 11,
                minW: 4,
                minH: 8,
                },
                {
                id: `xml-${monthStr}`,
                type: 'xml',
                dtRef: monthStr,
                title: `XMLs (NF-e / CT-e) (${monthStr})`,
                icon: FileCode2,
                x: 8,
                y: nextY,
                w: 4,       
                h: 22,      
                minW: 3,
                minH: 10,
                },
                {
                id: `parceiros-${monthStr}`,
                type: 'parceiros',
                dtRef: monthStr,
                title: `Parceiros (${monthStr})`,
                icon: LayoutDashboard,
                x: 0,
                y: nextY + 22,
                w: 12,      
                h: 16,
                minW: 6,
                minH: 10,
                },
            ];
            });

            try {
            await refreshMonth(monthStr);
            } finally {
            setLoadingMeses((p) => ({ ...p, [monthStr]: false }));
            }
        } else {
            await refreshMonth(monthStr);
        }
        },
        [activeMonths, refreshMonth]
    );

    useEffect(() => {
        loadMonth(new Date().toISOString().slice(0, 7));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!selectedParc) return;
        const run = async () => {
        setLoadingDetalhe(true);
        try {
            const detRaw = await fetchVisao('detalhe', selectedParc.dtRef, selectedParc.cod);
            setDataDetalhe(
            detRaw.map((r) => ({
                NUMNOTA: toNumber(r.NUMNOTA),
                DTNEG: String(r.DTNEG ?? ''),
                CODTIPOPER: toNumber(r.CODTIPOPER),
                IMPOSTOS: toNumber(r.IMPOSTOS),
                VLRNOTA_AJUSTADO: toNumber(r.VLRNOTA_AJUSTADO),
                CODEMP: toNumber(r.CODEMP),
            }))
            );
        } catch (e) {
            console.error(e);
            setDataDetalhe([]);
        } finally {
            setLoadingDetalhe(false);
        }
        };
        run();
    }, [selectedParc, fetchVisao]);

    const openXmlModal = (r: XmlRow) => {
        setDlgWarn(null);
        setViewMode('visual');
        const num = safeString(r.NUMNOTA);
        const vlr = safeString(r.VLRNOTA);
        const raw = safeString(r.XML);
        const decoded = maybeBase64ToText(raw);
        const pretty = xmlPretty(decoded);
        if (!pretty.trim()) setDlgWarn('XML vazio.');
        else if (!pretty.trim().startsWith('<')) setDlgWarn('Conteúdo não parece XML puro. Mostrando texto bruto.');
        setDlgTitle(`Documento Fiscal — NUM ${num || '-'} | VLR ${vlr || '-'}`);
        setDlgXml(pretty);
        setDlgOpen(true);
    };

    const openInNewTab = () => {
        const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(
        dlgTitle
        )}</title><style>body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; margin: 16px; background-color: #f8fafc; color: #334155; } h3 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; } pre { white-space: pre; overflow: auto; border: 1px solid #cbd5e1; background-color: #ffffff; padding: 16px; border-radius: 8px; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }</style></head><body><h3>${escapeHtml(
        dlgTitle
        )}</h3><pre>${escapeHtml(dlgXml)}</pre></body></html>`;
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    };

    const perfisFat = useMemo(() => {
        const perfis = new Set<string>();
        Object.values(monthsData).forEach((m) => {
        m.dataParc.forEach((r) => {
            if (r.AD_TIPOCLIENTEFATURAR) perfis.add(r.AD_TIPOCLIENTEFATURAR);
        });
        });
        return Array.from(perfis).sort();
    }, [monthsData]);

    const getFilteredParc = (dtRef: string) => {
        const dataParc = monthsData[dtRef]?.dataParc || [];
        return dataParc.filter((row) => {
        if (perfilFilter.length > 0 && !perfilFilter.includes(row.AD_TIPOCLIENTEFATURAR)) return false;
        for (const col in numericFilters) {
            const filter = numericFilters[col];
            if (!filter) continue;
            const val = Number((row as any)[col]) || 0;
            const min = filter.min !== '' ? Number(filter.min) : -Infinity;
            const max = filter.max !== '' ? Number(filter.max) : Infinity;
            if (val < min || val > max) return false;
        }
        return true;
        });
    };

    const hasAnyFilterActive = perfilFilter.length > 0 || Object.keys(numericFilters).length > 0;
    const isCurrencyActive = activeFilterCol !== 'QTD_NOTAS';

    const currentGlobalMaxForSlider = useMemo(() => {
        if (!activeFilterCol || activeFilterCol === 'PERFIL') return 0;
        let maxVal = 0;
        Object.values(monthsData).forEach((m) => {
        m.dataParc.forEach((r) => {
            const val = Number((r as any)[activeFilterCol]) || 0;
            if (val > maxVal) maxVal = val;
        });
        });
        return maxVal > 0 ? maxVal : 1;
    }, [activeFilterCol, monthsData]);

    const openColumnFilter = (col: string) => {
        setActiveFilterCol(col);
        if (col === 'PERFIL') {
        setModalPerfil(perfilFilter);
        } else {
        let maxVal = 0;
        Object.values(monthsData).forEach((m) => {
            m.dataParc.forEach((r) => {
            const val = Number((r as any)[col]) || 0;
            if (val > maxVal) maxVal = val;
            });
        });
        setModalMin(numericFilters[col]?.min || '0');
        setModalMax(numericFilters[col]?.max || String(maxVal > 0 ? maxVal : 1));
        }
    };

    const applyColumnFilter = () => {
        if (activeFilterCol === 'PERFIL') setPerfilFilter(modalPerfil);
        else if (activeFilterCol) {
        if (
            (modalMin === '' || modalMin === '0') &&
            (modalMax === '' || Number(modalMax) >= currentGlobalMaxForSlider)
        ) {
            const newFilters = { ...numericFilters };
            delete newFilters[activeFilterCol];
            setNumericFilters(newFilters);
        } else {
            setNumericFilters({ ...numericFilters, [activeFilterCol]: { min: modalMin, max: modalMax } });
        }
        }
        setActiveFilterCol(null);
    };

    const clearSpecificFilter = () => {
        if (activeFilterCol === 'PERFIL') setPerfilFilter([]);
        else if (activeFilterCol) {
        const newFilters = { ...numericFilters };
        delete newFilters[activeFilterCol];
        setNumericFilters(newFilters);
        }
        setActiveFilterCol(null);
    };

    const clearAllFilters = () => {
        setPerfilFilter([]);
        setNumericFilters({});
    };

    const formatFilterDisplayValue = (v: string | number) =>
        isCurrencyActive ? formatCurrency(Number(v) || 0) : Number(v) || 0;

    const renderContent = (w: WidgetConfig) => {
        const data = monthsData[w.dtRef];
        const isLoading = loadingMeses[w.dtRef];

        if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-emerald-600">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span className="text-xs font-bold">Carregando Mês...</span>
            </div>
        );
        }

        if (!data) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Dados Indisponíveis
            </div>
        );
        }

        const sectionShell = (children: React.ReactNode) => (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">{children}</div>
        );

        const tableShell = (children: React.ReactNode) => (
        <div className="flex-1 min-h-0 overflow-auto relative">
            <table className="min-w-full divide-y divide-slate-100">{children}</table>
        </div>
        );

        const sum = (arr: number[]) => arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

        if (w.type === 'saida') {
        const rows = data.dataTop || [];
        const total = sum(rows.map((r) => toNumber(r.VLR_TOTAL)));
        const totalST = sum(rows.map((r) => toNumber(r.VLR_TOTAL_ST)));
        const totalTB = sum(rows.map((r) => toNumber(r.VLR_TOTAL_TB)));
        const qtd = sum(rows.map((r) => toNumber(r.QTD_NOTAS)));

        return sectionShell(
            <>
            <div className="p-4 border-b border-slate-100 bg-white">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Qtd Notas</div>
                    <div className="text-lg font-black text-slate-800 tabular-nums">
                    {qtd.toLocaleString('pt-BR')}
                    </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Total</div>
                    <div className="text-lg font-black text-emerald-700 tabular-nums">
                    {formatCurrency(total)}
                    </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Total ST</div>
                    <div className="text-lg font-black text-slate-800 tabular-nums">
                    {formatCurrency(totalST)}
                    </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Total Trib</div>
                    <div className="text-lg font-black text-slate-800 tabular-nums">
                    {formatCurrency(totalTB)}
                    </div>
                </div>
                </div>
            </div>

            {tableShell(
                <>
                <thead className="bg-slate-50/50 sticky top-0 z-10">
                    <tr>
                    <TableHeader>TOP</TableHeader>
                    <TableHeader>Descrição</TableHeader>
                    <TableHeader align="right">Qtd</TableHeader>
                    <TableHeader align="right">ST</TableHeader>
                    <TableHeader align="right">Trib</TableHeader>
                    <TableHeader align="right">Total</TableHeader>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {rows.map((r, idx) => (
                    <tr key={`${r.TOPS}-${idx}`} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium text-slate-900">{r.TOPS}</TableCell>
                        <TableCell className="max-w-[360px] truncate" title={r.DESCRICAO}>
                        {r.DESCRICAO}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums">
                        {toNumber(r.QTD_NOTAS).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums">
                        {formatCurrency(toNumber(r.VLR_TOTAL_ST))}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums">
                        {formatCurrency(toNumber(r.VLR_TOTAL_TB))}
                        </TableCell>
                        <TableCell align="right" className="font-bold text-emerald-700 tabular-nums">
                        {formatCurrency(toNumber(r.VLR_TOTAL))}
                        </TableCell>
                    </tr>
                    ))}
                    {rows.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-10 text-center text-slate-400 text-sm">
                        Sem dados.
                        </td>
                    </tr>
                    )}
                </tbody>
                </>
            )}
            </>
        );
        }

        if (w.type === 'tipo') {
        const rows = data.dataTipo || [];
        return sectionShell(
            <>
            {tableShell(
                <>
                <thead className="bg-slate-50/50 sticky top-0 z-10">
                    <tr>
                    <TableHeader>Cód</TableHeader>
                    <TableHeader>Tipo</TableHeader>
                    <TableHeader align="right">Fator ST</TableHeader>
                    <TableHeader align="right">Fator Trib</TableHeader>
                    <TableHeader align="right">Vendas</TableHeader>
                    <TableHeader align="right">Imp.</TableHeader>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {rows.map((r, idx) => (
                    <tr key={`${r.TIPO_COD}-${idx}`} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-mono text-slate-800">{r.TIPO_COD}</TableCell>
                        <TableCell className="max-w-[420px] truncate" title={r.TIPO_DESC}>
                        {r.TIPO_DESC}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums">
                        {formatPercent(toNumber(r.FATOR_ST))}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums">
                        {formatPercent(toNumber(r.FATOR_TRIB))}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums">
                        {formatCurrency(toNumber(r.TOT_VENDAS))}
                        </TableCell>
                        <TableCell align="right" className="font-bold text-slate-800 tabular-nums">
                        {formatCurrency(toNumber(r.TOT_IMPOSTOS))}
                        </TableCell>
                    </tr>
                    ))}
                    {rows.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-10 text-center text-slate-400 text-sm">
                        Sem dados.
                        </td>
                    </tr>
                    )}
                </tbody>
                </>
            )}
            </>
        );
        }

        if (w.type === 'parceiros') {
        const rows = getFilteredParc(w.dtRef);

        const totalLiquido = sum(rows.map((r) => toNumber(r.TOTAL)));
        const totalImpostos = sum(rows.map((r) => toNumber(r.IMPOSTOS)));
        
        const totalQtd = sum(rows.map((r) => toNumber(r.QTD_NOTAS)));
        const totalVendas = sum(rows.map((r) => toNumber(r.VLR_VENDAS)));
        const totalDevolucao = sum(rows.map((r) => toNumber(r.VLR_DEVOLUCAO)));

        return sectionShell(
            <>
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Registros:
                </span>
                <span className="text-sm font-black text-slate-800 tabular-nums">
                    {rows.length.toLocaleString('pt-BR')}
                </span>
                {hasAnyFilterActive && (
                    <span className="ml-2 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    filtros ativos
                    </span>
                )}
                </div>

                <div className="flex gap-2">
                <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Líquido</div>
                    <div className="text-sm font-black text-emerald-700 tabular-nums">
                    {formatCurrency(totalLiquido)}
                    </div>
                </div>
                <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Impostos</div>
                    <div className="text-sm font-black text-slate-800 tabular-nums">
                    {formatCurrency(totalImpostos)}
                    </div>
                </div>
                </div>
            </div>

            {tableShell(
                <>
                <thead className="bg-slate-50/50 sticky top-0 z-10 shadow-sm">
                    <tr>
                    <TableHeader>Parceiro</TableHeader>
                    <TableHeader
                        onFilter={() => openColumnFilter('PERFIL')}
                        isFiltered={perfilFilter.length > 0}
                    >
                        {COLUMN_NAMES.PERFIL}
                    </TableHeader>

                    <TableHeader
                        align="right"
                        onFilter={() => openColumnFilter('QTD_NOTAS')}
                        isFiltered={!!numericFilters.QTD_NOTAS}
                    >
                        {COLUMN_NAMES.QTD_NOTAS}
                    </TableHeader>

                    <TableHeader
                        align="right"
                        onFilter={() => openColumnFilter('VLR_VENDAS')}
                        isFiltered={!!numericFilters.VLR_VENDAS}
                    >
                        {COLUMN_NAMES.VLR_VENDAS}
                    </TableHeader>

                    <TableHeader
                        align="right"
                        onFilter={() => openColumnFilter('VLR_DEVOLUCAO')}
                        isFiltered={!!numericFilters.VLR_DEVOLUCAO}
                    >
                        {COLUMN_NAMES.VLR_DEVOLUCAO}
                    </TableHeader>

                    <TableHeader
                        align="right"
                        onFilter={() => openColumnFilter('TOTAL')}
                        isFiltered={!!numericFilters.TOTAL}
                    >
                        {COLUMN_NAMES.TOTAL}
                    </TableHeader>

                    <TableHeader
                        align="right"
                        onFilter={() => openColumnFilter('IMPOSTOS')}
                        isFiltered={!!numericFilters.IMPOSTOS}
                    >
                        {COLUMN_NAMES.IMPOSTOS}
                    </TableHeader>

                    <TableHeader align="center">Detalhar</TableHeader>
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                    {rows.map((r) => (
                    <tr key={r.CODPARC} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="max-w-[360px]">
                        <div className="font-bold text-slate-900 truncate" title={r.NOMEPARC}>
                            {r.NOMEPARC}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{r.CODPARC}</div>
                        </TableCell>

                        <TableCell>
                        <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                            {r.AD_TIPOCLIENTEFATURAR || '-'}
                        </span>
                        </TableCell>

                        <TableCell align="right" className="tabular-nums">
                        {toNumber(r.QTD_NOTAS).toLocaleString('pt-BR')}
                        </TableCell>

                        <TableCell align="right" className="tabular-nums">
                        {formatCurrency(toNumber(r.VLR_VENDAS))}
                        </TableCell>

                        <TableCell align="right" className="tabular-nums text-red-600">
                        {formatCurrency(toNumber(r.VLR_DEVOLUCAO))}
                        </TableCell>

                        <TableCell align="right" className="font-black text-emerald-700 tabular-nums">
                        {formatCurrency(toNumber(r.TOTAL))}
                        </TableCell>

                        <TableCell align="right" className="tabular-nums">
                        {formatCurrency(toNumber(r.IMPOSTOS))}
                        </TableCell>

                        <TableCell align="center">
                        <button
                            onClick={() => setSelectedParc({ cod: r.CODPARC, dtRef: w.dtRef })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-colors"
                            title="Abrir notas do parceiro"
                        >
                            <Eye className="w-4 h-4" />
                            Ver
                        </button>
                        </TableCell>
                    </tr>
                    ))}

                    {rows.length === 0 && (
                    <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400 text-sm">
                        Nenhum parceiro encontrado (verifique filtros).
                        </td>
                    </tr>
                    )}
                </tbody>

                {rows.length > 0 && (
                    <tfoot className="sticky bottom-0 z-20 bg-emerald-100/90 backdrop-blur-md border-t-2 border-emerald-300 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <tr>
                        <td 
                        colSpan={2} 
                        className="px-4 py-3 text-xs font-black text-emerald-900 text-right uppercase tracking-wider whitespace-nowrap"
                        >
                        Total Geral ({rows.length} Parceiros):
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-emerald-900 text-right tabular-nums whitespace-nowrap">
                        {totalQtd.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-red-600 text-right tabular-nums whitespace-nowrap">
                        {formatCurrency(totalVendas)}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-red-600 text-right tabular-nums whitespace-nowrap">
                        {formatCurrency(totalDevolucao)}
                        </td>
                        <td className="px-4 py-3 text-sm font-black text-emerald-800 text-right tabular-nums whitespace-nowrap">
                        {formatCurrency(totalLiquido)}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-emerald-900 text-right tabular-nums whitespace-nowrap">
                        {formatCurrency(totalImpostos)}
                        </td>
                        <td></td>
                    </tr>
                    </tfoot>
                )}
                </>
            )}
            </>
        );
        }

        // w.type === 'xml'
        {
        const st = xmlStates[w.id] || { q: '', page: 0 };
        const q = (st.q || '').trim().toLowerCase();
        const page = Math.max(0, st.page || 0);

        const rows = (data.xmlRows || []).filter((r) => {
            if (!q) return true;
            const num = safeString(r.NUMNOTA).toLowerCase();
            const vlr = safeString(r.VLRNOTA).toLowerCase();
            const emit = extractEmitNome(safeString(r.XML)).toLowerCase();
            return num.includes(q) || vlr.includes(q) || emit.includes(q);
        });

        const totalPages = Math.max(1, Math.ceil(rows.length / xmlPageSize));
        const safePage = Math.min(page, totalPages - 1);
        const slice = rows.slice(safePage * xmlPageSize, safePage * xmlPageSize + xmlPageSize);

        const setQ = (next: string) =>
            setXmlStates((p) => ({ ...p, [w.id]: { q: next, page: 0 } }));

        const setPage = (next: number) =>
            setXmlStates((p) => ({ ...p, [w.id]: { q: st.q, page: next } }));

        return sectionShell(
            <>
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col gap-3">
                <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                    value={st.q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por NUMNOTA, valor ou emitente..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                <button
                    onClick={() => setQ('')}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors"
                    title="Limpar busca"
                >
                    Limpar
                </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                    {rows.length.toLocaleString('pt-BR')} XML(s)
                    {q ? ` (filtrado)` : ''}
                </span>

                <div className="flex items-center gap-2">
                    <button
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    disabled={safePage <= 0}
                    className="px-2 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50"
                    >
                    ←
                    </button>
                    <span className="font-mono">
                    {safePage + 1}/{totalPages}
                    </span>
                    <button
                    onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                    disabled={safePage >= totalPages - 1}
                    className="px-2 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50"
                    >
                    →
                    </button>
                </div>
                </div>
            </div>

            {tableShell(
                <>
                <thead className="bg-slate-50/50 sticky top-0 z-10">
                    <tr>
                    <TableHeader>Nº Nota</TableHeader>
                    <TableHeader>Emitente</TableHeader>
                    <TableHeader align="right">Valor</TableHeader>
                    <TableHeader align="center">Abrir</TableHeader>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {slice.map((r, idx) => {
                    const num = safeString(r.NUMNOTA);
                    const vlr = toNumber(r.VLRNOTA);
                    const emit = extractEmitNome(safeString(r.XML));
                    return (
                        <tr key={`${num}-${idx}`} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-mono text-slate-800">{num || '-'}</TableCell>
                        <TableCell className="max-w-[260px] truncate" title={emit}>
                            {emit}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums font-bold text-slate-800">
                            {formatCurrency(vlr)}
                        </TableCell>
                        <TableCell align="center">
                            <button
                            onClick={() => openXmlModal(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-colors"
                            title="Visualizar XML"
                            >
                            <Eye className="w-4 h-4" />
                            Ver
                            </button>
                        </TableCell>
                        </tr>
                    );
                    })}

                    {slice.length === 0 && (
                    <tr>
                        <td colSpan={4} className="p-12 text-center text-slate-400 text-sm">
                        Nenhum XML encontrado.
                        </td>
                    </tr>
                    )}
                </tbody>
                </>
            )}
            </>
        );
        }
    };

    const layouts = useMemo<AllLayouts>(() => {
        const base = widgetsToLayout(widgets);
        return { lg: base, md: base, sm: base, xs: base, xxs: base };
    }, [widgets]);

    const onLayoutChange = useCallback(
        (layout: Layout, _layouts: Partial<Record<string, Layout>>) => {
        setWidgets((prev) => applyLayoutToWidgets(prev, layout));
        },
        []
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
        <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-4 left-4 z-50 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100"
            title="Abrir Menu"
        >
            <Menu className="w-7 h-7" />
        </button>

        <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
            <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
                <div className="flex items-center gap-3">
                <Server className="w-8 h-8 opacity-90 text-emerald-100" />
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Painel Gerencial</h1>
                    <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                    Incentivos Fiscais &amp; NFe XML
                    </p>
                </div>
                </div>
                <div className="flex gap-4 items-center">
                <img
                    src="/eletro_farias2.png"
                    alt="Logo 1"
                    className="h-12 w-auto object-contain bg-green/10 rounded px-2"
                    onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    }}
                />
                <img
                    src="/lid-verde-branco.png"
                    alt="Logo 2"
                    className="h-12 w-auto object-contain hidden md:block"
                    onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    }}
                />
                </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <div className="flex items-center gap-2 bg-emerald-800/50 px-3 py-1.5 rounded-lg border border-emerald-600 shadow-inner">
                <Calendar className="w-4 h-4 text-emerald-300" />
                <span className="text-xs font-bold text-emerald-100 uppercase">Mês/Ano:</span>
                <input
                    type="month"
                    value={dtInput}
                    onChange={(e) => setDtInput(e.target.value)}
                    className="bg-transparent text-sm text-white font-bold focus:outline-none cursor-pointer [color-scheme:dark]"
                />
                </div>

                <button
                onClick={() => {
                    Promise.all(activeMonths.map((m) => refreshMonth(m)));
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-white/10 hover:bg-white/15 rounded-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-sm border border-emerald-500"
                title="Atualizar dados"
                >
                <RotateCw className="w-4 h-4" />
                <span className="hidden sm:inline">Atualizar</span>
                </button>

                <button
                onClick={() => loadMonth(dtInput)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-sm border border-emerald-500"
                title="Carregar Mês"
                >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Adicionar</span>
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

            {widgets.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-xl bg-white/50 text-slate-500">
                <LayoutDashboard className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-lg font-medium">Nenhum card aberto</p>
                <p className="text-sm mt-1">Selecione um mês no cabeçalho e clique em "Adicionar" para iniciar.</p>
            </div>
            )}

            {widgets.length > 0 && (
            <div className="bg-transparent">
                <ResponsiveGridLayoutWrapper
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={28}
                compactType={null}        
                preventCollision={false}
                isResizable={true} 
                resizeHandles={['se', 'e', 's']} 
                isDraggable={true}
                draggableHandle=".widget-drag-handle"
                onLayoutChange={onLayoutChange}
                margin={[16, 16]}
                containerPadding={[0, 0]}
                >
                {widgets.map((w) => (
                    <div key={w.id} className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-emerald-50 flex justify-between items-center gap-2 shrink-0">
                        <div className="flex items-center gap-2 font-bold text-emerald-900 select-none">
                        <div 
                            className="widget-drag-handle cursor-move p-1.5 -ml-1.5 hover:bg-emerald-200 rounded text-emerald-600 transition-colors"
                            title="Segure para arrastar o card"
                        >
                            <GripHorizontal className="w-4 h-4 pointer-events-none" />
                        </div>

                        <div 
                            onMouseDown={(e) => e.stopPropagation()} 
                            onTouchStart={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 cursor-default"
                        >
                            <w.icon className="w-5 h-5 text-emerald-600 pointer-events-none" />
                            <span>{w.title}</span>

                            {w.type === 'parceiros' && hasAnyFilterActive && (
                            <span className="ml-2 hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                                Filtros Ativos
                                <button onClick={clearAllFilters} className="hover:text-red-600 transition-colors pointer-events-auto">
                                <X className="w-3 h-3 pointer-events-none" />
                                </button>
                            </span>
                            )}
                        </div>
                        </div>

                        <button
                        onMouseDown={(e) => e.stopPropagation()} 
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={() => removeWidget(w.id)}
                        className="p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                        title="Remover Card"
                        >
                        <X className="w-4 h-4 pointer-events-none" />
                        </button>
                    </div>

                    <div 
                        onMouseDown={(e) => e.stopPropagation()} 
                        onTouchStart={(e) => e.stopPropagation()}
                        className="flex-1 flex flex-col min-h-0 overflow-hidden"
                    >
                        {renderContent(w)}
                    </div>

                    </div>
                ))}
                </ResponsiveGridLayoutWrapper>
            </div>
            )}
        </main>

        {/* DETALHE DA NOTA DO PARCEIRO */}
        {selectedParc && (
            <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-emerald-600 transform transition-transform duration-300 max-h-[60vh] flex flex-col animate-fade-in-up">
            <div className="bg-emerald-700 text-white px-6 py-3 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                <div className="bg-white/10 p-1.5 rounded-lg">
                    <FileText className="w-5 h-5" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                    <span className="font-mono bg-emerald-900 px-2 py-0.5 rounded text-xs text-emerald-100 border border-emerald-600">
                        {selectedParc.cod}
                    </span>
                    <h3 className="font-bold text-sm uppercase tracking-wide">
                        Detalhamento de Notas do Parceiro ({selectedParc.dtRef})
                    </h3>
                    </div>
                </div>
                </div>
                <button
                onClick={() => setSelectedParc(null)}
                className="bg-emerald-800 hover:bg-emerald-900 text-emerald-100 hover:text-white p-2 rounded-lg transition-all border border-emerald-600"
                >
                <ChevronRight className="w-5 h-5 rotate-90" />
                </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
                {loadingDetalhe ? (
                <div className="flex flex-col justify-center items-center h-48 gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-200 border-t-emerald-600" />
                    <span className="text-emerald-700 font-medium text-sm animate-pulse">Carregando...</span>
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
                            <TableCell align="center">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs border border-slate-200 font-medium">
                                {nota.CODTIPOPER}
                            </span>
                            </TableCell>
                            <TableCell align="right" className="font-bold text-slate-800 tabular-nums">
                            {formatCurrency(nota.VLRNOTA_AJUSTADO)}
                            </TableCell>
                            <TableCell align="right" className="text-slate-600 tabular-nums">
                            {formatPercent(nota.IMPOSTOS)}
                            </TableCell>
                            <TableCell align="right" className="text-slate-400">
                            {nota.CODEMP}
                            </TableCell>
                        </tr>
                        ))}
                        {dataDetalhe.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-400 text-sm">
                            Nenhuma nota encontrada.
                            </td>
                        </tr>
                        )}
                    </tbody>
                    </table>
                </div>
                )}
            </div>
            </div>
        )}

        {/* MODAL DO VISUALIZADOR XML NFE / CTE */}
        {dlgOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-full flex flex-col overflow-hidden border border-slate-200">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FileCode2 className="w-5 h-5 text-emerald-600" />
                    {dlgTitle}
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-200/60 p-1 rounded-lg border border-slate-200">
                    <button
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                        viewMode === 'visual'
                            ? 'bg-white shadow-sm text-emerald-700'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                        }`}
                        onClick={() => setViewMode('visual')}
                    >
                        Visual
                    </button>
                    <button
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                        viewMode === 'raw'
                            ? 'bg-white shadow-sm text-emerald-700'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                        }`}
                        onClick={() => setViewMode('raw')}
                    >
                        XML Bruto
                    </button>
                    </div>

                    <button
                    onClick={openInNewTab}
                    disabled={!dlgXml.trim()}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Nova Aba</span>
                    </button>

                    <button
                    onClick={() => setDlgOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                    >
                    <X className="w-5 h-5" />
                    </button>
                </div>
                </div>

                <div className="flex-1 overflow-auto bg-slate-100 relative">
                {dlgWarn && viewMode === 'visual' && (
                    <div className="m-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-medium text-amber-800">Aviso</p>
                        <p className="text-sm text-amber-700">{dlgWarn}</p>
                    </div>
                    </div>
                )}
                {viewMode === 'visual' ? (
                    <NfeVisualizer xml={dlgXml} />
                ) : (
                    <div className="p-4 sm:p-6 min-h-full">
                    <pre className="m-0 p-6 rounded-xl bg-white border border-slate-200 shadow-sm overflow-auto text-xs font-mono text-slate-800 whitespace-pre">
                        {dlgXml}
                    </pre>
                    </div>
                )}
                </div>
            </div>
            </div>
        )}

        {/* MODAL CONTEXTUAL DE FILTRO DOS PARCEIROS */}
        {activeFilterCol && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200">
                <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50/50 flex justify-between items-center">
                <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-emerald-600" /> Filtrar {COLUMN_NAMES[activeFilterCol] || activeFilterCol}
                </h3>
                <button
                    onClick={() => setActiveFilterCol(null)}
                    className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-full hover:bg-slate-100"
                >
                    <X className="w-5 h-5" />
                </button>
                </div>

                <div className="p-5 space-y-4">
                {activeFilterCol === 'PERFIL' ? (
                    <div className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Perfis</label>
                        <button onClick={() => setModalPerfil([])} className="text-[10px] text-emerald-600 font-bold uppercase">
                        Limpar
                        </button>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300">
                        {perfisFat.map((p) => (
                        <label
                            key={p}
                            className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 cursor-pointer shadow-sm group"
                        >
                            <input
                            type="checkbox"
                            checked={modalPerfil.includes(p)}
                            onChange={(e) =>
                                setModalPerfil(e.target.checked ? [...modalPerfil, p] : modalPerfil.filter((item) => item !== p))
                            }
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 accent-emerald-600"
                            />
                            <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-900">{p}</span>
                        </label>
                        ))}
                        {perfisFat.length === 0 && <p className="text-sm text-slate-500 italic p-2">Nenhum perfil.</p>}
                    </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mínimo</label>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            {formatFilterDisplayValue(modalMin || '0')}
                        </span>
                        </div>
                        <input
                        type="range"
                        min={0}
                        max={currentGlobalMaxForSlider}
                        step={isCurrencyActive ? '0.01' : '1'}
                        value={modalMin || 0}
                        onChange={(e) => setModalMin(e.target.value)}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Máximo</label>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            {formatFilterDisplayValue(modalMax || currentGlobalMaxForSlider)}
                        </span>
                        </div>
                        <input
                        type="range"
                        min={0}
                        max={currentGlobalMaxForSlider}
                        step={isCurrencyActive ? '0.01' : '1'}
                        value={modalMax || currentGlobalMaxForSlider}
                        onChange={(e) => setModalMax(e.target.value)}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                    </div>
                    </div>
                )}
                </div>

                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button onClick={clearSpecificFilter} className="text-sm font-bold text-slate-500 hover:text-red-600 transition-colors">
                    Limpar Filtro
                </button>
                <div className="flex gap-2">
                    <button
                    onClick={() => setActiveFilterCol(null)}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                    Cancelar
                    </button>
                    <button
                    onClick={applyColumnFilter}
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
            .scrollbar-thin::-webkit-scrollbar {
            width: 6px;
            height: 6px;
            }
            .scrollbar-thin::-webkit-scrollbar-track {
            background: transparent;
            }
            .scrollbar-thin::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 20px;
            }
            @keyframes fadeInUp {
            from {
                transform: translateY(100%);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
            }
            .animate-fade-in-up {
            animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }

            /* ✅ CSS Injetado para os Redimensionadores dos Cards */
            .react-resizable {
            position: relative;
            }
            .react-resizable-handle {
            position: absolute;
            z-index: 50;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            }
            /* Mostra os controles apenas quando o mouse estiver sobre o card */
            .react-grid-item:hover .react-resizable-handle {
            opacity: 1;
            }
            /* Controle do Canto Inferior Direito (Ícone) */
            .react-resizable-handle-se {
            bottom: 4px;
            right: 4px;
            width: 20px;
            height: 20px;
            cursor: se-resize;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23059669' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='15 3 21 3 21 9'%3E%3C/polyline%3E%3Cpolyline points='9 21 3 21 3 15'%3E%3C/polyline%3E%3Cline x1='21' y1='3' x2='14' y2='10'%3E%3C/line%3E%3Cline x1='3' y1='21' x2='10' y2='14'%3E%3C/line%3E%3C/svg%3E");
            background-size: 14px;
            background-position: bottom right;
            background-repeat: no-repeat;
            }
            /* Controle da Borda Inferior */
            .react-resizable-handle-s {
            bottom: 0;
            left: 0;
            width: 100%;
            height: 8px;
            cursor: s-resize;
            }
            /* Controle da Borda Direita */
            .react-resizable-handle-e {
            top: 0;
            right: 0;
            width: 8px;
            height: 100%;
            cursor: e-resize;
            }
        `}</style>
        </div>
    );
    }