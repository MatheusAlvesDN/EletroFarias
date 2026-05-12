'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  IconButton,
  Divider,
  Stack,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import SettingsIcon from '@mui/icons-material/Settings';
import BoltIcon from '@mui/icons-material/Bolt';
import SidebarMenu from '@/components/SidebarMenu';

const resultado = [
  { confirmada: 'Sim', codUsuario: '0', desconto: '4,31', nomeUsuario: 'SUP', liberacao: 'Aprovado', nota: '57286' },
];

const itens = [
  { data: '24/03/2026', local: '1100', cfop: '1949', origem: '0-Nacional', tributacao: '00-Tributada integralmente', icms: '20,00' },
  { data: '30/03/2026', local: '1100', cfop: '1949', origem: '0-Nacional', tributacao: '60-ICMS cobrado anteriormente por substituição', icms: '0,00' },
  { data: '10/04/2026', local: '1949', cfop: '1949', origem: '5-Nacional', tributacao: '00-Tributada integralmente', icms: '20,00' },
];

export default function PortalPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hideUpdate, setHideUpdate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ dataInicio: '', dataFim: '', nota: '', empresa: '', parceiro: '', confirmada: 'Todos' });
  const [notas, setNotas] = useState(resultado);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const hoje = useMemo(() => new Date().toLocaleDateString('pt-BR'), []);

  const buscarNotas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.set('dataFim', filtros.dataFim);
      if (filtros.nota) params.set('nota', filtros.nota);
      if (filtros.empresa) params.set('empresa', filtros.empresa);
      if (filtros.parceiro) params.set('parceiro', filtros.parceiro);
      if (filtros.confirmada !== 'Todos') params.set('confirmada', filtros.confirmada);

      const resp = await fetch(`${API_BASE}/database/portal-notas?${params.toString()}`, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`Falha ao buscar notas (status ${resp.status})`);
      const data = await resp.json();
      setNotas(Array.isArray(data) ? data.map((item: any) => ({
        confirmada: item.CONFIRMADA, codUsuario: item.CODUSUARIO, desconto: item.DESCONTO,
        nomeUsuario: item.NOMEUSUARIO, liberacao: item.LIBERACAO, nota: item.NOTA,
      })) : []);
    } catch (error) {
      console.error(error);
      setNotas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { buscarNotas(); }, []);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Box sx={{ p: 1 }}>
        <Paper variant="outlined" sx={{ p: 1 }}>
          <Grid container spacing={1}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper variant="outlined" sx={{ p: 1, height: '100%' }}>
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography fontWeight={700}>Tipo de Movimento:</Typography>
                    <IconButton size="small" onClick={() => setSidebarOpen(true)}><MenuIcon fontSize="small" /></IconButton>
                  </Stack>
                  <TextField size="small" fullWidth defaultValue="Todos (exceto canceladas)" />
                  <FormControlLabel control={<Switch checked={hideUpdate} onChange={(_, c) => setHideUpdate(c)} />} label="Esconder ao atualizar" />
                  <Stack direction="row" spacing={1}>
                    <Button fullWidth variant="contained" startIcon={<AddIcon />}>Filtro</Button>
                    <Button fullWidth variant="contained" color="inherit" onClick={buscarNotas} disabled={loading}>Aplicar</Button>
                  </Stack>
                  <Button variant="outlined" startIcon={<FilterListIcon />} sx={{ justifyContent: 'flex-start' }}>Filtro personalizado</Button>
                  <Divider />
                  <Typography fontWeight={700}>Filtros rápidos</Typography>
                  <TextField label="Data da negociação" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }} value={filtros.dataInicio} onChange={(e) => setFiltros((v) => ({ ...v, dataInicio: e.target.value }))} />
                  <TextField label="Data do movimento" size="small" fullWidth value={hoje} />
                  <TextField label="Data fim" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }} value={filtros.dataFim} onChange={(e) => setFiltros((v) => ({ ...v, dataFim: e.target.value }))} />
                  <TextField label="Número do documento" size="small" fullWidth value={filtros.nota} onChange={(e) => setFiltros((v) => ({ ...v, nota: e.target.value }))} />
                  <TextField label="Empresa" size="small" fullWidth value={filtros.empresa} onChange={(e) => setFiltros((v) => ({ ...v, empresa: e.target.value }))} />
                  <TextField label="Parceiro" size="small" fullWidth value={filtros.parceiro} onChange={(e) => setFiltros((v) => ({ ...v, parceiro: e.target.value }))} />
                  <TextField select label="Confirmada" size="small" fullWidth value={filtros.confirmada} onChange={(e) => setFiltros((v) => ({ ...v, confirmada: e.target.value }))}>
                    <MenuItem value="Todos">Todos</MenuItem><MenuItem value="Sim">Sim</MenuItem><MenuItem value="Não">Não</MenuItem>
                  </TextField>
                </Stack>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 9 }}>
              <Paper variant="outlined" sx={{ p: 1, mb: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography fontWeight={700}>Resultado da seleção</Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton size="small"><SettingsIcon fontSize="small" /></IconButton>
                    <IconButton size="small"><BoltIcon fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={1} mb={1}>
                  <Button variant="outlined" size="small" startIcon={<AddIcon />}>Novo</Button>
                  <Button variant="outlined" size="small">NF-e</Button>
                  <Button variant="outlined" size="small">NFC-e</Button>
                  <Button variant="outlined" size="small">CF-e</Button>
                </Stack>
                <TableContainer component={Paper} variant="outlined">
                  {loading && <Typography sx={{ p: 1 }}>Carregando...</Typography>}
                  <Table size="small">
                    <TableHead><TableRow><TableCell>Confirmada</TableCell><TableCell>Cód. Usuário</TableCell><TableCell>Desconto</TableCell><TableCell>Nome (Usuário Inclusão)</TableCell><TableCell>Liberação</TableCell><TableCell>Nro. Nota</TableCell></TableRow></TableHead>
                    <TableBody>{notas.map((row, idx) => (<TableRow key={idx}><TableCell>{row.confirmada}</TableCell><TableCell>{row.codUsuario}</TableCell><TableCell>{row.desconto}</TableCell><TableCell>{row.nomeUsuario}</TableCell><TableCell>{row.liberacao}</TableCell><TableCell>{row.nota}</TableCell></TableRow>))}</TableBody>
                  </Table>
                </TableContainer>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1 }}>
                <Typography fontWeight={700} mb={1}>Itens</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead><TableRow><TableCell>Data de alteração de custo</TableCell><TableCell>Local origem</TableCell><TableCell>CFOP</TableCell><TableCell>Origem do Produto</TableCell><TableCell>Tributação</TableCell><TableCell>Alíq. ICMS</TableCell></TableRow></TableHead>
                    <TableBody>{itens.map((row, idx) => (<TableRow key={idx}><TableCell>{row.data}</TableCell><TableCell>{row.local}</TableCell><TableCell>{row.cfop}</TableCell><TableCell>{row.origem}</TableCell><TableCell>{row.tributacao}</TableCell><TableCell>{row.icms}</TableCell></TableRow>))}</TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Box>
      <Button onClick={() => router.back()} variant="contained" color="inherit" sx={{ position: 'fixed', right: 16, bottom: 16 }}>Voltar</Button>
    </Box>
  );
}
