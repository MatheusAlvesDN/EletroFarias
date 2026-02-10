'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    CircularProgress,
    Paper,
    Snackbar,
    Typography,
    IconButton,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    GlobalStyles,
    TextField,
    Button,
    Grid,
    Chip
} from '@mui/material';

// --- ÍCONES (SVGs) ---
const RefreshIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" /></svg>
);
const SearchIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
);

// --- TIPOS ---
interface ItemImpostoIncentivo {
    SEQUENCIA: number;
    NUNOTA: number;
    NUMNOTA: number;
    PRODUTO: string;
    NCM: string;
    DTNEG: string;
    DTENTSAI: string;
    CODCFO: number;
    CODIMP: number;
    BASE: number;
    ALIQUOTA: number;
    VALOR: number;
    CST: number;
    NOMEPARC?: string;
}

interface PartnerSummary {
    codCfo: number;
    partnerName: string;
    countNotes: number;
    totalLiq: number;
    totalST: number;
    totalTrib: number;
    stPB: number;
    tribPB: number;
    rest: number;
    type: number;
}

// --- HELPERS ---
const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// --- TEMA (Emerald / Verde) ---
const THEME = {
    bgMain: '#f0fdf4', // Fundo bem claro verde
    bgGradient: 'radial-gradient(circle at 50% -20%, #d1fae5, #f0fdf4)',
    headerBg: 'linear-gradient(135deg, #065f46 0%, #047857 100%)', // Verde Escuro Sólido
    textPrimary: '#065f46',
    textSecondary: '#047857',
    glass: 'rgba(255, 255, 255, 0.95)',
};

