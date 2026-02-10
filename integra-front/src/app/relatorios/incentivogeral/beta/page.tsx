'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, CircularProgress, Paper, Snackbar, Typography,
  IconButton, Table, TableBody, TableCell,
  TableContainer, Grid, TableHead, TableRow, GlobalStyles,
  TextField, Button, Chip
} from '@mui/material';
//import Grid from '@mui/material/Grid2';

// --- ÍCONES ---
const RefreshIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

// --- INTERFACE ---
interface IncentivoResumoParceiro {
  CODPARC: string | number;
  NOMEPARC: string;
  UF?: string;

  GRUPO_CLIENTE?: string;
  AD_TIPOCLIENTEFATURAR: string;

  QTD_NOTAS: number;
  TOTAL: number;
  TOTAL_ST: number;
  TOTAL_TRIB: number;
  ST_IND_PB: number;
  TRIB_IND_PB: number;
  VALOR_RESTANTE: number;

  PERC_ST?: number;
  PERC_TRIB?: number;

  ALIQ_ST_REST?: number;
  ALIQ_TRIB_REST?: number;

  ALIQ_EFETIVA?: number;
  IMPOSTO_TOTAL?: number;

  REGRA_ST_TEXTO?: string;
  REGRA_TRIB_TEXTO?: string;

  BK_ST?: string;
  FG_ST?: string;
  BK_TRIB?: string;
  FG_TRIB?: string;
}

// --- HELPERS ---
const safeNum = (v: any) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatPercent = (val: number) => `${(val * 100).toFixed(2).replace('.', ',')}%`;

const getValue = (row: any, key: string) => row?.[key] ?? 0;
const getStr = (row: any, key: string) => String(row?.[key] ?? '');

// --- PARSER SANKHYA ---
const parseSankhyaResponse = (data: any): any[] => {
  if (Array.isArray(data)) return data;

  const body = data?.responseBody || data;
  const rows = body?.rows;
  const metadata = body?.fieldsMetadata;

  if (Array.isArray(rows) && Array.isArray(metadata)) {
    return rows.map((rowArray: any[]) => {
      const rowObject: any = {};
      metadata.forEach((meta: any, index: number) => {
        rowObject[meta.name] = rowArray[index];
      });
      return rowObject;
    });
  }

  return [];
};

// --- TEMA ---
const THEME = {
  bgMain: '#f0fdf4',
  bgGradient: 'radial-gradient(circle at 50% -20%, #d1fae5, #f0fdf4)',
  headerBg: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
  textPrimary: '#065f46',
};

