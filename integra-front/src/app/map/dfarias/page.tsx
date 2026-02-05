'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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

/**
 * ✅ Type alinhado com o backend (Dfarias)
 */
export type NotaDfariasRow = {
  nunota: number;
  ordemLinha: number;

  dtneg: string;
  hrneg: string | null;

  statusNota: string;
  statusNotaDesc: string;

  statusConferenciaCod: string | null;
  statusConferenciaDesc: string | null;

  qtdRegConferencia: number;

  bkcolor: string;
  fgcolor: string;

  vlrnota: number;
  adTipoDeEntrega: string | null;

  codvend: number;
  vendedor: string;

  codtipoper: number;

  // ✅ projeto
  codproj: number;
  descproj: string;

  // ainda existe no tipo, mas a tela não usa mais
  parceiro: string;
};

type NotaTV = NotaDfariasRow;

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

const stableHash = (list: NotaTV[]) =>
  JSON.stringify(
    list.map((x) => [
      x.nunota,
      x.ordemLinha,
      x.dtneg,
      x.hrneg,
      x.statusNota,
      x.statusConferenciaCod,
      x.qtdRegConferencia,
      x.bkcolor,
      x.fgcolor,
      x.vlrnota,
      x.adTipoDeEntrega,
      x.codvend,
      x.vendedor,
      x.codproj,
      x.descproj,
    ]),
  );

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

