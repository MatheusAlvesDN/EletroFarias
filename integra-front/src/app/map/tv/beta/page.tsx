'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import {
  Box,
  CircularProgress,
  Paper,
  Typography,
  Button,
  Snackbar,
  Alert,
  Chip,
  GlobalStyles,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Fade,
} from '@mui/material';

// --- ÍCONES (SVGs Otimizados) ---
const VolumeUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
);
const VolumeOffIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
);
const RefreshIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
);
const ScreenNormalIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
);
const ScreenRotateRightIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 4.84 18.29 0 12 0l-.66.03 3.81 3.81 1.33-1.32zm-6.25-.77c-.59-.59-1.54-.59-2.12 0L1.75 8.11c-.59.59-.59 1.54 0 2.12l12.02 12.02c.59.59 1.54.59 2.12 0l6.36-6.36c.59-.59.59-1.54 0-2.12L10.23 1.75zm4.6 19.44L2.81 9.17l6.36-6.36 12.02 12.02-6.36 6.36z"/></svg>
);
const ScreenRotateLeftIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'scaleX(-1)' }}><path d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 4.84 18.29 0 12 0l-.66.03 3.81 3.81 1.33-1.32zm-6.25-.77c-.59-.59-1.54-.59-2.12 0L1.75 8.11c-.59.59-.59 1.54 0 2.12l12.02 12.02c.59.59 1.54.59 2.12 0l6.36-6.36c.59-.59.59-1.54 0-2.12L10.23 1.75zm4.6 19.44L2.81 9.17l6.36-6.36 12.02 12.02-6.36 6.36z"/></svg>
);
const ExitFullscreenIcon = () => (
   <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
);
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

// --- TIPOS ---

type NotaTV = {
  ordemLinha: number;
  bkcolor: string;
  fgcolor: string;

  nunota: number;
  numnota: number;
  codtipoper: number;
  descroper: string;

  dtneg: string;
  hrneg?: string | number | null;

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

  isGhost?: boolean;
  ghostUntil?: number; 
};

// --- CONFIGURAÇÕES ---

const POLL_MS = 5000;
const GHOST_TIME_MS = 15000; 

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

const timeKey = (n: NotaTV) => {
  const dt =
    parseDtHrToDate(n.dtneg, n.hrneg) ??
    parseDtHrToDate(toDateBR(n.dtneg), n.hrneg);
  return dt ? dt.getTime() : Number.POSITIVE_INFINITY;
};

const corPri = (n: NotaTV) => {
  if (n.isGhost) return 0;
  const s = String(n.bkcolor ?? '').trim().toUpperCase();
  if (s === '#2E7D32' || s.includes('46, 125, 50')) return 1;
  if (s === '#1976D2' || s.includes('25, 118, 210')) return 2;
  if (s === '#F9A825' || s.includes('249, 168, 37')) return 3;
  if (s === '#C62828' || s.includes('198, 40, 40')) return 4;
  return 9;
};

const stableHash = (list: NotaTV[]) =>
  JSON.stringify(
    list.map((x) => [
      x.nunota, x.ordemLinha, x.dtneg, x.hrneg, x.statusNota, x.statusConferenciaCod,
      x.qtdRegConferencia, x.bkcolor, x.fgcolor, x.vlrnota, x.adTipoDeEntrega, x.codvend, x.vendedor
    ])
  );

const corrigirTextoAudio = (nome: string) => {
  if (!nome) return '';
  let texto = nome.toUpperCase();
  const substituicoes: Record<string, string> = {
    ' LTDA': '', ' S/A': '', ' S.A.': '', ' ME ': '', ' EPP ': '', ' EIRELI': '',
    ' COM ': ' COMÉRCIO ', ' COMERCIO ': ' COMÉRCIO ', ' IND ': ' INDÚSTRIA ', ' INDUSTRIA ': ' INDÚSTRIA ',
    ' MERC ': ' MERCADO ', ' SUPERM ': ' SUPERMERCADO ', ' DIST ': ' DISTRIBUIDORA ', ' ATAC ': ' ATACADISTA ',
    ' PAGTO ': ' PAGAMENTO ', '&': ' E ', '@': ' ARROBA ', ' NFE': ' NOTA ', ' NF ': ' NOTA ', ' - ': ' ',
  };
  Object.keys(substituicoes).forEach((chave) => {
    texto = texto.split(chave).join(substituicoes[chave]);
  });
  texto = texto.replace(/[^A-Z0-9À-Ú ]/g, ' ');
  texto = texto.replace(/\s+/g, ' ').trim();
  return texto.toLowerCase();
};

