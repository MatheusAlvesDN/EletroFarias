'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Button,
  Tooltip,
  Tab,
  Tabs,
  AppBar,
  Toolbar,
  IconButton,
  Snackbar,
} from '@mui/material';
import SidebarMenu from '@/components/SidebarMenu';

// ============================================================================
// --- COMPARTILHADO: Ícones e Helpers Genéricos ---
// ============================================================================

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
  </svg>
);

const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));
const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const normalizeHr = (hr: any) => {
  if (hr == null || hr === '') return null;
  const s = String(hr).trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(s)) return s.length === 5 ? `${s}:00` : s;
  if (/^\d{6}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2, 4)}:${s.slice(4, 6)}`;
  if (/^\d{4}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2, 4)}:00`;
  const only = s.replace(/\D/g, '');
  if (only.length === 6) return `${only.slice(0, 2)}:${only.slice(2, 4)}:${only.slice(4, 6)}`;
  if (only.length === 4) return `${only.slice(0, 2)}:${only.slice(2, 4)}:00`;
  return null;
};

const toDateBR = (v: string) => {
  if (!v) return '-';
  const s = String(v).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const m1 = s.match(/^(\d{2})(\d{2})(\d{4})(?:\s|$)/);
  if (m1) {
    const [, dd, mm, yyyy] = m1;
    return `${dd}/${mm}/${yyyy}`;
  }
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) {
    const [, yyyy, mm, dd] = m2;
    return `${dd}/${mm}/${yyyy}`;
  }
  return s;
};

const parseDtHrToDate = (dtneg: string, hrneg: any): Date | null => {
  const hr = normalizeHr(hrneg) ?? '00:00:00';
  const d = String(dtneg ?? '').trim();
  if (!d) return null;
  const br = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) {
    const [, dd, mm, yyyy] = br;
    const dt = new Date(`${yyyy}-${mm}-${dd}T${hr}`);
    return Number.isFinite(dt.getTime()) ? dt : null;
  }
  const m1 = d.match(/^(\d{2})(\d{2})(\d{4})/);
  if (m1) {
    const [, dd, mm, yyyy] = m1;
    const dt = new Date(`${yyyy}-${mm}-${dd}T${hr}`);
    return Number.isFinite(dt.getTime()) ? dt : null;
  }
  const m2 = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) {
    const [, yyyy, mm, dd] = m2;
    const dt = new Date(`${yyyy}-${mm}-${dd}T${hr}`);
    return Number.isFinite(dt.getTime()) ? dt : null;
  }
  const dt = new Date(d);
  if (!Number.isFinite(dt.getTime())) return null;
  const hhmmss = normalizeHr(hrneg);
  if (hhmmss) {
    const [H, M, S] = hhmmss.split(':').map((x) => Number(x) || 0);
    dt.setHours(H, M, S, 0);
  }
  return dt;
};

// Prioridade de Cores Genérica
const corPri = (bk: string | null | undefined) => {
  const s = String(bk ?? '').trim().toUpperCase();
  // Verde
  if (s.includes('#2E7D32') || s.includes('#388E3C') || s.includes('46, 125, 50') || s.includes('56, 142, 60')) return 1;
  // Azul
  if (s.includes('#1976D2') || s.includes('#1565C0') || s.includes('25, 118, 210') || s.includes('21, 101, 192')) return 2;
  // Amarelo
  if (s.includes('#F9A825') || s.includes('#FBC02D') || s.includes('249, 168, 37') || s.includes('251, 192, 45')) return 3;
  // Vermelho
  if (s.includes('#C62828') || s.includes('#D32F2F') || s.includes('198, 40, 40') || s.includes('211, 47, 47')) return 4;
  return 9;
};

// ============================================================================
// --- ABA 1: FILA DE CABOS (Lógica Específica) ---
// ============================================================================

type FilaCabosRow = {
  ordemLinha: number;
  bkcolor: string;
  fgcolor: string;
  nunota: number;
  numnota: number;
  codtipoper: number;
  descroper: string;
  dtalter: string;
  hralter: string;
  codparc: number;
  parceiro: string;
  vlrnota: number;
  codvend: number;
  vendedor: string;
  adTipoDeEntrega: string | null;
  tipoEntrega: string;
  statusNota: string;
  statusNotaDesc: string;
  libconf: string | null;
  statusConferenciaCod: string | null;
  statusConferenciaDesc: string | null;
  qtdRegConferencia: number;
  sequencia: number;
  codprod: number;
  descrprod: string;
  codgrupoprod: number;
  codvol: string;
  qtdneg: number;
  vlrunit: number;
  vlrtot: number;
  impresso: string | null;
};

const genIdCabos = (r: FilaCabosRow) => `${safeNum(r.nunota)}-${safeNum(r.sequencia)}-${safeNum(r.codprod)}`;
const timeKeyCabos = (n: FilaCabosRow) => {
  const dt = parseDtHrToDate(n.dtalter, n.hralter) ?? parseDtHrToDate(toDateBR(n.dtalter), n.hralter);
  return dt ? dt.getTime() : Number.POSITIVE_INFINITY;
};

