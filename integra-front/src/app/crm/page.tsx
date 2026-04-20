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
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais de Criação
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  // Modal de Visualização
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

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

  // Abrir Modal de Visualização
  const handleOpenViewModal = (pedido: any) => {
    setSelectedOrder(pedido);
    setViewModalOpen(true);
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
                    label={pedidos.filter(p => p.status === col.id).length}
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
                {pedidos.filter((p) => p.status === col.id).map((p) => (
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

      {/* MODAIS EXISTENTES */}
      <OrderModal open={orderModalOpen} onClose={(refresh) => {
        setOrderModalOpen(false);
        if (refresh) loadData();
      }} />

      <CustomerModal open={customerModalOpen} onClose={(refresh) => {
        setCustomerModalOpen(false);
        if (refresh) loadData();
      }} />

      {/* NOVO MODAL DE VISUALIZAÇÃO DO ORÇAMENTO */}
      <Dialog
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight="bold">
              Detalhes do Orçamento #{selectedOrder?.numero}
            </Typography>
            <IconButton onClick={() => setViewModalOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedOrder && (
            <Box display="flex" flexDirection="column" gap={3}>
              {/* Informações Resumidas */}
              <Box display="flex" gap={4} flexWrap="wrap">
                <Box>
                  <Typography variant="caption" color="text.secondary">Cliente</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedOrder.cliente?.nome || "Desconhecido"}
                  </Typography>
                  {selectedOrder.cliente?.documento && (
                    <Typography variant="body2" color="text.secondary">
                      {selectedOrder.cliente.documento}
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">Fase Atual</Typography>
                  <Typography variant="body1" display="block">
                    <Chip
                      label={COLUMNS.find(c => c.id === selectedOrder.status)?.label || selectedOrder.status}
                      size="small"
                      sx={{
                        bgcolor: COLUMNS.find(c => c.id === selectedOrder.status)?.color || 'grey.200',
                        fontWeight: 'bold'
                      }}
                    />
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">Valor Total</Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary">
                    {Number(selectedOrder.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">Última Atualização</Typography>
                  <Typography variant="body1">
                    {selectedOrder.updatedAt ? new Date(selectedOrder.updatedAt).toLocaleDateString() : "-"}
                  </Typography>
                </Box>
              </Box>

              {/* Observações */}
              {selectedOrder.observacoes && (
                <Box bgcolor="grey.50" p={2} borderRadius={2} border="1px solid" borderColor="grey.200">
                  <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                    Observações Internas
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedOrder.observacoes}
                  </Typography>
                </Box>
              )}

              {/* Tabela de Itens */}
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                  Itens do Pedido ({selectedOrder.itens?.length || 0})
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "grey.50" }}>
                      <TableRow>
                        <TableCell>Produto</TableCell>
                        <TableCell align="center" width={100}>Quantidade</TableCell>
                        <TableCell align="right" width={140}>Preço Unit.</TableCell>
                        <TableCell align="right" width={140}>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.itens && selectedOrder.itens.length > 0 ? (
                        selectedOrder.itens.map((item: any) => (
                          <TableRow key={item.id || item.codProd}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">{item.codProd}</Typography>
                              <Typography variant="caption" color="text.secondary">{item.descricao}</Typography>
                            </TableCell>
                            <TableCell align="center">{item.quantidade}</TableCell>
                            <TableCell align="right">
                              {Number(item.precoUnitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                              {(Number(item.quantidade) * Number(item.precoUnitario || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                            Nenhum item vinculado a este orçamento.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewModalOpen(false)} color="inherit" variant="outlined">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}