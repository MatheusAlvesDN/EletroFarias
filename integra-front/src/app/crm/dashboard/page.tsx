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
import WarningIcon from "@mui/icons-material/Warning";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend
} from 'recharts';

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

  const chartData = Object.entries(stats.vendasMensais || {}).map(([mes, valor]) => ({
    name: mes,
    vendas: valor
  }));

  const pieData = Object.entries(stats.topProdutos || {})
    .sort((a: any, b: any) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([name, data]: [string, any]) => ({
      name: name.split(' - ')[1].substring(0, 20),
      value: data.total
    }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <DashboardLayout title="Dashboard CRM" subtitle="Métricas de Conversão e Performance">
      <Box p={4}>
        {/* Alertas Rápidos */}
        {(stats.alertas?.amarelos > 0 || stats.alertas?.vermelhos > 0) && (
          <Paper sx={{ p: 2, mb: 4, borderRadius: 3, bgcolor: '#fff5f5', border: '1px solid #feb2b2' }}>
            <Box display="flex" alignItems="center" gap={2}>
              <WarningIcon color="error" />
              <Typography variant="body1" fontWeight="bold">
                Atenção: {stats.alertas.vermelhos} leads parados há +5 dias e {stats.alertas.amarelos} há +3 dias.
              </Typography>
            </Box>
          </Paper>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
          <StatCard 
            title="Total de Leads" 
            value={stats.total} 
            icon={<GroupIcon color="primary" />} 
            color="#2196f3" 
          />
          <StatCard 
            title="Convertidos" 
            value={stats.convertidos} 
            icon={<TrendingUpIcon color="success" />} 
            color="#4caf50" 
          />
          <StatCard 
            title="Taxa de Conversão" 
            value={`${overallRate.toFixed(1)}%`} 
            icon={<AssessmentIcon color="secondary" />} 
            color="#9c27b0" 
          />
          <StatCard 
            title="Faturamento (6m)" 
            value={Number(Object.values(stats.vendasMensais || {}).reduce((a: any, b: any) => a + b, 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} 
            icon={<BusinessIcon color="warning" />} 
            color="#ff9800" 
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3, mb: 4 }}>
          {/* Gráfico de Tendência */}
          <Paper sx={{ p: 3, borderRadius: 4 }} variant="outlined">
            <Typography variant="h6" fontWeight="bold" mb={3}>Tendência de Vendas (Faturamento)</Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2196f3" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2196f3" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(val) => `R$ ${val/1000}k`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <RechartsTooltip formatter={(val: any) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                  <Area type="monotone" dataKey="vendas" stroke="#2196f3" fillOpacity={1} fill="url(#colorVendas)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          {/* Gráfico de Produtos */}
          <Paper sx={{ p: 3, borderRadius: 4 }} variant="outlined">
            <Typography variant="h6" fontWeight="bold" mb={3}>Top 5 Produtos</Typography>
            <Box height={300} display="flex" justifyContent="center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val: any) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.5fr 1fr' }, gap: 3 }}>
          {/* Tabela por Vendedor */}
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

          {/* Tabela por Unidade (Tag) */}
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
        </Box>
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
