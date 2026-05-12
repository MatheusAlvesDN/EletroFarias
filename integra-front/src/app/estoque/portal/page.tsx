'use client';

import React, { useMemo, useState } from 'react';
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

  const hoje = useMemo(() => new Date().toLocaleDateString('pt-BR'), []);

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
                    <Button fullWidth variant="contained" color="inherit">Aplicar</Button>
                  </Stack>
                  <Button variant="outlined" startIcon={<FilterListIcon />} sx={{ justifyContent: 'flex-start' }}>Filtro personalizado</Button>
                  <Divider />
                  <Typography fontWeight={700}>Filtros rápidos</Typography>
                  <TextField label="Data da negociação" size="small" fullWidth />
                  <TextField label="Data do movimento" size="small" fullWidth value={hoje} />
                  <TextField label="Período de Cancelamento" size="small" fullWidth />
                  <TextField label="Número do documento" size="small" fullWidth />
                  <TextField label="Empresa" size="small" fullWidth />
                  <TextField label="Parceiro" size="small" fullWidth />
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
                  <Table size="small">
                    <TableHead><TableRow><TableCell>Confirmada</TableCell><TableCell>Cód. Usuário</TableCell><TableCell>Desconto</TableCell><TableCell>Nome (Usuário Inclusão)</TableCell><TableCell>Liberação</TableCell><TableCell>Nro. Nota</TableCell></TableRow></TableHead>
                    <TableBody>{resultado.map((row, idx) => (<TableRow key={idx}><TableCell>{row.confirmada}</TableCell><TableCell>{row.codUsuario}</TableCell><TableCell>{row.desconto}</TableCell><TableCell>{row.nomeUsuario}</TableCell><TableCell>{row.liberacao}</TableCell><TableCell>{row.nota}</TableCell></TableRow>))}</TableBody>
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
