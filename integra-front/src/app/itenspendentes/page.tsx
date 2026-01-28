'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
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
} from '@mui/material';

const POLL_MS = 10000;

type PendenciaEstoque = {
  nunota: number;
  numnota: number;
  descroper: string;
  dtalter: string;
  hralter: string;
  parceiro: string;
  vendedor: string;
  descrprod: string;
  estoque_atual: number;
  qtd_negociada: number;
  qtd_pendente_calc: number;
  codprod: number;
  sequencia: number;

  adimpresso: string; // 'S' ou outro
  bkcolor?: string;
  fgcolor?: string;
};

const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));
const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default function PaginaPendenciasEstoque() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [items, setItems] = useState<PendenciaEstoque[]>([]);
  const [filtered, setFiltered] = useState<PendenciaEstoque[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const inFlightRef = useRef(false);

  const [fullScreen, setFullScreen] = useState(false);
  const [rotation, setRotation] = useState<90 | -90>(90);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);

  // ✅ igual sua tela que funciona: 1 estado simples e solta no finally (ou antes)
  const [printingId, setPrintingId] = useState<string | null>(null);
  const makeId = (item: PendenciaEstoque) => `${safeNum(item.nunota)}-${safeNum(item.codprod)}`;

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);

  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/listarItensPendentes` : `/sync/listarItensPendentes`),
    [API_BASE],
  );

  const IMPRESSO_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/adImpresso` : `/sync/adImpresso`),
    [API_BASE],
  );

  // ✅ timeout helper (pra nada travar infinito)
  const withTimeout = useCallback(async <T,>(p: Promise<T>, ms: number, msg = 'Timeout') => {
    return await Promise.race<T>([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
    ]);
  }, []);

  const fetchData = useCallback(
    async (mode: 'initial' | 'poll' | 'manual' = 'poll') => {
      if (inFlightRef.current) return;

      try {
        inFlightRef.current = true;
        if (mode === 'initial') setLoading(true);
        else setLoadingRefresh(true);

        const token = localStorage.getItem('authToken');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const resp = await fetch(LIST_URL, { method: 'GET', headers, cache: 'no-store' });
        const result = await resp.json();

        const rawData = Array.isArray(result) ? result : result?.responseBody?.rows || result?.rows || [];
        if (!Array.isArray(rawData)) throw new Error('Formato de dados inválido recebido do servidor.');

        const list: PendenciaEstoque[] = rawData.map((r: any[]) => ({
          nunota: r[5],
          numnota: r[6],
          descroper: r[7],
          dtalter: r[9],
          hralter: r[10],
          parceiro: r[12],
          vendedor: r[15],
          codprod: r[27],
          descrprod: safeStr(r[28]),
          estoque_atual: safeNum(r[35]),
          qtd_negociada: safeNum(r[32]),
          qtd_pendente_calc: safeNum(safeNum(r[32]) - safeNum(r[35])),
          bkcolor: r[0],
          adimpresso: safeStr(r[36]),
          sequencia: safeNum(r[26]),
        }));

        setItems(list);
        setErro(null);
      } catch (e: any) {
        setErro(e?.message ?? 'Erro ao carregar lista');
        setSnackbarOpen(true);
      } finally {
        inFlightRef.current = false;
        setLoading(false);
        setLoadingRefresh(false);
      }
    },
    [LIST_URL],
  );

  const marcarComoImpresso = useCallback(
    async (nunota: number, sequencia: number, authHeaders: any) => {
      const headers: any = { ...authHeaders, 'Content-Type': 'application/json' };

      const resp = await fetch(IMPRESSO_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nunota, sequencia }),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`Falha ao marcar como impresso: ${txt || resp.statusText}`);
      }
    },
    [IMPRESSO_URL],
  );

  // ✅ exatamente a lógica da página que funciona
  const openPrintIframeFromBlob = useCallback((blob: Blob) => {
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
        return;
      }

      win.focus();
      win.print();

      // limpeza tardia
      setTimeout(() => {
        URL.revokeObjectURL(url);
        iframe.remove();
      }, 180_000);
    };
  }, []);

  // ✅ IMPRIMIR: spinner só até gerar PDF / abrir iframe (não espera marcar/refresh)
  const handleImprimir = useCallback(
    async (item: PendenciaEstoque) => {
      const id = makeId(item);

      // mesma regra da tela base: 1 de cada vez enquanto GERA PDF
      if (printingId) return;

      try {
        setPrintingId(id);

        const token = localStorage.getItem('authToken');
        const headers: any = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const params = new URLSearchParams();
        Object.entries(item).forEach(([k, v]) => {
          if (v !== undefined && v !== null) params.append(k, String(v));
        });

        const printUrl = API_BASE
          ? `${API_BASE}/sync/imprimirEtiquetaLid?${params.toString()}`
          : `/sync/imprimirEtiquetaLid?${params.toString()}`;

        // ✅ timeout no fetch do PDF pra nunca travar spinner
        const resp = await withTimeout(
          fetch(printUrl, { method: 'GET', headers }),
          15000,
          'Timeout ao gerar PDF',
        );

        if (!resp.ok) {
          const txt = await resp.text().catch(() => '');
          throw new Error(txt || `Falha ao gerar etiqueta (status ${resp.status})`);
        }

        const blob = await resp.blob();

        // ✅ abre impressão (não aguarda nada)
        openPrintIframeFromBlob(blob);

        // ✅ libera o botão imediatamente (não depende do backend impresso/refresh)
        setPrintingId(null);

        // ✅ marca como impresso e atualiza em background (sem travar UI)
        (async () => {
          try {
            await withTimeout(
              marcarComoImpresso(item.nunota, item.sequencia, headers),
              15000,
              'Timeout ao marcar impresso',
            );
            await withTimeout(fetchData('manual'), 20000, 'Timeout ao atualizar lista');
          } catch (e) {
            console.error(e);
            setErro(e instanceof Error ? e.message : 'Erro ao atualizar após impressão');
            setSnackbarOpen(true);
          }
        })();
      } catch (e: any) {
        console.error(e);
        setErro(e?.message ?? 'Erro ao imprimir');
        setSnackbarOpen(true);
        setPrintingId(null);
      }
    },
    [API_BASE, fetchData, makeId, marcarComoImpresso, openPrintIframeFromBlob, printingId, withTimeout],
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
      if (!term) return true;
      return [n.nunota, n.numnota, n.parceiro, n.descrprod, n.vendedor].some((x) =>
        String(x).toUpperCase().includes(term),
      );
    });
    setFiltered(res);
  }, [q, items]);

  const updateViewport = useCallback(() => setVp({ w: window.innerWidth, h: window.innerHeight }), []);
  useEffect(() => {
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, [updateViewport]);

  useLayoutEffect(() => {
    if (!fullScreen || !contentRef.current) {
      setScale(1);
      return;
    }
    const availW = Math.max(1, (rotation === 90 || rotation === -90 ? vp.h : vp.w) - 20);
    const contentW = contentRef.current.offsetWidth || 1;
    setScale(Math.min(2.0, Math.max(0.4, availW / contentW)));
  }, [fullScreen, rotation, vp, filtered.length]);

  const toggleFs = async (deg: 90 | -90) => {
    setRotation(deg);
    if (!document.fullscreenElement) await tableWrapRef.current?.requestFullscreen();
    else document.exitFullscreen();
    setFullScreen(!document.fullscreenElement);
  };

  if (!mounted) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#f0f4f8', minHeight: '100vh', p: 3 }}>
      <Card sx={{ maxWidth: 1600, mx: 'auto', boxShadow: 3, borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Pendências de Estoque
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mostrando {filtered.length} itens {loadingRefresh && '• Atualizando...'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={() => fetchData('manual')}>
                Atualizar
              </Button>
              <Button variant="contained" onClick={() => toggleFs(90)}>
                Tela Cheia
              </Button>
            </Box>
          </Box>

          <TextField
            fullWidth
            label="Buscar por Nota, Parceiro ou Produto..."
            variant="outlined"
            size="small"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{ mb: 3 }}
          />

          <TableContainer component={Paper} elevation={0} ref={tableWrapRef} sx={{ border: '1px solid #eee', borderRadius: 2 }}>
            <Box
              sx={
                fullScreen
                  ? {
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      width: '100vw',
                      height: '100vh',
                      bgcolor: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      zIndex: 2000,
                    }
                  : {}
              }
            >
              <Box
                ref={contentRef}
                sx={{
                  transform: fullScreen ? `rotate(${rotation}deg) scale(${scale})` : 'none',
                  width: fullScreen ? 'max-content' : '100%',
                }}
              >
                <Table stickyHeader sx={{ minWidth: 1000 }}>
                  <TableHead>
                    <TableRow sx={{ '& th': { backgroundColor: '#f8fafc', fontWeight: 700, fontSize: '1.1rem' } }}>
                      <TableCell>NÚN./NOTA</TableCell>
                      <TableCell>PARCEIRO / VENDEDOR</TableCell>
                      <TableCell>PRODUTO</TableCell>
                      <TableCell align="center">NEGOCIADA</TableCell>
                      <TableCell align="center">ESTOQUE</TableCell>
                      <TableCell align="center">IMPRIMIR</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {filtered.map((item, i) => {
                      const id = makeId(item);
                      const isPrinting = printingId === id;

                      const rowBg =
                        String(item.adimpresso ?? '').trim().toUpperCase() === 'S'
                          ? '#E0E0E0'
                          : item.bkcolor ?? '#FFFFFF';

                      const isPendencia = item.estoque_atual < item.qtd_negociada;

                      return (
                        <TableRow
                          key={`${id}-${i}`}
                          sx={{
                            backgroundColor: rowBg,
                            '& td': { backgroundColor: rowBg },
                          }}
                        >
                          <TableCell>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1976d2' }}>
                              #{item.nunota}
                            </Typography>
                            <Typography variant="caption">NF: {item.numnota}</Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {item.parceiro}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.vendedor}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ maxWidth: 300 }}>
                            <Typography variant="body2">{item.descrprod}</Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Typography sx={{ fontWeight: 700, color: isPendencia ? 'error.main' : 'success.main' }}>
                              {item.qtd_negociada}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Typography sx={{ fontWeight: 700, color: isPendencia ? 'error.main' : 'success.main' }}>
                              {item.estoque_atual}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={() => handleImprimir(item)}
                              disabled={isPrinting}
                              sx={{ minWidth: '100px' }}
                            >
                              {isPrinting ? <CircularProgress size={20} color="inherit" /> : 'IMPRIMIR'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          </TableContainer>
        </CardContent>
      </Card>

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity="error" variant="filled">
          {erro}
        </Alert>
      </Snackbar>
    </Box>
  );
}
