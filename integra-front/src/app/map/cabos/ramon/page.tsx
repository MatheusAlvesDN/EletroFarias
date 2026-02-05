'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Snackbar,
  TextField,
  Typography,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';

// --- ÍCONES ---
const VolumeUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
);
const VolumeOffIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
);
const PrinterIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
);
// Ícones de Rotação
const ScreenNormalIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
);
const ScreenRotateRightIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 4.84 18.29 0 12 0l-.66.03 3.81 3.81 1.33-1.32zm-6.25-.77c-.59-.59-1.54-.59-2.12 0L1.75 8.11c-.59.59-.59 1.54 0 2.12l12.02 12.02c.59.59 1.54.59 2.12 0l6.36-6.36c.59-.59.59-1.54 0-2.12L10.23 1.75zm4.6 19.44L2.81 9.17l6.36-6.36 12.02 12.02-6.36 6.36z"/></svg>
);
const ScreenRotateLeftIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'scaleX(-1)' }}><path d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 4.84 18.29 0 12 0l-.66.03 3.81 3.81 1.33-1.32zm-6.25-.77c-.59-.59-1.54-.59-2.12 0L1.75 8.11c-.59.59-.59 1.54 0 2.12l12.02 12.02c.59.59 1.54.59 2.12 0l6.36-6.36c.59-.59.59-1.54 0-2.12L10.23 1.75zm4.6 19.44L2.81 9.17l6.36-6.36 12.02 12.02-6.36 6.36z"/></svg>
);
const RefreshIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
);
const ExitFullscreenIcon = () => (
   <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
);

