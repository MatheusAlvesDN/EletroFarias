'use client';

import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  CircularProgress,
} from '@mui/material';
import * as XLSX from 'xlsx';

type Localizacoes = {
  Rua: string;
  Predio: string;
  Nivel: string;
  Apartamento: string;
  Endereco: string;
  Armazenamento: string;
};

const REQUIRED_HEADERS: (keyof Localizacoes)[] = [
  'Rua',
  'Predio',
  'Nivel',
  'Apartamento',
  'Endereco',
  'Armazenamento',
];

function normalizeHeader(h: any) {
  return String(h ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function toStr(v: any) {
  // preserva zeros à esquerda quando vier texto; quando vier número, converte
  if (v == null) return '';
  if (typeof v === 'number') return String(v).padStart(2, '0'); // útil pra Rua/Nivel/Apartamento
  return String(v).trim();
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function ImportarLocalizacoesPage() {
  const [rows, setRows] = useState<Localizacoes[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const IMPORT_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/importLocalizacoes` : `/sync/importLocalizacoe`),
    [API_BASE],
  );

  const handleFile = async (file: File) => {
    setErrMsg(null);
    setOkMsg(null);
    setRows([]);

    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });

    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      setErrMsg('Planilha vazia (nenhuma aba encontrada).');
      return;
    }

    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
      defval: '',
      raw: false,
    });

    if (!raw.length) {
      setErrMsg('Aba sem linhas de dados.');
      return;
    }

    // Normaliza headers: pega as chaves do primeiro objeto
    const headers = Object.keys(raw[0]).map(normalizeHeader);
    const headerMap = new Map<string, string>();
    Object.keys(raw[0]).forEach((k) => headerMap.set(normalizeHeader(k), k));

    const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    if (missing.length) {
      setErrMsg(`Colunas obrigatórias ausentes: ${missing.join(', ')}`);
      return;
    }

    const parsed: Localizacoes[] = raw.map((r) => ({
      Rua: toStr(r[headerMap.get('Rua')!]),
      Predio: toStr(r[headerMap.get('Predio')!]).padStart(3, '0'),
      Nivel: toStr(r[headerMap.get('Nivel')!]).padStart(2, '0'),
      Apartamento: toStr(r[headerMap.get('Apartamento')!]).padStart(2, '0'),
      Endereco: toStr(r[headerMap.get('Endereco')!]),
      Armazenamento: toStr(r[headerMap.get('Armazenamento')!]),
    }));

    // validação mínima
    const invalid = parsed.findIndex((p) => !p.Endereco);
    if (invalid >= 0) {
      setErrMsg(`Linha inválida: Endereco vazio na linha ${invalid + 2} (considerando cabeçalho).`);
      return;
    }

    setRows(parsed);
    setOkMsg(`Arquivo carregado: ${parsed.length} linhas.`);
  };

  const handleUpload = async () => {
    setErrMsg(null);
    setOkMsg(null);

    if (!rows.length) {
      setErrMsg('Carregue um arquivo antes de enviar.');
      return;
    }

    setLoading(true);
    try {
      const batches = chunk(rows, 1000); // lote de 1000 (ajuste se precisar)
      let total = 0;

      for (const items of batches) {
        const resp = await fetch(IMPORT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });

        if (!resp.ok) {
          const txt = await resp.text().catch(() => '');
          throw new Error(`Erro ao importar (HTTP ${resp.status}). ${txt}`);
        }

        const json = await resp.json().catch(() => ({}));
        total += Number(json?.count ?? items.length);
      }

      setOkMsg(`Importação concluída. Registros processados: ${total}.`);
    } catch (e: any) {
      setErrMsg(e?.message ?? 'Erro desconhecido ao importar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Importar Localizações (Excel)</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            O Excel precisa ter as colunas: {REQUIRED_HEADERS.join(', ')}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
            <Button variant="contained" component="label" disabled={loading}>
              Selecionar Excel
              <input
                hidden
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.currentTarget.value = '';
                }}
              />
            </Button>

            <Button
              variant="contained"
              color="success"
              onClick={handleUpload}
              disabled={loading || rows.length === 0}
            >
              Enviar para o backend
            </Button>

            {loading && <CircularProgress size={26} />}
          </Box>

          {okMsg && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {okMsg}
            </Alert>
          )}
          {errMsg && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errMsg}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Preview (primeiras 50 linhas)
          </Typography>

          <TableContainer component={Paper} sx={{ maxHeight: '65vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rua</TableCell>
                  <TableCell>Predio</TableCell>
                  <TableCell>Nivel</TableCell>
                  <TableCell>Apartamento</TableCell>
                  <TableCell>Endereco</TableCell>
                  <TableCell>Armazenamento</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.slice(0, 50).map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{r.Rua}</TableCell>
                    <TableCell>{r.Predio}</TableCell>
                    <TableCell>{r.Nivel}</TableCell>
                    <TableCell>{r.Apartamento}</TableCell>
                    <TableCell>{r.Endereco}</TableCell>
                    <TableCell>{r.Armazenamento}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {rows.length > 50 && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              Mostrando 50 de {rows.length}.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
