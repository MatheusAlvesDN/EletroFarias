'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Calendar, Loader2, AlertCircle, Menu, ShieldAlert,
  CheckCircle2, X, Filter, ArrowDownToLine, GripHorizontal,
  RotateCcw, ChevronDown, Check, ArrowUp, ArrowDown, ArrowUpDown,
  Plus, Save, List, Edit2, Trash2, Eye, FileCode2, ExternalLink, Printer
} from 'lucide-react';
import { DANFe } from 'node-sped-pdf';
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
  XML?: string;
  HAS_CSOSN?: string;
  STATUS?: string;
  ERRORS?: {
    CFOP: boolean;
    CODTRIB: boolean;
    CODALIQICMS: boolean;
    ALIQICMS: boolean;
    BASEICMS: boolean;
  };
}

interface GroupedNota {
  NUNOTA: number;
  NUMNOTA: number;
  DTENTSAI: string;
  STATUS: string;
  ITEMS: NotaAuditoria[];
  TOTAL_BASE: number;
  XML?: string;
  HAS_CSOSN?: string;
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
  { id: 'EXPAND', label: '', align: 'center' },
  { id: 'STATUS', label: 'Status', align: 'center' },
  { id: 'NUNOTA', label: 'Nro. Único', align: 'left' },
  { id: 'NUMNOTA', label: 'Nro. Nota', align: 'left' },
  { id: 'DTENTSAI', label: 'Dt. Ent/Saída', align: 'center' },
  { id: 'TOTAL_BASE', label: 'Total Base ICMS', align: 'right' },
  { id: 'ACTIONS', label: 'Ações', align: 'center' },
];

const ITEM_COLUMNS = [
  { id: 'STATUS', label: 'Status', align: 'center' },
  { id: 'CODPROD', label: 'Cod. Produto', align: 'center' },
  { id: 'CODTRIB', label: 'Tributação', align: 'center' },
  { id: 'CFOP', label: 'CFOP', align: 'center' },
  { id: 'CODALIQICMS', label: 'Cód. Aliq', align: 'center' },
  { id: 'ALIQICMS', label: 'Aliq. ICMS', align: 'right' },
  { id: 'BASEICMS', label: 'Base ICMS', align: 'right' },
];

const QUEBRA_COLUMNS = [
  { id: 'SERIENOTA', label: 'Série', align: 'center' },
  { id: 'NUM_DE', label: 'Núm. Início', align: 'left' },
  { id: 'NUM_ATE', label: 'Núm. Até', align: 'left' },
  { id: 'QTD_QUEBRA', label: 'Qtd. Faltante', align: 'right' },
];

const OMISSAS_COLUMNS = [
  { id: 'CHAVENFE', label: 'Chave NFe', align: 'left' },
  { id: 'NUMNOTA', label: 'Nº Nota', align: 'center' },
  { id: 'RAZAOEMISSOR', label: 'Emissor', align: 'left' },
  { id: 'CNPJEMISSOR', label: 'CNPJ', align: 'left' },
  { id: 'DTEMI', label: 'Dt. Emissão', align: 'center' },
  { id: 'VLRNOTA', label: 'Valor', align: 'right' },
  { id: 'ACTIONS', label: 'Ações', align: 'center' },
];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatPercent = (val: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0) + '%';

