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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  GlobalStyles,
} from '@mui/material';

// --- ÍCONES (mesmo estilo) ---
const RefreshIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
  </svg>
);
const ScreenNormalIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
  </svg>
);
const ScreenRotateRightIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 4.84 18.29 0 12 0l-.66.03 3.81 3.81 1.33-1.32zm-6.25-.77c-.59-.59-1.54-.59-2.12 0L1.75 8.11c-.59.59-.59 1.54 0 2.12l12.02 12.02c.59.59 1.54.59 2.12 0l6.36-6.36c.59-.59.59-1.54 0-2.12L10.23 1.75zm4.6 19.44L2.81 9.17l6.36-6.36 12.02 12.02-6.36 6.36z" />
  </svg>
);
const ScreenRotateLeftIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ transform: 'scaleX(-1)' }}
  >
    <path d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 4.84 18.29 0 12 0l-.66.03 3.81 3.81 1.33-1.32zm-6.25-.77c-.59-.59-1.54-.59-2.12 0L1.75 8.11c-.59.59-.59 1.54 0 2.12l12.02 12.02c.59.59 1.54.59 2.12 0l6.36-6.36c.59-.59.59-1.54 0-2.12L10.23 1.75zm4.6 19.44L2.81 9.17l6.36-6.36 12.02 12.02-6.36 6.36z" />
  </svg>
);
const ExitFullscreenIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
  </svg>
);

// --- TIPOS ---
type ItemLoc2Row = {
  nunota: number;
  sequencia: number;

  codprod: number;
  descrprod: string;

  codgrupoprod: number;
  codvol: string;

  qtdneg: number;
  vlrunit: number;
  vlrtot: number;

  localizacao2: string | null;
  impresso: string | null;

  dtalter: string;
  hralter: string;
};

// --- HELPERS ---
const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));
const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const genId = (r: ItemLoc2Row) =>
  `${safeNum(r.nunota)}-${safeNum(r.sequencia)}-${safeNum(r.codprod)}`;

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

const parseDtHrToDate = (dt: string, hr: any): Date | null => {
  const h = normalizeHr(hr) ?? '00:00:00';
  const d = String(dt ?? '').trim();
  if (!d) return null;

  // dd/mm/yyyy
  const br = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) {
    const [, dd, mm, yyyy] = br;
    const out = new Date(`${yyyy}-${mm}-${dd}T${h}`);
    return Number.isFinite(out.getTime()) ? out : null;
  }

  // y-m-d
  const m2 = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) {
    const [, yyyy, mm, dd] = m2;
    const out = new Date(`${yyyy}-${mm}-${dd}T${h}`);
    return Number.isFinite(out.getTime()) ? out : null;
  }

  const out = new Date(d);
  if (!Number.isFinite(out.getTime())) return null;
  const hhmmss = normalizeHr(hr);
  if (hhmmss) {
    const [H, M, S] = hhmmss.split(':').map((x) => Number(x) || 0);
    out.setHours(H, M, S, 0);
  }
  return out;
};

const timeKey = (r: ItemLoc2Row) => {
  const dt = parseDtHrToDate(r.dtalter, r.hralter);
  return dt ? dt.getTime() : Number.POSITIVE_INFINITY;
};

// --- CORES DO TEMA ---
const THEME = {
  bgMain: '#eef2f6',
  glass: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
};

