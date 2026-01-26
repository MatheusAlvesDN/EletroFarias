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
  Button,
  Snackbar,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography
} from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';

// --- TIPAGENS ---

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
};

// ✅ TIPAGEM ATUALIZADA DOS ITENS
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

const POLL_MS = 5000;

// --- UTILITÁRIOS ---

const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));

const parseDtHrToDate = (dt: string, hr: any): Date | null => {
  if (!dt) return null;
  const time = hr ? String(hr).trim() : '00:00:00';
  let datePart = String(dt).split('T')[0];
  if(datePart.length === 8 && !datePart.includes('-')) {
     datePart = `${datePart.substring(4,8)}-${datePart.substring(2,4)}-${datePart.substring(0,2)}`;
  }
  
  const d = new Date(`${datePart}T${time}`);
  return Number.isFinite(d.getTime()) ? d : null;
};

const formatElapsed = (ms: number) => {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  
  if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return `${days}d ${remHours}h`;
  }
  return `${hh}:${mm}:${ss}`;
};

const tempoDecorrido = (dt: string, hr: string, nowMs: number) => {
  const dateObj = parseDtHrToDate(dt, hr);
  if (!dateObj) return '-';
  return formatElapsed(nowMs - dateObj.getTime());
};

const stableHash = (list: PedidoExpedicao[]) =>
  JSON.stringify(list.map((x) => [x.NUNOTA, x.DTALTER, x.HRALTER, x.STATUS_NOTA, x.BKCOLOR]));

