'use client';
import DashboardLayout from '@/components/DashboardLayout';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Filter,
  Search,
  FileText,
  ChevronRight,
  ChevronLeft,
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
  Download,
  Printer,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  GripVertical
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

import { Responsive } from 'react-grid-layout';
import type { Layout, ResponsiveProps } from 'react-grid-layout';
import { DANFe } from 'node-sped-pdf';

type AllLayouts = Partial<Record<string, Layout>>;

type WidgetConfig = {
  id: string;
  type: 'saida' | 'tipo' | 'parceiros' | 'xml' | 'resumo-xml';
  title: string;
  icon: any;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

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

type ResponsiveWrapperProps = Omit<ResponsiveProps, 'width'> & {
  className?: string;
  compactType?: 'vertical' | 'horizontal' | null;
  preventCollision?: boolean;
  isResizable?: boolean;
  isDraggable?: boolean;
  draggableHandle?: string;
  resizeHandles?: ('s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne')[];
};

function ResponsiveGridLayoutWrapper({ children, className, ...props }: ResponsiveWrapperProps) {
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

type AnyObj = Record<string, any>;
type Visao = 'top' | 'tipo' | 'parceiro' | 'detalhe' | 'entrada';

type TopRow = { TOPS: string; QTD_NOTAS: number; DESCRICAO: string; VLR_TOTAL_ST: number; VLR_TOTAL_TB: number; VLR_TOTAL: number; };
type TipoRow = { TIPO_COD: string; TIPO_DESC: string; FATOR_ST: number; FATOR_TRIB: number; TOT_VENDAS: number; TOT_VENDAS_ST: number; TOT_VENDAS_TRIB: number; TOT_IMP_ST: number; TOT_IMP_TRIB: number; TOT_IMPOSTOS: number; TOT_ST_PB: number; TOT_TRIB_PB: number; TOT_REST_ST: number; TOT_REST_TRIB: number; };
type ParceiroRow = { CODPARC: number; NOMEPARC: string; AD_TIPOCLIENTEFATURAR: string; QTD_NOTAS: number; VLR_DEVOLUCAO: number; VLR_VENDAS: number; TOTAL: number; TOTAL_ST: number; TOTAL_TRIB: number; IMPOSTOST: number; IMPOSTOTRIB: number; IMPOSTOS: number; ST_IND_PB: number; TRIB_IND_PB: number; RESTANTE_ST: number; RESTANTE_TRIB: number; VALOR_RESTANTE: number; BK_ST?: string; FG_ST?: string; BK_TRIB?: string; FG_TRIB?: string; };
type DetalheRow = { NUMNOTA: number; DTNEG: string; CODTIPOPER: number; VLRNOTA_AJUSTADO: number; IMPOSTOS: number; CODEMP: number; };
type XmlRow = { NUMNOTA?: number | string; VLRNOTA?: number | string; XML?: string };
type NumericFilter = { min: string; max: string };
type MonthData = { dataTop: TopRow[]; dataTipo: TipoRow[]; dataParc: ParceiroRow[]; xmlRows: XmlRow[]; };

function toNumber(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v).trim().replace(/[^\d,.\-]/g, '');
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) return Number.isFinite(Number(s.replace(/\./g, '').replace(',', '.'))) ? Number(s.replace(/\./g, '').replace(',', '.')) : 0;
  if (s.includes(',') && !s.includes('.')) return Number.isFinite(Number(s.replace(',', '.'))) ? Number(s.replace(',', '.')) : 0;
  return Number.isFinite(Number(s)) ? Number(s) : 0;
}

function normalizeKeysUpper(row: AnyObj): AnyObj {
  const out: AnyObj = {};
  for (const k of Object.keys(row || {})) out[String(k).toUpperCase()] = row[k];
  return out;
}

function extractRows(payload: any, visao: Visao): AnyObj[] {
  if (!payload) return [];
  if (Array.isArray(payload) && payload.length && typeof payload[0] === 'object' && !Array.isArray(payload[0])) return payload.map(normalizeKeysUpper);
  const rb = payload.responseBody ?? payload.RESPONSEBODY ?? null;
  const candidate = payload.rows ?? payload.ROWS ?? payload.result ?? payload.RESULT ?? rb?.rows ?? rb?.ROWS ?? rb?.result ?? rb?.RESULT ?? payload;
  if (Array.isArray(candidate) && candidate.length && typeof candidate[0] === 'object' && !Array.isArray(candidate[0])) return candidate.map(normalizeKeysUpper);

  if (Array.isArray(candidate) && candidate.length && Array.isArray(candidate[0])) {
    return candidate.map((row: any[]) => {
      if (visao === 'top' || visao === 'entrada') return normalizeKeysUpper({ TOPS: row[0], QTD_NOTAS: row[1], DESCRICAO: row[2], VLR_TOTAL_ST: row[3], VLR_TOTAL_TB: row[4], VLR_TOTAL: row[5] });
      if (visao === 'tipo') return normalizeKeysUpper({ TIPO_COD: row[0], TIPO_DESC: row[1], FATOR_ST: row[2], FATOR_TRIB: row[3], TOT_VENDAS: row[4], TOT_VENDAS_ST: row[5], TOT_VENDAS_TRIB: row[6], TOT_IMP_ST: row[7], TOT_IMP_TRIB: row[8], TOT_IMPOSTOS: row[9], TOT_ST_PB: row[10], TOT_TRIB_PB: row[11], TOT_REST_ST: row[12], TOT_REST_TRIB: row[13] });
      if (visao === 'parceiro') return normalizeKeysUpper({ CODPARC: row[0], NOMEPARC: row[1], AD_TIPOCLIENTEFATURAR: row[2], VLR_VENDAS: row[3], VLR_DEVOLUCAO: row[4], IMPOSTOTRIB: row[5], IMPOSTOST: row[6], IMPOSTOS: row[7], QTD_NOTAS: row[8], TOTAL: row[9], TOTAL_ST: row[10], TOTAL_TRIB: row[11], ST_IND_PB: row[12], TRIB_IND_PB: row[13], RESTANTE_ST: row[14], RESTANTE_TRIB: row[15], VALOR_RESTANTE: row[16], BK_ST: row[17], FG_ST: row[18], BK_TRIB: row[19], FG_TRIB: row[20] });
      if (visao === 'detalhe') return normalizeKeysUpper({ NUMNOTA: row[0], DTNEG: row[1], CODTIPOPER: row[2], CODPARC: row[3], NOMEPARC: row[4], AD_TIPOCLIENTEFATURAR: row[5], IMPOSTOS: row[6], VLRNOTA_AJUSTADO: row[7], CODEMP: row[8] });
      return normalizeKeysUpper({});
    });
  }
  return [];
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const formatDate = (dateStr: string) => { if (!dateStr) return ''; const d = new Date(dateStr); if (Number.isNaN(d.getTime())) return String(dateStr); return d.toLocaleDateString('pt-BR'); };
const formatPercent = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(v) ? v : 0);

function safeString(v: any) { if (v === null || v === undefined) return ''; if (typeof v === 'string') return v; if (typeof v === 'number' || typeof v === 'boolean') return String(v); try { return JSON.stringify(v); } catch { return String(v); } }

function maybeBase64ToText(input: string) {
  const s = (input ?? '').trim();
  if (!s) return s;
  const looksB64 = /^[A-Za-z0-9+/=\s]+$/.test(s) && s.length % 4 === 0 && s.length > 40;
  if (!looksB64) return s;
  try {
    const cleaned = s.replace(/\s+/g, '');
    const decoded = atob(cleaned);
    const printableRatio = decoded.split('').filter((c) => c >= ' ' || c === '\n' || c === '\r' || c === '\t').length / decoded.length;
    return printableRatio > 0.9 ? decoded : s;
  } catch { return s; }
}

