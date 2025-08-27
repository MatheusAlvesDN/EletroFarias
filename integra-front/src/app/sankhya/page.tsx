'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';

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

export default function Page() {
  const theme = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cod, setCod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [produto, setProduto] = useState<Produto | null>(null);
  const [localizacao, setLocalizacao] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);
  const GET_URL = (id: string) =>
    API_BASE
      ? `${API_BASE}/sync/getProductLocation?id=${encodeURIComponent(id)}`
      : `/sync/getProductLocation?id=${encodeURIComponent(id)}`;
  const UPDATE_URL = API_BASE
    ? `${API_BASE}/sync/updateProductLocation?id=${encodeURIComponent(produto?.CODPROD ?? '')}&localizacao=${encodeURIComponent(localizacao)}`
    : `${API_BASE}/sync/updateProductLocation?id=${encodeURIComponent(produto?.CODPROD ?? '')}&localizacao=${encodeURIComponent(localizacao)}`;

  useEffect(() => {
    setLocalizacao(produto?.LOCALIZACAO ?? '');
  }, [produto]);

  const handleBuscar = async () => {
    setErro(null);
    setOkMsg(null);
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

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const resp = await fetch(GET_URL(clean), {
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
      setOkMsg(null);
    } catch (e: unknown) {
      // @ts-expect-error Abort check
      if (e?.name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'Erro ao buscar produto';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarLocalizacao = async () => {
    if (!produto?.CODPROD) {
      setErro('Busque um produto antes de atualizar a localização.');
      return;
    }
    setErro(null);
    setOkMsg(null);

    try {
      setSaving(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const body = JSON.stringify({
        id: produto.CODPROD,
        localizacao: localizacao ?? '',
      });

      const resp = await fetch(UPDATE_URL, { method: 'POST', headers, body });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao atualizar localização (status ${resp.status})`);
      }

      setOkMsg('Localização atualizada com sucesso!');
      // opcional: await handleBuscar();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao atualizar localização';
      setErro(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') handleBuscar();
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Botão flutuante para abrir/fechar a sidebar */}
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

      {/* Sidebar */}
      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main scrollable (scroll ativo e barra escondida) */}
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
          // margem quando o drawer estiver aberto em desktop
          ml: { 0 : 0 },
          transition: (t) =>
            t.transitions.create('margin', {
              easing: t.transitions.easing.sharp,
              duration: t.transitions.duration.leavingScreen,
            }),
          // Esconde a barra de rolagem mantendo o scroll
          scrollbarWidth: 'none',      // Firefox
          msOverflowStyle: 'none',     // IE/Edge antigo
          '&::-webkit-scrollbar': {    // Chrome/Safari/Edge (Blink/WebKit)
            display: 'none',
          },
        }}
      >
        <Card
          sx={{
            maxWidth: 2000,
            mt: 6,
            mb: 0,
          }}
        >
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
            {okMsg && (
              <Typography color="success.main" sx={{ mb: 1 }}>
                {okMsg}
              </Typography>
            )}

            {produto && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Resultado
                </Typography>

                <Stack spacing={2}>
                  {/* Imagem do produto */}
                  <Box
                    component="img"
                    src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${produto.CODPROD}.dbimage`}
                    alt={produto.DESCRPROD ?? 'Imagem do produto'}
                    sx={{
                      width: 200,
                      height: 200,
                      objectFit: 'contain',
                      border: '1px solid #ccc',
                      borderRadius: 2,
                    }}
                  />

                  <TextField label="CODPROD" value={produto.CODPROD ?? ''} size="small" disabled />
                  <TextField label="DESCRPROD" value={produto.DESCRPROD ?? ''} size="small" disabled />

                  {/* LOCALIZAÇÃO editável + botão */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, alignItems: 'center' }}>
                    <TextField
                      label="LOCALIZAÇÃO"
                      value={localizacao}
                      onChange={(e) => setLocalizacao(e.target.value)}
                      size="small"
                    />
                    <Button
                      variant="contained"
                      onClick={handleSalvarLocalizacao}
                      disabled={saving || !produto?.CODPROD}
                    >
                      {saving ? <CircularProgress size={22} /> : 'Salvar'}
                    </Button>
                  </Box>

                  <TextField label="MARCA" value={produto.MARCA ?? ''} size="small" disabled />
                  <TextField
                    label="CARACTERÍSTICAS"
                    value={produto.CARACTERISTICAS ?? ''}
                    size="small"
                    disabled
                    multiline
                    minRows={2}
                  />
                  <TextField label="CODVOL" value={produto.CODVOL ?? ''} size="small" disabled />

                </Stack>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
