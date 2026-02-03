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

  // Propriedade interna para saber se é um item finalizado (ghost)
  isGhost?: boolean;
  ghostUntil?: number; 
};

// --- CONFIGURAÇÕES ---

const POLL_MS = 5000;
const GHOST_TIME_MS = 15000; // Tempo que o pedido fica na tela após finalizar (15s)

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
  // Se for ghost, joga pro fim ou pro inicio? Vamos manter a ordem original
  const dt =
    parseDtHrToDate(n.dtneg, n.hrneg) ??
    parseDtHrToDate(toDateBR(n.dtneg), n.hrneg);
  return dt ? dt.getTime() : Number.POSITIVE_INFINITY;
};

const corPri = (n: NotaTV) => {
  // Se for Ghost (Finalizado), prioridade máxima (ou específica)
  if (n.isGhost) return 0; // 0 = Topo da lista para chamar atenção

  const s = String(n.bkcolor ?? '').trim().toUpperCase();
  if (s === '#2E7D32' || s.includes('46, 125, 50') || s.includes('46,125,50')) return 1;
  if (s === '#1976D2' || s.includes('25, 118, 210') || s.includes('25,118,210')) return 2;
  if (s === '#F9A825' || s.includes('249, 168, 37') || s.includes('249,168,37')) return 3;
  if (s === '#C62828' || s.includes('198, 40, 40') || s.includes('198,40,40')) return 4;
  return 9;
};

// --- ÁUDIO ---

const speak = (text: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.1;
  window.speechSynthesis.speak(utterance);
};