// --- TEMA ---
const THEME = {
  bgMain: '#eef2f6', // Azul acinzentado suave
  glass: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  headerText: '#1565c0',
};

// --- COMPONENTE PRINCIPAL ---

export default function ExpedicaoPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [items, setItems] = useState<NotaTV[]>([]);
  const [ghosts, setGhosts] = useState<NotaTV[]>([]);
  const [filtered, setFiltered] = useState<NotaTV[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [onlyEC, setOnlyEC] = useState(false);
  const [onlyRL, setOnlyRL] = useState(false);
  const [onlyEI, setOnlyEI] = useState(false);

  const [fullScreen, setFullScreen] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | -90>(0);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  
  const [token, setToken] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const lastHashRef = useRef<string>('');
  const aliveRef = useRef(true);
  
  const prevItemsMapRef = useRef<Map<number, NotaTV>>(new Map());
  const isFirstLoadRef = useRef(true);

  // --- ÁUDIO STATE & REFS ---
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioEnabledRef = useRef(true);
  const availableVoicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        availableVoicesRef.current = voices;
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
    if (!audioEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [audioEnabled]);

  const speak = useCallback((text: string) => {
    if (!audioEnabledRef.current) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = availableVoicesRef.current.length > 0 ? availableVoicesRef.current : window.speechSynthesis.getVoices();
    const ptVoices = voices.filter(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'));
    const bestVoice = ptVoices.find(v => v.name.includes('Google')) || ptVoices.find(v => v.name.includes('Luciana')) || ptVoices[0];
    if (bestVoice) utterance.voice = bestVoice;
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }, []);

  // --- DATA & EFFECTS ---

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    setToken(t);
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setGhosts((prev) => {
        const now = Date.now();
        const valid = prev.filter(g => (g.ghostUntil || 0) > now);
        return valid.length !== prev.length ? valid : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);
  const LIST_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getNotasLoja` : `/sync/getNotasLoja`), [API_BASE]);

  const fetchData = useCallback(
    async (mode: 'initial' | 'poll' | 'manual' = 'poll') => {
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
        if (!resp.ok) throw new Error(`Falha API: ${resp.status}`);

        const data = (await resp.json()) as any[] | null;
        const rawList = Array.isArray(data) ? data : [];

        const list: NotaTV[] = rawList.map((r: any) => ({
            ordemLinha: safeNum(r.ordemLinha ?? r.ORDEM_LINHA ?? r.ORDEM_TIPO ?? 0),
            bkcolor: r.bkcolor ?? r.BKCOLOR ?? '#FFFFFF',
            fgcolor: r.fgcolor ?? r.FGCOLOR ?? '#000000',
            nunota: safeNum(r.nunota ?? r.NUNOTA),
            numnota: safeNum(r.numnota ?? r.NUMNOTA),
            codtipoper: safeNum(r.codtipoper ?? r.CODTIPOPER),
            descroper: String(r.descroper ?? r.DESCROPER ?? ''),
            dtneg: String(r.dtneg ?? r.DTNEG ?? ''),
            hrneg: r.hrneg ?? r.HRNEG ?? r.hrNeg ?? null,
            codparc: safeNum(r.codparc ?? r.CODPARC),
            parceiro: String(r.parceiro ?? r.PARCEIRO ?? ''),
            vlrnota: safeNum(r.vlrnota ?? r.VLRNOTA),
            codvend: safeNum(r.codvend ?? r.CODVEND),
            vendedor: String(r.vendedor ?? r.VENDEDOR ?? ''),
            adTipoDeEntrega: r.adTipoDeEntrega ?? r.AD_TIPODEENTREGA ?? null,
            tipoEntrega: String(r.tipoEntrega ?? r.TIPO_ENTREGA ?? ''),
            statusNota: String(r.statusNota ?? r.STATUS_NOTA ?? ''),
            statusNotaDesc: String(r.statusNotaDesc ?? r.STATUS_NOTA_DESC ?? ''),
            libconf: (r.libconf ?? r.LIBCONF ?? null) as any,
            statusConferenciaCod: (r.statusConferenciaCod ?? r.STATUS_CONFERENCIA_COD ?? null) as any,
            statusConferenciaDesc: (r.statusConferenciaDesc ?? r.STATUS_CONFERENCIA_DESC ?? null) as any,
            qtdRegConferencia: safeNum(r.qtdRegConferencia ?? r.QTD_REG_CONFERENCIA),
        }));

        const sorted = [...list].sort((a, b) => safeNum(a.nunota) - safeNum(b.nunota));
        const newHash = stableHash(sorted);

        if (newHash !== lastHashRef.current) {
            // GHOST DETECTION LOGIC
            if (!isFirstLoadRef.current) {
                const currentIds = new Set(sorted.map(i => i.nunota));
                const missingItems: NotaTV[] = [];
                prevItemsMapRef.current.forEach((oldItem, nunota) => {
                    if (!currentIds.has(nunota)) missingItems.push(oldItem);
                });

                if (missingItems.length > 0) {
                    const isSuspicious = prevItemsMapRef.current.size > 5 && missingItems.length === prevItemsMapRef.current.size;
                    if (!isSuspicious) {
                        const verifiedGhosts: NotaTV[] = [];
                        await Promise.all(missingItems.map(async (item) => {
                            try {
                                const checkUrl = API_BASE ? `${API_BASE}/sync/getNotaByNunota?nunota=${item.nunota}` : `/sync/getNotaByNunota?nunota=${item.nunota}`;
                                const res = await fetch(checkUrl, { method: 'GET', headers });
                                if (res.ok) {
                                    const data = await res.json();
                                    const nota = Array.isArray(data) ? data[0] : data;
                                    const pendente = nota?.pendente ?? nota?.PENDENTE;
                                    const stautsConferencia = nota?.statusConferencia ?? nota?.STATUS_CONFERENCIA;
                                    
                                    if (pendente?.toUpperCase() === 'N' && String(stautsConferencia).toUpperCase() === 'F') {
                                        if (audioEnabledRef.current) {
                                            const nomeFalado = corrigirTextoAudio(item.parceiro);
                                            speak(`Pedido de ${nomeFalado}, finalizado.`);
                                        }
                                        verifiedGhosts.push({
                                            ...item, isGhost: true, ghostUntil: Date.now() + GHOST_TIME_MS,
                                            bkcolor: '#00C853', fgcolor: '#ffffff', statusConferenciaDesc: 'FINALIZADO 🚀'
                                        });
                                    }
                                }
                            } catch (err) { console.error(`Erro ao verificar nota ${item.nunota}`, err); }
                        }));
                        if (verifiedGhosts.length > 0) {
                            setGhosts(prev => [...prev, ...verifiedGhosts]);
                            setSnackbarMsg(`✅ ${verifiedGhosts.length} pedido(s) finalizado(s).`);
                            setSnackbarOpen(true);
                        }
                    }
                }
            }
            const newMap = new Map<number, NotaTV>();
            sorted.forEach(i => newMap.set(i.nunota, i));
            prevItemsMapRef.current = newMap;
            lastHashRef.current = newHash;
            if (aliveRef.current) setItems(sorted);
        }
        isFirstLoadRef.current = false;
      } catch (e) { console.error(e); } finally {
        inFlightRef.current = false;
        setLoading(false);
        setLoadingRefresh(false);
      }
    },
    [LIST_URL, token, API_TOKEN, API_BASE, speak], 
  );

  useEffect(() => { fetchData('initial'); }, [fetchData]);
  useEffect(() => {
    const id = window.setInterval(() => fetchData('poll'), POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    const term = q.trim().toUpperCase();
    const apiIds = new Set(items.map(i => i.nunota));
    const activeGhosts = ghosts.filter(g => !apiIds.has(g.nunota));
    const combined = [...items, ...activeGhosts];

    const res = combined.filter((n) => {
      if (onlyEC && String(n.adTipoDeEntrega ?? '').toUpperCase() !== 'EC') return false;
      if (onlyRL && String(n.adTipoDeEntrega ?? '').toUpperCase() !== 'RL') return false;
      if (onlyEI && String(n.adTipoDeEntrega ?? '').toUpperCase() !== 'EI') return false;
      if (!term) return true;
      const hay = [n.nunota, n.numnota, n.parceiro, n.vendedor, n.statusNota, n.statusConferenciaDesc].map((x) => (x == null ? '' : String(x))).join(' ').toUpperCase();
      return hay.includes(term);
    });

    const sortedFiltered = [...res].sort((a, b) => {
      if (a.isGhost && !b.isGhost) return 1;
      if (!a.isGhost && b.isGhost) return -1;
      const pa = corPri(a);
      const pb = corPri(b);
      if (pa !== pb) return pa - pb;
      const ta = timeKey(a);
      const tb = timeKey(b);
      if (ta !== tb) return ta - tb;
      return safeNum(a.nunota) - safeNum(b.nunota);
    });

    setFiltered(sortedFiltered);
  }, [q, items, ghosts, onlyEC, onlyRL, onlyEI]);

  const orderByTipoMap = useMemo(() => {
    const counters: Record<string, number> = {};
    const m = new Map<number, number>();
    for (const n of filtered) {
      let tipo: string;
      if (n.codtipoper === 322) tipo = String(n.codtipoper);
      else tipo = String(n.adTipoDeEntrega ?? '-').toUpperCase();
      counters[tipo] = (counters[tipo] ?? 0) + 1;
      m.set(n.nunota, counters[tipo]);
    }
    return m;
  }, [filtered]);

  // Fullscreen Logic
  const updateViewport = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  useEffect(() => {
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, [updateViewport]);

  useEffect(() => {
    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setFullScreen(fs);
      if (!fs) setRotation(0);
      setTimeout(() => updateViewport(), 0);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
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
    if (!fullScreen || !contentRef.current) { setScale(1); return; }
    const calc = () => {
      const contentW = contentRef.current?.scrollWidth || 1;
      const w = Math.max(1, availW - 20);
      let next = w / contentW;
      next = Math.max(0.2, Math.min(2.0, next));
      setScale(next);
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, [fullScreen, rotation, availW, filtered.length]);

  if (!mounted) return <CircularProgress sx={{m: 'auto', display: 'block', mt: 10}} />;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: THEME.bgMain }}>
      <GlobalStyles styles={{
         '@keyframes pulse-ghost': {
           '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(0, 200, 83, 0.7)' },
           '70%': { transform: 'scale(1.02)', boxShadow: '0 0 0 20px rgba(0, 200, 83, 0)' },
           '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(0, 200, 83, 0)' },
         },
      }} />
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
                    <Typography variant="h5" sx={{ color: '#0d47a1', fontWeight: 800, letterSpacing: -0.5 }}>Expedição TV</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip label={`Fila: ${items.length}`} size="small" color="primary" sx={{ fontWeight: 700 }} />
                        {ghosts.length > 0 && <Chip label={`Saindo: ${ghosts.length}`} size="small" color="success" sx={{ fontWeight: 700 }} />}
                    </Box>
                  </Box>
               </Box>
               
               <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <TextField 
                    placeholder="Buscar nota, parceiro..." size="small" value={q} onChange={e => setQ(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, sx: { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' } }}
                    sx={{ '& fieldset': { border: 'none' }, minWidth: 200, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }} 
                  />
                  <Tooltip title={audioEnabled ? "Silenciar" : "Ativar Áudio"}>
                    <IconButton onClick={() => setAudioEnabled(!audioEnabled)} sx={{ bgcolor: audioEnabled ? '#e8f5e9' : '#ffebee', color: audioEnabled ? '#2e7d32' : '#c62828', border: '1px solid', borderColor: audioEnabled ? '#a5d6a7' : '#ef9a9a' }}>
                      {audioEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Atualizar">
                    <IconButton onClick={() => fetchData('manual')} sx={{ bgcolor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
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

            {erro && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{erro}</Alert>}
            
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
                    <Box width={120} sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Nº ÚNICO</Box>
                    <Box flex={1} sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>PARCEIRO / VENDEDOR</Box>
                    <Box width={300} sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>STATUS</Box>
                 </Box>

                 {filtered.map((n, idx) => {
                    const baseColor = n.isGhost ? '#00C853' : (n.bkcolor || '#ffffff');
                    const textColor = n.isGhost ? '#ffffff' : (n.fgcolor || '#1a1a1a');
                    
                    // Descrição do status
                    const confDesc = n.statusConferenciaDesc ? String(n.statusConferenciaDesc).trim() : '';
                    const isL = String(n.statusNota).trim().toUpperCase() === 'L';
                    const statusTexto = confDesc ? confDesc : (isL ? 'AGUARDANDO SEPARAÇÃO' : safeStr(n.statusNotaDesc || n.statusNota));

                    return (
                      <Fade in key={n.nunota} timeout={500}>
                        <Paper 
                          elevation={n.isGhost ? 8 : 3}
                          sx={{ 
                            position: 'relative', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'stretch',
                            background: n.isGhost ? '#00C853' : `linear-gradient(135deg, ${baseColor} 0%, ${baseColor} 70%, ${baseColor} 100%)`,
                            color: textColor, borderRadius: 3, overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: '1px solid rgba(0,0,0,0.05)',
                            animation: n.isGhost ? 'pulse-ghost 2s infinite' : 'none',
                            zIndex: n.isGhost ? 10 : 1,
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
                                 <Typography variant="h5" sx={{ fontWeight: 800 }}>{safeStr(orderByTipoMap.get(n.nunota) ?? '-')}</Typography>
                              </Box>

                              <DataColumn width={120} label="NUNOTA" value={safeNum(n.nunota)} />
                              
                              <Box sx={{ flex: 1, minWidth: { md: 200 }, width: '100%' }}>
                                 <Typography variant="caption" sx={{ color: n.isGhost ? 'white' : 'rgba(0,0,0,0.85)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>PARCEIRO</Typography>
                                 <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1, mt: 0.5 }}>{safeStr(n.parceiro)}</Typography>
                                 <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>{safeStr(n.vendedor)}</Typography>
                              </Box>

                              <Box sx={{ width: 300 }}>
                                <Box sx={{ 
                                    backgroundColor: 'rgba(0,0,0,0.1)', 
                                    borderRadius: 2, p: 1.5, textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)'
                                }}>
                                    <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        {statusTexto}
                                    </Typography>
                                    <Chip label={`Reg: ${safeNum(n.qtdRegConferencia)}`} size="small" sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit', fontWeight: 'bold' }} />
                                </Box>
                              </Box>
                           </Box>
                        </Paper>
                      </Fade>
                    );
                 })}
                 {filtered.length === 0 && (
                    <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'transparent', boxShadow: 'none' }}>
                       <Typography variant="h4" color="textSecondary" sx={{ opacity: 0.5 }}>AGUARDANDO PEDIDOS</Typography>
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

        <Snackbar open={snackbarOpen} autoHideDuration={3500} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSnackbarOpen(false)} severity="success" variant="filled" sx={{ width: '100%', fontSize: '1.5rem', fontWeight: 'bold', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>{snackbarMsg}</Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

const DataColumn = ({ label, value, sub, width, align='left', highlight=false }: any) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', width: width, minWidth: width, alignItems: align === 'right' ? 'flex-end' : 'flex-start', justifyContent: 'center' }}>
    <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', mb: 0.5 }}>{label}</Typography>
    <Typography variant="body1" sx={{ fontWeight: highlight ? 800 : 600, fontSize: highlight ? '1.2rem' : '1rem', lineHeight: 1.1, textAlign: align, color: 'inherit' }}>{value}</Typography>
    {sub && <Typography component="div" variant="caption" sx={{ opacity: 0.9, fontSize: '0.8rem', mt: 0.5, fontWeight: 500 }}>{sub}</Typography>}
  </Box>
);