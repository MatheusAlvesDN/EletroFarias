'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
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
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';

export type NotaExpedicaoRow = {
  nunota: number;
  ordemLinha: number;

  dtneg: string;
  hrneg: string;

  statusNota: string;
  statusNotaDesc: string; // ✅ vem do backend

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
};

const POLL_MS = 5000;

const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));
const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

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

const stableHash = (list: NotaExpedicaoRow[]) =>
  JSON.stringify(
    list.map((x) => [
      x.nunota,
      x.ordemLinha,
      x.dtneg,
      x.hrneg,
      x.statusNota,
      x.statusNotaDesc,
      x.statusConferenciaCod,
      x.qtdRegConferencia,
      x.bkcolor,
      x.fgcolor,
      x.vlrnota,
      x.adTipoDeEntrega,
      x.codvend,
      x.vendedor,
      x.codtipoper,
      x.parceiro,
    ]),
  );

// ✅ prioridade por cor da linha: Verde -> Azul -> Amarelo -> Vermelho -> outros
const corPri = (bk: string | null | undefined) => {
  const s = String(bk ?? '').trim().toUpperCase();

  // verde
  if (
    s === '#2E7D32' ||
    s === '#388E3C' ||
    s.includes('46, 125, 50') ||
    s.includes('46,125,50') ||
    s.includes('56, 142, 60') ||
    s.includes('56,142,60')
  )
    return 1;

  // azul
  if (
    s === '#1976D2' ||
    s === '#1565C0' ||
    s === '#1E88E5' ||
    s.includes('25, 118, 210') ||
    s.includes('25,118,210') ||
    s.includes('21, 101, 192') ||
    s.includes('21,101,192') ||
    s.includes('30, 136, 229') ||
    s.includes('30,136,229')
  )
    return 2;

  // amarelo
  if (
    s === '#F9A825' ||
    s === '#FBC02D' ||
    s.includes('249, 168, 37') ||
    s.includes('249,168,37') ||
    s.includes('251, 192, 45') ||
    s.includes('251,192,45')
  )
    return 3;

  // vermelho
  if (
    s === '#C62828' ||
    s === '#D32F2F' ||
    s.includes('198, 40, 40') ||
    s.includes('198,40,40') ||
    s.includes('211, 47, 47') ||
    s.includes('211,47,47')
  )
    return 4;

  return 9;
};

// ✅ normaliza HRNEG para "HH:mm:ss"
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

// ✅ parse dtneg + hrneg para Date (local)
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

// ✅ chave de ordenação por tempo (mais antigo primeiro)
const timeKey = (n: NotaExpedicaoRow) => {
  const dt =
    parseDtHrToDate(n.dtneg, n.hrneg) ??
    parseDtHrToDate(toDateBR(n.dtneg), n.hrneg);

  return dt ? dt.getTime() : Number.POSITIVE_INFINITY;
};

