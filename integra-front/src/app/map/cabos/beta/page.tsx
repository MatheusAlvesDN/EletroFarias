'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Snackbar,
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
} from '@mui/material';

// Ícones para o botão de áudio
const VolumeUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
);
const VolumeOffIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
);

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

// --- HELPERS E CORREÇÃO DE TEXTO ---

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
// --- FUNÇÃO DE CORREÇÃO DE TEXTO (ATUALIZADA) ---
const corrigirTextoAudio = (texto: string) => {
  if (!texto) return '';

  let t = texto.toUpperCase();

  // 1. Tratamento para números decimais (2.5 -> 2,5)
  t = t.replace(/(\d+)\.(\d+)/g, '$1,$2');

  // 2. Remove caracteres especiais antes de processar as palavras
  // (Mantendo letras, números, espaços, vírgula e barras)
  t = t.replace(/[^A-Z0-9À-Ú, \/]/g, ' ');

  // 3. Dicionário de Substituições
  // IMPORTANTE: As chaves agora NÃO têm espaços em volta.
  const substituicoes: Record<string, string> = {
    'LTDA': '', 'S/A': '', 'S.A': '', 'ME': '', 'EPP': '',
    'EIRELI': '', 
    'COM': 'COMÉRCIO', 
    'IND': 'INDÚSTRIA',
    'MERC': 'MERCADO', 
    'DIST': 'DISTRIBUIDORA',
    
    // Unidades e Termos de Cabos
    'MM': 'MILÍMETROS',
    'MT': 'METROS',
    'MTS': 'METROS',
    'KG': 'QUILOS',
    'UN': 'UNIDADES',
    'PC': 'PEÇAS',
    'CAB': 'CABO',
    'CABO': 'CABO', 
    'FLEX': 'FLEXÍVEL',
    'FLEXIVEL': 'FLEXÍVEL',
    'PP': 'PÊ PÊ',

    // Cores (Agora funcionará mesmo no final da frase)
    'PT': 'PRETO',
    'VM': 'VERMELHO',
    'AZ': 'AZUL',
    'AM': 'AMARELO',
    'BR': 'BRANCO',
    'VD': 'VERDE',

    // Tensões e Símbolos
    'V': 'VOUTIS',
    'KV': 'MIL VOUTIS', 
    '1KV': 'MIL VOUTIS',
    '750V': 'SETECENTOS E CINQUENTA VOUTIS',
    '&': 'E',
    '@': 'ARROBA'
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
  
  // --- ÁUDIO STATES ---
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Lista de vozes disponíveis no navegador
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Refs para o loop de áudio
  const validRowsRef = useRef<FilaCabosRow[]>([]); 
  const speechIndexRef = useRef(0); 
  const audioEnabledRef = useRef(true); 
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null); 
  const availableVoicesRef = useRef<SpeechSynthesisVoice[]>([]); // Ref para acesso imediato no loop

  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  // --- CARREGAMENTO DE VOZES ---
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
    
    // O evento onvoiceschanged é disparado quando as vozes são carregadas (comum no Chrome)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // --- APLICAÇÃO DA LÓGICA DE CORREÇÃO AQUI ---
    const prod = corrigirTextoAudio(item.descrprod);
    const qtd = safeNum(item.qtdneg).toLocaleString('pt-BR'); 

    const text = `Pendente, ${qtd} metros de ${prod}.`;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // --- LÓGICA DE SELEÇÃO DE VOZ HUMANA ---
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
          setSnack({ open: true, severity: 'success', msg: `Fila Cabos atualizada (${ordered.length} linhas)` });
        }
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

  const counts = useMemo(() => {
    const itens = filtered.length;
    const pedidosUnicos = new Set(filtered.map((r) => r.nunota)).size;
    return { pedidosUnicos, itens };
  }, [filtered]);

  const CARD_SX = useMemo(
    () =>
      ({
        maxWidth: 1400,
        mx: 'auto',
        mt: 6,
        borderRadius: 2,
        boxShadow: 0,
        border: 1,
        backgroundColor: 'background.paper',
      } as const),
    [],
  );

  const imprimirEtiquetaCb = useCallback(
    async (row: FilaCabosRow) => {
      const id = genId(row);
      if (printingId) return;

      try {
        setPrintingId(id);
        setSnack({ open: true, severity: 'info', msg: 'Gerando PDF…' });

        const payload = {
          nunota: row.nunota,
          sequencia: row.sequencia,
          parceiro: row.parceiro,
          vendedor: row.vendedor,
          codprod: row.codprod,
          descrprod: row.descrprod,
          qtdneg: row.qtdneg,
        };

        const resp = await fetch(PRINT_URL, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          const txt = await resp.text().catch(() => '');
          throw new Error(txt || `Falha ao imprimir (status ${resp.status})`);
        }

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = url;
        document.body.appendChild(iframe);

        iframe.onload = () => {
          const win = iframe.contentWindow;
          if (!win) {
            URL.revokeObjectURL(url);
            iframe.remove();
            setSnack({ open: true, severity: 'error', msg: 'Não foi possível abrir o PDF para impressão.' });
            return;
          }
          win.focus();
          win.print();
          setTimeout(() => {
            URL.revokeObjectURL(url);
            iframe.remove();
          }, 180_000);
        };
        setSnack({ open: true, severity: 'success', msg: 'PDF aberto para impressão' });
      } catch (e: any) {
        setSnack({ open: true, severity: 'error', msg: e?.message || 'Erro ao imprimir etiqueta' });
      } finally {
        setPrintingId(null);
      }
    },
    [PRINT_URL, getHeaders, printingId],
  );

  // FULLSCREEN Logic
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
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Não foi possível ativar tela cheia.';
        setError(msg);
        setSnack({ open: true, severity: 'error', msg });
      }
    }, [updateViewport]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) return;
      if (document.exitFullscreen) await document.exitFullscreen();
      // @ts-ignore
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível sair da tela cheia.';
      setError(msg);
      setSnack({ open: true, severity: 'error', msg });
    }
  }, []);

  const [scale, setScale] = useState(1);
  const stageW = fullScreen ? (vp.w || (typeof window !== 'undefined' ? window.innerWidth : 0)) : 0;
  const stageH = fullScreen ? (vp.h || (typeof window !== 'undefined' ? window.innerHeight : 0)) : 0;
  const availW = fullScreen ? (rotation === 0 ? stageW : stageH) : 0;
  const availH = fullScreen ? (rotation === 0 ? stageH : stageW) : 0;

  useLayoutEffect(() => {
    if (!fullScreen) {
      setScale(1);
      return;
    }
    const el = contentRef.current;
    if (!el) return;
    const calc = () => {
      const contentW = el.scrollWidth || el.offsetWidth || 1;
      const contentH = el.scrollHeight || el.offsetHeight || 1;
      const pad = 16;
      const w = Math.max(1, availW - pad);
      const h = Math.max(1, availH - pad);
      let next = Math.min(w / contentW, h / contentH);
      const MAX_SCALE = 2.2;
      const MIN_SCALE = 0.28;
      next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
      setScale((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
    };
    calc();
    const ro = new ResizeObserver(() => calc());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullScreen, rotation, availW, availH, filtered.length]);

  const cellSx = useMemo(() => ({
    fontWeight: 400,
    lineHeight: 1.15,
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
  }), []);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Box
        component="main"
        className="notranslate" 
        sx={{
          flexGrow: 1,
          minHeight: 0,
          backgroundColor: '#f0f4f8',
          height: '100vh',
          overflowY: 'auto',
          p: { xs: 2, sm: 5 },
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          lineHeight: '1.8',
          color: '#333',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Card sx={CARD_SX}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                mb: 2,
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Fila de Cabos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fonte: GET <code>sync/getFilaCabos</code> • Itens: {filtered.length} (carregado: {rows.length})
                  {loadingRefresh ? ' • atualizando…' : ''}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                
                {/* BOTÃO DE ÁUDIO COM ESTADO */}
                <Button
                  variant={audioEnabled ? "contained" : "outlined"}
                  disabled
                  color={audioEnabled ? "secondary" : "inherit"}
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  startIcon={audioEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                >
                  {audioEnabled ? "Loop Áudio ON" : "Áudio Mudo"}
                </Button>

                <Chip label={`Pedidos: ${counts.pedidosUnicos}`} />
                <Chip label={`Itens: ${counts.itens}`} />

                <Button variant="outlined" onClick={() => fetchFilaCabos('manual')} disabled={loading || loadingRefresh}>
                  {loading || loadingRefresh ? <CircularProgress size={18} /> : 'Atualizar agora'}
                </Button>

                <Button variant={fullScreen && rotation === 0 ? 'contained' : 'outlined'} onClick={() => enterFullscreen(0)}>
                  Tela cheia
                </Button>
                <Button variant={fullScreen && rotation === -90 ? 'contained' : 'outlined'} onClick={() => enterFullscreen(-90)}>
                  Esq
                </Button>
                <Button variant={fullScreen && rotation === 90 ? 'contained' : 'outlined'} onClick={() => enterFullscreen(90)}>
                  Dir
                </Button>

                {fullScreen && (
                  <Button variant="outlined" onClick={exitFullscreen}>
                    Sair da tela cheia
                  </Button>
                )}
              </Box>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
                gap: 2,
                mb: 2,
                alignItems: 'center',
              }}
            >
              <TextField
                label="Buscar (pedido, parceiro, produto, vendedor...)"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                size="small"
              />
              <Box sx={{ justifySelf: { xs: 'start', md: 'end' } }}>
                {loadingRefresh && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">
                      Atualizando...
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Divider sx={{ my: 2 }} />

                <TableContainer
                  component={Paper}
                  elevation={0}
                  ref={tableWrapRef}
                  sx={{
                    overflow: 'hidden',
                    backgroundColor: 'background.paper',
                    maxWidth: '100%',
                    border: fullScreen ? 'none' : (t) => `1px solid ${t.palette.divider}`,
                    borderRadius: fullScreen ? 0 : 2,

                    '&:fullscreen': {
                      width: '100vw !important',
                      height: '100vh !important',
                      maxWidth: 'none !important',
                      maxHeight: 'none !important',
                      margin: '0 !important',
                      borderRadius: '0 !important',
                      outline: 'none',
                    },
                    // @ts-ignore
                    '&:-webkit-full-screen': {
                      width: '100vw !important',
                      height: '100vh !important',
                      maxWidth: 'none !important',
                      maxHeight: 'none !important',
                      margin: '0 !important',
                      borderRadius: '0 !important',
                      outline: 'none',
                    },
                  }}
                >
                  <Box
                    sx={
                      fullScreen
                        ? {
                            position: 'relative',
                            width: '100vw',
                            height: '100vh',
                            overflowX: 'hidden',
                            overflowY: 'auto',
                            WebkitOverflowScrolling: 'touch',
                          }
                        : {
                            width: '100%',
                            overflowX: 'hidden',
                            overflowY: 'auto',
                          }
                    }
                  >
                    <Box
                      sx={
                        fullScreen
                          ? rotation === 0
                            ? {
                                position: 'absolute',
                                inset: 0,
                                overflowX: 'hidden',
                                overflowY: 'auto',
                                backgroundColor: 'background.paper',
                              }
                            : {
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                width: `${availW}px`,
                                height: `${availH}px`,
                                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                                transformOrigin: 'center',
                                overflow: 'hidden',
                                backgroundColor: 'background.paper',
                              }
                          : {}
                      }
                    >
                      {fullScreen && rotation !== 0 ? (
                        <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', p: 1 }}>
                          <Box
                            ref={contentRef}
                            sx={{
                              transform: `scale(${scale})`,
                              transformOrigin: 'top left',
                              width: 'fit-content',
                            }}
                          >
                            <FilaCabosTable
                              filtered={filtered}
                              cellSx={cellSx}
                              safeNum={safeNum}
                              safeStr={safeStr}
                              orderByColorMap={orderByColorMap}
                              onPrint={imprimirEtiquetaCb}
                              printingId={printingId}
                              compact={true}
                            />
                          </Box>
                        </Box>
                      ) : (
                        <FilaCabosTable
                          filtered={filtered}
                          cellSx={cellSx}
                          safeNum={safeNum}
                          safeStr={safeStr}
                          orderByColorMap={orderByColorMap}
                          onPrint={imprimirEtiquetaCb}
                          printingId={printingId}
                          compact={fullScreen}
                        />
                      )}
                    </Box>
                  </Box>
                </TableContainer>
              </>
            )}
          </CardContent>
        </Card>

        <Snackbar
          open={snack.open}
          autoHideDuration={3500}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

function FilaCabosTable(props: {
  filtered: FilaCabosRow[];
  cellSx: any;
  safeNum: (v: any) => number;
  safeStr: (v: any) => string;
  orderByColorMap: Map<string, number>;
  onPrint: (row: FilaCabosRow) => void;
  printingId: string | null;
  compact?: boolean;
}) {
  const { filtered, cellSx, safeNum, safeStr, orderByColorMap, onPrint, printingId, compact = false } = props;

  const fontSize = compact ? 'clamp(13px, 1.5vw, 18x)' : '18px';
  const py = compact ? 0.6 : 0.9;

  const oneLineEllipsisSx = {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
    lineHeight: 1.15,
    fontWeight: 900,
  } as const;

  const getRowColors = (r: FilaCabosRow) => {
    const isImpresso = String(r.impresso ?? '').trim().toUpperCase() === 'S';
    const rowBg = isImpresso ? '#999999' : r.bkcolor || undefined;
    const rowFg = isImpresso ? '#000000' : r.fgcolor || undefined;
    return { isImpresso, rowBg, rowFg };
  };

  const MobileList = () => (
    <Box
      sx={{
        display: { xs: 'grid', md: 'none' },
        gap: 1,
        p: 1,
      }}
    >
      {filtered.map((r) => {
        const id = `${safeNum(r.nunota)}-${safeNum(r.sequencia)}-${safeNum(r.codprod)}`;
        const ordemCor = orderByColorMap.get(id) ?? safeNum(r.ordemLinha);
        const isPrinting = printingId === id;
        const { isImpresso, rowBg, rowFg } = getRowColors(r);

        return (
          <Paper
            key={id}
            elevation={0}
            sx={{
              p: 1,
              borderRadius: 2,
              border: (t) => `1px solid ${t.palette.divider}`,
              backgroundColor: rowBg,
              color: rowFg,
              opacity: isImpresso ? 0.92 : 0.98,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Tooltip
                  title={
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {`${safeStr(r.descrprod)}\nProd: ${safeNum(r.codprod)} • Grupo: ${safeNum(r.codgrupoprod)}${
                        isImpresso ? ' • IMPRESSO' : ''
                      }`}
                    </pre>
                  }
                  arrow
                  enterDelay={250}
                >
                  <Typography sx={{ fontSize, ...oneLineEllipsisSx }}>
                    {safeStr(r.descrprod)}
                  </Typography>
                </Tooltip>
                
                <Typography sx={{ fontSize, opacity: 0.9, ...oneLineEllipsisSx }}>
                  Vendedor: {safeStr(r.vendedor)}
                </Typography>

                 <Typography sx={{ fontSize, opacity: 0.95 }}>
                  Prod: {safeNum(r.codprod)} 
                  • Qtd: {safeNum(r.qtdneg).toLocaleString('pt-BR')}
                </Typography>

                <Typography sx={{ fontSize: '12px', opacity: 0.8, mt: 0.5 }}>
                  #{ordemCor} • Pedido: {safeNum(r.nunota)} • Seq: {safeNum(r.sequencia)}
                  {isImpresso ? ' • IMPRESSO' : ''}
                </Typography>
              </Box>

              <Box sx={{ flexShrink: 0 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => onPrint(r)}
                  disabled={isPrinting}
                  sx={{
                    fontWeight: 400,
                    minWidth: 92,
                    px: 1.25,
                    backgroundColor: '#000',
                    '&:hover': { backgroundColor: '#333' },
                    textTransform: 'none',
                  }}
                >
                  {isPrinting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Imprimir'}
                </Button>
              </Box>
            </Box>
          </Paper>
        );
      })}

      {filtered.length === 0 && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: (t) => `1px solid ${t.palette.divider}` }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Nenhum registro encontrado.
          </Typography>
        </Paper>
      )}
    </Box>
  );

  const DesktopTable = () => (
    <Table
      size="small"
      stickyHeader
      sx={{
        display: { xs: 'none', md: 'table' },
        width: '100%',
        tableLayout: 'fixed',
        '& th, & td': {
          fontSize,
          py,
          verticalAlign: 'top',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          fontWeight: 400,
        },
      }}
    >
      <TableHead>
        <TableRow sx={{ '& th': { backgroundColor: (t) => t.palette.grey[50], fontWeight: 400, whiteSpace: 'normal', lineHeight: 1.15 } }}>
          <TableCell sx={{ width: '6%' }}>#</TableCell>
          <TableCell sx={{ width: '10%' }}>Pedido</TableCell>
          <TableCell sx={{ width: '18%' }}>Parceiro</TableCell>
          <TableCell sx={{ width: '32%' }}>Produto</TableCell>
          <TableCell sx={{ width: '7%' }} align="right">Qtd</TableCell>
          <TableCell sx={{ width: '9%' }}>Vendedor</TableCell>
          <TableCell sx={{ width: '10%' }} align="center">Imprimir</TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {filtered.map((r) => {
          const id = `${safeNum(r.nunota)}-${safeNum(r.sequencia)}-${safeNum(r.codprod)}`;
          const ordemCor = orderByColorMap.get(id) ?? safeNum(r.ordemLinha);
          const isPrinting = printingId === id;
          const { isImpresso, rowBg, rowFg } = getRowColors(r);
          const produtoTooltip = `${safeStr(r.descrprod)}\nProd: ${safeNum(r.codprod)} • Grupo: ${safeNum(r.codgrupoprod)}${isImpresso ? ' • IMPRESSO' : ''}`;

          return (
            <TableRow
              key={id}
              sx={{
                backgroundColor: rowBg,
                '& td': { color: rowFg, borderColor: isImpresso ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)' },
                opacity: isImpresso ? 0.9 : 0.98,
                '&:hover': { filter: 'brightness(0.97)' },
              }}
            >
              <TableCell><Typography sx={cellSx}>{ordemCor}</Typography></TableCell>
              <TableCell>
                <Typography sx={{ fontWeight: 400, lineHeight: 1.15, fontSize }}>{safeNum(r.nunota)}</Typography>
                <Typography sx={{ opacity: 0.9, lineHeight: 1.15, fontSize: '12px' }}>Seq: {safeNum(r.sequencia)}</Typography>
              </TableCell>
              <TableCell>
                <Tooltip title={safeStr(r.parceiro)} arrow enterDelay={250}>
                  <Typography sx={{ ...oneLineEllipsisSx, fontSize }}>{safeStr(r.parceiro)}</Typography>
                </Tooltip>
                <Typography sx={{ opacity: 0.9, lineHeight: 1.15, fontSize: '12px' }}>Parc: {safeNum(r.codparc)}</Typography>
              </TableCell>
              <TableCell>
                <Tooltip title={<pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{produtoTooltip}</pre>} arrow enterDelay={250}>
                  <Box>
                    <Typography sx={{ ...oneLineEllipsisSx, fontSize }}>{safeStr(r.descrprod)}</Typography>
                    <Typography sx={{ opacity: 0.9, ...oneLineEllipsisSx, fontSize: '12px' }}>
                      Prod: {safeNum(r.codprod)} • Grupo: {safeNum(r.codgrupoprod)}
                      {isImpresso ? ' • IMPRESSO' : ''}
                    </Typography>
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="right" sx={{ fontSize }}>{safeNum(r.qtdneg).toLocaleString('pt-BR')}</TableCell>
              <TableCell>
                <Tooltip title={safeStr(r.vendedor)} arrow enterDelay={250}>
                  <Typography sx={{ ...oneLineEllipsisSx, fontSize }}>{safeStr(r.vendedor)}</Typography>
                </Tooltip>
              </TableCell>
              <TableCell align="center">
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => onPrint(r)}
                  disabled={isPrinting}
                  sx={{
                    fontWeight: 400,
                    minWidth: 100,
                    px: 1.5,
                    backgroundColor: '#000',
                    '&:hover': { backgroundColor: '#333' },
                    textTransform: 'none',
                  }}
                >
                  {isPrinting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Imprimir'}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
        {filtered.length === 0 && (
          <TableRow>
            <TableCell colSpan={7}>
              <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
                Nenhum registro encontrado.
              </Typography>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <>
      <MobileList />
      <DesktopTable />
    </>
  );
}