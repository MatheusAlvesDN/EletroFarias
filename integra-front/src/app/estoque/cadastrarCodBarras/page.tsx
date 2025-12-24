'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import type { Result } from '@zxing/library';

type Produto = {
  CODPROD?: string | number | null;
  DESCRPROD?: string | null;
  MARCA?: string | null;
  CODVOL?: string | null;
  LOCALIZACAO?: string | null;
  AD_LOCALIZACAO?: string | null;
  AD_QTDMAX?: number | null;
  CARACTERISTICAS?: string | null;
};

type LookupState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'found'; produto: Produto }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string };

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // barcode
  const [codBarras, setCodBarras] = useState<string>('');
  const [lookup, setLookup] = useState<LookupState>({ kind: 'idle' });

  // cadastrar vínculo
  const [codProd, setCodProd] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // auth
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

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  /**
   * ✅ IMPORTANTE:
   * Você não informou qual endpoint faz lookup por código de barras.
   * Eu deixei como /sync/getProduct?id=... (igual sua tela atual),
   * porque em muitos backends ele já resolve por barcode também.
   *
   * Se o seu backend tiver outro endpoint (ex: /sync/getProductByCodBarras),
   * é só trocar aqui.
   */
  const getLookupUrl = useCallback(
    (barcode: string) =>
      API_BASE
        ? `${API_BASE}/sync/getProduct?id=${encodeURIComponent(barcode)}`
        : `/sync/getProduct?id=${encodeURIComponent(barcode)}`,
    [API_BASE]
  );

  const CADASTRAR_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/cadastrarCodBarras` : `/sync/cadastrarCodBarras`),
    [API_BASE]
  );

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const buscarPorCodBarras = useCallback(
    async (barcodeRaw?: string) => {
      setSaveMsg(null);

      const clean = (barcodeRaw ?? codBarras).trim();
      if (!clean) {
        setLookup({ kind: 'error', message: 'Informe ou leia um código de barras.' });
        return;
      }

      // se seu barcode tiver letras, remova esta validação:
      if (!/^\d+$/.test(clean)) {
        setLookup({ kind: 'error', message: 'Código de barras deve conter apenas números.' });
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLookup({ kind: 'loading' });

      try {
        const resp = await fetch(getLookupUrl(clean), {
          method: 'GET',
          headers: getHeaders(),
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha na busca (status ${resp.status})`);
        }

        const data = (await resp.json()) as Produto | null;

        // critério de “encontrou”
        const found = !!(data && (data.CODPROD || data.DESCRPROD));
        if (found) {
          setLookup({ kind: 'found', produto: data! });
          return;
        }

        setLookup({ kind: 'not_found' });
      } catch (e: unknown) {
        if (e && typeof e === 'object' && 'name' in e && (e as { name?: unknown }).name === 'AbortError') return;
        const msg = e instanceof Error ? e.message : 'Erro ao buscar pelo código de barras.';
        setLookup({ kind: 'error', message: msg });
      }
    },
    [codBarras, getHeaders, getLookupUrl]
  );

  const cadastrarVinculo = useCallback(async () => {
    setSaveMsg(null);

    const barcode = codBarras.trim();
    if (!barcode) {
      setSaveMsg({ type: 'error', text: 'Leia ou digite o código de barras antes de cadastrar.' });
      return;
    }
    if (!/^\d+$/.test(barcode)) {
      setSaveMsg({ type: 'error', text: 'Código de barras deve conter apenas números.' });
      return;
    }

    const prod = codProd.trim();
    if (!prod) {
      setSaveMsg({ type: 'error', text: 'Informe o código do produto (CODPROD).' });
      return;
    }
    if (!/^\d+$/.test(prod)) {
      setSaveMsg({ type: 'error', text: 'CODPROD deve conter apenas números.' });
      return;
    }

    setSaving(true);

    try {
      const resp = await fetch(CADASTRAR_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify({ codBarras: barcode, codProd: Number(prod) }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao cadastrar (status ${resp.status})`);
      }

      setSaveMsg({ type: 'success', text: 'Código de barras cadastrado com sucesso!' });

      // opcional: após cadastrar, tenta buscar de novo pra confirmar e exibir produto
      await buscarPorCodBarras(barcode);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao cadastrar código de barras.';
      setSaveMsg({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  }, [CADASTRAR_URL, buscarPorCodBarras, codBarras, codProd, getHeaders]);

  // -------------------------------
  // Scanner (ZXing)
  // -------------------------------
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerErr, setScannerErr] = useState<string | null>(null);

  const stopScanner = useCallback(() => {
    try {
      controlsRef.current?.stop();
    } catch {
      // ignore
    }
    controlsRef.current = null;

    // ✅ não existe reset() no BrowserMultiFormatReader
    readerRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => () => stopScanner(), [stopScanner]);

  const startScanner = useCallback(async () => {
    setScannerErr(null);

    if (!videoRef.current) {
      setScannerErr('Elemento de vídeo não disponível.');
      return;
    }

    stopScanner();

    if (!readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader();
    }

    setScannerLoading(true);

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      };

      const controls = await readerRef.current.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result: Result | undefined) => {
          if (!result) return;

          const text = result.getText()?.trim();
          if (!text) return;

          setCodBarras(text);
          setScannerOpen(false);
          stopScanner();

          // ✅ após ler, já tenta buscar
          void buscarPorCodBarras(text);
        }
      );

      controlsRef.current = controls;
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Não foi possível abrir a câmera. Verifique permissões do navegador.';
      setScannerErr(msg);
    } finally {
      setScannerLoading(false);
    }
  }, [buscarPorCodBarras, stopScanner]);

  useEffect(() => {
    if (!scannerOpen) return;
    void startScanner();
  }, [scannerOpen, startScanner]);

  // -------------------------------

  const handleKeyDownBarcode: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') void buscarPorCodBarras();
  };

  const produto =
    lookup.kind === 'found' ? lookup.produto : null;

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
        <Card sx={{ maxWidth: 1200, mx: 'auto', mt: 6, borderRadius: 2, boxShadow: 0, border: 1, backgroundColor: 'background.paper' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Cadastrar código de barras
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
              <TextField
                label="Código de barras"
                value={codBarras}
                onChange={(e) => setCodBarras(e.target.value)}
                onKeyDown={handleKeyDownBarcode}
                size="small"
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
              />

              <Button variant="outlined" onClick={() => setScannerOpen(true)}>
                Ler com câmera
              </Button>

              <Button
                variant="contained"
                onClick={() => void buscarPorCodBarras()}
                disabled={lookup.kind === 'loading'}
              >
                {lookup.kind === 'loading' ? <CircularProgress size={20} /> : 'Buscar'}
              </Button>
            </Box>

            {lookup.kind === 'error' && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {lookup.message}
              </Alert>
            )}

            {lookup.kind === 'found' && produto && (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <b>PRODUTO JÁ CADASTRADO</b>
                </Alert>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={2}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField label="CODPROD" value={String(produto.CODPROD ?? '')} size="small" disabled fullWidth />
                    <TextField label="DESCRPROD" value={produto.DESCRPROD ?? ''} size="small" disabled fullWidth />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField label="MARCA" value={produto.MARCA ?? ''} size="small" disabled fullWidth />
                    <TextField label="CODVOL" value={produto.CODVOL ?? ''} size="small" disabled fullWidth />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField label="LOCALIZAÇÃO" value={produto.LOCALIZACAO ?? ''} size="small" disabled fullWidth />
                    <TextField label="LOCALIZAÇÃO 2" value={produto.AD_LOCALIZACAO ?? ''} size="small" disabled fullWidth />
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
                </Stack>
              </>
            )}

            {lookup.kind === 'not_found' && (
              <>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Nenhum produto encontrado para este código de barras.
                </Alert>

                <Typography sx={{ mb: 1 }}>
                  Informe o <b>CODPROD</b> (código do produto) para cadastrar o vínculo:
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField
                    label="CODPROD (código do produto)"
                    value={codProd}
                    onChange={(e) => setCodProd(e.target.value)}
                    size="small"
                    slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                  />

                  <Button variant="contained" onClick={() => void cadastrarVinculo()} disabled={saving}>
                    {saving ? <CircularProgress size={20} /> : 'Cadastrar'}
                  </Button>
                </Box>

                {saveMsg && (
                  <Alert severity={saveMsg.type} sx={{ mt: 2 }}>
                    {saveMsg.text}
                  </Alert>
                )}
              </>
            )}

            {lookup.kind === 'idle' && (
              <Typography sx={{ color: 'text.secondary' }}>
                Leia um código de barras com a câmera ou digite e clique em <b>Buscar</b>.
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Modal Scanner */}
        <Dialog open={scannerOpen} onClose={() => { setScannerOpen(false); stopScanner(); }} fullWidth maxWidth="sm">
          <DialogTitle>Ler código de barras</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Aponte a câmera para o código. Ao ler, a busca será feita automaticamente.
            </Typography>

            <Box
              sx={{
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                border: (t) => `1px solid ${t.palette.divider}`,
                backgroundColor: 'black',
              }}
            >
              <video ref={videoRef} style={{ width: '100%', height: 'auto', display: 'block' }} muted playsInline />
            </Box>

            {scannerLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <CircularProgress size={18} />
                <Typography variant="body2">Iniciando câmera...</Typography>
              </Box>
            )}

            {scannerErr && (
              <Typography color="error" sx={{ mt: 2 }}>
                {scannerErr}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
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
