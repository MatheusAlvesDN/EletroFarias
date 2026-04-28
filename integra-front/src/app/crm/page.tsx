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
  Divider,
  Avatar,
  Tooltip,
  Tabs,
  Tab,
  Chip
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
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState("TODOS");

  // Modais
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await crmService.listLeads();
      setLeads(data);
    } catch (error) {
      console.error("Erro ao carregar leads:", error);
    } finally {
      setLoading(false);
    }
  }

  // Eventos de Drag and Drop
  const handleDragStart = (e: React.DragEvent<HTMLElement>, leadId: string) => {
    e.dataTransfer.setData("leadId", leadId);
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
    const leadId = e.dataTransfer.getData("leadId");

    if (!leadId) return;

    // Atualização Otimista
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    try {
      await crmService.updateLeadStatus(leadId, newStatus);
    } catch (error) {
      console.error("Erro ao atualizar status do lead:", error);
      loadData(); // Reverte caso a API dê erro
    }
  };

  const handleOpenViewModal = (lead: any) => {
    router.push(`/crm/lead/${lead.id}`);
  };

  // Função auxiliar para pegar a inicial do cliente
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  return (
    <DashboardLayout
      title="Funil de Vendas"
      subtitle="Acompanhe seus leads do primeiro contato até o faturamento"
    >
      <Box p={4} display="flex" flexDirection="column" gap={4} sx={{ height: "calc(100vh - 80px)" }}>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Tabs
            value={activeTag}
            onChange={(_, val) => setActiveTag(val)}
            sx={{
              bgcolor: 'background.paper',
              borderRadius: '12px',
              p: 0.5,
              border: '1px solid',
              borderColor: 'grey.200',
              '& .MuiTabs-indicator': { borderRadius: '8px', height: '100%', zIndex: 0, opacity: 0.1 },
              '& .MuiTab-root': { zIndex: 1, textTransform: 'none', fontWeight: 600, minHeight: 40, borderRadius: '8px' }
            }}
          >
            <Tab label="Todos os Leads" value="TODOS" />
            <Tab label="CRM LID" value="LID" />
            <Tab label="DFARIAS" value="DFARIAS" />
            <Tab label="ELETRO" value="ELETRO" />
          </Tabs>

          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              onClick={() => setCustomerModalOpen(true)}
              sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 600 }}
            >
              Novo Cliente
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push("/crm/lead/novo")}
              disableElevation
              sx={{ borderRadius: "8px", px: 4, textTransform: "none", fontWeight: 600 }}
            >
              Novo Lead
            </Button>
          </Box>
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
            const filteredLeads = activeTag === "TODOS"
              ? leads
              : leads.filter(l => l.tag === activeTag);

            const columnLeads = filteredLeads.filter(
              (l) => String(l.status).toUpperCase() === String(col.id).toUpperCase()
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
                    label={columnLeads.length}
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
                  {columnLeads.map((l) => (
                    <Card
                      key={l.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, l.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleOpenViewModal(l)}
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
                              {getInitials(l.cliente?.nome)}
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
                                {l.titulo || l.cliente?.nome || "Lead sem título"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {l.cliente?.nome}
                              </Typography>
                            </Box>
                          </Box>
                          <Tooltip title="Opções">
                            <IconButton
                              size="small"
                              sx={{ mt: -0.5, mr: -1 }}
                              onClick={(e) => {
                                e.stopPropagation();
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
                              Último Orçamento
                            </Typography>
                            <Typography variant="body2" fontWeight="700" color="text.primary">
                              {l.pedidos && l.pedidos.length > 0
                                ? Number(l.pedidos[0].valorTotal || 0).toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })
                                : "R$ 0,00"}
                            </Typography>
                          </Box>
                          <Box display="flex" gap={0.5}>
                            {l.agendas && l.agendas.length > 0 && (
                              <Tooltip title="Possui compromissos pendentes">
                                <Avatar sx={{ width: 20, height: 20, bgcolor: 'warning.light', color: 'warning.dark', fontSize: 10 }}>
                                  {l.agendas.length}
                                </Avatar>
                              </Tooltip>
                            )}
                            <Chip
                              label={`ID: ${l.id.substring(0, 4)}`}
                              size="small"
                              sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600, bgcolor: "grey.100" }}
                            />
                          </Box>
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