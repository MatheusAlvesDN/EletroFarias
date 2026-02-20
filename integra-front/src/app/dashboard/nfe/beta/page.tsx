'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { Grid } from '@mui/material';


type Row = {
  NUMNOTA?: number | string;
  VLRNOTA?: number | string;
  XML?: string;
};

function safeString(v: any) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function toYmd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Heurística simples para base64 -> texto
function maybeBase64ToText(input: string) {
  const s = (input ?? '').trim();
  if (!s) return s;

  const looksB64 = /^[A-Za-z0-9+/=\s]+$/.test(s) && s.length % 4 === 0 && s.length > 40;
  if (!looksB64) return s;

  try {
    const cleaned = s.replace(/\s+/g, '');
    const decoded = atob(cleaned);

    const printableRatio =
      decoded.split('').filter((c) => c >= ' ' || c === '\n' || c === '\r' || c === '\t').length / decoded.length;

    return printableRatio > 0.9 ? decoded : s;
  } catch {
    return s;
  }
}

function xmlPretty(xml: string) {
  const s = (xml ?? '').trim();
  if (!s) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(s, 'text/xml');
    const err = doc.getElementsByTagName('parsererror')?.[0]?.textContent;
    if (err) return s;
  } catch {
    return s;
  }

  try {
    const reg = /(>)(<)(\/*)/g;
    let formatted = s.replace(reg, '$1\n$2$3');
    let pad = 0;
    const PADDING = '  ';

    return formatted
      .split('\n')
      .map((line) => {
        let indent = 0;
        if (line.match(/.+<\/\w[^>]*>$/)) {
          indent = 0;
        } else if (line.match(/^<\/\w/)) {
          if (pad > 0) pad -= 1;
        } else if (line.match(/^<\w([^>]*[^/])?>.*$/)) {
          indent = 1;
        } else {
          indent = 0;
        }

        const out = PADDING.repeat(pad) + line;
        pad += indent;
        return out;
      })
      .join('\n');
  } catch {
    return s;
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// --- NOVO COMPONENTE: Visualizador Visual de NFe ---
function NfeVisualizer({ xml }: { xml: string }) {
  const parsedData = useMemo(() => {
    if (typeof window === 'undefined' || !xml) return null;
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const err = doc.getElementsByTagName('parsererror')?.[0];
      if (err) return null;

      const getText = (parent: Element | null, tag: string) => 
        parent?.getElementsByTagName(tag)[0]?.textContent || '';

      const ide = doc.getElementsByTagName('ide')[0];
      const emit = doc.getElementsByTagName('emit')[0];
      const dest = doc.getElementsByTagName('dest')[0];
      const total = doc.getElementsByTagName('ICMSTot')[0];
      const detNodes = Array.from(doc.getElementsByTagName('det'));
      const enderEmitNode = first(emit, 'enderEmit');


      return {
        ide: {
          nNF: getText(ide, 'nNF'),
          natOp: getText(ide, 'natOp'),
          dhEmi: getText(ide, 'dhEmi').split('T')[0],
        },
        emit: {
          xNome: getText(emit, 'xNome'),
          xFant: getText(emit, 'xFant'),
          CNPJ: getText(emit, 'CNPJ'),
          enderEmit:{
            UF: getText(enderEmitNode , 'UF')
        },
        },
        
        dest: {
          xNome: getText(dest, 'xNome'),
          CNPJ: getText(dest, 'CNPJ') || getText(dest, 'CPF'),
        },
        
        total: {
          vNF: getText(total, 'vNF'),
          vProd: getText(total, 'vProd'),
        },
        items: detNodes.map((det) => {
          const prod = det.getElementsByTagName('prod')[0];
          return {
            cProd: getText(prod, 'cProd'),
            xProd: getText(prod, 'xProd'),
            qCom: getText(prod, 'qCom'),
            vUnCom: getText(prod, 'vUnCom'),
            vProd: getText(prod, 'vProd'),
          };
        }),
      };
    } catch {
      return null;
    }
  }, [xml]);

  if (!parsedData || !parsedData.ide.nNF) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Não foi possível montar a visualização gráfica (o XML não parece ser uma NFe padrão). Alterne para o "XML Bruto".
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="overline">Dados da Nota</Typography>
              <Typography variant="body1"><b>Número:</b> {parsedData.ide.nNF}</Typography>
              <Typography variant="body2"><b>Emissão:</b> {parsedData.ide.dhEmi}</Typography>
              <Typography variant="body2"><b>Natureza:</b> {parsedData.ide.natOp}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid  size={{ xs:12 , md: 4 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="overline">Emitente</Typography>
              <Typography variant="body1"><b>Nome:</b> {parsedData.emit.xNome}</Typography>
              <Typography variant="body2"><b>Fantasia:</b> {parsedData.emit.xFant}</Typography>
              <Typography variant="body2"><b>CNPJ:</b> {parsedData.emit.CNPJ}</Typography>
              <Typography variant="body2"><b>UF:</b> {parsedData.emit.enderEmit.UF}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="overline">Destinatário</Typography>
              <Typography variant="body1"><b>Nome:</b> {parsedData.dest.xNome}</Typography>
              <Typography variant="body2"><b>CNPJ/CPF:</b> {parsedData.dest.CNPJ}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Itens da Nota</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell align="right">Qtd</TableCell>
              <TableCell align="right">Vlr Unit</TableCell>
              <TableCell align="right">Vlr Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {parsedData.items.map((item, i) => (
              <TableRow key={i}>
                <TableCell>{item.cProd}</TableCell>
                <TableCell>{item.xProd}</TableCell>
                <TableCell align="right">{item.qCom}</TableCell>
                <TableCell align="right">{item.vUnCom}</TableCell>
                <TableCell align="right">{item.vProd}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Typography variant="h6">
          Total da Nota: R$ {parsedData.total.vNF}
        </Typography>
      </Box>
    </Box>
  );
}
// --- FIM DO COMPONENTE ---

export default function SankhyaXmlViewerPage() {
  const API_BASE = useMemo(() => (process.env.NEXT_PUBLIC_API_URL ?? '').trim(), []);
  const BASE_URL = useMemo(() => {
    if (!API_BASE) return '/sankhya/nfe';
    return `${API_BASE.replace(/\/$/, '')}/sankhya/nfe`;
  }, [API_BASE]);

  const [dtIni, setDtIni] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toYmd(d);
  });
  const [dtFim, setDtFim] = useState(() => toYmd(new Date()));

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Estado do Modal
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgTitle, setDlgTitle] = useState('');
  const [dlgXml, setDlgXml] = useState('');
  const [dlgWarn, setDlgWarn] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'raw'>('visual'); // NOVO ESTADO

  const buildUrl = () => {
    const qs = `dtIni=${encodeURIComponent(dtIni)}&dtFim=${encodeURIComponent(dtFim)}`;
    return BASE_URL.includes('http') ? `${BASE_URL}?${qs}` : `${BASE_URL}?${qs}`;
  };

  const fetchData = async () => {
    setLoading(true);
    setErr(null);

    try {
      const url = buildUrl();
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      const ct = res.headers.get('content-type') || '';
      if (!res.ok) {
        const text = ct.includes('application/json') ? JSON.stringify(await res.json()) : await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      if (!ct.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Resposta não é JSON (content-type: ${ct}). Body: ${text.slice(0, 500)}`);
      }

      const data = await res.json();
      const list: Row[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

      setRows(list);
      setPage(0);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => {
      const s = `${safeString(r.NUMNOTA)} ${safeString(r.VLRNOTA)}`.toLowerCase();
      return s.includes(query);
    });
  }, [rows, q]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length]);
  const pageRows = useMemo(() => {
    const start = page * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const openXml = (r: Row) => {
    setDlgWarn(null);
    setViewMode('visual'); // Reseta para a aba visual ao abrir

    const num = safeString(r.NUMNOTA);
    const vlr = safeString(r.VLRNOTA);

    const raw = safeString(r.XML);
    const decoded = maybeBase64ToText(raw);
    const pretty = xmlPretty(decoded);

    if (!pretty.trim()) setDlgWarn('XML vazio.');
    else if (!pretty.trim().startsWith('<')) setDlgWarn('Conteúdo não parece XML puro. Mostrando texto bruto.');

    setDlgTitle(`Nota Fiscal — NUMNOTA ${num || '-'} | VLR ${vlr || '-'}`);
    setDlgXml(pretty);
    setDlgOpen(true);
  };

  const openInNewTab = () => {
    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(dlgTitle)}</title>
<style>
  body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; margin: 16px; }
  pre { white-space: pre; overflow: auto; border: 1px solid #ddd; padding: 12px; border-radius: 8px; }
</style>
</head>
<body>
<h3>${escapeHtml(dlgTitle)}</h3>
<pre>${escapeHtml(dlgXml)}</pre>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>
          Visualizador de NFe (Sankhya)
        </Typography>

        <Chip label={`Total: ${rows.length}`} />
        <Chip label={`Filtrados: ${filtered.length}`} variant="outlined" />

        <Button onClick={fetchData} variant="contained" disabled={loading}>
          Atualizar
        </Button>
      </Box>

      {/* ... (Filtros e Alertas originais se mantêm iguais) ... */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Dt. inicial"
            type="date"
            value={dtIni}
            onChange={(e) => setDtIni(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Dt. final"
            type="date"
            value={dtFim}
            onChange={(e) => setDtFim(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="outlined"
            onClick={() => {
              setPage(0);
              fetchData();
            }}
            disabled={loading}
          >
            Aplicar período
          </Button>

          <TextField
            label="Buscar (NUMNOTA/VLR)"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            size="small"
            sx={{ minWidth: 260, ml: 'auto' }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Endpoint: <b>{buildUrl()}</b>
        </Typography>
      </Paper>

      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      {/* Tabela de Resultados */}
      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={160}>Ações</TableCell>
                  <TableCell>NUMNOTA</TableCell>
                  <TableCell>VLRNOTA</TableCell>
                  <TableCell>Prévia</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography sx={{ p: 2 }} color="text.secondary">
                        Nenhum registro para exibir.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((r, idx) => {
                    const xmlPreview = safeString(r.XML);
                    const short = xmlPreview.length > 140 ? xmlPreview.slice(0, 140) + '…' : xmlPreview;

                    return (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Button size="small" variant="contained" onClick={() => openXml(r)}>
                            Visualizar
                          </Button>
                        </TableCell>
                        <TableCell>{safeString(r.NUMNOTA)}</TableCell>
                        <TableCell>{safeString(r.VLRNOTA)}</TableCell>
                        <TableCell title={xmlPreview}>{short}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>
          Anterior
        </Button>
        <Typography variant="body2">
          Página {page + 1} / {totalPages}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1 || loading}
        >
          Próxima
        </Button>
      </Box>

      {/* Dialog Modificado com Toggle de Visualização */}
      <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1 }}>{dlgTitle}</Box>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => {
              if (newMode) setViewMode(newMode);
            }}
            size="small"
          >
            <ToggleButton value="visual">Visualização</ToggleButton>
            <ToggleButton value="raw">XML Bruto</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="outlined" onClick={openInNewTab} disabled={!dlgXml.trim()}>
            Abrir em nova aba
          </Button>
        </DialogTitle>
        <DialogContent>
          <Divider sx={{ mb: 2 }} />
          
          {dlgWarn && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {dlgWarn}
            </Alert>
          )}

          {viewMode === 'visual' ? (
            <NfeVisualizer xml={dlgXml} />
          ) : (
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 2,
                borderRadius: 1,
                bgcolor: 'rgba(0,0,0,0.04)',
                overflow: 'auto',
                maxHeight: '70vh',
                fontSize: 12,
                whiteSpace: 'pre',
              }}
            >
              {dlgXml}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function first(el: Element | null | undefined, tag: string): Element | null {
  if (!el) return null;
  return el.getElementsByTagName(tag)[0] ?? null;
}
