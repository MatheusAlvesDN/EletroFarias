'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,  
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
  Drawer,
  List,
  ListItem,
  ListItemText,
  useTheme,
  InputAdornment,
} from '@mui/material';
// Note: If 'Grid2' is not exported (MUI v5 with Unstable_Grid2 or v6 default), standard 'Grid' with 'size' prop fixes the 'item' error shown.
// I will keep the import as 'Grid' but use the 'size' prop syntax which matches the error context.
import { Grid } from '@mui/material'; 

import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InventoryIcon from '@mui/icons-material/Inventory';

// --- MOCKED COMPONENTS & STORES (Internalized for single-file support) ---

// Mock SidebarMenu component
function SidebarMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: 250 }} role="presentation" onClick={onClose} onKeyDown={onClose}>
        <List>
          <ListItem>
            <ListItemText primary="Menu Principal" secondary="Navegação simulada" />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
}

// Mock useUpdateLocStore hook
const useUpdateLocStore = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendUpdateLocation = async (id: number, loc: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      console.log(`[Mock] Atualizando Localização 1 do produto ${id} para: ${loc}`);
      return true;
    } catch (e) {
      setError('Erro ao salvar localização.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const sendUpdateLocation2 = async (id: number, loc: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      console.log(`[Mock] Atualizando Localização 2 do produto ${id} para: ${loc}`);
      return true;
    } catch (e) {
      setError('Erro ao salvar localização 2.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { sendUpdateLocation, sendUpdateLocation2, isSaving, error };
};

// --- END MOCKED COMPONENTS ---

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
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const onlyNumber = (v: string) => v.replace(/[^\d]/g, '');

const safeStr = (v: any) => (v == null || v === '' ? '-' : String(v));

// Componente visual para Estatísticas (KPIs)
const StatCard = ({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 3,
      background: 'linear-gradient(135deg, #fff 0%, #fcfcfc 100%)',
    }}
  >
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: '12px',
        bgcolor: `${color}15`, // 15% opacity
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
    </Box>
  </Paper>
);

function AjusteDialog({
  open,
  onClose,
  codProd,
  erroId,
  descricao,
  apiBase,
  apiTokenEnv,
  onSuccess,
  onFinalizarErro,
}: {
  open: boolean;
  onClose: () => void;
  codProd: number | null;
  erroId?: string;
  descricao?: string;
  apiBase: string;
  apiTokenEnv: string;
  onSuccess: () => Promise<void> | void;
  onFinalizarErro: (id: string) => Promise<void>;
}) {
  const MAX_LOC = 15;
  const MAX_LOC2 = 15;
  const theme = useTheme();

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
  const [finalizingLocal, setFinalizingLocal] = useState(false);

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

  const GET_PRODUCT_URL = useMemo(() => (apiBase ? `${apiBase}/sync/getProduct` : `/sync/getProduct`), [apiBase]);
  const GET_COD_BARRAS_URL = useMemo(() => (apiBase ? `${apiBase}/sync/getCodBarras` : `/sync/getCodBarras`), [apiBase]);
  const CRIAR_COD_BARRAS_URL = useMemo(() => (apiBase ? `${apiBase}/sync/criarCodigoBarras` : `/sync/criarCodigoBarras`), [apiBase]);
  const POST_CORRECAO_URL = useMemo(() => (apiBase ? `${apiBase}/sync/correcaoErroEstoque` : `/sync/correcaoErroEstoque`), [apiBase]);

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
      const direct = r.codBarras ?? r.CODBARRAS ?? r.codigoBarras ?? r.CODIGOBARRAS ?? r.barcode ?? r.BARCODE;
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
      const resp = await fetch(url, { method: 'GET', headers: getHeaders(), cache: 'no-store', signal: ac.signal });
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
      const resp = await fetch(url, { method: 'GET', headers: getHeaders(), cache: 'no-store' });
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
    if (!produto?.CODPROD) return setErro('Produto inválido.');
    const id = Number(produto.CODPROD);
    if (!Number.isFinite(id)) return setErro('CODPROD inválido.');
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
    if (!produto?.CODPROD) return setAddBarrasErr('Produto inválido.');
    const codProdNum = Number(produto.CODPROD);
    if (!Number.isFinite(codProdNum)) return setAddBarrasErr('CODPROD inválido.');
    const barras = codBarras.trim();
    if (!barras) return setAddBarrasErr('Informe o código de barras.');

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
    if (!numeric) return setErro('Informe uma contagem numérica.');

    try {
      setErro(null);
      setSending(true);
      const payload = { codProd: Number(codProd), valor: numeric };
      const resp = await fetch(POST_CORRECAO_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        throw new Error(msg || `Falha ao enviar (status ${resp.status})`);
      }
      await onSuccess();
      // Removido onClose() para manter o modal aberto
    } catch (e: any) {
      setErro(e?.message || 'Erro ao encaminhar contagem.');
    } finally {
      setSending(false);
    }
  }, [POST_CORRECAO_URL, contagem, codProd, getHeaders, onSuccess]);

  // Função interna para o botão "Finalizar" do modal
  const handleFinalizarLocal = async () => {
    if (!erroId) return;
    setFinalizingLocal(true);
    try {
        await onFinalizarErro(erroId);
        onClose(); // Fecha o modal após finalizar com sucesso
    } catch(e) {
        // Erro já é tratado no parent (snackbar), mas paramos o loading aqui
    } finally {
        setFinalizingLocal(false);
    }
  };

  const BARRAS_PREVIEW_QTD = 0;
  const barrasToShow = barrasExpanded ? codigoBarrasList : codigoBarrasList.slice(0, BARRAS_PREVIEW_QTD);
  const hasMoreBarras = codigoBarrasList.length > BARRAS_PREVIEW_QTD;

  return (
    <Dialog 
      open={open} 
      onClose={sending ? undefined : onClose} 
      fullWidth 
      maxWidth="lg"
      PaperProps={{
        sx: { borderRadius: 3, boxShadow: 24 }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: '#f8fafc', 
        borderBottom: '1px solid #e2e8f0', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        py: 2
      }}>
        <Typography variant="h6" fontWeight="bold" color="primary.main">
          Ajuste / Conferência
        </Typography>
        <Typography variant="caption" sx={{ bgcolor: 'white', px: 1, py: 0.5, borderRadius: 1, border: '1px solid #ddd' }}>
          Prod: {codProd}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: '#fbfcfe', p: 3 }}>
        {descricao && (
          <Alert severity="info" variant="outlined" sx={{ mb: 3, bgcolor: 'white' }}>
            <Typography variant="subtitle2" fontWeight="bold">Motivo do erro:</Typography>
            {descricao}
          </Alert>
        )}

        {erro && <Alert severity="error" sx={{ mb: 3 }}>{erro}</Alert>}

        {loading ? (
           <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
        ) : produto ? (
          <Grid container spacing={3}>
            {/* Coluna da Esquerda: Imagem e Dados Básicos */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, textAlign: 'center', height: '100%', bgcolor: 'white' }}>
                <Box
                  component="img"
                  src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${produto.CODPROD}.dbimage`}
                  alt="Produto"
                  sx={{
                    width: '100%',
                    maxWidth: 240,
                    height: 240,
                    objectFit: 'contain',
                    mb: 2,
                    borderRadius: 2
                  }}
                />
                <Typography variant="h6" fontWeight="bold" gutterBottom>{produto.DESCRPROD}</Typography>
                <Chip label={`Cód: ${produto.CODPROD}`} size="small" sx={{ mb: 2 }} />
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" color="text.secondary" align="left" gutterBottom>
                  Códigos de Barras
                </Typography>

                {codigoBarrasLoading ? (
                   <CircularProgress size={20} />
                ) : (
                  <Box sx={{ bgcolor: '#f8f9fa', p: 1.5, borderRadius: 2, textAlign: 'left', mb: 2 }}>
                    {codigoBarrasList.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">Nenhum código cadastrado.</Typography>
                    ) : (
                      <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '0.85rem' }}>
                         {barrasToShow.map((b, i) => <li key={i}>{b}</li>)}
                         {!barrasExpanded && hasMoreBarras && (
                           <Typography variant="caption" color="primary" sx={{ cursor:'pointer' }} onClick={() => setBarrasExpanded(true)}>
                             +{codigoBarrasList.length - BARRAS_PREVIEW_QTD} ver mais...
                           </Typography>
                         )}
                         {barrasExpanded && (
                           <Typography variant="caption" color="primary" sx={{ cursor:'pointer' }} onClick={() => setBarrasExpanded(false)}>
                             Recolher
                           </Typography>
                         )}
                      </Box>
                    )}
                  </Box>
                )}
                
                <Button variant="outlined" fullWidth size="small" onClick={openAddBarras} startIcon={<CheckCircleIcon />}>
                  Novo Cód. Barras
                </Button>
              </Paper>
            </Grid>

            {/* Coluna da Direita: Locais e Estoque */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={3}>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, bgcolor: 'white' }}>
                   <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                     <InventoryIcon fontSize="small" color="primary" /> Localização
                   </Typography>
                   <Grid container spacing={2} alignItems="center">
                     <Grid size={{ xs: 12, sm: 4 }}>
                       <TextField
                         label="Localização 1"
                         value={localizacao}
                         onChange={(e) => setLocalizacao(e.target.value.slice(0, MAX_LOC))}
                         fullWidth size="small"
                         helperText={`${localizacao.length}/${MAX_LOC}`}
                       />
                     </Grid>
                     <Grid size={{ xs: 12, sm: 4 }}>
                       <TextField
                         label="Localização 2"
                         value={localizacao2}
                         onChange={(e) => setLocalizacao2(e.target.value.slice(0, MAX_LOC2))}
                         fullWidth size="small"
                         helperText={`${localizacao2.length}/${MAX_LOC2}`}
                       />
                     </Grid>
                     <Grid size={{ xs: 12, sm: 4 }} sx={{ textAlign: 'right' }}>
                       <Button variant="contained" onClick={handleSalvarLocalizacoes} disabled={isSaving}>
                         {isSaving ? 'Salvando...' : 'Salvar Locais'}
                       </Button>
                     </Grid>
                   </Grid>
                </Paper>

                <Paper elevation={0} sx={{ p: 0, border: '1px solid #eee', borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #eee' }}>
                    <Typography variant="subtitle2" fontWeight="bold">Estoque por Local</Typography>
                  </Box>
                  <TableContainer sx={{ maxHeight: 250 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                           <TableCell sx={{ fontWeight: 'bold' }}>Local</TableCell>
                           <TableCell sx={{ fontWeight: 'bold' }}>Empresa</TableCell>
                           <TableCell align="right" sx={{ fontWeight: 'bold' }}>Estoque</TableCell>
                           <TableCell align="right" sx={{ fontWeight: 'bold' }}>Res.</TableCell>
                           <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>Disp.</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                         {(!produto.estoque || produto.estoque.length === 0) ? (
                            <TableRow><TableCell colSpan={5} align="center">Sem estoque.</TableCell></TableRow>
                         ) : (
                           produto.estoque.map((it, i) => (
                             <TableRow key={i} hover>
                               <TableCell>{it.LocalFinanceiro_DESCRLOCAL ?? it.CODLOCAL}</TableCell>
                               <TableCell>{it.CODEMP ?? '-'}</TableCell>
                               <TableCell align="right">{numberFormatter.format(toNum(it.ESTOQUE))}</TableCell>
                               <TableCell align="right">{numberFormatter.format(toNum(it.RESERVADO))}</TableCell>
                               <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                                 {numberFormatter.format(toNum(it.DISPONIVEL))}
                               </TableCell>
                             </TableRow>
                           ))
                         )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {/* Totais Footer */}
                  <Box sx={{ p: 1.5, bgcolor: '#f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 3, borderTop: '1px solid #eee' }}>
                     <Typography variant="body2">Total: <b>{numberFormatter.format(totais.estoque)}</b></Typography>
                     <Typography variant="body2" color="success.main">Disp: <b>{numberFormatter.format(totais.disponivel)}</b></Typography>
                  </Box>
                </Paper>

                <Paper elevation={0} sx={{ p: 2, bgcolor: '#eef2ff', border: '1px solid #e0e7ff', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="primary.main" fontWeight="bold" gutterBottom>
                    Ações de Correção
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                    <TextField
                      label="Contagem Real Encontrada"
                      value={contagem}
                      onChange={(e) => setContagem(onlyNumber(e.target.value))}
                      placeholder="Ex: 10"
                      fullWidth
                      size="small"
                      sx={{ bgcolor: 'white' }}
                    />
                    <Button 
                      variant="contained" 
                      color="primary"
                      onClick={handleEnviarContagem}
                      disabled={sending || !contagem}
                      sx={{ px: 4, fontWeight: 'bold', whiteSpace: 'nowrap' }}
                    >
                      {sending ? 'Enviando...' : 'Enviar Contagem'}
                    </Button>
                  </Stack>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        ) : (
          <Box display="flex" justifyContent="center" p={3}><Typography color="text.secondary">Selecione um produto.</Typography></Box>
        )}
        
        {/* Sub-Modal Add Barras */}
        <Dialog open={addBarrasOpen} onClose={closeAddBarras} fullWidth maxWidth="xs">
          <DialogTitle>Novo Código de Barras</DialogTitle>
          <DialogContent>
             <Typography variant="body2" color="text.secondary" mb={2}>
               Produto: <b>{produto?.DESCRPROD}</b>
             </Typography>
             <TextField
               autoFocus
               label="Escaneie ou digite o código"
               fullWidth
               value={codBarras}
               onChange={(e) => setCodBarras(e.target.value)}
             />
             {addBarrasErr && <Typography color="error" variant="caption" mt={1}>{addBarrasErr}</Typography>}
          </DialogContent>
          <DialogActions>
             <Button onClick={closeAddBarras}>Cancelar</Button>
             <Button variant="contained" onClick={handleEnviarCodBarras} disabled={addBarrasLoading}>Salvar</Button>
          </DialogActions>
        </Dialog>

      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid #eee', px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ mr: 'auto' }}>
          Fechar
        </Button>

        {/* Botão Finalizar no próprio Modal */}
        <Button 
          onClick={handleFinalizarLocal}
          color="success" 
          variant="contained"
          disabled={finalizingLocal || loading}
          sx={{ fontWeight: 'bold', borderRadius: 2 }}
        >
          {finalizingLocal ? 'Finalizando...' : 'Finalizar Erro'}
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

  // Função Wrapper para chamar handleFinalizar apenas com o ID (necessário para o modal)
  const handleFinalizarFromModal = async (id: string) => {
      // Encontrar a row completa se necessário, mas o handleFinalizar original usa a row.
      // Vamos adaptar o handleFinalizar para aceitar apenas o ID ou criar uma nova função
      // Mas como handleFinalizar usa row.id, podemos criar um objeto mock {id}
      // Ou melhor, chamamos a API diretamente aqui ou adaptamos o handleFinalizar.
      // Vou adaptar chamando handleFinalizar com um objeto parcial que satisfaz o tipo minimamente ou refatorando handleFinalizar.
      
      // Maneira mais limpa: Reutilizar a lógica.
      const row = data.find(r => r.id === id);
      if (row) {
          await handleFinalizar(row);
      }
  };


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
      const hay = [x.id, String(x.codProd ?? ''), x.descricao ?? '', x.userCreate ?? '', x.userResolve ?? ''].join(' ').toLowerCase();
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

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: '#f4f6f8' }}>
      {/* Botão flutuante menu - Atualizado para Top Left e Branco */}
      <Box sx={{ position: 'fixed', top: 24, left: 24, zIndex: 9999 }}>
        <IconButton 
          onClick={() => setSidebarOpen(true)} 
          sx={{ 
            bgcolor: 'white', 
            color: 'primary.main', 
            boxShadow: 3,
            width: 48, height: 48,
            '&:hover': { bgcolor: '#f5f5f5' }
          }}
        >
          <MenuIcon />
        </IconButton>
      </Box>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          overflowY: 'auto',
          p: { xs: 2, md: 4 },
        }}
      >
        <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
          
          {/* Header Title */}
          <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" fontWeight="800" color="#1e293b" gutterBottom>
                Painel de Inconsistências
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Gerencie e resolva divergências de estoque em tempo real.
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              startIcon={<RefreshIcon />} 
              onClick={fetchErros}
              disabled={isLoading}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold', boxShadow: 2 }}
            >
              Atualizar Dados
            </Button>
          </Box>

          {/* Cards de Resumo */}
          <Grid container spacing={3} mb={4}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard label="Total de Registros" value={counts.total} color="#3b82f6" icon={<InventoryIcon />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard label="Pendentes" value={counts.pend} color="#f59e0b" icon={<ErrorOutlineIcon />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard label="Resolvidos" value={counts.res} color="#10b981" icon={<CheckCircleIcon />} />
            </Grid>
          </Grid>

          {/* Main Card com Tabela */}
          <Paper 
            elevation={0} 
            sx={{ 
              borderRadius: 3, 
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              boxShadow: '0px 4px 20px rgba(0,0,0,0.03)'
            }}
          >
            {/* Toolbar */}
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                placeholder="Buscar por código, produto ou usuário..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                size="small"
                sx={{ flexGrow: 1, maxWidth: 500 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
                  sx: { borderRadius: 2 }
                }}
              />
              
              <ToggleButtonGroup
                value={status}
                exclusive
                onChange={(_, v) => v && setStatus(v)}
                size="small"
                sx={{ 
                  '& .MuiToggleButton-root': { 
                    border: 'none', 
                    borderRadius: '8px !important', 
                    mx: 0.5,
                    px: 2,
                    fontWeight: 600,
                    '&.Mui-selected': { bgcolor: '#e0f2fe', color: '#0284c7' }
                  } 
                }}
              >
                <ToggleButton value="PENDENTES">Pendentes</ToggleButton>
                <ToggleButton value="RESOLVIDOS">Resolvidos</ToggleButton>
                <ToggleButton value="TODOS">Todos</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {error && (
              <Alert severity="error" sx={{ m: 2, borderRadius: 2 }}>{error}</Alert>
            )}

            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table sx={{ minWidth: 800 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Produto</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Descrição do Problema</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Data Criação</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Usuário</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#475569' }} align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                          <InventoryIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                          <Typography>Nenhum registro encontrado para o filtro atual.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((row) => (
                        <TableRow 
                          key={row.id} 
                          hover 
                          sx={{ 
                            '&:last-child td, &:last-child th': { border: 0 },
                            transition: 'all 0.2s',
                            opacity: row.resolvido ? 0.6 : 1,
                          }}
                        >
                          <TableCell>
                            <Chip 
                              label={row.resolvido ? "Resolvido" : "Pendente"} 
                              size="small"
                              sx={{ 
                                fontWeight: 700, 
                                borderRadius: 1.5,
                                bgcolor: row.resolvido ? '#dcfce7' : '#fef3c7',
                                color: row.resolvido ? '#166534' : '#b45309'
                              }} 
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">{safeStr(row.codProd)}</Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 300 }}>
                            <Typography variant="body2" noWrap title={row.descricao}>{safeStr(row.descricao)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">{formatDateTimeBR(row.createdAt)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold' }}>
                                {safeStr(row.userCreate).charAt(0)}
                              </Box>
                              <Typography variant="body2">{safeStr(row.userCreate)}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="center">
                            {!row.resolvido ? (
                              <Stack direction="row" spacing={1} justifyContent="center">
                                <Button 
                                  size="small" 
                                  variant="contained" 
                                  sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#3b82f6' }}
                                  onClick={() => openAjusteFor(row)}
                                >
                                  Verificar
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  sx={{ borderRadius: 2, textTransform: 'none' }}
                                  onClick={() => handleFinalizar(row)}
                                  disabled={finalizandoId === row.id}
                                >
                                  {finalizandoId === row.id ? '...' : 'Finalizar'}
                                </Button>
                              </Stack>
                            ) : (
                              <Typography variant="caption" color="success.main" fontWeight="bold">Concluído</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {/* Footer da Tabela (Paginação poderia vir aqui) */}
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#f8fafc' }}>
              <Typography variant="caption" color="text.secondary">
                Mostrando {filtered.length} de {data.length} registros
              </Typography>
            </Box>
          </Paper>

        </Box>

        <AjusteDialog
          open={openAjuste}
          onClose={closeAjuste}
          codProd={selected?.codProd ?? null}
          erroId={selected?.id}
          descricao={selected?.descricao}
          apiBase={API_BASE}
          apiTokenEnv={API_TOKEN}
          onSuccess={async () => {
            setSnack({ open: true, msg: 'Contagem enviada. O erro ainda está pendente.', type: 'success' });
            await fetchErros();
          }}
          onFinalizarErro={handleFinalizarFromModal}
        />

        <Snackbar
          open={snack.open}
          autoHideDuration={3500}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snack.type} onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ borderRadius: 2, fontWeight: 500 }}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}