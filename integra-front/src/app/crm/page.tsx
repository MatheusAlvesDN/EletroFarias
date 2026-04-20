"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  Chip,
  Paper,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { crmService } from "@/lib/crmService";
import OrderModal from "@/components/crm/OrderModal";
import CustomerModal from "@/components/crm/CustomerModal";

const COLUMNS = [
  { id: "PROSPECCAO", label: "Prospecção", color: "#e3f2fd" },
  { id: "ORCAMENTO", label: "Orçamento", color: "#f3e5f5" },
  { id: "NEGOCIACAO", label: "Negociação", color: "#fff3e0" },
  { id: "APROVADO", label: "Aprovado", color: "#e8f5e9" },
  { id: "REPROVADO", label: "Reprovado", color: "#ffebee" },
  { id: "FATURADO", label: "Faturado", color: "#f1f8e9" },
];

export default function KanbanPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await crmService.listFunnel();
      setPedidos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(pedidoId: string, newStatus: string) {
    try {
      await crmService.updateOrderStatus(pedidoId, newStatus);
      loadData();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <DashboardLayout 
      title="Funil de Vendas CRM" 
      subtitle="Acompanhe suas oportunidades do primeiro contato até o faturamento"
    >
      <Box p={4} display="flex" flexDirection="column" gap={4} sx={{ height: "calc(100vh - 120px)" }}>
        
        {/* HEADER ACTIONS */}
        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button 
            variant="outlined" 
            onClick={() => setCustomerModalOpen(true)}
            sx={{ borderRadius: "xl" }}
          >
            Novo Cliente / Lead
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setOrderModalOpen(true)}
            sx={{ borderRadius: "xl", px: 4 }}
          >
            Nova Negociação
          </Button>
        </Box>

        {/* KANBAN BOARD */}
        <Box 
          display="flex" 
          gap={3} 
          sx={{ 
            overflowX: "auto", 
            pb: 2, 
            flexGrow: 1,
            '&::-webkit-scrollbar': { height: 8 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 10 }
          }}
        >
          {COLUMNS.map((col) => (
            <Box 
              key={col.id} 
              sx={{ 
                minWidth: 320, 
                width: 320, 
                bgcolor: "grey.100", 
                borderRadius: "xl", 
                border: "1px solid",
                borderColor: "grey.200",
                display: "flex", 
                flexDirection: "column",
                p: 1.5
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} px={1}>
                <Typography variant="subtitle2" fontWeight="800" sx={{ color: "grey.700" }}>
                  {col.label.toUpperCase()}
                  <Chip 
                    label={pedidos.filter(p => p.status === col.id).length} 
                    size="small" 
                    sx={{ ml: 1, height: 20, bgcolor: "grey.300", fontWeight: "bold" }} 
                  />
                </Typography>
              </Box>

              <Box 
                display="flex" 
                flexDirection="column" 
                gap={1.5} 
                sx={{ 
                  flexGrow: 1, 
                  overflowY: "auto",
                  '&::-webkit-scrollbar': { width: 0 }
                }}
              >
                {pedidos.filter((p) => p.status === col.id).map((p) => (
                  <Card 
                    key={p.id} 
                    elevation={0} 
                    sx={{ 
                      borderRadius: "lg", 
                      border: "1px solid", 
                      borderColor: "grey.200",
                      transition: "all 0.2s",
                      "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderColor: "primary.light" }
                    }}
                  >
                    <CardContent sx={{ p: "16px !important" }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="body2" fontWeight="bold" sx={{ color: "slate.800" }}>
                          {p.cliente?.nome || "Cliente Desconhecido"}
                        </Typography>
                        <IconButton size="small"><MoreVertIcon fontSize="inherit" /></IconButton>
                      </Box>

                      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                        {p.updatedAt ? `Atualizado ${new Date(p.updatedAt).toLocaleDateString()}` : ""}
                      </Typography>

                      <Divider sx={{ mb: 2, borderStyle: "dashed" }} />

                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight="800" color="primary">
                          {Number(p.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </Typography>
                        <Chip 
                          label={`#${p.numero}`} 
                          size="small" 
                          sx={{ height: 20, fontSize: 10, bgcolor: "slate.100" }} 
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <OrderModal open={orderModalOpen} onClose={(refresh) => {
        setOrderModalOpen(false);
        if (refresh) loadData();
      }} />

      <CustomerModal open={customerModalOpen} onClose={(refresh) => {
        setCustomerModalOpen(false);
        if (refresh) loadData();
      }} />
    </DashboardLayout>
  );
}
