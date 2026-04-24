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
  Divider,
  Avatar,
  Tooltip,
} from "@mui/material";

// Ícones
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import HandshakeIcon from "@mui/icons-material/Handshake";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ThumbDownAltIcon from "@mui/icons-material/ThumbDownAlt";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";

import { crmService } from "@/lib/crmService";
// import OrderModal from "@/components/crm/OrderModal"; // Se for usar depois
import CustomerModal from "@/components/crm/CustomerModal";

// Definição aprimorada das colunas com ícones e cores temáticas
const COLUMNS = [
  { id: "PROSPECCAO", label: "Prospecção", color: "#2196f3", bg: "#e3f2fd", icon: PersonSearchIcon },
  { id: "ORCAMENTO", label: "Orçamento", color: "#9c27b0", bg: "#f3e5f5", icon: RequestQuoteIcon },
  { id: "NEGOCIACAO", label: "Negociação", color: "#ff9800", bg: "#fff3e0", icon: HandshakeIcon },
  { id: "APROVADO", label: "Aprovado", color: "#4caf50", bg: "#e8f5e9", icon: ThumbUpAltIcon },
  { id: "REPROVADO", label: "Reprovado", color: "#f44336", bg: "#ffebee", icon: ThumbDownAltIcon },
  { id: "FATURADO", label: "Faturado", color: "#009688", bg: "#e0f2f1", icon: MonetizationOnIcon },
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
      setPedidos(data);
    } catch (error) {
      console.error("Erro ao carregar funil:", error);
    } finally {
      setLoading(false);
    }
  }

  // Eventos de Drag and Drop
  const handleDragStart = (e: React.DragEvent<HTMLElement>, pedidoId: string) => {
    e.dataTransfer.setData("pedidoId", pedidoId);
    e.currentTarget.style.opacity = "0.5"; // Efeito visual ao arrastar
  };

  const handleDragEnd = (e: React.DragEvent<HTMLElement>) => {
    e.currentTarget.style.opacity = "1"; // Retorna a opacidade normal
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const pedidoId = e.dataTransfer.getData("pedidoId");

    if (!pedidoId) return;

    // Atualização Otimista
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

  // Função auxiliar para pegar a inicial do cliente
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  return (
    <DashboardLayout
      title="Funil de Vendas"
      subtitle="Acompanhe suas oportunidades do primeiro contato até o faturamento"
    >
      <Box p={4} display="flex" flexDirection="column" gap={4} sx={{ height: "calc(100vh - 80px)" }}>

        {/* HEADER ACTIONS */}
        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button
            variant="outlined"
            onClick={() => setCustomerModalOpen(true)}
            sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 600 }}
          >
            Novo Cliente / Lead
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push("/crm/orcamento/novo")}
            disableElevation
            sx={{ borderRadius: "8px", px: 4, textTransform: "none", fontWeight: 600 }}
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
            "&::-webkit-scrollbar": { height: 8 },
            "&::-webkit-scrollbar-thumb": { bgcolor: "grey.300", borderRadius: 10 },
            "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          }}
        >
          {COLUMNS.map((col) => {
            const ColumnIcon = col.icon;
            const columnOrders = pedidos.filter(
              (p) => String(p.status).toUpperCase() === String(col.id).toUpperCase()
            );

            return (
              <Box
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                sx={{
                  minWidth: 320,
                  width: 320,
                  bgcolor: "grey.50", // Fundo neutro
                  borderRadius: "12px",
                  border: "1px solid",
                  borderColor: "grey.200",
                  borderTop: `4px solid ${col.color}`, // Linha de cor no topo
                  display: "flex",
                  flexDirection: "column",
                  p: 2,
                  transition: "background-color 0.2s",
                }}
              >
                {/* COLUMN HEADER */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ bgcolor: col.bg, color: col.color, width: 32, height: 32 }}>
                      <ColumnIcon fontSize="small" />
                    </Avatar>
                    <Typography variant="subtitle2" fontWeight="700" color="text.primary">
                      {col.label}
                    </Typography>
                  </Box>
                  <Chip
                    label={columnOrders.length}
                    size="small"
                    sx={{
                      height: 24,
                      minWidth: 32,
                      fontWeight: 700,
                      bgcolor: "white",
                      border: "1px solid",
                      borderColor: "grey.300",
                      color: "text.secondary",
                    }}
                  />
                </Box>

                {/* COLUMN CARDS CONTAINER */}
                <Box
                  display="flex"
                  flexDirection="column"
                  gap={2}
                  sx={{
                    flexGrow: 1,
                    overflowY: "auto",
                    minHeight: "150px",
                    "&::-webkit-scrollbar": { width: 0 }, // Oculta barra de rolagem vertical nas colunas
                  }}
                >
                  {columnOrders.map((p) => (
                    <Card
                      key={p.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleOpenViewModal(p)}
                      elevation={0}
                      sx={{
                        borderRadius: "10px",
                        border: "1px solid",
                        borderColor: "grey.200",
                        bgcolor: "background.paper",
                        cursor: "grab",
                        position: "relative",
                        transition: "all 0.2s ease-in-out",
                        "&:active": { cursor: "grabbing" },
                        "&:hover": {
                          boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
                          borderColor: col.color,
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: "16px !important" }}>
                        {/* CARD HEADER */}
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                fontSize: "0.8rem",
                                fontWeight: "bold",
                                bgcolor: col.bg,
                                color: col.color,
                              }}
                            >
                              {getInitials(p.cliente?.nome)}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="body2"
                                fontWeight="600"
                                color="text.primary"
                                sx={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {p.cliente?.nome || "Cliente Desconhecido"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {p.updatedAt
                                  ? `Atualizado: ${new Date(p.updatedAt).toLocaleDateString()}`
                                  : "Sem data"}
                              </Typography>
                            </Box>
                          </Box>
                          <Tooltip title="Opções">
                            <IconButton
                              size="small"
                              sx={{ mt: -0.5, mr: -1 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Menu context action here
                              }}
                            >
                              <MoreVertIcon fontSize="small" color="action" />
                            </IconButton>
                          </Tooltip>
                        </Box>

                        <Divider sx={{ mb: 1.5, borderStyle: "dashed" }} />

                        {/* CARD FOOTER */}
                        <Box display="flex" justifyContent="space-between" alignItems="flex-end">
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Valor Total
                            </Typography>
                            <Typography variant="body2" fontWeight="700" color="text.primary">
                              {Number(p.valorTotal || 0).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </Typography>
                          </Box>
                          <Chip
                            label={`#${p.numero || p.id.substring(0, 4)}`}
                            size="small"
                            sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600, bgcolor: "grey.100" }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <CustomerModal
        open={customerModalOpen}
        onClose={(refresh) => {
          setCustomerModalOpen(false);
          if (refresh) loadData();
        }}
      />
    </DashboardLayout>
  );
}