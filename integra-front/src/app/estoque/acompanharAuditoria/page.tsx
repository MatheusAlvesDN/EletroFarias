'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Stack,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  Person as PersonIcon,
  Event as EventIcon,
  History as HistoryIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
} from '@mui/icons-material';

import SidebarMenu from '@/components/SidebarMenu';

// --- TIPOS ---
type ErroEstoque = {
  id: string;
  codProd: number;
  descricao: string;
  createdAt: string;
  userCreate: string;
  resolvido: boolean;
  resposta?: string | null;
  userResolve?: string | null;
  resolvedAt?: string | null;
};

type Auditoria = {
  id: string;
  codProd: number;
  descricao: string;
  createdAt: string;
  count: number;
  inStock: number;
  userEmail: string;
  reservado: number;
  diferenca: number;
};

// --- UTILITÁRIOS ---
function formatDateTimeBR(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Verifica se duas datas ISO são do mesmo dia (ignora horário)
function isSameDate(isoA?: string | null, isoB?: string | null) {
  if (!isoA || !isoB) return false;
  const dA = new Date(isoA);
  const dB = new Date(isoB);
  if (Number.isNaN(dA.getTime()) || Number.isNaN(dB.getTime())) return false;
  
  return dA.toLocaleDateString('pt-BR') === dB.toLocaleDateString('pt-BR');
}

// --- COMPONENTE: MODAL DE DETALHES ---
function ErroDetalhesDialog({
  open,
  onClose,
  erro,
  apiBase,
  getHeaders,
}: {
  open: boolean;
  onClose: () => void;
  erro: ErroEstoque | null;
  apiBase: string;
  getHeaders: () => Record<string, string>;
}) {
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);

  useEffect(() => {
    if (open && erro) {
      const fetchRelatedAudits = async () => {
        // Se o erro não foi resolvido ou não tem data de resolução, 
        // pela regra de negócio (userEmail == userResolve), não haverá auditorias correspondentes.
        if (!erro.resolvido || !erro.userResolve || !erro.resolvedAt) {
            setAuditorias([]);
            return;
        }

        setLoadingAudits(true);
        try {
          const url = `${apiBase}/sync/getAllAuditorias`; 
          const res = await fetch(url, { method: 'GET', headers: getHeaders() });
          if (res.ok) {
            const allAudits: Auditoria[] = await res.json();
            
            // --- FILTRAGEM ATUALIZADA ---
            // 1. Mesmo Código de Produto
            // 2. Email do Auditor == Email de quem resolveu o erro
            // 3. Data da Auditoria == Data da Resolução do erro
            const filtered = allAudits
                .filter(a => 
                    a.codProd === erro.codProd &&
                    a.userEmail === erro.userResolve && 
                    isSameDate(a.createdAt, erro.resolvedAt)
                )
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            setAuditorias(filtered);
          }
        } catch (e) {
          console.error("Erro ao buscar auditorias relacionadas", e);
        } finally {
          setLoadingAudits(false);
        }
      };
      fetchRelatedAudits();
    } else {
      setAuditorias([]);
    }
  }, [open, erro, apiBase, getHeaders]);

  if (!erro) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #eee' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6" fontWeight="bold">Detalhes da Inconsistência</Typography>
          <Chip 
            label={erro.resolvido ? "Resolvido" : "Pendente"} 
            color={erro.resolvido ? "success" : "warning"} 
            size="small" 
            variant="filled"
            icon={erro.resolvido ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">ID: {erro.id}</Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: '#fbfcfe' }}>
        <Grid container spacing={3}>
          
          {/* Coluna Esquerda: Produto e Info do Erro */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', height: '100%', borderRadius: 2 }}>
              <Box 
                component="img" 
                src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${erro.codProd}.dbimage`} 
                sx={{ width: '100%', maxWidth: 200, height: 200, objectFit: 'contain', mb: 2, borderRadius: 1 }} 
              />
              <Typography variant="h6" fontWeight="bold">{erro.codProd}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>Código do Produto</Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Box textAlign="left">
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="primary">Reportado por:</Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <PersonIcon color="action" fontSize="small" />
                  <Typography variant="body2">{erro.userCreate}</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <EventIcon color="action" fontSize="small" />
                  <Typography variant="body2">{formatDateTimeBR(erro.createdAt)}</Typography>
                </Box>
                
                <Alert severity="warning" variant="outlined" sx={{ mt: 2 }}>
                  <Typography variant="caption" fontWeight="bold">Descrição do Problema:</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>{erro.descricao}</Typography>
                </Alert>
              </Box>
            </Paper>
          </Grid>

          {/* Coluna Direita: Resolução e Histórico */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              {/* Seção de Resolução (Se houver) */}
              {erro.resolvido && (
                <Card variant="outlined" sx={{ bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight="bold" color="success.dark" display="flex" alignItems="center" gap={1} gutterBottom>
                      <AssignmentTurnedInIcon /> Informações da Solução
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary">Resolvido por</Typography>
                        <Typography variant="body2" fontWeight="500">{erro.userResolve || '-'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary">Data da Solução</Typography>
                        <Typography variant="body2" fontWeight="500">{formatDateTimeBR(erro.resolvedAt)}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="caption" color="text.secondary">Nota de Resolução</Typography>
                        <Typography variant="body1" sx={{ mt: 0.5 }}>{erro.resposta || <i>Sem observações.</i>}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {/* Seção de Auditorias Relacionadas */}
              <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" fontWeight="bold" display="flex" alignItems="center" gap={1}>
                    <HistoryIcon color="primary" /> Auditoria de Resolução
                  </Typography>
                  <Chip label={`${auditorias.length} registros`} size="small" />
                </Box>
                
                {loadingAudits ? (
                  <Box p={4} display="flex" justifyContent="center"><CircularProgress size={24} /></Box>
                ) : !erro.resolvido ? (
                   <Box p={4} textAlign="center" color="text.secondary">
                    <Typography variant="body2">O erro ainda não foi resolvido, portanto não há auditoria de resolução vinculada.</Typography>
                  </Box>
                ) : auditorias.length === 0 ? (
                  <Box p={4} textAlign="center" color="text.secondary">
                    <Typography variant="body2">Nenhuma auditoria encontrada para o usuário <b>{erro.userResolve}</b> na data <b>{new Date(erro.resolvedAt!).toLocaleDateString('pt-BR')}</b>.</Typography>
                  </Box>
                ) : (
                  <TableContainer sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Data</TableCell>
                          <TableCell>Auditor</TableCell>
                          <TableCell align="right">Contagem</TableCell>
                          <TableCell align="right">Sistema</TableCell>
                          <TableCell align="right">Diferença</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {auditorias.map((audit) => (
                          <TableRow key={audit.id} hover>
                            <TableCell>{formatDateTimeBR(audit.createdAt)}</TableCell>
                            <TableCell>{audit.userEmail}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{audit.count}</TableCell>
                            <TableCell align="right">{audit.inStock}</TableCell>
                            <TableCell align="right">
                                <Chip 
                                  label={audit.diferenca > 0 ? `+${audit.diferenca}` : audit.diferenca} 
                                  size="small"
                                  color={audit.diferenca !== 0 ? 'error' : 'success'}
                                  variant="outlined"
                                  sx={{ minWidth: 50, fontWeight: 'bold' }}
                                />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
        <Button onClick={onClose} variant="contained" color="primary">Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

// --- PÁGINA PRINCIPAL ---
export default function ErroEstoqueTrackingPage() {
  const [data, setData] = useState<ErroEstoque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de UI
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDENTES' | 'RESOLVIDOS'>('TODOS');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Estados do Modal
  const [selectedErro, setSelectedErro] = useState<ErroEstoque | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Token e API
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    setToken(t);
  }, []);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const fetchErros = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/sync/getAllErroEstoque`, { method: 'GET', headers: getHeaders() });
      if (!res.ok) throw new Error('Falha ao carregar erros.');
      const json = await res.json();
      const sorted = (json || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setData(sorted);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE, getHeaders]);

  useEffect(() => {
    fetchErros();
  }, [fetchErros]);

  const handleOpenDetails = (item: ErroEstoque) => {
    setSelectedErro(item);
    setDetailsOpen(true);
  };

  const filteredData = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter(item => {
      const matchesSearch = 
        String(item.codProd).includes(s) || 
        item.descricao.toLowerCase().includes(s) || 
        item.userCreate.toLowerCase().includes(s);
      
      const matchesStatus = 
        statusFilter === 'TODOS' ? true :
        statusFilter === 'RESOLVIDOS' ? item.resolvido :
        !item.resolvido;

      return matchesSearch && matchesStatus;
    });
  }, [data, search, statusFilter]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: '#f4f6f8' }}>
      <Box sx={{ position: 'fixed', top: 16, left: 16, zIndex: 1200 }}>
        <IconButton onClick={() => setSidebarOpen(!sidebarOpen)} sx={{ bgcolor: 'white', boxShadow: 3 }}>
          <MenuIcon />
        </IconButton>
      </Box>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box component="main" sx={{ flexGrow: 1, height: '100vh', overflowY: 'auto', p: { xs: 2, md: 4 } }}>
        <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
          
          <Box mb={4} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4" fontWeight="800" color="#1e293b">Monitoramento de Inconsistências</Typography>
              <Typography variant="body2" color="text.secondary">Acompanhe os erros de estoque e suas resoluções</Typography>
            </Box>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchErros}>Atualizar Lista</Button>
          </Box>

          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                placeholder="Buscar por código, descrição ou usuário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              />
              <Stack direction="row" spacing={1}>
                {['TODOS', 'PENDENTES', 'RESOLVIDOS'].map((filter) => (
                  <Chip
                    key={filter}
                    label={filter}
                    clickable
                    color={statusFilter === filter ? 'primary' : 'default'}
                    onClick={() => setStatusFilter(filter as any)}
                    variant={statusFilter === filter ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell>Status</TableCell>
                    <TableCell>Cód. Produto</TableCell>
                    <TableCell>Descrição do Erro</TableCell>
                    <TableCell>Reportado Por</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} align="center"><CircularProgress sx={{ m: 2 }} /></TableCell></TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center">Nenhum registro encontrado.</TableCell></TableRow>
                  ) : (
                    filteredData.map((row) => (
                      <TableRow key={row.id} hover sx={{ opacity: row.resolvido ? 0.7 : 1 }}>
                        <TableCell>
                          <Chip
                            label={row.resolvido ? "Resolvido" : "Pendente"}
                            size="small"
                            color={row.resolvido ? "success" : "warning"}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell><b>{row.codProd}</b></TableCell>
                        <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <Tooltip title={row.descricao}><span>{row.descricao}</span></Tooltip>
                        </TableCell>
                        <TableCell>{row.userCreate}</TableCell>
                        <TableCell>{formatDateTimeBR(row.createdAt)}</TableCell>
                        <TableCell align="center">
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleOpenDetails(row)}
                          >
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

        <ErroDetalhesDialog 
          open={detailsOpen} 
          onClose={() => setDetailsOpen(false)} 
          erro={selectedErro}
          apiBase={API_BASE}
          getHeaders={getHeaders}
        />
      </Box>
    </Box>
  );
}