export default function IncentivoManagerialPage() {
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const RELATORIO_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getRelatorioIncentivo` : `/sync/getRelatorioIncentivo`),
    [API_BASE]
  );

  const [rows, setRows] = useState<IncentivoResumoParceiro[]>([]);
  const [loading, setLoading] = useState(false);

  const [dtIni, setDtIni] = useState('01/01/2026');
  const [dtFin, setDtFin] = useState('31/01/2026');
  const [cfops, setCfops] = useState('');

  const [snack, setSnack] = useState<{ open: boolean; severity: 'success' | 'error' | 'info'; msg: string }>({
    open: false,
    severity: 'info',
    msg: '',
  });

  const abortRef = useRef<AbortController | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const fetchRelatorio = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append('dtIni', dtIni);
      params.append('dtFin', dtFin);
      if (cfops.trim()) params.append('cfops', cfops);

      const resp = await fetch(`${RELATORIO_URL}?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: ac.signal,
      });

      if (!resp.ok) throw new Error(`Erro na requisição: ${resp.statusText}`);

      const rawData = await resp.json();
      if (!aliveRef.current) return;

      const parsedData = parseSankhyaResponse(rawData);
      setRows(parsedData);

      setSnack({ open: true, severity: 'success', msg: `Atualizado: ${parsedData.length} parceiros.` });
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      if (!aliveRef.current) return;
      console.error(e);
      setSnack({ open: true, severity: 'error', msg: e?.message || 'Falha ao buscar dados' });
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [dtIni, dtFin, cfops, RELATORIO_URL]);

  useEffect(() => {
    fetchRelatorio();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    const acc = rows.reduce(
      (a, r) => ({
        totalLiq: a.totalLiq + safeNum(getValue(r, 'TOTAL')),
        totalST: a.totalST + safeNum(getValue(r, 'TOTAL_ST')),
        totalTrib: a.totalTrib + safeNum(getValue(r, 'TOTAL_TRIB')),
        totalStPb: a.totalStPb + safeNum(getValue(r, 'ST_IND_PB')),
        totalTribPb: a.totalTribPb + safeNum(getValue(r, 'TRIB_IND_PB')),
        totalRest: a.totalRest + safeNum(getValue(r, 'VALOR_RESTANTE')),
        notes: a.notes + safeNum(getValue(r, 'QTD_NOTAS')),
        impostoTotal: a.impostoTotal + safeNum(getValue(r, 'IMPOSTO_TOTAL')),
      }),
      { totalLiq: 0, totalST: 0, totalTrib: 0, totalStPb: 0, totalTribPb: 0, totalRest: 0, notes: 0, impostoTotal: 0 }
    );

    const aliqMedia = acc.totalLiq > 0 ? acc.impostoTotal / acc.totalLiq : 0;
    return { ...acc, aliqMedia };
  }, [rows]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: THEME.bgMain }}>
      <GlobalStyles styles={{ 'html, body': { overflowX: 'hidden', width: '100vw', margin: 0 } }} />

      <Box component="main" sx={{ flexGrow: 1, height: '100vh', overflowY: 'auto', p: 3, background: THEME.bgGradient }}>
        <Box sx={{ maxWidth: '1750px', mx: 'auto' }}>
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 4, background: THEME.headerBg, color: 'white' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: 3 }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>📊 Incentivo Gerencial</Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>Análise consolidada por parceiro</Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 3, flexWrap: 'wrap' }}>
                <TextField label="Início" size="small" variant="filled" value={dtIni} onChange={(e) => setDtIni(e.target.value)}
                  sx={{ bgcolor: 'white', borderRadius: 1 }} InputProps={{ disableUnderline: true }} />
                <TextField label="Fim" size="small" variant="filled" value={dtFin} onChange={(e) => setDtFin(e.target.value)}
                  sx={{ bgcolor: 'white', borderRadius: 1 }} InputProps={{ disableUnderline: true }} />
                <TextField label="CFOPs (ex: 5102,6102)" size="small" variant="filled" value={cfops} onChange={(e) => setCfops(e.target.value)}
                  sx={{ bgcolor: 'white', borderRadius: 1, minWidth: 240 }} InputProps={{ disableUnderline: true }} />

                <Button
                  variant="contained"
                  onClick={fetchRelatorio}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                  sx={{ bgcolor: '#10b981', fontWeight: 'bold' }}
                >
                  Filtrar
                </Button>
              </Box>
            </Box>
          </Paper>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <MetricCard label="Faturamento Total" value={formatCurrency(totals.totalLiq)} accent="primary" />
            <MetricCard label="Imposto Total Est." value={formatCurrency(totals.impostoTotal)} accent="emerald" />
            <MetricCard label="Alíquota Média" value={formatPercent(totals.aliqMedia)} accent="light" />
            <MetricCard label="Incentivo PB (base 1%)" value={formatCurrency(totals.totalStPb + totals.totalTribPb)} accent="neutral" />
          </Grid>

          <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
            <Box sx={{ p: 2, bgcolor: THEME.bgMain, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: THEME.textPrimary }}>
                Detalhamento <Chip label={`${rows.length}`} size="small" color="success" sx={{ ml: 1 }} />
              </Typography>
              <IconButton onClick={fetchRelatorio} size="small"><RefreshIcon /></IconButton>
            </Box>

            <TableContainer sx={{ maxHeight: '65vh' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#ecfdf5', color: '#065f46', fontWeight: 800, fontSize: '0.75rem' } }}>
                    <TableCell>Cód.</TableCell>
                    <TableCell>Parceiro / Tipo</TableCell>
                    <TableCell>UF</TableCell>
                    <TableCell>Grupo</TableCell>
                    <TableCell align="center">Qtd.</TableCell>

                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">%ST</TableCell>
                    <TableCell align="right">%Trib</TableCell>

                    <TableCell align="right">Aliq. Efetiva</TableCell>
                    <TableCell align="right">Imposto Total</TableCell>

                    <TableCell align="right">ST Ind. PB</TableCell>
                    <TableCell align="right">Trib Ind. PB</TableCell>
                    <TableCell align="right">Resto</TableCell>

                    <TableCell>Regra ST</TableCell>
                    <TableCell>Regra Trib</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((row, i) => {
                    const total = safeNum(getValue(row, 'TOTAL'));
                    const percSt = safeNum(getValue(row, 'PERC_ST'));
                    const percTrib = safeNum(getValue(row, 'PERC_TRIB'));
                    const aliqEf = safeNum(getValue(row, 'ALIQ_EFETIVA'));
                    const impTot = safeNum(getValue(row, 'IMPOSTO_TOTAL'));

                    return (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{getStr(row, 'CODPARC')}</TableCell>

                        <TableCell>
                          <Box sx={{ fontWeight: 600 }}>{getStr(row, 'NOMEPARC')}</Box>
                          <Typography variant="caption" color="textSecondary">{getStr(row, 'AD_TIPOCLIENTEFATURAR')}</Typography>
                        </TableCell>

                        <TableCell sx={{ fontWeight: 700 }}>{getStr(row, 'UF')}</TableCell>
                        <TableCell><Chip size="small" label={getStr(row, 'GRUPO_CLIENTE') || '-'} /></TableCell>
                        <TableCell align="center"><Chip label={getValue(row, 'QTD_NOTAS')} size="small" /></TableCell>

                        <TableCell align="right" sx={{ fontWeight: 800, color: '#047857' }}>{formatCurrency(total)}</TableCell>
                        <TableCell align="right">{formatPercent(percSt)}</TableCell>
                        <TableCell align="right">{formatPercent(percTrib)}</TableCell>

                        <TableCell align="right" sx={{ fontWeight: 800 }}>{formatPercent(aliqEf)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>{formatCurrency(impTot)}</TableCell>

                        <TableCell align="right" sx={{ color: '#0288d1', bgcolor: '#e1f5fe' }}>
                          {formatCurrency(safeNum(getValue(row, 'ST_IND_PB')))}
                        </TableCell>

                        <TableCell align="right" sx={{ color: '#0288d1', bgcolor: '#e1f5fe' }}>
                          {formatCurrency(safeNum(getValue(row, 'TRIB_IND_PB')))}
                        </TableCell>

                        <TableCell align="right" sx={{ color: '#9ca3af' }}>
                          {formatCurrency(safeNum(getValue(row, 'VALOR_RESTANTE')))}
                        </TableCell>

                        <TableCell>{getStr(row, 'REGRA_ST_TEXTO') || '-'}</TableCell>
                        <TableCell>{getStr(row, 'REGRA_TRIB_TEXTO') || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

        <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          <Alert severity={snack.severity}>{snack.msg}</Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

function MetricCard({ label, value, accent }: any) {
  const color =
    accent === 'primary' ? '#059669' :
    accent === 'emerald' ? '#10b981' :
    '#34d399';

  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Paper elevation={2} sx={{ p: 3, borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', bgcolor: color }} />
        <Typography variant="overline" sx={{ fontWeight: 700 }} color="textSecondary">{label}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, color: color }}>{value}</Typography>
      </Paper>
    </Grid>
  );
}
