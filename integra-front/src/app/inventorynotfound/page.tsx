'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  Divider,
  Stack,
  IconButton,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

// Dados do produto (Sankhya)
type Produto = {
  CODPROD?: string | number | null;
  DESCRPROD?: string | null;
  MARCA?: string | null;
  CARACTERISTICAS?: string | null;
  CODVOL?: string | null;
  CODGRUPOPROD?: string | null;
  LOCALIZACAO?: string | null;
  DESCRGRUPOPROD?: string | null;
};

// Inventory (Prisma)
type InventoryItem = {
  id: string;
  codProd: number;
  count: number;
  inStock: number;
  inplantedDate: string; // ISO
  descricao?: string | null;
  userEmail?: string | null;
  localizacao: string;
};

type PendentesPorLoc = {
  location: string;
  produtos: Produto[];
};

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Texto com lista de localizações (pode ser 1 ou várias)
  const [localizacoesTexto, setLocalizacoesTexto] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [pendentesPorLoc, setPendentesPorLoc] = useState<PendentesPorLoc[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');

  const abortRef = useRef<AbortController | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // auth
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/'); // sem login → volta para a página inicial (login)
      return;
    }
    setToken(t);
  }, [router]);

  // Base URL / header
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  // Endpoints
  const GET_PROD_BY_LOC_URL = useCallback(
    (loc: string) =>
      API_BASE
        ? `${API_BASE}/sync/getProductsByLocation?location=${encodeURIComponent(loc)}`
        : `/sync/getProductsByLocation?location=${encodeURIComponent(loc)}`,
    [API_BASE],
  );

  const INVENTORY_LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getinventoryList` : `/sync/getinventoryList`),
    [API_BASE],
  );

  // aborta fetch pendente ao desmontar
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Faz o parse da lista de localizações a partir do texto
  const parseLocalizacoes = (texto: string): string[] => {
    return Array.from(
      new Set(
        texto
          .split(/[\n,;]+/)
          .map((s) => s.trim().toUpperCase())
          .filter((s) => s.length > 0),
      ),
    );
  };

  const handleBuscar = async () => {
    setErro(null);
    setOkMsg(null);
    setSnackbarOpen(false);
    setPendentesPorLoc([]);
    setSelectedLocation('ALL');

    const locs = parseLocalizacoes(localizacoesTexto);

    if (locs.length === 0) {
      setErro('Informe pelo menos uma localização (separadas por vírgula ou linha).');
      setSnackbarOpen(true);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      // 1) Buscar INVENTÁRIO uma única vez
      const invResp = await fetch(INVENTORY_LIST_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!invResp.ok) {
        const msg = await invResp.text();
        throw new Error(msg || `Falha ao carregar inventário (status ${invResp.status})`);
      }

      const invData = (await invResp.json()) as InventoryItem[] | null;
      const inventario = Array.isArray(invData) ? invData : [];

      // Set de CODPROD já inventariados (globalmente)
      const inventarioSet = new Set<number>(
        inventario.map((inv) => Number(inv.codProd)).filter((n) => Number.isFinite(n)),
      );

      // 2) Buscar produtos em cada localização e filtrar os pendentes
      const resultado: PendentesPorLoc[] = [];

      for (const loc of locs) {
        const resp = await fetch(GET_PROD_BY_LOC_URL(loc), {
          method: 'GET',
          headers,
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(
            msg || `Falha ao buscar produtos na localização ${loc} (status ${resp.status})`,
          );
        }

        const data = (await resp.json()) as Produto[] | null;
        const produtosLoc = Array.isArray(data) ? data : [];

        // Filtra apenas produtos NÃO presentes no inventário (por CODPROD)
        const pendentes = produtosLoc.filter((p) => {
          const codNum = Number(p.CODPROD);
          if (!Number.isFinite(codNum)) return false;
          return !inventarioSet.has(codNum);
        });

        if (pendentes.length > 0) {
          resultado.push({
            location: loc,
            produtos: pendentes,
          });
        }
      }

      setPendentesPorLoc(resultado);

      const totalPendentes = resultado.reduce(
        (acc, item) => acc + item.produtos.length,
        0,
      );

      if (totalPendentes === 0) {
        setErro('Nenhum produto pendente de contagem nas localizações informadas.');
      } else {
        setOkMsg(
          `Encontrados ${totalPendentes} produtos pendentes em ${resultado.length} localização(ões).`,
        );
      }

      // Se houver pelo menos 1 localização com pendentes, já seleciona ela no filtro
      if (resultado.length > 0) {
        setSelectedLocation('ALL');
      }

      setSnackbarOpen(true);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      const msg =
        e instanceof Error ? e.message : 'Erro ao buscar produtos pendentes por localização.';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // Ctrl+Enter / Cmd+Enter para disparar busca em campo multiline
      handleBuscar();
    }
  };

  const CARD_SX = {
    maxWidth: 1200,
    mx: 'auto',
    mt: 6,
    borderRadius: 2,
    boxShadow: 0,
    border: 1,
    backgroundColor: 'background.paper',
  } as const;

  const SECTION_TITLE_SX = { fontWeight: 700, mb: 2 } as const;

  // Lista achatada para exibir na tabela de acordo com o filtro selecionado
  const produtosFiltrados = useMemo(() => {
    if (selectedLocation === 'ALL') {
      return pendentesPorLoc.flatMap((item) =>
        item.produtos.map((p) => ({
          ...p,
          LOCALIZACAO: p.LOCALIZACAO ?? item.location,
        })),
      );
    }
    const entry = pendentesPorLoc.find((p) => p.location === selectedLocation);
    if (!entry) return [];
    return entry.produtos.map((p) => ({
      ...p,
      LOCALIZACAO: p.LOCALIZACAO ?? entry.location,
    }));
  }, [pendentesPorLoc, selectedLocation]);

  const totalPendentes = useMemo(
    () => pendentesPorLoc.reduce((acc, item) => acc + item.produtos.length, 0),
    [pendentesPorLoc],
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Botão flutuante: sidebar */}
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

      {/* Main */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: 0,
          backgroundColor: '#f0f4f8',
          height: '100vh',
          overflowY: 'auto',
          p: 5,
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
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={SECTION_TITLE_SX}>
              Produtos pendentes de contagem por lista de localizações
            </Typography>

            {/* Campo de lista de localizações */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
              <TextField
                label="Localizações (uma por linha, vírgula ou ponto e vírgula)"
                value={localizacoesTexto}
                onChange={(e) => setLocalizacoesTexto(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                size="small"
                multiline
                minRows={3}
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button variant="contained" onClick={handleBuscar} disabled={loading}>
                  {loading ? <CircularProgress size={22} /> : 'Buscar pendentes'}
                </Button>

                {pendentesPorLoc.length > 0 && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Localizações com pendentes: <b>{pendentesPorLoc.length}</b>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total de produtos pendentes: <b>{totalPendentes}</b>
                    </Typography>
                  </>
                )}
              </Box>
            </Box>

            {erro && (
              <Typography color="error" sx={{ mb: 1 }}>
                {erro}
              </Typography>
            )}
            {okMsg && (
              <Typography color="success.main" sx={{ mb: 1 }}>
                {okMsg}
              </Typography>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Filtro por localização + Tabela */}
            {pendentesPorLoc.length > 0 && (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mb: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography variant="subtitle2">Filtrar localização:</Typography>
                  <Select
                    size="small"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                  >
                    <MenuItem value="ALL">Todas</MenuItem>
                    {pendentesPorLoc.map((item) => (
                      <MenuItem key={item.location} value={item.location}>
                        {item.location} ({item.produtos.length})
                      </MenuItem>
                    ))}
                  </Select>
                </Box>

                {produtosFiltrados.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>
                    Nenhum produto pendente para o filtro selecionado.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    <TableContainer
                      component={Paper}
                      elevation={0}
                      sx={{
                        border: (t) => `1px solid ${t.palette.divider}`,
                        borderRadius: 2,
                        overflow: 'hidden',
                        backgroundColor: 'background.paper',
                        maxWidth: '100%',
                      }}
                    >
                      <Table size="small" stickyHeader aria-label="produtos-pendentes-por-local">
                        <TableHead>
                          <TableRow
                            sx={{
                              '& th': {
                                backgroundColor: (t) => t.palette.grey[50],
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              },
                            }}
                          >
                            <TableCell>Cód. Produto</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell>Localização</TableCell>
                            <TableCell>Marca</TableCell>
                            <TableCell>Unid.</TableCell>
                            <TableCell>Grupo</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {produtosFiltrados.map((p, idx) => (
                            <TableRow
                              key={`${p.CODPROD}-${idx}-${p.LOCALIZACAO ?? ''}`}
                              sx={{
                                '&:nth-of-type(odd)': {
                                  backgroundColor: (t) => t.palette.action.hover,
                                },
                              }}
                            >
                              <TableCell>{p.CODPROD ?? '-'}</TableCell>
                              <TableCell>{p.DESCRPROD ?? '-'}</TableCell>
                              <TableCell>{p.LOCALIZACAO ?? '-'}</TableCell>
                              <TableCell>{p.MARCA ?? '-'}</TableCell>
                              <TableCell>{p.CODVOL ?? '-'}</TableCell>
                              <TableCell>{p.DESCRGRUPOPROD ?? '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Stack>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* SNACKBAR GLOBAL DE AVISO */}
      <Snackbar
        open={snackbarOpen && (!!erro || !!okMsg)}
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
          {erro || okMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}