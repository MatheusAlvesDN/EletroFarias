'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  Typography,
  Button,
  Snackbar,
  Alert,
  Chip,
  GlobalStyles,
} from '@mui/material';

// --- TIPOS ---

type NotaTV = {
  ordemLinha: number;
  bkcolor: string;
  fgcolor: string;

  nunota: number;
  numnota: number;
  codtipoper: number;
  descroper: string;

  dtneg: string;
  hrneg?: string | number | null;

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

  isGhost?: boolean;
  ghostUntil?: number; 
};

// --- CONFIGURAÇÕES ---

const POLL_MS = 5000;
const GHOST_TIME_MS = 15000; 

// --- HELPERS ---

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
  const dt =
    parseDtHrToDate(n.dtneg, n.hrneg) ??
    parseDtHrToDate(toDateBR(n.dtneg), n.hrneg);
  return dt ? dt.getTime() : Number.POSITIVE_INFINITY;
};

const corPri = (n: NotaTV) => {
  if (n.isGhost) return 0;
  const s = String(n.bkcolor ?? '').trim().toUpperCase();
  if (s === '#2E7D32' || s.includes('46, 125, 50')) return 1;
  if (s === '#1976D2' || s.includes('25, 118, 210')) return 2;
  if (s === '#F9A825' || s.includes('249, 168, 37')) return 3;
  if (s === '#C62828' || s.includes('198, 40, 40')) return 4;
  return 9;
};

// --- COMPONENTE PRINCIPAL ---

