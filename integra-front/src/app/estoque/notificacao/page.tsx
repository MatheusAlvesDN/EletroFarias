'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Button,
} from '@mui/material';

type ErroEstoque = {
  id: string;
  codProd: number;
  descricao: string;
  createdAt: string;
  userCreate: string;
  resolvido: boolean;
  userResolve?: string | null;
  resolvedAt?: string | null;
};

function formatDateTimeBR(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR');
}

export default function ErroEstoquePage() {
  const [data, setData] = useState<ErroEstoque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'TODOS' | 'PENDENTES' | 'RESOLVIDOS'>('PENDENTES');

  // evita setState após unmount + cancela fetch anterior
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const fetchErros = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      setError(null);
      setIsLoading(true);

      const res = await fetch('/sync/getAllErroEstoque', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: ac.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Erro HTTP ${res.status}`);
      }

      const json = (await res.json()) as ErroEstoque[];
      if (!mountedRef.current) return;

      // ordena: pendentes primeiro, mais novos no topo
      const sorted = [...(json ?? [])].sort((a, b) => {
        if (a.resolvido !== b.resolvido) return a.resolvido ? 1 : -1;
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return db - da;
      });

      setData(sorted);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setError(e?.message || 'Falha ao buscar erros de estoque.');
    } finally {
      if (!mountedRef.current) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchErros();

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [fetchErros]);

  const counts = useMemo(() => {
    const total = data.length;
    const pend = data.filter((x) => !x.resolvido).length;
    const res = total - pend;
    return { total, pend, res };
  }, [data]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return data.filter((x) => {
      if (status === 'PENDENTES' && x.resolvido) return false;
      if (status === 'RESOLVIDOS' && !x.resolvido) return false;

      if (!needle) return true;

      const hay = [
        x.id,
        String(x.codProd ?? ''),
        x.descricao ?? '',
        x.userCreate ?? '',
        x.userResolve ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [data, q, status]);

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ maxWidth: 1400, mx: 'auto' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
            <Box>
              <Typography variant="h5" fontWeight={800}>
                Erros de Estoque
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lista vinda de GET <code>sync/getAllErroEstoque</code>
              </Typography>
            </Box>

            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Chip label={`Total: ${counts.total}`} />
              <Chip label={`Pendentes: ${counts.pend}`} color="warning" />
              <Chip label={`Resolvidos: ${counts.res}`} color="success" />
              <Button variant="outlined" onClick={fetchErros} disabled={isLoading}>
                Atualizar agora
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              label="Buscar (cód. produto, descrição, usuário...)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              fullWidth
            />

            <ToggleButtonGroup
              value={status}
              exclusive
              onChange={(_, v) => v && setStatus(v)}
              sx={{ flexShrink: 0 }}
            >
              <ToggleButton value="PENDENTES">Pendentes</ToggleButton>
              <ToggleButton value="RESOLVIDOS">Resolvidos</ToggleButton>
              <ToggleButton value="TODOS">Todos</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 2 }}>
            {isLoading ? (
              <Stack alignItems="center" py={6}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Carregando...
                </Typography>
              </Stack>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={120}><b>Status</b></TableCell>
                      <TableCell width={110}><b>Cód. Prod</b></TableCell>
                      <TableCell><b>Descrição</b></TableCell>
                      <TableCell width={200}><b>Criado em</b></TableCell>
                      <TableCell width={180}><b>Usuário criação</b></TableCell>
                      <TableCell width={180}><b>Usuário resolução</b></TableCell>
                      <TableCell width={200}><b>Resolvido em</b></TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {filtered.map((row) => (
                      <TableRow key={row.id} hover sx={{ opacity: row.resolvido ? 0.75 : 1 }}>
                        <TableCell>
                          {row.resolvido ? (
                            <Chip size="small" label="Resolvido" color="success" />
                          ) : (
                            <Chip size="small" label="Pendente" color="warning" />
                          )}
                        </TableCell>
                        <TableCell>{row.codProd}</TableCell>
                        <TableCell>{row.descricao}</TableCell>
                        <TableCell>{formatDateTimeBR(row.createdAt)}</TableCell>
                        <TableCell>{row.userCreate}</TableCell>
                        <TableCell>{row.userResolve || '-'}</TableCell>
                        <TableCell>{formatDateTimeBR(row.resolvedAt)}</TableCell>
                      </TableRow>
                    ))}

                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
                            Nenhum registro encontrado.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
