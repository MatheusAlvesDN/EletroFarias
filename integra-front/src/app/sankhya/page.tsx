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
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu, { DRAWER_WIDTH } from '@/components/SidebarMenu';

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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
    ? `${API_BASE}/sync/updateProductLocation`
    : `/sync/updateProductLocation`;

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
    <Box sx={{ display: 'fixed', height: '100vh', overflow: 'hidden' }}>
      {/* AppBar com botão de toggle */}
      <Box
        sx={{
          position: "fixed",       // 🔑 fica fixo sobre a tela
          top: 16,                  // sem espaçamento superior
          left: 16,                 // sem espaçamento lateral
          width: 56,
          height: 56,
          borderRadius: "50%",     // formato redondo
          bgcolor: "background.paper",
          boxShadow: 3,
          display: "fixed",
          alignItems: "center",
          justifyContent: "center",
          zIndex: (theme) => theme.zIndex.appBar,
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


      {/* Sidebar controlado (temporary no mobile, persistent no desktop) */}
      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main com scroll. Aplica margem quando o drawer estiver aberto em desktop */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: 0,
          backgroundColor: '#f0f4f8',
          overflowY: 'auto',
          height: '100vh',
          p: 5,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          lineHeight: '1.8',
          color: '#333',
          ml: { md: 0 && !isMobile ? `${DRAWER_WIDTH}px` : 0 },
          transition: (t) =>
            t.transitions.create('margin', {
              easing: t.transitions.easing.sharp,
              duration: t.transitions.duration.leavingScreen,
            }),
        }}
      >
        <Card
          sx={{
            maxWidth: 2000,
            mt: 6,      // margin-top
            mb: 0,      // margin-bottom
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Buscar por código
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'leftcenter', mb: 2 }}>
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
                  <TextField label="CODPROD" value={produto.CODPROD ?? ''} size="small" disabled />
                  <TextField label="DESCRPROD" value={produto.DESCRPROD ?? ''} size="small" disabled />
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
                  <TextField label="CODGRUPOPROD" value={produto.CODGRUPOPROD ?? ''} size="small" disabled />
                  <TextField label="DESCRGRUPOPROD" value={produto.DESCRGRUPOPROD ?? ''} size="small" disabled />

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
                </Stack>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
