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

const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));
const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// prioridade por cor
const corPri = (bk: string | null | undefined) => {
  const s = String(bk ?? '').trim().toUpperCase();

  if (
    s === '#2E7D32' ||
    s === '#388E3C' ||
    s.includes('46, 125, 50') ||
    s.includes('46,125,50') ||
    s.includes('56, 142, 60') ||
    s.includes('56,142,60')
  )
    return 1;

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

  if (
    s === '#F9A825' ||
    s === '#FBC02D' ||
    s.includes('249, 168, 37') ||
    s.includes('249,168,37') ||
    s.includes('251, 192, 45') ||
    s.includes('251,192,45')
  )
    return 3;

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
        r.nunota,
        r.numnota,
        r.codparc,
        r.parceiro,
        r.vendedor,
        r.descroper,
        r.tipoEntrega,
        r.statusNotaDesc,
        r.statusConferenciaDesc ?? '',
        r.codprod,
        r.descrprod,
        r.codgrupoprod,
        r.impresso ?? '',
        r.sequencia,
      ]
        .map((x) => safeStr(x))
        .join(' ')
        .toLowerCase();

      return hay.includes(q);
    });
  }, [rows, filter]);

  const orderByColorMap = useMemo(() => {
    const counters: Record<string, number> = {};
    const m = new Map<string, number>();

    for (const r of filtered) {
      const keyColor = String(corPri(r.bkcolor));
      counters[keyColor] = (counters[keyColor] ?? 0) + 1;

      const id = `${safeNum(r.nunota)}-${safeNum(r.sequencia)}-${safeNum(r.codprod)}`;
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
      const id = `${safeNum(row.nunota)}-${safeNum(row.sequencia)}-${safeNum(row.codprod)}`;
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

  // FULLSCREEN
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

  const enterFullscreen = useCallback(
    async (deg: 0 | 90 | -90) => {
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
    },
    [updateViewport],
  );

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

  const cellSx = useMemo(
    () => ({
      fontWeight: 700,
      lineHeight: 1.1,
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
    }),
    [],
  );

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
                <Chip label={`Pedidos: ${counts.pedidosUnicos}`} />
                <Chip label={`Itens: ${counts.itens}`} />

                <Button variant="outlined" onClick={() => fetchFilaCabos('manual')} disabled={loading || loadingRefresh}>
                  {loading || loadingRefresh ? <CircularProgress size={18} /> : 'Atualizar agora'}
                </Button>

                <Button
                  variant={fullScreen && rotation === 0 ? 'contained' : 'outlined'}
                  onClick={() => enterFullscreen(0)}
                >
                  Tela cheia
                </Button>

                <Button
                  variant={fullScreen && rotation === -90 ? 'contained' : 'outlined'}
                  onClick={() => enterFullscreen(-90)}
                >
                  Tela cheia esquerda
                </Button>

                <Button
                  variant={fullScreen && rotation === 90 ? 'contained' : 'outlined'}
                  onClick={() => enterFullscreen(90)}
                >
                  Tela cheia direita
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

// ✅ Tooltip + 1 linha com ellipsis na coluna Produto
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

  const fontSize = compact ? 'clamp(12px, 1.5vw, 16px)' : '18px';
  const py = compact ? 0.8 : 1.2;

  const oneLineEllipsisSx = {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
    lineHeight: 1.1,
  } as const;

  return (
    <Table
      size="small"
      stickyHeader
      sx={{
        width: '100%',
        tableLayout: 'fixed',
        '& th, & td': {
          fontSize,
          py,
          verticalAlign: 'top',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        },
      }}
    >
      <TableHead>
        <TableRow
          sx={{
            '& th': {
              backgroundColor: (t) => t.palette.grey[50],
              fontWeight: 800,
              whiteSpace: 'normal',
              lineHeight: 1.1,
            },
          }}
        >
          <TableCell sx={{ width: '6%' }}>#</TableCell>
          <TableCell sx={{ width: '10%' }}>Pedido</TableCell>
          <TableCell sx={{ width: '18%' }}>Parceiro</TableCell>
          <TableCell sx={{ width: '28%' }}>Produto</TableCell>
          <TableCell sx={{ width: '6%' }} align="right">
            Qtd
          </TableCell>
          <TableCell sx={{ width: '8%' }}>Vendedor</TableCell>
          <TableCell sx={{ width: '8%' }} align="center">
            Imprimir
          </TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {filtered.map((r) => {
          const id = `${safeNum(r.nunota)}-${safeNum(r.sequencia)}-${safeNum(r.codprod)}`;
          const ordemCor = orderByColorMap.get(id) ?? safeNum(r.ordemLinha);
          const isPrinting = printingId === id;

          const isImpresso = String(r.impresso ?? '').trim().toUpperCase() === 'S';

          const rowBg = isImpresso ? '#999999' : r.bkcolor || undefined;
          const rowFg = isImpresso ? '#E0E0E0' : r.fgcolor || undefined;

          const produtoTooltip = `${safeStr(r.descrprod)}\nProd: ${safeNum(r.codprod)} • Grupo: ${safeNum(
            r.codgrupoprod,
          )}${isImpresso ? ' • IMPRESSO' : ''}`;

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
              <TableCell>
                <Typography sx={cellSx}>{ordemCor}</Typography>
              </TableCell>

              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                  {safeNum(r.nunota)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9, lineHeight: 1.1 }}>
                  Seq: {safeNum(r.sequencia)}
                </Typography>
              </TableCell>

              <TableCell>
                <Tooltip title={safeStr(r.parceiro)} arrow enterDelay={250}>
                  <Typography variant="body2" sx={{ fontWeight: 700, ...oneLineEllipsisSx }}>
                    {safeStr(r.parceiro)}
                  </Typography>
                </Tooltip>
                <Typography variant="caption" sx={{ opacity: 0.9, lineHeight: 1.1 }}>
                  Parc: {safeNum(r.codparc)}
                </Typography>
              </TableCell>
              <TableCell>
                <Tooltip title={<pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{produtoTooltip}</pre>} arrow enterDelay={250}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800, ...oneLineEllipsisSx }}>
                      {safeStr(r.descrprod)}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9, ...oneLineEllipsisSx }}>
                      Prod: {safeNum(r.codprod)} • Grupo: {safeNum(r.codgrupoprod)}
                      {isImpresso ? ' • IMPRESSO' : ''}
                    </Typography>
                  </Box>
                </Tooltip>
              </TableCell>

              <TableCell align="right">{safeNum(r.qtdneg).toLocaleString('pt-BR')}</TableCell>

              <TableCell>
                <Tooltip title={safeStr(r.vendedor)} arrow enterDelay={250}>
                  <Typography variant="body2" sx={{ fontWeight: 700, ...oneLineEllipsisSx }}>
                    {safeStr(r.vendedor)}
                  </Typography>
                </Tooltip>
              </TableCell>

              <TableCell align="center">
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => onPrint(r)}
                  disabled={isPrinting}
                  sx={{
                    fontWeight: 900,
                    minWidth: compact ? 86 : 110,
                    px: compact ? 1 : 2,
                    backgroundColor: '#000',
                    '&:hover': { backgroundColor: '#333' },
                  }}
                >
                  {isPrinting ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'IMPRIMIR'}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}

        {filtered.length === 0 && (
          <TableRow>
            <TableCell colSpan={9}>
              <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
                Nenhum registro encontrado.
              </Typography>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
