'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import SidebarMenu from '@/components/SidebarMenu';

type Produto = {
  CODPROD?: string | number;
  DESCRPROD?: string;
  MARCA?: string;
  CODVOL?: string;
};

export default function Page() {
  const [cod, setCod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [produto, setProduto] = useState<Produto | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const handleBuscar = async () => {
    setErro(null);
    setProduto(null);

    const clean = cod.trim();
    if (!clean) {
      setErro('Informe o código do produto.');
      return;
    }
    if (!/^\d+$/.test(clean)) {
      setErro('O código deve conter apenas números.');
      return;
    }

    // cancela requisição anterior (se ainda em voo)
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);

      const url =
        API_BASE
          ? `${API_BASE}/getProductLocation?id=${encodeURIComponent(clean)}`
          : `/getProductLocation?id=${encodeURIComponent(clean)}`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

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
      /* eslint-disable @typescript-eslint/no-explicit-any */
      if ((e as any)?.name === 'AbortError') return; // ignorar cancelamento
      const msg = e instanceof Error ? e.message : 'Erro ao buscar produto';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') handleBuscar();
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <SidebarMenu />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: '#f0f4f8',
          overflowY: 'auto',
          p: 5,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          lineHeight: '1.8',
          color: '#333',
        }}
      >
        <Typography variant="h4" sx={{ color: '#006400', mb: 1 }}>
          Consulta de Produto
        </Typography>

        <Card sx={{ maxWidth: 760 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Buscar por código
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="Código do produto"
                value={cod}
                onChange={(e) => setCod(e.target.value)}
                onKeyDown={handleKeyDown}
                size="small"
                autoFocus
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              />
              <Button variant="contained" onClick={handleBuscar} disabled={loading}>
                {loading ? <CircularProgress size={22} /> : 'Buscar'}
              </Button>
            </Box>

            {erro && (
              <Typography color="error" sx={{ mb: 1 }}>
                {erro}
              </Typography>
            )}

            {produto && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Resultado
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: '180px 1fr', rowGap: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>CODPROD</Typography>
                  <Typography>{produto.CODPROD ?? '—'}</Typography>

                  <Typography sx={{ fontWeight: 600 }}>DESCRPROD</Typography>
                  <Typography>{produto.DESCRPROD ?? '—'}</Typography>

                  <Typography sx={{ fontWeight: 600 }}>MARCA</Typography>
                  <Typography>{produto.MARCA ?? '—'}</Typography>

                  <Typography sx={{ fontWeight: 600 }}>CODVOL</Typography>
                  <Typography>{produto.CODVOL ?? '—'}</Typography>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
