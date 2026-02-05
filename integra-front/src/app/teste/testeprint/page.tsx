'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Alert, Typography, CircularProgress } from '@mui/material';

export default function AtualizarCoresProdutosPage() {
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('documento.pdf');

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  //const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  // ✅ ao clicar em "teste", o backend retorna um PDF
  const TESTE_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getAllEtiquetasCabos` : `/sync/getAllEtiquetasCabos`), [API_BASE]);

  const lastUrlRef = useRef<string | null>(null);
  const revokeLastUrl = () => {
    if (lastUrlRef.current) {
      URL.revokeObjectURL(lastUrlRef.current);
      lastUrlRef.current = null;
    }
  };

  const extractFilename = (resp: Response) => {
    const cd = resp.headers.get('content-disposition') || '';
    // Ex: attachment; filename="arquivo.pdf" | filename*=UTF-8''arquivo.pdf
    const m = cd.match(/filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i);
    if (!m) return null;
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  };

  const openAndPrint = (url: string) => {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      setErrMsg('Pop-up bloqueado. Permita pop-ups para imprimir.');
      return;
    }

    const tryPrint = () => {
      try {
        win.focus();
        win.print();
      } catch {
        // ok
      }
    };

    // tenta no load e com fallback
    win.onload = tryPrint;
    setTimeout(tryPrint, 600);
  };

  const handleClick = async () => {
    setLoading(true);
    setOkMsg(null);
    setErrMsg(null);

    // limpa PDF anterior
    revokeLastUrl();
    setPdfUrl(null);

    try {
      const resp = await fetch(TESTE_URL, {
        method: 'POST',
        headers: {
          // ⚠️ não precisa Content-Type se não está mandando body
          // se seu backend exigir JSON vazio, descomente abaixo e mande body "{}"
          // 'Content-Type': 'application/json',
        },
        // body: JSON.stringify({}), // se necessário
      });

      const ct = (resp.headers.get('content-type') || '').toLowerCase();

      if (!resp.ok) {
        const data = ct.includes('application/json')
          ? await resp.json().catch(() => null)
          : await resp.text().catch(() => '');
        setErrMsg(typeof data === 'string' ? data : data?.message || `Erro HTTP ${resp.status}`);
        return;
      }

      if (!ct.includes('application/pdf')) {
        const data = ct.includes('application/json')
          ? await resp.json().catch(() => null)
          : await resp.text().catch(() => '');
        setErrMsg(
          `Resposta não é PDF (content-type: ${ct || 'desconhecido'}). ${
            typeof data === 'string' ? data : data?.message || ''
          }`.trim(),
        );
        return;
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      lastUrlRef.current = url;
      setPdfUrl(url);

      setFileName(extractFilename(resp) || 'documento.pdf');
      setOkMsg('PDF gerado. Você pode visualizar abaixo ou imprimir.');

      // ✅ se quiser imprimir automaticamente ao receber, descomente:
      // openAndPrint(url);
    } catch (e: any) {
      setErrMsg(e?.message || 'Falha ao chamar endpoint.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    openAndPrint(pdfUrl);
  };

  useEffect(() => {
    return () => {
      revokeLastUrl();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ p: 3, display: 'grid', gap: 2, width: '100%', maxWidth: 900 }}>
      <Typography variant="h6">Teste (backend retorna PDF para impressão)</Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          disabled={loading}
          onClick={handleClick}
          sx={{
            bgcolor: '#d32f2f',
            '&:hover': { bgcolor: '#b71c1c' },
            height: 48,
            fontWeight: 700,
            minWidth: 140,
          }}
        >
          {loading ? (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={18} sx={{ color: '#fff' }} />
              Gerando...
            </Box>
          ) : (
            'teste'
          )}
        </Button>

        <Button
          variant="contained"
          disabled={loading || !pdfUrl}
          onClick={handlePrint}
          sx={{
            bgcolor: '#2e7d32',
            '&:hover': { bgcolor: '#1b5e20' },
            height: 48,
            fontWeight: 700,
            minWidth: 140,
          }}
        >
          Imprimir
        </Button>
      </Box>

      {pdfUrl && (
        <Typography variant="body2" color="text.secondary">
          Arquivo: {fileName}
        </Typography>
      )}

      {okMsg && <Alert severity="success">{okMsg}</Alert>}
      {errMsg && <Alert severity="error">{errMsg}</Alert>}

      {/* ✅ preview do PDF */}
      {pdfUrl && (
        <Box
          sx={{
            border: (t) => `1px solid ${t.palette.divider}`,
            borderRadius: 2,
            overflow: 'hidden',
            height: { xs: '70vh', md: '75vh' },
            bgcolor: 'background.paper',
          }}
        >
          <iframe
            title="Pré-visualização do PDF"
            src={pdfUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 0,
            }}
          />
        </Box>
      )}
    </Box>
  );
}