function xmlPretty(xml: string) {
  const s = (xml ?? '').trim();
  if (!s) return '';
  try { const parser = new DOMParser(); const doc = parser.parseFromString(s, 'text/xml'); if (doc.getElementsByTagName('parsererror')?.[0]?.textContent) return s; } catch { return s; }
  try {
    const reg = /(>)(<)(\/*)/g; let formatted = s.replace(reg, '$1\n$2$3'); let pad = 0;
    return formatted.split('\n').map((line) => { let indent = 0; if (line.match(/.+<\/\w[^>]*>$/)) indent = 0; else if (line.match(/^<\/\w/)) { if (pad > 0) pad -= 1; } else if (line.match(/^<\w([^>]*[^/])?>.*$/)) indent = 1; else indent = 0; const out = '  '.repeat(pad) + line; pad += indent; return out; }).join('\n');
  } catch { return s; }
}

function escapeHtml(s: string) { return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function first(el: Element | null | undefined, tag: string): Element | null { if (!el) return null; return el.getElementsByTagName(tag)[0] ?? null; }

function extractEmitNome(xmlRaw: string) {
  const s = safeString(xmlRaw); const decoded = maybeBase64ToText(s); if (!decoded) return '-';
  const match = decoded.match(/<emit[^>]*>[\s\S]*?<xNome>([\s\S]*?)<\/xNome>[\s\S]*?<\/emit>/i) || decoded.match(/<xNome>([\s\S]*?)<\/xNome>/i);
  return match ? match[1].trim() : 'Não identificado';
}

function extractEmitUF(xmlRaw: string) {
  const s = safeString(xmlRaw); const decoded = maybeBase64ToText(s); if (!decoded) return '';
  const enderMatch = decoded.match(/<enderEmit[^>]*>[\s\S]*?<UF>([^<]+)<\/UF>[\s\S]*?<\/enderEmit>/i);
  if (enderMatch) return enderMatch[1].trim().toUpperCase();
  const ufMatch = decoded.match(/<UF>([^<]+)<\/UF>/i);
  return ufMatch ? ufMatch[1].trim().toUpperCase() : '';
}

function getXmlItemValues(xmlRaw: string) {
  const s = safeString(xmlRaw);
  const decoded = maybeBase64ToText(s);
  if (!decoded) return { st: 0, trib: 0, impST: 0, impTrib: 0, impTotal: 0 };

  const emitUF = extractEmitUF(xmlRaw);
  const detBlocks = decoded.match(/<det\b[^>]*>[\s\S]*?<\/det>/gi) || [];
  let st = 0, trib = 0, impST = 0, impTrib = 0;

  detBlocks.forEach(det => {
    const cstMatch = det.match(/<CST>([^<]+)<\/CST>/i) || det.match(/<CSOSN>([^<]+)<\/CSOSN>/i);
    const cst = cstMatch ? cstMatch[1].trim() : '';

    const vProdMatch = det.match(/<vProd>([^<]+)<\/vProd>/i);
    const vProd = vProdMatch ? Number(vProdMatch[1].trim()) || 0 : 0;

    const percStr = getCstPercentage(cst, emitUF);
    let percNum = 0;
    if (percStr === '2%') percNum = 0.02;
    else if (percStr === '3%') percNum = 0.03;
    else if (percStr === '5%') percNum = 0.05;

    if (cst === '60') {
      st += vProd;
      impST += vProd * percNum;
    }
    else if (cst === '00') {
      trib += vProd;
      impTrib += vProd * percNum;
    }
  });

  return { st, trib, impST, impTrib, impTotal: impST + impTrib };
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

  if (u === 'PB') return '0%';
  if (c === '60') return '5%';
  if (c === '00') {
    const sulSudeste = ['PR', 'RS', 'SC', 'ES', 'MG', 'RJ', 'SP'];
    if (sulSudeste.includes(u)) return '3%';
    return '2%';
  }
  return '-';
}

function parseFiscalXml(xml: string) {
  if (typeof window === 'undefined' || !xml) return null;
  try {
    const parser = new DOMParser(); const doc = parser.parseFromString(xml, 'text/xml');
    if (doc.getElementsByTagName('parsererror')?.[0]) return null;
    const getText = (parent: Element | null, tag: string) => parent?.getElementsByTagName(tag)[0]?.textContent || '';
    const isCTe = doc.getElementsByTagName('infCte').length > 0;

    if (isCTe) {
      const ide = doc.getElementsByTagName('ide')[0]; const emit = doc.getElementsByTagName('emit')[0]; const dest = doc.getElementsByTagName('dest')[0];
      const vPrest = doc.getElementsByTagName('vPrest')[0]; const compNodes = Array.from(vPrest?.getElementsByTagName('Comp') || []);
      const enderEmitNode = first(emit, 'enderEmit'); const enderDestNode = first(dest, 'enderDest');
      const cstCte = doc.getElementsByTagName('imp')[0]?.getElementsByTagName('CST')[0]?.textContent || '';

      return {
        title: 'CT-e (Conhecimento de Transporte Eletrônico)',
        ide: { nNF: getText(ide, 'nCT'), natOp: getText(ide, 'natOp'), dhEmi: getText(ide, 'dhEmi').split('T')[0] },
        emit: { xNome: getText(emit, 'xNome'), xFant: getText(emit, 'xFant') || getText(emit, 'xNome'), CNPJ: getText(emit, 'CNPJ'), enderEmit: { UF: getText(enderEmitNode, 'UF') } },
        dest: { xNome: getText(dest, 'xNome'), CNPJ: getText(dest, 'CNPJ') || getText(dest, 'CPF'), UF: getText(enderDestNode, 'UF') },
        total: { vNF: getText(vPrest, 'vTPrest') || '0', vProd: getText(vPrest, 'vRec') || '0' },
        items: compNodes.map((comp, idx) => ({ cProd: `COMP-${String(idx + 1).padStart(2, '0')}`, xProd: getText(comp, 'xNome'), qCom: '1', vUnCom: getText(comp, 'vComp'), vProd: getText(comp, 'vComp'), cst: cstCte })).filter(item => Number(item.vProd) > 0),
      };
    } else {
      const ide = doc.getElementsByTagName('ide')[0]; const emit = doc.getElementsByTagName('emit')[0]; const dest = doc.getElementsByTagName('dest')[0];
      const total = doc.getElementsByTagName('ICMSTot')[0]; const detNodes = Array.from(doc.getElementsByTagName('det'));
      const enderEmitNode = first(emit, 'enderEmit'); const enderDestNode = first(dest, 'enderDest');
      return {
        title: 'NF-e (Nota Fiscal Eletrônica)',
        ide: { nNF: getText(ide, 'nNF'), natOp: getText(ide, 'natOp'), dhEmi: getText(ide, 'dhEmi').split('T')[0] },
        emit: { xNome: getText(emit, 'xNome'), xFant: getText(emit, 'xFant'), CNPJ: getText(emit, 'CNPJ'), enderEmit: { UF: getText(enderEmitNode, 'UF') } },
        dest: { xNome: getText(dest, 'xNome'), CNPJ: getText(dest, 'CNPJ') || getText(dest, 'CPF'), UF: getText(enderDestNode, 'UF') },
        total: { vNF: getText(total, 'vNF') || '0', vProd: getText(total, 'vProd') || '0' },
        items: detNodes.map((det) => {
          const prod = det.getElementsByTagName('prod')[0];
          const cst = det.getElementsByTagName('CST')[0]?.textContent || det.getElementsByTagName('CSOSN')[0]?.textContent || '';
          return { cProd: getText(prod, 'cProd'), xProd: getText(prod, 'xProd'), qCom: getText(prod, 'qCom'), vUnCom: getText(prod, 'vUnCom'), vProd: getText(prod, 'vProd'), cst };
        }),
      };
    }
  } catch { return null; }
}

const COLUMN_NAMES: Record<string, string> = {
  PERFIL: 'Tipo Cliente Faturar', QTD_NOTAS: 'Qtd. Notas', VLR_DEVOLUCAO: 'Valor Devolução (R$)', VLR_VENDAS: 'Valor Total Vendas (R$)',
  TOTAL: 'Total Líquido', TOTAL_ST: 'Total ST', TOTAL_TRIB: 'Total Trib.', IMPOSTOST: 'Imposto ST (R$)', IMPOSTOTRIB: 'Imposto Tributado (R$)', IMPOSTOS: 'Impostos (R$)',
};

interface TableHeaderProps {
  id: string;
  tableId: string;
  label: string;
  title?: string;
  align?: 'left' | 'right' | 'center';
  onFilter?: () => void;
  isFiltered?: boolean;
  sortDir?: 'asc' | 'desc' | null;
  onSort?: (tableId: string, id: string) => void;
  onMove?: (tableId: string, draggedId: string, targetId: string) => void;
  sortable?: boolean;
}

const TableHeader: React.FC<TableHeaderProps> = ({ id, tableId, label, title, align = 'left', onFilter, isFiltered, sortDir, onSort, onMove, sortable = true }) => {
  return (
    <th
      title={title}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('col_id', id);
        e.dataTransfer.setData('table_id', tableId);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('col_id');
        const dragTableId = e.dataTransfer.getData('table_id');
        if (dragTableId === tableId && draggedId && draggedId !== id && onMove) {
          onMove(tableId, draggedId, id);
        }
      }}
      className={`px-4 py-3 bg-emerald-50 text-${align} text-[11px] font-bold text-emerald-800 uppercase tracking-wider sticky top-0 z-10 border-b border-emerald-100 whitespace-nowrap`}
    >
      <div className="flex items-center justify-between gap-2" style={{ resize: 'horizontal', overflow: 'hidden', minWidth: '40px' }}>
        <div
          className={`flex items-center gap-1 ${sortable ? 'cursor-pointer hover:text-emerald-900 transition-colors' : ''}`}
          onClick={() => sortable && onSort && onSort(tableId, id)}
        >
          <span title="Arraste para reordenar" onClick={e => e.stopPropagation()} className="flex items-center">
            <GripVertical className="w-3 h-3 text-emerald-300 hover:text-emerald-500 cursor-move" />
          </span>
          <span>{label}</span>
          {sortable && (
            sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-emerald-600" /> :
              sortDir === 'desc' ? <ChevronDown className="w-3 h-3 text-emerald-600" /> :
                <ChevronsUpDown className="w-3 h-3 text-slate-300" />
          )}
        </div>
        {onFilter && (
          <button onClick={(e) => { e.stopPropagation(); onFilter(); }} className={`p-1 rounded transition-colors flex-shrink-0 ${isFiltered ? 'text-emerald-700 bg-emerald-200 hover:bg-emerald-300' : 'text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100'}`} title="Filtrar coluna">
            <Filter className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </th>
  );
};

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> { align?: 'left' | 'right' | 'center'; }
const TableCell: React.FC<TableCellProps> = ({ children, align = 'left', className = '', ...props }) => (
  <td className={`px-4 py-3 text-sm text-slate-700 whitespace-nowrap border-b border-slate-50/50 text-${align} ${className}`} {...props}>{children}</td>
);

function NfeVisualizer({ xml }: { xml: string }) {
  const parsedData = useMemo(() => parseFiscalXml(xml), [xml]);

  const totalImpostosNota = useMemo(() => {
    if (!parsedData || !parsedData.items) return 0;
    return parsedData.items.reduce((acc, item) => {
      const percStr = getCstPercentage(item.cst, parsedData.emit.enderEmit.UF);
      let percNum = 0;
      if (percStr === '2%') percNum = 0.02;
      else if (percStr === '3%') percNum = 0.03;
      else if (percStr === '5%') percNum = 0.05;
      return acc + (Number(item.vProd || 0) * percNum);
    }, 0);
  }, [parsedData]);

  if (!parsedData || !parsedData.ide.nNF) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm flex items-start gap-3 m-4">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div><p className="font-medium text-amber-800">Atenção</p><p className="text-sm text-amber-700">Não foi possível montar a visualização gráfica. Alterne para o "XML Bruto".</p></div>
      </div>
    );
  }

  const emitenteBgClass = getRegionColorClass(parsedData.emit.enderEmit.UF);

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 min-h-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{parsedData.title}</h4>
          <p className="text-sm text-slate-700 mb-1.5"><span className="font-bold text-slate-900">Número:</span> {parsedData.ide.nNF}</p>
          <p className="text-sm text-slate-700 mb-1.5"><span className="font-bold text-slate-900">Emissão:</span> {parsedData.ide.dhEmi}</p>
          <p className="text-sm text-slate-700"><span className="font-bold text-slate-900">Natureza:</span> {parsedData.ide.natOp}</p>
        </div>
        <div className={`border rounded-xl p-4 shadow-sm transition-colors ${emitenteBgClass}`}>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Emitente</h4>
          <p className="text-sm text-slate-800 mb-1.5 line-clamp-1" title={parsedData.emit.xNome}><span className="font-bold text-slate-900">Nome:</span> {parsedData.emit.xNome}</p>
          <p className="text-sm text-slate-800 mb-1.5"><span className="font-bold text-slate-900">Fantasia:</span> {parsedData.emit.xFant}</p>
          <div className="flex gap-4">
            <p className="text-sm text-slate-800"><span className="font-bold text-slate-900">CNPJ:</span> {parsedData.emit.CNPJ}</p>
            <p className="text-sm text-slate-800"><span className="font-bold text-slate-900">UF:</span> {parsedData.emit.enderEmit.UF}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Destinatário</h4>
          <p className="text-sm text-slate-700 mb-1.5 line-clamp-2" title={parsedData.dest.xNome}><span className="font-bold text-slate-900">Nome:</span> {parsedData.dest.xNome}</p>
          <div className="flex gap-4">
            <p className="text-sm text-slate-700"><span className="font-bold text-slate-900">CNPJ/CPF:</span> {parsedData.dest.CNPJ}</p>
            <p className="text-sm text-slate-700"><span className="font-bold text-slate-900">UF:</span> {parsedData.dest.UF || '-'}</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-800">Itens / Componentes</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Código</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Descrição</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-emerald-800 uppercase tracking-wider">CST</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Tx (%)</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Qtd</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Vlr Unit</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Vlr Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {parsedData.items.map((item, i) => {
                const perc = getCstPercentage(item.cst, parsedData.emit.enderEmit.UF);
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-slate-900">{item.cProd}</TableCell>
                    <TableCell className="max-w-[300px] truncate" title={item.xProd}>{item.xProd}</TableCell>
                    <TableCell align="center" className="font-mono text-slate-600">{item.cst || '-'}</TableCell>
                    <TableCell align="center">
                      {item.cst && perc !== '-' ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">{perc}</span>
                      ) : (<span className="text-slate-400">-</span>)}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums">{Number(item.qCom).toLocaleString('pt-BR')}</TableCell>
                    <TableCell align="right" className="tabular-nums">R$ {Number(item.vUnCom).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell align="right" className="font-bold text-emerald-700 tabular-nums">R$ {Number(item.vProd).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-end gap-4">
        <div className="bg-white text-slate-800 rounded-xl px-6 py-4 shadow-md border border-slate-200 flex flex-col items-end">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Impostos (Calc.)</span>
          <span className="text-2xl font-black tabular-nums text-rose-600">R$ {totalImpostosNota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="bg-emerald-600 text-white rounded-xl px-6 py-4 shadow-md border border-emerald-500 flex flex-col items-end">
          <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Total do Documento</span>
          <span className="text-2xl font-black tabular-nums">R$ {Number(parsedData.total.vNF).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
}

const INITIAL_WIDGETS: WidgetConfig[] = [
  // Cards da Aba Saídas (Dash)
  { id: 'tipo', type: 'tipo', title: `Tipos de Clientes`, icon: Filter, x: 0, y: 0, w: 12, h: 12, minW: 4, minH: 8 },
  { id: 'saida', type: 'saida', title: `TOP's`, icon: TrendingDown, x: 0, y: 12, w: 12, h: 10, minW: 4, minH: 8 },
  { id: 'parceiros', type: 'parceiros', title: `Notas por Parceiros`, icon: LayoutDashboard, x: 0, y: 22, w: 12, h: 16, minW: 6, minH: 10 },
  
  // Cards da Aba Entradas (XML)
  { id: 'resumo-xml', type: 'resumo-xml', title: `Resumo de Entradas por Origem`, icon: Server, x: 0, y: 0, w: 12, h: 8, minW: 6, minH: 7 },
  { id: 'xml', type: 'xml', title: `Notas de Entrada`, icon: FileCode2, x: 0, y: 8, w: 12, h: 20, minW: 6, minH: 10 },
];

export default function DashboardSankhya() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'dash' | 'xml'>('dash'); // Estado das abas
  const [dtInput, setDtInput] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loadingMeses, setLoadingMeses] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const [monthsData, setMonthsData] = useState<Record<string, MonthData>>({});

  const [activeMonths, setActiveMonths] = useState<string[]>([]);
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});

  // ESTADO GLOBAL xmlStates (Inclui origem agora sem gerar erro no react)
  const [xmlStates, setXmlStates] = useState<Record<string, { q: string, origem?: 'all' | 'PB' | 'NNE' | 'SSC' }>>({});
  
  const [selectedParc, setSelectedParc] = useState<{ cod: number; dtRef: string } | null>(null);
  const [dataDetalhe, setDataDetalhe] = useState<DetalheRow[]>([]);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgTitle, setDlgTitle] = useState('');
  const [dlgXml, setDlgXml] = useState('');
  const [dlgWarn, setDlgWarn] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'raw'>('visual');

  // Filtros de Parceiros
  const [perfilFilter, setPerfilFilter] = useState<string[]>([]);
  const [numericFilters, setNumericFilters] = useState<Record<string, NumericFilter>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const [modalPerfil, setModalPerfil] = useState<string[]>([]);
  const [modalMin, setModalMin] = useState<string>('');
  const [modalMax, setModalMax] = useState<string>('');

  const [widgets, setWidgets] = useState<WidgetConfig[]>(INITIAL_WIDGETS);

  // Estados de Ordenação e Colunas
  const [sortConfig, setSortConfig] = useState<Record<string, { key: string, dir: 'asc' | 'desc' }>>({});
  const [colOrder, setColOrder] = useState<Record<string, string[]>>({});

  // Estados para o sistema de Swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const handleSort = (tableId: string, id: string) => {
    setSortConfig(prev => {
      const curr = prev[tableId];
      if (curr?.key === id) {
        return { ...prev, [tableId]: { key: id, dir: curr.dir === 'asc' ? 'desc' : 'asc' } };
      }
      return { ...prev, [tableId]: { key: id, dir: 'desc' } };
    });
  };

  const handleMoveCol = (tableId: string, dragged: string, target: string, defaultOrder: string[]) => {
    setColOrder(prev => {
      const curr = prev[tableId] || defaultOrder;
      const next = [...curr];
      const i = next.indexOf(dragged);
      const j = next.indexOf(target);
      next.splice(i, 1);
      next.splice(j, 0, dragged);
      return { ...prev, [tableId]: next };
    });
  };

  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const API_BASE = useMemo(() => (process.env.NEXT_PUBLIC_API_URL ?? '').trim(), []);
  const DASH_URL = useMemo(() => `${API_BASE.replace(/\/$/, '')}/sankhya/relatorioSaidaIncentivoGerencia`, [API_BASE]);
  const XML_URL = useMemo(() => `${API_BASE.replace(/\/$/, '')}/sankhya/nfe`, [API_BASE]);

  const fetchVisao = useCallback(
    async (visao: Visao, dtRefStr: string, codParc?: number) => {
      const params = new URLSearchParams();
      params.set('dtRef', `${dtRefStr}-01`);
      params.set('visao', visao === 'tipo' ? 'perfil' : visao);
      if (typeof codParc === 'number') params.set('codParc', String(codParc));

      const res = await fetch(`${DASH_URL}?${params.toString()}`, { headers: { Accept: 'application/json' } });
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch { json = { _notJson: true, text }; }
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
          fetch(`${XML_URL}?${xmlQs}`, { headers: { Accept: 'application/json' }, cache: 'no-store' }).catch(() => null),
        ]);

        const dTop = topRaw.map((r) => ({
          TOPS: String(r.TOPS ?? ''), QTD_NOTAS: toNumber(r.QTD_NOTAS), DESCRICAO: String(r.DESCRICAO ?? ''),
          VLR_TOTAL_ST: toNumber(r.VLR_TOTAL_ST), VLR_TOTAL_TB: toNumber(r.VLR_TOTAL_TB), VLR_TOTAL: toNumber(r.VLR_TOTAL),
        }));

        const dTipo = tipoRaw.map((r) => ({
          TIPO_COD: String(r.TIPO_COD ?? ''), TIPO_DESC: String(r.TIPO_DESC ?? ''),
          FATOR_ST: toNumber(r.FATOR_ST), FATOR_TRIB: toNumber(r.FATOR_TRIB), TOT_VENDAS: toNumber(r.TOT_VENDAS),
          TOT_VENDAS_ST: toNumber(r.TOT_VENDAS_ST), TOT_VENDAS_TRIB: toNumber(r.TOT_VENDAS_TRIB),
          TOT_IMP_ST: toNumber(r.TOT_IMP_ST), TOT_IMP_TRIB: toNumber(r.TOT_IMP_TRIB), TOT_IMPOSTOS: toNumber(r.TOT_IMPOSTOS),
          TOT_ST_PB: toNumber(r.TOT_ST_PB), TOT_TRIB_PB: toNumber(r.TOT_TRIB_PB), TOT_REST_ST: toNumber(r.TOT_REST_ST), TOT_REST_TRIB: toNumber(r.TOT_REST_TRIB),
        }));

        const dParc = parcRaw.map((r) => {
          const impST = toNumber(r.IMPOSTOST);
          const impTrib = toNumber(r.IMPOSTOTRIB);
          const impostosCalc = impST + impTrib;

          return {
            CODPARC: toNumber(r.CODPARC), NOMEPARC: String(r.NOMEPARC ?? ''), AD_TIPOCLIENTEFATURAR: String(r.AD_TIPOCLIENTEFATURAR ?? ''),
            QTD_NOTAS: toNumber(r.QTD_NOTAS) || toNumber(r.QTDNOTAS) || 0, VLR_DEVOLUCAO: toNumber(r.VLR_DEVOLUCAO), VLR_VENDAS: toNumber(r.VLR_VENDAS),
            TOTAL: toNumber(r.TOTAL), TOTAL_ST: toNumber(r.TOTAL_ST), TOTAL_TRIB: toNumber(r.TOTAL_TRIB), IMPOSTOST: impST, IMPOSTOTRIB: impTrib,
            IMPOSTOS: impostosCalc, ST_IND_PB: toNumber(r.ST_IND_PB), TRIB_IND_PB: toNumber(r.TRIB_IND_PB), RESTANTE_ST: toNumber(r.RESTANTE_ST),
            RESTANTE_TRIB: toNumber(r.RESTANTE_TRIB), VALOR_RESTANTE: toNumber(r.VALOR_RESTANTE), BK_ST: String(r.BK_ST ?? ''), FG_ST: String(r.FG_ST ?? ''), BK_TRIB: String(r.BK_TRIB ?? ''), FG_TRIB: String(r.FG_TRIB ?? ''),
          };
        });

        let dXml: XmlRow[] = [];
        if (xmlRes && xmlRes.ok) {
          const xmlData = await xmlRes.json();
          dXml = Array.isArray(xmlData) ? xmlData : Array.isArray(xmlData?.data) ? xmlData.data : [];
        }

        setMonthsData((prev) => ({ ...prev, [monthStr]: { dataTop: dTop, dataTipo: dTipo, dataParc: dParc, xmlRows: dXml } }));
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

      setWidgets((prev) => prev.length > 0 ? prev : INITIAL_WIDGETS);

      setActiveTabs(prev => ({ ...prev, saida: monthStr, tipo: monthStr, xml: monthStr, parceiros: monthStr, 'resumo-xml': monthStr }));

      if (!activeMonths.includes(monthStr)) {
        setActiveMonths((prev) => [...prev, monthStr]);
        setLoadingMeses((p) => ({ ...p, [monthStr]: true }));
        setError(null);
        setXmlStates((p) => ({ ...p, [`xml-${monthStr}`]: { q: '', origem: 'all' } }));
        try { await refreshMonth(monthStr); } catch (e) { }
      } else {
        await refreshMonth(monthStr);
      }
    },
    [activeMonths, refreshMonth]
  );

  const closeMonth = useCallback((e: React.MouseEvent, monthToRemove: string) => {
    e.stopPropagation();
    setActiveMonths(prev => {
      const nextList = prev.filter(m => m !== monthToRemove);
      setActiveTabs(oldTabs => {
        const newTabs = { ...oldTabs };
        Object.keys(newTabs).forEach(k => {
          if (newTabs[k] === monthToRemove) {
            newTabs[k] = nextList.length > 0 ? nextList[nextList.length - 1] : '';
          }
        });
        return newTabs;
      });
      return nextList;
    });
  }, []);

  useEffect(() => {
    loadMonth(new Date().toISOString().slice(0, 7));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedParc || !activeTabs['parceiros']) return;
    const run = async () => {
      setLoadingDetalhe(true);
      try {
        const detRaw = await fetchVisao('detalhe', activeTabs['parceiros'], selectedParc.cod);
        setDataDetalhe(detRaw.map((r) => ({ NUMNOTA: toNumber(r.NUMNOTA), DTNEG: String(r.DTNEG ?? ''), CODTIPOPER: toNumber(r.CODTIPOPER), IMPOSTOS: toNumber(r.IMPOSTOS), VLRNOTA_AJUSTADO: toNumber(r.VLRNOTA_AJUSTADO), CODEMP: toNumber(r.CODEMP) })));
      } catch (e) {
        console.error(e);
        setDataDetalhe([]);
      } finally {
        setLoadingDetalhe(false);
      }
    };
    run();
  }, [selectedParc, activeTabs, fetchVisao]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance && activeScreen === 'dash') {
      setActiveScreen('xml');
    }
    else if (distance < -minSwipeDistance && activeScreen === 'xml') {
      setActiveScreen('dash');
    }
  };

  const openXmlModal = (r: XmlRow) => {
    setDlgWarn(null); setViewMode('visual');
    const num = safeString(r.NUMNOTA); const vlr = safeString(r.VLRNOTA);
    const raw = safeString(r.XML); const decoded = maybeBase64ToText(raw); const pretty = xmlPretty(decoded);
    if (!pretty.trim()) setDlgWarn('XML vazio.');
    else if (!pretty.trim().startsWith('<')) setDlgWarn('Conteúdo não parece XML puro. Mostrando texto bruto.');
    setDlgTitle(`Documento Fiscal — NUM ${num || '-'} | VLR ${vlr || '-'}`); setDlgXml(pretty); setDlgOpen(true);
  };

  const openInNewTab = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(dlgTitle)}</title><style>body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; margin: 16px; background-color: #f8fafc; color: #334155; } h3 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; } pre { white-space: pre; overflow: auto; border: 1px solid #cbd5e1; background-color: #ffffff; padding: 16px; border-radius: 8px; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }</style></head><body><h3>${escapeHtml(dlgTitle)}</h3><pre>${escapeHtml(dlgXml)}</pre></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handlePrintDanfe = async () => {
    const decoded = maybeBase64ToText(safeString(dlgXml));

    if (!decoded || (!decoded.includes('<nfeProc') && !decoded.includes('<NFe'))) {
      alert('O XML fornecido não parece ser de uma NF-e válida para gerar o DANFE.');
      return;
    }

    try {
      const pdfBuffer = await DANFe({ xml: decoded });
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.error("Erro ao gerar DANFE pelo node-sped-pdf:", error);
      alert("Houve um erro ao processar o XML para gerar a DANFE oficial. Verifique o console.");
    }
  };

  const perfisFat = useMemo(() => {
    const perfis = new Set<string>();
    Object.values(monthsData).forEach((m) => { m.dataParc.forEach((r) => { if (r.AD_TIPOCLIENTEFATURAR) perfis.add(r.AD_TIPOCLIENTEFATURAR); }); });
    return Array.from(perfis).sort();
  }, [monthsData]);

  const getFilteredParc = useCallback((currentMonth: string) => {
    const dataParc = monthsData[currentMonth]?.dataParc || [];
    return dataParc.filter((row) => {
      if (perfilFilter.length > 0 && !perfilFilter.includes(row.AD_TIPOCLIENTEFATURAR)) return false;
      for (const col in numericFilters) {
        const filter = numericFilters[col]; if (!filter) continue;
        const val = Number((row as any)[col]) || 0;
        const min = filter.min !== '' ? Number(filter.min) : -Infinity;
        const max = filter.max !== '' ? Number(filter.max) : Infinity;
        if (val < min || val > max) return false;
      }
      return true;
    });
  }, [monthsData, perfilFilter, numericFilters]);

  const hasAnyFilterActive = perfilFilter.length > 0 || Object.keys(numericFilters).length > 0;
  const isCurrencyActive = activeFilterCol !== 'QTD_NOTAS';

  const currentGlobalMaxForSlider = useMemo(() => {
    if (!activeFilterCol || activeFilterCol === 'PERFIL') return 0;
    let maxVal = 0;
    Object.values(monthsData).forEach((m) => { m.dataParc.forEach((r) => { const val = Number((r as any)[activeFilterCol]) || 0; if (val > maxVal) maxVal = val; }); });
    return maxVal > 0 ? maxVal : 1;
  }, [activeFilterCol, monthsData]);

  const openColumnFilter = (col: string) => {
    setActiveFilterCol(col);
    if (col === 'PERFIL') { setModalPerfil(perfilFilter); } else {
      let maxVal = 0;
      Object.values(monthsData).forEach((m) => { m.dataParc.forEach((r) => { const val = Number((r as any)[col]) || 0; if (val > maxVal) maxVal = val; }); });
      setModalMin(numericFilters[col]?.min || '0'); setModalMax(numericFilters[col]?.max || String(maxVal > 0 ? maxVal : 1));
    }
  };

  const applyColumnFilter = () => {
    if (activeFilterCol === 'PERFIL') setPerfilFilter(modalPerfil);
    else if (activeFilterCol) {
      if ((modalMin === '' || modalMin === '0') && (modalMax === '' || Number(modalMax) >= currentGlobalMaxForSlider)) {
        const newFilters = { ...numericFilters }; delete newFilters[activeFilterCol]; setNumericFilters(newFilters);
      } else { setNumericFilters({ ...numericFilters, [activeFilterCol]: { min: modalMin, max: modalMax } }); }
    }
    setActiveFilterCol(null);
  };

  const clearSpecificFilter = () => {
    if (activeFilterCol === 'PERFIL') setPerfilFilter([]);
    else if (activeFilterCol) { const newFilters = { ...numericFilters }; delete newFilters[activeFilterCol]; setNumericFilters(newFilters); }
    setActiveFilterCol(null);
  };

  const clearAllFilters = () => { setPerfilFilter([]); setNumericFilters({}); };
  const formatFilterDisplayValue = (v: string | number) => isCurrencyActive ? formatCurrency(Number(v) || 0) : Number(v) || 0;

  const xmlItemValues = useMemo(() => {
    const values: Record<string, any> = {};
    Object.values(monthsData).forEach(m => {
      (m.xmlRows || []).forEach(r => {
        const num = safeString(r.NUMNOTA);
        if (num && !values[num]) values[num] = getXmlItemValues(safeString(r.XML));
      })
    });
    return values;
  }, [monthsData]);

  const exportCardToXlsx = useCallback((w: WidgetConfig, currentMonth: string) => {
    const data = monthsData[currentMonth];
    if (!data) return;

    let exportData: any[] = [];

    if (w.type === 'saida') {
      exportData = (data.dataTop || []).map(r => ({ 'TOP': r.TOPS, 'Qte notas': toNumber(r.QTD_NOTAS), 'Descrição': r.DESCRICAO, 'Valor total ST': toNumber(r.VLR_TOTAL_ST), 'Valor total TB': toNumber(r.VLR_TOTAL_TB), 'Valor total': toNumber(r.VLR_TOTAL) }));
    } else if (w.type === 'tipo') {
      exportData = (data.dataTipo || []).map(r => ({ 'Cód': r.TIPO_COD, 'Tipo': r.TIPO_DESC, 'Fator ST': toNumber(r.FATOR_ST), 'Fator Trib': toNumber(r.FATOR_TRIB), 'Vendas': toNumber(r.TOT_VENDAS), 'Imp.': toNumber(r.TOT_IMPOSTOS) }));
    } else if (w.type === 'parceiros') {
      const rows = getFilteredParc(currentMonth);
      exportData = rows.map(r => ({ 'Cód.': r.CODPARC, 'Parceiro': r.NOMEPARC, 'Tipo Cliente Faturar': r.AD_TIPOCLIENTEFATURAR || '-', 'Qtd. Notas': toNumber(r.QTD_NOTAS), 'Valor Devolução (R$)': toNumber(r.VLR_DEVOLUCAO), 'Valor Total Vendas (R$)': toNumber(r.VLR_VENDAS), 'Total Líquido': toNumber(r.TOTAL), 'Total ST': toNumber(r.TOTAL_ST), 'Total Trib.': toNumber(r.TOTAL_TRIB), 'Imposto ST (R$)': toNumber(r.IMPOSTOST), 'Imposto Tributado (R$)': toNumber(r.IMPOSTOTRIB), 'Impostos (R$)': toNumber(r.IMPOSTOS) }));
    } else if (w.type === 'xml') {
      const xmlStateKey = `${w.id}-${currentMonth}`;
      const st = xmlStates[xmlStateKey] || { q: '', origem: 'all' }; const q = (st.q || '').trim().toLowerCase();
      const rows = (data.xmlRows || []).filter((r) => {
        if (!q) return true;
        const num = safeString(r.NUMNOTA).toLowerCase();
        const vlr = safeString(r.VLRNOTA).toLowerCase();
        const emit = extractEmitNome(safeString(r.XML)).toLowerCase();
        return num.includes(q) || vlr.includes(q) || emit.includes(q);
      });
      exportData = rows.map(r => ({ 'Nº Nota': safeString(r.NUMNOTA) || '-', 'Emitente': extractEmitNome(safeString(r.XML)), 'Valor': toNumber(r.VLRNOTA) }));
    } else if (w.type === 'resumo-xml') {
       const resumo = (data.xmlRows || []).reduce((acc, r) => {
        const uf = extractEmitUF(safeString(r.XML));
        const num = safeString(r.NUMNOTA);
        const xmlVals = xmlItemValues[num] || { st: 0, trib: 0, impST: 0, impTrib: 0, impTotal: 0 };
        
        // NOVO: Valor total agora é a soma apenas das bases (itens com CST 00 e 60)
        const vlr = xmlVals.trib + xmlVals.st;
        
        let region: 'interno' | 'nne' | 'ssc' = 'ssc';
        if (uf === 'PB') region = 'interno';
        else if (['AL','AP','AM','BA','CE','MA','PA','PI','RN','SE','TO', 'MT', 'MS', 'GO'].includes(uf)) region = 'nne';
        
        acc[region].vlr += vlr;
        acc[region].trib += xmlVals.trib;
        acc[region].st += xmlVals.st;
        acc[region].impTrib += xmlVals.impTrib;
        acc[region].impST += xmlVals.impST;
        acc[region].impTotal += xmlVals.impTotal;

        return acc;
      }, { 
        interno: { vlr: 0, trib: 0, st: 0, impTrib: 0, impST: 0, impTotal: 0 }, 
        nne: { vlr: 0, trib: 0, st: 0, impTrib: 0, impST: 0, impTotal: 0 }, 
        ssc: { vlr: 0, trib: 0, st: 0, impTrib: 0, impST: 0, impTotal: 0 } 
      });

      exportData = [
        { 'Região': 'Dentro do Estado (PB)', 'Base Trib.': resumo.interno.trib, 'Base ST': resumo.interno.st, 'Imp. Trib': resumo.interno.impTrib, 'Imp. ST': resumo.interno.impST, 'Imp. Total': resumo.interno.impTotal, 'Valor Total': resumo.interno.vlr },
        { 'Região': 'Fora (Norte/Nordeste/CO)', 'Base Trib.': resumo.nne.trib, 'Base ST': resumo.nne.st, 'Imp. Trib': resumo.nne.impTrib, 'Imp. ST': resumo.nne.impST, 'Imp. Total': resumo.nne.impTotal, 'Valor Total': resumo.nne.vlr },
        { 'Região': 'Fora (Sul/Sudeste)', 'Base Trib.': resumo.ssc.trib, 'Base ST': resumo.ssc.st, 'Imp. Trib': resumo.ssc.impTrib, 'Imp. ST': resumo.ssc.impST, 'Imp. Total': resumo.ssc.impTotal, 'Valor Total': resumo.ssc.vlr },
        { 'Região': 'TOTAL GERAL', 
          'Base Trib.': resumo.interno.trib + resumo.nne.trib + resumo.ssc.trib, 
          'Base ST': resumo.interno.st + resumo.nne.st + resumo.ssc.st, 
          'Imp. Trib': resumo.interno.impTrib + resumo.nne.impTrib + resumo.ssc.impTrib, 
          'Imp. ST': resumo.interno.impST + resumo.nne.impST + resumo.ssc.impST, 
          'Imp. Total': resumo.interno.impTotal + resumo.nne.impTotal + resumo.ssc.impTotal, 
          'Valor Total': resumo.interno.vlr + resumo.nne.vlr + resumo.ssc.vlr 
        }
      ];
    }

    if (exportData.length === 0) {
      alert('Nenhum dado para exportar nesta aba.');
      return;
    }

    import('xlsx').then(XLSX => {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
      XLSX.writeFile(workbook, `${w.title.replace(/[^a-zA-Z0-9]/g, '_')}_${currentMonth}.xlsx`);
    }).catch(err => {
      console.error("Erro ao exportar:", err);
      alert("Erro ao exportar. O pacote 'xlsx' não está instalado. Rode 'npm install xlsx' no terminal e tente novamente.");
    });
  }, [monthsData, getFilteredParc, xmlStates, xmlItemValues]);

  const renderDynamicTable = (tableKey: string, data: any[], columnsMap: Record<string, any>, defaultOrder: string[], context: any, rowKey: string, isXml: boolean = false, renderFooter?: (order: string[]) => React.ReactNode) => {
    const order = colOrder[tableKey] || defaultOrder;
    const sort = sortConfig[tableKey];

    const sortedData = [...data].sort((a, b) => {
      if (!sort) return 0;
      const colDef = columnsMap[sort.key];
      if (!colDef || colDef.sortable === false) return 0;

      let valA = colDef.val(a, context);
      let valB = colDef.val(b, context);

      if (typeof valA === 'string' && typeof valB === 'string') return sort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);

      const nA = Number(valA) || 0;
      const nB = Number(valB) || 0;
      return sort.dir === 'asc' ? nA - nB : nB - nA;
    });

    return (
      <div className="flex-1 min-h-0 overflow-auto relative custom-table-scroll">
        <table className="min-w-full divide-y divide-slate-100" style={{ tableLayout: 'auto' }}>
          <thead className="bg-slate-50/50 sticky top-0 z-10 shadow-sm">
            <tr>
              {order.map(colId => {
                const col = columnsMap[colId];
                if (!col) return null;
                const isFiltered = col.filter ? (col.filter === 'PERFIL' ? perfilFilter.length > 0 : !!numericFilters[col.filter]) : false;
                return (
                  <TableHeader
                    key={colId}
                    id={colId}
                    tableId={tableKey}
                    label={col.label}
                    title={col.title}
                    align={col.align}
                    sortDir={sort?.key === colId ? sort.dir : null}
                    onSort={handleSort}
                    onMove={(t, d, tgt) => handleMoveCol(t, d, tgt, defaultOrder)}
                    onFilter={col.filter ? () => openColumnFilter(col.filter) : undefined}
                    isFiltered={isFiltered}
                    sortable={col.sortable !== false}
                  />
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sortedData.map((r, idx) => {
              let rowClass = r.rowClass || 'hover:bg-slate-50/80';
              if (isXml) {
                const uf = extractEmitUF(safeString(r.XML));
                rowClass = uf ? getRegionColorClass(uf).split(' ')[0] : 'hover:bg-slate-50';
              }
              return (
                <tr key={r[rowKey] ? `${r[rowKey]}-${idx}` : idx} className={`${rowClass} transition-colors border-b border-white/50`}>
                  {order.map(colId => {
                    const col = columnsMap[colId];
                    if (!col) return null;
                    return <TableCell key={colId} align={col.align}>{col.render(r, context)}</TableCell>
                  })}
                </tr>
              );
            })}
            {sortedData.length === 0 && <tr><td colSpan={order.length} className="p-10 text-center text-slate-400 text-sm">Sem dados.</td></tr>}
          </tbody>
          {renderFooter && renderFooter(order)}
        </table>
      </div>
    );
  };

  const renderContent = (w: WidgetConfig, currentMonth: string) => {
    if (!currentMonth) return <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Abra um mês no topo.</div>;

    const data = monthsData[currentMonth];
    const isLoading = loadingMeses[currentMonth];

    if (isLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-emerald-600">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          <span className="text-xs font-bold">Carregando Mês...</span>
        </div>
      );
    }

    if (!data) return <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Dados Indisponíveis</div>;

    const sectionShell = (children: React.ReactNode) => <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">{children}</div>;
    const sum = (arr: number[]) => arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    const tableKey = `${w.id}-${currentMonth}`;

    if (w.type === 'saida') {
      const groupedSaida = {
        '299,700,382,326,383,417': { TOPS: '299,700,382,326,383,417', DESCRICAO: 'Vendas total - icms', QTD_NOTAS: 0, VLR_TOTAL_ST: 0, VLR_TOTAL_TB: 0, VLR_TOTAL: 0 },
        '800,801': { TOPS: '800,801', DESCRICAO: 'devolucao de venda', QTD_NOTAS: 0, VLR_TOTAL_ST: 0, VLR_TOTAL_TB: 0, VLR_TOTAL: 0 }
      };

      (data.dataTop || []).forEach(r => {
        const t = String(r.TOPS);
        if (t.includes('800') || t.includes('801')) {
          groupedSaida['800,801'].QTD_NOTAS += toNumber(r.QTD_NOTAS);
          groupedSaida['800,801'].VLR_TOTAL_ST += toNumber(r.VLR_TOTAL_ST);
          groupedSaida['800,801'].VLR_TOTAL_TB += toNumber(r.VLR_TOTAL_TB);
          groupedSaida['800,801'].VLR_TOTAL += toNumber(r.VLR_TOTAL);
        } else if (t.includes('299') || t.includes('700') || t.includes('382') || t.includes('326') || t.includes('383') || t.includes('417')) {
          groupedSaida['299,700,382,326,383,417'].QTD_NOTAS += toNumber(r.QTD_NOTAS);
          groupedSaida['299,700,382,326,383,417'].VLR_TOTAL_ST += toNumber(r.VLR_TOTAL_ST);
          groupedSaida['299,700,382,326,383,417'].VLR_TOTAL_TB += toNumber(r.VLR_TOTAL_TB);
          groupedSaida['299,700,382,326,383,417'].VLR_TOTAL += toNumber(r.VLR_TOTAL);
        }
      });

      const rows = [groupedSaida['299,700,382,326,383,417'], groupedSaida['800,801']].filter(r => r.QTD_NOTAS !== 0 || r.VLR_TOTAL !== 0);

      const SAIDA_COLS: Record<string, any> = {
        TOPS: { label: 'TOP', align: 'left', render: (r: any) => <span className="font-medium text-slate-900">{r.TOPS}</span>, val: (r: any) => r.TOPS },
        QTD_NOTAS: { label: 'Qte notas', align: 'right', render: (r: any) => toNumber(r.QTD_NOTAS).toLocaleString('pt-BR'), val: (r: any) => toNumber(r.QTD_NOTAS) },
        DESCRICAO: { label: 'Descrição', align: 'left', render: (r: any) => <span className="max-w-[360px] truncate block" title={r.DESCRICAO}>{r.DESCRICAO}</span>, val: (r: any) => r.DESCRICAO },
        VLR_TOTAL_ST: { label: 'Valor total ST', align: 'right', render: (r: any) => formatCurrency(toNumber(r.VLR_TOTAL_ST)), val: (r: any) => toNumber(r.VLR_TOTAL_ST) },
        VLR_TOTAL_TB: { label: 'Valor total TB', align: 'right', render: (r: any) => formatCurrency(toNumber(r.VLR_TOTAL_TB)), val: (r: any) => toNumber(r.VLR_TOTAL_TB) },
        VLR_TOTAL: { label: 'Valor total', align: 'right', render: (r: any) => <span className="font-bold text-emerald-700">{formatCurrency(toNumber(r.VLR_TOTAL))}</span>, val: (r: any) => toNumber(r.VLR_TOTAL) },
      };
      const SAIDA_DEF = ['TOPS', 'QTD_NOTAS', 'DESCRICAO', 'VLR_TOTAL_ST', 'VLR_TOTAL_TB', 'VLR_TOTAL'];

      const total = sum(rows.map((r) => r.VLR_TOTAL));
      const totalST = sum(rows.map((r) => r.VLR_TOTAL_ST));
      const totalTB = sum(rows.map((r) => r.VLR_TOTAL_TB));
      const qtd = sum(rows.map((r) => r.QTD_NOTAS));

      return sectionShell(
        <>
          <div className="p-4 border-b border-slate-100 bg-white shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50"><div className="text-[10px] font-bold text-slate-500 uppercase">Qtd Notas</div><div className="text-lg font-black text-slate-800 tabular-nums">{qtd.toLocaleString('pt-BR')}</div></div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50"><div className="text-[10px] font-bold text-slate-500 uppercase">Total</div><div className="text-lg font-black text-emerald-700 tabular-nums">{formatCurrency(total)}</div></div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50"><div className="text-[10px] font-bold text-slate-500 uppercase">Total ST</div><div className="text-lg font-black text-slate-800 tabular-nums">{formatCurrency(totalST)}</div></div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50"><div className="text-[10px] font-bold text-slate-500 uppercase">Total Trib</div><div className="text-lg font-black text-slate-800 tabular-nums">{formatCurrency(totalTB)}</div></div>
            </div>
          </div>
          {renderDynamicTable(tableKey, rows, SAIDA_COLS, SAIDA_DEF, {}, 'TOPS', false, (order) => (
            <tfoot className="sticky bottom-0 z-20 bg-emerald-100/90 backdrop-blur-md border-t-2 border-emerald-300 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <tr>
                {order.map(colId => {
                  if (colId === 'QTD_NOTAS') return <td key={colId} className="px-4 py-3 text-sm font-bold text-emerald-900 text-right tabular-nums whitespace-nowrap">{qtd.toLocaleString('pt-BR')}</td>;
                  if (colId === 'VLR_TOTAL_ST') return <td key={colId} className="px-4 py-3 text-sm font-bold text-emerald-900 text-right tabular-nums whitespace-nowrap">{formatCurrency(totalST)}</td>;
                  if (colId === 'VLR_TOTAL_TB') return <td key={colId} className="px-4 py-3 text-sm font-bold text-emerald-900 text-right tabular-nums whitespace-nowrap">{formatCurrency(totalTB)}</td>;
                  if (colId === 'VLR_TOTAL') return <td key={colId} className="px-4 py-3 text-sm font-black text-emerald-800 text-right tabular-nums whitespace-nowrap">{formatCurrency(total)}</td>;
                  return <td key={colId}></td>;
                })}
              </tr>
            </tfoot>
          ))}
        </>
      );
    }

    if (w.type === 'tipo') {
      const rows = data.dataTipo || [];
      const TIPO_COLS: Record<string, any> = {
        TIPO_COD: { label: 'Cód', align: 'left', render: (r: any) => <span className="font-mono text-slate-800">{r.TIPO_COD}</span>, val: (r: any) => r.TIPO_COD },
        TIPO_DESC: { label: 'Tipo', align: 'left', render: (r: any) => <span className="max-w-[420px] truncate block" title={r.TIPO_DESC}>{r.TIPO_DESC}</span>, val: (r: any) => r.TIPO_DESC },
        FATOR_ST: { label: 'Fator ST', align: 'right', render: (r: any) => formatCurrency(toNumber(r.FATOR_ST)), val: (r: any) => toNumber(r.FATOR_ST) },
        FATOR_TRIB: { label: 'Fator Trib', align: 'right', render: (r: any) => formatCurrency(toNumber(r.FATOR_TRIB)), val: (r: any) => toNumber(r.FATOR_TRIB) },
        TOT_VENDAS: { label: 'Vendas', align: 'right', render: (r: any) => formatCurrency(toNumber(r.TOT_VENDAS)), val: (r: any) => toNumber(r.TOT_VENDAS) },
        TOT_IMPOSTOS: { label: 'Imp.', align: 'right', render: (r: any) => <span className="font-bold text-slate-800">{formatCurrency(toNumber(r.TOT_IMPOSTOS))}</span>, val: (r: any) => toNumber(r.TOT_IMPOSTOS) },
      };
      const TIPO_DEF = Object.keys(TIPO_COLS);

      return sectionShell(renderDynamicTable(tableKey, rows, TIPO_COLS, TIPO_DEF, {}, 'TIPO_COD'));
    }

    if (w.type === 'parceiros') {
      const rows = getFilteredParc(currentMonth);

      const ctxParc = { setSelectedParc, currentMonth };

      const PARC_COLS: Record<string, any> = {
        CODPARC: { label: 'Cód.', align: 'left', render: (r: any) => <span className="text-[11px] text-slate-500 font-mono">{r.CODPARC}</span>, val: (r: any) => toNumber(r.CODPARC) },
        NOMEPARC: { label: 'Parceiro', align: 'left', render: (r: any) => <div className="font-bold text-slate-900 truncate max-w-[200px]" title={r.NOMEPARC}>{r.NOMEPARC}</div>, val: (r: any) => r.NOMEPARC },
        AD_TIPOCLIENTEFATURAR: { label: COLUMN_NAMES.PERFIL, filter: 'PERFIL', align: 'left', render: (r: any) => <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">{r.AD_TIPOCLIENTEFATURAR || '-'}</span>, val: (r: any) => r.AD_TIPOCLIENTEFATURAR },
        QTD_NOTAS: { label: COLUMN_NAMES.QTD_NOTAS, filter: 'QTD_NOTAS', align: 'right', render: (r: any) => toNumber(r.QTD_NOTAS).toLocaleString('pt-BR'), val: (r: any) => toNumber(r.QTD_NOTAS) },
        VLR_DEVOLUCAO: { label: COLUMN_NAMES.VLR_DEVOLUCAO, filter: 'VLR_DEVOLUCAO', align: 'right', render: (r: any) => <span className="text-red-600">{formatCurrency(toNumber(r.VLR_DEVOLUCAO))}</span>, val: (r: any) => toNumber(r.VLR_DEVOLUCAO) },
        VLR_VENDAS: { label: COLUMN_NAMES.VLR_VENDAS, filter: 'VLR_VENDAS', align: 'right', render: (r: any) => formatCurrency(toNumber(r.VLR_VENDAS)), val: (r: any) => toNumber(r.VLR_VENDAS) },
        TOTAL: { label: COLUMN_NAMES.TOTAL, filter: 'TOTAL', align: 'right', render: (r: any) => <span className="text-slate-800">{formatCurrency(toNumber(r.TOTAL))}</span>, val: (r: any) => toNumber(r.TOTAL) },
        TOTAL_ST: { label: COLUMN_NAMES.TOTAL_ST, filter: 'TOTAL_ST', align: 'right', render: (r: any) => <span className="text-slate-600">{formatCurrency(toNumber(r.TOTAL_ST))}</span>, val: (r: any) => toNumber(r.TOTAL_ST) },
        TOTAL_TRIB: { label: COLUMN_NAMES.TOTAL_TRIB, filter: 'TOTAL_TRIB', align: 'right', render: (r: any) => <span className="text-slate-600">{formatCurrency(toNumber(r.TOTAL_TRIB))}</span>, val: (r: any) => toNumber(r.TOTAL_TRIB) },
        IMPOSTOST: { label: COLUMN_NAMES.IMPOSTOST, filter: 'IMPOSTOST', align: 'right', render: (r: any) => <span className="text-slate-600">{formatCurrency(toNumber(r.IMPOSTOST))}</span>, val: (r: any) => toNumber(r.IMPOSTOST) },
        IMPOSTOTRIB: { label: COLUMN_NAMES.IMPOSTOTRIB, filter: 'IMPOSTOTRIB', align: 'right', render: (r: any) => <span className="text-slate-600">{formatCurrency(toNumber(r.IMPOSTOTRIB))}</span>, val: (r: any) => toNumber(r.IMPOSTOTRIB) },
        IMPOSTOS: { label: COLUMN_NAMES.IMPOSTOS, filter: 'IMPOSTOS', align: 'right', render: (r: any) => <span className="font-black text-emerald-700">{formatCurrency(toNumber(r.IMPOSTOS))}</span>, val: (r: any) => toNumber(r.IMPOSTOS) },
        ACTIONS: {
          label: 'Detalhar', align: 'center', sortable: false, render: (r: any, c: any) => (
            <button onClick={() => c.setSelectedParc({ cod: r.CODPARC, dtRef: c.currentMonth })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-colors" title="Abrir notas do parceiro"><Eye className="w-4 h-4" /> Ver</button>
          ), val: () => 0
        }
      };
      const PARC_DEF = Object.keys(PARC_COLS);

      const tQtd = sum(rows.map((r) => toNumber(r.QTD_NOTAS)));
      const tDev = sum(rows.map((r) => toNumber(r.VLR_DEVOLUCAO)));
      const tVen = sum(rows.map((r) => toNumber(r.VLR_VENDAS)));
      const tLiq = sum(rows.map((r) => toNumber(r.TOTAL)));
      const tST = sum(rows.map((r) => toNumber(r.TOTAL_ST)));
      const tTrib = sum(rows.map((r) => toNumber(r.TOTAL_TRIB)));
      const tImpST = sum(rows.map((r) => toNumber(r.IMPOSTOST)));
      const tImpTrib = sum(rows.map((r) => toNumber(r.IMPOSTOTRIB)));
      const tImp = sum(rows.map((r) => toNumber(r.IMPOSTOS)));

      return sectionShell(
        <>
          <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Registros:</span><span className="text-sm font-black text-slate-800 tabular-nums">{rows.length.toLocaleString('pt-BR')}</span>
              {hasAnyFilterActive && (<span className="ml-2 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">filtros ativos</span>)}
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"><div className="text-[10px] font-bold text-slate-500 uppercase">Líquido</div><div className="text-sm font-black text-emerald-700 tabular-nums">{formatCurrency(tLiq)}</div></div>
              <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"><div className="text-[10px] font-bold text-slate-500 uppercase">Impostos</div><div className="text-sm font-black text-slate-800 tabular-nums">{formatCurrency(tImp)}</div></div>
            </div>
          </div>
          {renderDynamicTable(tableKey, rows, PARC_COLS, PARC_DEF, ctxParc, 'CODPARC', false, (order) => (
            <tfoot className="sticky bottom-0 z-20 bg-emerald-100/90 backdrop-blur-md border-t-2 border-emerald-300 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <tr>
                {order.map((colId, i) => {
                  if (i === 0) return <td key={colId} colSpan={1} className="px-4 py-3 text-[11px] font-black text-emerald-900 uppercase tracking-wider whitespace-nowrap">Total ({rows.length}):</td>;
                  if (colId === 'QTD_NOTAS') return <td key={colId} className="px-4 py-3 text-sm font-bold text-emerald-900 text-right tabular-nums whitespace-nowrap">{tQtd.toLocaleString('pt-BR')}</td>;
                  if (colId === 'VLR_DEVOLUCAO') return <td key={colId} className="px-4 py-3 text-sm font-bold text-red-600 text-right tabular-nums whitespace-nowrap">{formatCurrency(tDev)}</td>;
                  if (colId === 'VLR_VENDAS') return <td key={colId} className="px-4 py-3 text-sm font-bold text-emerald-900 text-right tabular-nums whitespace-nowrap">{formatCurrency(tVen)}</td>;
                  if (colId === 'TOTAL') return <td key={colId} className="px-4 py-3 text-sm font-black text-emerald-800 text-right tabular-nums whitespace-nowrap">{formatCurrency(tLiq)}</td>;
                  if (colId === 'TOTAL_ST') return <td key={colId} className="px-4 py-3 text-sm font-bold text-emerald-900 text-right tabular-nums whitespace-nowrap">{formatCurrency(tST)}</td>;
                  if (colId === 'TOTAL_TRIB') return <td key={colId} className="px-4 py-3 text-sm font-bold text-emerald-900 text-right tabular-nums whitespace-nowrap">{formatCurrency(tTrib)}</td>;
                  if (colId === 'IMPOSTOST') return <td key={colId} className="px-4 py-3 text-sm font-bold text-emerald-900 text-right tabular-nums whitespace-nowrap">{formatCurrency(tImpST)}</td>;
                  if (colId === 'IMPOSTOTRIB') return <td key={colId} className="px-4 py-3 text-sm font-bold text-emerald-900 text-right tabular-nums whitespace-nowrap">{formatCurrency(tImpTrib)}</td>;
                  if (colId === 'IMPOSTOS') return <td key={colId} className="px-4 py-3 text-sm font-black text-emerald-900 text-right tabular-nums whitespace-nowrap">{formatCurrency(tImp)}</td>;
                  return <td key={colId}></td>;
                })}
              </tr>
            </tfoot>
          ))}
        </>
      );
    }

    if (w.type === 'resumo-xml') {
      const resumo = (data.xmlRows || []).reduce((acc, r) => {
        const uf = extractEmitUF(safeString(r.XML));
        const num = safeString(r.NUMNOTA);
        const xmlVals = xmlItemValues[num] || { st: 0, trib: 0, impST: 0, impTrib: 0, impTotal: 0 };
        
        // NOVO: Valor total agora é a soma apenas das bases (itens com CST 00 e 60)
        const vlr = xmlVals.trib + xmlVals.st;
        
        let region: 'interno' | 'nne' | 'ssc' = 'ssc';
        if (uf === 'PB') region = 'interno';
        else if (['AL','AP','AM','BA','CE','MA','PA','PI','RN','SE','TO', 'MT', 'MS', 'GO'].includes(uf)) region = 'nne';
        
        acc[region].vlr += vlr;
        acc[region].trib += xmlVals.trib;
        acc[region].st += xmlVals.st;
        acc[region].impTrib += xmlVals.impTrib;
        acc[region].impST += xmlVals.impST;
        acc[region].impTotal += xmlVals.impTotal;

        return acc;
      }, { 
        interno: { vlr: 0, trib: 0, st: 0, impTrib: 0, impST: 0, impTotal: 0 }, 
        nne: { vlr: 0, trib: 0, st: 0, impTrib: 0, impST: 0, impTotal: 0 }, 
        ssc: { vlr: 0, trib: 0, st: 0, impTrib: 0, impST: 0, impTotal: 0 } 
      });

      const resumoArray = [
        { id: 'interno', label: 'Dentro do Estado (PB)', color: 'text-emerald-700', rowClass: 'hover:bg-emerald-50/30', ...resumo.interno },
        { id: 'nne', label: 'Fora (Norte/Nordeste/CO)', color: 'text-amber-700', rowClass: 'hover:bg-amber-50/30', ...resumo.nne },
        { id: 'ssc', label: 'Fora (Sul/Sudeste)', color: 'text-rose-700', rowClass: 'hover:bg-rose-50/30', ...resumo.ssc }
      ];

      const RESUMO_COLS: Record<string, any> = {
        ORIGEM: { label: 'Origem', align: 'left', render: (r: any) => <span className={`font-bold ${r.color}`}>{r.label}</span>, val: (r: any) => r.label },
        TRIB: { label: 'Base Trib.', align: 'right', render: (r: any) => <span className="tabular-nums text-slate-600">{formatCurrency(r.trib)}</span>, val: (r: any) => r.trib },
        ST: { label: 'Base ST', align: 'right', render: (r: any) => <span className="tabular-nums text-slate-600">{formatCurrency(r.st)}</span>, val: (r: any) => r.st },
        IMP_TRIB: { label: 'Imp. Trib', align: 'right', render: (r: any) => <span className="tabular-nums text-slate-800">{formatCurrency(r.impTrib)}</span>, val: (r: any) => r.impTrib },
        IMP_ST: { label: 'Imp. ST', align: 'right', render: (r: any) => <span className="tabular-nums text-slate-800">{formatCurrency(r.impST)}</span>, val: (r: any) => r.impST },
        IMP_TOTAL: { label: 'Imp. Total', align: 'right', render: (r: any) => <span className="tabular-nums font-bold text-rose-600">{formatCurrency(r.impTotal)}</span>, val: (r: any) => r.impTotal },
        VLR_TOTAL: { label: 'Valor Total', align: 'right', render: (r: any) => <span className="tabular-nums font-bold text-emerald-700">{formatCurrency(r.vlr)}</span>, val: (r: any) => r.vlr }
      };

      const RESUMO_DEF = ['ORIGEM', 'TRIB', 'ST', 'IMP_TRIB', 'IMP_ST', 'IMP_TOTAL', 'VLR_TOTAL'];

      const totalGeral = {
        trib: resumo.interno.trib + resumo.nne.trib + resumo.ssc.trib,
        st: resumo.interno.st + resumo.nne.st + resumo.ssc.st,
        impTrib: resumo.interno.impTrib + resumo.nne.impTrib + resumo.ssc.impTrib,
        impST: resumo.interno.impST + resumo.nne.impST + resumo.ssc.impST,
        impTotal: resumo.interno.impTotal + resumo.nne.impTotal + resumo.ssc.impTotal,
        vlr: resumo.interno.vlr + resumo.nne.vlr + resumo.ssc.vlr,
      };

      return sectionShell(
        renderDynamicTable(tableKey, resumoArray, RESUMO_COLS, RESUMO_DEF, {}, 'id', false, (order) => (
          <tfoot className="sticky bottom-0 z-20 bg-slate-100/90 backdrop-blur-md border-t-2 border-slate-300 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <tr>
              {order.map((colId) => {
                if (colId === 'ORIGEM') return <td key={colId} className="px-4 py-3 text-sm font-black text-slate-800 uppercase tracking-wider whitespace-nowrap">Total Geral</td>;
                if (colId === 'TRIB') return <td key={colId} className="px-4 py-3 text-sm text-right tabular-nums font-bold text-slate-700 whitespace-nowrap">{formatCurrency(totalGeral.trib)}</td>;
                if (colId === 'ST') return <td key={colId} className="px-4 py-3 text-sm text-right tabular-nums font-bold text-slate-700 whitespace-nowrap">{formatCurrency(totalGeral.st)}</td>;
                if (colId === 'IMP_TRIB') return <td key={colId} className="px-4 py-3 text-sm text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">{formatCurrency(totalGeral.impTrib)}</td>;
                if (colId === 'IMP_ST') return <td key={colId} className="px-4 py-3 text-sm text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">{formatCurrency(totalGeral.impST)}</td>;
                if (colId === 'IMP_TOTAL') return <td key={colId} className="px-4 py-3 text-sm text-right tabular-nums font-black text-rose-700 whitespace-nowrap">{formatCurrency(totalGeral.impTotal)}</td>;
                if (colId === 'VLR_TOTAL') return <td key={colId} className="px-4 py-3 text-sm text-right tabular-nums font-black text-emerald-800 whitespace-nowrap">{formatCurrency(totalGeral.vlr)}</td>;
                return <td key={colId}></td>;
              })}
            </tr>
          </tfoot>
        ))
      );
    }

    if (w.type === 'xml') {
      // 1. LER ESTADO GLOBAL
      const st = xmlStates[tableKey] || { q: '', origem: 'all' };
      const q = (st.q || '').trim().toLowerCase();
      const origemFilter = st.origem || 'all';

      // 2. FUNÇÕES PARA ATUALIZAR ESTADO GLOBAL
      const setQ = (next: string) => setXmlStates((p) => ({ ...p, [tableKey]: { ...p[tableKey], q: next } }));
      const setOrigem = (next: 'all' | 'PB' | 'NNE' | 'SSC') => setXmlStates((p) => ({ ...p, [tableKey]: { ...p[tableKey], origem: next } }));

      // 3. APLICAR FILTROS
      const rows = (data.xmlRows || []).filter((r) => {
        const xml = safeString(r.XML);
        const uf = extractEmitUF(xml);
        const num = safeString(r.NUMNOTA).toLowerCase();
        const vlr = safeString(r.VLRNOTA).toLowerCase();
        const emit = extractEmitNome(xml).toLowerCase();
        
        // Filtro de Busca
        const matchesSearch = !q || num.includes(q) || vlr.includes(q) || emit.includes(q);
        
        // Filtro de Origem
        let matchesOrigem = true;
        if (origemFilter === 'PB') matchesOrigem = uf === 'PB';
        else if (origemFilter === 'NNE') matchesOrigem = ['AL','AP','AM','BA','CE','MA','PA','PI','RN','SE','TO', 'MT', 'MS', 'GO'].includes(uf);
        else if (origemFilter === 'SSC') matchesOrigem = uf !== 'PB' && !['AL','AP','AM','BA','CE','MA','PA','PI','RN','SE','TO', 'MT', 'MS', 'GO'].includes(uf) && uf !== '';

        return matchesSearch && matchesOrigem;
      });

      const ctxXml = { openXmlModal, values: xmlItemValues };

      const XML_COLS: Record<string, any> = {
        NUMNOTA: { label: 'Nº Nota', align: 'left', render: (r: any) => <span className="font-mono text-slate-800">{safeString(r.NUMNOTA) || '-'}</span>, val: (r: any) => safeString(r.NUMNOTA) },
        EMITENTE: {
          label: 'Emitente', align: 'left', render: (r: any) => {
            const xml = safeString(r.XML); const emit = extractEmitNome(xml); const uf = extractEmitUF(xml);
            return <span className="max-w-[200px] truncate block" title={`${emit} ${uf ? `(${uf})` : ''}`}>{emit} {uf && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-black/5 text-slate-700 border border-black/10">{uf}</span>}</span>;
          }, val: (r: any) => extractEmitNome(safeString(r.XML))
        },
        TRIB: { label: 'Base Trib.', title: 'Base Tributado (00)', align: 'right', render: (r: any, c: any) => <span className="font-mono text-slate-500">{formatCurrency(c.values[safeString(r.NUMNOTA)]?.trib || 0)}</span>, val: (r: any, c: any) => c.values[safeString(r.NUMNOTA)]?.trib || 0 },
        ST: { label: 'Base ST', title: 'Base ST (60)', align: 'right', render: (r: any, c: any) => <span className="font-mono text-slate-500">{formatCurrency(c.values[safeString(r.NUMNOTA)]?.st || 0)}</span>, val: (r: any, c: any) => c.values[safeString(r.NUMNOTA)]?.st || 0 },
        IMP_TRIB: { label: 'Imp. Trib', title: 'Imposto Tributado', align: 'right', render: (r: any, c: any) => <span className="font-mono text-slate-800">{formatCurrency(c.values[safeString(r.NUMNOTA)]?.impTrib || 0)}</span>, val: (r: any, c: any) => c.values[safeString(r.NUMNOTA)]?.impTrib || 0 },
        IMP_ST: { label: 'Imp. ST', title: 'Imposto ST', align: 'right', render: (r: any, c: any) => <span className="font-mono text-slate-800">{formatCurrency(c.values[safeString(r.NUMNOTA)]?.impST || 0)}</span>, val: (r: any, c: any) => c.values[safeString(r.NUMNOTA)]?.impST || 0 },
        IMP_TOTAL: { label: 'Imp. Total', title: 'Imposto Total', align: 'right', render: (r: any, c: any) => <span className="font-bold text-rose-600 tabular-nums">{formatCurrency(c.values[safeString(r.NUMNOTA)]?.impTotal || 0)}</span>, val: (r: any, c: any) => c.values[safeString(r.NUMNOTA)]?.impTotal || 0 },
        VLRNOTA: { label: 'Valor Total', align: 'right', render: (r: any) => <span className="tabular-nums font-bold text-emerald-700">{formatCurrency(toNumber(r.VLRNOTA))}</span>, val: (r: any) => toNumber(r.VLRNOTA) },
        ACTIONS: { label: 'Abrir', align: 'center', sortable: false, render: (r: any, c: any) => <button onClick={() => c.openXmlModal(r)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-colors" title="Visualizar XML"><Eye className="w-4 h-4" /> Ver</button>, val: () => 0 }
      };

      const XML_DEF = ['NUMNOTA', 'EMITENTE', 'TRIB', 'ST', 'IMP_TRIB', 'IMP_ST', 'IMP_TOTAL', 'VLRNOTA', 'ACTIONS'];

      return sectionShell(
        <>
          <div className="p-4 border-b border-slate-100 bg-white flex flex-col gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={st.q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por NUMNOTA, valor ou emitente..." className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <button onClick={() => setQ('')} className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors" title="Limpar busca">Limpar</button>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                {id: 'all', label: 'Todos'},
                {id: 'PB', label: 'Internos (PB)'},
                {id: 'NNE', label: 'Norte/Nordeste/CentroOeste'},
                {id: 'SSC', label: 'Sul/Sudeste'}
              ].map(btn => (
                <button 
                  key={btn.id}
                  onClick={() => setOrigem(btn.id as any)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                    origemFilter === btn.id ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 mt-1">
              <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-bold">
                <span className="text-slate-700 mr-1">Legenda (R$):</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm border border-black/10"></div> Trib (00)</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm border border-black/10"></div> ST (60)</span>
              </div>
              <div className="flex items-center font-medium">
                <span>{rows.length.toLocaleString('pt-BR')} XML(s) listados {(q || origemFilter !== 'all') ? ` (filtrado)` : ''}</span>
              </div>
            </div>
          </div>
          {renderDynamicTable(tableKey, rows, XML_COLS, XML_DEF, ctxXml, 'NUMNOTA', true)}
        </>
      );
    }
  };

  const dashWidgets = useMemo(() => widgets.filter(w => w.type !== 'xml' && w.type !== 'resumo-xml'), [widgets]);
  const xmlWidgets = useMemo(() => widgets.filter(w => w.type === 'xml' || w.type === 'resumo-xml'), [widgets]);

  const dashLayouts = useMemo<AllLayouts>(() => {
    const base = widgetsToLayout(dashWidgets);
    return { lg: base, md: base, sm: base, xs: base, xxs: base };
  }, [dashWidgets]);

  const xmlLayouts = useMemo<AllLayouts>(() => {
    const base = widgetsToLayout(xmlWidgets);
    return { lg: base, md: base, sm: base, xs: base, xxs: base };
  }, [xmlWidgets]);

  const onLayoutChange = useCallback(
    (layout: Layout) => {
      setWidgets((prev) => {
        const map = new Map(layout.map((l) => [l.i, l]));
        return prev.map((w) => {
          const l = map.get(w.id);
          if (!l) return w;
          return { ...w, x: l.x, y: l.y, w: l.w, h: l.h };
        });
      });
    },
    []
  );

  return (
    <DashboardLayout subtitle="Incentivos Fiscais &amp; NFe XML">

      <main
        className="flex-1 w-full max-w-[1920px] mx-auto flex flex-col relative overflow-hidden bg-slate-50"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-between sm:justify-center items-center gap-2 sm:gap-6 py-4 px-4 sm:px-0 shrink-0 z-10 w-full relative">
          <button
            onClick={() => setActiveScreen('dash')}
            disabled={activeScreen === 'dash'}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-bold ${activeScreen === 'dash'
                ? 'opacity-40 cursor-not-allowed text-slate-400 bg-transparent'
                : 'bg-white shadow-sm border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 active:scale-95'
              }`}
            title="Página Anterior (Visão Geral)"
          >
            <ChevronLeft className="w-5 h-5 flex-shrink-0" />
            <span className="hidden sm:inline">Saídas</span>
          </button>

          <div className="flex justify-center items-center gap-3">
            <button
              onClick={() => setActiveScreen('dash')}
              className={`h-2 rounded-full transition-all duration-300 ${activeScreen === 'dash' ? 'w-8 bg-emerald-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
              title="Visão Geral"
            />
            <button
              onClick={() => setActiveScreen('xml')}
              className={`h-2 rounded-full transition-all duration-300 ${activeScreen === 'xml' ? 'w-8 bg-emerald-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
              title="XMLs (NF-e / CT-e)"
            />
          </div>

          <button
            onClick={() => setActiveScreen('xml')}
            disabled={activeScreen === 'xml'}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-bold ${activeScreen === 'xml'
                ? 'opacity-40 cursor-not-allowed text-slate-400 bg-transparent'
                : 'bg-white shadow-sm border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 active:scale-95'
              }`}
            title="Próxima Página (XMLs)"
          >
            <span className="hidden sm:inline">Entradas</span>
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          </button>
        </div>

        {error && (
          <div className="px-4 md:px-6 mb-4 shrink-0">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div><p className="font-medium text-amber-800">Atenção</p><p className="text-sm text-amber-700">{error}</p></div>
            </div>
          </div>
        )}

        {activeMonths.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-xl bg-white/50 text-slate-500 m-4 md:m-6">
            <LayoutDashboard className="w-12 h-12 mb-3 text-slate-300" />
            <p className="text-lg font-medium">Nenhum mês aberto</p>
            <p className="text-sm mt-1">Selecione um mês no cabeçalho e clique em "Adicionar" para iniciar.</p>
          </div>
        ) : (
          <div className="flex-1 w-full overflow-hidden relative">
            <div
              className="flex h-full w-[200%] transition-transform duration-500 ease-in-out"
              style={{ transform: activeScreen === 'dash' ? 'translateX(0)' : 'translateX(-50%)' }}
            >

              {/* TELA 1: DASH (Visão Geral) */}
              <div className="w-1/2 h-full px-2 md:px-4 overflow-y-auto overflow-x-hidden custom-table-scroll pb-20">
                {dashWidgets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-xl bg-white/50 text-slate-500 mt-4">
                    <Filter className="w-12 h-12 mb-3 text-slate-300" />
                    <p className="text-lg font-medium">Nenhum card nesta aba</p>
                    <button onClick={() => setWidgets(INITIAL_WIDGETS)} className="mt-4 px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-sm font-bold transition-colors">
                      Restaurar Layout Padrão
                    </button>
                  </div>
                ) : (
                  <ResponsiveGridLayoutWrapper layouts={dashLayouts} breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }} cols={{ lg: 12, md: 12, sm: 12, xs: 4, xxs: 2 }} rowHeight={28} compactType="vertical" preventCollision={false} isResizable={true} resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']} isDraggable={true} draggableHandle=".widget-drag-handle" onLayoutChange={onLayoutChange} margin={[16, 16]} containerPadding={[0, 0]}>
                    {dashWidgets.map((w) => {
                      const currentMonth = activeTabs[w.id] || activeMonths[0];
                      return (
                        <div key={w.id} className="bg-white rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-200 flex flex-col overflow-hidden">
                          {/* CABEÇALHO DO CARD */}
                          <div className="px-4 py-3 border-b border-slate-200 bg-emerald-50 flex justify-between items-center gap-2 shrink-0">
                            <div className="flex items-center gap-2 font-bold text-emerald-900 select-none">
                              <div className="widget-drag-handle cursor-move p-1.5 -ml-1.5 hover:bg-emerald-200 rounded text-emerald-600 transition-colors" title="Segure para arrastar o card">
                                <GripHorizontal className="w-4 h-4 pointer-events-none" />
                              </div>
                              <div onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} className="flex items-center gap-2 cursor-default">
                                <w.icon className="w-5 h-5 text-emerald-600 pointer-events-none" />
                                <span>{w.title}</span>
                                {w.type === 'parceiros' && hasAnyFilterActive && (
                                  <span className="ml-2 hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                                    Filtros Ativos
                                    <button onClick={clearAllFilters} className="hover:text-red-600 transition-colors pointer-events-auto"><X className="w-3 h-3 pointer-events-none" /></button>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                onClick={() => exportCardToXlsx(w, currentMonth)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-200 rounded transition-colors"
                                title="Exportar para Excel (.xlsx)"
                              >
                                <Download className="w-4 h-4 pointer-events-none" />
                              </button>
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
                          </div>

                          {/* ABAS POR CARD */}
                          {activeMonths.length > 0 && (
                            <div
                              onMouseDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              className="flex bg-slate-100/80 border-b border-slate-200 px-2 pt-2 gap-1 overflow-x-auto hide-scrollbar"
                            >
                              {activeMonths.map(m => {
                                const isActive = currentMonth === m;
                                return (
                                  <div
                                    key={m}
                                    onClick={() => setActiveTabs(prev => ({ ...prev, [w.id]: m }))}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-t-lg border border-b-0 transition-all cursor-pointer select-none whitespace-nowrap ${isActive
                                        ? 'bg-white text-emerald-800 border-slate-200 mb-[-1px] pb-[7px] shadow-sm z-10'
                                        : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-200 hover:text-slate-700'
                                      }`}
                                  >
                                    {m}
                                    <button
                                      onClick={(e) => closeMonth(e, m)}
                                      className={`p-0.5 rounded-full transition-colors ${isActive ? 'hover:bg-emerald-50 text-emerald-600/60 hover:text-red-500' : 'hover:bg-slate-300 text-slate-400 hover:text-red-500'}`}
                                      title="Fechar mês"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* CONTEÚDO DO CARD RENDERIZADO COM A ABA ATIVA */}
                          <div onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
                            {renderContent(w, currentMonth)}
                          </div>

                        </div>
                      )
                    })}
                  </ResponsiveGridLayoutWrapper>
                )}
              </div>

              {/* TELA 2: XML */}
              <div className="w-1/2 h-full px-2 md:px-4 overflow-y-auto overflow-x-hidden custom-table-scroll pb-20">
                {xmlWidgets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-xl bg-white/50 text-slate-500 mt-4">
                    <FileCode2 className="w-12 h-12 mb-3 text-slate-300" />
                    <p className="text-lg font-medium">Nenhum card de XML aberto.</p>
                  </div>
                ) : (
                  <ResponsiveGridLayoutWrapper layouts={xmlLayouts} breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }} cols={{ lg: 12, md: 12, sm: 12, xs: 4, xxs: 2 }} rowHeight={28} compactType="vertical" preventCollision={false} isResizable={true} resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']} isDraggable={true} draggableHandle=".widget-drag-handle" onLayoutChange={onLayoutChange} margin={[16, 16]} containerPadding={[0, 0]}>
                    {xmlWidgets.map((w) => {
                      const currentMonth = activeTabs[w.id] || activeMonths[0];
                      return (
                        <div key={w.id} className="bg-white rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-200 flex flex-col overflow-hidden h-full">
                          {/* CABEÇALHO DO CARD */}
                          <div className="px-4 py-3 border-b border-slate-200 bg-emerald-50 flex justify-between items-center gap-2 shrink-0">
                            <div className="flex items-center gap-2 font-bold text-emerald-900 select-none">
                              <div className="widget-drag-handle cursor-move p-1.5 -ml-1.5 hover:bg-emerald-200 rounded text-emerald-600 transition-colors" title="Segure para arrastar o card">
                                <GripHorizontal className="w-4 h-4 pointer-events-none" />
                              </div>
                              <div onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} className="flex items-center gap-2 cursor-default">
                                <w.icon className="w-5 h-5 text-emerald-600 pointer-events-none" />
                                <span>{w.title}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                onClick={() => exportCardToXlsx(w, currentMonth)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-200 rounded transition-colors"
                                title="Exportar para Excel (.xlsx)"
                              >
                                <Download className="w-4 h-4 pointer-events-none" />
                              </button>
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
                          </div>

                          {/* ABAS POR CARD */}
                          {activeMonths.length > 0 && (
                            <div
                              onMouseDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              className="flex bg-slate-100/80 border-b border-slate-200 px-2 pt-2 gap-1 overflow-x-auto hide-scrollbar"
                            >
                              {activeMonths.map(m => {
                                const isActive = currentMonth === m;
                                return (
                                  <div
                                    key={m}
                                    onClick={() => setActiveTabs(prev => ({ ...prev, [w.id]: m }))}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-t-lg border border-b-0 transition-all cursor-pointer select-none whitespace-nowrap ${isActive
                                        ? 'bg-white text-emerald-800 border-slate-200 mb-[-1px] pb-[7px] shadow-sm z-10'
                                        : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-200 hover:text-slate-700'
                                      }`}
                                  >
                                    {m}
                                    <button
                                      onClick={(e) => closeMonth(e, m)}
                                      className={`p-0.5 rounded-full transition-colors ${isActive ? 'hover:bg-emerald-50 text-emerald-600/60 hover:text-red-500' : 'hover:bg-slate-300 text-slate-400 hover:text-red-500'}`}
                                      title="Fechar mês"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* CONTEÚDO DO CARD RENDERIZADO COM A ABA ATIVA */}
                          <div onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
                            {renderContent(w, currentMonth)}
                          </div>

                        </div>
                      )
                    })}
                  </ResponsiveGridLayoutWrapper>
                )}
              </div>

            </div>
          </div>
        )}
      </main>

      {/* DETALHE DA NOTA DO PARCEIRO */}
      {selectedParc && (
        <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-emerald-600 transform transition-transform duration-300 max-h-[60vh] flex flex-col animate-fade-in-up">
          <div className="bg-emerald-700 text-white px-6 py-3 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-1.5 rounded-lg"><FileText className="w-5 h-5" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-emerald-900 px-2 py-0.5 rounded text-xs text-emerald-100 border border-emerald-600">{selectedParc.cod}</span>
                  <h3 className="font-bold text-sm uppercase tracking-wide">Detalhamento de Notas do Parceiro ({selectedParc.dtRef})</h3>
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedParc(null)} className="bg-emerald-800 hover:bg-emerald-900 text-emerald-100 hover:text-white p-2 rounded-lg transition-all border border-emerald-600">
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
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Nº Nota</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Data</th>
                      <th className="px-4 py-3 text-center text-[11px] font-bold text-emerald-800 uppercase tracking-wider">TOP</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Valor Líquido</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Impostos (%)</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Cód Emp</th>
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
                    {dataDetalhe.length === 0 && (<tr><td colSpan={6} className="p-12 text-center text-slate-400 text-sm">Nenhuma nota encontrada.</td></tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DO VISUALIZADOR XML NFE / CTE COM IMPRESSÃO */}
      {dlgOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6 animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-full flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileCode2 className="w-5 h-5 text-emerald-600" />{dlgTitle}</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-200/60 p-1 rounded-lg border border-slate-200">
                  <button className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'visual' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`} onClick={() => setViewMode('visual')}>Visual</button>
                  <button className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'raw' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`} onClick={() => setViewMode('raw')}>XML Bruto</button>
                </div>

                <button onClick={handlePrintDanfe} disabled={!dlgXml.trim() || viewMode === 'raw'} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50">
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Imprimir DANFE</span>
                </button>

                <button onClick={openInNewTab} disabled={!dlgXml.trim()} className="px-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"><ExternalLink className="w-4 h-4" /><span className="hidden sm:inline">Nova Aba</span></button>
                <button onClick={() => setDlgOpen(false)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 relative">
              {dlgWarn && viewMode === 'visual' && (<div className="m-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm flex items-start gap-3"><AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" /><div><p className="font-medium text-amber-800">Aviso</p><p className="text-sm text-amber-700">{dlgWarn}</p></div></div>)}
              {viewMode === 'visual' ? (<NfeVisualizer xml={dlgXml} />) : (<div className="p-4 sm:p-6 min-h-full"><pre className="m-0 p-6 rounded-xl bg-white border border-slate-200 shadow-sm overflow-auto text-xs font-mono text-slate-800 whitespace-pre">{dlgXml}</pre></div>)}
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
        .custom-table-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-table-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-table-scroll::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; border: 1px solid #f8fafc; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        
        @keyframes fadeInUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fade-in-up { animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        /* Sistema de Grid - Handles em todos os cantos */
        .react-resizable { position: relative; }
        .react-resizable-handle { position: absolute; z-index: 50; opacity: 0; transition: opacity 0.2s ease-in-out; }
        .react-grid-item:hover .react-resizable-handle { opacity: 1; }
        
        .react-resizable-handle-s { bottom: 0; left: 0; width: 100%; height: 8px; cursor: s-resize; }
        .react-resizable-handle-n { top: 0; left: 0; width: 100%; height: 8px; cursor: n-resize; }
        .react-resizable-handle-e { top: 0; right: 0; width: 8px; height: 100%; cursor: e-resize; }
        .react-resizable-handle-w { top: 0; left: 0; width: 8px; height: 100%; cursor: w-resize; }
        
        .react-resizable-handle-se { bottom: 0; right: 0; width: 20px; height: 20px; cursor: se-resize; }
        .react-resizable-handle-sw { bottom: 0; left: 0; width: 20px; height: 20px; cursor: sw-resize; }
        .react-resizable-handle-ne { top: 0; right: 0; width: 20px; height: 20px; cursor: ne-resize; }
        .react-resizable-handle-nw { top: 0; left: 0; width: 20px; height: 20px; cursor: nw-resize; }
        
        /* Efeito de arraste da coluna no cursor */
        th[draggable=true] { cursor: grab; }
        th[draggable=true]:active { cursor: grabbing; }
      `}</style>
    </DashboardLayout>
  );
}