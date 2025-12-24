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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useUpdateLocStore } from '@/stores/useUpdateLocStore';
import { useRouter } from 'next/navigation';

import type { BrowserMultiFormatReader } from '@zxing/browser';
import type { Result, Exception } from '@zxing/library';

type EstoqueItem = {
  CODLOCAL: number | string;
  ESTOQUE: number | string | null;
  RESERVADO: number | string | null;
  DISPONIVEL: number | string | null;
  CODEMP?: number | string | null;
  CODPROD?: number | string | null;
  CONTROLE?: string | null;
  CODPARC?: number | string | null;
  TIPO?: string | null;
  LocalFinanceiro_DESCRLOCAL?: string | null;
  Empresa_NOMEFANTASIA?: string | null;
  Produto_DESCRPROD?: string | null;
  Parceiro_NOMEPARC?: string | null;
};

type Produto = {
  CODPROD?: string | number | null;
  DESCRPROD?: string | null;
  MARCA?: string | null;
  CARACTERISTICAS?: string | null;
  CODVOL?: string | null;
  CODGRUPOPROD?: string | null;
  LOCALIZACAO?: string | null;
  AD_LOCALIZACAO?: string | null;
  AD_QTDMAX?: number | null;
  DESCRGRUPOPROD?: string | null;
  estoque?: EstoqueItem[];
};