const formatDate = (dateStr: any) => {
  if (!dateStr) return '-';
  if (typeof dateStr === 'string' && dateStr.includes('/')) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

function safeString(v: any) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

// FUNÇÃO DECODIFICADORA BLINDADA
// Ignora verificações regex de tamanho (que falhavam) e força a conversão UTF-8
function maybeBase64ToText(input: any) {
  if (!input) return '';

  let s = '';
  if (typeof input === 'object') {
    s = input.$ || input.value || JSON.stringify(input);
  } else {
    s = String(input);
  }

  s = s.trim();

  // Se já começar com tag XML, não tenta decodificar
  // Caso contenha caracteres invisíveis (BOM), removemos
  if (s.charCodeAt(0) === 0xFEFF) s = s.substring(1);
  if (s.startsWith('<')) return s;

  try {
    const cleaned = s.replace(/\s+/g, '');
    const binaryString = atob(cleaned);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decoded = new TextDecoder('utf-8').decode(bytes);
    // Remove BOM se presente no resultado base64
    return decoded.charCodeAt(0) === 0xFEFF ? decoded.substring(1) : decoded;
  } catch {
    return s;
  }
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

function getRegionColorClass(uf: string) {
  const state = (uf || '').trim().toUpperCase();
  if (state === 'PB') return 'bg-emerald-50 border-emerald-200';
  const sulSudeste = ['PR', 'RS', 'SC', 'ES', 'MG', 'RJ', 'SP'];
  if (sulSudeste.includes(state)) return 'bg-rose-50 border-rose-200';
  return 'bg-amber-50 border-amber-200';
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
        items: compNodes.map((comp, idx) => ({ cProd: `COMP-${String(idx + 1).padStart(2, '0')}`, xProd: getText(comp, 'xNome'), qCom: '1', vUnCom: getText(comp, 'vComp'), vProd: getText(comp, 'vComp'), cst: cstCte })).filter((item: any) => Number(item.vProd) > 0),
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
          const imposto = det.getElementsByTagName('imposto')[0];
          const icms = imposto?.getElementsByTagName('ICMS')[0];

          let cst = '';
          if (icms) {
            cst = icms.getElementsByTagName('CST')[0]?.textContent || icms.getElementsByTagName('CSOSN')[0]?.textContent || '';
          }

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
  } catch { return null; }
}

function NfeVisualizer({ xml }: { xml: string }) {
  const React = require('react');
  const { useMemo } = React;

  const parsedData = useMemo(() => parseFiscalXml(xml), [xml]);

  const totalImpostosNota = useMemo(() => {
    if (!parsedData || !parsedData.items) return 0;
    return parsedData.items.reduce((acc: any, item: any) => {
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
                <th className="px-4 py-3 text-center text-[11px] font-bold text-emerald-800 uppercase tracking-wider">CST/CSOSN</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Tx (%)</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Qtd</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Vlr Unit</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Vlr Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {parsedData.items.map((item: any, i: number) => {
                const perc = getCstPercentage(item.cst, parsedData.emit.enderEmit.UF);
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium text-slate-900">{item.cProd}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 max-w-[300px] truncate" title={item.xProd}>{item.xProd}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-center font-mono text-slate-600">{item.cst || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-center">
                      {item.cst && perc !== '-' ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">{perc}</span>
                      ) : (<span className="text-slate-400">-</span>)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-right tabular-nums">{Number(item.qCom).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-right tabular-nums">R$ {Number(item.vUnCom).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-right font-bold text-emerald-700 tabular-nums">R$ {Number(item.vProd).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
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
          className={`w-full pl-2 pr-8 py-1 text-[10px] font-medium border rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-inner ${selectedValues.length > 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200'
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
                    className={`w-full text-left px-3 py-2 text-[10px] transition-colors border-b border-slate-50 last:border-0 truncate font-medium flex items-center justify-between gap-2 ${isSelected ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-600'
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

// ==========================================
// COMPONENTE: Tabela de Itens da Nota
// ==========================================
const ItemTable = ({ items, formatCurrency, formatPercent, formatDate, activeTab }: {
  items: NotaAuditoria[],
  formatCurrency: (v: number) => string,
  formatPercent: (v: number) => string,
  formatDate: (d: string) => string,
  activeTab: string
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key];
        const bValue = (b as any)[sortConfig.key];

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
  }, [items, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  return (
    <div className="p-4 bg-emerald-50/20 border-y border-emerald-100/50">
      <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
        <table className="w-full text-[10px] border-collapse">
          <thead className="bg-emerald-50/50">
            <tr>
              {ITEM_COLUMNS.map(col => (
                <th
                  key={col.id}
                  className={`px-3 py-2 text-${col.align} font-bold text-emerald-800 uppercase tracking-wider border-b border-emerald-100 cursor-pointer hover:bg-emerald-100/50 transition-colors`}
                  onClick={() => requestSort(col.id)}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    {col.label}
                    {sortConfig?.key === col.id && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedItems.map((item, idx) => {
              const errors = item.ERRORS;
              return (
                <tr key={`${item.NUNOTA}-${item.CODPROD}-${idx}`} className="hover:bg-emerald-50/30 transition-colors">
                  {ITEM_COLUMNS.map(col => {
                    let content: React.ReactNode = (item as any)[col.id];

                    if (col.id === 'STATUS') {
                      let icon;
                      if (item.STATUS === 'Válido') {
                        icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />;
                      } else if (item.STATUS === 'Sem Regra') {
                        icon = <AlertCircle className="w-3.5 h-3.5 text-slate-400 mx-auto" />;
                      } else {
                        icon = <AlertCircle className="w-3.5 h-3.5 text-rose-500 mx-auto" />;
                      }

                      content = (
                        <div className="flex flex-col items-center justify-center gap-1">
                          {icon}
                          {item.HAS_CSOSN === 'S' && (
                            <span className="text-[8px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded uppercase shadow-sm">
                              Simples
                            </span>
                          )}
                        </div>
                      );
                    }

                    if (col.id === 'CODPROD') content = <span className="font-bold text-slate-700">{item.CODPROD}</span>;

                    if (col.id === 'CODTRIB') {
                      // Força exibição de sucesso se tem a flag CSOSN e aliquota zerada
                      const isErr = errors?.CODTRIB && !(item.HAS_CSOSN === 'S' && item.ALIQICMS === 0);
                      let styleClass = 'bg-slate-50 border-slate-200 text-slate-600';

                      if (item.STATUS !== 'Sem Regra') {
                        if (isErr) {
                          styleClass = 'bg-rose-100 border-rose-200 text-rose-700';
                        } else if (activeTab === 'entrada') {
                          styleClass = 'bg-emerald-100 border-emerald-200 text-emerald-700';
                        }
                      } else if (isErr) {
                        styleClass = 'bg-rose-100 border-rose-200 text-rose-700';
                      }

                      content = <span className={`font-bold px-1.5 py-0.5 rounded border ${styleClass}`}>{item.CODTRIB}</span>;
                    }

                    if (col.id === 'CFOP') {
                      const isErr = errors?.CFOP && !(item.HAS_CSOSN === 'S' && item.ALIQICMS === 0);
                      let styleClass = isErr ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-50 text-slate-700 border border-slate-200';

                      if (activeTab === 'entrada' && item.STATUS !== 'Sem Regra') {
                        styleClass = item.STATUS === 'Inconsistente'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200';
                      }
                      content = <span className={`px-1.5 py-0.5 rounded font-mono font-bold border ${styleClass}`}>{item.CFOP}</span>;
                    }

                    if (col.id === 'CODALIQICMS') {
                      const isErr = errors?.CODALIQICMS && !(item.HAS_CSOSN === 'S' && item.ALIQICMS === 0);
                      content = <span className={`font-mono font-bold ${isErr ? 'text-rose-600' : 'text-slate-500'}`}>{item.CODALIQICMS}</span>;
                    }

                    if (col.id === 'ALIQICMS') {
                      const isErr = errors?.ALIQICMS && !(item.HAS_CSOSN === 'S' && item.ALIQICMS === 0);
                      content = <span className={`font-bold ${isErr ? 'text-rose-600' : 'text-slate-600'}`}>{formatPercent(item.ALIQICMS)}</span>;
                    }

                    if (col.id === 'BASEICMS') {
                      let isErr = errors?.BASEICMS || errors?.ALIQICMS;

                      if (activeTab === 'entrada' && !isErr) {
                        const isBaseZero = Number(item.BASEICMS || 0) === 0;
                        const isAliqNotZero = Number(item.ALIQICMS || 0) !== 0;
                        if (isBaseZero && isAliqNotZero) isErr = true;
                      }

                      if (item.HAS_CSOSN === 'S' && item.ALIQICMS === 0) isErr = false;

                      content = <span className={`font-black tabular-nums ${isErr ? 'text-rose-600' : 'text-emerald-700'}`}>{formatCurrency(item.BASEICMS)}</span>;
                    }

                    return (
                      <td key={col.id} className={`px-3 py-2 text-${col.align} border-r border-slate-50 last:border-r-0`}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Dados e Controle
  const [dataEntrada, setDataEntrada] = useState<NotaAuditoria[]>([]);
  const [dataSaida, setDataSaida] = useState<NotaAuditoria[]>([]);
  const [dataQuebra, setDataQuebra] = useState<any[]>([]);
  const [dataOmissas, setDataOmissas] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'entrada' | 'saida' | 'quebra' | 'omissas'>('entrada');
  const [regras, setRegras] = useState<RegraAliquota[]>([]);
  const [loading, setLoading] = useState(false);

  // Loading do XML individual
  const [loadingXmlId, setLoadingXmlId] = useState<number | null>(null);

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

  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgTitle, setDlgTitle] = useState('');
  const [dlgXml, setDlgXml] = useState('');
  const [dlgWarn, setDlgWarn] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'raw'>('visual');

  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({ open: false, msg: '', type: 'success' });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  const openXmlModal = async (r: any) => {
    try {
      setDlgWarn(null);
      setViewMode('visual');

      const num = safeString(r.CHAVENFE || r.NUMNOTA);
      const vlr = safeString(r.VLRNOTA || r.TOTAL_BASE);
      setDlgTitle(`Documento Fiscal — Nº/CHAVE: ${num || '-'} | Base/Vlr: ${vlr || '-'}`);

      let rawXml = r.XML;

      if (!rawXml && r.NUMNOTA) {
        setLoadingXmlId(r.NUMNOTA);
        const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
        const res = await fetch(`${API_BASE}/expedicao/xml-nota/${r.NUMNOTA}`);

        if (!res.ok) throw new Error('XML não encontrado no banco de dados.');

        const data = await res.json();
        rawXml = data.xml;
      }

      const decoded = maybeBase64ToText(rawXml);
      const pretty = xmlPretty(decoded);

      if (!pretty.trim()) setDlgWarn('XML vazio ou não encontrado.');
      else if (!pretty.trim().startsWith('<')) setDlgWarn('Conteúdo não parece XML puro. Mostrando texto bruto.');

      setDlgXml(pretty);
      setDlgOpen(true);
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoadingXmlId(null);
    }
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

      const [resEntrada, resSaida, resQuebra, resOmissas, resRegras] = await Promise.all([
        fetch(`${API_BASE}/expedicao/auditoria-entrada?${qs}`),
        fetch(`${API_BASE}/expedicao/auditoria-saida?${qs}`),
        fetch(`${API_BASE}/expedicao/auditoria-quebra-sequencia?${qs}`),
        fetch(`${API_BASE}/expedicao/auditoria-notas-omissas?${qs}`),
        fetch(`${API_BASE}/prisma/getRegrasAliquota`)
      ]);

      if (!resEntrada.ok || !resSaida.ok || !resQuebra.ok || !resOmissas.ok) throw new Error('Falha ao buscar as notas.');
      if (!resRegras.ok) throw new Error('Falha ao buscar as regras no banco.');

      const jsonEntrada: NotaAuditoria[] = await resEntrada.json();
      const jsonSaida: NotaAuditoria[] = await resSaida.json();
      const jsonQuebra: any[] = await resQuebra.json();
      const jsonOmissas: any[] = await resOmissas.json();
      const jsonRegras: RegraAliquota[] = await resRegras.json();

      setRegras(jsonRegras);

      const processarNotas = (notas: NotaAuditoria[], tipoAba: 'entrada' | 'saida') => {
        return notas.map((nota) => {
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

          // LÓGICA FRONTEND DECODIFICADA: Ignora erros e converte XML para checar a tag
          let hasCSOSN = false;
          if (tipoAba === 'entrada') {
            // Inteligência 1: via XML (Busca pela tag CSOSN)
            if (nota.XML) {
              const decodedTexto = maybeBase64ToText(nota.XML).toUpperCase();
              if (decodedTexto.includes('<CSOSN>') || decodedTexto.includes('CSOSN')) {
                hasCSOSN = true;
              }
            }
            // Inteligência 2: via Código de Tributação (Fallback)
            // Códigos CSOSN em Simples Nacional são sempre >= 100 (101, 102, 201, 500, etc)
            const numericTrib = parseInt(formattedTrib);
            if (!hasCSOSN && numericTrib >= 100) {
              hasCSOSN = true;
            }
          }

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

          // EXCEÇÃO CSOSN: Força status válido e limpa todos os alertas visuais se tiver CSOSN e aliquota for 0
          if (hasCSOSN && notaAliq === 0) {
            errCfop = false;
            errTrib = false;
            errCodAliq = false;
            errAliq = false;
            errBase = false;
            statusResult = 'Válido';
          }

          return {
            ...nota,
            CODTRIB: formattedTrib,
            STATUS: statusResult,
            HAS_CSOSN: hasCSOSN ? 'S' : 'N',
            ERRORS: {
              CFOP: errCfop,
              CODTRIB: errTrib,
              CODALIQICMS: errCodAliq,
              ALIQICMS: errAliq,
              BASEICMS: errBase
            }
          };
        });
      };

      setDataEntrada(processarNotas(jsonEntrada, 'entrada'));
      setDataSaida(processarNotas(jsonSaida, 'saida'));
      setDataQuebra(jsonQuebra);
      setDataOmissas(jsonOmissas);

      const totalCount = jsonEntrada.length + jsonSaida.length + jsonQuebra.length + jsonOmissas.length;
      if (totalCount > 0) toast(`Foram listadas ${totalCount} notas auditadas.`, 'success');
      else toast('Nenhum dado encontrado para o período.', 'success');
    } catch (err: any) {
      toast(err.message || 'Erro na consulta', 'error');
      setDataEntrada([]);
      setDataSaida([]);
      setDataQuebra([]);
      setDataOmissas([]);
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

  // Altera Colunas ao trocar de aba
  useEffect(() => {
    if (activeTab === 'entrada' || activeTab === 'saida') {
      setColumnOrder(INITIAL_COLUMNS);
    } else if (activeTab === 'quebra') {
      setColumnOrder(QUEBRA_COLUMNS);
    } else {
      setColumnOrder(OMISSAS_COLUMNS);
    }
    setColumnFilters({});
    setSortConfig(null);
  }, [activeTab]);

  const data = useMemo(() => {
    if (activeTab === 'entrada') return dataEntrada;
    if (activeTab === 'saida') return dataSaida;
    if (activeTab === 'quebra') return dataQuebra;
    return dataOmissas;
  }, [activeTab, dataEntrada, dataSaida, dataQuebra, dataOmissas]);

  // Sugestões do Autocomplete
  const columnSuggestions = useMemo(() => {
    const map: Record<string, string[]> = {};
    columnOrder.forEach(col => {
      const uniqueValues = new Set<string>();
      data.forEach(item => {
        let val = '';
        if (col.id === 'DTENTSAI' || col.id === 'DTEMI') val = formatDate((item as any)[col.id]);
        else if (col.id === 'TOTAL_BASE' || col.id === 'VLRNOTA') return; // Skip numeric for suggestions
        else if (col.id !== 'EXPAND') val = String((item as any)[col.id] || '');
        if (val) uniqueValues.add(val);
      });
      map[col.id] = Array.from(uniqueValues).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
    return map;
  }, [data]);

  // Agrupamento e Filtro
  const groupedData = useMemo(() => {
    const filteredItems = data.filter(row => {
      return Object.entries(columnFilters).every(([key, filterValues]) => {
        if (!filterValues || filterValues.length === 0) return true;

        let rowValue = '';
        if (key === 'DTENTSAI' || key === 'DTEMI') rowValue = formatDate((row as any)[key]);
        else if (key === 'ALIQICMS') rowValue = formatPercent((row as any)[key]);
        else rowValue = String((row as any)[key] || '');

        return filterValues.some(fv => rowValue.toLowerCase().includes(fv.toLowerCase()));
      });
    });

    if (activeTab === 'quebra' || activeTab === 'omissas') {
      return filteredItems;
    }

    const groups: Record<number, GroupedNota> = {};
    filteredItems.forEach(item => {
      if (!groups[item.NUNOTA]) {
        groups[item.NUNOTA] = {
          NUNOTA: item.NUNOTA,
          NUMNOTA: item.NUMNOTA,
          DTENTSAI: item.DTENTSAI,
          STATUS: 'Válido',
          ITEMS: [],
          TOTAL_BASE: 0,
          XML: item.XML,
          HAS_CSOSN: item.HAS_CSOSN // Copia a flag para o elemento pai
        };
      }
      groups[item.NUNOTA].ITEMS.push(item);
      groups[item.NUNOTA].TOTAL_BASE += Number(item.BASEICMS || 0);

      const currentAggStatus = groups[item.NUNOTA].STATUS;
      if (item.STATUS === 'Inconsistente') {
        groups[item.NUNOTA].STATUS = 'Inconsistente';
      } else if (item.STATUS === 'Sem Regra' && currentAggStatus !== 'Inconsistente') {
        groups[item.NUNOTA].STATUS = 'Sem Regra';
      }

      // Propaga o selo CSOSN para o Pai se algum filho também tiver
      if (item.HAS_CSOSN === 'S') {
        groups[item.NUNOTA].HAS_CSOSN = 'S';
      }
    });

    return Object.values(groups);
  }, [data, columnFilters, activeTab]);

  // Ordenação das Notas
  const sortedData = useMemo(() => {
    let sortableItems = [...groupedData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const getSortValue = (item: any, colId: string) => {
          if (colId === 'DTENTSAI' || colId === 'DTEMI') {
            const val = item[colId];
            if (typeof val === 'string' && val.includes('/')) {
              const [d, m, y] = val.split('/');
              return new Date(`${y}-${m}-${d}`).getTime();
            }
            const d = new Date(val);
            return isNaN(d.getTime()) ? 0 : d.getTime();
          }
          if (colId === 'TOTAL_BASE') return item.TOTAL_BASE;
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
  }, [groupedData, sortConfig]);

  const requestSort = (key: string) => {
    if (key === 'EXPAND') return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const totalBaseIcms = useMemo(() => groupedData.reduce((acc, row) => acc + (Number(row.TOTAL_BASE) || 0), 0), [groupedData]);

  const toggleRow = (nunota: number) => {
    const next = new Set(expandedRows);
    if (next.has(nunota)) next.delete(nunota);
    else next.add(nunota);
    setExpandedRows(next);
  };

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

  const resetTable = () => {
    setColumnOrder(INITIAL_COLUMNS);
    setColumnFilters({});
    setSortConfig(null);
    setExpandedRows(new Set());
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
              <ShieldAlert className="w-8 h-8 opacity-90 text-emerald-100" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                  Validação Tributária - {
                    activeTab === 'entrada' ? 'Notas de Entrada' :
                      activeTab === 'saida' ? 'Notas de Saída' :
                        activeTab === 'quebra' ? 'Quebra de Sequência' :
                          'Notas Omissas'
                  }
                </h1>
                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                  Auditoria de CFOP x Alíquota (Itens)
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 animate-fade-in-up text-left">
        {/* Tabs de Seleção */}
        <div className="flex items-center gap-1 mb-6 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
          <button
            onClick={() => setActiveTab('entrada')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'entrada'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-50'
              }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            Notas de Entrada
          </button>
          <button
            onClick={() => setActiveTab('saida')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'saida'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-50'
              }`}
          >
            <ArrowUpDown className="w-4 h-4 rotate-180" />
            Notas de Saída
          </button>
          <button
            onClick={() => setActiveTab('quebra')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'quebra'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-50'
              }`}
          >
            <List className="w-4 h-4" />
            Quebra de Sequência
          </button>
          <button
            onClick={() => setActiveTab('omissas')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'omissas'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-50'
              }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Notas Omissas
          </button>
        </div>

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
                      )
                    })}
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
                  const isExpanded = (activeTab === 'entrada' || activeTab === 'saida') && expandedRows.has(row.NUNOTA);

                  return (
                    <React.Fragment key={`${row.NUNOTA}-${idx}`}>
                      <tr className={`hover:bg-emerald-50/30 transition-colors group ${isExpanded ? 'bg-emerald-50/20' : ''}`}>
                        {columnOrder.map((col) => {
                          let content: React.ReactNode = (row as any)[col.id];

                          if (col.id === 'EXPAND') {
                            content = (
                              <button
                                onClick={() => toggleRow(row.NUNOTA)}
                                className="p-1 hover:bg-emerald-100 rounded-md transition-colors text-emerald-600"
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            );
                          }

                          if (col.id === 'STATUS') {
                            let statusContent;
                            if (row.STATUS === 'Válido') {
                              statusContent = (
                                <span className="px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-fit mx-auto bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                                  <CheckCircle2 className="w-3 h-3" /> Válido
                                </span>
                              );
                            } else if (row.STATUS === 'Sem Regra') {
                              statusContent = (
                                <span className="px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-fit mx-auto bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">
                                  <AlertCircle className="w-3 h-3" /> Sem Regra
                                </span>
                              );
                            } else {
                              statusContent = (
                                <span className="px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-fit mx-auto bg-rose-100 text-rose-700 border border-rose-200 shadow-sm">
                                  <AlertCircle className="w-3 h-3" /> Inconsistente
                                </span>
                              );
                            }

                            content = (
                              <div className="flex flex-col items-center gap-1.5">
                                {statusContent}
                                {row.HAS_CSOSN === 'S' && (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 w-fit mx-auto bg-blue-100 text-blue-700 border border-blue-200 shadow-sm">
                                    Simples Nacional
                                  </span>
                                )}
                              </div>
                            );
                          }

                          if (col.id === 'NUNOTA') content = <span className="text-slate-400 font-mono">{row.NUNOTA}</span>;
                          if (col.id === 'NUMNOTA') content = <span className="font-black text-slate-900">{row.NUMNOTA}</span>;
                          if (col.id === 'DTENTSAI') content = <span className="whitespace-nowrap text-slate-600">{formatDate(row.DTENTSAI)}</span>;

                          if (col.id === 'TOTAL_BASE') {
                            const hasInconsistent = row.ITEMS?.some((i: any) => i.STATUS === 'Inconsistente');
                            content = (
                              <span className={`font-black tabular-nums ${row.STATUS === 'Sem Regra' ? 'text-slate-800' : hasInconsistent ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {formatCurrency(row.TOTAL_BASE)}
                              </span>
                            );
                          }

                          // Novas Colunas - Quebra e Omissas
                          if (col.id === 'QTD_QUEBRA') content = <span className="font-bold text-rose-600">{row.QTD_QUEBRA}</span>;
                          if (col.id === 'SERIENOTA') content = <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{row.SERIENOTA}</span>;
                          if (col.id === 'NUM_DE' || col.id === 'NUM_ATE') content = <span className="font-medium text-slate-700">{row[col.id]}</span>;
                          if (col.id === 'VLRNOTA') content = <span className="font-bold text-emerald-600">{formatCurrency(row.VLRNOTA)}</span>;
                          if (col.id === 'DTEMI') content = <span className="text-slate-600">{formatDate(row.DTEMI)}</span>;
                          if (col.id === 'CHAVENFE') content = <span className="text-[10px] font-mono text-slate-400">{row.CHAVENFE}</span>;
                          if (col.id === 'NUMNOTA') content = <span className="font-bold text-slate-700">{row.NUMNOTA}</span>;
                          if (col.id === 'ACTIONS') {
                            if ((row.NUMNOTA && (activeTab === 'entrada' || activeTab === 'saida')) || row.XML) {
                              const isLoading = loadingXmlId === row.NUMNOTA;
                              content = (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openXmlModal(row); }}
                                  disabled={isLoading}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 text-xs font-bold transition-colors"
                                  title="Visualizar XML"
                                >
                                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                  {isLoading ? 'Buscando...' : 'Ver XML'}
                                </button>
                              );
                            } else {
                              content = <span className="text-slate-400 text-xs">-</span>;
                            }
                          }

                          return (
                            <td key={`${col.id}-${idx}`} className={`px-4 py-2 text-xs text-${col.align} border-r border-slate-50 last:border-r-0`}>
                              {content}
                            </td>
                          );
                        })}
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={columnOrder.length} className="p-0 border-b border-slate-200">
                            <ItemTable
                              items={row.ITEMS}
                              formatCurrency={formatCurrency}
                              formatPercent={formatPercent}
                              formatDate={formatDate}
                              activeTab={activeTab}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

      {/* MODAL DO VISUALIZADOR XML NFE / CTE COM IMPRESSÃO */}
      {dlgOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6 animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
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