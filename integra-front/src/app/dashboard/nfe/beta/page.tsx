'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  RefreshCw,
  Search,
  FileText,
  FileCode2,
  ExternalLink,
  AlertCircle,
  Server,
  Menu,
  Settings,
  LogOut,
  Users,
  X,
  TrendingUp,
  TrendingDown,
  Eye
} from 'lucide-react';

// --- Componente SidebarMenu (Mock Local para compilação) ---
// Em seu projeto real, descomente a importação e remova este componente local:
// import SidebarMenu from '@/components/SidebarMenu';

const SidebarMenu = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  return (
    <>
      <div 
          className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 backdrop-blur-sm ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
          onClick={onClose} 
      />
      
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
                  <FileCode2 className="w-5 h-5" />
                  Visualizador XML
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

type Row = {
  NUMNOTA?: number | string;
  VLRNOTA?: number | string;
  XML?: string;
};

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

function toYmd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Heurística simples para base64 -> texto
function maybeBase64ToText(input: string) {
  const s = (input ?? '').trim();
  if (!s) return s;

  const looksB64 = /^[A-Za-z0-9+/=\s]+$/.test(s) && s.length % 4 === 0 && s.length > 40;
  if (!looksB64) return s;

  try {
    const cleaned = s.replace(/\s+/g, '');
    const decoded = atob(cleaned);

    const printableRatio =
      decoded.split('').filter((c) => c >= ' ' || c === '\n' || c === '\r' || c === '\t').length / decoded.length;

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
    const err = doc.getElementsByTagName('parsererror')?.[0]?.textContent;
    if (err) return s;
  } catch {
    return s;
  }

  try {
    const reg = /(>)(<)(\/*)/g;
    let formatted = s.replace(reg, '$1\n$2$3');
    let pad = 0;
    const PADDING = '  ';

    return formatted
      .split('\n')
      .map((line) => {
        let indent = 0;
        if (line.match(/.+<\/\w[^>]*>$/)) {
          indent = 0;
        } else if (line.match(/^<\/\w/)) {
          if (pad > 0) pad -= 1;
        } else if (line.match(/^<\w([^>]*[^/])?>.*$/)) {
          indent = 1;
        } else {
          indent = 0;
        }

        const out = PADDING.repeat(pad) + line;
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

// Extrair nome do emitente via regex leve para listagem
function extractEmitNome(xmlRaw: string) {
  const s = safeString(xmlRaw);
  const decoded = maybeBase64ToText(s);
  if (!decoded) return '-';
  const match = decoded.match(/<emit[^>]*>[\s\S]*?<xNome>([\s\S]*?)<\/xNome>[\s\S]*?<\/emit>/i) || decoded.match(/<xNome>([\s\S]*?)<\/xNome>/i);
  return match ? match[1].trim() : 'Não identificado';
}

// Helper para determinar a cor do emitente baseada na UF
function getRegionColorClass(uf: string) {
  const state = (uf || '').trim().toUpperCase();
  
  if (state === 'PB') {
    return 'bg-emerald-50 border-emerald-200'; // Verde
  }
  
  const sulSudeste = ['PR', 'RS', 'SC', 'ES', 'MG', 'RJ', 'SP'];
  if (sulSudeste.includes(state)) {
    return 'bg-rose-50 border-rose-200'; // Vermelho
  }
  
  return 'bg-amber-50 border-amber-200'; // Amarelo (Outros)
}

// --- Componentes de UI (Tailwind) ---

const TableHeader = ({
  children,
  align = 'left',
  width,
  ...props
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string | number;
} & React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    style={{ width }}
    className={`px-4 py-3 bg-emerald-50 text-${align} text-xs font-bold text-emerald-800 uppercase tracking-wider sticky top-0 z-10 border-b border-emerald-100 whitespace-nowrap`}
    {...props}
  >
    {children}
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
    className={`px-4 py-3 text-sm text-slate-700 border-b border-slate-50 text-${align} ${className}`}
    {...props}
  >
    {children}
  </td>
);

const Card = ({ title, icon, children, className = '', action }: { title: React.ReactNode; icon?: React.ReactNode; children: React.ReactNode; className?: string; action?: React.ReactNode }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${className}`}>
    <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50/30 flex justify-between items-center flex-wrap gap-2">
      <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
        {icon && <span className="text-emerald-600">{icon}</span>}
        {title}
      </h2>
      {action && <div>{action}</div>}
    </div>
    <div className="flex-1 overflow-hidden flex flex-col relative">
      {children}
    </div>
  </div>
);

// --- Componente: Visualizador Visual de NFe ---

function NfeVisualizer({ xml }: { xml: string }) {
  const parsedData = useMemo(() => {
    if (typeof window === 'undefined' || !xml) return null;
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const err = doc.getElementsByTagName('parsererror')?.[0];
      if (err) return null;

      const getText = (parent: Element | null, tag: string) => 
        parent?.getElementsByTagName(tag)[0]?.textContent || '';

      const ide = doc.getElementsByTagName('ide')[0];
      const emit = doc.getElementsByTagName('emit')[0];
      const dest = doc.getElementsByTagName('dest')[0];
      const total = doc.getElementsByTagName('ICMSTot')[0];
      const detNodes = Array.from(doc.getElementsByTagName('det'));
      const enderEmitNode = first(emit, 'enderEmit');

      return {
        ide: {
          nNF: getText(ide, 'nNF'),
          natOp: getText(ide, 'natOp'),
          dhEmi: getText(ide, 'dhEmi').split('T')[0],
        },
        emit: {
          xNome: getText(emit, 'xNome'),
          xFant: getText(emit, 'xFant'),
          CNPJ: getText(emit, 'CNPJ'),
          enderEmit:{
            UF: getText(enderEmitNode , 'UF')
          },
        },
        dest: {
          xNome: getText(dest, 'xNome'),
          CNPJ: getText(dest, 'CNPJ') || getText(dest, 'CPF'),
        },
        total: {
          vNF: getText(total, 'vNF'),
          vProd: getText(total, 'vProd'),
        },
        items: detNodes.map((det) => {
          const prod = det.getElementsByTagName('prod')[0];
          return {
            cProd: getText(prod, 'cProd'),
            xProd: getText(prod, 'xProd'),
            qCom: getText(prod, 'qCom'),
            vUnCom: getText(prod, 'vUnCom'),
            vProd: getText(prod, 'vProd'),
          };
        }),
      };
    } catch {
      return null;
    }
  }, [xml]);

  if (!parsedData || !parsedData.ide.nNF) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm flex items-start gap-3 m-4">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
              <p className="font-medium text-amber-800">Atenção</p>
              <p className="text-sm text-amber-700">Não foi possível montar a visualização gráfica (o XML não parece ser uma NFe padrão). Alterne para o "XML Bruto".</p>
          </div>
      </div>
    );
  }

  const emitenteBgClass = getRegionColorClass(parsedData.emit.enderEmit.UF);

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 min-h-full">
      
      {/* Grid de Informações Principais */}
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

      {/* Tabela de Itens */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
           <h3 className="font-bold text-slate-800">Itens da Nota</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <TableHeader>Código</TableHeader>
                <TableHeader>Descrição</TableHeader>
                <TableHeader align="right">Qtd</TableHeader>
                <TableHeader align="right">Vlr Unit</TableHeader>
                <TableHeader align="right">Vlr Total</TableHeader>
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

      {/* Totalizador */}
      <div className="flex justify-end">
        <div className="bg-emerald-600 text-white rounded-xl px-6 py-4 shadow-md border border-emerald-500 flex flex-col items-end">
           <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Total da Nota</span>
           <span className="text-2xl font-black tabular-nums">R$ {Number(parsedData.total.vNF).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

    </div>
  );
}

// --- Componente Principal ---

export default function SankhyaXmlViewerPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Sidebar State

  const API_BASE = useMemo(() => (process.env.NEXT_PUBLIC_API_URL ?? '').trim(), []);
  const BASE_URL = useMemo(() => {
    if (!API_BASE) return '/sankhya/nfe';
    return `${API_BASE.replace(/\/$/, '')}/sankhya/nfe`;
  }, [API_BASE]);

  // Modificado de dtIni/dtFim separados para um único seletor de mês YYYY-MM
  const [mesRef, setMesRef] = useState(() => new Date().toISOString().slice(0, 7));

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Estado do Modal
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgTitle, setDlgTitle] = useState('');
  const [dlgXml, setDlgXml] = useState('');
  const [dlgWarn, setDlgWarn] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'raw'>('visual');

  const buildUrl = () => {
    // Calcular dia 1 e o último dia do mês para compatibilidade com o backend
    const [year, month] = mesRef.split('-');
    const dtIni = `${mesRef}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const dtFim = `${mesRef}-${lastDay}`;

    const qs = `dtIni=${encodeURIComponent(dtIni)}&dtFim=${encodeURIComponent(dtFim)}`;
    return BASE_URL.includes('http') ? `${BASE_URL}?${qs}` : `${BASE_URL}?${qs}`;
  };

  const fetchData = async () => {
    setLoading(true);
    setErr(null);

    try {
      const url = buildUrl();
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      const ct = res.headers.get('content-type') || '';
      if (!res.ok) {
        const text = ct.includes('application/json') ? JSON.stringify(await res.json()) : await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      if (!ct.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Resposta não é JSON (content-type: ${ct}). Body: ${text.slice(0, 500)}`);
      }

      const data = await res.json();
      const list: Row[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

      setRows(list);
      setPage(0);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => {
      const s = `${safeString(r.NUMNOTA)} ${safeString(r.VLRNOTA)}`.toLowerCase();
      return s.includes(query);
    });
  }, [rows, q]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length]);
  const pageRows = useMemo(() => {
    const start = page * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const openXml = (r: Row) => {
    setDlgWarn(null);
    setViewMode('visual');

    const num = safeString(r.NUMNOTA);
    const vlr = safeString(r.VLRNOTA);

    const raw = safeString(r.XML);
    const decoded = maybeBase64ToText(raw);
    const pretty = xmlPretty(decoded);

    if (!pretty.trim()) setDlgWarn('XML vazio.');
    else if (!pretty.trim().startsWith('<')) setDlgWarn('Conteúdo não parece XML puro. Mostrando texto bruto.');

    setDlgTitle(`Nota Fiscal — NUMNOTA ${num || '-'} | VLR ${vlr || '-'}`);
    setDlgXml(pretty);
    setDlgOpen(true);
  };

  const openInNewTab = () => {
    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(dlgTitle)}</title>
<style>
  body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; margin: 16px; background-color: #f8fafc; color: #334155; }
  h3 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
  pre { white-space: pre; overflow: auto; border: 1px solid #cbd5e1; background-color: #ffffff; padding: 16px; border-radius: 8px; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
</style>
</head>
<body>
<h3>${escapeHtml(dlgTitle)}</h3>
<pre>${escapeHtml(dlgXml)}</pre>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

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

      {/* Header Estilo Dashboard */}
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
                 <div className="flex items-center gap-3">
                    <Server className="w-8 h-8 opacity-90 text-emerald-100" />
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Visualizador de NFe</h1>
                        <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">Sankhya XML Viewer</p>
                    </div>
                 </div>

                 <div className="flex gap-4 items-center">
                     <img
                        src="/eletro_farias2.png"
                        alt="Logo 1"
                        className="h-16 w-auto object-contain bg-green/10 rounded px-2"                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                     <img
                        src="/lid-verde-branco.png"
                        alt="Logo 2"
                        className="h-12 w-auto object-contain hidden md:block"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                 </div>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 md:p-6 space-y-6">
        
        {err && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="font-medium text-amber-800">Atenção</p>
                    <p className="text-sm text-amber-700">{err}</p>
                </div>
            </div>
        )}

        {/* Action Bar (Filtros) */}
        <Card 
            title="Filtros de Busca" 
            icon={<Search className="w-5 h-5" />}
            className="w-full overflow-visible"
        >
            <div className="p-5 flex flex-col lg:flex-row gap-4 lg:items-end bg-white">
                
                <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                       <Calendar className="w-3.5 h-3.5" /> Mês Ref.
                    </label>
                    <input
                        type="month"
                        value={mesRef}
                        onChange={(e) => setMesRef(e.target.value)}
                        className="p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-700 transition-shadow text-sm"
                    />
                </div>

                <div className="flex flex-col gap-1.5 w-full lg:flex-1 lg:max-w-md ml-auto">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Buscar (NUMNOTA/VLR)</label>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={q}
                            onChange={(e) => {
                                setQ(e.target.value);
                                setPage(0);
                            }}
                            placeholder="Digite para buscar..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-700 transition-shadow text-sm"
                        />
                    </div>
                </div>

                <button
                    onClick={() => { setPage(0); fetchData(); }}
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Buscando...' : 'Aplicar Filtros'}
                </button>
            </div>
            <div className="px-5 py-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                 <span>Endpoint: <span className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">{buildUrl()}</span></span>
                 <div className="flex gap-3 font-medium">
                    <span className="bg-slate-200 px-2 py-0.5 rounded-full">Total: {rows.length}</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">Filtrados: {filtered.length}</span>
                 </div>
            </div>
        </Card>

        {/* Tabela de Resultados */}
        <Card 
            title="Resultados XML NFe" 
            icon={<FileCode2 className="w-5 h-5" />}
            className="w-full min-h-[500px]"
        >
            <div className="overflow-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 relative">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-emerald-50/50">
                        <tr>
                            <TableHeader width="140px" align="center">Ações</TableHeader>
                            <TableHeader>NUMNOTA</TableHeader>
                            <TableHeader>Emitente</TableHeader>
                            <TableHeader align="right">VLRNOTA</TableHeader>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                        {loading && pageRows.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-12 text-center text-emerald-600">
                                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
                                    <span className="font-medium text-sm">Carregando notas...</span>
                                </td>
                            </tr>
                        ) : pageRows.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-12 text-center text-slate-400 text-sm italic">
                                    Nenhum registro para exibir.
                                </td>
                            </tr>
                        ) : (
                            pageRows.map((r, idx) => {
                                const emitNome = extractEmitNome(r.XML || '');

                                return (
                                    <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                                        <TableCell align="center">
                                            <button 
                                                onClick={() => openXml(r)}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 font-semibold text-xs rounded border border-slate-200 hover:border-emerald-300 transition-colors flex items-center gap-1.5 mx-auto"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Visualizar
                                            </button>
                                        </TableCell>
                                        <TableCell className="font-bold text-slate-800">{safeString(r.NUMNOTA)}</TableCell>
                                        <TableCell className="font-medium text-slate-600 truncate max-w-md" title={emitNome}>
                                           {emitNome}
                                        </TableCell>
                                        <TableCell align="right" className="tabular-nums font-medium text-emerald-700">R${safeString(r.VLRNOTA)}</TableCell>
                                           
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">
                        Mostrando <span className="text-slate-900">{page * pageSize + 1}</span> a <span className="text-slate-900">{Math.min((page + 1) * pageSize, filtered.length)}</span> de <span className="text-slate-900">{filtered.length}</span> registros
                    </span>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setPage((p) => Math.max(0, p - 1))} 
                            disabled={page === 0 || loading}
                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Anterior
                        </button>
                        <span className="text-sm font-bold text-slate-700 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                            {page + 1} <span className="text-slate-400 font-normal">/ {totalPages}</span>
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1 || loading}
                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}
        </Card>

      </main>

      {/* --- Modal (Dialog) Customizado em Tailwind --- */}
      {dlgOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-full flex flex-col overflow-hidden border border-slate-200">
                
                {/* Modal Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <FileCode2 className="w-5 h-5 text-emerald-600" />
                            {dlgTitle}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Toggle de Visualização */}
                        <div className="flex bg-slate-200/60 p-1 rounded-lg border border-slate-200">
                            <button 
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'visual' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`} 
                                onClick={() => setViewMode('visual')}
                            >
                                Visual
                            </button>
                            <button 
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'raw' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`} 
                                onClick={() => setViewMode('raw')}
                            >
                                XML Bruto
                            </button>
                        </div>

                        <button 
                            onClick={openInNewTab} 
                            disabled={!dlgXml.trim()}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            title="Abrir em Nova Aba"
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

                {/* Modal Content */}
                <div className="flex-1 overflow-auto bg-slate-100 relative">
                    {dlgWarn && viewMode === 'visual' && (
                         <div className="m-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
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