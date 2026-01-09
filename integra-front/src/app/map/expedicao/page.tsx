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

type NotaTV = {
  ordemLinha: number;
  bkcolor: string;
  fgcolor: string;

  nunota: number;
  numnota: number;
  codtipoper: number;
  descroper: string;

  dtneg: string;
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
};

const POLL_MS = 900000;

const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));
const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const toDateBR = (v: string) => {
  if (!v) return '-';
  const s = String(v).trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;

  // DDMMYYYY ou DDMMYYYY HH:mm:ss
  const m1 = s.match(/^(\d{2})(\d{2})(\d{4})(?:\s|$)/);
  if (m1) {
    const [, dd, mm, yyyy] = m1;
    return `${dd}/${mm}/${yyyy}`;
  }

  // YYYY-MM-DD...
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) {
    const [, yyyy, mm, dd] = m2;
    return `${dd}/${mm}/${yyyy}`;
  }

  return s;
};

const moneyBR = (v: any) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number.isFinite(Number(v)) ? Number(v) : 0,
  );

const stableHash = (list: NotaTV[]) =>
  JSON.stringify(
    list.map((x) => [
      x.nunota,
      x.ordemLinha,
      x.dtneg,
      x.statusNota,
      x.statusConferenciaCod,
      x.qtdRegConferencia,
      x.bkcolor,
      x.fgcolor,
      x.vlrnota,
    ]),
  );

