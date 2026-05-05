"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar
} from "@mui/material";
import { crmService } from "@/lib/crmService";
import AssessmentIcon from "@mui/icons-material/Assessment";
import GroupIcon from "@mui/icons-material/Group";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BusinessIcon from "@mui/icons-material/Business";

export default function CrmDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const data = await crmService.getConversionMetrics();
      setStats(data);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Dashboard CRM">
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  const overallRate = stats.total > 0 ? (stats.convertidos / stats.total) * 100 : 0;

  return (
    <DashboardLayout title="Dashboard CRM" subtitle="Métricas de Conversão e Performance">
      <Box p={4}>
        <Grid container spacing={3} mb={4}>
          {/* Cards Principais */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard 
              title="Total de Leads" 
              value={stats.total} 
              icon={<GroupIcon color="primary" />} 
              color="#2196f3" 
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard 
              title="Convertidos" 
              value={stats.convertidos} 
              icon={<TrendingUpIcon color="success" />} 
              color="#4caf50" 
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard 
              title="Taxa de Conversão" 
              value={`${overallRate.toFixed(1)}%`} 
              icon={<AssessmentIcon color="secondary" />} 
              color="#9c27b0" 
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard 
              title="Empresas Ativas" 
              value={Object.keys(stats.porTag).length} 
              icon={<BusinessIcon color="warning" />} 
              color="#ff9800" 
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Tabela por Vendedor */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper sx={{ borderRadius: "16px", p: 0, overflow: "hidden" }} elevation={0} variant="outlined">
              <Box p={3} bgcolor="grey.50" borderBottom="1px solid" borderColor="grey.200">
                <Typography variant="h6" fontWeight="700">Conversão por Vendedor</Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "grey.50" }}>
                      <TableCell sx={{ fontWeight: 700 }}>Vendedor</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Leads</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Vendas</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Progresso</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>%</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(stats.porVendedor).map(([email, data]: [string, any]) => {
                      const rate = (data.convertidos / data.total) * 100;
                      return (
                        <TableRow key={email} hover>
                          <TableCell>{email.split('@')[0]}</TableCell>
                          <TableCell align="center">{data.total}</TableCell>
                          <TableCell align="center">{data.convertidos}</TableCell>
                          <TableCell sx={{ width: "30%" }}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <LinearProgress 
                                variant="determinate" 
                                value={rate} 
                                sx={{ flexGrow: 1, height: 8, borderRadius: 4, bgcolor: "grey.100" }} 
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>{rate.toFixed(1)}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Tabela por Unidade (Tag) */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper sx={{ borderRadius: "16px", p: 0, overflow: "hidden" }} elevation={0} variant="outlined">
              <Box p={3} bgcolor="grey.50" borderBottom="1px solid" borderColor="grey.200">
                <Typography variant="h6" fontWeight="700">Performance por Unidade</Typography>
              </Box>
              <Box p={3}>
                {Object.entries(stats.porTag).map(([tag, data]: [string, any]) => {
                  const rate = (data.convertidos / data.total) * 100;
                  return (
                    <Box key={tag} mb={3}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={1}>
                        <Typography variant="subtitle1" fontWeight="700">{tag}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {data.convertidos} de {data.total} ({rate.toFixed(1)}%)
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={rate} 
                        sx={{ 
                          height: 12, 
                          borderRadius: 6, 
                          bgcolor: "grey.100",
                          '& .MuiLinearProgress-bar': {
                            bgcolor: tag === 'LID' ? '#2196f3' : tag === 'DFARIAS' ? '#4caf50' : '#ff9800'
                          }
                        }} 
                      />
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <Card sx={{ borderRadius: "16px", borderLeft: `6px solid ${color}` }} elevation={0} variant="outlined">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="600" textTransform="uppercase">
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="800" mt={1}>
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}15`, color: color }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}
