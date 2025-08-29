'use client';

import React, { useEffect, useState } from 'react';
import SidebarMenu, { DRAWER_WIDTH } from '@/components/SidebarMenu';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Button, AppBar, Toolbar, IconButton, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Record {
  numUnico: string;
  nome: string;
  cpfCnpj: string;
  saldoTotal: number;
  saldoEstornado: number;
  error: string;
  dataNeg: string | null; // agora pode ser ISO/null
}

export default function ServiceStatusPage() {
  const [data, setData] = useState<Record[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/users', {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
      });
      if (!resp.ok) throw new Error(await resp.text());
      const rows = (await resp.json()) as Record[];

      // (opcional) ordene novamente no client, se precisar
      rows.sort((a, b) => {
        const da = a.dataNeg ? new Date(a.dataNeg).getTime() : 0;
        const db = b.dataNeg ? new Date(b.dataNeg).getTime() : 0;
        return db - da;
      });

      setData(rows);
    } catch (error) {
      console.error('Erro ao carregar dados', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const dateBR = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR'); //  dd/mm/aaaa
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: '#f0f4f8' }}>
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={() => setSidebarOpen((v) => !v)} aria-label="menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="h6">Lista de Status</Typography>
        </Toolbar>
      </AppBar>

      <Toolbar />
      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 4,
          height: 'calc(100vh - 64px)',
          overflowY: 'auto',
          ml: { md: sidebarOpen && !isMobile ? `${DRAWER_WIDTH}px` : 0 },
          transition: (t) =>
            t.transitions.create('margin', {
              easing: t.transitions.easing.sharp,
              duration: t.transitions.duration.leavingScreen,
            }),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignSelf: 'stretch', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ flexGrow: 1 }}>
            Status de Processamento
          </Typography>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchData} disabled={loading}>
            Atualizar Dados
          </Button>
        </Box>

        {loading ? (
          <CircularProgress />
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: '70vh', width: '100%', overflow: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell><b>Num. Único</b></TableCell>
                  <TableCell><b>Nome</b></TableCell>
                  <TableCell><b>CPF/CNPJ</b></TableCell>
                  <TableCell align="right"><b>Saldo Total</b></TableCell>
                  <TableCell align="right"><b>Saldo Estornado</b></TableCell>
                  <TableCell><b>Erro</b></TableCell>
                  <TableCell><b>Data Neg.</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.numUnico} hover>
                    <TableCell>{row.numUnico}</TableCell>
                    <TableCell>{row.nome}</TableCell>
                    <TableCell>{row.cpfCnpj}</TableCell>
                    <TableCell align="right">{currency(row.saldoTotal)}</TableCell>
                    <TableCell align="right">{currency(row.saldoEstornado)}</TableCell>
                    <TableCell>{row.error || 'Nenhum'}</TableCell>
                    <TableCell>{dateBR(row.dataNeg)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}
