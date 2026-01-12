'use client';

import React, { useEffect, useState } from 'react';
import SidebarMenu, { DRAWER_WIDTH } from '@/components/SidebarMenu';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  useMediaQuery,
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
  dataNeg: string;
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
      // Simulação de API
      await new Promise((res) => setTimeout(res, 1000));
      setData([
        {
          numUnico: '123456',
          nome: 'João Silva',
          cpfCnpj: '123.456.789-00',
          saldoTotal: 1000.0,
          saldoEstornado: 200.0,
          error: 'Nenhum',
          dataNeg: '08/08/2025',
        },
        {
          numUnico: '654321',
          nome: 'Maria Souza',
          cpfCnpj: '12.345.678/0001-99',
          saldoTotal: 2500.5,
          saldoEstornado: 0.0,
          error: 'Saldo insuficiente',
          dataNeg: '07/08/2025',
        },
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: '#f0f4f8' }}>
      {/* AppBar com toggle */}
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={() => setSidebarOpen((v) => !v)} aria-label="menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="h6">Lista de Status</Typography>
        </Toolbar>
      </AppBar>

      {/* Espaçador do AppBar */}
      <Toolbar />

      {/* Sidebar controlado */}
      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main com scroll e margem quando o menu está aberto no desktop */}
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
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            disabled={loading}
          >
            Atualizar Dados
          </Button>
        </Box>

        {loading ? (
          <CircularProgress />
        ) : (
          <TableContainer
            component={Paper}
            sx={{ maxHeight: '70vh', width: '100%', overflow: 'auto' }}
          >
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
                    <TableCell>{row.error}</TableCell>
                    <TableCell>{row.dataNeg}</TableCell>
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