const formatElapsed = (ms: number) => {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;

  const totalSec = Math.floor(ms / 1000);

  // ⚠️ mantida tua lógica original
  const hoursTotal = Math.floor(totalSec / 1800);

  const days = Math.floor(hoursTotal / 24);
  const remHours = hoursTotal % 24;
  const rem = totalSec % 1800;
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

export default function Page() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [items, setItems] = useState<NotaExpedicaoRow[]>([]);
  const [filtered, setFiltered] = useState<NotaExpedicaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // ✅ ticker 1s para atualizar o tempo na tela
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const [q, setQ] = useState('');
  const [onlyEC, setOnlyEC] = useState(false);
  const [onlyRL, setOnlyRL] = useState(false);
  const [onlyEI, setOnlyEI] = useState(false);

  const [fullScreen, setFullScreen] = useState(false);
  const [rotation, setRotation] = useState<90 | -90>(90);

  // ✅ viewport real
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

  const tableWrapRef = useRef<HTMLDivElement | null>(null);

  // ✅ SCALE dinâmico
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const [token, setToken] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const lastHashRef = useRef<string>('');
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    setToken(t);
  }, []);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getNotasExpedicao` : `/sync/getNotasExpedicao`),
    [API_BASE],
  );

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

        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha ao carregar notas (status ${resp.status})`);
        }

        const data = (await resp.json()) as any[] | null;
        const rawList = Array.isArray(data) ? data : [];

        const list: NotaExpedicaoRow[] = rawList.map((r: any) => {
          const hrneg = r.hrneg ?? r.HRNEG ?? r.hrNeg ?? r.HR_NEG ?? r.hr_neg ?? r.HRNEGO ?? '';
          const ordem =
            r.ordemLinha ??
            r.ORDEM_LINHA ??
            r.ORDEM_TIPO ??
            r.ordem_tipo ??
            r.ORDEM_GERAL ??
            r.ordem_geral ??
            0;

          const adTipo =
            r.adTipoDeEntrega ??
            r.AD_TIPODEENTREGA ??
            r.ad_tipodeentrega ??
            r.AD_TIPO_DE_ENTREGA ??
            r.ad_tipo_de_entrega ??
            null;

          return {
            nunota: safeNum(r.nunota ?? r.NUNOTA),
            ordemLinha: safeNum(ordem),

            dtneg: String(r.dtneg ?? r.DTNEG ?? ''),
            hrneg: String(hrneg ?? ''),

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

          const ta = timeKey(a);
          const tb = timeKey(b);
          if (ta !== tb) return ta - tb;

          const oa = safeNum(a.ordemLinha);
          const ob = safeNum(b.ordemLinha);
          if (oa !== ob) return oa - ob;

          return safeNum(a.nunota) - safeNum(b.nunota);
        });

        const newHash = stableHash(sorted);

        if (newHash !== lastHashRef.current) {
          lastHashRef.current = newHash;
          if (!aliveRef.current) return;
          setItems(sorted);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar notas.';
        setErro(msg);
        setSnackbarMsg(msg);
        setSnackbarOpen(true);
      } finally {
        inFlightRef.current = false;
        setLoading(false);
        setLoadingRefresh(false);
      }
    },
    [LIST_URL, token, API_TOKEN],
  );

  useEffect(() => {
    fetchData('initial');
  }, [fetchData]);

  useEffect(() => {
    const id = window.setInterval(() => fetchData('poll'), POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    const term = q.trim().toUpperCase();

    const res = items.filter((n) => {
      if (onlyEC && String(n.adTipoDeEntrega ?? '').toUpperCase() !== 'EC') return false;
      if (onlyRL && String(n.adTipoDeEntrega ?? '').toUpperCase() !== 'RL') return false;
      if (onlyEI && String(n.adTipoDeEntrega ?? '').toUpperCase() !== 'EI') return false;

      if (!term) return true;

      const hay = [
        n.nunota,
        n.ordemLinha,
        n.parceiro,
        n.vendedor,
        n.codvend,
        n.codtipoper,
        n.statusNota,
        n.statusNotaDesc,
        n.statusConferenciaCod,
        n.qtdRegConferencia,
        n.vlrnota,
        n.adTipoDeEntrega,
        n.dtneg,
        n.hrneg,
      ]
        .map((x) => (x == null ? '' : String(x)))
        .join(' ')
        .toUpperCase();

      return hay.includes(term);
    });

    const sortedFiltered = [...res].sort((a, b) => {
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

    setFiltered(sortedFiltered);
  }, [q, items, onlyEC, onlyRL, onlyEI]);

  // ✅ ordem por tipo de entrega (contagem reinicia por EI/RL/EC/...; e 322 separado)
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

  const cellTextSx = useMemo(
    () => ({
      fontWeight: 400,
      color: 'inherit',
      lineHeight: 1.05,
      fontSize: fullScreen ? '1.15em' : '1.15em',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
    }),
    [fullScreen],
  );

  useEffect(() => {
    const onFsChange = () => {
      setFullScreen(!!document.fullscreenElement);
      if (typeof window !== 'undefined') setTimeout(() => updateViewport(), 0);
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

  const enterFullscreenWithRotation = useCallback(
    async (deg: 90 | -90) => {
      const el = tableWrapRef.current as any;
      if (!el) return;

      try {
        setRotation(deg);

        if (document.fullscreenElement) return;

        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();

        setTimeout(() => updateViewport(), 0);

        try {
          // @ts-ignore
          if (screen?.orientation?.lock) {
            // @ts-ignore
            await screen.orientation.lock('landscape');
          }
        } catch {}
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Não foi possível ativar tela cheia.';
        setErro(msg);
        setSnackbarMsg(msg);
        setSnackbarOpen(true);
      }
    },
    [updateViewport],
  );

  const exitFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) return;

      if (document.exitFullscreen) await document.exitFullscreen();
      // @ts-ignore
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();

      try {
        // @ts-ignore
        if (screen?.orientation?.unlock) {
          // @ts-ignore
          screen.orientation.unlock();
        }
      } catch {}
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível sair da tela cheia.';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    }
  }, []);

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

  const stageW = fullScreen ? (vp.w || (typeof window !== 'undefined' ? window.innerWidth : 0)) : 0;
  const stageH = fullScreen ? (vp.h || (typeof window !== 'undefined' ? window.innerHeight : 0)) : 0;
  const rotW = fullScreen ? stageH : 0;
  const rotH = fullScreen ? stageW : 0;

  useLayoutEffect(() => {
    if (!fullScreen) {
      setScale(1);
      return;
    }

    const el = contentRef.current;
    if (!el) return;

    const calc = () => {
      const contentW = el.scrollWidth || el.offsetWidth || 1;
      const availW = Math.max(1, rotW - 16);

      let next = availW / contentW;

      const MAX_SCALE = 2.2;
      const MIN_SCALE = 0.35;

      next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
      setScale((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
    };

    calc();

    const ro = new ResizeObserver(() => calc());
    ro.observe(el);

    return () => ro.disconnect();
  }, [fullScreen, rotation, rotW, rotH, filtered.length]);

  if (!mounted) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: 0,
          backgroundColor: '#f0f4f8',
          height: '100vh',
          overflowY: 'auto',
          p: { xs: 2, sm: 5 },
          fontFamily: 'Arial, sans-serif',
          fontSize: '28px',
          fontWeight: 400,
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
                <Typography variant="h6" sx={{ fontWeight: 400, mb: 0.5 }}>
                  Notas TV (atualiza automaticamente)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
                  Total: {filtered.length} (carregado: {items.length})
                  {loadingRefresh ? ' • atualizando…' : ''}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Button variant="outlined" onClick={() => fetchData('manual')} disabled={loading || loadingRefresh}>
                  {loading || loadingRefresh ? <CircularProgress size={18} /> : 'Atualizar agora'}
                </Button>

                <Button
                  variant={fullScreen && rotation === 90 ? 'contained' : 'outlined'}
                  onClick={() => enterFullscreenWithRotation(90)}
                >
                  {fullScreen ? 'Girar Direita' : 'Tela cheia Direita'}
                </Button>

                <Button
                  variant={fullScreen && rotation === -90 ? 'contained' : 'outlined'}
                  onClick={() => enterFullscreenWithRotation(-90)}
                >
                  {fullScreen ? 'Girar Esquerda' : 'Tela cheia Esquerda'}
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
                label="Buscar (nunota, parceiro, vendedor, status, tipo entrega...)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                size="small"
              />

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  label="EI"
                  color={onlyEI ? 'success' : 'default'}
                  variant={onlyEI ? 'filled' : 'outlined'}
                  onClick={() => {
                    setOnlyEI((v) => !v);
                    setOnlyEC(false);
                    setOnlyRL(false);
                  }}
                />
                <Chip
                  label="RL"
                  color={onlyRL ? 'warning' : 'default'}
                  variant={onlyRL ? 'filled' : 'outlined'}
                  onClick={() => {
                    setOnlyRL((v) => !v);
                    setOnlyEI(false);
                    setOnlyEC(false);
                  }}
                />
                <Chip
                  label="EC"
                  color={onlyEC ? 'error' : 'default'}
                  variant={onlyEC ? 'filled' : 'outlined'}
                  onClick={() => {
                    setOnlyEC((v) => !v);
                    setOnlyEI(false);
                    setOnlyRL(false);
                  }}
                />
                <Chip
                  label="Limpar filtros"
                  variant="outlined"
                  onClick={() => {
                    setQ('');
                    setOnlyEC(false);
                    setOnlyRL(false);
                    setOnlyEI(false);
                  }}
                />
              </Box>
            </Box>

            {erro && (
              <Typography color="error" sx={{ mb: 2, fontWeight: 400 }}>
                {erro}
              </Typography>
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
                    width: fullScreen ? '100%' : 'auto',
                    height: fullScreen ? '100%' : 'auto',
                    '&:fullscreen': { outline: 'none', width: '100dvw', height: '100dvh' },
                    // @ts-ignore
                    '&:-webkit-full-screen': { outline: 'none', width: '100dvw', height: '100dvh' },
                  }}
                >
                  <Box
                    sx={
                      fullScreen
                        ? { position: 'relative', width: '100dvw', height: '100dvh', overflow: 'hidden' }
                        : { width: '100%', overflowX: 'auto' }
                    }
                  >
                    <Box
                      sx={
                        fullScreen
                          ? {
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              width: rotW ? `${rotW}px` : '100%',
                              height: rotH ? `${rotH}px` : '100%',
                              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                              transformOrigin: 'center',
                              overflow: 'auto',
                              WebkitOverflowScrolling: 'touch',
                              backgroundColor: 'background.paper',
                            }
                          : {}
                      }
                    >
                      {fullScreen ? (
                        <Box sx={{ width: '100%', height: '100%', overflow: 'auto', WebkitOverflowScrolling: 'touch', p: 1 }}>
                          <Box
                            ref={contentRef}
                            sx={{
                              transform: `scale(${scale})`,
                              transformOrigin: 'top left',
                              width: 'fit-content',
                            }}
                          >
                            <Table
                              size="small"
                              stickyHeader
                              aria-label="lista-notas-expedicao"
                              sx={{
                                minWidth: 0,
                                width: 'auto',
                                '& th, & td': {
                                  fontSize: 'clamp(22px, 2.6vw, 36px)',
                                  fontWeight: 400,
                                  py: 'clamp(12px, 1.4vh, 22px)',
                                  whiteSpace: 'normal',
                                  verticalAlign: 'top',
                                },
                              }}
                            >
                              <TableHead>
                                <TableRow
                                  sx={{
                                    '& th': {
                                      backgroundColor: (t) => t.palette.grey[50],
                                      fontWeight: 500,
                                    },
                                  }}
                                >
                                  <TableCell>#</TableCell>
                                  <TableCell>NUNOTA</TableCell>
                                  <TableCell>Parceiro</TableCell>
                                  <TableCell>Vendedor</TableCell>
                                  <TableCell>Status Nota</TableCell>
                                  <TableCell>Tempo Sep.</TableCell>
                                  <TableCell>DTNEG</TableCell>
                                </TableRow>
                              </TableHead>

                              <TableBody>
                                {filtered.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={7} align="center">
                                      <Typography sx={{ fontWeight: 400, fontSize: '1.3em' }}>
                                        SEM CLIENTES EM ESPERA
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  filtered.map((n) => {
                                    const bg = n.bkcolor || '#FFFFFF';
                                    const fg = n.fgcolor || '#000000';
                                    const tempoSep = tempoEmSeparacao(n.dtneg, n.hrneg, nowMs);

                                    return (
                                      <TableRow
                                        key={String(n.nunota)}
                                        sx={{
                                          backgroundColor: bg,
                                          '& td': { color: fg },
                                          '&:hover': { filter: 'brightness(0.97)' },
                                        }}
                                      >
                                        <TableCell>
                                          <Typography sx={cellTextSx}>
                                            {safeStr(orderByTipoMap.get(n.nunota) ?? '-')}
                                          </Typography>
                                        </TableCell>

                                        <TableCell>
                                          <Typography sx={cellTextSx}>{safeStr(n.nunota)}</Typography>
                                        </TableCell>

                                        <TableCell>
                                          <Typography sx={cellTextSx}>{safeStr(n.parceiro)}</Typography>
                                        </TableCell>

                                        <TableCell>
                                          <Typography sx={cellTextSx}>{safeStr(n.vendedor)}</Typography>
                                        </TableCell>

                                        <TableCell>
                                          <Typography sx={cellTextSx}>{safeStr(n.statusNotaDesc)}</Typography>
                                        </TableCell>

                                        <TableCell>
                                          <Typography sx={cellTextSx}>{tempoSep}</Typography>
                                        </TableCell>

                                        <TableCell>
                                          <Typography sx={cellTextSx}>
                                            {toDateBR(n.dtneg)} {safeStr(n.hrneg)}
                                          </Typography>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })
                                )}
                              </TableBody>
                            </Table>
                          </Box>
                        </Box>
                      ) : (
                        <Table
                          size="small"
                          stickyHeader
                          aria-label="lista-notas-expedicao"
                          sx={{
                            minWidth: 1500,
                            '& th, & td': {
                              fontSize: '28px',
                              fontWeight: 400,
                              py: 1.6,
                              whiteSpace: 'normal',
                              verticalAlign: 'top',
                            },
                          }}
                        >
                          <TableHead>
                            <TableRow
                              sx={{
                                '& th': {
                                  backgroundColor: (t) => t.palette.grey[50],
                                  fontWeight: 500,
                                },
                              }}
                            >
                              <TableCell>#</TableCell>
                              <TableCell>NUNOTA</TableCell>
                              <TableCell>Parceiro</TableCell>
                              <TableCell>Vendedor</TableCell>
                              <TableCell>Status Nota</TableCell>
                              <TableCell>Tempo Sep.</TableCell>
                              <TableCell>DTNEG</TableCell>
                            </TableRow>
                          </TableHead>

                          <TableBody>
                            {filtered.map((n) => {
                              const bg = n.bkcolor || '#FFFFFF';
                              const fg = n.fgcolor || '#000000';
                              const tempoSep = tempoEmSeparacao(n.dtneg, n.hrneg, nowMs);

                              return (
                                <TableRow
                                  key={String(n.nunota)}
                                  sx={{
                                    backgroundColor: bg,
                                    '& td': { color: fg },
                                    '&:hover': { filter: 'brightness(0.97)' },
                                  }}
                                >
                                  <TableCell>
                                    <Typography sx={cellTextSx}>
                                      {safeStr(orderByTipoMap.get(n.nunota) ?? '-')}
                                    </Typography>
                                  </TableCell>

                                  <TableCell>
                                    <Typography sx={cellTextSx}>{safeStr(n.nunota)}</Typography>
                                  </TableCell>

                                  <TableCell>
                                    <Typography sx={cellTextSx}>{safeStr(n.parceiro)}</Typography>
                                  </TableCell>

                                  <TableCell>
                                    <Typography sx={cellTextSx}>{safeStr(n.vendedor)}</Typography>
                                  </TableCell>

                                  <TableCell>
                                    <Typography sx={cellTextSx}>{safeStr(n.statusNotaDesc)}</Typography>
                                  </TableCell>

                                  <TableCell>
                                    <Typography sx={cellTextSx}>{tempoSep}</Typography>
                                  </TableCell>

                                  <TableCell>
                                    <Typography sx={cellTextSx}>
                                      {toDateBR(n.dtneg)} {safeStr(n.hrneg)}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </Box>
                  </Box>
                </TableContainer>
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3500}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={erro ? 'error' : 'success'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
