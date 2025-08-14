'use client';

import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import SidebarMenu from '@/components/SidebarMenu';
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

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f0f4f8' }}>
      {/* Sidebar */}
      <SidebarMenu />

      {/* Conteúdo */}
      <Box
        sx={{
          flexGrow: 1,
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography variant="h4" gutterBottom>
          Lista de Status
        </Typography>

        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchData}
          sx={{ mb: 2 }}
          disabled={loading}
        >
          Atualizar Dados
        </Button>

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
                  <TableCell><b>Saldo Total</b></TableCell>
                  <TableCell><b>Saldo Estornado</b></TableCell>
                  <TableCell><b>Error</b></TableCell>
                  <TableCell><b>Data Neg.</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.numUnico}>
                    <TableCell>{row.numUnico}</TableCell>
                    <TableCell>{row.nome}</TableCell>
                    <TableCell>{row.cpfCnpj}</TableCell>
                    <TableCell>{row.saldoTotal.toFixed(2)}</TableCell>
                    <TableCell>{row.saldoEstornado.toFixed(2)}</TableCell>
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
