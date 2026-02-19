'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Switch,
    Button,
    Snackbar,
    Alert,
    IconButton,
    Card
} from '@mui/material';
import {
    Menu,
    X,
    Server,
    LayoutDashboard,
    TrendingUp,
    TrendingDown,
    Users,
    Settings,
    LogOut
} from 'lucide-react';

 import SidebarMenu from '@/components/SidebarMenu';


// --- Tipos ---

type TriggerConfig = {
    name: string;

    codTipOper: number;
    codParcDiff?: number;
    codParcDestIsZero?: boolean;

    setCodEmp?: number;
    setSerieNota?: number;
    setCodParc?: number;
    setCodParcDestFromCodParc?: boolean;
    setCodModDocNota?: number;
    setCodTipVenda?: number;
};

// --- Helpers ---

function numOrUndef(v: string) {
    const t = v.trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
}

export default function TriggersPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);

    const TRIGGERS_URL = useMemo(
        () => (API_BASE ? `${API_BASE}/triggers/` : `/triggers`),
        [API_BASE]
    );

    const [rows, setRows] = useState<TriggerConfig[]>([]);
    const [saving, setSaving] = useState<Record<string, boolean>>({});
    const [toast, setToast] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
        open: false,
        msg: '',
        type: 'success',
    });

    useEffect(() => {
        (async () => {
            const url = `${API_BASE}/triggers`;
            try {
                console.log('FETCH:', url);

                const resp = await fetch(url, { cache: 'no-store' });
                const text = await resp.text(); // pega sempre como texto

                console.log('STATUS:', resp.status);
                console.log('RAW BODY:', text);

                let data: any = null;
                try { data = JSON.parse(text); } catch { data = text; }

                console.log('API RESPONSE (parsed):', data);

                const list =
                    Array.isArray(data) ? data :
                    Array.isArray(data?.data) ? data.data :
                    Array.isArray(data?.triggers) ? data.triggers :
                    [];

                setRows(list);
            } catch (e) {
                console.error(e);
                setRows([]);
            }
        })();
    }, [API_BASE]);

    const onChange = (name: string, patch: Partial<TriggerConfig>) => {
        setRows((prev) => prev.map((r) => (r.name === name ? { ...r, ...patch } : r)));
    };

    const apply = async (cfg: TriggerConfig) => {
        setSaving((p) => ({ ...p, [cfg.name]: true }));
        try {
            const resp = await fetch(`${TRIGGERS_URL}/${encodeURIComponent(cfg.name)}/apply`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cfg),
            });

            if (!resp.ok) {
                const errTxt = await resp.text();
                throw new Error(errTxt || `HTTP ${resp.status}`);
            }

            setToast({ open: true, msg: `Trigger ${cfg.name} atualizado no Sankhya.`, type: 'success' });
        } catch (e: any) {
            setToast({ open: true, msg: `Erro ao aplicar ${cfg.name}: ${String(e?.message ?? e)}`, type: 'error' });
        } finally {
            setSaving((p) => ({ ...p, [cfg.name]: false }));
        }
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f0f4f8' }}>
            
            {/* Botão Flutuante Sidebar (Estilo MUI) */}
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
                    zIndex: 1200, // Z-index alto para ficar acima do conteúdo
                }}
            >
                <IconButton onClick={() => setSidebarOpen((v) => !v)} aria-label="menu" size="large">
                    <Menu />
                </IconButton>
            </Box>

            <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content */}
            <Box 
                component="main" 
                sx={{ 
                    flexGrow: 1, 
                    p: { xs: 2, sm: 4 },
                    pt: { xs: 11, sm: 4 }, // Padding top extra no mobile para evitar sobreposição do botão
                    pl: { sm: 11 },        // Padding left extra em telas grandes
                    overflowX: 'hidden'
                }}
            >
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#1e293b' }}>
                    Gerenciador de Triggers (TGFCAB)
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {rows.map((r) => (
                        <Card key={r.name} sx={{ borderRadius: 2, boxShadow: 1, overflow: 'visible' }}>
                            {/* Header do Card (Título + Botão) */}
                            <Box sx={{ 
                                p: { xs: 2, sm: 2.5 }, 
                                backgroundColor: '#f8fafc', 
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 2
                            }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                                    {r.name}
                                </Typography>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => apply(r)}
                                    disabled={!!saving[r.name]}
                                    disableElevation
                                    sx={{ textTransform: 'none', fontWeight: 'bold', minWidth: '120px' }}
                                >
                                    {saving[r.name] ? 'Aplicando...' : 'Aplicar'}
                                </Button>
                            </Box>

                            {/* Conteúdo Responsivo do Card em Formato de Grid */}
                            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                                <Box sx={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: { 
                                        xs: '1fr',              // 1 coluna no mobile
                                        sm: '1fr 1fr',          // 2 colunas em tablets
                                        md: 'repeat(3, 1fr)',   // 3 colunas em desktop
                                        xl: 'repeat(4, 1fr)'    // 4 colunas em monitores ultra-wide
                                    }, 
                                    gap: 3 
                                }}>
                                    <TextField
                                        label="CODTIPOPER"
                                        size="small"
                                        fullWidth
                                        value={r.codTipOper ?? ''}
                                        onChange={(e) => onChange(r.name, { codTipOper: Number(e.target.value) || 0 })}
                                        inputProps={{ inputMode: 'numeric' }}
                                    />
                                    
                                    <TextField
                                        label="CODPARC <> (opcional)"
                                        size="small"
                                        fullWidth
                                        value={r.codParcDiff ?? ''}
                                        onChange={(e) => onChange(r.name, { codParcDiff: numOrUndef(e.target.value) })}
                                        placeholder="ex: 749"
                                        inputProps={{ inputMode: 'numeric' }}
                                    />

                                    <Box sx={{ display: 'flex', alignItems: 'center', p: 1, border: '1px solid #e2e8f0', borderRadius: 1 }}>
                                        <Switch
                                            checked={!!r.codParcDestIsZero}
                                            onChange={(e) => onChange(r.name, { codParcDestIsZero: e.target.checked })}
                                            color="success"
                                            size="small"
                                        />
                                        <Typography variant="body2" sx={{ ml: 1, fontWeight: 500, color: '#475569' }}>
                                            CODPARCDEST = 0
                                        </Typography>
                                    </Box>

                                    <TextField
                                        label="SET CODEMP"
                                        size="small"
                                        fullWidth
                                        value={r.setCodEmp ?? ''}
                                        onChange={(e) => onChange(r.name, { setCodEmp: numOrUndef(e.target.value) })}
                                        inputProps={{ inputMode: 'numeric' }}
                                    />

                                    <TextField
                                        label="SET SERIENOTA"
                                        size="small"
                                        fullWidth
                                        value={r.setSerieNota ?? ''}
                                        onChange={(e) => onChange(r.name, { setSerieNota: numOrUndef(e.target.value) })}
                                        inputProps={{ inputMode: 'numeric' }}
                                    />

                                    <Box sx={{ display: 'flex', alignItems: 'center', p: 1, border: '1px solid #e2e8f0', borderRadius: 1 }}>
                                        <Switch
                                            checked={!!r.setCodParcDestFromCodParc}
                                            onChange={(e) => onChange(r.name, { setCodParcDestFromCodParc: e.target.checked })}
                                            color="success"
                                            size="small"
                                        />
                                        <Typography variant="body2" sx={{ ml: 1, fontWeight: 500, color: '#475569', lineHeight: 1.2 }}>
                                            SET CODPARCDEST := CODPARC
                                        </Typography>
                                    </Box>

                                    <TextField
                                        label="SET CODPARC"
                                        size="small"
                                        fullWidth
                                        value={r.setCodParc ?? ''}
                                        onChange={(e) => onChange(r.name, { setCodParc: numOrUndef(e.target.value) })}
                                        inputProps={{ inputMode: 'numeric' }}
                                    />

                                    <TextField
                                        label="SET CODMODDOCNOTA"
                                        size="small"
                                        fullWidth
                                        value={r.setCodModDocNota ?? ''}
                                        onChange={(e) => onChange(r.name, { setCodModDocNota: numOrUndef(e.target.value) })}
                                        inputProps={{ inputMode: 'numeric' }}
                                    />

                                    <TextField
                                        label="SET CODTIPVENDA"
                                        size="small"
                                        fullWidth
                                        value={r.setCodTipVenda ?? ''}
                                        onChange={(e) => onChange(r.name, { setCodTipVenda: numOrUndef(e.target.value) })}
                                        inputProps={{ inputMode: 'numeric' }}
                                    />
                                </Box>
                            </Box>
                        </Card>
                    ))}

                    {rows.length === 0 && (
                        <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary', borderRadius: 2 }}>
                            Nenhum trigger encontrado ou carregando...
                        </Paper>
                    )}
                </Box>

                <Snackbar
                    open={toast.open}
                    autoHideDuration={3500}
                    onClose={() => setToast((t) => ({ ...t, open: false }))}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert 
                        severity={toast.type} 
                        onClose={() => setToast((t) => ({ ...t, open: false }))}
                        variant="filled"
                    >
                        {toast.msg}
                    </Alert>
                </Snackbar>
            </Box>
        </Box>
    );
}