const MAX_LOC = 15;
const MAX_LOC2 = 15;

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [cod, setCod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [produto, setProduto] = useState<Produto | null>(null);

  const [localizacao, setLocalizacao] = useState<string>('');
  const [AD_LOCALIZACAO, setAD_LOCALIZACAO] = useState<string>('');
  const [AD_QTDMAX, setAD_QTDMAX] = useState<string>('');

  const abortRef = useRef<AbortController | null>(null);

  // [auth]
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);
  }, [router]);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  // Store (POST update)
  const { sendUpdateLocation, sendUpdateLocation2, sendUpdateQtdMax, isSaving, error: storeError } = useUpdateLocStore();

  // refletir campos do produto nos inputs editáveis
  useEffect(() => {
    setLocalizacao((produto?.LOCALIZACAO ?? '').toString().slice(0, MAX_LOC));
  }, [produto]);

  useEffect(() => {
    setAD_LOCALIZACAO((produto?.AD_LOCALIZACAO ?? '').toString().slice(0, MAX_LOC2));
  }, [produto]);

  useEffect(() => {
    setAD_QTDMAX((produto?.AD_QTDMAX ?? '').toString());
  }, [produto]);

  // aborta fetch pendente ao desmontar
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const numberFormatter = useMemo(() => new Intl.NumberFormat('pt-BR'), []);
  const toNum = (v: unknown) => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  const totais = useMemo(() => {
    const itens = produto?.estoque ?? [];
    return itens.reduce(
      (acc, it) => {
        acc.estoque += toNum(it.ESTOQUE);
        acc.reservado += toNum(it.RESERVADO);
        acc.disponivel += toNum(it.DISPONIVEL);
        return acc;
      },
      { estoque: 0, reservado: 0, disponivel: 0 }
    );
  }, [produto]);

  // =========================
  // Scanner (câmera)
  // =========================
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const zxingRef = useRef<BrowserMultiFormatReader | null>(null);
  const stopScannerRef = useRef<(() => void) | null>(null);

  const stopScanner = useCallback(() => {
    // para decode
    try {
      stopScannerRef.current?.();
    } catch {
      // ignore
    }
    stopScannerRef.current = null;

    // para stream
    const v = videoRef.current;
    const stream = v?.srcObject;
    if (stream && typeof stream === 'object') {
      const ms = stream as MediaStream;
      ms.getTracks().forEach((t) => t.stop());
    }
    if (v) v.srcObject = null;

    setScannerStarting(false);
  }, []);

  const startScanner = useCallback(async () => {
    setScannerError(null);
    setScannerStarting(true);

    try {
      const mod = await import('@zxing/browser');
      const { BrowserMultiFormatReader } = mod;

      if (!zxingRef.current) zxingRef.current = new BrowserMultiFormatReader();
      const reader = zxingRef.current;

      if (!videoRef.current) throw new Error('Video não inicializado.');

      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;

      // iOS/Safari: playsInline ajuda a não abrir fullscreen
      videoRef.current.setAttribute('playsinline', 'true');
      await videoRef.current.play();

      const stop = reader.decodeFromVideoElementContinuously(videoRef.current, (result?: Result, err?: Exception) => {
        if (result) {
          const text = result.getText()?.trim();
          if (text) {
            setCod(text);
            setScannerOpen(false);
            stopScanner();
          }
          return;
        }
        // err normalmente é NotFoundException (ainda não achou código) -> ignora
        void err;
      });

      stopScannerRef.current = () => {
        try {
          stop?.();
        } catch {
          // ignore
        }
        try {
          reader.reset();
        } catch {
          // ignore
        }
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível iniciar a câmera.';
      setScannerError(msg);
    } finally {
      setScannerStarting(false);
    }
  }, [stopScanner]);

  useEffect(() => {
    if (!scannerOpen) {
      stopScanner();
      return;
    }
    startScanner();

    return () => {
      stopScanner();
    };
  }, [scannerOpen, startScanner, stopScanner]);

  // =========================
  // Buscar Produto
  // =========================
  const handleBuscar = useCallback(async () => {
    setErro(null);
    setOkMsg(null);
    setProduto(null);

    const clean = cod.trim();
    if (!clean) {
      setErro('Informe o código do produto.');
      return;
    }
    // aceita apenas números (se seu código de barras tiver letras, remova esta validação)
    if (!/^\d+$/.test(clean)) {
      setErro('O código deve conter apenas números.');
      return;
    }

    const url = API_BASE
      ? `${API_BASE}/sync/getProduct?id=${encodeURIComponent(clean)}`
      : `/sync/getProduct?id=${encodeURIComponent(clean)}`;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(url, {
        method: 'GET',
        headers,
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha na busca (status ${resp.status})`);
      }

      const data = (await resp.json()) as Produto | null;
      if (!data || (!data.CODPROD && !data.DESCRPROD)) {
        setErro('Produto não encontrado.');
        setProduto(null);
        return;
      }

      setProduto(data);
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((e as { name?: string }).name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'Erro ao buscar produto';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }, [cod, API_BASE, token, API_TOKEN]);

  const handleSalvarLocalizacao = async () => {
    if (!produto?.CODPROD) {
      setErro('Busque um produto antes de atualizar a localização.');
      return;
    }
    setErro(null);
    setOkMsg(null);

    const id = Number(produto.CODPROD);
    if (!Number.isFinite(id)) {
      setErro('CODPROD inválido.');
      return;
    }

    const loc = localizacao.slice(0, MAX_LOC);
    const ok = await sendUpdateLocation(id, loc);

    if (ok) {
      setOkMsg('Localização atualizada com sucesso!');
      setProduto((p) => (p ? { ...p, LOCALIZACAO: loc } : p));
    } else {
      setErro(storeError || 'Erro ao atualizar localização');
    }
  };

  const handleSalvarAD_LOCALIZACAO = async () => {
    if (!produto?.CODPROD) {
      setErro('Busque um produto antes de atualizar a localização.');
      return;
    }
    setErro(null);
    setOkMsg(null);

    const id = Number(produto.CODPROD);
    if (!Number.isFinite(id)) {
      setErro('CODPROD inválido.');
      return;
    }

    const loc = AD_LOCALIZACAO.slice(0, MAX_LOC2);
    const ok = await sendUpdateLocation2(id, loc);

    if (ok) {
      setOkMsg('Localização atualizada com sucesso!');
      setProduto((p) => (p ? { ...p, AD_LOCALIZACAO: loc } : p));
    } else {
      setErro(storeError || 'Erro ao atualizar localização');
    }
  };

  const handleSalvarAD_QTDMAX = async () => {
    if (!produto?.CODPROD) {
      setErro('Busque um produto antes de atualizar a quantidade máxima.');
      return;
    }
    setErro(null);
    setOkMsg(null);

    const id = Number(produto.CODPROD);
    if (!Number.isFinite(id)) {
      setErro('CODPROD inválido.');
      return;
    }

    const qtdMax = AD_QTDMAX.trim();
    if (!/^\d+([.,]\d+)?$/.test(qtdMax)) {
      setErro('AD_QTDMAX deve ser numérico.');
      return;
    }

    const ok = await sendUpdateQtdMax(id, Number(qtdMax.replace(',', '.')));

    if (ok) {
      setOkMsg('QTD_MAX atualizada com sucesso!');
      setProduto((p) => (p ? { ...p, AD_QTDMAX: Number(qtdMax.replace(',', '.')) } : p));
    } else {
      setErro(storeError || 'Erro ao atualizar QTD_MAX');
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') void handleBuscar();
  };

  const onChangeLimit: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value ?? '';
    setLocalizacao(v.slice(0, MAX_LOC));
  };

  const onChangeLimit2: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value ?? '';
    setAD_LOCALIZACAO(v.slice(0, MAX_LOC2));
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

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Floating button: sidebar */}
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
              Buscar por código
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Código do produto"
                value={cod}
                onChange={(e) => setCod(e.target.value)}
                onKeyDown={handleKeyDown}
                size="small"
                autoFocus
                slotProps={{
                  htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' },
                }}
              />

              <Button variant="outlined" onClick={() => setScannerOpen(true)} disabled={loading}>
                Ler código (câmera)
              </Button>

              <Button variant="contained" onClick={() => void handleBuscar()} disabled={loading}>
                {loading ? <CircularProgress size={22} /> : 'Buscar'}
              </Button>
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

            {produto && (
              <>
                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" sx={SECTION_TITLE_SX}>
                  Resultado
                </Typography>

                <Stack spacing={2}>
                  <Box
                    component="img"
                    src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${produto.CODPROD}.dbimage`}
                    alt={produto.DESCRPROD ?? 'Imagem do produto'}
                    sx={{
                      width: 200,
                      height: 200,
                      objectFit: 'contain',
                      border: (t) => `1px solid ${t.palette.divider}`,
                      borderRadius: 2,
                      backgroundColor: 'background.default',
                    }}
                  />

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField label="CODPROD" value={produto.CODPROD ?? ''} size="small" disabled fullWidth />
                    <TextField label="DESCRPROD" value={produto.DESCRPROD ?? ''} size="small" disabled fullWidth />
                  </Box>

                  {/* LOCALIZAÇÃO editável */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' }, gap: 2, alignItems: 'center' }}>
                    <TextField
                      label="LOCALIZAÇÃO"
                      value={localizacao}
                      onChange={onChangeLimit}
                      size="small"
                      fullWidth
                      slotProps={{ htmlInput: { maxLength: MAX_LOC } }}
                      helperText={`${localizacao.length}/${MAX_LOC}`}
                    />
                    <Button
                      variant="contained"
                      onClick={handleSalvarLocalizacao}
                      disabled={isSaving || !produto?.CODPROD || localizacao.length === 0}
                      sx={{ whiteSpace: 'nowrap', height: 40 }}
                    >
                      {isSaving ? <CircularProgress size={22} /> : 'Salvar'}
                    </Button>
                  </Box>

                  {/* LOCALIZAÇÃO 2 */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' }, gap: 2, alignItems: 'center' }}>
                    <TextField
                      label={`LOCALIZAÇÃO 2 / QTD_MAX: ${String(produto?.AD_QTDMAX ?? '-')}`}
                      value={AD_LOCALIZACAO}
                      onChange={onChangeLimit2}
                      size="small"
                      fullWidth
                      slotProps={{ htmlInput: { maxLength: MAX_LOC2 } }}
                      helperText={`${AD_LOCALIZACAO.length}/${MAX_LOC2}`}
                    />
                    <Button
                      variant="contained"
                      onClick={handleSalvarAD_LOCALIZACAO}
                      disabled={isSaving || !produto?.CODPROD || AD_LOCALIZACAO.length === 0}
                      sx={{ whiteSpace: 'nowrap', height: 40 }}
                    >
                      {isSaving ? <CircularProgress size={22} /> : 'Salvar'}
                    </Button>
                  </Box>

                  {/* QTD_MAX */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' }, gap: 2, alignItems: 'center' }}>
                    <TextField
                      label="QTD_MAX (AD_QTDMAX)"
                      value={AD_QTDMAX}
                      onChange={(e) => setAD_QTDMAX(e.target.value)}
                      size="small"
                      fullWidth
                      slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                      helperText={`Atual: ${String(produto?.AD_QTDMAX ?? '-')}`}
                    />
                    <Button
                      variant="contained"
                      onClick={handleSalvarAD_QTDMAX}
                      disabled={isSaving || !produto?.CODPROD || AD_QTDMAX.trim().length === 0}
                      sx={{ whiteSpace: 'nowrap', height: 40 }}
                    >
                      {isSaving ? <CircularProgress size={22} /> : 'Salvar'}
                    </Button>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField label="MARCA" value={produto.MARCA ?? ''} size="small" disabled fullWidth />
                    <TextField label="CODVOL" value={produto.CODVOL ?? ''} size="small" disabled fullWidth />
                  </Box>

                  <TextField
                    label="CARACTERÍSTICAS"
                    value={produto.CARACTERISTICAS ?? ''}
                    size="small"
                    disabled
                    multiline
                    minRows={2}
                    fullWidth
                  />

                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" sx={SECTION_TITLE_SX}>
                    Estoque por local
                  </Typography>

                  {!produto.estoque || produto.estoque.length === 0 ? (
                    <Typography sx={{ color: 'text.secondary' }}>Nenhum registro de estoque para este produto.</Typography>
                  ) : (
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
                      <Table size="small" aria-label="estoque-por-local" stickyHeader>
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
                            <TableCell>Código Local</TableCell>
                            <TableCell>Local</TableCell>
                            <TableCell>Cód. Empresa</TableCell>
                            <TableCell align="right">Estoque</TableCell>
                            <TableCell align="right">Reservado</TableCell>
                            <TableCell align="right">Disponível</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {produto.estoque!.map((it, idx) => (
                            <TableRow
                              key={`${it.CODLOCAL}-${idx}`}
                              sx={{ '&:nth-of-type(odd)': { backgroundColor: (t) => t.palette.action.hover } }}
                            >
                              <TableCell>{it.CODLOCAL}</TableCell>
                              <TableCell>{it.LocalFinanceiro_DESCRLOCAL ?? '-'}</TableCell>
                              <TableCell>{it.CODEMP ?? '-'}</TableCell>
                              <TableCell align="right">{numberFormatter.format(toNum(it.ESTOQUE))}</TableCell>
                              <TableCell align="right">{numberFormatter.format(toNum(it.RESERVADO))}</TableCell>
                              <TableCell align="right">{numberFormatter.format(toNum(it.DISPONIVEL))}</TableCell>
                            </TableRow>
                          ))}

                          <TableRow>
                            <TableCell colSpan={3} sx={{ fontWeight: 700 }}>
                              Totais
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {numberFormatter.format(totais.estoque)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {numberFormatter.format(totais.reservado)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {numberFormatter.format(totais.disponivel)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Stack>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dialog do scanner */}
        <Dialog
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Ler código de barras</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Aponte a câmera para o código. Assim que reconhecer, ele será preenchido automaticamente.
            </Typography>

            {scannerError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {scannerError}
              </Alert>
            )}

            <Box
              sx={{
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                border: (t) => `1px solid ${t.palette.divider}`,
                backgroundColor: 'black',
              }}
            >
              <video
                ref={videoRef}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                muted
              />
            </Box>

            {scannerStarting && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <CircularProgress size={18} />
                <Typography variant="body2">Iniciando câmera...</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setScannerOpen(false);
                stopScanner();
              }}
            >
              Fechar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
