'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
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
  Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

type NotFoundItem = {
  id: string;
  localizacao: string;
  codProdFaltando: number[];
  codProdContados: number[];
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

function normalizeLoc(loc?: string | null): string {
  return (loc || 'SEM LOCALIZAÇÃO').toString().toUpperCase();
}

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [notFoundList, setNotFoundList] = useState<NotFoundItem[]>([]);
  const [filter, setFilter] = useState<string>('');

  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // localização atualmente expandida (Exibir)
  const [selectedLoc, setSelectedLoc] = useState<NotFoundItem | null>(null);
  // inputs de contagem por código
  const [countInputs, setCountInputs] = useState<Record<number, string>>({});
  const [sendingCod, setSendingCod] = useState<number | null>(null);

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const NOTFOUND_LIST_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/notFoundList` : `/sync/notFoundList`),
    [API_BASE]
  );

  const NOTFOUND_SYNC_FULL_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/notFoundListFull`
        : `/sync/notFoundListFull`,
    [API_BASE]
  );

  // rota para contar produto faltando
  const ADD_COUNT2_URL = useMemo(
    () =>
      API_BASE
        ? `${API_BASE}/sync/addCount2`
        : `/sync/addCount2`,
    [API_BASE]
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    []
  );

  // auth
  useEffect(() => {
    const t =
      typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t && !API_TOKEN) {
      router.replace('/');
      return;
    }
    setToken(t ?? null);
  }, [router, API_TOKEN]);

  // Carrega NotFound e mantém só os que têm produtos faltando
  const fetchNotFound = useCallback(async () => {
    const canFetch = !!token || !!API_TOKEN;
    if (!canFetch) return;

    setErro(null);
    setOkMsg(null);
    setLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(NOTFOUND_LIST_URL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(
          msg || `Falha ao carregar NotFound (status ${resp.status})`
        );
      }

      const data = (await resp.json()) as NotFoundItem[] | null;
      const list = Array.isArray(data) ? data : [];

      // normaliza localização e filtra apenas quem tem codProdFaltando
      const normalizedList: NotFoundItem[] = list
        .map((n) => ({
          ...n,
          localizacao: normalizeLoc(n.localizacao),
          codProdFaltando: n.codProdFaltando ?? [],
          codProdContados: n.codProdContados ?? [],
        }))
        .filter((n) => (n.codProdFaltando?.length ?? 0) > 0);

      // ordena por localização
      normalizedList.sort((a, b) =>
        a.localizacao.localeCompare(b.localizacao, 'pt-BR')
      );

      setNotFoundList(normalizedList);
      // se a localização selecionada sumiu ou mudou, fecha detalhe
      if (
        selectedLoc &&
        !normalizedList.find((n) => n.id === selectedLoc.id)
      ) {
        setSelectedLoc(null);
        setCountInputs({});
      }

      setOkMsg(
        `Encontradas ${normalizedList.length} localizações com produtos faltando.`
      );
      setSnackbarOpen(true);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao carregar NotFound.';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [token, API_TOKEN, NOTFOUND_LIST_URL, selectedLoc]);

  useEffect(() => {
    fetchNotFound();
  }, [fetchNotFound]);

  const filteredLocs = useMemo(() => {
    const f = filter.trim().toUpperCase();
    if (!f) return notFoundList;
    return notFoundList.filter((n) => n.localizacao.includes(f));
  }, [filter, notFoundList]);

  // CONFERIR → POST em notFoundListFull e depois recarrega a lista
  const handleConferir = useCallback(async () => {
    const canFetch = !!token || !!API_TOKEN;
    if (!canFetch) return;

    setErro(null);
    setOkMsg(null);
    setLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(NOTFOUND_SYNC_FULL_URL, {
        method: 'POST',
        headers,
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(
          msg || `Falha ao sincronizar NotFound (status ${resp.status})`
        );
      }

      await fetchNotFound();

      setOkMsg('CONFERÊNCIA concluída e NotFound atualizado.');
      setSnackbarOpen(true);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao executar CONFERIR em NotFound.';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [token, API_TOKEN, NOTFOUND_SYNC_FULL_URL, fetchNotFound]);

  // abrir/fechar detalhe de localização
  const handleExibir = (nf: NotFoundItem) => {
    if (selectedLoc && selectedLoc.id === nf.id) {
      setSelectedLoc(null);
      setCountInputs({});
    } else {
      setSelectedLoc(nf);
      setCountInputs({});
    }
  };

  const handleChangeCountInput = (cod: number, value: string) => {
    setCountInputs((prev) => ({ ...prev, [cod]: value }));
  };

 const handleContar = async (codProd: number) => {
  if (!selectedLoc) return;

  const raw = countInputs[codProd];
  const contagem = Number(raw);

  if (!raw || Number.isNaN(contagem)) {
    setErro('Informe uma quantidade numérica válida.');
    setSnackbarOpen(true);
    return;
  }

  const canFetch = !!token || !!API_TOKEN;
  if (!canFetch) return;

  setSendingCod(codProd);
  setErro(null);
  setOkMsg(null);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

    const body = {
      codProd: codProd,
      contagem: contagem,                 // ✅ correto
      descricao: '',                      // ⚠️ obrigatório no backend
      localizacao: selectedLoc.localizacao,
      reservado: 0,
    };

    const resp = await fetch(ADD_COUNT2_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(
        msg || `Falha ao registrar contagem (status ${resp.status})`
      );
    }

    setOkMsg(
      `Contagem registrada para o produto ${codProd} na localização ${selectedLoc.localizacao}.`
    );
    setSnackbarOpen(true);

    setCountInputs((prev) => {
      const { [codProd]: _, ...rest } = prev;
      return rest;
    });

    await fetchNotFound();
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Erro ao registrar contagem.';
    setErro(msg);
    setSnackbarOpen(true);
  } finally {
    setSendingCod(null);
  }
};


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
        <IconButton
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="menu"
          size="large"
        >
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
            {/* Título + botões Atualizar / CONFERIR */}
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
              <Typography variant="h6" sx={SECTION_TITLE_SX}>
                Produtos faltando por localização (NotFound)
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  onClick={fetchNotFound}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={18} /> : 'Atualizar'}
                </Button>

                <Button
                  variant="contained"
                  color="error"
                  onClick={handleConferir}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={18} /> : 'CONFERIR'}
                </Button>
              </Box>
            </Box>

            {/* Filtro por localização */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="Filtrar localização"
                value={filter}
                onChange={(e) => setFilter(e.target.value.toUpperCase())}
                size="small"
                fullWidth
              />
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

            <Divider sx={{ my: 2 }} />

            {loading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mt: 4,
                  mb: 4,
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Localizações com produtos faltando:{' '}
                  <b>{notFoundList.length}</b>
                </Typography>

                {filteredLocs.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>
                    Nenhuma localização encontrada com o filtro atual.
                  </Typography>
                ) : (
                  <>
                    {/* Tabela das localizações */}
                    <TableContainer
                      component={Paper}
                      elevation={0}
                      sx={{
                        border: (t) => `1px solid ${t.palette.divider}`,
                        borderRadius: 2,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        WebkitOverflowScrolling: 'touch',
                        backgroundColor: 'background.paper',
                        maxWidth: '100%',
                      }}
                    >
                      <Table
                        size="small"
                        stickyHeader
                        aria-label="localizacoes-notfound"
                        sx={{ minWidth: 800 }}
                      >
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
                            <TableCell>Localização</TableCell>
                            <TableCell align="right">
                              Qtd. produtos contados
                            </TableCell>
                            <TableCell align="center">
                              Produtos faltando
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredLocs.map((nf) => {
                            const loc = nf.localizacao;
                            const qtdContados =
                              nf.codProdContados?.length ?? 0;
                            const isOpen =
                              selectedLoc && selectedLoc.id === nf.id;

                            return (
                              <TableRow
                                key={nf.id}
                                sx={{
                                  backgroundColor: isOpen
                                    ? 'rgba(25, 118, 210, 0.06)'
                                    : 'inherit',
                                }}
                              >
                                <TableCell>{loc}</TableCell>
                                <TableCell align="right">
                                  {numberFormatter.format(qtdContados)}
                                </TableCell>
                                <TableCell align="center">
                                  <Button
                                    size="small"
                                    variant={isOpen ? 'contained' : 'outlined'}
                                    onClick={() => handleExibir(nf)}
                                  >
                                    {isOpen ? 'Fechar' : 'Exibir'}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Detalhe da localização selecionada */}
                    {selectedLoc && (
                      <Box
                        sx={{
                          mt: 3,
                          p: 2,
                          borderRadius: 2,
                          border: (t) =>
                            `1px solid ${t.palette.primary.light}`,
                          backgroundColor: (t) =>
                            t.palette.mode === 'light'
                              ? 'rgba(25,118,210,0.03)'
                              : 'rgba(25,118,210,0.12)',
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600, mb: 1 }}
                        >
                          Produtos faltando na localização:{' '}
                          <span style={{ fontWeight: 700 }}>
                            {selectedLoc.localizacao}
                          </span>
                        </Typography>
                        {selectedLoc.codProdFaltando.length === 0 ? (
                          <Typography sx={{ color: 'text.secondary' }}>
                            Nenhum produto faltando nesta localização.
                          </Typography>
                        ) : (
                          <TableContainer
                            component={Paper}
                            elevation={0}
                            sx={{
                              border: (t) =>
                                `1px solid ${t.palette.divider}`,
                              borderRadius: 2,
                              overflowX: 'auto',
                              maxWidth: '100%',
                            }}
                          >
                            <Table
                              size="small"
                              aria-label="produtos-faltando"
                              sx={{ minWidth: 400 }}
                            >
                              <TableHead>
                                <TableRow
                                  sx={{
                                    '& th': {
                                      backgroundColor: (t) =>
                                        t.palette.grey[50],
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap',
                                    },
                                  }}
                                >
                                  <TableCell>Cód. Produto</TableCell>
                                  <TableCell>Qtd. contada</TableCell>
                                  <TableCell align="center">
                                    Ação
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {selectedLoc.codProdFaltando.map((cod) => (
                                  <TableRow key={cod}>
                                    <TableCell>{cod}</TableCell>
                                    <TableCell>
                                      <TextField
                                        size="small"
                                        type="number"
                                        inputProps={{ min: 0 }}
                                        value={countInputs[cod] ?? ''}
                                        onChange={(e) =>
                                          handleChangeCountInput(
                                            cod,
                                            e.target.value
                                          )
                                        }
                                        placeholder="Quantidade"
                                      />
                                    </TableCell>
                                    <TableCell align="center">
                                      <Button
                                        size="small"
                                        variant="contained"
                                        disabled={sendingCod === cod}
                                        onClick={() => handleContar(cod)}
                                      >
                                        {sendingCod === cod ? (
                                          <CircularProgress size={16} />
                                        ) : (
                                          'Contar'
                                        )}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Box>
                    )}
                  </>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Snackbar global */}
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
