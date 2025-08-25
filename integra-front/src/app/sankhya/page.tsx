'use client';

import React, { useState } from 'react';
import { Box, TextField, Button, CircularProgress, Typography, Card, CardContent, Divider } from '@mui/material';
import SidebarMenu from '@/components/SidebarMenu';

type Produto = {
  CODPROD?: string | number;
  DESCRPROD?: string;
  MARCA?: string;
  CODVOL?: string;
  // adicione outros campos se precisar
};

export default function Page() {
  const [cod, setCod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [produto, setProduto] = useState<Produto | null>(null);

  const handleBuscar = async () => {
    setErro(null);
    setProduto(null);

    const clean = cod.trim();
    if (!clean) {
      setErro('Informe o código do produto.');
      return;
    }

    try {
      setLoading(true);
      const resp = await fetch(`/api/produto/${encodeURIComponent(clean)}`);
      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha na busca (status ${resp.status})`);
      }
      const data = await resp.json();
      setProduto(data);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao buscar produto');
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

        <Typography variant="body1">
          Aplicativo para integrar estoque da EletroFarias (Sankhya → outras plataformas).
        </Typography>

        <Card sx={{ maxWidth: 760 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Buscar por código</Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="Código do produto"
                value={cod}
                onChange={(e) => setCod(e.target.value)}
                onKeyDown={handleKeyDown}
                size="small"
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