'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  TextField,
  Typography,
  Button,
  Snackbar,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

type InventoryItem = {
  id: string;
  codProd: number;
  count: number;
  inStock: number;
  inplantedDate: string | null;
  createdAt: string;
  descricao?: string | null;
  userEmail?: string | null;
  localizacao: string | null;
  recontagem?: boolean | null;
  reserved?: number | null;
  reservado?: number | null;
};

const PRIMAL_DATE = '1987-11-23T14:01:48.190Z';
type LocationStatus = 'PENDENTE' | 'DIVERGENCIA' | 'OK';

type LocationSummary = {
  localizacao: string;
  status: LocationStatus;
  totalNoCiclo: number;
  divergentesNoCiclo: number;
  okNoCiclo: number;
  itensNoCiclo: InventoryItem[];
};

const VALID_TABS = ['A', 'B', 'C', 'D', 'E'] as const;
type TabKey = (typeof VALID_TABS)[number] | 'SEM LOCALIZAÇÃO';

function parseLocationNumber(loc?: string | null): number {
  if (!loc) return Number.MAX_SAFE_INTEGER;
  const match = loc.match(/\d+/g);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const joined = match.join('');
  const n = Number.parseInt(joined, 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

function getTabKeyFromLocation(loc?: string | null): TabKey {
  const s = (loc ?? '').trim();
  if (!s) return 'SEM LOCALIZAÇÃO';
  const first = s[0]?.toUpperCase();
  if (first && (VALID_TABS as readonly string[]).includes(first)) return first as TabKey;
  return 'SEM LOCALIZAÇÃO';
}

export default function Page() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>('A');

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const [token, setToken] = useState<string | null>(null);

  const [filterLoc, setFilterLoc] = useState('');
  const [selectedLoc, setSelectedLoc] = useState<LocationSummary | null>(null);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getinventoryList` : `/sync/getinventoryList`),
    [API_BASE]
  );

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const getReservado = useCallback((item: InventoryItem): number => {
    const v = item.reserved ?? item.reservado ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, []);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const resp = await fetch(LIST_URL, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao carregar inventário (status ${resp.status})`);
      }

      const data = (await resp.json()) as InventoryItem[] | null;
      const list = Array.isArray(data) ? data : [];

      setItems(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar inventário';
      setErro(msg);
      setSnackbarMsg(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, getHeaders]);

  useEffect(() => {
    if (token || API_TOKEN) fetchData();
  }, [fetchData, token, API_TOKEN]);

  const legend = (
    <Box sx={{ fontSize: 13, lineHeight: 1.6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 12, height: 12, bgcolor: '#EA9999', borderRadius: 0.5 }} />
        Vermelho: pendente (sem contagem no ciclo atual)
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 12, height: 12, bgcolor: '#FFE599', borderRadius: 0.5 }} />
        Amarelo: divergência no ciclo atual
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 12, height: 12, bgcolor: '#B6D7A8', borderRadius: 0.5 }} />
        Verde: OK no ciclo atual
      </Box>
      <Divider sx={{ my: 1 }} />
      <Typography variant="caption">
        “Ciclo atual” = <b>inplantedDate === {PRIMAL_DATE}</b>
      </Typography>
    </Box>
  );

  const allLocations: LocationSummary[] = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();

    for (const it of items) {
      const loc = (it.localizacao ?? '').trim();
      if (!loc) {
        // manda vazio/null pra "SEM LOCALIZAÇÃO" (como uma chave estável)
        const key = 'SEM LOCALIZAÇÃO';
        const arr = map.get(key) ?? [];
        arr.push(it);
        map.set(key, arr);
        continue;
      }
      const arr = map.get(loc) ?? [];
      arr.push(it);
      map.set(loc, arr);
    }

    const summaries: LocationSummary[] = [];
    for (const [locKey, arr] of map.entries()) {
      // locKey pode ser "SEM LOCALIZAÇÃO" (quando localizacao é null/vazia)
      const loc = locKey === 'SEM LOCALIZAÇÃO' ? '(SEM LOCALIZAÇÃO)' : locKey;

      const itensNoCiclo =
        locKey === 'SEM LOCALIZAÇÃO'
          ? arr.filter((x) => x.inplantedDate === PRIMAL_DATE)
          : arr.filter((x) => x.inplantedDate === PRIMAL_DATE);

      let status: LocationStatus = 'PENDENTE';
      let divergentes = 0;
      let ok = 0;

      if (itensNoCiclo.length > 0) {
        for (const x of itensNoCiclo) {
          const reservado = getReservado(x);
          const diff = x.count - (x.inStock + reservado);
          if (diff !== 0) divergentes += 1;
          else ok += 1;
        }
        status = divergentes > 0 ? 'DIVERGENCIA' : 'OK';
      }

      summaries.push({
        localizacao: loc,
        status,
        totalNoCiclo: itensNoCiclo.length,
        divergentesNoCiclo: divergentes,
        okNoCiclo: ok,
        itensNoCiclo,
      });
    }

    // filtro por texto
    const locFilter = filterLoc.trim().toUpperCase();
    const filtered = summaries.filter((s) => {
      if (!locFilter) return true;
      return s.localizacao.toUpperCase().includes(locFilter);
    });

    return filtered;
  }, [items, filterLoc, getReservado]);

  const groupedByTab: Record<TabKey, LocationSummary[]> = useMemo(() => {
    const base: Record<TabKey, LocationSummary[]> = {
      A: [],
      B: [],
      C: [],
      D: [],
      E: [],
      'SEM LOCALIZAÇÃO': [],
    };

    for (const s of allLocations) {
      // se for "(SEM LOCALIZAÇÃO)" já cai na aba sem localização
      const key =
        s.localizacao === '(SEM LOCALIZAÇÃO)'
          ? 'SEM LOCALIZAÇÃO'
          : getTabKeyFromLocation(s.localizacao);

      base[key].push(s);
    }

    // ✅ ordena por número (e desempate por string)
    for (const k of Object.keys(base) as TabKey[]) {
      base[k].sort((a, b) => {
        const na = parseLocationNumber(a.localizacao);
        const nb = parseLocationNumber(b.localizacao);
        if (na !== nb) return na - nb;
        return a.localizacao.localeCompare(b.localizacao, 'pt-BR');
      });
    }

    return base;
  }, [allLocations]);

  // garante que a aba atual exista (se não houver itens em A, por exemplo, muda pra próxima com itens)
  useEffect(() => {
    const current = groupedByTab[tab]?.length ?? 0;
    if (current > 0) return;

    const order: TabKey[] = ['A', 'B', 'C', 'D', 'E', 'SEM LOCALIZAÇÃO'];
    const next = order.find((t) => (groupedByTab[t]?.length ?? 0) > 0);
    if (next) setTab(next);
  }, [groupedByTab, tab]);

  const CARD_SX = {
    maxWidth: 1200,
    mx: 'auto',
    mt: 6,
    borderRadius: 2,
    boxShadow: 0,
    border: 1,
    backgroundColor: 'background.paper',
  } as const;

  const tileColor = (status: LocationStatus) => {
    if (status === 'PENDENTE') return '#EA9999';
    if (status === 'DIVERGENCIA') return '#FFE599';
    return '#B6D7A8';
  };

  const tiles = groupedByTab[tab] ?? [];

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* botão sidebar */}
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Mapa de Localizações
                  </Typography>

                  <Tooltip arrow placement="right" title={legend}>
                    <InfoOutlinedIcon sx={{ color: 'text.secondary', cursor: 'pointer', fontSize: 20 }} />
                  </Tooltip>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Abas por estoque (A–E). O restante fica em <b>SEM LOCALIZAÇÃO</b>. Ordenado pelo número.
                </Typography>
              </Box>

              <Button variant="outlined" onClick={fetchData} disabled={loading}>
                {loading ? <CircularProgress size={18} /> : 'Atualizar'}
              </Button>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr' },
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                label="Filtrar por localização (texto)"
                value={filterLoc}
                onChange={(e) => setFilterLoc(e.target.value)}
                size="small"
              />
            </Box>

            <Paper
              elevation={0}
              sx={{
                border: (t) => `1px solid ${t.palette.divider}`,
                borderRadius: 2,
                overflow: 'hidden',
                mb: 2,
              }}
            >
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="scrollable"
                scrollButtons="auto"
              >
                {(['A', 'B', 'C', 'D', 'E', 'SEM LOCALIZAÇÃO'] as TabKey[]).map((k) => (
                  <Tab
                    key={k}
                    value={k}
                    label={`${k} (${groupedByTab[k]?.length ?? 0})`}
                  />
                ))}
              </Tabs>
            </Paper>

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

                {tiles.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>
                    Nenhuma localização nesta aba.
                  </Typography>
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      border: (t) => `1px solid ${t.palette.divider}`,
                      borderRadius: 2,
                      p: 2,
                      backgroundColor: 'background.paper',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'repeat(2, minmax(0, 1fr))',
                          sm: 'repeat(4, minmax(0, 1fr))',
                          md: 'repeat(6, minmax(0, 1fr))',
                        },
                        gap: 1.5,
                      }}
                    >
                      {tiles.map((loc) => {
                        const bg = tileColor(loc.status);

                        const tooltip = (
                          <Box sx={{ fontSize: 13, lineHeight: 1.6 }}>
                            <div><b>{loc.localizacao}</b></div>
                            <div>Status: {loc.status}</div>
                            <Divider sx={{ my: 1 }} />
                            <div>Produtos Contados: {loc.totalNoCiclo}</div>
                            <div>Produtos divergentes: {loc.divergentesNoCiclo}</div>
                            <div>Produtos convergentes: {loc.okNoCiclo}</div>
                          </Box>
                        );

                        return (
                          <Tooltip key={loc.localizacao} title={tooltip} arrow placement="top">
                            <Box
                              role="button"
                              onClick={() => setSelectedLoc(loc)}
                              sx={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                borderRadius: 2,
                                border: '1px solid rgba(0,0,0,0.15)',
                                p: 1.25,
                                backgroundColor: bg,
                                '&:hover': { filter: 'brightness(0.98)' },
                              }}
                            >
                              <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
                                {loc.localizacao}
                              </Typography>
                              <Typography sx={{ fontSize: 12, opacity: 0.9 }}>
                                ciclo: {loc.totalNoCiclo} • div: {loc.divergentesNoCiclo}
                              </Typography>
                            </Box>
                          </Tooltip>
                        );
                      })}
                    </Box>
                  </Paper>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Detalhes da localização */}
      <Dialog open={!!selectedLoc} onClose={() => setSelectedLoc(null)} fullWidth maxWidth="md">
        <DialogTitle>Detalhes — {selectedLoc?.localizacao ?? ''}</DialogTitle>
        <DialogContent dividers>
          {selectedLoc.itensNoCiclo.map((it) => {
            const reservado = getReservado(it);
            const diff = it.count - (it.inStock + reservado);

            // mesma lógica de cores (no ciclo PRIMAL)
            let bg = '#B6D7A8'; // verde (OK)
            if (diff > 0) bg = '#FFE599'; // amarelo
            else if (diff < 0) bg = '#EA9999'; // vermelho

            // opcional: manter destaque de recontagem com degradê (se quiser)
            const rowBg = it.recontagem
              ? `linear-gradient(90deg, #E1BEE7 0%, #E1BEE7 25%, ${bg} 60%, ${bg} 100%)`
              : bg;

            return (
              <Paper
                key={it.id}
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  background: rowBg,
                  '&:hover': { filter: 'brightness(0.98)' },
                }}
              >
                <Typography sx={{ fontWeight: 800 }}>
                  {it.codProd} — {it.descricao ?? '-'}
                </Typography>

                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  Contador: {it.userEmail ?? '-'} • Criado: {new Date(it.createdAt).toLocaleString('pt-BR')}
                </Typography>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Typography sx={{ fontSize: 13 }}>
                    Contagem: <b>{it.count}</b>
                  </Typography>
                  <Typography sx={{ fontSize: 13 }}>
                    Estoque: <b>{it.inStock}</b>
                  </Typography>
                  <Typography sx={{ fontSize: 13 }}>
                    Reservado: <b>{reservado}</b>
                  </Typography>
                  <Typography sx={{ fontSize: 13 }}>
                    Diferença: <b>{diff}</b>
                  </Typography>
                  <Typography sx={{ fontSize: 13 }}>
                    Recontagem: <b>{it.recontagem ? 'Sim' : 'Não'}</b>
                  </Typography>
                </Box>
              </Paper>
            );
          })}

        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLoc(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
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
