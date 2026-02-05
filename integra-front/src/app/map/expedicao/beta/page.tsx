'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Snackbar,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Fade,
  InputAdornment,
  TextField,
} from '@mui/material';

// --- ÍCONES ---
const RefreshIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
);
const ScreenNormalIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
);
const ScreenRotateRightIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 4.84 18.29 0 12 0l-.66.03 3.81 3.81 1.33-1.32zm-6.25-.77c-.59-.59-1.54-.59-2.12 0L1.75 8.11c-.59.59-.59 1.54 0 2.12l12.02 12.02c.59.59 1.54.59 2.12 0l6.36-6.36c.59-.59.59-1.54 0-2.12L10.23 1.75zm4.6 19.44L2.81 9.17l6.36-6.36 12.02 12.02-6.36 6.36z"/></svg>
);
const ExitFullscreenIcon = () => (
   <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
);
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);
const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

// --- TIPOS ---
export interface NotaExpedicaoRow {
  nunota: number;
  ordemLinha: number;
  dtneg: string;
  hrneg: string;
  statusNota: string;
  statusNotaDesc: string; 
  statusConferenciaCod: string | null;
  qtdRegConferencia: number;
  bkcolor: string;
  fgcolor: string;
  vlrnota: number;
  adTipoDeEntrega: string | null;
  codvend: number;
  vendedor: string;
  codtipoper: number;
  parceiro: string;
}

// --- HELPERS ---
const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));
const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const normalizeHr = (hr: any) => {
  if (hr == null || hr === '') return null;
  const s = String(hr).trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(s)) return s.length === 5 ? `${s}:00` : s;
  const only = s.replace(/\D/g, '');
  if (only.length === 6) return `${only.slice(0, 2)}:${only.slice(2, 4)}:${only.slice(4, 6)}`;
  if (only.length === 4) return `${only.slice(0, 2)}:${only.slice(2, 4)}:00`;
  return null;
};

const parseDtHrToDate = (dtneg: string, hrneg: any): Date | null => {
  const hr = normalizeHr(hrneg) ?? '00:00:00';
  const d = String(dtneg ?? '').trim();
  if (!d) return null;
  const br = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) {
    const [, dd, mm, yyyy] = br;
    return new Date(`${yyyy}-${mm}-${dd}T${hr}`);
  }
  const m1 = d.match(/^(\d{2})(\d{2})(\d{4})/);
  if (m1) {
    const [, dd, mm, yyyy] = m1;
    return new Date(`${yyyy}-${mm}-${dd}T${hr}`);
  }
  const m2 = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) {
    const [, yyyy, mm, dd] = m2;
    return new Date(`${yyyy}-${mm}-${dd}T${hr}`);
  }
  return null;
};

const toDateBR = (v: string) => {
  if (!v) return '-';
  const s = String(v).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const m1 = s.match(/^(\d{2})(\d{2})(\d{4})(?:\s|$)/);
  if (m1) return `${m1[1]}/${m1[2]}/${m1[3]}`;
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return `${m2[3]}/${m2[2]}/${m2[1]}`;
  return s;
};

const formatElapsed = (ms: number): string => {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400); 
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  if (days > 0) return `${days}d ${hh}:${mm}:${ss}`;
  return `${hh}:${mm}:${ss}`;
};

