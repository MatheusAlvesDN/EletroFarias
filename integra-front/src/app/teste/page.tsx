'use client';

import React, { useMemo, useState } from 'react';
import { Box, Button, Alert, Typography } from '@mui/material';



export default function AtualizarCoresProdutosPage() {
    const [loading, setLoading] = useState(false);
    const [okMsg, setOkMsg] = useState<string | null>(null);
    const [errMsg, setErrMsg] = useState<string | null>(null);


    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
    //const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

    const TESTE_URL = useMemo(
        () =>
            API_BASE
                ? `${API_BASE}/sync/teste`
                : `/sync/teste`,
        [API_BASE]
    );

    const handleClick = async () => {
        setLoading(true);
        setOkMsg(null);
        setErrMsg(null);

        try {
            const resp = await fetch(TESTE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // sem parâmetros
            });

            const contentType = resp.headers.get('content-type') || '';
            const data = contentType.includes('application/json')
                ? await resp.json()
                : await resp.text();

            if (!resp.ok) {
                setErrMsg(
                    typeof data === 'string'
                        ? data
                        : data?.message || `Erro HTTP ${resp.status}`,
                );
                return;
            }

            setOkMsg(
                typeof data === 'string' ? data : data?.message || 'Executado com sucesso.',
            );
        } catch (e: any) {
            setErrMsg(e?.message || 'Falha ao chamar endpoint.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3, display: 'grid', gap: 2, maxWidth: 520 }}>
            <Typography variant="h6">Atualizar cores dos produtos</Typography>

            <Button
                variant="contained"
                disabled={loading}
                onClick={handleClick}
                sx={{
                    bgcolor: '#d32f2f',
                    '&:hover': { bgcolor: '#b71c1c' },
                    height: 48,
                    fontWeight: 700,
                }}
            >
                {loading ? 'Enviando...' : 'teste'}
            </Button>

            {okMsg && <Alert severity="success">{okMsg}</Alert>}
            {errMsg && <Alert severity="error">{errMsg}</Alert>}
        </Box>
    );
}