const timeKey = (n: NotaTV) => {
  const dt = parseDtHrToDate(n.dtneg, n.hrneg) ?? parseDtHrToDate(toDateBR(n.dtneg), n.hrneg);
  return dt ? dt.getTime() : Number.POSITIVE_INFINITY;
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

export default function Page() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [items, setItems] = useState<NotaTV[]>([]);
  const [filtered, setFiltered] = useState<NotaTV[]>([]);
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

  const tableWrapRef = useRef<HTMLDivElement | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');

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

  // ✅ endpoint deve retornar NotaDfariasRow[] já em camelCase
  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getNotasDfarias` : `/sync/getNotasDfarias`),
    [API_BASE],
  );

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const showSnack = useCallback((msg: string, severity: 'success' | 'error' | 'info' = 'info') => {
    setSnackbarMsg(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const fetchData = useCallback(
    async (mode: 'initial' | 'poll' | 'manual' = 'poll') => {
      if (inFlightRef.current) return;

      try {
        inFlightRef.current = true;

        if (mode === 'initial') setLoading(true);
        else setLoadingRefresh(true);

        setErro(null);

        const resp = await fetch(LIST_URL, { method: 'GET', headers: getHeaders(), cache: 'no-store' });

        if (!resp.ok) {
          const msg = await resp.text().catch(() => '');
          throw new Error(msg || `Falha ao carregar notas (status ${resp.status})`);
        }

        const data = (await resp.json()) as NotaTV[] | null;
        const rawList = Array.isArray(data) ? data : [];

        const list: NotaTV[] = rawList.map((r) => ({
          ...r,

          nunota: safeNum(r.nunota),
          ordemLinha: safeNum(r.ordemLinha),

          dtneg: String(r.dtneg ?? ''),
          hrneg: normalizeHr(r.hrneg) ?? null,

          statusNota: String(r.statusNota ?? ''),
          statusNotaDesc: String(r.statusNotaDesc ?? ''),

          statusConferenciaCod: r.statusConferenciaCod ?? null,
          statusConferenciaDesc: r.statusConferenciaDesc ?? null,

          qtdRegConferencia: safeNum(r.qtdRegConferencia),

          bkcolor: r.bkcolor || '#FFFFFF',
          fgcolor: r.fgcolor || '#000000',

          vlrnota: safeNum(r.vlrnota),
          adTipoDeEntrega: r.adTipoDeEntrega ?? null,

          codvend: safeNum(r.codvend),
          vendedor: String(r.vendedor ?? ''),

          codtipoper: safeNum(r.codtipoper),

          codproj: safeNum(r.codproj),
          descproj: String(r.descproj ?? ''),

          parceiro: String((r as any).parceiro ?? ''), // não usa mais na UI
        }));

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

        if (mode === 'manual') showSnack('Atualizado.', 'success');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar notas.';
        setErro(msg);
        showSnack(msg, 'error');
      } finally {
        inFlightRef.current = false;
        setLoading(false);
        setLoadingRefresh(false);
      }
    },
    [LIST_URL, getHeaders, showSnack],
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

      // ✅ busca também por PROJETO (codproj/descproj)
      const hay = [
        n.nunota,
        n.codtipoper,
        n.statusNota,
        n.statusNotaDesc,
        n.statusConferenciaCod,
        n.statusConferenciaDesc,
        n.dtneg,
        n.hrneg,
        n.adTipoDeEntrega,
        n.vlrnota,
        n.codvend,
        n.vendedor,
        n.codproj,
        n.descproj,
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
      fontSize: fullScreen ? '1.15em' : '1.05em',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
    }),
    [fullScreen],
  );

  useEffect(() => {
    const onFsChange = () => {
      setFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', onFsChange);
    // @ts-ignore
    document.addEventListener('webkitfullscreenchange', onFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      // @ts-ignore
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  const toggleFullScreen = useCallback(async () => {
    const el = tableWrapRef.current as any;
    if (!el) return;

    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        // @ts-ignore
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao alternar tela cheia.';
      setErro(msg);
      showSnack(msg, 'error');
    }
  }, [showSnack]);

  const CARD_SX = useMemo(
    () =>
      ({
        width: '100%',
        maxWidth: '100%',
        mx: 0,
        mt: { xs: 0, sm: 2 },
        borderRadius: { xs: 0, sm: 2 },
        boxShadow: 0,
        border: 1,
        backgroundColor: 'background.paper',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      } as const),
    [],
  );

  if (!mounted) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const COLS = 7;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: 0,
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          backgroundColor: '#f0f4f8',
          p: { xs: 0, sm: 2 },
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
          <CardContent
            sx={{
              p: { xs: 1, sm: 2 },
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              height: '100%',
              minHeight: 0,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 400, mb: 0.5 }}>
                  Notas Dfarias (atualiza automaticamente)
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

                <Button variant={fullScreen ? 'contained' : 'outlined'} onClick={toggleFullScreen}>
                  {fullScreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
                </Button>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 2,
                alignItems: { xs: 'stretch', md: 'center' },
              }}
            >
              <TextField
                fullWidth
                label="Buscar (nunota, projeto, vendedor, status...)"
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
              <Typography color="error" sx={{ fontWeight: 400 }}>
                {erro}
              </Typography>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Divider sx={{ my: 1 }} />

                <TableContainer
                  component={Paper}
                  elevation={0}
                  ref={tableWrapRef}
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    backgroundColor: 'background.paper',
                    maxWidth: '100%',
                    border: fullScreen ? 'none' : (t) => `1px solid ${t.palette.divider}`,
                    borderRadius: fullScreen ? 0 : 2,
                    width: '100%',
                    // Lógica simplificada para tela cheia:
                    ...(fullScreen && {
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 9999,
                      width: '100vw',
                      height: '100vh',
                      m: 0,
                      p: 1,
                      boxSizing: 'border-box',
                    }),
                    '&:fullscreen': { width: '100vw', height: '100vh', p: 1, overflow: 'auto' },
                    // @ts-ignore
                    '&:-webkit-full-screen': { width: '100vw', height: '100vh', p: 1, overflow: 'auto' },
                  }}
                >
                  <Table
                    size="small"
                    stickyHeader
                    aria-label="lista-notas-dfarias"
                    sx={{
                      width: '100%',
                      tableLayout: 'fixed',
                      minWidth: 0,
                      '& th, & td': {
                        fontSize: { xs: '18px', sm: '22px', md: '26px', lg: '28px' },
                        fontWeight: 400,
                        py: 1.4,
                        verticalAlign: 'top',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
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
                        <TableCell sx={{ width: 70 }}>#</TableCell>
                        <TableCell sx={{ width: 120 }}>NUNOTA</TableCell>
                        <TableCell sx={{ width: '22%' }}>Projeto</TableCell>
                        <TableCell sx={{ width: '18%' }}>Vendedor</TableCell>
                        <TableCell sx={{ width: '22%' }}>Status Conferência</TableCell>
                        <TableCell sx={{ width: 140 }}>Tempo Sep.</TableCell>
                        <TableCell sx={{ width: 170 }}>DTNEG</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={COLS} align="center">
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
                                <Typography sx={cellTextSx}>
                                  {safeStr(n.codproj)} - {safeStr(n.descproj)}
                                </Typography>
                              </TableCell>

                              <TableCell>
                                <Typography sx={cellTextSx}>{safeStr(n.vendedor)}</Typography>
                              </TableCell>

                              <TableCell>
                                <Typography sx={cellTextSx}>{safeStr(n.statusConferenciaDesc)}</Typography>
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
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}