export default function IncentivoManagerialPage() {

    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);

    const RELATORIO_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getRelatorioIncentivo` : `/sync/getRelatorioIncentivo`), [API_BASE]);



    const [rows, setRows] = useState<ItemImpostoIncentivo[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [dtIni, setDtIni] = useState('01/01/2026');
    const [dtFin, setDtFin] = useState('31/01/2026');
    const [cfops, setCfops] = useState('');

    const [snack, setSnack] = useState<{ open: boolean; severity: 'success' | 'error' | 'info'; msg: string }>({
        open: false, severity: 'info', msg: '',
    });

    const abortRef = useRef<AbortController | null>(null);
    const aliveRef = useRef(true);

    useEffect(() => {
        aliveRef.current = true;
        return () => { aliveRef.current = false; abortRef.current?.abort(); };
    }, []);

    // --- FETCH DATA ---
    const fetchRelatorio = useCallback(async () => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        try {
            setLoading(true);
            setError(null);

            // Constrói Query String
            const params = new URLSearchParams();
            params.append('dtIni', dtIni);
            params.append('dtFin', dtFin);
            if (cfops.trim()) params.append('cfops', cfops);

            const resp = await fetch(`${RELATORIO_URL}?${params.toString()}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: ac.signal,
            });

            if (!resp.ok) {
                throw new Error(`Erro na requisição: ${resp.statusText}`);
            }

            const data = await resp.json();

            if (!aliveRef.current) return;

            if (Array.isArray(data)) {
                setRows(data);
                setSnack({ open: true, severity: 'success', msg: `Dados atualizados: ${data.length} registros.` });
            } else {
                throw new Error('Formato de resposta inválido');
            }

        } catch (e: any) {
            if (e?.name === 'AbortError') return;
            const msg = e?.message || 'Falha ao buscar dados';
            if (!aliveRef.current) return;
            setError(msg);
            setSnack({ open: true, severity: 'error', msg });
        } finally {
            if (aliveRef.current) setLoading(false);
        }
    }, [dtIni, dtFin, cfops]);

    // Carregar inicial
    useEffect(() => {
        fetchRelatorio();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- PROCESSAMENTO DE DADOS (Memoized) ---
    const { summaryData, totals } = useMemo(() => {
        const map = new Map<number, PartnerSummary>();
        const uniqueNotes = new Set<string>();

        rows.forEach(item => {
            uniqueNotes.add(item.NUNOTA.toString());

            if (!map.has(item.CODCFO)) {
                map.set(item.CODCFO, {
                    codCfo: item.CODCFO,
                    partnerName: item.NOMEPARC || `Parceiro Cód. ${item.CODCFO}`,
                    countNotes: 0,
                    totalLiq: 0,
                    totalST: 0,
                    totalTrib: 0,
                    stPB: 0,
                    tribPB: 0,
                    rest: 0,
                    type: 1 // Lógica de tipo placeholder
                });
            }

            const current = map.get(item.CODCFO)!;
            const isST = item.CODIMP === 6; // Ajustar IDs conforme seu ambiente
            const isTrib = item.CODIMP === 7;

            current.countNotes += 1; // Contagem de itens (ou lógica de nota única se preferir)
            current.totalLiq += safeNum(item.BASE);

            if (isST) current.totalST += safeNum(item.VALOR);
            if (isTrib) current.totalTrib += safeNum(item.VALOR);

            // Placeholder para lógica PB vs Resto
            current.rest += safeNum(item.BASE);
        });

        const summaryList = Array.from(map.values()).sort((a, b) => b.totalLiq - a.totalLiq);

        const grandTotals = summaryList.reduce((acc, curr) => ({
            totalLiq: acc.totalLiq + curr.totalLiq,
            totalST: acc.totalST + curr.totalST,
            totalTrib: acc.totalTrib + curr.totalTrib,
            notes: uniqueNotes.size
        }), { totalLiq: 0, totalST: 0, totalTrib: 0, notes: 0 });

        return { summaryData: summaryList, totals: grandTotals };
    }, [rows]);


    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: THEME.bgMain }}>
            <GlobalStyles styles={{
                'html, body': { overflowX: 'hidden', width: '100vw', margin: 0 },
                '*::-webkit-scrollbar': { width: '8px', height: '8px' },
                '*::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(6, 95, 70, 0.2)', borderRadius: '4px' }
            }} />

            <Box component="main" sx={{
                flexGrow: 1,
                height: '100vh',
                overflowY: 'auto',
                p: { xs: 2, md: 3 },
                background: THEME.bgGradient
            }}>

                <Box sx={{ maxWidth: '1600px', mx: 'auto' }}>

                    {/* CABEÇALHO E FILTROS */}
                    <Paper elevation={0} sx={{
                        p: 3, mb: 3, borderRadius: 4,
                        background: THEME.headerBg, color: 'white',
                        boxShadow: '0 10px 30px rgba(6, 95, 70, 0.25)'
                    }}>
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', alignItems: { lg: 'end' }, gap: 3 }}>

                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -1, mb: 1 }}>
                                    📊 Incentivo Gerencial
                                </Typography>
                                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                                    Análise consolidada de faturamento e tributos por parceiro
                                </Typography>
                            </Box>

                            {/* Área de Filtros */}
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 3, backdropFilter: 'blur(5px)' }}>
                                <TextField
                                    label="Data Início" size="small" variant="filled"
                                    value={dtIni} onChange={e => setDtIni(e.target.value)}
                                    sx={{ width: 130, bgcolor: 'white', borderRadius: 1, input: { pt: '22px', pb: '7px' } }}
                                    InputProps={{ disableUnderline: true }}
                                />
                                <TextField
                                    label="Data Fim" size="small" variant="filled"
                                    value={dtFin} onChange={e => setDtFin(e.target.value)}
                                    sx={{ width: 130, bgcolor: 'white', borderRadius: 1, input: { pt: '22px', pb: '7px' } }}
                                    InputProps={{ disableUnderline: true }}
                                />
                                <TextField
                                    label="CFOPs (Sep. vírgula)" size="small" variant="filled"
                                    value={cfops} onChange={e => setCfops(e.target.value)}
                                    placeholder="Ex: 5102, 6102"
                                    sx={{ width: 180, bgcolor: 'white', borderRadius: 1, input: { pt: '22px', pb: '7px' } }}
                                    InputProps={{ disableUnderline: true }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={fetchRelatorio}
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                                    sx={{ bgcolor: '#10b981', color: 'white', fontWeight: 'bold', '&:hover': { bgcolor: '#059669' } }}
                                >
                                    Filtrar
                                </Button>
                            </Box>
                        </Box>
                    </Paper>

                    {/* CARDS DE TOTALIZADORES */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <MetricCard label="Faturamento Total" value={formatCurrency(totals.totalLiq)} accent="primary" />
                        <MetricCard label="Total ST" value={formatCurrency(totals.totalST)} accent="emerald" />
                        <MetricCard label="Total Tributado" value={formatCurrency(totals.totalTrib)} accent="light" />
                        <MetricCard label="Notas Analisadas" value={totals.notes.toString()} accent="neutral" />
                    </Grid>

                    {/* TABELA DE DADOS */}
                    <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <Box sx={{ p: 2, bgcolor: THEME.bgMain, borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6" sx={{ color: THEME.textPrimary, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                Detalhamento por Parceiro
                                <Chip label={`${summaryData.length} registros`} size="small" color="success" variant="outlined" />
                            </Typography>
                            <Tooltip title="Recarregar Dados">
                                <IconButton onClick={fetchRelatorio} size="small"><RefreshIcon /></IconButton>
                            </Tooltip>
                        </Box>

                        <TableContainer sx={{ maxHeight: '60vh' }}>
                            <Table stickyHeader sx={{ minWidth: 800 }}>
                                <TableHead>
                                    <TableRow sx={{ '& th': { bgcolor: '#ecfdf5', color: '#065f46', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' } }}>
                                        <TableCell width="5%">Cód.</TableCell>
                                        <TableCell width="35%">Parceiro</TableCell>
                                        <TableCell align="center" width="10%">Qtd. Itens</TableCell>
                                        <TableCell align="right" width="15%">Total Líquido</TableCell>
                                        <TableCell align="right" width="10%">Total ST</TableCell>
                                        <TableCell align="right" width="10%">Total Trib.</TableCell>
                                        <TableCell align="right" width="15%">Resto</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                                <CircularProgress color="success" />
                                                <Typography sx={{ mt: 2, color: '#666' }}>Processando dados...</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : summaryData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 8, color: '#999' }}>
                                                Nenhum dado encontrado para o período.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        summaryData.map((row) => (
                                            <TableRow key={row.codCfo} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                <TableCell sx={{ fontWeight: 'bold', color: '#059669' }}>{row.codCfo}</TableCell>
                                                <TableCell sx={{ fontWeight: 600, color: '#1f2937' }}>{row.partnerName}</TableCell>
                                                <TableCell align="center">
                                                    <Chip label={row.countNotes} size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontWeight: 'bold' }} />
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#047857' }}>
                                                    {formatCurrency(row.totalLiq)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontFamily: 'monospace', color: '#4b5563' }}>
                                                    {formatCurrency(row.totalST)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontFamily: 'monospace', color: '#4b5563' }}>
                                                    {formatCurrency(row.totalTrib)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontFamily: 'monospace', color: '#9ca3af' }}>
                                                    {formatCurrency(row.rest)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    {/* LINHA DE TOTAIS */}
                                    {!loading && summaryData.length > 0 && (
                                        <TableRow sx={{ bgcolor: '#d1fae5', '& td': { fontWeight: '900 !important', color: '#064e3b', borderTop: '2px solid #10b981' } }}>
                                            <TableCell colSpan={2} align="right">TOTAIS GERAIS</TableCell>
                                            <TableCell align="center">{totals.notes}</TableCell>
                                            <TableCell align="right">{formatCurrency(totals.totalLiq)}</TableCell>
                                            <TableCell align="right">{formatCurrency(totals.totalST)}</TableCell>
                                            <TableCell align="right">{formatCurrency(totals.totalTrib)}</TableCell>
                                            <TableCell align="right">{formatCurrency(totals.totalLiq)}</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                </Box>
            </Box>

            {/* Notificações */}
            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}


function MetricCard({ label, value, accent }: { label: string, value: string, accent: 'primary' | 'emerald' | 'light' | 'neutral' }) {
    const styles = {
        primary: { border: '#059669', text: '#065f46', bgIcon: 'rgba(5, 150, 105, 0.1)' },
        emerald: { border: '#10b981', text: '#047857', bgIcon: 'rgba(16, 185, 129, 0.1)' },
        light: { border: '#34d399', text: '#064e3b', bgIcon: 'rgba(52, 211, 153, 0.1)' },
        neutral: { border: '#9ca3af', text: '#374151', bgIcon: 'rgba(156, 163, 175, 0.1)' },
    };
    const s = styles[accent];

    return (
        // MUDANÇA AQUI:
        // 1. Removemos 'item'
        // 2. Trocamos xs={12} sm={6} md={3} por size={{ xs: 12, sm: 6, md: 3 }}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper elevation={2} sx={{
                p: 3, borderRadius: 4, position: 'relative', overflow: 'hidden',
                transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' }
            }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', bgcolor: s.border }} />
                <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1, color: '#6b7280' }}>
                    {label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, color: s.text }}>
                    {value}
                </Typography>
            </Paper>
        </Grid>
    );
}