export default function ItensLoc2Page() {
  const [rows, setRows] = useState<ItemLoc2Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; severity: 'success' | 'error' | 'info'; msg: string }>({
    open: false,
    severity: 'info',
    msg: '',
  });

  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const [token, setToken] = useState<string | null>(null);

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

  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/expedicao/listarItensLoc2` : `/expedicao/listarItensLoc2`),
    [API_BASE],
  );

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const fetchItens = useCallback(
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
          throw new Error(txt || `Falha ao buscar itens (status ${resp.status})`);
        }

        const data = (await resp.json()) as unknown;
        if (!Array.isArray(data)) throw new Error('Resposta inválida: esperado array.');

        // normaliza casos (fields, nomes em caixa alta etc.)
        const normalized: ItemLoc2Row[] = (data as any[]).map((r) => {
          const x = { ...(r ?? {}), ...(r?.fields ?? {}) };
          return {
            nunota: safeNum(x.nunota ?? x.NUNOTA),
            sequencia: safeNum(x.sequencia ?? x.SEQUENCIA),

            codprod: safeNum(x.codprod ?? x.CODPROD),
            descrprod: safeStr(x.descrprod ?? x.DESCRPROD),

            codgrupoprod: safeNum(x.codgrupoprod ?? x.CODGRUPOPROD),
            codvol: safeStr(x.codvol ?? x.CODVOL),

            qtdneg: safeNum(x.qtdneg ?? x.QTDNEG),
            vlrunit: safeNum(x.vlrunit ?? x.VLRUNIT),
            vlrtot: safeNum(x.vlrtot ?? x.VLRTOT),

            localizacao2: x.localizacao2 ?? x.LOCALIZACAO2 ?? null,
            impresso: x.impresso ?? x.IMPRESSO ?? x.AD_IMPRESSO ?? null,

            dtalter: safeStr(x.dtalter ?? x.DTALTER),
            hralter: safeStr(x.hralter ?? x.HRALTER),
          };
        });

        const ordered = [...normalized].sort((a, b) => {
          // mais antigos primeiro (igual teu painel), se quiser inverter troca a-b
          const ta = timeKey(a);
          const tb = timeKey(b);
          if (ta !== tb) return ta - tb;
          if (a.nunota !== b.nunota) return a.nunota - b.nunota;
          return a.sequencia - b.sequencia;
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
    fetchItens('initial');
    const id = window.setInterval(() => fetchItens('poll'), 5_000);
    return () => window.clearInterval(id);
  }, [fetchItens]);

  // Fullscreen / rotação / scale
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | -90>(0);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);

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
      const pad = 10;
      const w = Math.max(1, availW - pad);
      let next = w / contentW;
      next = Math.max(0.2, Math.min(2.0, next));
      setScale((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
    };

    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullScreen, rotation, availW, availH, rows.length]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: THEME.bgMain }}>
      <GlobalStyles
        styles={{
          'html, body': { overflowX: 'hidden', width: '100vw', margin: 0, padding: 0 },
          '*::-webkit-scrollbar': { width: '6px', height: '6px' },
          '*::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '3px' },
        }}
      />

      <Box
        component="main"
        className="notranslate"
        sx={{
          flexGrow: 1,
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          p: { xs: 1, md: 2 },
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          background: `radial-gradient(circle at 50% -20%, #e3f2fd, ${THEME.bgMain})`,
        }}
      >
        <Box
          ref={tableWrapRef}
          sx={{
            minHeight: '100%',
            width: '100%',
            p: fullScreen ? 3 : 0,
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
            ...(fullScreen && {
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              overflowY: 'auto',
              bgcolor: '#f5f5f5',
            }),
          }}
        >
          <Box
            ref={contentRef}
            sx={{
              transform:
                fullScreen && rotation !== 0
                  ? `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`
                  : `scale(${fullScreen ? scale : 1})`,
              transformOrigin: fullScreen && rotation !== 0 ? 'center' : 'top center',
              transition: 'transform 0.3s ease',
              ...(fullScreen && rotation !== 0
                ? { position: 'absolute', top: '50%', left: '50%', width: availW, height: availH }
                : { maxWidth: fullScreen ? 'none' : '1400px', mx: 'auto' }),
            }}
          >
            {/* CABEÇALHO */}
            {!fullScreen && (
              <Paper
                elevation={0}
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                  p: 2,
                  borderRadius: 4,
                  bgcolor: THEME.glass,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${THEME.glassBorder}`,
                  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.05)',
                  gap: 2,
                  width: '100%',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(13, 71, 161, 0.35)',
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
                    </svg>
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ color: '#0d47a1', fontWeight: 800, letterSpacing: -0.5 }}>
                      Itens por Localização 2
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#546e7a', fontWeight: 500 }}>
                      /expedicao/listarItensLoc2 (Tempo Real)
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Tooltip title="Atualizar Lista">
                    <IconButton
                      onClick={() => fetchItens('manual')}
                      sx={{ bgcolor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                    >
                      {loadingRefresh ? <CircularProgress size={20} /> : <RefreshIcon />}
                    </IconButton>
                  </Tooltip>

                  <Box sx={{ height: 24, width: 1, bgcolor: '#cfd8dc', mx: 1 }} />

                  {fullScreen ? (
                    <IconButton
                      onClick={exitFullscreen}
                      sx={{ bgcolor: '#ffebee', color: '#d32f2f', '&:hover': { bgcolor: '#ffcdd2' } }}
                    >
                      <ExitFullscreenIcon />
                    </IconButton>
                  ) : (
                    <>
                      <Tooltip title="Tela Cheia">
                        <IconButton
                          onClick={() => enterFullscreen(0)}
                          sx={{ bgcolor: '#37474f', color: 'white', '&:hover': { bgcolor: '#263238' } }}
                        >
                          <ScreenNormalIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Girar 90°">
                        <IconButton
                          onClick={() => enterFullscreen(90)}
                          sx={{ bgcolor: '#37474f', color: 'white', '&:hover': { bgcolor: '#263238' } }}
                        >
                          <ScreenRotateRightIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Girar -90°">
                        <IconButton
                          onClick={() => enterFullscreen(-90)}
                          sx={{ bgcolor: '#37474f', color: 'white', '&:hover': { bgcolor: '#263238' } }}
                        >
                          <ScreenRotateLeftIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Box>
              </Paper>
            )}

            {/* ERROR */}
            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {/* LOADING */}
            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 8 }}>
                <CircularProgress color="primary" size={60} thickness={4} />
                <Typography sx={{ mt: 2, color: '#666', fontWeight: 500 }}>Carregando itens...</Typography>
              </Box>
            ) : (
              <ItensLoc2List rows={rows} />
            )}

            {/* RODAPÉ */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 6, opacity: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#546e7a' }}>
                ELETRO FARIAS &copy; {new Date().getFullYear()}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Snackbar
          open={snack.open}
          autoHideDuration={3000}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 3, boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

// --- TABELA ---
function ItensLoc2List({ rows }: { rows: ItemLoc2Row[] }) {
  return (
    <TableContainer
      component={Paper}
      elevation={3}
      sx={{
        borderRadius: 3,
        overflowX: 'auto',
        bgcolor: 'transparent',
        maxWidth: '100%',
      }}
    >
      <Table
        sx={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'separate',
          borderSpacing: '0 8px',
        }}
      >
        <TableHead>
          <TableRow sx={{ '& th': { borderBottom: 'none', color: '#546e7a', fontWeight: 'bold' } }}>
            <TableCell align="center" width="8%">
              SEQ
            </TableCell>
            <TableCell align="left" width="12%">
              NÚNICO
            </TableCell>
            <TableCell align="left" width="42%">
              PRODUTO
            </TableCell>
            <TableCell align="left" width="16%">
              LOCAL 2
            </TableCell>
            <TableCell align="right" width="12%">
              METRAGEM
            </TableCell>
            <TableCell align="center" width="10%">
              STATUS
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map((r) => {
            const id = genId(r);
            const isImpresso = String(r.impresso ?? '').trim().toUpperCase() === 'S';

            const baseColor = isImpresso ? '#eeeeee' : '#ffffff';
            const textColor = isImpresso ? '#757575' : '#1a1a1a';

            return (
              <TableRow
                key={id}
                sx={{
                  background: `linear-gradient(90deg, ${baseColor} 0%, ${baseColor} 95%, rgba(255,255,255,0.5) 100%)`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.005)' },
                  '& td:first-of-type': { borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
                  '& td:last-of-type': { borderTopRightRadius: 12, borderBottomRightRadius: 12 },
                  '& td': {
                    borderBottom: 'none',
                    color: textColor,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  },
                }}
              >
                <TableCell align="center">
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'rgba(13,71,161,0.08)',
                      border: '2px solid rgba(13,71,161,0.15)',
                      color: '#0d47a1',
                      fontWeight: 900,
                      fontSize: '1rem',
                    }}
                  >
                    {safeNum(r.sequencia)}
                  </Box>
                </TableCell>

                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {safeNum(r.nunota)}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ opacity: 0.7 }}>
                    Seq: {safeNum(r.sequencia)}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Typography variant="body2" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                    {safeStr(r.descrprod)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip
                      label={`Cod: ${safeNum(r.codprod)}`}
                      size="small"
                      variant="outlined"
                      sx={{ borderColor: 'rgba(0,0,0,0.2)', fontSize: '0.75rem' }}
                    />
                    <Chip
                      label={`Grupo: ${safeNum(r.codgrupoprod)}`}
                      size="small"
                      sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(0,0,0,0.06)' }}
                    />
                    <Chip
                      label={`Un: ${safeStr(r.codvol)}`}
                      size="small"
                      sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(0,0,0,0.06)' }}
                    />
                  </Box>
                </TableCell>

                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {safeStr(r.localizacao2)}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ opacity: 0.7 }}>
                    {safeStr(r.dtalter)} {safeStr(r.hralter)}
                  </Typography>
                </TableCell>

                <TableCell align="right">
                  <Typography variant="h6" fontWeight="900" sx={{ letterSpacing: -0.5, fontSize: '1.1rem' }}>
                    {safeNum(r.qtdneg)} <span style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 500 }}>m</span>
                  </Typography>
                </TableCell>

                <TableCell align="center">
                  <Chip
                    label={isImpresso ? 'Impresso' : 'Pendente'}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      bgcolor: isImpresso ? 'rgba(117,117,117,0.15)' : 'rgba(46,125,50,0.15)',
                      color: isImpresso ? '#616161' : '#2e7d32',
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}

          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                <Typography variant="h6" color="textSecondary" sx={{ opacity: 0.5 }}>
                  Nenhum item encontrado.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}