function FilaCabosTab() {
  const [rows, setRows] = useState<FilaCabosRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRefresh, setLoadingRefresh] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [snack, setSnack] = useState<{ open: boolean; severity: 'success' | 'error' | 'info'; msg: string }>({
    open: false, severity: 'info', msg: '',
  });
  
  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    setToken(t);
  }, []);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);
  const LIST_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getFilaCabos` : `/sync/getFilaCabos`), [API_BASE]);
  const PRINT_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/imprimirEtiquetaCabo` : `/sync/imprimirEtiquetaCabo`), [API_BASE]);

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const fetchFilaCabos = useCallback(async (mode: 'initial' | 'poll' | 'manual' = 'poll') => {
    if (inFlightRef.current) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      inFlightRef.current = true;
      if (!aliveRef.current) return;
      if (mode === 'initial') setLoading(true);
      else setLoadingRefresh(true);
      setError(null);

      const resp = await fetch(LIST_URL, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
        signal: ac.signal,
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || `Falha ao buscar fila (status ${resp.status})`);
      }

      const data = (await resp.json()) as unknown;
      if (!Array.isArray(data)) throw new Error('Resposta inválida: esperado array.');

      const normalized: FilaCabosRow[] = (data as any[]).map((r) => ({
        ...r, impresso: (r.impresso ?? r.IMPRESSO ?? r.Impresso ?? null) as any,
      }));

      const ordered = [...normalized].sort((a, b) => {
        const pa = corPri(a.bkcolor);
        const pb = corPri(b.bkcolor);
        if (pa !== pb) return pa - pb;
        const ta = timeKeyCabos(a);
        const tb = timeKeyCabos(b);
        if (ta !== tb) return ta - tb;
        return safeNum(a.nunota) - safeNum(b.nunota);
      });

      if (!aliveRef.current) return;
      setRows(ordered);
      if (mode === 'manual') setSnack({ open: true, severity: 'success', msg: `Fila Cabos atualizada (${ordered.length} linhas)` });

    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      const msg = e?.message || 'Falha ao buscar /sync/getFilaCabos';
      if (!aliveRef.current) return;
      setError(msg);
      setSnack({ open: true, severity: 'error', msg });
    } finally {
      inFlightRef.current = false;
      if (!aliveRef.current) return;
      setLoading(false);
      setLoadingRefresh(false);
    }
  }, [LIST_URL, getHeaders]);

  useEffect(() => {
    fetchFilaCabos('initial');
    const id = window.setInterval(() => fetchFilaCabos('poll'), 5_000);
    return () => window.clearInterval(id);
  }, [fetchFilaCabos]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.nunota, r.numnota, r.codparc, r.parceiro, r.vendedor, r.descroper,
        r.tipoEntrega, r.statusNotaDesc, r.statusConferenciaDesc ?? '',
        r.codprod, r.descrprod, r.codgrupoprod, r.impresso ?? '', r.sequencia,
      ].map((x) => safeStr(x)).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, filter]);

  const orderByColorMap = useMemo(() => {
    const counters: Record<string, number> = {};
    const m = new Map<string, number>();
    for (const r of filtered) {
      const keyColor = String(corPri(r.bkcolor));
      counters[keyColor] = (counters[keyColor] ?? 0) + 1;
      const id = genIdCabos(r);
      m.set(id, counters[keyColor]);
    }
    return m;
  }, [filtered]);

  const counts = useMemo(() => {
    const itens = filtered.length;
    const pedidosUnicos = new Set(filtered.map((r) => r.nunota)).size;
    return { pedidosUnicos, itens };
  }, [filtered]);

  const imprimirEtiquetaCb = useCallback(async (row: FilaCabosRow) => {
    const id = genIdCabos(row);
    if (printingId) return;

    try {
      setPrintingId(id);
      setSnack({ open: true, severity: 'info', msg: 'Gerando PDF…' });

      const payload = {
        nunota: row.nunota, sequencia: row.sequencia, parceiro: row.parceiro,
        vendedor: row.vendedor, codprod: row.codprod, descrprod: row.descrprod, qtdneg: row.qtdneg,
      };

      const resp = await fetch(PRINT_URL, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error(`Falha ao imprimir (status ${resp.status})`);

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0';
      iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        const win = iframe.contentWindow;
        if (!win) {
          URL.revokeObjectURL(url); iframe.remove();
          setSnack({ open: true, severity: 'error', msg: 'Erro ao abrir PDF.' });
          return;
        }
        win.focus(); win.print();
        setTimeout(() => { URL.revokeObjectURL(url); iframe.remove(); }, 180_000);
      };
      setSnack({ open: true, severity: 'success', msg: 'PDF aberto para impressão' });
    } catch (e: any) {
      setSnack({ open: true, severity: 'error', msg: e?.message || 'Erro ao imprimir etiqueta' });
    } finally {
      setPrintingId(null);
    }
  }, [PRINT_URL, getHeaders, printingId]);

  // Fullscreen Logic
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | -90>(0);
  const [scale, setScale] = useState(1);
  const [vp, setVp] = useState({ w: 0, h: 0 });

  const updateViewport = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  useEffect(() => {
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, [updateViewport]);

  useEffect(() => {
    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setFullScreen(fs);
      if (typeof window !== 'undefined') setTimeout(() => updateViewport(), 0);
      if (!fs) setRotation(0);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    // @ts-ignore
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      // @ts-ignore
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, [updateViewport]);

  const enterFullscreen = useCallback(async (deg: 0 | 90 | -90) => {
    const el = tableWrapRef.current as any;
    if (!el) return;
    try {
      setRotation(deg);
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      }
      setTimeout(() => updateViewport(), 0);
    } catch (e) { console.error(e); }
  }, [updateViewport]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) return;
      if (document.exitFullscreen) await document.exitFullscreen();
      // @ts-ignore
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) { console.error(e); }
  }, []);

  const stageW = fullScreen ? (vp.w || (typeof window !== 'undefined' ? window.innerWidth : 0)) : 0;
  const stageH = fullScreen ? (vp.h || (typeof window !== 'undefined' ? window.innerHeight : 0)) : 0;
  const availW = fullScreen ? (rotation === 0 ? stageW : stageH) : 0;
  const availH = fullScreen ? (rotation === 0 ? stageH : stageW) : 0;

  useLayoutEffect(() => {
    if (!fullScreen) { setScale(1); return; }
    const el = contentRef.current;
    if (!el) return;
    const calc = () => {
      const contentW = el.scrollWidth || el.offsetWidth || 1;
      const contentH = el.scrollHeight || el.offsetHeight || 1;
      const w = Math.max(1, availW - 16);
      const h = Math.max(1, availH - 16);
      let next = Math.min(w / contentW, h / contentH);
      next = Math.max(0.28, Math.min(2.2, next));
      setScale((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
    };
    calc();
    const ro = new ResizeObserver(() => calc());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullScreen, rotation, availW, availH, filtered.length]);

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflowY: 'auto', p: { xs: 1, sm: 2, md: 3 }, backgroundColor: '#f0f2f5' }}>
      <Card sx={{ maxWidth: '100%', mx: 'auto', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Header Controls */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 3, gap: 2 }}>
            <Box>
               <Typography variant="h6" fontWeight="bold" color="primary.main" gutterBottom>
                 Fila de Cabos
               </Typography>
               <Typography variant="body2" color="text.secondary">
                 Itens: {filtered.length} {loadingRefresh ? ' • atualizando…' : ''}
               </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
               <Chip label={`Pedidos: ${counts.pedidosUnicos}`} color="primary" variant="outlined" />
               <Chip label={`Cabos: ${counts.itens}`} color="secondary" variant="outlined" />
               <Button variant="outlined" onClick={() => fetchFilaCabos('manual')} disabled={loading || loadingRefresh} sx={{ borderRadius: 2 }}>
                 {loading || loadingRefresh ? <CircularProgress size={18} /> : 'Atualizar'}
               </Button>
               <Button variant="outlined" onClick={() => enterFullscreen(0)} sx={{ borderRadius: 2 }}>Tela Cheia</Button>
               {fullScreen && <Button variant="contained" color="error" onClick={exitFullscreen} sx={{ borderRadius: 2 }}>Sair</Button>}
            </Box>
          </Box>

          <TextField 
            label="Buscar (pedido, parceiro, produto, vendedor...)" 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)} 
            size="small" 
            fullWidth 
            variant="outlined"
            sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} 
          />
          
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          {loading ? (
             <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} elevation={0} ref={tableWrapRef} sx={{
                overflow: 'hidden', backgroundColor: 'background.paper',
                border: fullScreen ? 'none' : (t) => `1px solid ${t.palette.divider}`, 
                borderRadius: fullScreen ? 0 : 3,
                '&:fullscreen': { width: '100vw !important', height: '100vh !important', margin: 0, borderRadius: 0 },
                // @ts-ignore
                '&:-webkit-full-screen': { width: '100vw !important', height: '100vh !important', margin: 0, borderRadius: 0 },
            }}>
               <Box sx={fullScreen ? { position: 'relative', width: '100vw', height: '100vh', overflowX: 'hidden', overflowY: 'auto' } : { width: '100%', overflowX: 'auto' }}>
                  <Box sx={fullScreen ? (rotation === 0 ? { position: 'absolute', inset: 0, overflow: 'auto', backgroundColor: 'background.paper' } : {
                      position: 'absolute', top: '50%', left: '50%', width: `${availW}px`, height: `${availH}px`,
                      transform: `translate(-50%, -50%) rotate(${rotation}deg)`, transformOrigin: 'center', overflow: 'hidden', backgroundColor: 'background.paper'
                  }) : {}}>
                      {fullScreen && rotation !== 0 ? (
                        <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', p: 1 }}>
                          <Box ref={contentRef} sx={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 'fit-content' }}>
                             <FilaCabosTable filtered={filtered} safeNum={safeNum} safeStr={safeStr} orderByColorMap={orderByColorMap} onPrint={imprimirEtiquetaCb} printingId={printingId} compact={true} />
                          </Box>
                        </Box>
                      ) : (
                        <FilaCabosTable filtered={filtered} safeNum={safeNum} safeStr={safeStr} orderByColorMap={orderByColorMap} onPrint={imprimirEtiquetaCb} printingId={printingId} compact={fullScreen} />
                      )}
                  </Box>
               </Box>
            </TableContainer>
          )}
        </CardContent>
      </Card>
      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} variant="filled">{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

// Sub-componente da Tabela de Cabos
function FilaCabosTable(props: { filtered: FilaCabosRow[]; safeNum: (v: any) => number; safeStr: (v: any) => string; orderByColorMap: Map<string, number>; onPrint: (row: FilaCabosRow) => void; printingId: string | null; compact?: boolean; }) {
  const { filtered, safeNum, safeStr, orderByColorMap, onPrint, printingId, compact = false } = props;
  const fontSize = compact ? 'clamp(13px, 1.5vw, 18px)' : '16px';
  const py = compact ? 0.6 : 1.2;
  const cellSx = { fontWeight: 400, lineHeight: 1.2, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' };
  const oneLineEllipsisSx = { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', lineHeight: 1.2, fontWeight: 600 } as const;

  const getRowColors = (r: FilaCabosRow) => {
    const isImpresso = String(r.impresso ?? '').trim().toUpperCase() === 'S';
    return { isImpresso, rowBg: isImpresso ? '#e0e0e0' : r.bkcolor || undefined, rowFg: isImpresso ? '#666' : r.fgcolor || undefined };
  };

  const MobileList = () => (
    <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 1.5, p: 0.5 }}>
      {filtered.map((r) => {
        const id = genIdCabos(r);
        const { isImpresso, rowBg, rowFg } = getRowColors(r);
        const ordemCor = orderByColorMap.get(id) ?? safeNum(r.ordemLinha);
        return (
          <Paper key={id} elevation={0} sx={{ p: 2, borderRadius: 3, border: (t) => `1px solid ${t.palette.divider}`, backgroundColor: rowBg, color: rowFg, opacity: isImpresso ? 0.8 : 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize, ...oneLineEllipsisSx }}>{safeStr(r.descrprod)}</Typography>
                <Typography sx={{ fontSize: '0.9rem', opacity: 0.8, mt: 0.5 }}>Vendedor: {safeStr(r.vendedor)}</Typography>
                <Typography sx={{ fontSize: '0.9rem', opacity: 0.9, fontWeight: 'bold', mt: 0.5 }}>Prod: {safeNum(r.codprod)} • Qtd: {safeNum(r.qtdneg).toLocaleString('pt-BR')}</Typography>
                <Typography sx={{ fontSize: '0.75rem', opacity: 0.6, mt: 1 }}>#{ordemCor} • Pedido: {safeNum(r.nunota)} • Seq: {safeNum(r.sequencia)}{isImpresso ? ' • IMPRESSO' : ''}</Typography>
              </Box>
              <Button variant="contained" size="small" onClick={() => onPrint(r)} disabled={printingId === id} sx={{ borderRadius: 2, fontWeight: 600, minWidth: 80, backgroundColor: '#333', '&:hover': { backgroundColor: '#000' }, textTransform: 'none' }}>
                {printingId === id ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Imprimir'}
              </Button>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );

  const DesktopTable = () => (
    <Table size="small" stickyHeader sx={{ display: { xs: 'none', md: 'table' }, width: '100%', tableLayout: 'fixed', '& th, & td': { fontSize, py, verticalAlign: 'middle', overflowWrap: 'anywhere', wordBreak: 'break-word', fontWeight: 400, borderColor: 'rgba(0,0,0,0.06)' } }}>
      <TableHead>
        <TableRow sx={{ '& th': { backgroundColor: '#f9fafb', color: '#444', fontWeight: 600, whiteSpace: 'nowrap', py: 1.5, borderBottom: '2px solid rgba(0,0,0,0.05)' } }}>
          <TableCell sx={{ width: '5%' }} align="center">#</TableCell>
          <TableCell sx={{ width: '8%' }}>Pedido</TableCell>
          <TableCell sx={{ width: '18%' }}>Parceiro</TableCell>
          <TableCell sx={{ width: '35%' }}>Produto</TableCell>
          <TableCell sx={{ width: '8%' }} align="right">Qtd</TableCell>
          <TableCell sx={{ width: '10%' }}>Vendedor</TableCell>
          <TableCell sx={{ width: '10%' }} align="center">Ação</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {filtered.map((r) => {
          const id = genIdCabos(r);
          const { isImpresso, rowBg, rowFg } = getRowColors(r);
          const ordemCor = orderByColorMap.get(id) ?? safeNum(r.ordemLinha);
          const produtoTooltip = `${safeStr(r.descrprod)}\nProd: ${safeNum(r.codprod)} • Grupo: ${safeNum(r.codgrupoprod)}${isImpresso ? ' • IMPRESSO' : ''}`;
          return (
            <TableRow key={id} sx={{ backgroundColor: rowBg, '& td': { color: rowFg }, opacity: isImpresso ? 0.6 : 1, transition: 'all 0.2s', '&:hover': { filter: 'brightness(0.95)', transform: 'translateY(-1px)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' } }}>
              <TableCell align="center"><Typography sx={{...cellSx, fontWeight: 'bold', opacity: 0.7}}>{ordemCor}</Typography></TableCell>
              <TableCell><Typography sx={{ fontWeight: 600, fontSize }}>{safeNum(r.nunota)}</Typography><Typography sx={{ opacity: 0.6, fontSize: '0.75rem' }}>Seq: {safeNum(r.sequencia)}</Typography></TableCell>
              <TableCell><Tooltip title={safeStr(r.parceiro)} arrow enterDelay={500}><Typography sx={{ ...oneLineEllipsisSx, fontSize }}>{safeStr(r.parceiro)}</Typography></Tooltip><Typography sx={{ opacity: 0.6, fontSize: '0.75rem' }}>Cód: {safeNum(r.codparc)}</Typography></TableCell>
              <TableCell><Tooltip title={<pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{produtoTooltip}</pre>} arrow enterDelay={500}><Box><Typography sx={{ ...oneLineEllipsisSx, fontSize }}>{safeStr(r.descrprod)}</Typography><Typography sx={{ opacity: 0.6, ...oneLineEllipsisSx, fontSize: '0.75rem', mt: 0.2 }}>Prod: {safeNum(r.codprod)} {isImpresso ? ' • IMPRESSO' : ''}</Typography></Box></Tooltip></TableCell>
              <TableCell align="right" sx={{ fontSize, fontWeight: 600 }}>{safeNum(r.qtdneg).toLocaleString('pt-BR')}</TableCell>
              <TableCell><Tooltip title={safeStr(r.vendedor)} arrow enterDelay={500}><Typography sx={{ ...oneLineEllipsisSx, fontSize: '0.9rem' }}>{safeStr(r.vendedor)}</Typography></Tooltip></TableCell>
              <TableCell align="center">
                <Button variant="contained" size="small" onClick={() => onPrint(r)} disabled={printingId === id} sx={{ borderRadius: 1.5, fontWeight: 600, minWidth: 90, px: 1, backgroundColor: isImpresso ? '#999' : '#333', '&:hover': { backgroundColor: '#000' }, textTransform: 'none', boxShadow: 'none' }}>
                  {printingId === id ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Imprimir'}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
        {filtered.length === 0 && <TableRow><TableCell colSpan={7}><Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}><Typography variant="h6" fontWeight="normal">Nenhum item na fila.</Typography></Box></TableCell></TableRow>}
      </TableBody>
    </Table>
  );
  return <><MobileList /><DesktopTable /></>;
}


// ============================================================================
// --- ABA 2: NOTAS EXPEDIÇÃO (Lógica Específica) ---
// ============================================================================

type NotaExpedicaoRow = {
  nunota: number; ordemLinha: number; dtneg: string; hrneg: string;
  statusNota: string; statusNotaDesc: string; statusConferenciaCod: string | null; qtdRegConferencia: number;
  bkcolor: string; fgcolor: string; vlrnota: number; adTipoDeEntrega: string | null;
  codvend: number; vendedor: string; codtipoper: number; parceiro: string;
};

const formatElapsed = (ms: number) => {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const hoursTotal = Math.floor(totalSec / 3600);
  const days = Math.floor(hoursTotal / 24);
  const remHours = hoursTotal % 24;
  const rem = totalSec % 3600;
  const mins = Math.floor(rem / 60);
  const secs = rem % 60;
  const dd = String(days).padStart(3);
  const hh = String(remHours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  if (days < 1) return `${hh}:${mm}:${ss}`;
  return `${dd}d ${hh}:${mm}:${ss}`;
};

const tempoEmSeparacao = (dtneg: string, hrneg: any, nowMs: number) => {
  const dt = parseDtHrToDate(dtneg, hrneg);
  if (!dt) return '-';
  return formatElapsed(nowMs - dt.getTime());
};

const timeKeyExp = (n: NotaExpedicaoRow) => {
  const dt = parseDtHrToDate(n.dtneg, n.hrneg) ?? parseDtHrToDate(toDateBR(n.dtneg), n.hrneg);
  return dt ? dt.getTime() : Number.POSITIVE_INFINITY;
};

function ExpedicaoTab() {
  const [items, setItems] = useState<NotaExpedicaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const [q, setQ] = useState('');
  const [onlyEC, setOnlyEC] = useState(false);
  const [onlyRL, setOnlyRL] = useState(false);
  const [onlyEI, setOnlyEI] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [rotation, setRotation] = useState<90 | -90>(90);
  const [scale, setScale] = useState(1);
  const [vp, setVp] = useState({ w: 0, h: 0 });

  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);
  const lastHashRef = useRef<string>('');

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    setToken(t);
  }, []);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);
  const LIST_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getNotasExpedicao` : `/sync/getNotasExpedicao`), [API_BASE]);

  const fetchData = useCallback(async (mode: 'initial' | 'poll' | 'manual' = 'poll') => {
    if (inFlightRef.current) return;
    try {
      inFlightRef.current = true;
      if (mode === 'initial') setLoading(true);
      else setLoadingRefresh(true);
      setErro(null);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(LIST_URL, { method: 'GET', headers, cache: 'no-store' });
      if (!resp.ok) throw new Error(await resp.text() || `Falha ao carregar notas (status ${resp.status})`);

      const data = (await resp.json()) as any[] | null;
      const rawList = Array.isArray(data) ? data : [];
      const list: NotaExpedicaoRow[] = rawList.map((r: any) => {
        const adTipo = r.adTipoDeEntrega ?? r.AD_TIPODEENTREGA ?? r.ad_tipodeentrega ?? r.AD_TIPO_DE_ENTREGA ?? r.ad_tipo_de_entrega ?? null;
        return {
          nunota: safeNum(r.nunota ?? r.NUNOTA),
          ordemLinha: safeNum(r.ordemLinha ?? r.ORDEM_LINHA ?? r.ORDEM_TIPO ?? r.ordem_tipo ?? r.ORDEM_GERAL ?? r.ordem_geral ?? 0),
          dtneg: String(r.dtneg ?? r.DTNEG ?? ''),
          hrneg: String(r.hrneg ?? r.HRNEG ?? r.hrNeg ?? r.HR_NEG ?? r.hr_neg ?? r.HRNEGO ?? ''),
          statusNota: String(r.statusNota ?? r.STATUS_NOTA ?? r.statusnota ?? ''),
          statusNotaDesc: String(r.statusNotaDesc ?? r.STATUS_NOTA_DESC ?? r.statusnota_desc ?? ''),
          statusConferenciaCod: (r.statusConferenciaCod ?? r.STATUS_CONFERENCIA_COD ?? null) as any,
          qtdRegConferencia: safeNum(r.qtdRegConferencia ?? r.QTD_REG_CONFERENCIA),
          bkcolor: String(r.bkcolor ?? r.BKCOLOR ?? '#FFFFFF'),
          fgcolor: String(r.fgcolor ?? r.FGCOLOR ?? '#000000'),
          vlrnota: safeNum(r.vlrnota ?? r.VLRNOTA),
          adTipoDeEntrega: adTipo,
          codvend: safeNum(r.codvend ?? r.CODVEND),
          vendedor: String(r.vendedor ?? r.VENDEDOR ?? ''),
          codtipoper: safeNum(r.codtipoper ?? r.CODTIPOPER),
          parceiro: String(r.parceiro ?? r.PARCEIRO ?? ''),
        };
      });

      const sorted = [...list].sort((a, b) => {
        const pa = corPri(a.bkcolor);
        const pb = corPri(b.bkcolor);
        if (pa !== pb) return pa - pb;
        const ta = timeKeyExp(a);
        const tb = timeKeyExp(b);
        if (ta !== tb) return ta - tb;
        const oa = safeNum(a.ordemLinha);
        const ob = safeNum(b.ordemLinha);
        if (oa !== ob) return oa - ob;
        return safeNum(a.nunota) - safeNum(b.nunota);
      });

      const newHash = JSON.stringify(sorted.map(x => x.nunota + x.statusNota));
      if (newHash !== lastHashRef.current) {
        lastHashRef.current = newHash;
        if (aliveRef.current) setItems(sorted);
      }
    } catch (e: any) {
      setErro(e.message);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      setLoadingRefresh(false);
    }
  }, [LIST_URL, token, API_TOKEN]);

  useEffect(() => {
    fetchData('initial');
    const id = window.setInterval(() => fetchData('poll'), 5000);
    return () => window.clearInterval(id);
  }, [fetchData]);

  const filtered = useMemo(() => {
    const term = q.trim().toUpperCase();
    let res = items;
    if (onlyEC) res = res.filter(n => String(n.adTipoDeEntrega ?? '').toUpperCase() === 'EC');
    if (onlyRL) res = res.filter(n => String(n.adTipoDeEntrega ?? '').toUpperCase() === 'RL');
    if (onlyEI) res = res.filter(n => String(n.adTipoDeEntrega ?? '').toUpperCase() === 'EI');
    
    if (term) {
        res = res.filter(n => {
            const hay = [n.nunota, n.ordemLinha, n.parceiro, n.vendedor, n.statusNotaDesc].join(' ').toUpperCase();
            return hay.includes(term);
        });
    }
    return res;
  }, [items, q, onlyEC, onlyRL, onlyEI]);

  const orderByTipoMap = useMemo(() => {
    const counters: Record<string, number> = {};
    const m = new Map<number, number>();
    for (const n of filtered) {
      let tipo = (n.codtipoper === 322) ? String(n.codtipoper) : String(n.adTipoDeEntrega ?? '-').toUpperCase();
      counters[tipo] = (counters[tipo] ?? 0) + 1;
      m.set(n.nunota, counters[tipo]);
    }
    return m;
  }, [filtered]);

  // Fullscreen & Scaling Logic (Expedição)
  const updateViewport = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  useEffect(() => {
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    return () => {
        window.removeEventListener('resize', updateViewport);
        window.removeEventListener('orientationchange', updateViewport);
    };
  }, [updateViewport]);

  useEffect(() => {
    const onFsChange = () => {
        const fs = !!document.fullscreenElement;
        setFullScreen(fs);
        if (typeof window !== 'undefined') setTimeout(() => updateViewport(), 0);
        if (!fs) setRotation(90);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    // @ts-ignore
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => { document.removeEventListener('fullscreenchange', onFsChange); 
    // @ts-ignore
    document.removeEventListener('webkitfullscreenchange', onFsChange); };
  }, [updateViewport]);

  const enterFullscreenWithRotation = useCallback(async (deg: 90 | -90) => {
    const el = tableWrapRef.current as any;
    if (!el) return;
    try {
        setRotation(deg);
        if (!document.fullscreenElement) {
            if (el.requestFullscreen) await el.requestFullscreen();
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        }
        setTimeout(() => updateViewport(), 0);
        try { 
            // @ts-ignore
            if (screen?.orientation?.lock) await screen.orientation.lock('landscape'); 
        } catch {}
    } catch (e: any) { setErro(e.message); }
  }, [updateViewport]);

  const exitFullscreen = useCallback(async () => {
    try {
        if (!document.fullscreenElement) return;
        if (document.exitFullscreen) await document.exitFullscreen();
        // @ts-ignore
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        try { 
            // @ts-ignore
            if (screen?.orientation?.unlock) screen.orientation.unlock(); 
        } catch {}
    } catch {}
  }, []);

  const stageW = fullScreen ? (vp.w || (typeof window !== 'undefined' ? window.innerWidth : 0)) : 0;
  const stageH = fullScreen ? (vp.h || (typeof window !== 'undefined' ? window.innerHeight : 0)) : 0;
  const rotW = fullScreen ? stageH : 0;
  const rotH = fullScreen ? stageW : 0;

  useLayoutEffect(() => {
    if (!fullScreen) { setScale(1); return; }
    const el = contentRef.current;
    if (!el) return;
    const calc = () => {
        const contentW = el.scrollWidth || el.offsetWidth || 1;
        const availW = Math.max(1, rotW - 16);
        let next = availW / contentW;
        next = Math.max(0.35, Math.min(2.2, next));
        setScale((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
    };
    calc();
    const ro = new ResizeObserver(() => calc());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullScreen, rotation, rotW, rotH, filtered.length]);

  const cellTextSx = { fontWeight: 400, color: 'inherit', lineHeight: 1.05, fontSize: '1.15em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'normal', wordBreak: 'break-word' } as const;

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflowY: 'auto', p: { xs: 2, sm: 3 }, backgroundColor: '#f0f2f5' }}>
      <Card sx={{ maxWidth: '100%', mx: 'auto', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
           <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, gap: 2 }}>
             <Box>
               <Typography variant="h6" fontWeight="bold" color="primary.main" gutterBottom>
                 Expedição TV
               </Typography>
                <Typography variant="body2" color="text.secondary">Total: {filtered.length} {loadingRefresh ? ' • atualizando…' : ''}</Typography>
             </Box>
             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button variant="outlined" onClick={() => fetchData('manual')} disabled={loading || loadingRefresh} sx={{ borderRadius: 2 }}>{loading || loadingRefresh ? <CircularProgress size={18} /> : 'Atualizar'}</Button>
                <Button variant="outlined" sx={{ borderRadius: 2 }} onClick={() => enterFullscreenWithRotation(90)}>Girar Dir</Button>
                <Button variant="outlined" sx={{ borderRadius: 2 }} onClick={() => enterFullscreenWithRotation(-90)}>Girar Esq</Button>
                {fullScreen && <Button variant="contained" color="error" onClick={exitFullscreen} sx={{ borderRadius: 2 }}>Sair</Button>}
             </Box>
           </Box>

           <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto' }, gap: 2, mb: 3, alignItems: 'center' }}>
             <TextField label="Buscar (nunota, parceiro, vendedor...)" value={q} onChange={(e) => setQ(e.target.value)} size="small" variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip label="EI" color={onlyEI ? 'success' : 'default'} variant={onlyEI ? 'filled' : 'outlined'} onClick={() => { setOnlyEI(!onlyEI); setOnlyEC(false); setOnlyRL(false); }} />
                <Chip label="RL" color={onlyRL ? 'warning' : 'default'} variant={onlyRL ? 'filled' : 'outlined'} onClick={() => { setOnlyRL(!onlyRL); setOnlyEI(false); setOnlyEC(false); }} />
                <Chip label="EC" color={onlyEC ? 'error' : 'default'} variant={onlyEC ? 'filled' : 'outlined'} onClick={() => { setOnlyEC(!onlyEC); setOnlyEI(false); setOnlyRL(false); }} />
                <Chip label="Limpar" variant="outlined" onClick={() => { setQ(''); setOnlyEC(false); setOnlyRL(false); setOnlyEI(false); }} />
             </Box>
           </Box>

           {erro && <Typography color="error" sx={{ mb: 2 }}>{erro}</Typography>}

           {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}><CircularProgress /></Box> : (
             <TableContainer component={Paper} elevation={0} ref={tableWrapRef} sx={{
                 overflow: 'hidden', backgroundColor: 'background.paper',
                 border: fullScreen ? 'none' : (t) => `1px solid ${t.palette.divider}`, borderRadius: fullScreen ? 0 : 3,
                 '&:fullscreen': { width: '100vw !important', height: '100vh !important', margin: 0, borderRadius: 0 },
                 // @ts-ignore
                 '&:-webkit-full-screen': { width: '100vw !important', height: '100vh !important', margin: 0, borderRadius: 0 }
             }}>
                 <Box sx={fullScreen ? { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' } : { width: '100%', overflowX: 'auto' }}>
                    <Box sx={fullScreen ? {
                        position: 'absolute', top: '50%', left: '50%', width: rotW ? `${rotW}px` : '100%', height: rotH ? `${rotH}px` : '100%',
                        transform: `translate(-50%, -50%) rotate(${rotation}deg)`, transformOrigin: 'center', overflow: 'auto', backgroundColor: 'background.paper'
                    } : {}}>
                         {fullScreen ? (
                            <Box sx={{ width: '100%', height: '100%', overflow: 'auto', p: 1 }}>
                               <Box ref={contentRef} sx={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 'fit-content' }}>
                                  <ExpedicaoTable filtered={filtered} safeNum={safeNum} safeStr={safeStr} orderByTipoMap={orderByTipoMap} tempoEmSeparacao={tempoEmSeparacao} nowMs={nowMs} cellTextSx={cellTextSx} />
                               </Box>
                            </Box>
                         ) : (
                            <ExpedicaoTable filtered={filtered} safeNum={safeNum} safeStr={safeStr} orderByTipoMap={orderByTipoMap} tempoEmSeparacao={tempoEmSeparacao} nowMs={nowMs} cellTextSx={cellTextSx} />
                         )}
                    </Box>
                 </Box>
             </TableContainer>
           )}
        </CardContent>
      </Card>
    </Box>
  );
}

function ExpedicaoTable({ filtered, safeNum, safeStr, orderByTipoMap, tempoEmSeparacao, nowMs, cellTextSx }: any) {
    return (
        <Table size="small" stickyHeader sx={{ minWidth: 1500, '& th, & td': { fontSize: '28px', fontWeight: 400, py: 1.6, whiteSpace: 'normal', verticalAlign: 'top' } }}>
            <TableHead>
               <TableRow sx={{ '& th': { backgroundColor: '#f9fafb', color: '#444', fontWeight: 600, py: 1.5, borderBottom: '2px solid rgba(0,0,0,0.05)' } }}>
                  <TableCell>#</TableCell><TableCell>NUNOTA</TableCell><TableCell>Parceiro</TableCell><TableCell>Vendedor</TableCell>
                  <TableCell>Status Nota</TableCell><TableCell>Tempo Sep.</TableCell><TableCell>DTNEG</TableCell>
               </TableRow>
            </TableHead>
            <TableBody>
                {filtered.map((n: NotaExpedicaoRow) => (
                    <TableRow key={String(n.nunota)} sx={{ backgroundColor: n.bkcolor || '#FFFFFF', '& td': { color: n.fgcolor || '#000000' }, '&:hover': { filter: 'brightness(0.97)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' } }}>
                        <TableCell><Typography sx={{...cellTextSx, fontWeight: 'bold', opacity: 0.7}}>{safeStr(orderByTipoMap.get(n.nunota) ?? '-')}</Typography></TableCell>
                        <TableCell><Typography sx={{...cellTextSx, fontWeight: 600}}>{safeStr(n.nunota)}</Typography></TableCell>
                        <TableCell><Typography sx={cellTextSx}>{safeStr(n.parceiro)}</Typography></TableCell>
                        <TableCell><Typography sx={cellTextSx}>{safeStr(n.vendedor)}</Typography></TableCell>
                        <TableCell><Typography sx={cellTextSx}>{safeStr(n.statusNotaDesc)}</Typography></TableCell>
                        <TableCell><Typography sx={cellTextSx}>{tempoEmSeparacao(n.dtneg, n.hrneg, nowMs)}</Typography></TableCell>
                        <TableCell><Typography sx={cellTextSx}>{toDateBR(n.dtneg)} {safeStr(n.hrneg)}</Typography></TableCell>
                    </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} align="center"><Box sx={{ py: 8, color: 'text.secondary' }}><Typography sx={{ fontWeight: 400, fontSize: '1.3em' }}>SEM CLIENTES EM ESPERA</Typography></Box></TableCell></TableRow>}
            </TableBody>
        </Table>
    );
}

// ============================================================================
// --- PÁGINA PRINCIPAL (Gerenciador de Abas & Sidebar) ---
// ============================================================================

export default function CombinedPage() {
  const [tab, setTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (event.type === 'keydown' && ((event as React.KeyboardEvent).key === 'Tab' || (event as React.KeyboardEvent).key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  const handleSidebarTabChange = (index: number) => {
    setTab(index);
    setDrawerOpen(false);
  };

  const menuItems = [
    { text: 'Fila de Cabos', index: 0 },
    { text: 'Notas Expedição TV', index: 1 },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f0f2f5' }}>
      <AppBar position="static" color="inherit" elevation={1} sx={{ backgroundColor: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: '-0.5px', color: '#333' }}>
            Painel Logística
          </Typography>
          <Tabs 
            value={tab} 
            onChange={handleTabChange} 
            indicatorColor="primary" 
            textColor="primary" 
            sx={{ display: { xs: 'none', md: 'flex' }, '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '1rem' } }}
          >
            <Tab label="Fila de Cabos" />
            <Tab label="Notas Expedição TV" />
          </Tabs>
        </Toolbar>
      </AppBar>

      <SidebarMenu
        open={drawerOpen}
        onClose={toggleDrawer}
        currentTab={tab}
        onTabChange={handleSidebarTabChange}
        menuItems={menuItems}
      />
      
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {tab === 0 && <FilaCabosTab />}
        {tab === 1 && <ExpedicaoTab />}
      </Box>
    </Box>
  );
}