export default function PainelExpedicaoPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [items, setItems] = useState<PedidoExpedicao[]>([]);
  const [filtered, setFiltered] = useState<PedidoExpedicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Filtros
  const [q, setQ] = useState('');
  const [onlyEC, setOnlyEC] = useState(false); 
  const [onlyRL, setOnlyRL] = useState(false); 
  const [onlyEI, setOnlyEI] = useState(false); 

  // Fullscreen e Rotação
  const [fullScreen, setFullScreen] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | -90>(0);
  const [vp, setVp] = useState({ w: 0, h: 0 });

  // Modal de Itens
  const [modalOpen, setModalOpen] = useState(false);
  const [itensNota, setItensNota] = useState<ItemNota[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [selectedNota, setSelectedNota] = useState<number | null>(null);

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
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const inFlightRef = useRef(false);
  const lastHashRef = useRef<string>('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const LIST_URL = `${API_URL}/sync/pedidosLid`;
  const ITENS_URL = `${API_URL}/sync/listarItensNotaLid`;

  const showSnack = useCallback((msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarOpen(true);
  }, []);

  // --- FETCH PEDIDOS (PRINCIPAL) ---
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

        // Mapeamento Lista Principal
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

  // --- ✅ FUNÇÃO DO BOTÃO "VER ITENS" ATUALIZADA ---
  const handleOpenItens = async (nunota: number) => {
      setSelectedNota(nunota);
      setModalOpen(true);
      setLoadingItens(true);
      setItensNota([]);

      try {
          // Chamada GET para /sync/listarItensNotaLid?nunota=123
          const resp = await fetch(`${ITENS_URL}?nunota=${nunota}`, {
              headers: { 'Content-Type': 'application/json' }
          });
          
          if (!resp.ok) throw new Error('Falha ao buscar itens');
          
          const rawData = await resp.json();
          const rawArr = Array.isArray(rawData) ? rawData : [];

          const mappedItens: ItemNota[] = rawArr.map((row: any) => {
              if(!Array.isArray(row)) return row;
              return {
                  NUNOTA: row[0],
                  NUMNOTA: row[1],
                  DESCROPER: row[2],
                  DTALTER: row[4],
                  HRALTER: row[5],
                  PARCEIRO: row[7],
                  VENDEDOR: row[6],
                  DESCRPROD: row[12],
                  ESTOQUE_ATUAL: row[14],
                  QTD_NEGOCIADA: row[15],
                  QTD_PENDENTE_CALC: row[15]-row[14]
              };
          });

          setItensNota(mappedItens);

      } catch (error) {
          console.error(error);
          showSnack('Erro ao carregar itens da nota.');
      } finally {
          setLoadingItens(false);
      }
  };

  useEffect(() => { fetchData('initial'); }, [fetchData]);
  useEffect(() => {
    const id = window.setInterval(() => fetchData('poll'), POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchData]);

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

  // Fullscreen Logic
  useEffect(() => {
    const onFsChange = () => {
      setFullScreen(!!document.fullscreenElement);
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
    } catch (e) {
      console.error(e);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
      if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
      }
  }, []);

  // Scale Logic
  const stageW = fullScreen ? vp.w : 0;
  const stageH = fullScreen ? vp.h : 0;
  const isRotated = Math.abs(rotation) === 90;
  const rotW = fullScreen ? (isRotated ? stageH : stageW) : 0; 
  const rotH = fullScreen ? (isRotated ? stageW : stageH) : 0;

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
      next = Math.max(0.35, Math.min(2.2, next));
      setScale(next);
    };
    calc();
    const ro = new ResizeObserver(() => calc());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullScreen, rotation, rotW, items.length]);

  const cellTextSx = useMemo(() => ({
      fontWeight: 500, color: 'inherit', lineHeight: 1.1, fontSize: fullScreen ? '1.1em' : '0.95em',
  }), [fullScreen]);

  if (!mounted) return <CircularProgress sx={{ m: 4 }} />;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: '#f0f4f8' }}>
      <Box component="main" sx={{ flexGrow: 1, height: '100vh', overflow: 'hidden', p: { xs: 1, sm: 2 } }}>
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
          <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, height: '100%', paddingBottom: '16px !important' }}>
            
            {/* Header com GRID */}
            <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' }, 
                gap: 2,
                alignItems: 'center'
            }}>
                <Box sx={{ display: { xs: 'none', md: 'block' } }} />

                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <img 
                        src="/logo-lid.png" 
                        alt="Lid Iluminação" 
                        style={{ height: '100px', objectFit: 'contain' }} 
                    />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' }, gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="outlined" onClick={() => fetchData('manual')} disabled={loading || loadingRefresh} sx={{ height: 40 }}>
                        {loadingRefresh ? <CircularProgress size={20} /> : 'Atualizar'}
                    </Button>

                    <Button variant="outlined" startIcon={<FullscreenIcon />} onClick={() => enterFullscreenWithRotation(0)} title="Tela Cheia Padrão" sx={{ height: 40 }}>
                        Normal
                    </Button>
                    <Button variant="outlined" startIcon={<RotateLeftIcon />} onClick={() => enterFullscreenWithRotation(90)} title="Girar 90 Graus" sx={{ height: 40 }}>
                        90°
                    </Button>
                    <Button variant="outlined" startIcon={<RotateRightIcon />} onClick={() => enterFullscreenWithRotation(-90)} title="Girar -90 Graus" sx={{ height: 40 }}>
                        -90°
                    </Button>

                    {fullScreen && <Button color="error" variant="contained" onClick={exitFullscreen} sx={{ height: 40 }}>Sair</Button>}
                </Box>
            </Box>

            {/* Filtros */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField 
                    size="small" placeholder="Filtrar..." value={q} onChange={e => setQ(e.target.value)}
                    sx={{ flexGrow: 1 }}
                />
                <Chip label="Em Loja" color={onlyEI ? 'success' : 'default'} onClick={() => { setOnlyEI(!onlyEI); setOnlyEC(false); setOnlyRL(false); }} />
                <Chip label="Retira" color={onlyRL ? 'warning' : 'default'} onClick={() => { setOnlyRL(!onlyRL); setOnlyEC(false); setOnlyEI(false); }} />
                <Chip label="Entrega" color={onlyEC ? 'error' : 'default'} onClick={() => { setOnlyEC(!onlyEC); setOnlyEI(false); setOnlyRL(false); }} />
            </Box>
            
            {erro && <Alert severity="error">{erro}</Alert>}
            <Divider />

            {/* Container da Tabela */}
            <TableContainer 
                component={Paper} ref={tableWrapRef} elevation={0}
                sx={{ 
                    flex: 1, 
                    overflowX: 'hidden', 
                    overflowY: 'auto',
                    bgcolor: 'background.paper',
                    '&:fullscreen': { width: '100vw', height: '100vh', p: 0, overflow: 'hidden' }
                }}
            >
                <Box sx={fullScreen ? {
                    position: 'absolute', top: '50%', left: '50%',
                    width: `${rotW}px`, height: `${rotH}px`,
                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                    transformOrigin: 'center', 
                    overflowX: 'hidden', 
                    overflowY: 'auto',
                    bgcolor: 'background.paper'
                } : { height: '100%', overflowX: 'hidden', overflowY: 'auto' }}>
                    
                    <Box ref={contentRef} sx={{ 
                        transform: fullScreen ? `scale(${scale})` : 'none', 
                        transformOrigin: 'top left',
                        width: '100%' 
                    }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow sx={{ '& th': { fontWeight: 'bold', bgcolor: '#fafafa', fontSize: '1.1em' }}}>
                                    <TableCell>Prioridade</TableCell>
                                    <TableCell>NF / Único</TableCell>
                                    <TableCell>Parceiro</TableCell>
                                    <TableCell>Vendedor</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Conferência</TableCell>
                                    <TableCell>Entrega</TableCell>
                                    <TableCell>Espera</TableCell>
                                    <TableCell align="center">Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                            <Typography variant="h6" color="text.secondary">Nenhuma pendência encontrada</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((row) => (
                                        <TableRow key={row.NUNOTA} sx={{ 
                                            bgcolor: row.BKCOLOR, 
                                            '& td': { color: row.FGCOLOR, borderColor: 'rgba(0,0,0,0.1)' },
                                            '&:hover': { filter: 'brightness(0.95)' }
                                        }}>
                                            <TableCell>
                                                <Typography sx={cellTextSx}>
                                                    {row.AD_TIPODEENTREGA} {row.CODTIPOPER === 322 ? ' (322)' : ''}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={cellTextSx} style={{ fontSize: '1.2em' }}>{row.NUMNOTA}</Typography>
                                                <Typography variant="caption" sx={{ opacity: 0.8 }}>{row.NUNOTA}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={cellTextSx} style={{ textTransform: 'uppercase' }}>
                                                    {row.PARCEIRO?.substring(0, 35)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={cellTextSx}>{row.VENDEDOR?.split(' ')[0]}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip size="small" label={row.STATUS_NOTA_DESC} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.4)' }} />
                                            </TableCell>
                                            <TableCell><Typography sx={cellTextSx}>{row.STATUS_CONFERENCIA_DESC || '-'}</Typography></TableCell>
                                            <TableCell><Typography sx={{ fontWeight: 'bold' }}>{row.TIPO_ENTREGA}</Typography></TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontWeight: 'bold', fontSize: '1.2em' }}>
                                                    {tempoDecorrido(row.DTALTER, row.HRALTER, nowMs)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Button 
                                                    variant="contained" 
                                                    size="small" 
                                                    color="primary"
                                                    onClick={() => handleOpenItens(row.NUNOTA)}
                                                    sx={{ minWidth: '40px', px: 1, bgcolor: 'rgba(0,0,0,0.2)', '&:hover': { bgcolor: 'rgba(0,0,0,0.4)' } }}
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                </Box>
            </TableContainer>

            {/* MODAL DE ITENS - ATUALIZADO PARA EXIBIR COLUNAS RELEVANTES */}
            <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Itens do Pedido {selectedNota}
                    <IconButton onClick={() => setModalOpen(false)}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {loadingItens ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Produto</TableCell>
                                    <TableCell align="center">Qtd. Neg.</TableCell>
                                    <TableCell align="center">Estoque</TableCell>
                                    <TableCell align="center">Pendente</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {itensNota.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">Nenhum item encontrado.</TableCell>
                                    </TableRow>
                                ) : (
                                    itensNota.map((item, idx) => (
                                        <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}>
                                            <TableCell>{item.DESCRPROD}</TableCell>
                                            <TableCell align="center">{item.QTD_NEGOCIADA}</TableCell>
                                            <TableCell align="center">{item.ESTOQUE_ATUAL}</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', color: item.QTD_PENDENTE_CALC > 0 ? 'error.main' : 'inherit' }}>
                                                {item.QTD_PENDENTE_CALC}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalOpen(false)}>Fechar</Button>
                </DialogActions>
            </Dialog>

          </CardContent>
        </Card>
      </Box>

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity="success" variant="filled">{snackbarMsg}</Alert>
      </Snackbar>
    </Box>
  );
}