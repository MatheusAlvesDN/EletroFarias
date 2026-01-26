'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import {
    Box, Card, CardContent, CircularProgress, Divider, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
    Button, Snackbar, Alert, Chip
} from '@mui/material';

// --- CONFIGURAÇÕES ---
const POLL_MS = 10000; // 10 segundos para pendências de estoque

type PendenciaEstoque = {
    nunota: number;
    numnota: number;
    descroper: string;
    dtalter: string;
    hralter: string;
    parceiro: string;
    vendedor: string;
    descrprod: string;
    estoque_atual: number;
    qtd_negociada: number;
    qtd_pendente_calc: number;
    
    bkcolor?: string; // Para manter o padrão de cores futuro
    fgcolor?: string;
};

// --- UTILITÁRIOS ---
const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));
const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default function PaginaPendenciasEstoque() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const [items, setItems] = useState<PendenciaEstoque[]>([]);
    const [filtered, setFiltered] = useState<PendenciaEstoque[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingRefresh, setLoadingRefresh] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [q, setQ] = useState('');
    const [fullScreen, setFullScreen] = useState(false);
    const [rotation, setRotation] = useState<90 | -90>(90);
    const [vp, setVp] = useState({ w: 0, h: 0 });
    const [scale, setScale] = useState(1);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const tableWrapRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const inFlightRef = useRef(false);

    // Endpoint do seu backend
    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
    const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

    const LIST_URL = useMemo(
        () => (API_BASE ? `${API_BASE}/sync/listarItensPendentes` : `/sync/listarItensPendentes`),
        [API_BASE],
    );

    const fetchData = useCallback(async (mode: 'initial' | 'poll' | 'manual' = 'poll') => {
        //alert('fetchData foi chamado!');
        console.log('URL:', LIST_URL);
        //if (inFlightRef.current) return;

        try {
            inFlightRef.current = true;
            if (mode === 'initial') setLoading(true);
            else setLoadingRefresh(true);

            const token = localStorage.getItem('authToken');
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;

            const resp = await fetch(LIST_URL, { method: 'GET', headers, cache: 'no-store' });
            const result = await resp.json();

            // ✅ VALIDAÇÃO: Verifica se o resultado é um array ou se está em 'rows'
            // O DbExplorer do Sankhya geralmente retorna em responseBody.rows
            const rawData = Array.isArray(result)
                ? result
                : (result?.responseBody?.rows || result?.rows || []);

            if (!Array.isArray(rawData)) {
                console.error("Dados recebidos não são um array:", result);
                throw new Error("Formato de dados inválido recebido do servidor.");
            }

            const list: PendenciaEstoque[] = rawData.map((r: any[]) => ({
                nunota: r[0],
                numnota: r[1],
                descroper: r[3],
                dtalter: r[4],
                hralter: r[5],
                parceiro: r[7],
                vendedor: r[9],
                descrprod: r[12],
                estoque_atual: safeNum(r[14]),
                qtd_negociada: safeNum(r[15]),
                qtd_pendente_calc: safeNum(r[17]),
                bkcolor: safeNum(r[14]) < safeNum(r[15]) ? '#FFF5F5' : '#FFFFFF',
            }));

            setItems(list);
            setErro(null);
        } catch (e: any) {
            setErro(e.message);
            setSnackbarOpen(true);
        } finally {
            inFlightRef.current = false;
            setLoading(false);
            setLoadingRefresh(false);
        }
    }, [LIST_URL]);

    // Efeitos de Inicialização e Polling
    useEffect(() => { fetchData('initial'); }, [fetchData]);
    useEffect(() => {
        const id = window.setInterval(() => fetchData('poll'), POLL_MS);
        return () => window.clearInterval(id);
    }, [fetchData]);

    // Filtro de Busca
    useEffect(() => {
        const term = q.trim().toUpperCase();
        const res = items.filter(n =>
            !term || [n.nunota, n.numnota, n.parceiro, n.descrprod, n.vendedor]
                .some(x => String(x).toUpperCase().includes(term))
        );
        setFiltered(res);
    }, [q, items]);

    // Gerenciamento de Tela Cheia e Escalonamento
    const updateViewport = useCallback(() => setVp({ w: window.innerWidth, h: window.innerHeight }), []);
    useEffect(() => {
        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, [updateViewport]);

    useLayoutEffect(() => {
        if (!fullScreen || !contentRef.current) { setScale(1); return; }
        const availW = Math.max(1, (rotation === 90 || rotation === -90 ? vp.h : vp.w) - 20);
        const contentW = contentRef.current.offsetWidth || 1;
        setScale(Math.min(2.0, Math.max(0.4, availW / contentW)));
    }, [fullScreen, rotation, vp, filtered.length]);

    const toggleFs = async (deg: 90 | -90) => {
        setRotation(deg);
        if (!document.fullscreenElement) await tableWrapRef.current?.requestFullscreen();
        else document.exitFullscreen();
    };

    if (!mounted) return <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ backgroundColor: '#f0f4f8', minHeight: '100vh', p: 3 }}>
            <Card sx={{ maxWidth: 1600, mx: 'auto', boxShadow: 3, borderRadius: 2 }}>
                <CardContent>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 600 }}>Pendências de Estoque</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Mostrando {filtered.length} itens {loadingRefresh && '• Atualizando...'}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button variant="outlined" onClick={() => fetchData('manual')}>Atualizar</Button>
                            <Button variant="contained" onClick={() => toggleFs(90)}>Tela Cheia</Button>
                        </Box>
                    </Box>

                    <TextField
                        fullWidth
                        label="Buscar por Nota, Parceiro ou Produto..."
                        variant="outlined"
                        size="small"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        sx={{ mb: 3 }}
                    />

                    <TableContainer component={Paper} elevation={0} ref={tableWrapRef} sx={{ border: '1px solid #eee', borderRadius: 2 }}>
                        {/* Lógica de Escalonamento para TV */}
                        <Box sx={fullScreen ? {
                            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                            bgcolor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden'
                        } : {}}>
                            <Box ref={contentRef} sx={{
                                transform: fullScreen ? `rotate(${rotation}deg) scale(${scale})` : 'none',
                                width: fullScreen ? 'max-content' : '100%'
                            }}>
                                <Table stickyHeader sx={{ minWidth: 1000 }}>
                                    <TableHead>
                                        <TableRow sx={{ '& th': { backgroundColor: '#f8fafc', fontWeight: 700, fontSize: '1.1rem' } }}>
                                            <TableCell>NÚN./NOTA</TableCell>
                                            <TableCell>PARCEIRO / VENDEDOR</TableCell>
                                            <TableCell>PRODUTO</TableCell>
                                            <TableCell align="center">NEGOCIADA</TableCell>
                                            <TableCell align="center">ESTOQUE</TableCell>
                                            <TableCell align="center">PENDENTE</TableCell>
                                            <TableCell>ALTERAÇÃO</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filtered.map((item, i) => (
                                            <TableRow key={i} sx={{ backgroundColor: item.bkcolor }}>
                                                <TableCell>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1976d2' }}>#{item.nunota}</Typography>
                                                    <Typography variant="caption">NF: {item.numnota}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.parceiro}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{item.vendedor}</Typography>
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 300 }}>
                                                    <Typography variant="body2">{item.descrprod}</Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography sx={{ fontWeight: 700, color: item.estoque_atual < item.qtd_negociada ? 'error.main' : 'success.main' }}>
                                                        {item.qtd_negociada}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography sx={{ fontWeight: 700, color: item.estoque_atual < item.qtd_negociada ? 'error.main' : 'success.main' }}>
                                                        {item.estoque_atual}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip label={item.qtd_negociada-item.estoque_atual} color="warning" size="small" sx={{ fontWeight: 700 }} />
                                                </TableCell>

                                                <TableCell>
                                                    <Typography variant="caption">{item.dtalter} {item.hralter}</Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Box>
                    </TableContainer>
                </CardContent>
            </Card>

            <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}>
                <Alert severity="error" variant="filled">{erro}</Alert>
            </Snackbar>
        </Box>
    );
}