const formatCurrency = (v: number) => {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const corPri = (bk: string | null | undefined) => {
  const s = String(bk ?? '').trim().toUpperCase();
  if (s.includes('#2E7D32') || s.includes('46, 125, 50')) return 1;
  if (s.includes('#1565C0') || s.includes('21, 76, 192')) return 2;
  if (s.includes('#F9A825') || s.includes('249, 168, 37')) return 3;
  if (s.includes('#C62828') || s.includes('198, 40, 40')) return 4;
  return 9;
};

const timeKey = (n: NotaExpedicaoRow) => {
  const dt =
    parseDtHrToDate(n.dtneg, n.hrneg) ??
    parseDtHrToDate(toDateBR(n.dtneg), n.hrneg);
  return dt ? dt.getTime() : Number.POSITIVE_INFINITY;
};

// --- TEMA ---
const THEME = {
  bgMain: '#eef2f6',
  glass: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  headerText: '#1565c0',
};

export default function ExpedicaoPage() {
  const [items, setItems] = useState<NotaExpedicaoRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRefresh, setLoadingRefresh] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [snack, setSnack] = useState<{ open: boolean; severity: 'success' | 'error' | 'info'; msg: string }>({
    open: false, severity: 'info', msg: '',
  });

  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      aliveRef.current = false;
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    setToken(t);
  }, []);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);
  const LIST_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getNotasExpedicao` : `/sync/getNotasExpedicao`), [API_BASE]);

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const fetchExpedicao = useCallback(
    async (mode: 'initial' | 'poll' | 'manual' = 'poll') => {
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
          method: 'GET', headers: getHeaders(), cache: 'no-store', signal: ac.signal,
        });
        if (!resp.ok) {
          const txt = await resp.text().catch(() => '');
          throw new Error(txt || `Falha ao buscar (status ${resp.status})`);
        }
        const data = await resp.json();
        const rawList = Array.isArray(data) ? data : [];
        
        const normalized: NotaExpedicaoRow[] = rawList.map((r: any) => ({
           nunota: safeNum(r.nunota ?? r.NUNOTA),
           ordemLinha: safeNum(r.ordemLinha ?? r.ORDEM_LINHA ?? 0),
           dtneg: String(r.dtneg ?? r.DTNEG ?? ''),
           hrneg: String(r.hrneg ?? r.HRNEG ?? r.hrNeg ?? ''),
           statusNota: String(r.statusNota ?? r.STATUS_NOTA ?? ''),
           statusNotaDesc: String(r.statusNotaDesc ?? r.STATUS_NOTA_DESC ?? ''),
           statusConferenciaCod: r.statusConferenciaCod ?? r.STATUS_CONFERENCIA_COD ?? null,
           qtdRegConferencia: safeNum(r.qtdRegConferencia ?? r.QTD_REG_CONFERENCIA),
           bkcolor: String(r.bkcolor ?? r.BKCOLOR ?? '#ffffff'),
           fgcolor: String(r.fgcolor ?? r.FGCOLOR ?? '#000000'),
           vlrnota: safeNum(r.vlrnota ?? r.VLRNOTA),
           adTipoDeEntrega: r.adTipoDeEntrega ?? r.AD_TIPODEENTREGA ?? null,
           codvend: safeNum(r.codvend ?? r.CODVEND),
           vendedor: String(r.vendedor ?? r.VENDEDOR ?? ''),
           codtipoper: safeNum(r.codtipoper ?? r.CODTIPOPER),
           parceiro: String(r.parceiro ?? r.PARCEIRO ?? ''),
        }));

        const ordered = [...normalized].sort((a, b) => {
          const pa = corPri(a.bkcolor);
          const pb = corPri(b.bkcolor);
          if (pa !== pb) return pa - pb;
          const ta = timeKey(a);
          const tb = timeKey(b);
          if (ta !== tb) return ta - tb;
          return a.nunota - b.nunota;
        });

        if (!aliveRef.current) return;
        setItems(ordered);
        if (mode === 'manual') {
          setSnack({ open: true, severity: 'success', msg: `Atualizado (${ordered.length} itens)` });
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        const msg = e?.message || 'Falha ao buscar';
        if (!aliveRef.current) return;
        setError(msg);
        setSnack({ open: true, severity: 'error', msg });
      } finally {
        inFlightRef.current = false;
        if (!aliveRef.current) return;
        setLoading(false);
        setLoadingRefresh(false);
      }
    },
    [LIST_URL, getHeaders],
  );

  useEffect(() => {
    fetchExpedicao('initial');
    const id = setInterval(() => fetchExpedicao('poll'), 5000);
    return () => clearInterval(id);
  }, [fetchExpedicao]);

  const filtered = useMemo(() => {
    const q = filter.trim().toUpperCase();
    if (!q) return items;
    return items.filter((r) => {
      const hay = [
        r.nunota, r.parceiro, r.vendedor, r.statusNotaDesc, r.vlrnota, r.adTipoDeEntrega
      ].map(x => safeStr(x)).join(' ').toUpperCase();
      return hay.includes(q);
    });
  }, [items, filter]);

  // Fullscreen
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | -90>(0);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const updateViewport = useCallback(() => setVp({ w: window.innerWidth, h: window.innerHeight }), []);

  useEffect(() => {
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
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
      setFullScreen(true);
    } catch (e) {}
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch (e) {}
    setFullScreen(false);
  }, []);

  const [scale, setScale] = useState(1);
  const availW = fullScreen ? (rotation === 0 ? vp.w : vp.h) : 0;
  const availH = fullScreen ? (rotation === 0 ? vp.h : vp.w) : 0;

  useLayoutEffect(() => {
    if (!fullScreen) { setScale(1); return; }
    const el = contentRef.current;
    if (!el) return;
    const calc = () => {
      const contentW = el.scrollWidth || el.offsetWidth || 1;
      const w = Math.max(1, availW - 20);
      let next = w / contentW;
      next = Math.max(0.2, Math.min(2.0, next));
      setScale(next);
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullScreen, rotation, availW, items.length]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: THEME.bgMain }}>
      <Box component="main" className="notranslate" sx={{ flexGrow: 1, height: '100vh', overflowY: 'auto', p: { xs: 1, md: 2 }, fontFamily: '"Roboto", sans-serif', background: `radial-gradient(circle at 50% -20%, #e3f2fd, ${THEME.bgMain})` }}>
        <Box 
          ref={tableWrapRef}
          sx={{
            minHeight: '100%',
            p: fullScreen ? 3 : 0,
            display: 'flex', flexDirection: 'column',
            ...(fullScreen && { position: 'fixed', inset: 0, zIndex: 9999, overflow: 'auto', bgcolor: '#f5f5f5' })
          }}
        >
          <Box
             ref={contentRef}
             sx={{
               transform: fullScreen && rotation !== 0 ? `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})` : `scale(${fullScreen ? scale : 1})`,
               transformOrigin: fullScreen && rotation !== 0 ? 'center' : 'top center',
               transition: 'transform 0.3s ease',
               ...(fullScreen && rotation !== 0 ? { position: 'absolute', top: '50%', left: '50%', width: availW, height: availH } : { width: '100%', maxWidth: '1400px', mx: 'auto' })
             }}
          >
            {/* HEADER GLASSMORPHISM */}
            {!fullScreen && (
            <Paper 
              elevation={0}
              sx={{ 
                display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 3, p: 2, borderRadius: 4,
                bgcolor: THEME.glass, backdropFilter: 'blur(10px)', border: `1px solid ${THEME.glassBorder}`, boxShadow: '0 4px 30px rgba(0, 0, 0, 0.05)', gap: 2
              }}
            >
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: 3, background: 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(21, 101, 192, 0.4)' }}>
                     <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/></svg>
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ color: '#0d47a1', fontWeight: 800, letterSpacing: -0.5 }}>Expedição</Typography>
                    <Typography variant="caption" sx={{ color: '#546e7a', fontWeight: 500 }}>Monitoramento de Notas</Typography>
                  </Box>
               </Box>
               
               <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <TextField 
                    placeholder="Buscar nota, parceiro..." size="small" value={filter} onChange={e => setFilter(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, sx: { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' } }}
                    sx={{ '& fieldset': { border: 'none' }, minWidth: 200, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }} 
                  />
                  <Tooltip title="Atualizar">
                    <IconButton onClick={() => fetchExpedicao('manual')} sx={{ bgcolor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                      {loadingRefresh ? <CircularProgress size={20} /> : <RefreshIcon />}
                    </IconButton>
                  </Tooltip>
                  <Box sx={{ height: 24, width: 1, bgcolor: '#cfd8dc', mx: 1 }} />
                  <Tooltip title="Tela Cheia"><IconButton onClick={() => enterFullscreen(0)} sx={{ bgcolor: '#37474f', color: 'white' }}><ScreenNormalIcon /></IconButton></Tooltip>
                  <Tooltip title="Girar 90°"><IconButton onClick={() => enterFullscreen(90)} sx={{ bgcolor: '#37474f', color: 'white' }}><ScreenRotateRightIcon /></IconButton></Tooltip>
               </Box>
            </Paper>
            )}

            {fullScreen && (
               <IconButton onClick={exitFullscreen} sx={{ position: 'absolute', top: 10, right: 10, bgcolor: '#ffebee', color: '#d32f2f' }}><ExitFullscreenIcon /></IconButton>
            )}

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
            
            {loading ? (
               <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 8 }}>
                 <CircularProgress color="primary" size={60} thickness={4} />
                 <Typography sx={{ mt: 2, color: '#666', fontWeight: 500 }}>Carregando notas...</Typography>
               </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                 {/* HEADER DA LISTA DESKTOP */}
                 <Box sx={{ display: { xs: 'none', md: 'flex' }, px: 3, py: 1, opacity: 0.6, color: '#37474f' }}>
                    <Box width={70} sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>ORDEM</Box>
                    <Box width={100} sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>NOTA</Box>
                    <Box flex={1} sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>PARCEIRO / VENDEDOR</Box>
                    <Box width={140} sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>STATUS</Box>
                    <Box width={140} sx={{ fontWeight: 'bold', fontSize: '0.85rem' }} textAlign="right">TEMPO ESPERA</Box>
                 </Box>

                 {filtered.map((r, idx) => {
                    const baseColor = r.bkcolor || '#ffffff';
                    const textColor = r.fgcolor || '#1a1a1a';
                    const tempoSep = (() => {
                        const dt = parseDtHrToDate(r.dtneg, r.hrneg) ?? parseDtHrToDate(toDateBR(r.dtneg), r.hrneg);
                        return dt ? formatElapsed(nowMs - dt.getTime()) : '--:--';
                    })();

                    return (
                      <Fade in key={r.nunota} timeout={500}>
                        <Paper 
                          elevation={3}
                          sx={{ 
                            position: 'relative', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'stretch',
                            background: `linear-gradient(135deg, ${baseColor} 0%, ${baseColor} 70%, ${baseColor} 100%)`,
                            color: textColor, borderRadius: 3, overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: '1px solid rgba(0,0,0,0.05)',
                            '&:hover': { transform: 'translateY(-2px) scale(1.005)', boxShadow: '0 12px 24px rgba(0,0,0,0.2)' }
                          }}
                        >
                           <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, p: 2, gap: 2, alignItems: 'center' }}>
                              <Box sx={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: { xs: '100%', md: 60 }, height: { xs: 40, md: 60 },
                                bgcolor: 'rgba(255,255,255,0.25)', borderRadius: '50%',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.4)'
                              }}>
                                 <Typography variant="h5" sx={{ fontWeight: 800 }}>{idx + 1}</Typography>
                              </Box>

                              <DataColumn width={100} label="NUNOTA" value={safeNum(r.nunota)} sub={r.adTipoDeEntrega || '-'} />
                              
                              <Box sx={{ flex: 1, minWidth: { md: 200 }, width: '100%' }}>
                                 <Typography variant="caption" sx={{ color: 'rgba(0,0,0,0.85)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>PARCEIRO</Typography>
                                 <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, mt: 0.5 }}>{safeStr(r.parceiro)}</Typography>
                                 <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>{safeStr(r.vendedor)}</Typography>
                              </Box>

                              <DataColumn width={140} label="STATUS" value={safeStr(r.statusNotaDesc)} 
                                sub={<Chip label={`Reg: ${safeNum(r.qtdRegConferencia)}`} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'rgba(0,0,0,0.1)' }} />} 
                              />

                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', minWidth: 140, bgcolor: 'rgba(255,255,255,0.2)', p: 1.5, borderRadius: 2 }}>
                                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                    <ClockIcon />
                                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ESPERA</Typography>
                                 </Box>
                                 <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -1, fontFamily: 'monospace' }}>
                                    {tempoSep}
                                 </Typography>
                                 <Typography variant="caption" sx={{ opacity: 0.7 }}>{toDateBR(r.dtneg)}</Typography>
                              </Box>
                           </Box>
                        </Paper>
                      </Fade>
                    );
                 })}
                 {filtered.length === 0 && (
                    <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'transparent', boxShadow: 'none' }}>
                       <Typography variant="h5" color="textSecondary" sx={{ opacity: 0.5 }}>Nenhuma nota na expedição.</Typography>
                    </Paper>
                 )}
              </Box>
            )}
            
            {!fullScreen && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 6, opacity: 0.5 }}>
                 <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#546e7a' }}>ELETRO FARIAS &copy; {new Date().getFullYear()}</Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 3, boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>{snack.msg}</Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

const DataColumn = ({ label, value, sub, width, align='left', highlight=false }: any) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', width: width, minWidth: width, alignItems: align === 'right' ? 'flex-end' : 'flex-start', justifyContent: 'center' }}>
    <Typography variant="caption" sx={{ color: 'rgba(0,0,0,0.85)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', mb: 0.5 }}>{label}</Typography>
    <Typography variant="body1" sx={{ fontWeight: highlight ? 800 : 600, fontSize: highlight ? '1.2rem' : '1rem', lineHeight: 1.1, textAlign: align, color: 'inherit' }}>{value}</Typography>
    {sub && <Typography component="div" variant="caption" sx={{ opacity: 0.8, fontSize: '0.8rem', mt: 0.5, fontWeight: 500 }}>{sub}</Typography>}
  </Box>
);