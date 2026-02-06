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
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

// --- ICONS ---
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import PrintIcon from '@mui/icons-material/Print';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// --- TYPES ---
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
  adimpresso: string; 
  bkcolor?: string;
  fgcolor?: string;
};

// --- CONFIG ---
const POLL_MS = 10000;

// --- HELPERS ---
const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));
const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// --- THEME ---
const THEME = {
  bgMain: '#eef2f6',
  glass: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  headerText: '#1565c0',
};

// --- COMPONENT ---

export default function PendenciasEstoquePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [items, setItems] = useState<PendenciaEstoque[]>([]);
  const [filtered, setFiltered] = useState<PendenciaEstoque[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // --- FULLSCREEN STATE ---
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | -90>(0);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);

  const inFlightRef = useRef(false);

  // Printing Control
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

  const showSnack = useCallback((msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarOpen(true);
  }, []);

  const withTimeout = useCallback(async <T,>(p: Promise<T>, ms: number, msg = 'Timeout') => {
    return await Promise.race<T>([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
    ]);
  }, []);

  // --- FETCH DATA ---
  const fetchData = useCallback(
    async (mode: 'initial' | 'poll' | 'manual' = 'poll') => {
      if (inFlightRef.current) return;

      try {
        inFlightRef.current = true;
        if (mode === 'initial') setLoading(true);
        else if (mode === 'manual') setLoadingRefresh(true);

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
        if (mode === 'manual') showSnack('Lista atualizada com sucesso.');
      } catch (e: any) {
        setErro(e?.message ?? 'Erro ao carregar lista');
        if (mode === 'manual') showSnack('Erro ao atualizar lista.');
      } finally {
        inFlightRef.current = false;
        setLoading(false);
        setLoadingRefresh(false);
      }
    },
    [LIST_URL, showSnack],
  );

  // --- PRINTING LOGIC ---
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
      setTimeout(() => {
        URL.revokeObjectURL(url);
        iframe.remove();
      }, 180_000);
    };
  }, []);

  const handleImprimir = useCallback(
    async (item: PendenciaEstoque) => {
      const id = makeId(item);
      if (printingId) return;

      try {
        setPrintingId(id);
        showSnack('Gerando impressão...');
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
        openPrintIframeFromBlob(blob);
        
        try {
          await withTimeout(
            marcarComoImpresso(item.nunota, item.sequencia, headers),
            15000,
            'Timeout ao marcar impresso',
          );
          showSnack('Impresso com sucesso!');
          await withTimeout(fetchData('manual'), 20000, 'Timeout ao atualizar lista');
        } catch (e) {
          console.error(e);
          setErro(e instanceof Error ? e.message : 'Erro ao atualizar status após impressão');
        }
      } catch (e: any) {
        console.error(e);
        setErro(e?.message ?? 'Erro ao imprimir');
        showSnack('Erro na impressão.');
      } finally {
        setPrintingId(null);
      }
    },
    [API_BASE, fetchData, makeId, marcarComoImpresso, openPrintIframeFromBlob, printingId, showSnack, withTimeout],
  );

  useEffect(() => { fetchData('initial'); }, [fetchData]);
  useEffect(() => {
    const id = window.setInterval(() => fetchData('poll'), POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchData]);

  // --- FILTER ---
  useEffect(() => {
    const term = q.trim().toUpperCase();
    const res = items.filter((n) => {
      if (!term) return true;
      return [n.nunota, n.numnota, n.parceiro, n.descrprod, n.vendedor]
        .some((x) => String(x).toUpperCase().includes(term));
    });
    setFiltered(res);
  }, [q, items]);

  // --- FULLSCREEN LOGIC ---
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

  const enterFullscreenWithRotation = useCallback(async (deg: 0 | 90 | -90) => {
    const el = tableWrapRef.current as any;
    if (!el) return;
    try {
      setRotation(deg);
      if (el.requestFullscreen) await el.requestFullscreen();
      // @ts-ignore
      if (screen?.orientation?.lock) await screen.orientation.lock('landscape');
    } catch (e) { console.error(e); }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
  }, []);

  const stageW = fullScreen ? vp.w : 0;
  const stageH = fullScreen ? vp.h : 0;
  const isRotated = Math.abs(rotation) === 90;
  const availW = fullScreen ? (isRotated ? stageH : stageW) : 0;
  const availH = fullScreen ? (isRotated ? stageW : stageH) : 0;

  useLayoutEffect(() => {
    if (!fullScreen || !contentRef.current) { setScale(1); return; }
    const calc = () => {
      const contentW = contentRef.current?.scrollWidth || 1;
      const w = Math.max(1, availW - 16);
      let next = w / contentW;
      next = Math.max(0.35, Math.min(2.2, next));
      setScale(next);
    };
    calc();
    const ro = new ResizeObserver(() => calc());
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, [fullScreen, rotation, availW, filtered.length]);

  if (!mounted) return <CircularProgress sx={{ m: 4 }} />;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: THEME.bgMain }}>
      <Box component="main" className="notranslate" sx={{ flexGrow: 1, height: '100vh', overflowY: 'auto', p: { xs: 0.5, md: 2 }, fontFamily: '"Roboto", sans-serif', background: `radial-gradient(circle at 50% -20%, #e3f2fd, ${THEME.bgMain})`, overflowX: 'hidden' }}>
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
               ...(fullScreen && rotation !== 0 ? { position: 'absolute', top: '50%', left: '50%', width: availW, height: availH, overflow: 'auto' } : { width: '100%', maxWidth: '1400px', mx: 'auto' })
             }}
          >
            {/* HEADER */}
            {!fullScreen && (
            <Paper 
              elevation={0}
              sx={{ 
                display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 2, p: 2, borderRadius: 4,
                bgcolor: THEME.glass, backdropFilter: 'blur(10px)', border: `1px solid ${THEME.glassBorder}`, boxShadow: '0 4px 30px rgba(0, 0, 0, 0.05)', gap: 2
              }}
            >
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', bgcolor: 'white', p: 1, borderRadius: 2 }}>
                      <img src="/logo-lid.png" alt="Lid" style={{ height: '50px', objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </Box>
               </Box>
               
               <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <TextField 
                    placeholder="Buscar..." size="small" value={q} onChange={e => setQ(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, sx: { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' } }}
                    sx={{ '& fieldset': { border: 'none' }, width: { xs: '100%', sm: 200 }, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }} 
                  />
                  
                  <Tooltip title="Atualizar">
                    <IconButton onClick={() => fetchData('manual')} sx={{ bgcolor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                      {loadingRefresh ? <CircularProgress size={20} /> : <RefreshIcon />}
                    </IconButton>
                  </Tooltip>
                  
                  {/* BOTÕES DE ROTAÇÃO RESTAURADOS */}
                  <Tooltip title="Tela Cheia Normal"><IconButton onClick={() => enterFullscreenWithRotation(0)} sx={{ bgcolor: '#37474f', color: 'white' }}><FullscreenIcon /></IconButton></Tooltip>
                  <Tooltip title="Girar 90°"><IconButton onClick={() => enterFullscreenWithRotation(90)} sx={{ bgcolor: '#37474f', color: 'white' }}><RotateLeftIcon /></IconButton></Tooltip>
                  <Tooltip title="Girar -90°"><IconButton onClick={() => enterFullscreenWithRotation(-90)} sx={{ bgcolor: '#37474f', color: 'white' }}><RotateRightIcon /></IconButton></Tooltip>
               </Box>
            </Paper>
            )}

            {fullScreen && (
               <IconButton onClick={exitFullscreen} sx={{ position: 'absolute', top: 10, right: 10, bgcolor: '#ffebee', color: '#d32f2f', zIndex: 10 }}><FullscreenExitIcon /></IconButton>
            )}

            {erro && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{erro}</Alert>}
            
            {loading ? (
               <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 8 }}>
                 <CircularProgress color="primary" size={60} thickness={4} />
                 <Typography sx={{ mt: 2, color: '#666', fontWeight: 500 }}>Carregando...</Typography>
               </Box>
            ) : (
              // TABELA SEM SCROLL HORIZONTAL (word-break e layout fixo)
              <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 3, overflowX: 'hidden' }}>
                <Table sx={{ width: '100%', tableLayout: 'auto' }} size="small" aria-label="tabela de pendencias">
                  <TableHead sx={{ bgcolor: '#eceff1' }}>
                    <TableRow>
                      <TableCell align="center" sx={{ fontWeight: 'bold', px: 0.5, fontSize: { xs: '0.7rem', md: '0.875rem' }, width: '12%' }}>NOTA</TableCell>
                      <TableCell align="left" sx={{ fontWeight: 'bold', px: 0.5, fontSize: { xs: '0.7rem', md: '0.875rem' } }}>PRODUTO</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', px: 0.5, fontSize: { xs: '0.7rem', md: '0.875rem' }, width: '12%' }}>PED</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', px: 0.5, fontSize: { xs: '0.7rem', md: '0.875rem' }, width: '12%' }}>EST</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', px: 0.5, width: '12%' }}>#</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((item, idx) => {
                       const id = makeId(item);
                       const isPrinting = printingId === id;
                       const isImpresso = String(item.adimpresso ?? '').trim().toUpperCase() === 'S';
                       const hasStockIssue = item.estoque_atual < item.qtd_negociada;
                       
                       const baseColor = isImpresso ? '#e0e0e0' : (item.bkcolor || '#ffffff');
                       const rowOpacity = isImpresso ? 0.6 : 1;

                       return (
                        <TableRow 
                          key={`${id}-${idx}`}
                          sx={{ 
                            bgcolor: baseColor,
                            opacity: rowOpacity,
                            '&:last-child td, &:last-child th': { border: 0 },
                          }}
                        >
                          {/* NUNOTA */}
                          <TableCell align="center" sx={{ px: 0.5, verticalAlign: 'top', pt: 1.5 }}>
                            <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>{item.nunota}</Typography>
                          </TableCell>

                          {/* DETALHES - Permite quebra de linha */}
                          <TableCell align="left" sx={{ px: 0.5, wordBreak: 'break-word', whiteSpace: 'normal', verticalAlign: 'top', pt: 1.5 }}>
                             <Typography variant="body2" fontWeight="bold" sx={{ lineHeight: 1.1, fontSize: { xs: '0.8rem', md: '1rem' } }}>
                                {item.descrprod}
                             </Typography>
                             <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 0.5, fontSize: { xs: '0.65rem', md: '0.75rem' }, lineHeight: 1.1 }}>
                                {item.parceiro.split(' ')[0]} <br /> {item.vendedor.split(' ')[0]}
                             </Typography>
                             <Box sx={{ mt: 0.5 }}>
                                <Chip label={item.codprod} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.5)' }} />
                             </Box>
                          </TableCell>

                          {/* PEDIDO */}
                          <TableCell align="center" sx={{ px: 0.5, verticalAlign: 'top', pt: 1.5 }}>
                             <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.8rem', md: '1rem' } }}>{item.qtd_negociada}</Typography>
                          </TableCell>

                          {/* ESTOQUE */}
                          <TableCell align="center" sx={{ px: 0.5, verticalAlign: 'top', pt: 1.5 }}>
                             <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: hasStockIssue ? 'error.main' : 'success.main' }}>
                                {hasStockIssue ? <WarningAmberIcon sx={{ fontSize: 16 }} /> : <CheckCircleIcon sx={{ fontSize: 16 }} />}
                                <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.8rem', md: '1rem' } }}>{item.estoque_atual}</Typography>
                             </Box>
                          </TableCell>

                          {/* AÇÃO */}
                          <TableCell align="center" sx={{ px: 0.5, verticalAlign: 'top', pt: 1 }}>
                            <IconButton 
                              onClick={() => handleImprimir(item)}
                              disabled={isPrinting}
                              color="primary"
                              size="small"
                              sx={{ 
                                bgcolor: 'white', 
                                boxShadow: 1,
                                width: 32, height: 32,
                                '&:hover': { bgcolor: '#f5f5f5' }
                              }}
                            >
                               {isPrinting ? <CircularProgress size={16} /> : <PrintIcon fontSize="small" />}
                            </IconButton>
                          </TableCell>
                        </TableRow>
                       );
                    })}
                    
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                           <Typography variant="body1" color="textSecondary">Nenhum item.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            
            {!fullScreen && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4, opacity: 0.5 }}>
                 <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#546e7a' }}>ELETRO FARIAS</Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSnackbarOpen(false)} severity={erro ? "error" : "success"} variant="filled" sx={{ width: '100%', fontWeight: 'bold' }}>{snackbarMsg}</Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}