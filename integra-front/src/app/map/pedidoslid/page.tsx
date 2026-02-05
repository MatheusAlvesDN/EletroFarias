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
  GlobalStyles,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Fade,
  Collapse,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from '@mui/material';

// --- ICONS ---
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PrintIcon from '@mui/icons-material/Print';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// --- TYPES ---

type PedidoExpedicao = {
  NUNOTA: number;
  NUMNOTA: number;
  CODTIPOPER: number;
  DESCROPER: string;
  DTALTER: string;
  HRALTER: string;
  CODPARC: number;
  PARCEIRO: string;
  CODVEND: number;
  VENDEDOR: string;
  TIPONEGOCIACAO: string;
  AD_TIPODEENTREGA: string;
  TIPO_ENTREGA: string;
  STATUS_NOTA: string;
  STATUS_NOTA_DESC: string;
  STATUS_CONFERENCIA_DESC: string | null;
  BKCOLOR: string;
  FGCOLOR: string;
  ORDEM_TIPO_PRI: number;
  CODPROD: number;
};

type ItemNota = {
  NUNOTA: number;
  NUMNOTA: number;
  DESCROPER: string;
  DTALTER: string;
  HRALTER: string;
  PARCEIRO: string;
  VENDEDOR: string;
  DESCRPROD: string;
  ESTOQUE_ATUAL: number;
  QTD_NEGOCIADA: number;
  QTD_PENDENTE_CALC: number;
};

// --- CONFIG ---
const POLL_MS = 5000;

// --- HELPERS ---
const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));
const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const parseDtHrToDate = (dt: string, hr: any): Date | null => {
  if (!dt) return null;
  const time = hr ? String(hr).trim() : '00:00:00';
  let datePart = String(dt).split('T')[0];
  if (datePart.length === 8 && !datePart.includes('-')) {
    datePart = `${datePart.substring(4, 8)}-${datePart.substring(2, 4)}-${datePart.substring(0, 2)}`;
  }
  const d = new Date(`${datePart}T${time}`);
  return Number.isFinite(d.getTime()) ? d : null;
};

const formatElapsed = (ms: number) => {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  
  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }
  return `${hh}h ${mm}m`;
};

const tempoDecorrido = (dt: string, hr: string, nowMs: number) => {
  const dateObj = parseDtHrToDate(dt, hr);
  if (!dateObj) return '-';
  return formatElapsed(nowMs - dateObj.getTime());
};

const stableHash = (list: PedidoExpedicao[]) =>
  JSON.stringify(list.map((x) => [x.NUNOTA, x.DTALTER, x.HRALTER, x.STATUS_NOTA, x.BKCOLOR]));

// --- THEME ---
const THEME = {
  bgMain: '#eef2f6',
  glass: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  headerText: '#1565c0',
};

// --- COMPONENT ---

