'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import {
  Box,
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
  Chip,
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  ScreenRotation as RotationIcon,
} from '@mui/icons-material';

// --- Interfaces ---

/**
 * Estrutura de dados NotaExpedicaoRow conforme solicitado
 */
interface NotaExpedicaoRow {
  nunota: number;
  ordemLinha: number;
  dtneg: string;
  hrneg: string;
  statusNota: string;
  statusConferenciaCod: string | null;
  qtdRegConferencia: number;
  bkcolor: string;
  fgcolor: string;
  vlrnota: number;
  adTipoDeEntrega: string | null;
  codvend: number;
  vendedor: string;
}

interface Viewport {
  w: number;
  h: number;
}

// --- Utils ---

const POLL_MS = 5000;

const safeStr = (v: any): string => (v == null || v === '' ? '-' : String(v));
const safeNum = (v: any): number => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Formatação de moeda para o valor da nota
const formatCurrency = (v: number) => {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const toDateBR = (v: string): string => {
  if (!v) return '-';
  const s = String(v).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const m1 = s.match(/^(\d{2})(\d{2})(\d{4})(?:\s|$)/);
  if (m1) return `${m1[1]}/${m1[2]}/${m1[3]}`;
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return `${m2[3]}/${m2[2]}/${m2[1]}`;
  return s;
};

const normalizeHr = (hr: any): string | null => {
  if (hr == null || hr === '') return null;
  const s = String(hr).trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(s)) return s.length === 5 ? `${s}:00` : s;
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
  if (br) return new Date(`${br[3]}-${br[2]}-${br[1]}T${hr}`);
  const m1 = d.match(/^(\d{2})(\d{2})(\d{4})/);
  if (m1) return new Date(`${m1[3]}-${m1[2]}-${m1[1]}T${hr}`);
  const m2 = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return new Date(`${m2[1]}-${m2[2]}-${m2[3]}T${hr}`);
  return null;
};

const formatElapsed = (ms: number): string => {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  
  const days = Math.floor(totalSec / 86400); 
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  if (days > 0) {
    return `${days}d ${hh}:${mm}:${ss}`;
  }
  
  return `${hh}:${mm}:${ss}`;
};

const corPri = (bk: string | null | undefined): number => {
  const s = String(bk ?? '').trim().toUpperCase();
  if (s.includes('2E7D32') || s.includes('46, 125, 50')) return 1; // verde
  if (s.includes('1976D2') || s.includes('25, 118, 210')) return 2; // azul
  if (s.includes('F9A825') || s.includes('249, 168, 37')) return 3; // amarelo
  if (s.includes('C62828') || s.includes('198, 40, 40')) return 4; // vermelho
  return 9;
};

const timeKey = (n: NotaExpedicaoRow): number => {
  const dt = parseDtHrToDate(n.dtneg, n.hrneg);
  return dt ? dt.getTime() : Number.POSITIVE_INFINITY;
};

// --- Estilos da Paleta Clara ---

const tvTheme = {
  bg: '#f8fafc',      
  card: '#ffffff',    
  text: '#1e293b',    
  textLight: '#64748b', 
  accent: '#0284c7',  
  border: '#e2e8f0',  
};

// --- Componente Principal ---