export default function Page() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [items, setItems] = useState<NotaTV[]>([]);
  const [ghosts, setGhosts] = useState<NotaTV[]>([]);
  const [filtered, setFiltered] = useState<NotaTV[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [onlyEC, setOnlyEC] = useState(false);
  const [onlyRL, setOnlyRL] = useState(false);
  const [onlyEI, setOnlyEI] = useState(false);

  const [fullScreen, setFullScreen] = useState(false);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  
  const [token, setToken] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const lastHashRef = useRef<string>('');
  const aliveRef = useRef(true);
  
  const prevItemsMapRef = useRef<Map<number, NotaTV>>(new Map());
  const isFirstLoadRef = useRef(true);

  // --- ÁUDIO ---
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1;
    // Usa voz padrão do sistema
    window.speechSynthesis.speak(utterance);
  }, []);

  // --- EFEITOS ---

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    setToken(t);
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setGhosts((prev) => {
        const now = Date.now();
        const valid = prev.filter(g => (g.ghostUntil || 0) > now);
        return valid.length !== prev.length ? valid : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateViewport = useCallback(() => {
    void window.innerWidth;
    void window.innerHeight;
  }, []);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);
  const LIST_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getNotasLoja` : `/sync/getNotasLoja`), [API_BASE]);

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
            throw new Error(`Falha API: ${resp.status}`);
        }

        const data = (await resp.json()) as any[] | null;
        const rawList = Array.isArray(data) ? data : [];

        const list: NotaTV[] = rawList.map((r: any) => {
          const adTipo =
            r.adTipoDeEntrega ?? r.AD_TIPODEENTREGA ?? r.ad_tipodeentrega ??
            r.AD_TIPO_DE_ENTREGA ?? r.ad_tipo_de_entrega ?? null;

          const ordem =
            r.ordemLinha ?? r.ORDEM_LINHA ?? r.ORDEM_TIPO ?? r.ordem_tipo ??
            r.ORDEM_GERAL ?? r.ordem_geral ?? 0;

          const hrneg = r.hrneg ?? r.HRNEG ?? r.hrNeg ?? r.HR_NEG ?? r.hr_neg ?? r.HRNEGO ?? null;

          return {
            ordemLinha: safeNum(ordem),
            bkcolor: r.bkcolor ?? r.BKCOLOR ?? '#FFFFFF',
            fgcolor: r.fgcolor ?? r.FGCOLOR ?? '#000000',
            nunota: safeNum(r.nunota ?? r.NUNOTA),
            numnota: safeNum(r.numnota ?? r.NUMNOTA),
            codtipoper: safeNum(r.codtipoper ?? r.CODTIPOPER),
            descroper: String(r.descroper ?? r.DESCROPER ?? ''),
            dtneg: String(r.dtneg ?? r.DTNEG ?? ''),
            hrneg,
            codparc: safeNum(r.codparc ?? r.CODPARC),
            parceiro: String(r.parceiro ?? r.PARCEIRO ?? ''),
            vlrnota: safeNum(r.vlrnota ?? r.VLRNOTA),
            codvend: safeNum(r.codvend ?? r.CODVEND),
            vendedor: String(r.vendedor ?? r.VENDEDOR ?? ''),
            adTipoDeEntrega: adTipo,
            tipoEntrega: String(r.tipoEntrega ?? r.TIPO_ENTREGA ?? ''),
            statusNota: String(r.statusNota ?? r.STATUS_NOTA ?? r.statusnota ?? ''),
            statusNotaDesc: String(r.statusNotaDesc ?? r.STATUS_NOTA_DESC ?? r.statusnota_desc ?? ''),
            libconf: (r.libconf ?? r.LIBCONF ?? null) as any,
            statusConferenciaCod: (r.statusConferenciaCod ?? r.STATUS_CONFERENCIA_COD ?? null) as any,
            statusConferenciaDesc: (r.statusConferenciaDesc ?? r.STATUS_CONFERENCIA_DESC ?? null) as any,
            qtdRegConferencia: safeNum(r.qtdRegConferencia ?? r.QTD_REG_CONFERENCIA),
          } as any;
        });

        const sorted = [...list].sort((a, b) => safeNum(a.nunota) - safeNum(b.nunota));
        const newHash = stableHash(sorted);

        if (newHash !== lastHashRef.current) {
            
            // LÓGICA DE DETECÇÃO DE FINALIZADOS (GHOSTS)
            if (!isFirstLoadRef.current) {
                const currentIds = new Set(sorted.map(i => i.nunota));
                const missingItems: NotaTV[] = [];

                prevItemsMapRef.current.forEach((oldItem, nunota) => {
                    if (!currentIds.has(nunota)) {
                        missingItems.push(oldItem);
                    }
                });

                if (missingItems.length > 0) {
                    const isSuspicious = prevItemsMapRef.current.size > 5 && missingItems.length === prevItemsMapRef.current.size;
                    
                    if (!isSuspicious) {
                        const verifiedGhosts: NotaTV[] = [];

                        await Promise.all(missingItems.map(async (item) => {
                            try {
                                const checkUrl = API_BASE 
                                  ? `${API_BASE}/sync/getNotaByNunota?nunota=${item.nunota}`
                                  : `/sync/getNotaByNunota?nunota=${item.nunota}`;

                                const res = await fetch(checkUrl, { method: 'GET', headers });
                                
                                if (res.ok) {
                                    const data = await res.json();
                                    const nota = Array.isArray(data) ? data[0] : data;
                                    
                                    const pendente = nota?.pendente ?? nota?.PENDENTE ?? nota?.Pendente;
                                    const stautsConferencia = nota?.statusConferencia ?? nota?.STATUS_CONFERENCIA ?? nota?.STATUSCONFERENCIA ?? nota?.Status_Conferencia;
                                    
                                    if (pendente?.toUpperCase() === 'N' && String(stautsConferencia).toUpperCase() === 'F') {
                                        // Toca o som automático
                                        const nomeLimpo = item.parceiro.replace(/[^a-zA-ZÀ-ÿ\s0-9]/g, '');
                                        speak(`Pedido de ${nomeLimpo}, finalizado.`);
                                        
                                        verifiedGhosts.push({
                                            ...item,
                                            isGhost: true,
                                            ghostUntil: Date.now() + GHOST_TIME_MS,
                                            bkcolor: '#00C853',
                                            fgcolor: '#000000',
                                            statusConferenciaDesc: 'FINALIZADO 🚀'
                                        });
                                    }
                                }
                            } catch (err) {
                                console.error(`Erro ao verificar nota ${item.nunota}`, err);
                            }
                        }));

                        if (verifiedGhosts.length > 0) {
                            setGhosts(prev => [...prev, ...verifiedGhosts]);
                            setSnackbarMsg(`✅ ${verifiedGhosts.length} pedido(s) finalizado(s).`);
                            setSnackbarOpen(true);
                        }
                    }
                }
            }

            // Atualiza referências
            const newMap = new Map<number, NotaTV>();
            sorted.forEach(i => newMap.set(i.nunota, i));
            prevItemsMapRef.current = newMap;
            lastHashRef.current = newHash;

            if (aliveRef.current) setItems(sorted);
        }
        
        isFirstLoadRef.current = false;

      } catch (e) { console.error(e); } finally {
        inFlightRef.current = false;
        setLoading(false);
        setLoadingRefresh(false);
      }
    },
    [LIST_URL, token, API_TOKEN, API_BASE, speak], 
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
    const apiIds = new Set(items.map(i => i.nunota));
    const activeGhosts = ghosts.filter(g => !apiIds.has(g.nunota));
    const combined = [...items, ...activeGhosts];

    const res = combined.filter((n) => {
      if (onlyEC && String(n.adTipoDeEntrega ?? '').toUpperCase() !== 'EC') return false;
      if (onlyRL && String(n.adTipoDeEntrega ?? '').toUpperCase() !== 'RL') return false;
      if (onlyEI && String(n.adTipoDeEntrega ?? '').toUpperCase() !== 'EI') return false;

      if (!term) return true;

      const hay = [n.nunota, n.numnota, n.parceiro, n.vendedor, n.statusNota, n.statusConferenciaDesc]
        .map((x) => (x == null ? '' : String(x))).join(' ').toUpperCase();
      return hay.includes(term);
    });

    const sortedFiltered = [...res].sort((a, b) => {
      const pa = corPri(a);
      const pb = corPri(b);
      if (pa !== pb) return pa - pb;
      const ta = timeKey(a);
      const tb = timeKey(b);
      if (ta !== tb) return ta - tb;
      return safeNum(a.nunota) - safeNum(b.nunota);
    });

    setFiltered(sortedFiltered);
  }, [q, items, ghosts, onlyEC, onlyRL, onlyEI]);

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

  useEffect(() => {
    const onFsChange = () => {
      setFullScreen(!!document.fullscreenElement);
      if (typeof window !== 'undefined') setTimeout(() => updateViewport(), 0);
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

  const toggleFullscreen = useCallback(async () => {
    const el = tableWrapRef.current as any;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        // @ts-ignore
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        return;
      }
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      setTimeout(() => updateViewport(), 0);
    } catch (e) { console.log(e); }
  }, [updateViewport]);

  if (!mounted) return <CircularProgress sx={{m: 'auto', display: 'block', mt: 10}} />;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
       <GlobalStyles styles={{
          '@keyframes pulse-ghost': {
            '0%': { boxShadow: '0 0 0 0 rgba(0, 200, 83, 0.7)' },
            '70%': { boxShadow: '0 0 0 15px rgba(0, 200, 83, 0)' },
            '100%': { boxShadow: '0 0 0 0 rgba(0, 200, 83, 0)' },
          },
          '*::-webkit-scrollbar': { width: '0px', height: '0px' },
       }} />

      <Box component="main" sx={{ flexGrow: 1, height: '100vh', overflow: 'hidden', p: fullScreen ? 0 : 2 }}>
        
        {!fullScreen && (
            <Paper sx={{ mb: 2, p: 2, display: 'flex', alignItems: 'center', gap: 2, backgroundColor: '#fff', flexWrap: 'wrap' }}>
                <Typography variant="h5" fontWeight="bold" color="primary">Expedição TV</Typography>
                
                <Chip label={`Fila: ${items.length}`} color="primary" />
                {ghosts.length > 0 && <Chip label={`Saindo: ${ghosts.length}`} color="success" />}
                <Box flexGrow={1} />
                <Button variant="contained" onClick={toggleFullscreen} color="secondary">📺 MODO TV</Button>
            </Paper>
        )}

        <TableContainer
          component={Paper}
          ref={tableWrapRef}
          elevation={fullScreen ? 0 : 2}
          sx={{
            height: fullScreen ? '100vh' : 'calc(100vh - 100px)',
            backgroundColor: '#ffffff',
            borderRadius: fullScreen ? 0 : 2,
            overflowY: 'auto',
          }}
        >
          <Table stickyHeader sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                {['#', 'NUNOTA', 'PARCEIRO', 'VENDEDOR', 'STATUS'].map((head, i) => (
                    <TableCell key={i} sx={{
                        backgroundColor: '#eeeeee',
                        color: '#222',
                        fontWeight: 900,
                        fontSize: '1.2rem',
                        borderBottom: '2px solid #bdbdbd',
                        py: 2,
                    }}>
                        {head}
                    </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                    <Typography variant="h3" fontWeight="bold" color="text.secondary">AGUARDANDO PEDIDOS</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((n) => {
                  
                  // Lógica da descrição
                  const confDesc = n.statusConferenciaDesc ? String(n.statusConferenciaDesc).trim() : '';
                  const isL = String(n.statusNota).trim().toUpperCase() === 'L';
                  
                  let statusTexto;

                  if (confDesc) {
                      // Se tem descrição de conferência, usa ela
                      statusTexto = confDesc;
                  } else if (isL) {
                      // Se NÃO tem descrição E o status é L
                      statusTexto = 'AGUARDANDO SEPARAÇÃO';
                  } else {
                      // Fallback
                      statusTexto = safeStr(n.statusNotaDesc || n.statusNota);
                  }

                  return (
                    <TableRow
                      key={String(n.nunota)}
                      sx={{
                        backgroundColor: n.bkcolor || '#ffffff', 
                        animation: n.isGhost ? 'pulse-ghost 2s infinite' : 'none',
                        zIndex: n.isGhost ? 10 : 1,
                        position: 'relative',
                        borderBottom: '1px solid rgba(0,0,0,0.1)', 
                      }}
                    >
                      <TableCell sx={{ color: n.fgcolor, fontSize: '1.5rem', fontWeight: 'bold', width: '80px' }}>
                          {safeStr(orderByTipoMap.get(n.nunota) ?? '-')}
                      </TableCell>

                      <TableCell sx={{ color: n.fgcolor, fontFamily: 'monospace', fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-1px' }}>
                          {safeStr(n.nunota)}
                      </TableCell>

                      <TableCell sx={{ color: n.fgcolor, maxWidth: '40vw' }}>
                          <Typography sx={{
                              fontSize: '2rem', 
                              fontWeight: 800, 
                              lineHeight: 1, 
                              textTransform: 'uppercase',
                              display: '-webkit-box',
                              WebkitLineClamp: 2, 
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                          }}>
                              {safeStr(n.parceiro)}
                          </Typography>
                      </TableCell>

                      <TableCell sx={{ color: n.fgcolor }}>
                          <Typography sx={{ fontSize: '1.2rem', fontWeight: 600, opacity: 0.8 }}>
                              {safeStr(n.vendedor).split(' ')[0]} 
                          </Typography>
                      </TableCell>

                      <TableCell sx={{ paddingRight: 3 }}>
                           <Box sx={{
                               backgroundColor: 'rgba(0,0,0,0.06)', 
                               borderRadius: '8px',
                               p: 1,
                               textAlign: 'center',
                               border: '1px solid rgba(0,0,0,0.1)'
                           }}>
                               <Typography sx={{ 
                                   color: n.fgcolor, 
                                   fontWeight: 900, 
                                   fontSize: '1.3rem',
                                   textTransform: 'uppercase'
                               }}>
                                   {statusTexto}
                               </Typography>
                           </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {fullScreen && (
         <Button 
            onClick={toggleFullscreen}
            sx={{ position: 'fixed', bottom: 0, right: 0, opacity: 0, '&:hover': { opacity: 1 }, height: '100px', width: '100px' }}
         />
      )}

      <Snackbar open={snackbarOpen} autoHideDuration={3500} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" variant="filled" sx={{ width: '100%', fontSize: '1.5rem', fontWeight: 'bold' }}>{snackbarMsg}</Alert>
      </Snackbar>
    </Box>
  );
}