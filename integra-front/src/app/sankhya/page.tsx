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
} from '@mui/material';
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
    API_BASE ? `${API_BASE}/sync/getProductLocation?id=${encodeURIComponent(id)}` : `/sync/getProductLocation?id=${encodeURIComponent(id)}`;
  const UPDATE_URL = API_BASE ? `${API_BASE}/sync/updateProductLocation` : `/sync/updateProductLocation`;

  // quando chegar produto novo, sincroniza o input de localização
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

      // supondo POST /sync/updateProductLocation com body { id, localizacao }
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
      // opcional: refetch para confirmar no backend
      // await handleBuscar();
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

                  {/* Campo editável de localização + botão */}
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
