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
  Typography,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

type Localizacao = {
  Rua: string;
  Predio: string;
  Nivel: string;
  Aparatamento: string;
  Endereco: string;
  Armazenamento: string;
};

type TabKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'SEM RUA';

async function imprimirPdf(url: string, body: any, headers: HeadersInit) {
  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  //if (!resp.ok) throw new Error('Erro ao gerar PDF');

  const blob = await resp.blob();
  const pdfUrl = URL.createObjectURL(blob);

  const w = window.open(pdfUrl);
  if (w) w.onload = () => w.print();
}


const RUA_TO_TAB: Record<string, TabKey> = {
  '01': 'A',
  '02': 'B',
  '03': 'C',
  '04': 'D',
  '05': 'E',
  '06': 'F',
};

export default function Page() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>('A');
  const [items, setItems] = useState<Localizacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);
  
  const LIST_URL = useMemo(
    () => (API_BASE ?`${API_BASE}/sync/getAllLocalizacoes` : `/sync/getAllLocalizacoes`),
    [API_BASE]
  );

    const PRINT_ONE_URL = useMemo(
    () => (API_BASE ?`${API_BASE}/sync/imprimirEtiquetaLocalizacao` : `/sync/imprimirEtiquetaLocalizacao`),
    [API_BASE]
  );

  const PRINT_ALL_URL = `${API_BASE}/sync/getAllEtiquetasCabos`;

  const getHeaders = useCallback(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) h.Authorization = `Bearer ${API_TOKEN}`;
    return h;
  }, [token, API_TOKEN]);

  useEffect(() => {
    const t = localStorage.getItem('authToken');
    if (!t) router.replace('/');
    else setToken(t);
  }, [router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const resp = await fetch(LIST_URL, { headers: getHeaders(), cache: 'no-store' });
    const data = await resp.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [LIST_URL, getHeaders]);

  useEffect(() => {
    if (token || API_TOKEN) fetchData();
  }, [fetchData, token, API_TOKEN]);

  const grouped = useMemo(() => {
    const base: Record<TabKey, Localizacao[]> = {
      A: [], B: [], C: [], D: [], E: [], F: [], 'SEM RUA': [],
    };

    for (const it of items) {
      const key = RUA_TO_TAB[it.Rua] ?? 'SEM RUA';
      base[key].push(it);
    }
    return base;
  }, [items]);

  async function imprimirUm(item: Localizacao) {
    await imprimirPdf(PRINT_ONE_URL, item, getHeaders());
  }

  async function imprimirTodos() {
    await imprimirPdf(PRINT_ALL_URL, items, getHeaders());
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <IconButton
        sx={{ position: 'fixed', top: 16, left: 16, zIndex: 1200 }}
        onClick={() => setSidebarOpen(true)}
      >
        <MenuIcon />
      </IconButton>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box component="main" sx={{ flexGrow: 1, p: 4, bgcolor: '#f0f4f8', overflowY: 'auto' }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                Localizações
              </Typography>

              <Button variant="contained" onClick={imprimirTodos}>
                Imprimir tudo
              </Button>
            </Box>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
              {(Object.keys(grouped) as TabKey[]).map((k) => (
                <Tab key={k} value={k} label={`${k} (${grouped[k].length})`} />
              ))}
            </Tabs>

            <Divider sx={{ my: 2 }} />

            {loading ? (
              <CircularProgress />
            ) : (
              <Paper sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: 1.5,
                  }}
                >
                  {grouped[tab].map((loc) => (
                    <Box
                      key={loc.Endereco}
                      onClick={() => imprimirUm(loc)}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 2,
                        p: 1.5,
                        bgcolor: '#B6D7A8',
                        border: '1px solid rgba(0,0,0,0.2)',
                        '&:hover': { filter: 'brightness(0.95)' },
                      }}
                    >
                      <Typography fontWeight={800} fontSize={13}>
                        {loc.Endereco}
                      </Typography>
                      <Typography fontSize={12}>
                        {loc.Armazenamento}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