export default function App() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [items, setItems] = useState<NotaExpedicaoRow[]>([]);
  const [filtered, setFiltered] = useState<NotaExpedicaoRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingRefresh, setLoadingRefresh] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [q, setQ] = useState<string>('');
  
  const [onlyEC, setOnlyEC] = useState<boolean>(false);
  const [onlyRL, setOnlyRL] = useState<boolean>(false);
  const [onlyEI, setOnlyEI] = useState<boolean>(false);
  
  const [fullScreen, setFullScreen] = useState<boolean>(false);
  const [rotation, setRotation] = useState<90 | -90>(90);
  const [vp, setVp] = useState<Viewport>({ w: 0, h: 0 });
  const [scale, setScale] = useState<number>(1);
  
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string>('');

  const tableWrapRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef<boolean>(false);
  const aliveRef = useRef<boolean>(true);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      clearInterval(id);
      aliveRef.current = false;
    };
  }, []);

  const updateViewport = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  useEffect(() => {
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, [updateViewport]);

  const fetchData = useCallback(async (mode: 'initial' | 'poll' | 'manual' = 'poll') => {
    if (inFlightRef.current) return;
    try {
      inFlightRef.current = true;
      if (mode === 'initial') setLoading(true);
      else setLoadingRefresh(true);

      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token || API_TOKEN) headers.Authorization = `Bearer ${token || API_TOKEN}`;

      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
      const resp = await fetch(`${baseUrl}/sync/getNotasExpedicao`, { headers });
      
      if (!resp.ok) throw new Error(`Falha na API (Status ${resp.status})`);
      const rawData = await resp.json();
      
      if (!Array.isArray(rawData)) throw new Error('Dados inválidos recebidos da API');

      // Mapeamento direto para NotaExpedicaoRow
      const list: NotaExpedicaoRow[] = rawData.map((r: any) => ({
        nunota: safeNum(r.nunota),
        ordemLinha: safeNum(r.ordemLinha),
        dtneg: String(r.dtneg || ''),
        hrneg: String(r.hrneg || ''),
        statusNota: String(r.statusNota || ''),
        statusConferenciaCod: r.statusConferenciaCod || null,
        qtdRegConferencia: safeNum(r.qtdRegConferencia),
        bkcolor: r.bkcolor || '#ffffff',
        fgcolor: r.fgcolor || tvTheme.text,
        vlrnota: safeNum(r.vlrnota),
        adTipoDeEntrega: r.adTipoDeEntrega || null,
        codvend: safeNum(r.codvend),
        vendedor: String(r.vendedor || ''),
      }));

      const sorted = [...list].sort((a, b) => {
        const pa = corPri(a.bkcolor);
        const pb = corPri(b.bkcolor);
        if (pa !== pb) return pa - pb;
        const ta = timeKey(a);
        const tb = timeKey(b);
        if (ta !== tb) return ta - tb;
        return a.nunota - b.nunota;
      });

      if (aliveRef.current) setItems(sorted);
    } catch (e: any) {
      if (aliveRef.current) {
        setErro(e.message);
        setSnackbarMsg(e.message);
        setSnackbarOpen(true);
      }
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) {
        setLoading(false);
        setLoadingRefresh(false);
      }
    }
  }, []);

  useEffect(() => { fetchData('initial'); }, [fetchData]);
  useEffect(() => {
    const id = setInterval(() => fetchData('poll'), POLL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  // Filtros
  useEffect(() => {
    const term = q.trim().toUpperCase();
    const res = items.filter((n) => {
      if (onlyEC && String(n.adTipoDeEntrega ?? '').toUpperCase() !== 'EC') return false;
      if (onlyRL && String(n.adTipoDeEntrega ?? '').toUpperCase() !== 'RL') return false;
      if (onlyEI && String(n.adTipoDeEntrega ?? '').toUpperCase() !== 'EI') return false;
      if (!term) return true;
      const haystack = `${n.nunota} ${n.vendedor} ${n.statusNota} ${n.adTipoDeEntrega}`.toUpperCase();
      return haystack.includes(term);
    });
    setFiltered(res);
  }, [q, items, onlyEC, onlyRL, onlyEI]);

  const orderByTipoMap = useMemo(() => {
    const counters: Record<string, number> = {};
    const m = new Map<number, number>();
    for (const n of filtered) {
      const tipo = String(n.adTipoDeEntrega ?? '-').toUpperCase();
      counters[tipo] = (counters[tipo] ?? 0) + 1;
      m.set(n.nunota, counters[tipo]);
    }
    return m;
  }, [filtered]);

  // Fullscreen e Escala
  const stageW = fullScreen ? vp.w : 0;
  const stageH = fullScreen ? vp.h : 0;
  const rotW = fullScreen ? stageH : 0;
  const rotH = fullScreen ? stageW : 0;

  useLayoutEffect(() => {
    if (!fullScreen || !contentRef.current) { setScale(1); return; }
    const calc = () => {
      const contentW = contentRef.current?.scrollWidth || 1;
      const availW = Math.max(1, rotW - 32);
      let next = availW / contentW;
      next = Math.max(0.3, Math.min(2.5, next));
      setScale(next);
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, [fullScreen, rotation, rotW, rotH, filtered.length]);

  const toggleFs = async (deg: 90 | -90) => {
    const el = tableWrapRef.current as any;
    if (!el) return;
    setRotation(deg);
    if (!document.fullscreenElement) {
      try {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        setFullScreen(true);
      } catch (e) {
        console.error("Erro ao ativar ecrã inteiro", e);
      }
    } else {
      setRotation(deg);
    }
  };

  const exitFs = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setFullScreen(false);
  };

  useEffect(() => {
    const cb = () => setFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', cb);
    return () => document.removeEventListener('fullscreenchange', cb);
  }, []);

  if (!mounted) return null;

  return (
    <Box sx={{ 
      bgcolor: tvTheme.bg, 
      minHeight: '100vh', 
      color: tvTheme.text,
      fontFamily: '"Inter", "Roboto", sans-serif',
      p: fullScreen ? 0 : 3,
      overflowX: 'hidden'
    }}>
      {!fullScreen && (
        <Box sx={{ maxWidth: 1600, mx: 'auto', mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 300, letterSpacing: -1, color: tvTheme.text }}>
                Expedição <span style={{ color: tvTheme.accent, fontWeight: 700 }}>Live</span>
              </Typography>
              <Typography variant="body2" sx={{ color: tvTheme.textLight }}>
                Dashboard de Monitorização (Nova Estrutura)
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button 
                variant="contained" 
                startIcon={<RotationIcon />} 
                onClick={() => toggleFs(90)}
                sx={{ borderRadius: 2, bgcolor: tvTheme.accent, boxShadow: 'none' }}
              >
                90° Vertical
              </Button>
              <Button 
                variant="contained" 
                startIcon={<RotationIcon />} 
                onClick={() => toggleFs(-90)}
                sx={{ borderRadius: 2, bgcolor: tvTheme.accent, boxShadow: 'none' }}
              >
                -90° Vertical
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />} 
                onClick={() => fetchData('manual')}
                sx={{ borderRadius: 2, borderColor: tvTheme.border, color: tvTheme.text }}
              >
                {loadingRefresh ? '...' : 'Recarregar'}
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
            <MetricCard label="Notas Ativas" value={items.length} color={tvTheme.accent} />
            <MetricCard label="Filtradas" value={filtered.length} color="#f59e0b" />
            <MetricCard label="Conexão" value={loadingRefresh ? 'Sync...' : 'Ativa'} color="#10b981" />
          </Box>

          <Paper sx={{ p: 2, bgcolor: tvTheme.card, borderRadius: 3, border: `1px solid ${tvTheme.border}`, display: 'flex', gap: 2, alignItems: 'center', mb: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <TextField
              placeholder="Buscar nota, vendedor ou status..."
              variant="standard"
              fullWidth
              value={q}
              onChange={(e) => setQ(e.target.value)}
              InputProps={{ disableUnderline: true, sx: { color: tvTheme.text, fontSize: '1.1rem' } }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FilterChip label="EI" active={onlyEI} onClick={() => {setOnlyEI(!onlyEI); setOnlyEC(false); setOnlyRL(false);}} color="#10b981" />
              <FilterChip label="RL" active={onlyRL} onClick={() => {setOnlyRL(!onlyRL); setOnlyEI(false); setOnlyEC(false);}} color="#f59e0b" />
              <FilterChip label="EC" active={onlyEC} onClick={() => {setOnlyEC(!onlyEC); setOnlyEI(false); setOnlyRL(false);}} color="#ef4444" />
            </Box>
          </Paper>
        </Box>
      )}

      {fullScreen && (
         <Button 
          variant="contained" 
          onClick={exitFs}
          sx={{ 
            position: 'absolute', 
            top: 10, 
            right: 10, 
            zIndex: 9999, 
            opacity: 0.2, 
            '&:hover': { opacity: 0.8 },
            bgcolor: 'rgba(0,0,0,0.5)',
            color: 'white'
          }}
        >
          Sair
        </Button>
      )}

      <TableContainer
        ref={tableWrapRef}
        sx={{
          mx: 'auto',
          maxWidth: fullScreen ? 'none' : 1600,
          borderRadius: fullScreen ? 0 : 4,
          overflow: 'hidden',
          position: 'relative',
          height: fullScreen ? '100vh' : 'auto',
          bgcolor: tvTheme.bg,
          boxShadow: fullScreen ? 'none' : '0 10px 25px -5px rgba(0,0,0,0.05)',
        }}
      >
        <Box sx={fullScreen ? {
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${rotW}px`,
          height: `${rotH}px`,
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          transformOrigin: 'center',
          overflow: 'auto',
          bgcolor: tvTheme.bg,
        } : {}}>
          
          <Box ref={contentRef} sx={{ 
            transform: `scale(${scale})`, 
            transformOrigin: 'top left',
            p: fullScreen ? 4 : 0,
            width: 'fit-content'
          }}>
            
            <Table stickyHeader sx={{ borderCollapse: 'separate', borderSpacing: '0 8px', minWidth: fullScreen ? 1400 : 0 }}>
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: tvTheme.bg, color: tvTheme.textLight, border: 'none', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 600, py: 2 } }}>
                  <TableCell width={60}>Pos</TableCell>
                  <TableCell width={120}>NUNOTA</TableCell>
                  <TableCell>Vendedor</TableCell>
                  <TableCell>Status da Nota</TableCell>
                  <TableCell align="right">Valor Nota</TableCell>
                  <TableCell align="right">Registros</TableCell>
                  <TableCell align="right">Tempo Espera</TableCell>
                  <TableCell align="right">Data/Hora</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((n) => (
                  <TableRow 
                    key={n.nunota}
                    sx={{ 
                      '& td': { 
                        border: 'none', 
                        py: 3, 
                        fontSize: '1.4rem',
                        transition: 'all 0.2s',
                        color: tvTheme.text
                      }
                    }}
                  >
                    <TVRowCell n={n} index={orderByTipoMap.get(n.nunota) || 0} nowMs={nowMs} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filtered.length === 0 && !loading && (
              <Box sx={{ textAlign: 'center', py: 20, opacity: 0.2, width: fullScreen ? rotW : '100%' }}>
                <Typography variant="h2" sx={{ color: tvTheme.text }}>SEM DADOS PARA EXIBIR</Typography>
              </Box>
            )}
            
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 10, width: '100%' }}>
                <CircularProgress sx={{ color: tvTheme.accent }} />
              </Box>
            )}
          </Box>
        </Box>
      </TableContainer>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert severity={erro ? "error" : "success"} variant="filled">
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// --- Sub-componentes ---

function MetricCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Paper sx={{ p: 2, bgcolor: tvTheme.card, borderRadius: 3, borderLeft: `6px solid ${color}`, borderTop: `1px solid ${tvTheme.border}`, borderRight: `1px solid ${tvTheme.border}`, borderBottom: `1px solid ${tvTheme.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
      <Typography variant="caption" sx={{ color: tvTheme.textLight, fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>{label}</Typography>
      <Typography variant="h4" sx={{ color: tvTheme.text, fontWeight: 800 }}>{value}</Typography>
    </Paper>
  );
}

function FilterChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <Chip 
      label={label} 
      onClick={onClick}
      sx={{ 
        bgcolor: active ? color : 'transparent',
        color: active ? '#ffffff' : tvTheme.textLight,
        fontWeight: 700,
        border: `1px solid ${active ? color : tvTheme.border}`,
        '&:hover': { bgcolor: active ? color : 'rgba(0,0,0,0.05)' }
      }}
    />
  );
}

function TVRowCell({ n, index, nowMs }: { n: NotaExpedicaoRow; index: number; nowMs: number }) {
  const tempoSep = useMemo(() => {
    const dt = parseDtHrToDate(n.dtneg, n.hrneg);
    return dt ? formatElapsed(nowMs - dt.getTime()) : '--:--:--';
  }, [n.dtneg, n.hrneg, nowMs]);

  const getLightStatusColor = (hex: string) => {
    if (hex.toUpperCase() === '#FFFFFF') return '#ffffff';
    return hex + '1a'; 
  };

  const statusColor = n.bkcolor;
  const isNeutral = statusColor.toUpperCase() === '#FFFFFF';

  return (
    <>
      {/* Posição/Index com barra lateral de status */}
      <TableCell sx={{ 
        bgcolor: getLightStatusColor(statusColor), 
        borderLeft: `10px solid ${isNeutral ? tvTheme.border : statusColor} !important`, 
        borderRadius: '20px 0 0 20px',
        boxShadow: isNeutral ? 'none' : `inset 4px 0 10px -5px ${statusColor}`
      }}>
        <Typography sx={{ fontWeight: 800, opacity: 0.4 }}>{index}</Typography>
      </TableCell>
      
      {/* NUNOTA */}
      <TableCell sx={{ bgcolor: getLightStatusColor(statusColor) }}>
        <Typography sx={{ fontWeight: 700, color: isNeutral ? tvTheme.accent : statusColor }}>{n.nunota}</Typography>
      </TableCell>
      
      {/* Vendedor */}
      <TableCell sx={{ bgcolor: getLightStatusColor(statusColor) }}>
        <Typography sx={{ fontWeight: 500, color: tvTheme.text }}>{safeStr(n.vendedor)}</Typography>
      </TableCell>
      
      {/* Status da Nota */}
      <TableCell sx={{ bgcolor: getLightStatusColor(statusColor) }}>
        <Typography sx={{ fontSize: '1.2rem', color: isNeutral ? tvTheme.text : statusColor, fontWeight: 600 }}>
          {safeStr(n.statusNota)}
        </Typography>
      </TableCell>
      
      {/* Valor da Nota (Novo campo exibido) */}
      <TableCell align="right" sx={{ bgcolor: getLightStatusColor(statusColor) }}>
        <Typography sx={{ fontSize: '1.2rem', color: tvTheme.text, fontWeight: 500 }}>
          {formatCurrency(n.vlrnota)}
        </Typography>
      </TableCell>
      
      {/* Quantidade de Registros */}
      <TableCell align="right" sx={{ bgcolor: getLightStatusColor(statusColor) }}>
        <Typography sx={{ fontSize: '1.1rem', color: tvTheme.textLight }}>{n.qtdRegConferencia} itens</Typography>
      </TableCell>
      
      {/* Tempo de Espera (Destaque) */}
      <TableCell align="right" sx={{ bgcolor: getLightStatusColor(statusColor) }}>
        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: '1.8rem', color: tvTheme.accent }}>
          {tempoSep}
        </Typography>
      </TableCell>
      
      {/* Data e Hora */}
      <TableCell align="right" sx={{ bgcolor: getLightStatusColor(statusColor), borderRadius: '0 20px 20px 0' }}>
        <Typography sx={{ fontSize: '1rem', color: tvTheme.textLight }}>
          {toDateBR(n.dtneg)} {safeStr(n.hrneg)}
        </Typography>
      </TableCell>
    </>
  );
}