export default function Page() {
  // Hydration guard
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [items, setItems] = useState<NotaTV[]>([]);
  const [filtered, setFiltered] = useState<NotaTV[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // filtros
  const [q, setQ] = useState('');
  const [onlyEC, setOnlyEC] = useState(false);
  const [onlyRL, setOnlyRL] = useState(false);
  const [onlyEI, setOnlyEI] = useState(false);

  // fullscreen + rotação
  const [fullScreen, setFullScreen] = useState(false);
  const [rotation, setRotation] = useState<90 | -90>(90);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);

  // snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // token opcional
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

  // lê token se existir
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    setToken(t);
  }, []);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getAllNotasTV` : `/sync/getAllNotasTVAberta`),
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

        const data = (await resp.json()) as NotaTV[] | null;
        const list = Array.isArray(data) ? data : [];

        const sorted = [...list].sort((a, b) => {
          const oa = safeNum((a as any).ordemLinha);
          const ob = safeNum((b as any).ordemLinha);
          if (oa && ob && oa !== ob) return oa - ob;

          const ta = a?.dtneg ? new Date(a.dtneg).getTime() : 0;
          const tb = b?.dtneg ? new Date(b.dtneg).getTime() : 0;
          if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;

          return safeNum(b?.nunota) - safeNum(a?.nunota);
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
    const id = window.setInterval(() => {
      fetchData('poll');
    }, POLL_MS);

    return () => window.clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    const term = q.trim().toUpperCase();

    const res = items.filter((n) => {
      if (onlyEC && n.adTipoDeEntrega !== 'EC') return false;
      if (onlyRL && n.adTipoDeEntrega !== 'RL') return false;
      if (onlyEI && n.adTipoDeEntrega !== 'EI') return false;

      if (!term) return true;

      const hay = [
        n.nunota,
        n.numnota,
        n.codparc,
        n.codtipoper,
        n.descroper,
        n.parceiro,
        n.vendedor,
        n.statusNota,
        n.statusNotaDesc,
        n.tipoEntrega,
        n.adTipoDeEntrega,
        n.statusConferenciaCod,
        n.statusConferenciaDesc,
      ]
        .map((x) => (x == null ? '' : String(x)))
        .join(' ')
        .toUpperCase();

      return hay.includes(term);
    });

    setFiltered(res);
  }, [q, items, onlyEC, onlyRL, onlyEI]);

  useEffect(() => {
    const onFsChange = () => setFullScreen(!!document.fullscreenElement);

    document.addEventListener('fullscreenchange', onFsChange);
    // @ts-ignore
    document.addEventListener('webkitfullscreenchange', onFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      // @ts-ignore
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  const enterFullscreenWithRotation = useCallback(async (deg: 90 | -90) => {
    const el = tableWrapRef.current as any;
    if (!el) return;

    try {
      setRotation(deg);

      const fsEl = document.fullscreenElement;

      // se já está fullscreen, só gira (não sai/entra)
      if (fsEl) {
        return;
      }

      // entrar
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen(); // Safari

      // tenta travar em landscape
      try {
        // @ts-ignore
        if (screen?.orientation?.lock) {
          // @ts-ignore
          await screen.orientation.lock('landscape');
        }
      } catch {
        // ignora
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível ativar tela cheia.';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    }
  }, []);

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
      } catch {
        // ignora
      }
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
                  Notas TV (atualiza automaticamente)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total: {filtered.length} (carregado: {items.length})
                  {loadingRefresh ? ' • atualizando…' : ''}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Button variant="outlined" onClick={() => fetchData('manual')} disabled={loading || loadingRefresh}>
                  {loading || loadingRefresh ? <CircularProgress size={18} /> : 'Atualizar agora'}
                </Button>

                {/* ✅ DOIS BOTÕES DE TELA CHEIA (90 e -90) */}
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
                  {fullScreen ? 'Girar Esquerda' : 'Tela cheia Esquerda°'}
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
                label="Buscar (nunota, numnota, parceiro, vendedor, status, tipo entrega...)"
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
              <Typography color="error" sx={{ mb: 2 }}>
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

                {filtered.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>Nenhuma nota encontrada.</Typography>
                ) : (
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

                      width: fullScreen ? '100vw' : 'auto',
                      height: fullScreen ? '100vh' : 'auto',

                      bgcolor: 'background.paper',

                      '&:fullscreen': { outline: 'none' },
                      // @ts-ignore
                      '&:-webkit-full-screen': { outline: 'none' },
                    }}
                  >
                    {/* Palco fullscreen */}
                    <Box
                      sx={
                        fullScreen
                          ? { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }
                          : { width: '100%', overflowX: 'auto' }
                      }
                    >
                      {/* ✅ Scroller rotacionado: usa rotation (90 ou -90) */}
                      <Box
                        sx={
                          fullScreen
                            ? {
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                width: '100vh',
                                height: '100vw',
                                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                                transformOrigin: 'center',
                                overflowX: 'auto',
                                overflowY: 'auto',
                                backgroundColor: 'background.paper',
                              }
                            : {}
                        }
                      >
                        <Table size="small" stickyHeader aria-label="lista-notas-tv" sx={{ minWidth: 1200 }}>
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
                              <TableCell>NUNOTA</TableCell>
                              <TableCell>NUMNOTA</TableCell>
                              <TableCell>Parceiro</TableCell>
                              <TableCell>Vendedor</TableCell>
                              <TableCell>Entrega</TableCell>
                              <TableCell>Status Nota</TableCell>
                              <TableCell>Status Conferência</TableCell>
                              <TableCell align="right">Vlr Nota</TableCell>
                              <TableCell>DTNEG</TableCell>
                            </TableRow>
                          </TableHead>

                          <TableBody>
                            {filtered.map((n) => {
                              const bg = n.bkcolor || '#FFFFFF';
                              const fg = n.fgcolor || '#000000';

                              return (
                                <TableRow
                                  key={String(n.nunota)}
                                  sx={{
                                    backgroundColor: bg,
                                    '& td': { color: fg },
                                    '&:hover': { filter: 'brightness(0.97)' },
                                  }}
                                >
                                  <TableCell>{safeStr(n.ordemLinha)}</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>{safeStr(n.nunota)}</TableCell>
                                  <TableCell>{safeStr(n.numnota)}</TableCell>
                                  <TableCell>
                                    <Typography sx={{ fontWeight: 600, color: 'inherit' }}>{safeStr(n.parceiro)}</Typography>
                                    <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.9 }}>
                                      CODPARC: {safeStr(n.codparc)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography sx={{ fontWeight: 600, color: 'inherit' }}>{safeStr(n.vendedor)}</Typography>
                                    <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.9 }}>
                                      CODVEND: {safeStr(n.codvend)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    {safeStr(n.tipoEntrega)} ({safeStr(n.adTipoDeEntrega)})
                                  </TableCell>
                                  <TableCell>
                                    {safeStr(n.statusNotaDesc)} ({safeStr(n.statusNota)})
                                  </TableCell>
                                  <TableCell>
                                    <Typography sx={{ fontWeight: 600, color: 'inherit' }}>
                                      {safeStr(n.statusConferenciaDesc)}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.9 }}>
                                      {safeStr(n.statusConferenciaCod)} • Regs: {safeStr(n.qtdRegConferencia)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                                    {moneyBR(n.vlrnota)}
                                  </TableCell>
                                  <TableCell>{toDateBR(n.dtneg)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </Box>
                    </Box>
                  </TableContainer>
                )}
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