export default function ExpedicaoPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [items, setItems] = useState<PedidoExpedicao[]>([]);
  const [filtered, setFiltered] = useState<PedidoExpedicao[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const [q, setQ] = useState('');
  const [onlyEC, setOnlyEC] = useState(false);
  const [onlyRL, setOnlyRL] = useState(false);
  const [onlyEI, setOnlyEI] = useState(false);

  const [fullScreen, setFullScreen] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | -90>(0);
  const [vp, setVp] = useState({ w: 0, h: 0 });

  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [loadingRows, setLoadingRows] = useState<Record<number, boolean>>({});
  const [itemsCache, setItemsCache] = useState<Record<number, ItemNota[]>>({});

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const inFlightRef = useRef(false);
  const lastHashRef = useRef<string>('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
  const LIST_URL = useMemo(() => (API_URL ? `${API_URL}/sync/pedidosLid` : `/sync/pedidosLid`), [API_URL]);
  const ITENS_URL = useMemo(() => (API_URL ? `${API_URL}/sync/listarItensNotaLid` : `/sync/listarItensNotaLid`), [API_URL]);
  const IMPRIMIR_URL = useMemo(() => (API_URL ? `${API_URL}/sync/imprimirEtiquetaLid` : `/sync/imprimirEtiquetaLid`), [API_URL]);

  const showSnack = useCallback((msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarOpen(true);
  }, []);

  // --- DATA FETCHING ---

  const fetchData = useCallback(
    async (mode: 'initial' | 'poll' | 'manual' = 'poll') => {
      if (inFlightRef.current) return;
      try {
        inFlightRef.current = true;
        if (mode === 'initial') setLoading(true);
        else if (mode === 'manual') setLoadingRefresh(true);
        setErro(null);

        const resp = await fetch(LIST_URL, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        });

        if (!resp.ok) throw new Error(`Status ${resp.status}`);

        const rawData = await resp.json();
        const rawList = Array.isArray(rawData) ? rawData : [];

        const list: PedidoExpedicao[] = rawList.map((row: any) => {
          if (!Array.isArray(row)) return row;
          return {
            BKCOLOR: row[0],
            FGCOLOR: row[1],
            ORDEM_TIPO_PRI: row[2],
            NUNOTA: row[5],
            NUMNOTA: row[6],
            CODTIPOPER: row[7],
            DESCROPER: row[8],
            DTALTER: row[9],
            HRALTER: row[10],
            CODPARC: row[11],
            PARCEIRO: row[12],
            CODVEND: row[14],
            VENDEDOR: row[15],
            TIPONEGOCIACAO: row[17],
            AD_TIPODEENTREGA: row[18],
            TIPO_ENTREGA: row[19],
            STATUS_NOTA: row[20],
            STATUS_NOTA_DESC: row[21],
            STATUS_CONFERENCIA_DESC: row[24],
          };
        });

        const sorted = [...list].sort((a, b) => {
          if (a.ORDEM_TIPO_PRI !== b.ORDEM_TIPO_PRI) return a.ORDEM_TIPO_PRI - b.ORDEM_TIPO_PRI;
          return b.NUNOTA - a.NUNOTA;
        });

        const newHash = stableHash(sorted);
        if (newHash !== lastHashRef.current) {
          lastHashRef.current = newHash;
          setItems(sorted);
        }
        if (mode === 'manual') showSnack('Atualizado com sucesso.');
      } catch (e: any) {
        console.error(e);
        if (mode === 'manual') setErro('Erro ao atualizar painel.');
      } finally {
        inFlightRef.current = false;
        setLoading(false);
        setLoadingRefresh(false);
      }
    },
    [LIST_URL, showSnack],
  );

  const handleToggleRow = async (nunota: number) => {
    const isCurrentlyOpen = !!expandedRows[nunota];
    setExpandedRows(prev => ({ ...prev, [nunota]: !isCurrentlyOpen }));

    if (!isCurrentlyOpen && !itemsCache[nunota]) {
      setLoadingRows(prev => ({ ...prev, [nunota]: true }));
      try {
        const resp = await fetch(`${ITENS_URL}?nunota=${nunota}`, {
          headers: { 'Content-Type': 'application/json' }
        });
        if (!resp.ok) throw new Error('Erro ao buscar itens');

        const rawData = await resp.json();
        const rawArr = Array.isArray(rawData) ? rawData : [];

        const mappedItens: ItemNota[] = rawArr.map((row: any) => {
          if (!Array.isArray(row)) return row;
          return {
            NUNOTA: row[5],
            NUMNOTA: row[6],
            DESCROPER: row[8],
            DTALTER: row[9],
            HRALTER: row[10],
            PARCEIRO: row[12],
            VENDEDOR: row[15],
            DESCRPROD: row[28],
            ESTOQUE_ATUAL: row[35],
            QTD_NEGOCIADA: row[32],
            QTD_PENDENTE_CALC: row[32] - row[35],
          };
        });

        setItemsCache(prev => ({ ...prev, [nunota]: mappedItens }));
      } catch (err) {
        console.error(err);
        showSnack('Erro ao carregar detalhes.');
      } finally {
        setLoadingRows(prev => ({ ...prev, [nunota]: false }));
      }
    }
  };

  const handleImprimirEtiqueta = useCallback(async (item: ItemNota, row: PedidoExpedicao) => {
    try {
      const params = new URLSearchParams({
        nunota: String(row.NUNOTA),
        parceiro: row.PARCEIRO,
        vendedor: row.VENDEDOR,
        descrprod: item.DESCRPROD,
        qtd_negociada: String(item.QTD_NEGOCIADA)
      });

      const resp = await fetch(`${IMPRIMIR_URL}?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!resp.ok) throw new Error('Erro ao gerar PDF');

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (!printWindow) {
        showSnack('Pop-up bloqueado. Ative para imprimir.');
      }
    } catch (err) {
      console.error(err);
      showSnack('Erro ao tentar imprimir etiqueta.');
    }
  }, [IMPRIMIR_URL, showSnack]);

  useEffect(() => { fetchData('initial'); }, [fetchData]);
  useEffect(() => {
    const id = window.setInterval(() => fetchData('poll'), POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchData]);

  // --- FILTERING ---

  useEffect(() => {
    const term = q.trim().toUpperCase();
    const res = items.filter((n) => {
      const tipoEntregaCod = String(n.AD_TIPODEENTREGA || '').toUpperCase();
      if (onlyEC && tipoEntregaCod !== 'EC') return false;
      if (onlyRL && tipoEntregaCod !== 'RL') return false;
      if (onlyEI && tipoEntregaCod !== 'EI') return false;

      if (!term) return true;
      const hay = [n.NUNOTA, n.NUMNOTA, n.PARCEIRO, n.VENDEDOR, n.STATUS_NOTA_DESC].map((x) => (x == null ? '' : String(x))).join(' ').toUpperCase();
      return hay.includes(term);
    });
    setFiltered(res);
  }, [q, items, onlyEC, onlyRL, onlyEI]);

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
  }, [fullScreen, rotation, availW, filtered.length, expandedRows]);

  if (!mounted) return <CircularProgress sx={{ m: 4 }} />;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: THEME.bgMain }}>
      <Box component="main" className="notranslate" sx={{ flexGrow: 1, height: '100vh', overflowY: 'auto', p: { xs: 1, md: 2 }, fontFamily: '"Roboto", sans-serif', background: `radial-gradient(circle at 50% -20%, #e3f2fd, ${THEME.bgMain})` }}>
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
            {/* HEADER GLASSMORPHISM */}
            {!fullScreen && (
            <Paper 
              elevation={0}
              sx={{ 
                display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 3, p: 2, borderRadius: 4,
                bgcolor: THEME.glass, backdropFilter: 'blur(10px)', border: `1px solid ${THEME.glassBorder}`, boxShadow: '0 4px 30px rgba(0, 0, 0, 0.05)', gap: 2
              }}
            >
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* LOGO LID */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', bgcolor: 'white', p: 1, borderRadius: 2 }}>
                      <img src="/logo-lid.png" alt="Lid" style={{ height: '70px', objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </Box>
               </Box>
               
               <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <TextField 
                    placeholder="Buscar nota, parceiro..." size="small" value={q} onChange={e => setQ(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, sx: { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' } }}
                    sx={{ '& fieldset': { border: 'none' }, minWidth: 200, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }} 
                  />
                  
                  {/* FILTROS CHIPS */}
                  <Chip label="Em Loja" color={onlyEI ? 'success' : 'default'} onClick={() => { setOnlyEI(!onlyEI); setOnlyEC(false); setOnlyRL(false); }} sx={{ fontWeight: 'bold' }} />
                  <Chip label="Retira" color={onlyRL ? 'warning' : 'default'} onClick={() => { setOnlyRL(!onlyRL); setOnlyEC(false); setOnlyEI(false); }} sx={{ fontWeight: 'bold' }} />
                  <Chip label="Entrega" color={onlyEC ? 'error' : 'default'} onClick={() => { setOnlyEC(!onlyEC); setOnlyEI(false); setOnlyRL(false); }} sx={{ fontWeight: 'bold' }} />

                  <Box sx={{ height: 24, width: 1, bgcolor: '#cfd8dc', mx: 1 }} />

                  <Tooltip title="Atualizar">
                    <IconButton onClick={() => fetchData('manual')} sx={{ bgcolor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                      {loadingRefresh ? <CircularProgress size={20} /> : <RefreshIcon />}
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Tela Cheia"><IconButton onClick={() => enterFullscreenWithRotation(0)} sx={{ bgcolor: '#37474f', color: 'white' }}><FullscreenIcon /></IconButton></Tooltip>
                  <Tooltip title="Girar 90°"><IconButton onClick={() => enterFullscreenWithRotation(90)} sx={{ bgcolor: '#37474f', color: 'white' }}><RotateLeftIcon /></IconButton></Tooltip>
                  <Tooltip title="Girar -90°"><IconButton onClick={() => enterFullscreenWithRotation(-90)} sx={{ bgcolor: '#37474f', color: 'white' }}><RotateRightIcon /></IconButton></Tooltip>
               </Box>
            </Paper>
            )}

            {fullScreen && (
               <IconButton onClick={exitFullscreen} sx={{ position: 'absolute', top: 10, right: 10, bgcolor: '#ffebee', color: '#d32f2f' }}><FullscreenExitIcon /></IconButton>
            )}

            {erro && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{erro}</Alert>}
            
            {loading ? (
               <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 8 }}>
                 <CircularProgress color="primary" size={60} thickness={4} />
                 <Typography sx={{ mt: 2, color: '#666', fontWeight: 500 }}>Carregando pedidos...</Typography>
               </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                 {/* CARD LIST */}
                 {filtered.map((row, idx) => {
                    const isExpanded = !!expandedRows[row.NUNOTA];
                    const isLoadingRow = !!loadingRows[row.NUNOTA];
                    const cachedItems = itemsCache[row.NUNOTA] || [];
                    
                    // Cores vindas do banco
                    const baseColor = row.BKCOLOR || '#ffffff';
                    const textColor = row.FGCOLOR || '#000000';
                    const timeElapsed = tempoDecorrido(row.DTALTER, row.HRALTER, nowMs);

                    return (
                      <Fade in key={row.NUNOTA} timeout={500}>
                        <Paper 
                          elevation={3}
                          sx={{ 
                            position: 'relative', 
                            display: 'flex', 
                            flexDirection: 'column',
                            // Usar cor de fundo sólida ou gradiente leve baseado no BKCOLOR
                            background: `linear-gradient(135deg, ${baseColor} 0%, ${baseColor} 70%, rgba(255,255,255,0.4) 100%)`,
                            color: textColor, 
                            borderRadius: 3, 
                            overflow: 'hidden', 
                            transition: 'all 0.3s',
                            border: '1px solid rgba(0,0,0,0.05)',
                            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 24px rgba(0,0,0,0.15)' }
                          }}
                        >
                           {/* CARD HEADER / SUMMARY */}
                           <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, p: 2, gap: 2, alignItems: 'center' }}>
                              
                              {/* PRIORITY / ORDER */}
                              <Box sx={{ 
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                width: { xs: '100%', md: 80 }, 
                                bgcolor: 'rgba(255,255,255,0.3)', borderRadius: 2, p: 1
                              }}>
                                 <Typography variant="caption" fontWeight="bold">ORDEM</Typography>
                                 <Typography variant="h4" sx={{ fontWeight: 800 }}>{row.ORDEM_TIPO_PRI}</Typography>
                              </Box>

                              {/* MAIN INFO */}
                              <Box sx={{ flex: 1, minWidth: { md: 300 }, width: '100%' }}>
                                 <Box sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
                                    <Chip label={`NÚNICO: ${row.NUNOTA}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }} />
                                    <Chip label={row.AD_TIPODEENTREGA} size="small" color={row.AD_TIPODEENTREGA === 'EC' ? 'error' : row.AD_TIPODEENTREGA === 'RL' ? 'warning' : 'success'} sx={{ fontWeight: 'bold' }} />
                                    {row.CODTIPOPER === 322 && <Chip label="322" size="small" sx={{ bgcolor: '#000', color: '#fff', fontWeight: 'bold' }} />}
                                 </Box>
                                 <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, textTransform: 'uppercase' }}>
                                    {row.PARCEIRO?.substring(0, 40)}
                                 </Typography>
                                 <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5, fontWeight: 500 }}>
                                    Vend: {row.VENDEDOR?.split(' ')[0]} | NF: {row.NUMNOTA}
                                 </Typography>
                              </Box>

                              {/* STATUS */}
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 200, alignItems: 'flex-start' }}>
                                 <Chip 
                                    label={row.STATUS_NOTA_DESC} 
                                    sx={{ width: '100%', bgcolor: 'rgba(0,0,0,0.1)', color: 'inherit', fontWeight: 'bold', justifyContent: 'flex-start', px: 1 }} 
                                 />
                                 <Chip 
                                    label={row.STATUS_CONFERENCIA_DESC || 'PENDENTE CONFERÊNCIA'} 
                                    sx={{ width: '100%', bgcolor: 'rgba(255,255,255,0.3)', color: 'inherit', fontWeight: 'bold', justifyContent: 'flex-start', px: 1 }} 
                                 />
                              </Box>

                              {/* TIME */}
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', minWidth: 100, bgcolor: 'rgba(255,255,255,0.25)', p: 1.5, borderRadius: 2 }}>
                                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <AccessTimeIcon fontSize="small" />
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>ESPERA</Typography>
                                 </Box>
                                 <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -1 }}>
                                    {timeElapsed}
                                 </Typography>
                              </Box>

                              {/* ACTION */}
                              <IconButton 
                                onClick={() => handleToggleRow(row.NUNOTA)}
                                sx={{ 
                                  bgcolor: 'white', color: '#333', 
                                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                  '&:hover': { bgcolor: '#f5f5f5' }
                                }}
                              >
                                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                           </Box>

                           {/* EXPANDED CONTENT (ITEMS) */}
                           <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                                 {isLoadingRow ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                       <CircularProgress size={24} sx={{ color: textColor }} />
                                    </Box>
                                 ) : (
                                    <Table size="small">
                                       <TableHead>
                                          <TableRow>
                                             <TableCell sx={{ fontWeight: 'bold', color: textColor }}>Produto</TableCell>
                                             <TableCell sx={{ fontWeight: 'bold', color: textColor }} align="center">Qtd</TableCell>
                                             <TableCell sx={{ fontWeight: 'bold', color: textColor }} align="center">Estoque</TableCell>
                                             <TableCell sx={{ fontWeight: 'bold', color: textColor }} align="center">Ação</TableCell>
                                          </TableRow>
                                       </TableHead>
                                       <TableBody>
                                          {cachedItems.length === 0 ? (
                                             <TableRow><TableCell colSpan={4} align="center">Nenhum item encontrado.</TableCell></TableRow>
                                          ) : (
                                             cachedItems.map((item, i) => (
                                                <TableRow key={i}>
                                                   <TableCell sx={{ color: textColor }}>{item.DESCRPROD}</TableCell>
                                                   <TableCell align="center" sx={{ color: textColor }}>{item.QTD_NEGOCIADA}</TableCell>
                                                   <TableCell align="center" sx={{ color: textColor }}>{item.ESTOQUE_ATUAL}</TableCell>
                                                   <TableCell align="center">
                                                      <Button 
                                                         size="small" 
                                                         variant="contained" 
                                                         startIcon={<PrintIcon />}
                                                         onClick={() => handleImprimirEtiqueta(item, row)}
                                                         sx={{ bgcolor: 'white', color: '#333', '&:hover': { bgcolor: '#eee' } }}
                                                      >
                                                         Etiqueta
                                                      </Button>
                                                   </TableCell>
                                                </TableRow>
                                             ))
                                          )}
                                       </TableBody>
                                    </Table>
                                 )}
                              </Box>
                           </Collapse>
                        </Paper>
                      </Fade>
                    );
                 })}
                 
                 {filtered.length === 0 && !loading && (
                    <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'transparent', boxShadow: 'none' }}>
                       <Typography variant="h5" color="textSecondary" sx={{ opacity: 0.5 }}>Nenhum pedido encontrado.</Typography>
                    </Paper>
                 )}
              </Box>
            )}
            
            {!fullScreen && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 6, opacity: 0.5 }}>
                 <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#546e7a' }}>ELETRO FARIAS &copy; {new Date().getFullYear()}</Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSnackbarOpen(false)} severity="success" variant="filled" sx={{ width: '100%', fontWeight: 'bold' }}>{snackbarMsg}</Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}