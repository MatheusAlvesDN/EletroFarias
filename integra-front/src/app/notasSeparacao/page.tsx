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
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

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

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const [data, setData] = useState<unknown>(null);

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  // auth
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      setToken(null);
      // se você quiser forçar login quando não tiver token:
      // router.replace('/');
      // return;
    } else {
      setToken(t);
    }
  }, [router]);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const GET_NOTA_SEPARACAO_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getNotaSeparacao` : `/sync/getNotaSeparacao`),
    [API_BASE]
  );

  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const t = token ?? (typeof window !== 'undefined' ? localStorage.getItem('authToken') : null);
    if (t) headers.Authorization = `Bearer ${t}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const fetchNotaSeparacao = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);
      setOkMsg(null);

      const resp = await fetch(GET_NOTA_SEPARACAO_URL, {
        method: 'GET',
        headers: getAuthHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `Falha ao buscar nota separação (status ${resp.status})`);
      }

      const json = await resp.json();
      setData(json);

      setOkMsg('Dados carregados com sucesso.');
      setSnackbarOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar /sync/getNotaSeparacao';
      setErro(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [GET_NOTA_SEPARACAO_URL, getAuthHeaders]);

  // carrega ao abrir
  useEffect(() => {
    fetchNotaSeparacao();
  }, [fetchNotaSeparacao]);

  const asArray = useMemo(() => (Array.isArray(data) ? data : null), [data]);
  const asObject = useMemo(() => (isPlainObject(data) ? data : null), [data]);

  // se for array de objetos, mostramos tabela com chaves detectadas
  const tableKeys = useMemo(() => {
    if (!asArray || asArray.length === 0) return [];
    const firstObj = asArray.find(isPlainObject);
    if (!firstObj) return [];
    return Object.keys(firstObj);
  }, [asArray]);

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
                <Typography variant="h6" sx={SECTION_TITLE_SX}>
                  Nota Separação
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Endpoint: <b>/sync/getNotaSeparacao</b>
                </Typography>
              </Box>

              <Button variant="outlined" onClick={fetchNotaSeparacao} disabled={loading}>
                {loading ? <CircularProgress size={18} /> : 'Atualizar'}
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            {erro && (
              <Typography color="error" sx={{ mb: 2 }}>
                {erro}
              </Typography>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                <CircularProgress />
              </Box>
            ) : data == null ? (
              <Typography sx={{ color: 'text.secondary' }}>Sem dados.</Typography>
            ) : (
              <>
                {/* VISUALIZAÇÃO “AMIGÁVEL” */}
                {asArray ? (
                  asArray.length === 0 ? (
                    <Typography sx={{ color: 'text.secondary' }}>Array vazio.</Typography>
                  ) : tableKeys.length > 0 ? (
                    <TableContainer
                      component={Paper}
                      elevation={0}
                      sx={{
                        border: (t) => `1px solid ${t.palette.divider}`,
                        borderRadius: 2,
                        overflowX: 'auto',
                        backgroundColor: 'background.paper',
                        maxWidth: '100%',
                      }}
                    >
                      <Table size="small" stickyHeader aria-label="nota-separacao">
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
                            {tableKeys.map((k) => (
                              <TableCell key={k}>{k}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {asArray.map((row, idx) => {
                            if (!isPlainObject(row)) {
                              return (
                                <TableRow key={idx}>
                                  <TableCell colSpan={tableKeys.length}>
                                    {String(row)}
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            return (
                              <TableRow key={idx}>
                                {tableKeys.map((k) => (
                                  <TableCell key={k}>
                                    {row[k] == null
                                      ? '-'
                                      : typeof row[k] === 'object'
                                      ? JSON.stringify(row[k])
                                      : String(row[k])}
                                  </TableCell>
                                ))}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography sx={{ color: 'text.secondary' }}>
                      Retorno é um array, mas não parece ser um array de objetos (vou mostrar no JSON bruto abaixo).
                    </Typography>
                  )
                ) : asObject ? (
                  <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                      border: (t) => `1px solid ${t.palette.divider}`,
                      borderRadius: 2,
                      overflowX: 'auto',
                      backgroundColor: 'background.paper',
                      maxWidth: '100%',
                    }}
                  >
                    <Table size="small" aria-label="nota-separacao-obj">
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
                          <TableCell>Campo</TableCell>
                          <TableCell>Valor</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(asObject).map(([k, v]) => (
                          <TableRow key={k}>
                            <TableCell sx={{ fontWeight: 600 }}>{k}</TableCell>
                            <TableCell>
                              {v == null ? '-' : typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography>{String(data)}</Typography>
                )}

                {/* JSON BRUTO */}
                <Accordion sx={{ mt: 2 }} defaultExpanded={false}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ fontWeight: 600 }}>Ver JSON bruto</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box
                      component="pre"
                      sx={{
                        m: 0,
                        p: 2,
                        borderRadius: 2,
                        border: (t) => `1px solid ${t.palette.divider}`,
                        backgroundColor: '#0b1020',
                        color: '#e6edf3',
                        overflowX: 'auto',
                        fontSize: 12,
                        lineHeight: 1.6,
                      }}
                    >
                      {JSON.stringify(data, null, 2)}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Snackbar global */}
      <Snackbar
        open={snackbarOpen && (!!erro || !!okMsg)}
        autoHideDuration={3500}
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