export default function Page() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [items, setItems] = useState<NotaTV[]>([]); // Itens vindos da API
  const [ghosts, setGhosts] = useState<NotaTV[]>([]); // Itens finalizados (temporários)
  const [filtered, setFiltered] = useState<NotaTV[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros
  const [q, setQ] = useState('');
  const [onlyEC, setOnlyEC] = useState(false);
  const [onlyRL, setOnlyRL] = useState(false);
  const [onlyEI, setOnlyEI] = useState(false);

  const [fullScreen, setFullScreen] = useState(false);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  
  // UI Helpers
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  
  // Controle de API
  const [token, setToken] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const lastHashRef = useRef<string>('');
  const aliveRef = useRef(true);
  
  // Controle de Diff (para detectar quem sumiu)
  const prevItemsMapRef = useRef<Map<number, NotaTV>>(new Map());
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    setToken(t);
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  // Timer para limpar ghosts expirados
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
            // Se der erro, não limpamos a lista para não piscar a tela, apenas avisamos
            throw new Error(`Falha API: ${resp.status}`);
        }

        const data = (await resp.json()) as any[] | null;
        const rawList = Array.isArray(data) ? data : [];

        // Parse
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

        // Ordenação Básica (sem ghosts) para cálculo do hash
        // A ordenação final da tela é feita no useEffect do filtro
        const sorted = [...list].sort((a, b) => safeNum(a.nunota) - safeNum(b.nunota));

        const newHash = stableHash(sorted);

        if (newHash !== lastHashRef.current) {
          
            // LÓGICA DE DETECÇÃO DE FINALIZADOS (GHOSTS)
            // Se um item estava na lista anterior, mas NÃO está na nova, assumimos que Finalizou.
            if (!isFirstLoadRef.current) {
                const currentIds = new Set(sorted.map(i => i.nunota));
                const missingItems: NotaTV[] = [];

                prevItemsMapRef.current.forEach((oldItem, nunota) => {
                    if (!currentIds.has(nunota)) {
                        missingItems.push(oldItem);
                    }
                });

                if (missingItems.length > 0) {
                    // Evita disparar 50 áudios se a API retornar vazio por erro momentâneo
                    // (Regra de segurança: se sumiu TUDO de uma vez e eram muitos itens, suspeito)
                    const isSuspicious = prevItemsMapRef.current.size > 5 && missingItems.length === prevItemsMapRef.current.size;
                    
                    if (!isSuspicious) {
                        // Toca o som e adiciona aos ghosts
                        missingItems.forEach(item => {
                             // Limpa nome
                             const nomeLimpo = item.parceiro.replace(/[^a-zA-ZÀ-ÿ\s0-9]/g, '');
                             speak(`Pedido de ${nomeLimpo}, finalizado.`);
                        });

                        setGhosts(prev => {
                            const ghostsToAdd = missingItems.map(m => ({
                                ...m,
                                isGhost: true,
                                ghostUntil: Date.now() + GHOST_TIME_MS, // Expira em 15s
                                bkcolor: '#2E7D32', // Força Verde
                                fgcolor: '#FFFFFF',
                                statusConferenciaDesc: 'FINALIZADO (SAINDO...)'
                            }));
                            return [...prev, ...ghostsToAdd];
                        });

                        setSnackbarMsg(`✅ ${missingItems.length} pedido(s) finalizado(s).`);
                        setSnackbarOpen(true);
                    }
                }
            }

            // Atualiza referências
            const newMap = new Map<number, NotaTV>();
            sorted.forEach(i => newMap.set(i.nunota, i));
            prevItemsMapRef.current = newMap;
            lastHashRef.current = newHash;

            if (aliveRef.current) {
                setItems(sorted);
            }
        }
        
        isFirstLoadRef.current = false;

      } catch (e) {
        // Silencioso no poll para não atrapalhar UX, só loga se for debug
        console.error(e);
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
    const id = window.setInterval(() => fetchData('poll'), POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchData]);

  // COMBINAÇÃO E FILTRO (Items Reais + Ghosts)
  useEffect(() => {
    const term = q.trim().toUpperCase();

    // 1. Unir listas: API + Ghosts
    // Se o ghost voltou a aparecer na API (ex: estorno), a API tem prioridade, removemos o ghost duplicado
    const apiIds = new Set(items.map(i => i.nunota));
    const activeGhosts = ghosts.filter(g => !apiIds.has(g.nunota));
    
    const combined = [...items, ...activeGhosts];

    const res = combined.filter((n) => {
      if (onlyEC && String(n.adTipoDeEntrega ?? '').toUpperCase() !== 'EC') return false;
      if (onlyRL && String(n.adTipoDeEntrega ?? '').toUpperCase() !== 'RL') return false;
      if (onlyEI && String(n.adTipoDeEntrega ?? '').toUpperCase() !== 'EI') return false;

      if (!term) return true;

      const hay = [
        n.nunota,
        n.numnota,
        n.parceiro,
        n.vendedor,
        n.statusNota,
        n.statusConferenciaDesc,
      ]
        .map((x) => (x == null ? '' : String(x)))
        .join(' ')
        .toUpperCase();

      return hay.includes(term);
    });

    // Ordenação Visual
    const sortedFiltered = [...res].sort((a, b) => {
      // 1. Prioridade de Cor (Ghosts (#2E7D32) vão pro topo ou conforme corPri)
      const pa = corPri(a);
      const pb = corPri(b);
      if (pa !== pb) return pa - pb;

      // 2. Tempo
      const ta = timeKey(a);
      const tb = timeKey(b);
      if (ta !== tb) return ta - tb;

      return safeNum(a.nunota) - safeNum(b.nunota);
    });

    setFiltered(sortedFiltered);
  }, [q, items, ghosts, onlyEC, onlyRL, onlyEI]); // Re-roda sempre que ghosts muda

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

  const cellTextSx = useMemo(
    () => ({
      fontWeight: 600,
      color: 'inherit',
      lineHeight: 1.05,
      fontSize: fullScreen ? '1em' : '1em',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
    }),
    [fullScreen],
  );

  // Fullscreen Handlers
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

  const CARD_SX = useMemo(
    () =>
    ({
      maxWidth: fullScreen ? 'none' : 1400,
      mx: fullScreen ? 0 : 'auto',
      mt: fullScreen ? 0 : 6,
      borderRadius: fullScreen ? 0 : 2,
      boxShadow: 0,
      border: fullScreen ? 0 : 1,
      backgroundColor: 'background.paper',
      height: fullScreen ? '100dvh' : 'auto',
    } as const),
    [fullScreen],
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
          overflowY: fullScreen ? 'hidden' : 'auto',
          p: fullScreen ? 0 : { xs: 2, sm: 5 },
          fontFamily: 'Arial, sans-serif',
          fontSize: '26px',
          lineHeight: '1.6',
          color: '#333',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Card sx={CARD_SX}>
          <CardContent sx={{ p: fullScreen ? 0 : { xs: 2, sm: 3 }, height: fullScreen ? '100%' : 'auto' }}>
            {!fullScreen && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Notas TV
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pendentes: {items.length} | Finalizados (Recentes): {ghosts.length}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                     <Button variant="outlined" onClick={() => fetchData('manual')} disabled={loading || loadingRefresh}>
                      {loadingRefresh ? <CircularProgress size={18} /> : 'Atualizar'}
                    </Button>
                    <Button variant="outlined" onClick={toggleFullscreen}>Tela cheia</Button>
                  </Box>
                </Box>

                {/* Filtros simplificados para economizar espaço no código exibido, mas funcionais */}
                 <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                    <TextField label="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} size="small" sx={{flex:1}} />
                    <Chip label="Limpar Filtros" onClick={() => { setQ(''); setOnlyEC(false); setOnlyRL(false); setOnlyEI(false); }} />
                 </Box>

                <Divider sx={{ my: 2 }} />
              </>
            )}

            {fullScreen && (
              <Box sx={{ position: 'fixed', top: 10, right: 10, zIndex: 2000 }}>
                <Button variant="contained" onClick={toggleFullscreen} size="small">Sair</Button>
              </Box>
            )}

            <TableContainer
              component={Paper}
              elevation={0}
              ref={tableWrapRef}
              sx={{
                backgroundColor: 'background.paper',
                overflow: 'hidden',
                border: fullScreen ? 'none' : (t) => `1px solid ${t.palette.divider}`,
                borderRadius: fullScreen ? 0 : 2,
                ...(fullScreen
                  ? { position: 'fixed', inset: 0, width: '100dvw', height: '100dvh', zIndex: 1300 }
                  : { maxWidth: '100%' }),
              }}
            >
              <Box sx={ fullScreen ? { width: '100%', height: '100%', overflow: 'auto', p: 0 } : { width: '100%', overflowX: 'auto' }}>
                <Table size="small" stickyHeader sx={{ width: fullScreen ? '100%' : 'auto', minWidth: fullScreen ? 0 : 1500 }}>
                  <TableHead>
                    <TableRow sx={{ '& th': { backgroundColor: (t) => t.palette.grey[50], fontWeight: 800 } }}>
                      <TableCell>#</TableCell>
                      <TableCell>NUNOTA</TableCell>
                      <TableCell>Parceiro</TableCell>
                      <TableCell>Vendedor</TableCell>
                      <TableCell>Status Conferência</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography sx={{ fontWeight: 800, fontSize: '1.2em' }}>SEM CLIENTES EM ESPERA</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((n) => (
                          <TableRow
                            key={String(n.nunota)}
                            sx={{
                              backgroundColor: n.bkcolor || '#FFFFFF',
                              '& td': { color: n.fgcolor || '#000000' },
                              // Se for ghost, adiciona uma animaçãozinha ou opacidade se quiser
                              opacity: n.isGhost ? 0.9 : 1,
                              transition: 'opacity 0.5s',
                            }}
                          >
                            <TableCell><Typography sx={cellTextSx}>{safeStr(orderByTipoMap.get(n.nunota) ?? '-')}</Typography></TableCell>
                            <TableCell><Typography sx={cellTextSx}>{safeStr(n.nunota)}</Typography></TableCell>
                            <TableCell><Typography sx={cellTextSx}>{safeStr(n.parceiro)}</Typography></TableCell>
                            <TableCell><Typography sx={cellTextSx}>{safeStr(n.vendedor)}</Typography></TableCell>
                            <TableCell><Typography sx={cellTextSx}>{safeStr(n.statusConferenciaDesc)}</Typography></TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </Box>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      <Snackbar open={snackbarOpen} autoHideDuration={3500} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" variant="filled" sx={{ width: '100%' }}>{snackbarMsg}</Alert>
      </Snackbar>
    </Box>
  );
}