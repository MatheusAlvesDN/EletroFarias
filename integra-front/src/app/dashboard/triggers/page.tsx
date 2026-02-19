'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Switch,
    Button,
    Stack,
    Snackbar,
    Alert,
} from '@mui/material';

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




function numOrUndef(v: string) {
    const t = v.trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
}

export default function TriggersPage() {
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
}, []);


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

    const columns = useMemo(
        () => [
            { key: 'codTipOper', label: 'CODTIPOPER' },
            { key: 'codParcDiff', label: 'CODPARC <> (opcional)' },
            { key: 'codParcDestIsZero', label: 'CODPARCDEST = 0' },
            { key: 'setCodEmp', label: 'SET CODEMP' },
            { key: 'setSerieNota', label: 'SET SERIENOTA' },
            { key: 'setCodParcDestFromCodParc', label: 'SET CODPARCDEST := CODPARC' },
            { key: 'setCodParc', label: 'SET CODPARC' },
            { key: 'setCodModDocNota', label: 'SET CODMODDOCNOTA' },
            { key: 'setCodTipVenda', label: 'SET CODTIPVENDA' },
        ],
        [],
    );

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
                Gerenciador de Triggers (TGFCAB)
            </Typography>

            <Paper sx={{ p: 2, overflowX: 'auto' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><b>TRIGGER</b></TableCell>
                            {columns.map((c) => (
                                <TableCell key={c.key}><b>{c.label}</b></TableCell>
                            ))}
                            <TableCell align="right"><b>Ações</b></TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {rows.map((r) => (
                            <TableRow key={r.name} hover>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.name}</TableCell>

                                <TableCell>
                                    <TextField
                                        size="small"
                                        value={r.codTipOper ?? ''}
                                        onChange={(e) => onChange(r.name, { codTipOper: Number(e.target.value) || 0 })}
                                        inputProps={{ inputMode: 'numeric' }}
                                    />
                                </TableCell>

                                <TableCell>
                                    <TextField
                                        size="small"
                                        value={r.codParcDiff ?? ''}
                                        onChange={(e) => onChange(r.name, { codParcDiff: numOrUndef(e.target.value) })}
                                        placeholder="ex: 749"
                                        inputProps={{ inputMode: 'numeric' }}
                                    />
                                </TableCell>

                                <TableCell>
                                    <Switch
                                        checked={!!r.codParcDestIsZero}
                                        onChange={(e) => onChange(r.name, { codParcDestIsZero: e.target.checked })}
                                    />
                                </TableCell>

                                <TableCell>
                                    <TextField
                                        size="small"
                                        value={r.setCodEmp ?? ''}
                                        onChange={(e) => onChange(r.name, { setCodEmp: numOrUndef(e.target.value) })}
                                        inputProps={{ inputMode: 'numeric' }}
                                    />
                                </TableCell>

                                <TableCell>
                                    <TextField
                                        size="small"
                                        value={r.setSerieNota ?? ''}
                                        onChange={(e) => onChange(r.name, { setSerieNota: numOrUndef(e.target.value) })}
                                        inputProps={{ inputMode: 'numeric' }}
                                    />
                                </TableCell>

                                <TableCell>
                                    <Switch
                                        checked={!!r.setCodParcDestFromCodParc}
                                        onChange={(e) => onChange(r.name, { setCodParcDestFromCodParc: e.target.checked })}
                                    />
                                </TableCell>

                                <TableCell>
                                    <TextField
                                        size="small"
                                        value={r.setCodParc ?? ''}
                                        onChange={(e) => onChange(r.name, { setCodParc: numOrUndef(e.target.value) })}
                                        inputProps={{ inputMode: 'numeric' }}
                                    />
                                </TableCell>

                                <TableCell>
                                    <TextField
                                        size="small"
                                        value={r.setCodModDocNota ?? ''}
                                        onChange={(e) => onChange(r.name, { setCodModDocNota: numOrUndef(e.target.value) })}
                                        inputProps={{ inputMode: 'numeric' }}
                                    />
                                </TableCell>

                                <TableCell>
                                    <TextField
                                        size="small"
                                        value={r.setCodTipVenda ?? ''}
                                        onChange={(e) => onChange(r.name, { setCodTipVenda: numOrUndef(e.target.value) })}
                                        inputProps={{ inputMode: 'numeric' }}
                                    />
                                </TableCell>

                                <TableCell align="right">
                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                        <Button
                                            variant="contained"
                                            onClick={() => apply(r)}
                                            disabled={!!saving[r.name]}
                                        >
                                            Aplicar
                                        </Button>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            <Snackbar
                open={toast.open}
                autoHideDuration={3500}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
            >
                <Alert severity={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
