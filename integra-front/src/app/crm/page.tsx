"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  ListItem,
  ListItemText,
  List,
  Avatar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloseIcon from "@mui/icons-material/Close";
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
  const router = useRouter();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await crmService.listFunnel();
      console.log("Dados recebidos do Funil:", data);
      setPedidos(data);
    } catch (error) {
      console.error("Erro ao carregar funil:", error);
    } finally {
      setLoading(false);
    }
  }

  // Eventos de Drag and Drop (Arrastar e Soltar)
  const handleDragStart = (e: React.DragEvent, pedidoId: string) => {
    e.dataTransfer.setData("pedidoId", pedidoId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessário para permitir o drop
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const pedidoId = e.dataTransfer.getData("pedidoId");

    if (!pedidoId) return;

    // Atualização Otimista (Muda na tela antes mesmo da API responder para UX instantânea)
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, status: newStatus } : p))
    );

    try {
      await crmService.updateOrderStatus(pedidoId, newStatus);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      loadData(); // Reverte caso a API dê erro
    }
  };

  const handleOpenViewModal = (pedido: any) => {
    router.push(`/crm/pedido/${pedido.id}`);
  };

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
            onClick={() => router.push("/crm/orcamento/novo")}
            sx={{ borderRadius: "xl", px: 4 }}
          >
            Novo Orçamento
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
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              sx={{
                minWidth: 320,
                width: 320,
                bgcolor: col.color,
                borderRadius: "xl",
                border: "1px solid",
                borderColor: "grey.200",
                display: "flex",
                flexDirection: "column",
                p: 1.5,
                transition: "background-color 0.2s"
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} px={1}>
                <Typography variant="subtitle2" fontWeight="800" sx={{ color: "grey.700" }}>
                  {col.label.toUpperCase()}
                  <Chip
                    label={pedidos.filter(p => String(p.status).toUpperCase() === String(col.id).toUpperCase()).length}
                    size="small"
                    sx={{ ml: 1, height: 20, bgcolor: "rgba(255,255,255,0.7)", fontWeight: "bold" }}
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
                  minHeight: "150px", // Espaço mínimo para facilitar o "Drop" em colunas vazias
                  '&::-webkit-scrollbar': { width: 0 }
                }}
              >
                {pedidos.filter((p) => String(p.status).toUpperCase() === String(col.id).toUpperCase()).map((p) => (
                  <Card
                    key={p.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, p.id)}
                    onClick={() => handleOpenViewModal(p)}
                    elevation={0}
                    sx={{
                      borderRadius: "lg",
                      border: "1px solid",
                      borderColor: "grey.200",
                      cursor: "grab",
                      transition: "all 0.2s",
                      "&:active": { cursor: "grabbing" },
                      "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderColor: "primary.light" }
                    }}
                  >
                    <CardContent sx={{ p: "16px !important" }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="body2" fontWeight="bold" sx={{ color: "slate.800" }}>
                          {p.cliente?.nome || "Cliente Desconhecido"}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation(); // Evita abrir o modal se clicar no botão de menu
                            // Lógica futura do menu...
                          }}
                        >
                          <MoreVertIcon fontSize="inherit" />
                        </IconButton>
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

      <CustomerModal open={customerModalOpen} onClose={(refresh) => {
        setCustomerModalOpen(false);
        if (refresh) loadData();
      }} />
    </DashboardLayout>
  );
}