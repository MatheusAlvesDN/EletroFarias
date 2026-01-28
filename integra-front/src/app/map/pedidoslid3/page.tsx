'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import {
    Box, Card, CardContent, CircularProgress, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
    Button, Snackbar, Alert, Chip, IconButton, Collapse
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// --- CONFIGURAÇÕES ---
const POLL_MS = 10000; // 10 segundos
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
    codprod: number;

    bkcolor?: string;
    fgcolor?: string;
};

// --- UTILITÁRIOS ---
const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// --- COMPONENTE DE LINHA (ROW) ---
function RowPedido(props: { 
    row: any, 
    items: PendenciaEstoque[], 
    onImprimir: (item: PendenciaEstoque) => void,
    printingNunota: number | null 
}) {
    const { row, items, onImprimir, printingNunota } = props;
    const [open, setOpen] = useState(false);

    // Filtra itens deste pedido
    const myItems = items.filter(i => i.nunota === row.nunota);

    return (
        <React.Fragment>
            {/* LINHA PRINCIPAL (CABEÇALHO DO PEDIDO) - Visual inspirado no código de referência */}
            <TableRow 
                hover 
                onClick={() => setOpen(!open)} 
                sx={{ 
                    cursor: 'pointer',
                    backgroundColor: open ? '#f0f7ff' : 'inherit', // Leve destaque azul ao abrir
                    '& > *': { borderBottom: 'unset' } 
                }}
            >
                <TableCell width={50}>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                
                {/* Visual idêntico à coluna NUNOTA do seu código de referência */}
                <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1976d2' }}>
                        #{row.nunota}
                    </Typography>
                    <Typography variant="caption" display="block">
                        NF: {row.numnota}
                    </Typography>
                </TableCell>

                {/* Visual idêntico à coluna PARCEIRO do seu código de referência */}
                <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {row.parceiro}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {row.vendedor}
                    </Typography>
                </TableCell>

                <TableCell>
                    <Typography variant="caption">
                        {row.dtalter} {row.hralter}
                    </Typography>
                </TableCell>

                <TableCell align="center">
                     <Chip label={`${myItems.length} Itens`} color="primary" size="small" variant="outlined" />
                </TableCell>
            </TableRow>

            {/* TABELA DE ITENS (EXPANSÍVEL) */}
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2, border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                            <Table size="small" aria-label="purchases">
                                <TableHead>
                                    <TableRow sx={{ '& th': { backgroundColor: '#f8fafc', fontWeight: 700, fontSize: '0.9rem' } }}>
                                        <TableCell>PRODUTO</TableCell>
                                        <TableCell align="center">NEGOCIADA</TableCell>
                                        <TableCell align="center">ESTOQUE</TableCell>
                                        <TableCell align="center"></TableCell>
                                        <TableCell align="center">AÇÃO</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {myItems.map((item, index) => (
                                        <TableRow key={index} sx={{ backgroundColor: item.bkcolor || '#fff' }}>
                                            <TableCell component="th" scope="row" sx={{ maxWidth: 300 }}>
                                                <Typography variant="body2">{item.descrprod}</Typography>
                                            </TableCell>
                                            
                                            {/* Lógica de Cores do Estoque igual ao código de referência */}
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
                                            </TableCell>

                                            {/* Botão Imprimir igual ao código de referência */}
                                            <TableCell align="center">
                                                <Button 
                                                    variant="contained" 
                                                    color="primary" 
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onImprimir(item);
                                                    }}
                                                    disabled={printingNunota !== null}
                                                    sx={{ minWidth: '100px' }}
                                                >
                                                    {printingNunota === item.nunota ? (
                                                        <CircularProgress size={20} color="inherit" />
                                                    ) : (
                                                        "IMPRIMIR"
                                                    )}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}

// --- COMPONENTE PRINCIPAL ---
export default function PaginaPendenciasEstoque() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const [items, setItems] = useState<PendenciaEstoque[]>([]);
    const [filtered, setFiltered] = useState<PendenciaEstoque[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingRefresh, setLoadingRefresh] = useState(false);
    
    const [printingNunota, setPrintingNunota] = useState<number | null>(null);

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

    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
    const LIST_URL = useMemo(
        () => (API_BASE ? `${API_BASE}/sync/listarItensPendentes` : `/sync/listarItensPendentes`),
        [API_BASE],
    );

    const handleImprimir = async (item: PendenciaEstoque) => {
        if (printingNunota !== null) return; 

        try {
            setPrintingNunota(item.nunota); 
            const token = localStorage.getItem('authToken');
            const headers: any = {};
            if (token) headers.Authorization = `Bearer ${token}`;

            const params = new URLSearchParams();
            Object.entries(item).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, String(value));
                }
            });

            const printUrl = API_BASE 
                ? `${API_BASE}/sync/imprimirEtiquetaLid?${params.toString()}`
                : `/sync/imprimirEtiquetaLid?${params.toString()}`;

            const resp = await fetch(printUrl, { method: 'GET', headers });

            if (!resp.ok) {
                const errorText = await resp.text();
                throw new Error(`Erro ao gerar etiqueta: ${errorText || resp.statusText}`);
            }

            const blob = await resp.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
        } catch (e: any) {
            console.error(e);
            setErro(e.message);
            setSnackbarOpen(true);
        } finally {
            setPrintingNunota(null);
        }
    };

    const fetchData = useCallback(async (mode: 'initial' | 'poll' | 'manual' = 'poll') => {
        try {
            inFlightRef.current = true;
            if (mode === 'initial') setLoading(true);
            else setLoadingRefresh(true);

            const token = localStorage.getItem('authToken');
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;

            const resp = await fetch(LIST_URL, { method: 'GET', headers, cache: 'no-store' });
            const result = await resp.json();

            const rawData = Array.isArray(result) ? result : (result?.responseBody?.rows || result?.rows || []);

            if (!Array.isArray(rawData)) throw new Error("Formato de dados inválido.");

            const list: PendenciaEstoque[] = rawData.map((r: any[]) => ({
                nunota: r[5],
                numnota: r[6],
                descroper: r[7],
                dtalter: r[9],
                hralter: r[10],
                parceiro: r[12],
                vendedor: r[15],
                codprod: r[27],
                descrprod: r[28],
                estoque_atual: safeNum(r[35]),
                qtd_negociada: safeNum(r[32]),
                qtd_pendente_calc: safeNum(r[32]-r[35]),
                bkcolor: safeNum(r[35]) < safeNum(r[32]) ? '#FFF5F5' : '#FFFFFF',
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

    useEffect(() => { fetchData('initial'); }, [fetchData]);
    useEffect(() => {
        const id = window.setInterval(() => fetchData('poll'), POLL_MS);
        return () => window.clearInterval(id);
    }, [fetchData]);

    useEffect(() => {
        const term = q.trim().toUpperCase();
        const res = items.filter(n =>
            !term || [n.nunota, n.numnota, n.parceiro, n.descrprod, n.vendedor]
                .some(x => String(x).toUpperCase().includes(term))
        );
        setFiltered(res);
    }, [q, items]);

    const groupedOrders = useMemo(() => {
        const groups = new Map();
        filtered.forEach(item => {
            if (!groups.has(item.nunota)) {
                groups.set(item.nunota, {
                    nunota: item.nunota,
                    numnota: item.numnota,
                    parceiro: item.parceiro,
                    vendedor: item.vendedor,
                });
            }
        });
        return Array.from(groups.values());
    }, [filtered]);

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
    }, [fullScreen, rotation, vp, groupedOrders.length]); 

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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                <img src="/logo-lid.png" alt="Lid Iluminação" style={{ height: '100px', objectFit: 'contain' }} />
                            </Box>
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
                                            <TableCell width={70} />
                                            <TableCell>NÚN./NOTA</TableCell>
                                            <TableCell>PARCEIRO / VENDEDOR</TableCell>
                                            <TableCell> </TableCell>
                                            <TableCell align="center">ITENS</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {groupedOrders.map((order) => (
                                            <RowPedido 
                                                key={order.nunota} 
                                                row={order} 
                                                items={items} 
                                                onImprimir={handleImprimir}
                                                printingNunota={printingNunota}
                                            />
                                        ))}
                                        {groupedOrders.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                                    Nenhum pedido pendente encontrado.
                                                </TableCell>
                                            </TableRow>
                                        )}
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