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
  Maximize2,
  Minimize2,
  Expand,
  Shrink,
  PlusCircle,
  GripHorizontal,
  Loader2
} from 'lucide-react';

// --- Componente SidebarMenu (Mock Local para compilação) ---
const SidebarMenu = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    return (
      <>
        <div className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 backdrop-blur-sm ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
        <aside className={`fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="h-20 flex items-center px-6 border-b border-slate-100 justify-between">
                <div className="flex items-center gap-2">
                    <Server className="w-6 h-6 text-emerald-600" />
                    <span className="font-bold text-lg text-slate-800">Menu</span>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-4 space-y-1 overflow-y-auto flex-1 font-sans">
                 <div className="px-4 py-3 rounded-lg bg-emerald-50 text-emerald-900 font-medium flex items-center gap-3 border border-emerald-100 cursor-pointer transition-colors"><LayoutDashboard className="w-5 h-5" />Dashboard</div>
                 <div className="px-4 py-3 rounded-lg text-slate-600 font-medium flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors"><TrendingDown className="w-5 h-5" />Saídas</div>
                 <div className="px-4 py-3 rounded-lg text-slate-600 font-medium flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors"><Users className="w-5 h-5" />Parceiros</div>
                 <div className="px-4 py-3 rounded-lg text-slate-600 font-medium flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors"><Settings className="w-5 h-5" />Triggers</div>
            </div>
            <div className="p-4 border-t border-slate-100 font-sans">
                <div className="px-4 py-3 rounded-lg text-red-600 font-medium flex items-center gap-3 hover:bg-red-50 cursor-pointer transition-colors"><LogOut className="w-5 h-5" />Sair</div>
            </div>
        </aside>
      </>
    );
};

// --- Tipos & Helpers ---

type AnyObj = Record<string, any>;

type TopRow = { TOPS: string; QTD_NOTAS: number; DESCRICAO: string; VLR_TOTAL_ST: number; VLR_TOTAL_TB: number; VLR_TOTAL: number; };
type TipoRow = { TIPO_COD: string; TIPO_DESC: string; FATOR_ST: number; FATOR_TRIB: number; TOT_VENDAS: number; TOT_VENDAS_ST: number; TOT_VENDAS_TRIB: number; TOT_IMP_ST: number; TOT_IMP_TRIB: number; TOT_IMPOSTOS: number; TOT_ST_PB: number; TOT_TRIB_PB: number; TOT_REST_ST: number; TOT_REST_TRIB: number; };
type ParceiroRow = { CODPARC: number; NOMEPARC: string; AD_TIPOCLIENTEFATURAR: string; QTD_NOTAS: number; VLR_DEVOLUCAO: number; VLR_VENDAS: number; TOTAL: number; TOTAL_ST: number; TOTAL_TRIB: number; IMPOSTOST: number; IMPOSTOTRIB: number; IMPOSTOS: number; ST_IND_PB: number; TRIB_IND_PB: number; RESTANTE_ST: number; RESTANTE_TRIB: number; VALOR_RESTANTE: number; BK_ST?: string; FG_ST?: string; BK_TRIB?: string; FG_TRIB?: string; };
type DetalheRow = { NUMNOTA: number; DTNEG: string; CODTIPOPER: number; VLRNOTA_AJUSTADO: number; IMPOSTOS: number; CODEMP: number; };
type XmlRow = { NUMNOTA?: number | string; VLRNOTA?: number | string; XML?: string; };
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
  if (s.includes(',') && s.includes('.')) return Number.isFinite(Number(s.replace(/\./g, '').replace(',', '.'))) ? Number(s.replace(/\./g, '').replace(',', '.')) : 0;
  if (s.includes(',') && !s.includes('.')) return Number.isFinite(Number(s.replace(',', '.'))) ? Number(s.replace(',', '.')) : 0;
  return Number.isFinite(Number(s)) ? Number(s) : 0;
}

function normalizeKeysUpper(row: AnyObj): AnyObj {
  const out: AnyObj = {};
  for (const k of Object.keys(row || {})) out[String(k).toUpperCase()] = row[k];
  return out;
}

// CORREÇÃO: Adicionado tipo de 'entrada'
type Visao = 'top' | 'tipo' | 'parceiro' | 'detalhe' | 'entrada';

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
      if (visao === 'detalhe') return normalizeKeysUpper({ NUMNOTA: row[0], DTNEG: row[1], CODTIPOPER: row[2], IMPOSTOS: row[6], VLRNOTA_AJUSTADO: row[7], CODEMP: row[8] });
      return normalizeKeysUpper({});
    });
  }
  return [];
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('pt-BR');
};
const formatPercent = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(v) ? v : 0);

function safeString(v: any) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

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
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(s, 'text/xml');
    if (doc.getElementsByTagName('parsererror')?.[0]?.textContent) return s;
  } catch { return s; }
  try {
    const reg = /(>)(<)(\/*)/g;
    let formatted = s.replace(reg, '$1\n$2$3');
    let pad = 0;
    return formatted.split('\n').map((line) => {
      let indent = 0;
      if (line.match(/.+<\/\w[^>]*>$/)) indent = 0;
      else if (line.match(/^<\/\w/)) { if (pad > 0) pad -= 1; }
      else if (line.match(/^<\w([^>]*[^/])?>.*$/)) indent = 1;
      else indent = 0;
      const out = '  '.repeat(pad) + line;
      pad += indent;
      return out;
    }).join('\n');
  } catch { return s; }
}

function escapeHtml(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function first(el: Element | null | undefined, tag: string): Element | null {
  if (!el) return null;
  return el.getElementsByTagName(tag)[0] ?? null;
}

function extractEmitNome(xmlRaw: string) {
  const s = safeString(xmlRaw);
  const decoded = maybeBase64ToText(s);
  if (!decoded) return '-';
  const match = decoded.match(/<emit[^>]*>[\s\S]*?<xNome>([\s\S]*?)<\/xNome>[\s\S]*?<\/emit>/i) || decoded.match(/<xNome>([\s\S]*?)<\/xNome>/i);
  return match ? match[1].trim() : 'Não identificado';
}

function getRegionColorClass(uf: string) {
  const state = (uf || '').trim().toUpperCase();
  if (state === 'PB') return 'bg-emerald-50 border-emerald-200';
  const sulSudeste = ['PR', 'RS', 'SC', 'ES', 'MG', 'RJ', 'SP'];
  if (sulSudeste.includes(state)) return 'bg-rose-50 border-rose-200';
  return 'bg-amber-50 border-amber-200';
}

const COLUMN_NAMES: Record<string, string> = {
    PERFIL: 'Perfil Fat.', QTD_NOTAS: 'Qtd Notas', VLR_DEVOLUCAO: 'Devolução', VLR_VENDAS: 'Vendas',
    TOTAL: 'Líquido', TOTAL_ST: 'Tot. ST', TOTAL_TRIB: 'Tot. Trib', IMPOSTOST: 'Imp. ST', IMPOSTOTRIB: 'Imp. Trib', IMPOSTOS: 'Impostos'
};

// --- Componentes de UI ---

// CORREÇÃO: Propriedades rigorosamente tipadas
interface TableHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
    align?: 'left' | 'right' | 'center';
    onFilter?: () => void;
    isFiltered?: boolean;
    width?: string | number;
}

const TableHeader: React.FC<TableHeaderProps> = ({ children, align = 'left', onFilter, isFiltered, width, ...props }) => (
  <th style={{ width }} className={`px-4 py-3 bg-emerald-50 text-${align} text-xs font-bold text-emerald-800 uppercase tracking-wider sticky top-0 z-10 border-b border-emerald-100 whitespace-nowrap`} {...props}>
    <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
      {children}
      {onFilter && (
        <button onClick={(e) => { e.stopPropagation(); onFilter(); }} className={`p-1 rounded transition-colors flex-shrink-0 ${isFiltered ? 'text-emerald-700 bg-emerald-200 hover:bg-emerald-300' : 'text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100'}`} title="Filtrar coluna">
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
  <td className={`px-4 py-3 text-sm text-slate-700 whitespace-nowrap border-b border-slate-50 text-${align} ${className}`} {...props}>{children}</td>
);

// --- Visualizador NFe ---
function NfeVisualizer({ xml }: { xml: string }) {
  const parsedData = useMemo(() => {
    if (typeof window === 'undefined' || !xml) return null;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      if (doc.getElementsByTagName('parsererror')?.[0]) return null;
      const getText = (parent: Element | null, tag: string) => parent?.getElementsByTagName(tag)[0]?.textContent || '';
      const ide = doc.getElementsByTagName('ide')[0];
      const emit = doc.getElementsByTagName('emit')[0];
      const dest = doc.getElementsByTagName('dest')[0];
      const total = doc.getElementsByTagName('ICMSTot')[0];
      const detNodes = Array.from(doc.getElementsByTagName('det'));
      const enderEmitNode = first(emit, 'enderEmit');
      return {
        ide: { nNF: getText(ide, 'nNF'), natOp: getText(ide, 'natOp'), dhEmi: getText(ide, 'dhEmi').split('T')[0] },
        emit: { xNome: getText(emit, 'xNome'), xFant: getText(emit, 'xFant'), CNPJ: getText(emit, 'CNPJ'), enderEmit:{ UF: getText(enderEmitNode , 'UF') } },
        dest: { xNome: getText(dest, 'xNome'), CNPJ: getText(dest, 'CNPJ') || getText(dest, 'CPF') },
        total: { vNF: getText(total, 'vNF'), vProd: getText(total, 'vProd') },
        items: detNodes.map((det) => {
          const prod = det.getElementsByTagName('prod')[0];
          return { cProd: getText(prod, 'cProd'), xProd: getText(prod, 'xProd'), qCom: getText(prod, 'qCom'), vUnCom: getText(prod, 'vUnCom'), vProd: getText(prod, 'vProd') };
        }),
      };
    } catch { return null; }
  }, [xml]);

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
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Dados da Nota</h4>
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
          <p className="text-sm text-slate-700"><span className="font-bold text-slate-900">CNPJ/CPF:</span> {parsedData.dest.CNPJ}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-800">Itens da Nota</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <TableHeader>Código</TableHeader><TableHeader>Descrição</TableHeader><TableHeader align="right">Qtd</TableHeader><TableHeader align="right">Vlr Unit</TableHeader><TableHeader align="right">Vlr Total</TableHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {parsedData.items.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium text-slate-900">{item.cProd}</TableCell>
                  <TableCell className="max-w-[300px] truncate" title={item.xProd}>{item.xProd}</TableCell>
                  <TableCell align="right" className="tabular-nums">{Number(item.qCom).toLocaleString('pt-BR')}</TableCell>
                  <TableCell align="right" className="tabular-nums">R$ {Number(item.vUnCom).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right" className="font-bold text-emerald-700 tabular-nums">R$ {Number(item.vProd).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="bg-emerald-600 text-white rounded-xl px-6 py-4 shadow-md border border-emerald-500 flex flex-col items-end">
           <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Total da Nota</span>
           <span className="text-2xl font-black tabular-nums">R$ {Number(parsedData.total.vNF).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
}

// --- Tipagem dos Widgets Controláveis ---
type WidgetConfig = {
    id: string;
    type: 'saida' | 'tipo' | 'parceiros' | 'xml';
    dtRef: string; // Mês do Widget (ex: "2023-10")
    title: string;
    icon: any;
    order: number;
    colSpan: number; // 1, 2, or 3
    isFloating: boolean;
    floatX: number;
    floatY: number;
    floatW: number;
    floatH: number;
    zIndex: number;
};

// --- Container Flutuante com Drag & Resize Embutidos ---
const FloatingWidget = ({ widget, updateWidget, bringToFront, children, headerExtra, onRemove }: any) => {
    const [isDragging, setIsDragging] = useState(false);
    const [pos, setPos] = useState({ x: widget.floatX, y: widget.floatY });
    const [rel, setRel] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e: any) => {
        if (e.target.closest('.no-drag') || e.target.tagName === 'BUTTON') return;
        bringToFront(widget.id);
        setIsDragging(true);
        setRel({ x: e.clientX - pos.x, y: e.clientY - pos.y });
        e.preventDefault();
    };

    useEffect(() => {
        if (!isDragging) return;
        const handleMouseMove = (e: any) => setPos({ x: e.clientX - rel.x, y: e.clientY - rel.y });
        const handleMouseUp = () => {
            setIsDragging(false);
            updateWidget(widget.id, { floatX: pos.x, floatY: pos.y });
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, rel, pos.x, pos.y, widget.id, updateWidget]);

    const handleMouseUpResize = (e: any) => {
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.width !== widget.floatW || rect.height !== widget.floatH) {
            updateWidget(widget.id, { floatW: rect.width, floatH: rect.height });
        }
    };

    return (
        <div
            className="fixed bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col z-50 animate-fade-in-up"
            style={{
                left: pos.x, top: pos.y, width: widget.floatW, height: widget.floatH,
                zIndex: widget.zIndex, resize: 'both', overflow: 'hidden'
            }}
            onMouseUp={handleMouseUpResize}
            onMouseDown={() => bringToFront(widget.id)}
        >
            <div className="px-4 py-2 border-b border-slate-200 bg-emerald-50 flex justify-between items-center cursor-move select-none group" onMouseDown={handleMouseDown}>
                <h2 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                    <GripHorizontal className="w-4 h-4 text-emerald-600/50 group-hover:text-emerald-600 transition-colors" />
                    <widget.icon className="w-4 h-4 text-emerald-600" />
                    {widget.title}
                </h2>
                <div className="flex items-center gap-1 no-drag bg-white rounded-md border border-slate-200 shadow-sm px-1">
                    {headerExtra && <div>{headerExtra}</div>}
                    <button onClick={() => updateWidget(widget.id, { isFloating: false })} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-emerald-700 transition-colors" title="Restaurar para a Grade"><Minimize2 className="w-3.5 h-3.5" /></button>
                    <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
                    <button onClick={() => onRemove(widget.id)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors" title="Remover Card"><X className="w-3.5 h-3.5" /></button>
                </div>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
                {children}
            </div>
        </div>
    );
};

// --- Componente Principal ---
export default function DashboardSankhya() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [dtInput, setDtInput] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loadingMeses, setLoadingMeses] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const [monthsData, setMonthsData] = useState<Record<string, MonthData>>({});
  const [activeMonths, setActiveMonths] = useState<string[]>([]);

  const [xmlStates, setXmlStates] = useState<Record<string, { q: string, page: number }>>({});
  const xmlPageSize = 25;

  const [selectedParc, setSelectedParc] = useState<{cod: number, dtRef: string} | null>(null);
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

  const [maxZ, setMaxZ] = useState(100);
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);

  const updateWidget = useCallback((id: string, updates: Partial<WidgetConfig>) => {
      setWidgets(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  }, []);

  const moveWidgetToSwap = (sourceId: string, targetId: string) => {
      setWidgets(prev => {
          const newW = [...prev];
          const sIdx = newW.findIndex(w => w.id === sourceId);
          const tIdx = newW.findIndex(w => w.id === targetId);
          if (sIdx >= 0 && tIdx >= 0) {
              const temp = newW[sIdx].order;
              newW[sIdx].order = newW[tIdx].order;
              newW[tIdx].order = temp;
          }
          return newW;
      });
  };

  const changeWidgetWidth = (id: string, delta: number) => {
      setWidgets(prev => prev.map(w => {
          if (w.id === id) {
              const newSpan = Math.max(1, Math.min(3, w.colSpan + delta));
              return { ...w, colSpan: newSpan };
          }
          return w;
      }));
  };

  const bringToFront = (id: string) => {
      setMaxZ(z => z + 1);
      updateWidget(id, { zIndex: maxZ + 1 });
  };

  const removeWidget = (id: string) => {
      setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const API_BASE = useMemo(() => (process.env.NEXT_PUBLIC_API_URL ?? '').trim(), []);
  const DASH_URL = useMemo(() => `${API_BASE.replace(/\/$/, '')}/dash/relatorioSaidaIncentivoGerencia`, [API_BASE]);
  const XML_URL = useMemo(() => `${API_BASE.replace(/\/$/, '')}/sankhya/nfe`, [API_BASE]);

  const fetchVisao = useCallback(async (visao: Visao, dtRefStr: string, codParc?: number) => {
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
  }, [DASH_URL]);

  const loadMonth = useCallback(async (monthStr: string) => {
    if (!monthStr) return;
    
    if (!activeMonths.includes(monthStr)) {
        setActiveMonths(prev => [...prev, monthStr]);
        setLoadingMeses(p => ({ ...p, [monthStr]: true }));
        setXmlStates(p => ({ ...p, [`xml-${monthStr}`]: { q: '', page: 0 } }));
        setError(null);

        setWidgets(prev => {
            const startOrder = prev.length > 0 ? Math.max(...prev.map(w => w.order)) + 1 : 0;
            return [
                ...prev,
                { id: `saida-${monthStr}`, type: 'saida', dtRef: monthStr, title: `Saídas (${monthStr})`, icon: TrendingDown, order: startOrder, colSpan: 1, isFloating: false, floatX: 100, floatY: 100, floatW: 600, floatH: 450, zIndex: 100 },
                { id: `tipo-${monthStr}`, type: 'tipo', dtRef: monthStr, title: `Tipos (${monthStr})`, icon: Filter, order: startOrder + 1, colSpan: 2, isFloating: false, floatX: 150, floatY: 150, floatW: 800, floatH: 450, zIndex: 100 },
                { id: `parceiros-${monthStr}`, type: 'parceiros', dtRef: monthStr, title: `Parceiros (${monthStr})`, icon: LayoutDashboard, order: startOrder + 2, colSpan: 2, isFloating: false, floatX: 200, floatY: 200, floatW: 900, floatH: 600, zIndex: 100 },
                { id: `xml-${monthStr}`, type: 'xml', dtRef: monthStr, title: `XML NFe (${monthStr})`, icon: FileCode2, order: startOrder + 3, colSpan: 1, isFloating: false, floatX: 250, floatY: 250, floatW: 600, floatH: 600, zIndex: 100 }
            ];
        });

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
                fetch(`${XML_URL}?${xmlQs}`, { headers: { Accept: 'application/json' }, cache: 'no-store' }).catch(() => null)
            ]);

            const dTop = topRaw.map((r) => ({ TOPS: String(r.TOPS ?? ''), QTD_NOTAS: toNumber(r.QTD_NOTAS), DESCRICAO: String(r.DESCRICAO ?? ''), VLR_TOTAL_ST: toNumber(r.VLR_TOTAL_ST), VLR_TOTAL_TB: toNumber(r.VLR_TOTAL_TB), VLR_TOTAL: toNumber(r.VLR_TOTAL) }));
            const dTipo = tipoRaw.map((r) => ({ TIPO_COD: String(r.TIPO_COD ?? ''), TIPO_DESC: String(r.TIPO_DESC ?? ''), FATOR_ST: toNumber(r.FATOR_ST), FATOR_TRIB: toNumber(r.FATOR_TRIB), TOT_VENDAS: toNumber(r.TOT_VENDAS), TOT_VENDAS_ST: toNumber(r.TOT_VENDAS_ST), TOT_VENDAS_TRIB: toNumber(r.TOT_VENDAS_TRIB), TOT_IMP_ST: toNumber(r.TOT_IMP_ST), TOT_IMP_TRIB: toNumber(r.TOT_IMP_TRIB), TOT_IMPOSTOS: toNumber(r.TOT_IMPOSTOS), TOT_ST_PB: toNumber(r.TOT_ST_PB), TOT_TRIB_PB: toNumber(r.TOT_TRIB_PB), TOT_REST_ST: toNumber(r.TOT_REST_ST), TOT_REST_TRIB: toNumber(r.TOT_REST_TRIB) }));
            const dParc = parcRaw.map((r) => ({ CODPARC: toNumber(r.CODPARC), NOMEPARC: String(r.NOMEPARC ?? ''), AD_TIPOCLIENTEFATURAR: String(r.AD_TIPOCLIENTEFATURAR ?? ''), QTD_NOTAS: toNumber(r.QTD_NOTAS), VLR_DEVOLUCAO: toNumber(r.VLR_DEVOLUCAO), VLR_VENDAS: toNumber(r.VLR_VENDAS), TOTAL: toNumber(r.TOTAL), TOTAL_ST: toNumber(r.TOTAL_ST), TOTAL_TRIB: toNumber(r.TOTAL_TRIB), IMPOSTOST: toNumber(r.IMPOSTOST), IMPOSTOTRIB: toNumber(r.IMPOSTOTRIB), IMPOSTOS: toNumber(r.IMPOSTOS), ST_IND_PB: toNumber(r.ST_IND_PB), TRIB_IND_PB: toNumber(r.TRIB_IND_PB), RESTANTE_ST: toNumber(r.RESTANTE_ST), RESTANTE_TRIB: toNumber(r.RESTANTE_TRIB), VALOR_RESTANTE: toNumber(r.VALOR_RESTANTE), BK_ST: String(r.BK_ST ?? ''), FG_ST: String(r.FG_ST ?? ''), BK_TRIB: String(r.BK_TRIB ?? ''), FG_TRIB: String(r.FG_TRIB ?? '') }));

            let dXml: XmlRow[] = [];
            if (xmlRes && xmlRes.ok) {
                const xmlData = await xmlRes.json();
                dXml = Array.isArray(xmlData) ? xmlData : Array.isArray(xmlData?.data) ? xmlData.data : [];
            }

            setMonthsData(prev => ({
                ...prev,
                [monthStr]: { dataTop: dTop, dataTipo: dTipo, dataParc: dParc, xmlRows: dXml }
            }));

        } catch (e: any) {
            console.error(e); setError(`Erro ao carregar dados de ${monthStr}: ` + (e?.message ?? ''));
        } finally { 
            setLoadingMeses(p => ({ ...p, [monthStr]: false })); 
        }
    }
  }, [activeMonths, fetchVisao, XML_URL]);

  useEffect(() => {
     loadMonth(new Date().toISOString().slice(0, 7));
  }, [loadMonth]);

  useEffect(() => {
    if (!selectedParc) return;
    const run = async () => {
      setLoadingDetalhe(true);
      try {
        const detRaw = await fetchVisao('detalhe', selectedParc.dtRef, selectedParc.cod);
        setDataDetalhe(detRaw.map((r) => ({ NUMNOTA: toNumber(r.NUMNOTA), DTNEG: String(r.DTNEG ?? ''), CODTIPOPER: toNumber(r.CODTIPOPER), IMPOSTOS: toNumber(r.IMPOSTOS), VLRNOTA_AJUSTADO: toNumber(r.VLRNOTA_AJUSTADO), CODEMP: toNumber(r.CODEMP) })));
      } catch (e) { console.error(e); setDataDetalhe([]); } finally { setLoadingDetalhe(false); }
    };
    run();
  }, [selectedParc, fetchVisao]);

  const openXmlModal = (r: XmlRow) => {
    setDlgWarn(null); setViewMode('visual');
    const num = safeString(r.NUMNOTA); const vlr = safeString(r.VLRNOTA); const raw = safeString(r.XML);
    const decoded = maybeBase64ToText(raw); const pretty = xmlPretty(decoded);
    if (!pretty.trim()) setDlgWarn('XML vazio.');
    else if (!pretty.trim().startsWith('<')) setDlgWarn('Conteúdo não parece XML puro. Mostrando texto bruto.');
    setDlgTitle(`Nota Fiscal — NUMNOTA ${num || '-'} | VLR ${vlr || '-'}`);
    setDlgXml(pretty); setDlgOpen(true);
  };
  const openInNewTab = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(dlgTitle)}</title><style>body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; margin: 16px; background-color: #f8fafc; color: #334155; } h3 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; } pre { white-space: pre; overflow: auto; border: 1px solid #cbd5e1; background-color: #ffffff; padding: 16px; border-radius: 8px; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }</style></head><body><h3>${escapeHtml(dlgTitle)}</h3><pre>${escapeHtml(dlgXml)}</pre></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  // CORREÇÃO: Extração consolidada dos perfis para evitar o erro 'perfisFat is not defined' e mapear de forma correta
  const perfisFat = useMemo(() => {
      const perfis = new Set<string>();
      Object.values(monthsData).forEach(m => {
          m.dataParc.forEach(r => {
              if (r.AD_TIPOCLIENTEFATURAR) perfis.add(r.AD_TIPOCLIENTEFATURAR);
          });
      });
      return Array.from(perfis).sort();
  }, [monthsData]);

  const getFilteredParc = (dtRef: string) => {
      const dataParc = monthsData[dtRef]?.dataParc || [];
      return dataParc.filter(row => {
          if (perfilFilter.length > 0 && !perfilFilter.includes(row.AD_TIPOCLIENTEFATURAR)) return false;
          for (const col in numericFilters) {
              const filter = numericFilters[col];
              if (!filter) continue;
              const val = Number(row[col as keyof ParceiroRow]) || 0;
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
      Object.values(monthsData).forEach(m => {
          m.dataParc.forEach(r => {
              const val = Number(r[activeFilterCol as keyof ParceiroRow]) || 0;
              if (val > maxVal) maxVal = val;
          });
      });
      return maxVal > 0 ? maxVal : 1;
  }, [activeFilterCol, monthsData]);

  const openColumnFilter = (col: string, dtRef: string) => {
      setActiveFilterCol(col);
      if (col === 'PERFIL') {
          setModalPerfil(perfilFilter);
      } else {
          let maxVal = 0;
          Object.values(monthsData).forEach(m => {
              m.dataParc.forEach(r => {
                  const val = Number(r[col as keyof ParceiroRow]) || 0;
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
          if ((modalMin === '' || modalMin === '0') && (modalMax === '' || Number(modalMax) >= currentGlobalMaxForSlider)) {
              const newFilters = { ...numericFilters }; delete newFilters[activeFilterCol]; setNumericFilters(newFilters);
          } else setNumericFilters({ ...numericFilters, [activeFilterCol]: { min: modalMin, max: modalMax } });
      }
      setActiveFilterCol(null);
  };

  const clearSpecificFilter = () => {
      if (activeFilterCol === 'PERFIL') setPerfilFilter([]);
      else if (activeFilterCol) {
          const newFilters = { ...numericFilters }; delete newFilters[activeFilterCol]; setNumericFilters(newFilters);
      }
      setActiveFilterCol(null);
  };
  const clearAllFilters = () => { setPerfilFilter([]); setNumericFilters({}); };
  const formatFilterDisplayValue = (v: string | number) => isCurrencyActive ? formatCurrency(Number(v) || 0) : (Number(v) || 0);

  const renderContent = (w: WidgetConfig) => {
    const data = monthsData[w.dtRef];
    const isLoading = loadingMeses[w.dtRef];

    if (isLoading) {
        return <div className="flex-1 flex flex-col items-center justify-center p-8 text-emerald-600"><Loader2 className="w-8 h-8 animate-spin mb-2" /><span className="text-xs font-bold">Carregando Mês...</span></div>;
    }
    if (!data) return <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Dados Indisponíveis</div>;

    switch (w.type) {
        case 'saida':
            return (
                <div className="overflow-auto h-full scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 flex-1">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-emerald-50/50 sticky top-0 z-10">
                        <tr><TableHeader>TOP</TableHeader><TableHeader align="right">Qtd</TableHeader><TableHeader>Descrição</TableHeader><TableHeader align="right">Vlr ST</TableHeader><TableHeader align="right">Vlr TB</TableHeader><TableHeader align="right">Total</TableHeader></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                        {data.dataTop.map((row, idx) => (
                            <tr key={`${row.TOPS}-${idx}`} className="hover:bg-emerald-50/50 transition-colors">
                            <TableCell className="font-medium text-emerald-900">{row.TOPS}</TableCell><TableCell align="right">{row.QTD_NOTAS}</TableCell><TableCell className="text-xs truncate max-w-[150px]" title={row.DESCRICAO}>{row.DESCRICAO}</TableCell><TableCell align="right" className="tabular-nums">{formatCurrency(row.VLR_TOTAL_ST)}</TableCell><TableCell align="right" className="tabular-nums">{formatCurrency(row.VLR_TOTAL_TB)}</TableCell><TableCell align="right" className="font-bold text-emerald-700 tabular-nums">{formatCurrency(row.VLR_TOTAL)}</TableCell>
                            </tr>
                        ))}
                        {data.dataTop.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-400 text-sm italic">Sem dados de saída.</td></tr>}
                        </tbody>
                    </table>
                </div>
            );
        case 'tipo':
            return (
                <div className="overflow-auto h-full scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 flex-1">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-emerald-50/50 sticky top-0 z-10">
                        <tr><TableHeader>Tipo</TableHeader><TableHeader>Perfil</TableHeader><TableHeader align="right">Total ST</TableHeader><TableHeader align="right">Total TB</TableHeader><TableHeader align="right">Total Vendas</TableHeader><TableHeader align="right">Fat ST</TableHeader><TableHeader align="right">Fat TB</TableHeader></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                        {data.dataTipo.map((row, idx) => (
                            <tr key={`${row.TIPO_COD}-${idx}`} className="hover:bg-emerald-50/50 transition-colors">
                            <TableCell className="text-slate-500">{row.TIPO_COD}</TableCell><TableCell className="font-medium truncate max-w-[120px]" title={row.TIPO_DESC}>{row.TIPO_DESC}</TableCell><TableCell align="right" className="tabular-nums">{formatCurrency(row.TOT_VENDAS_ST)}</TableCell><TableCell align="right" className="tabular-nums">{formatCurrency(row.TOT_VENDAS_TRIB)}</TableCell><TableCell align="right" className="font-bold text-emerald-700 tabular-nums">{formatCurrency(row.TOT_VENDAS)}</TableCell><TableCell align="right" className="tabular-nums">{formatCurrency(row.FATOR_ST)}</TableCell><TableCell align="right" className="tabular-nums">{formatCurrency(row.FATOR_TRIB)}</TableCell>
                            </tr>
                        ))}
                        {data.dataTipo.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-slate-400 text-sm italic">Sem dados de tipo.</td></tr>}
                        </tbody>
                    </table>
                </div>
            );
        case 'xml': {
            const xmlState = xmlStates[w.id] || { q: '', page: 0 };
            const q = xmlState.q.trim().toLowerCase();
            const xmlFiltered = data.xmlRows.filter(r => !q || `${safeString(r.NUMNOTA)} ${safeString(r.VLRNOTA)}`.toLowerCase().includes(q));
            const xmlTotalPages = Math.max(1, Math.ceil(xmlFiltered.length / xmlPageSize));
            const xmlPageRows = xmlFiltered.slice(xmlState.page * xmlPageSize, (xmlState.page + 1) * xmlPageSize);

            return (
                <div className="flex flex-col h-full flex-1 min-h-0">
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                value={xmlState.q} 
                                onChange={(e) => setXmlStates(p => ({...p, [w.id]: { q: e.target.value, page: 0 }}))} 
                                placeholder="Buscar (NUMNOTA/VLR)..." 
                                className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm shadow-inner" 
                            />
                        </div>
                        <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm whitespace-nowrap">{xmlFiltered.length} Notas</span>
                    </div>
                    <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 relative min-h-0">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-emerald-50/50 sticky top-0 z-10">
                                <tr><TableHeader width="90px" align="center">Ações</TableHeader><TableHeader>Nº Nota</TableHeader><TableHeader align="right">Valor</TableHeader><TableHeader>Emitente</TableHeader></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {xmlPageRows.length === 0 ? (
                                    <tr><td colSpan={4} className="p-12 text-center text-slate-400 text-sm italic">Nenhum XML encontrado.</td></tr>
                                ) : (
                                    xmlPageRows.map((r, idx) => {
                                        const emitNome = extractEmitNome(r.XML || '');
                                        return (
                                            <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                                                <TableCell align="center" className="py-2"><button onClick={() => openXmlModal(r)} className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-semibold text-[10px] rounded border border-slate-200 transition-colors flex items-center gap-1 mx-auto"><Eye className="w-3.5 h-3.5" /> Abrir</button></TableCell>
                                                <TableCell className="font-bold text-slate-800 text-xs">{safeString(r.NUMNOTA)}</TableCell>
                                                <TableCell align="right" className="tabular-nums font-medium text-emerald-700 text-xs">{safeString(r.VLRNOTA)}</TableCell>
                                                <TableCell className="font-medium text-slate-600 truncate max-w-[150px] text-xs" title={emitNome}>{emitNome}</TableCell>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {xmlTotalPages > 0 && (
                        <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                            <span className="text-[10px] text-slate-500 pl-2">Pág. {xmlState.page + 1}/{xmlTotalPages}</span>
                            <div className="flex gap-1">
                                <button onClick={() => setXmlStates(p => ({...p, [w.id]: { ...p[w.id], page: Math.max(0, p[w.id].page - 1) }}))} disabled={xmlState.page === 0} className="px-2 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-[10px] font-bold rounded transition-colors disabled:opacity-50">Ant</button>
                                <button onClick={() => setXmlStates(p => ({...p, [w.id]: { ...p[w.id], page: Math.min(xmlTotalPages - 1, p[w.id].page + 1) }}))} disabled={xmlState.page >= xmlTotalPages - 1} className="px-2 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-[10px] font-bold rounded transition-colors disabled:opacity-50">Próx</button>
                            </div>
                        </div>
                    )}
                </div>
            );
        }
        case 'parceiros': {
            const filteredP = getFilteredParc(w.dtRef);
            const totais = filteredP.reduce((acc, curr) => ({
                QTD_NOTAS: acc.QTD_NOTAS + (curr.QTD_NOTAS || 0), VLR_DEVOLUCAO: acc.VLR_DEVOLUCAO + (curr.VLR_DEVOLUCAO || 0), VLR_VENDAS: acc.VLR_VENDAS + (curr.VLR_VENDAS || 0), TOTAL: acc.TOTAL + (curr.TOTAL || 0), TOTAL_ST: acc.TOTAL_ST + (curr.TOTAL_ST || 0), TOTAL_TRIB: acc.TOTAL_TRIB + (curr.TOTAL_TRIB || 0), IMPOSTOST: acc.IMPOSTOST + (curr.IMPOSTOST || 0), IMPOSTOTRIB: acc.IMPOSTOTRIB + (curr.IMPOSTOTRIB || 0), IMPOSTOS: acc.IMPOSTOS + (curr.IMPOSTOS || 0),
            }), { QTD_NOTAS: 0, VLR_DEVOLUCAO: 0, VLR_VENDAS: 0, TOTAL: 0, TOTAL_ST: 0, TOTAL_TRIB: 0, IMPOSTOST: 0, IMPOSTOTRIB: 0, IMPOSTOS: 0 });

            return (
                <div className="flex flex-col h-full flex-1 min-h-0">
                    <div className="overflow-auto scrollbar-thin scrollbar-thumb-slate-300 flex-1 relative min-h-0">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-emerald-50/50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <TableHeader>Cód</TableHeader><TableHeader>Parceiro</TableHeader>
                                    <TableHeader onFilter={() => openColumnFilter('PERFIL', w.dtRef)} isFiltered={perfilFilter.length > 0}>Perfil Fat.</TableHeader>
                                    <TableHeader align="right" onFilter={() => openColumnFilter('QTD_NOTAS', w.dtRef)} isFiltered={!!numericFilters['QTD_NOTAS']}>Qtd</TableHeader>
                                    <TableHeader align="right" onFilter={() => openColumnFilter('VLR_DEVOLUCAO', w.dtRef)} isFiltered={!!numericFilters['VLR_DEVOLUCAO']}>Devolução</TableHeader>
                                    <TableHeader align="right" onFilter={() => openColumnFilter('VLR_VENDAS', w.dtRef)} isFiltered={!!numericFilters['VLR_VENDAS']}>Vendas</TableHeader>
                                    <TableHeader align="right" onFilter={() => openColumnFilter('TOTAL', w.dtRef)} isFiltered={!!numericFilters['TOTAL']}>Líquido</TableHeader>
                                    <TableHeader align="right" onFilter={() => openColumnFilter('TOTAL_ST', w.dtRef)} isFiltered={!!numericFilters['TOTAL_ST']}>Tot. ST</TableHeader>
                                    <TableHeader align="right" onFilter={() => openColumnFilter('TOTAL_TRIB', w.dtRef)} isFiltered={!!numericFilters['TOTAL_TRIB']}>Tot. Trib</TableHeader>
                                    <TableHeader align="right" onFilter={() => openColumnFilter('IMPOSTOST', w.dtRef)} isFiltered={!!numericFilters['IMPOSTOST']}>Imp. ST</TableHeader>
                                    <TableHeader align="right" onFilter={() => openColumnFilter('IMPOSTOTRIB', w.dtRef)} isFiltered={!!numericFilters['IMPOSTOTRIB']}>Imp. Trib</TableHeader>
                                    <TableHeader align="right" onFilter={() => openColumnFilter('IMPOSTOS', w.dtRef)} isFiltered={!!numericFilters['IMPOSTOS']}>Impostos</TableHeader>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {filteredP.map((row) => {
                                    const isSelected = selectedParc?.cod === row.CODPARC && selectedParc?.dtRef === w.dtRef;
                                    return (
                                        <tr key={row.CODPARC} onClick={() => setSelectedParc(isSelected ? null : {cod: row.CODPARC, dtRef: w.dtRef})} className={`cursor-pointer transition-colors duration-150 ${isSelected ? 'bg-emerald-50 text-emerald-900 border-l-4 border-l-emerald-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}>
                                            <TableCell className={isSelected ? 'font-bold' : ''}>{row.CODPARC}</TableCell>
                                            <TableCell className={`${isSelected ? 'font-bold' : ''} truncate max-w-[150px]`} title={row.NOMEPARC}>{row.NOMEPARC}</TableCell>
                                            <TableCell>{row.AD_TIPOCLIENTEFATURAR}</TableCell>
                                            <TableCell align="right" className="tabular-nums">{row.QTD_NOTAS}</TableCell>
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
                                {filteredP.length === 0 && <tr><td colSpan={12} className="p-12 text-center text-slate-400 text-sm">Nenhum parceiro encontrado.</td></tr>}
                            </tbody>
                            {filteredP.length > 0 && (
                                <tfoot className="bg-emerald-100/60 sticky bottom-0 z-10 shadow-[0_-1px_3px_rgba(0,0,0,0.1)] border-t-2 border-emerald-200">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 text-right text-xs font-bold text-emerald-900 uppercase tracking-wider whitespace-nowrap">Total:</td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-emerald-900 tabular-nums whitespace-nowrap">{totais.QTD_NOTAS}</td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-red-700 tabular-nums whitespace-nowrap">{formatCurrency(totais.VLR_DEVOLUCAO)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-emerald-800 tabular-nums whitespace-nowrap">{formatCurrency(totais.VLR_VENDAS)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-black text-emerald-900 tabular-nums whitespace-nowrap bg-emerald-200/40">{formatCurrency(totais.TOTAL)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-emerald-800 tabular-nums whitespace-nowrap">{formatCurrency(totais.TOTAL_ST)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-emerald-800 tabular-nums whitespace-nowrap">{formatCurrency(totais.TOTAL_TRIB)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-emerald-800 tabular-nums whitespace-nowrap">{formatCurrency(totais.IMPOSTOST)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-emerald-800 tabular-nums whitespace-nowrap">{formatCurrency(totais.IMPOSTOTRIB)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-black text-emerald-900 tabular-nums whitespace-nowrap bg-emerald-200/40">{formatCurrency(totais.IMPOSTOS)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            );
        }
        default: return null;
    }
  };

  // Renderizador de Cabeçalho comum a todos os Widgets (Grid ou Floating)
  const renderWidgetHeader = (w: WidgetConfig) => (
      <div 
        className="px-4 py-3 border-b border-slate-200 bg-emerald-50 flex flex-wrap justify-between items-center gap-2 shrink-0 cursor-grab active:cursor-grabbing"
        draggable={!w.isFloating}
        onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            setDraggedWidgetId(w.id);
        }}
        onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
            e.preventDefault();
            if (draggedWidgetId && draggedWidgetId !== w.id) {
                moveWidgetToSwap(draggedWidgetId, w.id);
            }
            setDraggedWidgetId(null);
        }}
      >
          <h2 className="text-sm md:text-base font-bold text-emerald-900 flex items-center gap-2">
              {!w.isFloating && <GripHorizontal className="w-4 h-4 text-emerald-600/50" />}
              <w.icon className="w-5 h-5 text-emerald-600" />
              {w.title}
              {w.type === 'parceiros' && hasAnyFilterActive && (
                  <span className="ml-2 hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                      Filtros Ativos
                      <button onClick={clearAllFilters} className="hover:text-red-600 transition-colors"><X className="w-3 h-3" /></button>
                  </span>
              )}
          </h2>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm" onMouseDown={(e) => e.stopPropagation()}>
              {!w.isFloating && (
                  <>
                      <button onClick={() => changeWidgetWidth(w.id, -1)} className="p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 rounded transition-colors" title="Reduzir Largura"><Shrink className="w-4 h-4" /></button>
                      <button onClick={() => changeWidgetWidth(w.id, 1)} className="p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 rounded transition-colors" title="Aumentar Largura"><Expand className="w-4 h-4" /></button>
                      <div className="w-px h-4 bg-slate-200 mx-1"></div>
                  </>
              )}
              <button 
                  onClick={() => updateWidget(w.id, { isFloating: !w.isFloating })} 
                  className="p-1 text-slate-400 hover:bg-emerald-100 hover:text-emerald-700 rounded transition-colors"
                  title={w.isFloating ? "Retornar à Grade" : "Janela Flutuante (Popout)"}
              >
                  {w.isFloating ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              <button onClick={() => removeWidget(w.id)} className="p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors" title="Remover Card"><X className="w-4 h-4" /></button>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
      <button onClick={() => setSidebarOpen(true)} className="fixed top-4 left-4 z-50 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100" title="Abrir Menu">
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
                        <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">Incentivos Fiscais & NFe XML</p>
                    </div>
                 </div>
                 <div className="flex gap-4 items-center">
                     <img src="/eletro_farias2.png" alt="Logo 1" className="h-12 w-auto object-contain bg-white/10 rounded px-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                     <img src="/lid-verde-branco.png" alt="Logo 2" className="h-12 w-auto object-contain hidden md:block" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                 </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <div className="flex items-center gap-2 bg-emerald-800/50 px-3 py-1.5 rounded-lg border border-emerald-600 shadow-inner">
                    <Calendar className="w-4 h-4 text-emerald-300" />
                    <span className="text-xs font-bold text-emerald-100 uppercase">Mês/Ano:</span>
                    <input type="month" value={dtInput} onChange={(e) => setDtInput(e.target.value)} className="bg-transparent text-sm text-white font-bold focus:outline-none cursor-pointer [color-scheme:dark]" />
                </div>
                <button onClick={() => loadMonth(dtInput)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-sm border border-emerald-500" title="Carregar Mês">
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
                <div><p className="font-medium text-amber-800">Atenção</p><p className="text-sm text-amber-700">{error}</p></div>
            </div>
        )}

        {widgets.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-xl bg-white/50 text-slate-500">
                <LayoutDashboard className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-lg font-medium">Nenhum card aberto</p>
                <p className="text-sm mt-1">Selecione um mês no cabeçalho e clique em "Adicionar" para iniciar.</p>
            </div>
        )}

        {/* Grade de Widgets Dinâmicos (Arrastáveis) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full items-start auto-rows-min">
            {widgets.filter(w => !w.isFloating).sort((a,b) => a.order - b.order).map(w => (
                <div 
                    key={w.id}
                    className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col transition-all duration-300 ${draggedWidgetId === w.id ? 'opacity-40 border-emerald-500 scale-[0.98]' : ''}`}
                    style={{ 
                        gridColumn: `span ${Math.min(w.colSpan, 4)} / span ${Math.min(w.colSpan, 4)}`,
                        height: w.type === 'parceiros' ? 600 : w.type === 'xml' ? 500 : 400 
                    }}
                >
                    {renderWidgetHeader(w)}
                    {renderContent(w)}
                </div>
            ))}
        </div>

      </main>

      {/* Janelas Flutuantes (Widgets Desencaixados) */}
      {widgets.filter(w => w.isFloating).map(w => (
          <FloatingWidget key={w.id} widget={w} updateWidget={updateWidget} bringToFront={bringToFront} onRemove={removeWidget} headerExtra={null}>
              {renderContent(w)}
          </FloatingWidget>
      ))}

      {/* --- Modais --- */}
      
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
                     <button onClick={() => setSelectedParc(null)} className="bg-emerald-800 hover:bg-emerald-900 text-emerald-100 hover:text-white p-2 rounded-lg transition-all border border-emerald-600"><ChevronRight className="w-5 h-5 rotate-90" /></button>
                 </div>
                 <div className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
                     {loadingDetalhe ? (
                         <div className="flex flex-col justify-center items-center h-48 gap-3"><div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-200 border-t-emerald-600" /><span className="text-emerald-700 font-medium text-sm animate-pulse">Carregando...</span></div>
                     ) : (
                         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-[1920px] mx-auto">
                            <table className="min-w-full divide-y divide-emerald-100">
                                <thead className="bg-emerald-50"><tr><TableHeader>Nº Nota</TableHeader><TableHeader>Data</TableHeader><TableHeader align="center">TOP</TableHeader><TableHeader align="right">Valor Líquido</TableHeader><TableHeader align="right">Impostos (%)</TableHeader><TableHeader align="right">Cód Emp</TableHeader></tr></thead>
                                <tbody className="divide-y divide-emerald-50">
                                    {dataDetalhe.map((nota, idx) => (
                                        <tr key={`${nota.NUMNOTA}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-medium text-emerald-900 bg-emerald-50/30">{nota.NUMNOTA}</TableCell><TableCell>{formatDate(nota.DTNEG)}</TableCell><TableCell align="center"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs border border-slate-200 font-medium">{nota.CODTIPOPER}</span></TableCell><TableCell align="right" className="font-bold text-slate-800 tabular-nums">{formatCurrency(nota.VLRNOTA_AJUSTADO)}</TableCell><TableCell align="right" className="text-slate-600 tabular-nums">{formatPercent(nota.IMPOSTOS)}</TableCell><TableCell align="right" className="text-slate-400">{nota.CODEMP}</TableCell>
                                        </tr>
                                    ))}
                                    {dataDetalhe.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-400 text-sm">Nenhuma nota encontrada.</td></tr>}
                                </tbody>
                            </table>
                         </div>
                     )}
                 </div>
             </div>
        )}

      {/* MODAL (DIALOG) DO VISUALIZADOR XML NFE */}
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
                                <button className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'visual' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`} onClick={() => setViewMode('visual')}>Visual</button>
                                <button className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'raw' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`} onClick={() => setViewMode('raw')}>XML Bruto</button>
                            </div>
                            <button onClick={openInNewTab} disabled={!dlgXml.trim()} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"><ExternalLink className="w-4 h-4" /><span className="hidden sm:inline">Nova Aba</span></button>
                            <button onClick={() => setDlgOpen(false)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"><X className="w-5 h-5" /></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto bg-slate-100 relative">
                        {dlgWarn && viewMode === 'visual' && <div className="m-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm flex items-start gap-3"><AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" /><div><p className="font-medium text-amber-800">Aviso</p><p className="text-sm text-amber-700">{dlgWarn}</p></div></div>}
                        {viewMode === 'visual' ? <NfeVisualizer xml={dlgXml} /> : <div className="p-4 sm:p-6 min-h-full"><pre className="m-0 p-6 rounded-xl bg-white border border-slate-200 shadow-sm overflow-auto text-xs font-mono text-slate-800 whitespace-pre">{dlgXml}</pre></div>}
                    </div>
                </div>
            </div>
      )}

      {/* MODAL CONTEXTUAL DE FILTRO DOS PARCEIROS */}
      {activeFilterCol && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-fade-in-up">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200">
                  <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50/50 flex justify-between items-center">
                      <h3 className="font-bold text-emerald-900 flex items-center gap-2"><Filter className="w-4 h-4 text-emerald-600" /> Filtrar {COLUMN_NAMES[activeFilterCol] || activeFilterCol}</h3>
                      <button onClick={() => setActiveFilterCol(null)} className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-full hover:bg-slate-100"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                      {activeFilterCol === 'PERFIL' ? (
                          <div className="space-y-2">
                              <div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Perfis</label><button onClick={() => setModalPerfil([])} className="text-[10px] text-emerald-600 font-bold uppercase">Limpar</button></div>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300">
                                  {perfisFat.map(p => (
                                      <label key={p} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 cursor-pointer shadow-sm group">
                                          <input type="checkbox" checked={modalPerfil.includes(p)} onChange={(e) => setModalPerfil(e.target.checked ? [...modalPerfil, p] : modalPerfil.filter(item => item !== p))} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 accent-emerald-600" />
                                          <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-900">{p}</span>
                                      </label>
                                  ))}
                                  {perfisFat.length === 0 && <p className="text-sm text-slate-500 italic p-2">Nenhum perfil.</p>}
                              </div>
                          </div>
                      ) : (
                          <div className="space-y-6">
                              <div className="space-y-2">
                                  <div className="flex justify-between items-center"><label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mínimo</label><span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">{formatFilterDisplayValue(modalMin || '0')}</span></div>
                                  <input type="range" min={0} max={currentGlobalMaxForSlider} step={isCurrencyActive ? "0.01" : "1"} value={modalMin || 0} onChange={(e) => setModalMin(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                              </div>
                              <div className="space-y-2">
                                  <div className="flex justify-between items-center"><label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Máximo</label><span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">{formatFilterDisplayValue(modalMax || currentGlobalMaxForSlider)}</span></div>
                                  <input type="range" min={0} max={currentGlobalMaxForSlider} step={isCurrencyActive ? "0.01" : "1"} value={modalMax || currentGlobalMaxForSlider} onChange={(e) => setModalMax(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <button onClick={clearSpecificFilter} className="text-sm font-bold text-slate-500 hover:text-red-600 transition-colors">Limpar Filtro</button>
                      <div className="flex gap-2">
                          <button onClick={() => setActiveFilterCol(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                          <button onClick={applyColumnFilter} className="px-4 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors">Aplicar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        @keyframes fadeInUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fade-in-up { animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}