// --- TIPOS ---
type FilaCabosRow = {
  ordemLinha: number;
  bkcolor: string;
  fgcolor: string;
  ordemTipoPri: number;
  ordemTipo: number;
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

// --- HELPERS ---
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

const timeKey = (n: FilaCabosRow) => {
  const dt =
    parseDtHrToDate(n.dtalter, n.hralter) ??
    parseDtHrToDate(toDateBR(n.dtalter), n.hralter);
  return dt ? dt.getTime() : Number.POSITIVE_INFINITY;
};

const corPri = (bk: string | null | undefined) => {
  const s = String(bk ?? '').trim().toUpperCase();
  if (s.includes('#2E7D32') || s.includes('46, 125, 50')) return 1;
  if (s.includes('#1565C0') || s.includes('21, 76, 192')) return 2;
  if (s.includes('#F9A825') || s.includes('249, 168, 37')) return 3;
  if (s.includes('#C62828') || s.includes('198, 40, 40')) return 4;
  return 9;
};

// --- FUNÇÃO DE CORREÇÃO DE TEXTO ---
const corrigirTextoAudio = (texto: string) => {
  if (!texto) return '';
  let t = texto.toUpperCase();
  t = t.replace(/(\d+)\.(\d+)/g, '$1,$2');
  t = t.replace(/[^A-Z0-9À-Ú, \/]/g, ' ');
  const substituicoes: Record<string, string> = {
    'LTDA': '', 'S/A': '', 'S.A': '', 'ME': '', 'EPP': '',
    'EIRELI': '', 'COM': 'COMÉRCIO', 'IND': 'INDÚSTRIA',
    'MERC': 'MERCADO', 'DIST': 'DISTRIBUIDORA',
    'MM': 'MILÍMETROS', 'MT': 'METROS', 'MTS': 'METROS',
    'KG': 'QUILOS', 'UN': 'UNIDADES', 'PC': 'PEÇAS',
    'CAB': 'CABO', 'CABO': 'CABO', 'FLEX': 'FLEXÍVEL',
    'FLEXIVEL': 'FLEXÍVEL', 'PP': 'PÊ PÊ',
    'PT': 'PRETO', 'VM': 'VERMELHO', 'AZ': 'AZUL',
    'AM': 'AMARELO', 'BR': 'BRANCO', 'VD': 'VERDE',
    'V': 'VOUTIS', 'KV': 'MIL VOUTIS', '1KV': 'MIL VOUTIS',
    '750V': 'SETECENTOS E CINQUENTA VOUTIS',
    '&': 'E', '@': 'ARROBA'
  };
  Object.keys(substituicoes).forEach((chave) => {
    const chaveSafe = chave.replace(/[\.\/]/g, '\\$&');
    const regex = new RegExp(`\\b${chaveSafe}\\b`, 'g');
    t = t.replace(regex, ` ${substituicoes[chave]} `);
  });
  t = t.replace(/(\d+)V\b/g, '$1 VOUTIS');
  t = t.replace(/(\d+)KV\b/g, '$1 MIL VOUTIS');
  t = t.replace(/\s+/g, ' ').trim();
  return t.toLowerCase();
};

const genId = (r: FilaCabosRow) => `${safeNum(r.nunota)}-${safeNum(r.sequencia)}-${safeNum(r.codprod)}`;

// --- CORES DO TEMA ---
const THEME = {
  bgMain: '#ffffff',
  bgContainer: '#f0f2f5', // Fundo cinza claro neutro para o container
  headerText: '#1b5e20',
};

export default function FilaCabosPage() {
  const [rows, setRows] = useState<FilaCabosRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRefresh, setLoadingRefresh] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [snack, setSnack] = useState<{ open: boolean; severity: 'success' | 'error' | 'info'; msg: string }>({
    open: false,
    severity: 'info',
    msg: '',
  });
  
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const validRowsRef = useRef<FilaCabosRow[]>([]); 
  const speechIndexRef = useRef(0); 
  const audioEnabledRef = useRef(true); 
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null); 
  const availableVoicesRef = useRef<SpeechSynthesisVoice[]>([]);

  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

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
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      abortRef.current?.abort();
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    setToken(t);
  }, []);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getFilaCabos` : `/sync/getFilaCabos`), [API_BASE]);
  const PRINT_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/imprimirEtiquetaCabo` : `/sync/imprimirEtiquetaCabo`),
    [API_BASE],
  );

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  // --- LÓGICA DE ÁUDIO EM LOOP ---
  useEffect(() => {
    validRowsRef.current = rows.filter(r => String(r.impresso ?? '').trim().toUpperCase() !== 'S');
  }, [rows]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
    if (audioEnabled) {
      speakLoop();
    } else {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  }, [audioEnabled]);

  const speakLoop = useCallback(() => {
    if (!audioEnabledRef.current) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const playlist = validRowsRef.current;
    if (playlist.length === 0) {
      speechTimeoutRef.current = setTimeout(speakLoop, 3000);
      return;
    }
    if (speechIndexRef.current >= playlist.length) {
      speechIndexRef.current = 0;
    }
    const item = playlist[speechIndexRef.current];
    const prod = corrigirTextoAudio(item.descrprod);
    const qtd = safeNum(item.qtdneg).toLocaleString('pt-BR'); 
    const text = `Pendente, ${qtd} metros de ${prod}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = availableVoicesRef.current.length > 0 
        ? availableVoicesRef.current 
        : window.speechSynthesis.getVoices();
    const ptVoices = voices.filter(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'));
    const bestVoice = ptVoices.find(v => v.name.includes('Google')) 
                    || ptVoices.find(v => v.name.includes('Luciana'))
                    || ptVoices[0];
    if (bestVoice) {
        utterance.voice = bestVoice;
    }
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1; 
    utterance.pitch = 1.0; 
    utterance.onend = () => {
      if (!audioEnabledRef.current) return;
      speechIndexRef.current++;
      speechTimeoutRef.current = setTimeout(speakLoop, 3500);
    };
    utterance.onerror = () => {
      if (!audioEnabledRef.current) return;
      speechIndexRef.current++;
      speechTimeoutRef.current = setTimeout(speakLoop, 1000);
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  const fetchFilaCabos = useCallback(
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
          ...r,
          impresso: (r.impresso ?? r.IMPRESSO ?? r.Impresso ?? null) as any,
        }));
        const ordered = [...normalized].sort((a, b) => {
          const pa = corPri(a.bkcolor);
          const pb = corPri(b.bkcolor);
          if (pa !== pb) return pa - pb;
          const ta = timeKey(a);
          const tb = timeKey(b);
          if (ta !== tb) return ta - tb;
          const oa = safeNum(a.ordemLinha);
          const ob = safeNum(b.ordemLinha);
          if (oa !== ob) return oa - ob;
          return safeNum(a.nunota) - safeNum(b.nunota);
        });
        if (!aliveRef.current) return;
        setRows(ordered);
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
      const id = genId(r);
      m.set(id, counters[keyColor]);
    }
    return m;
  }, [filtered]);

  const imprimirEtiquetaCb = useCallback(
    async (row: FilaCabosRow) => {
      const id = genId(row);
      if (printingId) return;
      try {
        setPrintingId(id);
        setSnack({ open: true, severity: 'info', msg: 'Gerando PDF...' });
        const payload = {
          nunota: row.nunota, sequencia: row.sequencia, parceiro: row.parceiro,
          vendedor: row.vendedor, codprod: row.codprod, descrprod: row.descrprod, qtdneg: row.qtdneg,
        };
        const resp = await fetch(PRINT_URL, {
          method: 'POST', headers: getHeaders(), body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error(`Erro impressão: ${resp.status}`);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0';
        iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          const win = iframe.contentWindow;
          if (win) { win.focus(); win.print(); }
          setTimeout(() => { URL.revokeObjectURL(url); iframe.remove(); }, 60000);
        };
        setSnack({ open: true, severity: 'success', msg: 'Enviado para impressão' });
      } catch (e: any) {
        setSnack({ open: true, severity: 'error', msg: e?.message });
      } finally {
        setPrintingId(null);
      }
    },
    [PRINT_URL, getHeaders, printingId],
  );

  // Fullscreen
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | -90>(0);
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
    } catch (e) {}
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch (e) {}
  }, []);

  const [scale, setScale] = useState(1);
  const stageW = fullScreen ? (vp.w || (typeof window !== 'undefined' ? window.innerWidth : 0)) : 0;
  const stageH = fullScreen ? (vp.h || (typeof window !== 'undefined' ? window.innerHeight : 0)) : 0;
  const availW = fullScreen ? (rotation === 0 ? stageW : stageH) : 0;
  const availH = fullScreen ? (rotation === 0 ? stageH : stageW) : 0;

  useLayoutEffect(() => {
    if (!fullScreen) {
      setScale(1); return;
    }
    const el = contentRef.current;
    if (!el) return;
    const calc = () => {
      const contentW = el.scrollWidth || el.offsetWidth || 1;
      const contentH = el.scrollHeight || el.offsetHeight || 1;
      const pad = 10;
      const w = Math.max(1, availW - pad);
      const h = Math.max(1, availH - pad);
      let next = Math.min(w / contentW, h / contentH);
      next = Math.max(0.2, Math.min(2.0, next));
      setScale((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullScreen, rotation, availW, availH, filtered.length]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: THEME.bgMain }}>
      <Box
        component="main"
        className="notranslate"
        sx={{
          flexGrow: 1,
          height: '100vh',
          overflowY: 'auto',
          p: { xs: 1, sm: 2 },
          fontFamily: 'sans-serif',
        }}
      >
        <Box 
          ref={tableWrapRef}
          sx={{
            bgcolor: THEME.bgContainer,
            minHeight: '100%',
            p: 2,
            borderRadius: fullScreen ? 0 : 3,
            display: 'flex',
            flexDirection: 'column',
            ...(fullScreen && {
              position: 'fixed', inset: 0, zIndex: 9999, overflow: 'auto'
            })
          }}
        >
          {/* CONTENT WRAPPER FOR SCALING */}
          <Box
             ref={contentRef}
             sx={{
               transform: fullScreen && rotation !== 0 ? `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})` : `scale(${fullScreen ? scale : 1})`,
               transformOrigin: fullScreen && rotation !== 0 ? 'center' : 'top center',
               ...(fullScreen && rotation !== 0 ? {
                 position: 'absolute', top: '50%', left: '50%', width: availW, height: availH
               } : {
                 width: '100%'
               })
             }}
          >
            {/* HEADER AREA */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
               <Typography variant="h4" sx={{ color: THEME.headerText, fontFamily: 'serif', fontWeight: 'bold' }}>
                  Fila de Cabos
               </Typography>
               
               <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField 
                    placeholder="Buscar..." 
                    size="small" 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)}
                    sx={{ bgcolor: 'white', borderRadius: 1, '& fieldset': { border: 'none' } }} 
                  />
                  <IconButton disabled onClick={() => setAudioEnabled(!audioEnabled)} sx={{ bgcolor: audioEnabled ? '#2e7d32' : 'white', color: audioEnabled ? 'white' : 'grey' }}>
                    {audioEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                  </IconButton>
                  <IconButton onClick={() => fetchFilaCabos('manual')} sx={{ bgcolor: 'white' }}>
                    {loadingRefresh ? <CircularProgress size={20} /> : <RefreshIcon />}
                  </IconButton>
                  
                  {/* BOTÕES DE TELA CHEIA E ROTAÇÃO */}
                  {fullScreen ? (
                     <IconButton onClick={exitFullscreen} sx={{ bgcolor: '#d32f2f', color: 'white', '&:hover': { bgcolor: '#b71c1c'} }}>
                        <ExitFullscreenIcon />
                     </IconButton>
                  ) : (
                    <>
                       <Tooltip title="Tela Cheia (Normal)">
                          <IconButton onClick={() => enterFullscreen(0)} sx={{ bgcolor: 'black', color: 'white', '&:hover': { bgcolor: '#333'} }}>
                             <ScreenNormalIcon />
                          </IconButton>
                       </Tooltip>
                       <Tooltip title="Girar Direita (90°)">
                          <IconButton onClick={() => enterFullscreen(90)} sx={{ bgcolor: 'black', color: 'white', '&:hover': { bgcolor: '#333'} }}>
                             <ScreenRotateRightIcon />
                          </IconButton>
                       </Tooltip>
                       <Tooltip title="Girar Esquerda (-90°)">
                          <IconButton onClick={() => enterFullscreen(-90)} sx={{ bgcolor: 'black', color: 'white', '&:hover': { bgcolor: '#333'} }}>
                             <ScreenRotateLeftIcon />
                          </IconButton>
                       </Tooltip>
                    </>
                  )}
               </Box>
            </Box>

            {/* ERROR */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            {/* LOADING */}
            {loading ? (
               <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                 <CircularProgress color="success" />
               </Box>
            ) : (
               <FilaCabosList 
                  rows={filtered} 
                  safeNum={safeNum} 
                  safeStr={safeStr} 
                  orderByColorMap={orderByColorMap} 
                  onPrint={imprimirEtiquetaCb} 
                  printingId={printingId} 
               />
            )}
            
            {/* FAKE FOOTER LOGOS */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4, opacity: 0.6 }}>
               <Box sx={{ bgcolor: '#777', color: 'white', px: 1, py: 0.5, borderRadius: 1, fontWeight: 'bold' }}>Lid.</Box>
               <Box sx={{ bgcolor: '#2e7d32', color: 'white', px: 1, py: 0.5, borderRadius: 1, fontWeight: 'bold' }}>DFarias</Box>
               <Box sx={{ color: '#2e7d32', fontWeight: 'bold' }}>ELETRO FARIAS</Box>
            </Box>
          </Box>
        </Box>

        <Snackbar
          open={snack.open}
          autoHideDuration={3000}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snack.severity}>{snack.msg}</Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

// --- COMPONENTES VISUAIS ---

const DataPill = ({ 
  children, 
  title, 
  flex, 
  width, 
  sub,
  color,
  textColor
}: { 
  children: React.ReactNode, 
  title?: string, 
  flex?: number, 
  width?: string | number,
  sub?: React.ReactNode,
  color?: string,
  textColor?: string
}) => (
  <Box 
    sx={{ 
      flex: flex, 
      width: width,
      minWidth: width,
      // Fundo semi-transparente escuro para destacar o conteúdo sobre a cor da linha
      backgroundColor: 'rgba(0,0,0, 0.12)', 
      color: textColor || 'inherit',
      borderRadius: 2, 
      p: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      border: '1px solid rgba(255,255,255,0.2)', // Borda sutil para efeito glass
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}
  >
    <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '1.2rem', lineHeight: 1.1 }}>
      {children}
    </Typography>
    {sub && (
      <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.85rem', mt: 0.5 }}>
        {sub}
      </Typography>
    )}
  </Box>
);

const HeaderLabel = ({ label, flex, width, align='center' }: any) => (
  <Box sx={{ flex, width, minWidth: width, textAlign: align, px: 1, fontWeight: 'bold', color: '#1b5e20', fontSize: '1.1rem' }}>
    {label}
  </Box>
);

function FilaCabosList({ rows, safeNum, safeStr, orderByColorMap, onPrint, printingId }: any) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      
      {/* HEADER ROW - HIDDEN ON MOBILE */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, px: 2, gap: 2 }}>
        <HeaderLabel width={60} label="Seq" />
        <HeaderLabel width={140} label="Pedido" />
        <HeaderLabel width={160} label="Parceiro" />
        <HeaderLabel flex={1} label="Produto" />
        <HeaderLabel width={100} label="Cod" />
        <HeaderLabel width={90} label="Quant." />
        <HeaderLabel width={90} label="Imprimir" />
      </Box>

      {rows.map((r: FilaCabosRow) => {
         const id = genId(r);
         const ordem = orderByColorMap.get(id) ?? safeNum(r.ordemLinha);
         const isPrinting = printingId === id;
         const isImpresso = String(r.impresso ?? '').trim().toUpperCase() === 'S';
         
         // Lógica de Cor: A LINHA recebe a cor da API (bkcolor).
         // Se impresso, fica cinza.
         const rowBg = isImpresso ? '#e0e0e0' : (r.bkcolor || '#ffffff');
         const rowFg = isImpresso ? '#757575' : (r.fgcolor || '#000000');

         return (
           <Paper 
             key={id} 
             elevation={2}
             sx={{ 
               display: 'flex', 
               flexDirection: { xs: 'column', md: 'row' },
               alignItems: 'stretch',
               bgcolor: rowBg, // Cor de fundo dinâmica
               color: rowFg,   // Cor de texto dinâmica
               p: 1.5, 
               borderRadius: 3,
               gap: { xs: 1, md: 2 },
               opacity: isImpresso ? 0.7 : 1,
               transition: 'all 0.2s ease'
             }}
           >
              {/* MOBILE LABEL */}
              <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'space-between', mb: 1 }}>
                 <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>#{ordem}</Typography>
                 <Typography variant="subtitle2">{safeStr(r.vendedor)}</Typography>
              </Box>

              {/* COLUMNS - Usando DataPill com fundo transparente escuro */}
              <DataPill width={60} textColor={rowFg}>
                 {ordem}
              </DataPill>

              <DataPill width={140} sub={`Seq: ${safeNum(r.sequencia)}`} textColor={rowFg}>
                 {safeNum(r.nunota)}
              </DataPill>

              <DataPill width={160} textColor={rowFg}>
                 {safeStr(r.parceiro).split(' ')[0]} 
              </DataPill>

              <DataPill flex={1} sub={safeStr(r.vendedor)} textColor={rowFg}>
                 {safeStr(r.descrprod)}
              </DataPill>

              <DataPill width={100} textColor={rowFg}>
                 {safeNum(r.codprod)}
              </DataPill>

              <DataPill width={90} textColor={rowFg}>
                 {safeNum(r.qtdneg)}
              </DataPill>

              <Box sx={{ width: { xs: '100%', md: 90 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Button 
                   onClick={() => onPrint(r)} 
                   disabled={isPrinting}
                   sx={{ 
                     minWidth: 0, 
                     p: 2, 
                     borderRadius: 3, 
                     border: `2px solid ${rowFg}`, 
                     color: rowFg,
                     bgcolor: 'transparent',
                     '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
                   }}
                 >
                   {isPrinting ? <CircularProgress size={24} sx={{ color: rowFg }} /> : <PrinterIcon />}
                 </Button>
              </Box>

           </Paper>
         );
      })}

      {rows.length === 0 && (
        <Typography textAlign="center" sx={{ mt: 4, color: '#558b2f' }}>Nenhum item na fila.</Typography>
      )}
    </Box>
  );
}