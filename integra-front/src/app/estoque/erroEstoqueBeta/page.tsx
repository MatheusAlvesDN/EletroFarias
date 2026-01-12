'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  IconButton,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SidebarMenu from '@/components/SidebarMenu';
import { useUpdateLocStore } from '@/stores/useUpdateLocStore';

type ErroEstoque = {
  id: string;
  codProd: number;
  descricao: string;
  createdAt: string;
  userCreate: string;
  resolvido: boolean;
  userResolve?: string | null;
  resolvedAt?: string | null;
};

type EstoqueItem = {
  CODLOCAL: number | string;
  ESTOQUE: number | string | null;
  RESERVADO: number | string | null;
  DISPONIVEL: number | string | null;
  CODEMP?: number | string | null;
  LocalFinanceiro_DESCRLOCAL?: string | null;
};

type Produto = {
  CODPROD?: string | number | null;
  DESCRPROD?: string | null;
  LOCALIZACAO?: string | null;
  AD_LOCALIZACAO?: string | null;
  AD_QTDMAX?: number | null;
  estoque?: EstoqueItem[];
};

function formatDateTimeBR(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR');
}

const onlyNumber = (v: string) => v.replace(/[^\d]/g, '');

const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));
const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function AjusteDialog({
  open,
  onClose,
  codProd,
  descricao,
  apiBase,
  apiTokenEnv,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  codProd: number | null;
  descricao?: string;
  apiBase: string;
  apiTokenEnv: string;
  onSuccess: () => Promise<void> | void;
}) {
  const MAX_LOC = 15;
  const MAX_LOC2 = 15;

  const [token, setToken] = useState<string | null>(null);

  const [produto, setProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // editar localização
  const [localizacao, setLocalizacao] = useState('');
  const [localizacao2, setLocalizacao2] = useState('');

  // contagem
  const [contagem, setContagem] = useState('');
  const [sending, setSending] = useState(false);

  // códigos de barras
  const [codigoBarrasList, setCodigoBarrasList] = useState<string[]>([]);
  const [codigoBarrasLoading, setCodigoBarrasLoading] = useState(false);
  const [codigoBarrasError, setCodigoBarrasError] = useState<string | null>(null);
  const [barrasExpanded, setBarrasExpanded] = useState(false);

  // modal add barras
  const [addBarrasOpen, setAddBarrasOpen] = useState(false);
  const [codBarras, setCodBarras] = useState('');
  const [addBarrasLoading, setAddBarrasLoading] = useState(false);
  const [addBarrasErr, setAddBarrasErr] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    setToken(t);
  }, []);

  const { sendUpdateLocation, sendUpdateLocation2, isSaving, error: storeError } = useUpdateLocStore();

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (apiTokenEnv) headers.Authorization = `Bearer ${apiTokenEnv}`;
    return headers;
  }, [token, apiTokenEnv]);

  const GET_PRODUCT_URL = useMemo(() => {
    return apiBase ? `${apiBase}/sync/getProduct` : `/sync/getProduct`;
  }, [apiBase]);

  const GET_COD_BARRAS_URL = useMemo(() => {
    return apiBase ? `${apiBase}/sync/getCodBarras` : `/sync/getCodBarras`;
  }, [apiBase]);

  const CRIAR_COD_BARRAS_URL = useMemo(() => {
    return apiBase ? `${apiBase}/sync/criarCodigoBarras` : `/sync/criarCodigoBarras`;
  }, [apiBase]);

  const POST_CORRECAO_URL = useMemo(() => {
    return apiBase ? `${apiBase}/sync/correcaoErroEstoque` : `/sync/correcaoErroEstoque`;
  }, [apiBase]);

  const toNum = (v: unknown) => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  const numberFormatter = useMemo(() => new Intl.NumberFormat('pt-BR'), []);

  const totais = useMemo(() => {
    const itens = produto?.estoque ?? [];
    return itens.reduce(
      (acc, it) => {
        acc.estoque += toNum(it.ESTOQUE);
        acc.reservado += toNum(it.RESERVADO);
        acc.disponivel += toNum(it.DISPONIVEL);
        return acc;
      },
      { estoque: 0, reservado: 0, disponivel: 0 },
    );
  }, [produto]);

  // -------- normalização de cod barras ----------
  const normalizeCodBarras = (raw: unknown): string[] => {
    const uniq = (arr: string[]) => Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
    if (raw == null) return [];

    if (typeof raw === 'string' || typeof raw === 'number') {
      const s = String(raw).trim();
      if (s.includes(',')) return uniq(s.split(',').map((x) => x.trim()));
      return s ? [s] : [];
    }

    if (Array.isArray(raw)) return uniq(raw.map((x) => String(x ?? '').trim()));

    if (typeof raw === 'object') {
      const r = raw as Record<string, unknown>;
      const direct =
        r.codBarras ?? r.CODBARRAS ?? r.codigoBarras ?? r.CODIGOBARRAS ?? r.barcode ?? r.BARCODE;

      if (direct != null) {
        const s = String(direct).trim();
        if (s.includes(',')) return uniq(s.split(',').map((x) => x.trim()));
        return s ? [s] : [];
      }

      const data = r.data ?? r.DATA ?? r.items ?? r.ITEMS;
      if (Array.isArray(data)) return uniq(data.map((x) => String(x ?? '').trim()));
    }

    return [];
  };

  const fetchProduto = useCallback(async () => {
    if (!codProd) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      setErro(null);
      setLoading(true);
      setProduto(null);

      const url = `${GET_PRODUCT_URL}?id=${encodeURIComponent(String(codProd))}`;

      const resp = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
        signal: ac.signal,
      });

      if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        throw new Error(msg || `Falha na busca (status ${resp.status})`);
      }

      const data = (await resp.json()) as Produto | null;
      if (!data || (!data.CODPROD && !data.DESCRPROD)) {
        setErro('Produto não encontrado.');
        setProduto(null);
        return;
      }

      setProduto(data);
      setLocalizacao(String(data.LOCALIZACAO ?? '').slice(0, MAX_LOC));
      setLocalizacao2(String(data.AD_LOCALIZACAO ?? '').slice(0, MAX_LOC2));
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setErro(e?.message || 'Erro ao buscar produto.');
    } finally {
      setLoading(false);
    }
  }, [GET_PRODUCT_URL, codProd, getHeaders]);

  const fetchCodBarras = useCallback(async () => {
    if (!codProd) return;

    setCodigoBarrasLoading(true);
    setCodigoBarrasError(null);

    try {
      const url = `${GET_COD_BARRAS_URL}?codProd=${encodeURIComponent(String(codProd))}`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        throw new Error(msg || `Falha ao buscar código de barras (status ${resp.status})`);
      }

      const raw = (await resp.json()) as unknown;
      const list = normalizeCodBarras(raw);
      setCodigoBarrasList(list);
    } catch (e: any) {
      setCodigoBarrasList([]);
      setCodigoBarrasError(e?.message || 'Erro ao buscar código de barras');
    } finally {
      setCodigoBarrasLoading(false);
    }
  }, [GET_COD_BARRAS_URL, codProd, getHeaders]);

  useEffect(() => {
    if (!open) return;

    setContagem('');
    setBarrasExpanded(false);
    setCodBarras('');
    setAddBarrasErr(null);

    void fetchProduto();
    void fetchCodBarras();

    return () => abortRef.current?.abort();
  }, [open, fetchProduto, fetchCodBarras]);

  const handleSalvarLocalizacoes = useCallback(async () => {
    if (!produto?.CODPROD) {
      setErro('Produto inválido.');
      return;
    }

    const id = Number(produto.CODPROD);
    if (!Number.isFinite(id)) {
      setErro('CODPROD inválido.');
      return;
    }

    const loc1 = localizacao.slice(0, MAX_LOC);
    const loc2 = localizacao2.slice(0, MAX_LOC2);

    try {
      setErro(null);
      const ok1 = await sendUpdateLocation(id, loc1);
      const ok2 = await sendUpdateLocation2(id, loc2);

      if (!ok1 || !ok2) {
        setErro(storeError || 'Erro ao salvar localizações.');
        return;
      }

      setProduto((p) => (p ? { ...p, LOCALIZACAO: loc1, AD_LOCALIZACAO: loc2 } : p));
    } catch (e: any) {
      setErro(e?.message || 'Erro ao salvar localizações.');
    }
  }, [produto?.CODPROD, localizacao, localizacao2, sendUpdateLocation, sendUpdateLocation2, storeError]);

  const openAddBarras = useCallback(() => {
    setAddBarrasErr(null);
    setCodBarras('');
    setAddBarrasOpen(true);
  }, []);

  const closeAddBarras = useCallback(() => {
    if (addBarrasLoading) return;
    setAddBarrasOpen(false);
    setAddBarrasErr(null);
  }, [addBarrasLoading]);

  const handleEnviarCodBarras = useCallback(async () => {
    if (!produto?.CODPROD) {
      setAddBarrasErr('Produto inválido.');
      return;
    }
    const codProdNum = Number(produto.CODPROD);
    if (!Number.isFinite(codProdNum)) {
      setAddBarrasErr('CODPROD inválido.');
      return;
    }

    const barras = codBarras.trim();
    if (!barras) {
      setAddBarrasErr('Informe o código de barras.');
      return;
    }

    try {
      setAddBarrasErr(null);
      setAddBarrasLoading(true);

      const payload = { codProduto: codProdNum, codBarras: barras };

      const resp = await fetch(CRIAR_COD_BARRAS_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        throw new Error(msg || `Falha ao criar código de barras (status ${resp.status})`);
      }

      setAddBarrasOpen(false);
      await fetchCodBarras();
    } catch (e: any) {
      setAddBarrasErr(e?.message || 'Erro ao criar código de barras.');
    } finally {
      setAddBarrasLoading(false);
    }
  }, [CRIAR_COD_BARRAS_URL, codBarras, getHeaders, produto?.CODPROD, fetchCodBarras]);

  const handleEnviarContagem = useCallback(async () => {
    if (!codProd) return;

    const numeric = onlyNumber(contagem).trim();
    if (!numeric) {
      setErro('Informe uma contagem numérica.');
      return;
    }

    try {
      setErro(null);
      setSending(true);

      const url = `${POST_CORRECAO_URL}?valor=${encodeURIComponent(numeric)}&codProd=${encodeURIComponent(
        String(codProd),
      )}`;

      const resp = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
      });

      if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        throw new Error(msg || `Falha ao enviar (status ${resp.status})`);
      }

      await onSuccess();
      onClose();
    } catch (e: any) {
      setErro(e?.message || 'Erro ao encaminhar contagem.');
    } finally {
      setSending(false);
    }
  }, [POST_CORRECAO_URL, contagem, codProd, getHeaders, onClose, onSuccess]);

  const BARRAS_PREVIEW_QTD = 0;
  const barrasToShow = barrasExpanded ? codigoBarrasList : codigoBarrasList.slice(0, BARRAS_PREVIEW_QTD);
  const hasMoreBarras = codigoBarrasList.length > BARRAS_PREVIEW_QTD;

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} fullWidth maxWidth="lg">
      <DialogTitle>Ajuste / Conferência de produto</DialogTitle>

      <DialogContent dividers sx={{ bgcolor: '#f0f4f8' }}>
        <Card
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            borderRadius: 2,
            boxShadow: 0,
            border: 1,
            bgcolor: 'background.paper',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Produto (a partir do erro)
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
              <TextField label="Código do produto" value={codProd ?? ''} size="small" disabled />
              <Button variant="contained" onClick={fetchProduto} disabled={loading || !codProd}>
                {loading ? <CircularProgress size={22} /> : 'Recarregar'}
              </Button>
            </Box>

            {descricao && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Erro: {descricao}
              </Typography>
            )}

            {erro && (
              <Typography color="error" sx={{ mb: 1 }}>
                {erro}
              </Typography>
            )}

            {produto && (
              <>
                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Resultado
                </Typography>

                <Stack spacing={2}>
                  <Box
                    component="img"
                    src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${produto.CODPROD}.dbimage`}
                    alt={produto.DESCRPROD ?? 'Imagem do produto'}
                    sx={{
                      width: 200,
                      height: 200,
                      objectFit: 'contain',
                      border: (t) => `1px solid ${t.palette.divider}`,
                      borderRadius: 2,
                      backgroundColor: 'background.default',
                    }}
                  />

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' }, gap: 2 }}>
                    <TextField label="CODPROD" value={produto.CODPROD ?? ''} size="small" disabled fullWidth />
                    <TextField label="DESCRPROD" value={produto.DESCRPROD ?? ''} size="small" disabled fullWidth />
                  </Box>

                  {/* Alterar Localizações */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                      label="LOCALIZAÇÃO"
                      value={localizacao}
                      onChange={(e) => setLocalizacao(e.target.value.slice(0, MAX_LOC))}
                      size="small"
                      fullWidth
                      helperText={`${localizacao.length}/${MAX_LOC}`}
                      slotProps={{ htmlInput: { maxLength: MAX_LOC } }}
                    />
                    <TextField
                      label="LOCALIZAÇÃO 2"
                      value={localizacao2}
                      onChange={(e) => setLocalizacao2(e.target.value.slice(0, MAX_LOC2))}
                      size="small"
                      fullWidth
                      helperText={`${localizacao2.length}/${MAX_LOC2}`}
                      slotProps={{ htmlInput: { maxLength: MAX_LOC2 } }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      onClick={handleSalvarLocalizacoes}
                      disabled={isSaving || !produto?.CODPROD}
                      sx={{ whiteSpace: 'nowrap', height: 40 }}
                    >
                      {isSaving ? <CircularProgress size={22} /> : 'SALVAR LOCALIZAÇÕES'}
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={openAddBarras}
                      disabled={!produto?.CODPROD}
                      sx={{ whiteSpace: 'nowrap', height: 40 }}
                    >
                      ADICIONAR COD. BARRAS
                    </Button>
                  </Box>

                  {/* Lista de Códigos de Barras */}
                  <Box
                    sx={{
                      border: (t) => `1px solid ${t.palette.divider}`,
                      borderRadius: 1,
                      p: 1.5,
                      backgroundColor: 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        CÓDIGO DE BARRAS
                      </Typography>

                      {hasMoreBarras && (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setBarrasExpanded((v) => !v)}
                          sx={{ textTransform: 'none' }}
                          disabled={codigoBarrasLoading}
                        >
                          {barrasExpanded ? 'Minimizar' : 'Expandir'}
                        </Button>
                      )}
                    </Box>

                    {codigoBarrasLoading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2">Carregando...</Typography>
                      </Box>
                    ) : codigoBarrasError ? (
                      <Typography variant="body2" color="error">
                        Erro ao carregar códigos.
                      </Typography>
                    ) : codigoBarrasList.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nenhum código de barras cadastrado.
                      </Typography>
                    ) : (
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        {barrasToShow.map((b, idx) => (
                          <Box component="li" key={`${b}-${idx}`} sx={{ fontFamily: 'monospace' }}>
                            {b}
                          </Box>
                        ))}
                        {!barrasExpanded && hasMoreBarras && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            +{codigoBarrasList.length - BARRAS_PREVIEW_QTD} outros...
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>

                  {/* Estoque por local */}
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Estoque por local
                  </Typography>

                  {!produto.estoque || produto.estoque.length === 0 ? (
                    <Typography sx={{ color: 'text.secondary' }}>
                      Nenhum registro de estoque para este produto.
                    </Typography>
                  ) : (
                    <TableContainer
                      component={Paper}
                      elevation={0}
                      sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 2 }}
                    >
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow
                            sx={{
                              '& th': {
                                backgroundColor: (t) => t.palette.grey[50],
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              },
                            }}
                          >
                            <TableCell>Código Local</TableCell>
                            <TableCell>Local</TableCell>
                            <TableCell>Cód. Empresa</TableCell>
                            <TableCell align="right">Estoque</TableCell>
                            <TableCell align="right">Reservado</TableCell>
                            <TableCell align="right">Disponível</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {produto.estoque.map((it, idx) => (
                            <TableRow key={`${it.CODLOCAL}-${idx}`}>
                              <TableCell>{it.CODLOCAL}</TableCell>
                              <TableCell>{it.LocalFinanceiro_DESCRLOCAL ?? '-'}</TableCell>
                              <TableCell>{it.CODEMP ?? '-'}</TableCell>
                              <TableCell align="right">{numberFormatter.format(toNum(it.ESTOQUE))}</TableCell>
                              <TableCell align="right">{numberFormatter.format(toNum(it.RESERVADO))}</TableCell>
                              <TableCell align="right">{numberFormatter.format(toNum(it.DISPONIVEL))}</TableCell>
                            </TableRow>
                          ))}

                          <TableRow>
                            <TableCell colSpan={3} sx={{ fontWeight: 700 }}>
                              Totais
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {numberFormatter.format(totais.estoque)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {numberFormatter.format(totais.reservado)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {numberFormatter.format(totais.disponivel)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {/* AO FINAL: Encaminhar contagem */}
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Encaminhar contagem
                  </Typography>

                  <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems="center">
                    <TextField
                      label="Contagem (somente número)"
                      value={contagem}
                      onChange={(e) => setContagem(onlyNumber(e.target.value))}
                      inputMode="numeric"
                      fullWidth
                    />
                    <Button
                      variant="contained"
                      onClick={handleEnviarContagem}
                      disabled={sending || !onlyNumber(contagem).trim()}
                      sx={{ whiteSpace: 'nowrap', height: 40 }}
                    >
                      {sending ? <CircularProgress size={18} /> : 'ENVIAR'}
                    </Button>
                  </Stack>
                </Stack>
              </>
            )}
          </CardContent>
        </Card>

        {/* Modal: ADICIONAR COD. BARRAS */}
        <Dialog open={addBarrasOpen} onClose={closeAddBarras} fullWidth maxWidth="xs">
          <DialogTitle>Adicionar código de barras</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Informe o código de barras para o produto <b>{String(produto?.CODPROD ?? '-')}</b>.
            </Typography>

            <TextField
              label="Código de barras"
              value={codBarras}
              onChange={(e) => setCodBarras(e.target.value)}
              size="small"
              fullWidth
              autoFocus
              sx={{ mt: 1 }}
            />

            {addBarrasErr && (
              <Typography color="error" sx={{ mt: 2 }}>
                {addBarrasErr}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={closeAddBarras} disabled={addBarrasLoading}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleEnviarCodBarras} disabled={addBarrasLoading || !codBarras.trim()}>
              {addBarrasLoading ? <CircularProgress size={18} /> : 'ENVIAR'}
            </Button>
          </DialogActions>
        </Dialog>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={sending}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ErroEstoquePage() {
  const [data, setData] = useState<ErroEstoque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'TODOS' | 'PENDENTES' | 'RESOLVIDOS'>('PENDENTES');

  // modal "pagina"
  const [openAjuste, setOpenAjuste] = useState(false);
  const [selected, setSelected] = useState<ErroEstoque | null>(null);

  // sidebar (padrão das outras páginas)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // feedback
  const [snack, setSnack] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success',
  });

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    setToken(t);
  }, []);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const GET_ALL_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/getAllErroEstoque` : `/sync/getAllErroEstoque`),
    [API_BASE],
  );

  const FINALIZAR_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/finalizarErroEstoque` : `/sync/finalizarErroEstoque`),
    [API_BASE],
  );

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const fetchErros = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      setError(null);
      setIsLoading(true);

      const res = await fetch(GET_ALL_URL, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
        signal: ac.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Erro HTTP ${res.status}`);
      }

      const json = (await res.json()) as ErroEstoque[];
      if (!mountedRef.current) return;

      const sorted = [...(json ?? [])].sort((a, b) => {
        if (a.resolvido !== b.resolvido) return a.resolvido ? 1 : -1;
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return db - da;
      });

      setData(sorted);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setError(e?.message || 'Falha ao buscar erros de estoque.');
    } finally {
      if (!mountedRef.current) return;
      setIsLoading(false);
    }
  }, [GET_ALL_URL, getHeaders]);

  const handleFinalizar = useCallback(
    async (row: ErroEstoque) => {
      try {
        setFinalizandoId(row.id);

        const res = await fetch(FINALIZAR_URL, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ id: row.id }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(txt || `Erro HTTP ${res.status}`);
        }

        setSnack({ open: true, msg: 'Erro finalizado com sucesso.', type: 'success' });
        await fetchErros();
      } catch (e: any) {
        setSnack({ open: true, msg: e?.message || 'Falha ao finalizar.', type: 'error' });
      } finally {
        setFinalizandoId(null);
      }
    },
    [FINALIZAR_URL, fetchErros, getHeaders],
  );

  useEffect(() => {
    mountedRef.current = true;
    fetchErros();

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [fetchErros]);

  const counts = useMemo(() => {
    const total = data.length;
    const pend = data.filter((x) => !x.resolvido).length;
    const res = total - pend;
    return { total, pend, res };
  }, [data]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return data.filter((x) => {
      if (status === 'PENDENTES' && x.resolvido) return false;
      if (status === 'RESOLVIDOS' && !x.resolvido) return false;

      if (!needle) return true;

      const hay = [x.id, String(x.codProd ?? ''), x.descricao ?? '', x.userCreate ?? '', x.userResolve ?? '']
        .join(' ')
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [data, q, status]);

  const openAjusteFor = (row: ErroEstoque) => {
    setSelected(row);
    setOpenAjuste(true);
  };

  const closeAjuste = () => {
    setOpenAjuste(false);
    setSelected(null);
  };

  const CARD_SX = useMemo(
    () =>
      ({
        maxWidth: 1400,
        mx: 'auto',
        mt: 6,
        borderRadius: 2,
        boxShadow: 0,
        border: 1,
        backgroundColor: 'background.paper',
      } as const),
    [],
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Floating button: sidebar */}
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
          zIndex: (t) => t.zIndex.appBar,
        }}
      >
        <IconButton onClick={() => setSidebarOpen((v) => !v)} aria-label="menu" size="large">
          <MenuIcon />
        </IconButton>
      </Box>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: 0,
          backgroundColor: '#f0f4f8',
          height: '100vh',
          overflowY: 'auto',
          p: { xs: 2, sm: 5 },
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          lineHeight: '1.8',
          color: '#333',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Card sx={CARD_SX}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Header padrão (menu + título + contadores + atualizar) */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                mb: 2,
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Erros de Estoque
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Lista vinda de GET <code>sync/getAllErroEstoque</code>
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Chip label={`Total: ${counts.total}`} />
                <Chip label={`Pendentes: ${counts.pend}`} color="warning" />
                <Chip label={`Resolvidos: ${counts.res}`} color="success" />
                <Button variant="outlined" onClick={fetchErros} disabled={isLoading}>
                  {isLoading ? <CircularProgress size={18} /> : 'Atualizar agora'}
                </Button>
              </Box>
            </Box>

            {/* filtros padrão */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
                gap: 2,
                mb: 2,
                alignItems: 'center',
              }}
            >
              <TextField
                label="Buscar (cód. produto, descrição, usuário...)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                size="small"
              />

              <ToggleButtonGroup
                value={status}
                exclusive
                onChange={(_, v) => v && setStatus(v)}
                sx={{ flexShrink: 0, justifySelf: { xs: 'start', md: 'end' } }}
              >
                <ToggleButton value="PENDENTES">Pendentes</ToggleButton>
                <ToggleButton value="RESOLVIDOS">Resolvidos</ToggleButton>
                <ToggleButton value="TODOS">Todos</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Divider sx={{ my: 2 }} />

                <TableContainer component={Paper} elevation={0} sx={{ border: (t) => `1px solid ${t.palette.divider}` }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow
                        sx={{
                          '& th': {
                            backgroundColor: (t) => t.palette.grey[50],
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          },
                        }}
                      >
                        <TableCell width={120}>Status</TableCell>
                        <TableCell width={110}>Cód. Prod</TableCell>
                        <TableCell>Descrição</TableCell>
                        <TableCell width={200}>Criado em</TableCell>
                        <TableCell width={180}>Usuário criação</TableCell>
                        <TableCell width={180}>Usuário resolução</TableCell>
                        <TableCell width={200}>Resolvido em</TableCell>
                        <TableCell width={240}>Ações</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {filtered.map((row) => (
                        <TableRow key={row.id} hover sx={{ opacity: row.resolvido ? 0.75 : 1 }}>
                          <TableCell>
                            {row.resolvido ? (
                              <Chip size="small" label="Resolvido" color="success" />
                            ) : (
                              <Chip size="small" label="Pendente" color="warning" />
                            )}
                          </TableCell>

                          <TableCell>{safeStr(row.codProd)}</TableCell>
                          <TableCell>{safeStr(row.descricao)}</TableCell>
                          <TableCell>{formatDateTimeBR(row.createdAt)}</TableCell>
                          <TableCell>{safeStr(row.userCreate)}</TableCell>
                          <TableCell>{safeStr(row.userResolve)}</TableCell>
                          <TableCell>{formatDateTimeBR(row.resolvedAt)}</TableCell>

                          <TableCell>
                            {!row.resolvido ? (
                              <Stack direction="row" gap={1} flexWrap="wrap">
                                <Button size="small" variant="contained" onClick={() => openAjusteFor(row)}>
                                  Ajuste
                                </Button>

                                <Button
                                  size="small"
                                  variant="contained"
                                  color="error"
                                  onClick={() => handleFinalizar(row)}
                                  disabled={finalizandoId === row.id}
                                >
                                  {finalizandoId === row.id ? 'Finalizando...' : 'FINALIZAR'}
                                </Button>
                              </Stack>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}

                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8}>
                            <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
                              Nenhum registro encontrado.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </CardContent>
        </Card>

        <AjusteDialog
          open={openAjuste}
          onClose={closeAjuste}
          codProd={selected?.codProd ?? null}
          descricao={selected?.descricao}
          apiBase={API_BASE}
          apiTokenEnv={API_TOKEN}
          onSuccess={async () => {
            setSnack({ open: true, msg: 'Contagem encaminhada com sucesso.', type: 'success' });
            await fetchErros();
          }}
        />

        <Snackbar
          open={snack.open}
          autoHideDuration={3500}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snack.type} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
