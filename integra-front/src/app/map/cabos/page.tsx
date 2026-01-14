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
  IconButton,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';

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
};

const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));
const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function fmtMoney(v: number) {
  if (Number.isNaN(Number(v))) return 'R$ 0,00';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FilaCabosPage() {
  const [rows, setRows] = useState<FilaCabosRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRefresh, setLoadingRefresh] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<string>('');

  // sidebar (padrão das outras páginas)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // feedback
  const [snack, setSnack] = useState<{ open: boolean; severity: 'success' | 'error' | 'info'; msg: string }>({
    open: false,
    severity: 'info',
    msg: '',
  });

  // evita setState depois de unmount + evita corrida
  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // auth
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
    () => (API_BASE ? `${API_BASE}/sync/getFilaCabos` : `/sync/getFilaCabos`),
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

        if (!Array.isArray(data)) {
          throw new Error('Resposta inválida: esperado array.');
        }

        const ordered = [...(data as FilaCabosRow[])].sort(
          (a, b) => safeNum(a.ordemLinha) - safeNum(b.ordemLinha),
        );

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

  // carregamento inicial + polling
  useEffect(() => {
    fetchFilaCabos('initial');
    const id = window.setInterval(() => fetchFilaCabos('poll'), 10_000);
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
      ]
        .map((x) => safeStr(x))
        .join(' ')
        .toLowerCase();

      return hay.includes(q);
    });
  }, [rows, filter]);

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

  // =========================
  // FULLSCREEN + ROTAÇÃO (3 botões)
  // =========================
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [fullScreen, setFullScreen] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | -90>(0);

  // viewport real
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

        // tenta travar orientação em landscape (mobile/tv), ignora erro em desktop
        try {
          // @ts-ignore
          if (screen?.orientation?.lock && deg !== 0) {
            // @ts-ignore
            await screen.orientation.lock('landscape');
          }
        } catch {}
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

      try {
        // @ts-ignore
        if (screen?.orientation?.unlock) {
          // @ts-ignore
          screen.orientation.unlock();
        }
      } catch {}
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível sair da tela cheia.';
      setError(msg);
      setSnack({ open: true, severity: 'error', msg });
    }
  }, []);

  // SCALE dinâmico para ocupar a tela (resolve “metade da tela”)
  const [scale, setScale] = useState(1);

  const stageW = fullScreen ? (vp.w || (typeof window !== 'undefined' ? window.innerWidth : 0)) : 0;
  const stageH = fullScreen ? (vp.h || (typeof window !== 'undefined' ? window.innerHeight : 0)) : 0;

  // área disponível após rotação (90/-90 troca W/H)
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

      const pad = 16; // margem interna
      const w = Math.max(1, availW - pad);
      const h = Math.max(1, availH - pad);

      let next = Math.min(w / contentW, h / contentH);

      const MAX_SCALE = 2.2;
      const MIN_SCALE = 0.35;

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
    }),
    [],
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Floating button: sidebar */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          left: 16,
          width: 56,
          height: 56,
          borderRadius: '50%',
          bgcolor: 'background.paper',
          boxShadow: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: (t) => t.zIndex.appBar,
        }}
      >
        <IconButton onClick={() => setSidebarOpen((v) => !v)} aria-label="menu" size="large">
          <MenuIcon />
        </IconButton>
      </Box>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
            {/* Header padrão */}
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

                <Button
                  variant="outlined"
                  onClick={() => fetchFilaCabos('manual')}
                  disabled={loading || loadingRefresh}
                >
                  {loading || loadingRefresh ? <CircularProgress size={18} /> : 'Atualizar agora'}
                </Button>

                {/* 3 botões fullscreen */}
                <Button
                  disabled
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

            {/* Filtros padrão */}
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

                    // ✅ AQUI é o que garante ocupar 100% da tela no fullscreen
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
                        ? { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }
                        : { width: '100%', overflowX: 'auto' }
                    }
                  >
                    {/* camada de rotação (ou não) */}
                    <Box
                      sx={
                        fullScreen
                          ? rotation === 0
                            ? {
                                position: 'absolute',
                                inset: 0,
                                overflow: 'hidden',
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
                      {fullScreen ? (
                        <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', p: 1 }}>
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
                          sx={{
                            minWidth: 1500,
                            '& th, & td': {
                              fontSize: '18px',
                              py: 1.2,
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
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                },
                              }}
                            >
                              <TableCell>#</TableCell>
                              <TableCell>Pedido</TableCell>
                              <TableCell>Parceiro</TableCell>
                              <TableCell>Tipo</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Produto</TableCell>
                              <TableCell align="right">Qtd</TableCell>
                              <TableCell>Vendedor</TableCell>
                            </TableRow>
                          </TableHead>

                          <TableBody>
                            {filtered.map((r) => (
                              <TableRow
                                key={`${r.nunota}-${r.sequencia}-${r.codprod}`}
                                sx={{
                                  backgroundColor: r.bkcolor || undefined,
                                  '& td': { color: r.fgcolor || undefined, borderColor: 'rgba(255,255,255,0.15)' },
                                  opacity: 0.98,
                                  '&:hover': { filter: 'brightness(0.97)' },
                                }}
                              >
                                <TableCell>{safeNum(r.ordemLinha)}</TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {safeNum(r.nunota)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {safeStr(r.parceiro)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={safeStr(r.tipoEntrega)}
                                    sx={{
                                      color: r.fgcolor || undefined,
                                      borderColor: r.fgcolor || undefined,
                                      backgroundColor: 'rgba(0,0,0,0.12)',
                                    }}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={safeStr(r.statusNotaDesc)}
                                    sx={{
                                      color: r.fgcolor || undefined,
                                      borderColor: r.fgcolor || undefined,
                                      backgroundColor: 'rgba(0,0,0,0.12)',
                                    }}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {safeStr(r.descrprod)}
                                  </Typography>
                                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                    {safeNum(r.codprod)}  • Grupo: {safeNum(r.codgrupoprod)} • {safeStr(r.codvol)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">{safeNum(r.qtdneg).toLocaleString('pt-BR')}</TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {safeStr(r.vendedor)}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}

                            {!loading && filtered.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={12}>
                                  <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
                                    Nenhum registro encontrado.
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                          </Box>
                        </Box>
                      ) : (
                        <Table
                          size="small"
                          stickyHeader
                          sx={{
                            minWidth: 1500,
                            '& th, & td': {
                              fontSize: '18px',
                              py: 1.2,
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
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                },
                              }}
                            >
                              <TableCell>#</TableCell>
                              <TableCell>Pedido</TableCell>
                              <TableCell>Parceiro</TableCell>
                              <TableCell>Tipo</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Produto</TableCell>
                              <TableCell align="right">Qtd</TableCell>
                              <TableCell>Vendedor</TableCell>
                            </TableRow>
                          </TableHead>

                          <TableBody>
                            {filtered.map((r) => (
                              <TableRow
                                key={`${r.nunota}-${r.sequencia}-${r.codprod}`}
                                sx={{
                                  backgroundColor: r.bkcolor || undefined,
                                  '& td': { color: r.fgcolor || undefined, borderColor: 'rgba(255,255,255,0.15)' },
                                  opacity: 0.98,
                                  '&:hover': { filter: 'brightness(0.97)' },
                                }}
                              >
                                <TableCell>{safeNum(r.ordemLinha)}</TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {safeNum(r.nunota)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {safeStr(r.parceiro)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={safeStr(r.tipoEntrega)}
                                    sx={{
                                      color: r.fgcolor || undefined,
                                      borderColor: r.fgcolor || undefined,
                                      backgroundColor: 'rgba(0,0,0,0.12)',
                                    }}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={safeStr(r.statusNotaDesc)}
                                    sx={{
                                      color: r.fgcolor || undefined,
                                      borderColor: r.fgcolor || undefined,
                                      backgroundColor: 'rgba(0,0,0,0.12)',
                                    }}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {safeStr(r.descrprod)}
                                  </Typography>
                                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                    {safeNum(r.codprod)}  • Grupo: {safeNum(r.codgrupoprod)} • {safeStr(r.codvol)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">{safeNum(r.qtdneg).toLocaleString('pt-BR')}</TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {safeStr(r.vendedor)}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}

                            {!loading && filtered.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={12}>
                                  <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
                                    Nenhum registro encontrado.
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            )}
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
