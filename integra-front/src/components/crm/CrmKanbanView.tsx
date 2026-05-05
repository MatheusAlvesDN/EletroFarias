"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Chip, 
  TextField, 
  InputAdornment, 
  CircularProgress, 
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
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
import SearchIcon from "@mui/icons-material/Search";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import AccessTimeIcon from "@mui/icons-material/AccessTime"; // Para SLA
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DescriptionIcon from "@mui/icons-material/Description";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import ConstructionIcon from "@mui/icons-material/Construction";
import StarIcon from "@mui/icons-material/Star";

import { crmService } from "@/lib/crmService";
import CustomerModal from "@/components/crm/CustomerModal";
import { getRoleFromToken } from "@/utils/jwt";

// Configurações de colunas por empresa
const TAG_COLUMNS: Record<string, any[]> = {
  LID: [
    { id: "PROSPECCAO", label: "Prospecção", color: "#2196f3", bg: "#e3f2fd", icon: PersonSearchIcon },
    { id: "ORCAMENTO", label: "Orçamento", color: "#9c27b0", bg: "#f3e5f5", icon: RequestQuoteIcon },
    { id: "NEGOCIACAO", label: "Negociação", color: "#ff9800", bg: "#fff3e0", icon: HandshakeIcon },
    { id: "PLANTA_CODIFICADA", label: "Planta Codificada", color: "#795548", bg: "#efebe9", icon: AccountTreeIcon },
    { id: "MEMORIAL_DESCRITIVO", label: "Memorial Descritivo", color: "#607d8b", bg: "#eceff1", icon: DescriptionIcon },
    { id: "APROVADO", label: "Aprovado", color: "#4caf50", bg: "#e8f5e9", icon: ThumbUpAltIcon },
    { id: "FATURADO", label: "Faturado", color: "#009688", bg: "#e0f2f1", icon: MonetizationOnIcon },
    { id: "POS_VENDA", label: "Pós Venda", color: "#e91e63", bg: "#fce4ec", icon: StarIcon },
  ],
  DFARIAS: [
    { id: "PROSPECCAO", label: "Prospecção", color: "#2196f3", bg: "#e3f2fd", icon: PersonSearchIcon },
    { id: "ORCAMENTO", label: "Orçamento", color: "#9c27b0", bg: "#f3e5f5", icon: RequestQuoteIcon },
    { id: "NEGOCIACAO", label: "Negociação", color: "#ff9800", bg: "#fff3e0", icon: HandshakeIcon },
    { id: "EM_PRODUCAO", label: "Em Produção", color: "#ffc107", bg: "#fff8e1", icon: ConstructionIcon },
    { id: "APROVADO", label: "Aprovado", color: "#4caf50", bg: "#e8f5e9", icon: ThumbUpAltIcon },
    { id: "FATURADO", label: "Faturado", color: "#009688", bg: "#e0f2f1", icon: MonetizationOnIcon },
  ],
  ELETRO: [
    { id: "PROSPECCAO", label: "Prospecção", color: "#2196f3", bg: "#e3f2fd", icon: PersonSearchIcon },
    { id: "ORCAMENTO", label: "Orçamento", color: "#9c27b0", bg: "#f3e5f5", icon: RequestQuoteIcon },
    // Negociação removida para Eletro
    { id: "APROVADO", label: "Aprovado", color: "#4caf50", bg: "#e8f5e9", icon: ThumbUpAltIcon },
    { id: "FATURADO", label: "Faturado", color: "#009688", bg: "#e0f2f1", icon: MonetizationOnIcon },
    { id: "POS_VENDA", label: "Pós Venda", color: "#e91e63", bg: "#fce4ec", icon: StarIcon },
  ],
  TODOS: [
    { id: "PROSPECCAO", label: "Prospecção", color: "#2196f3", bg: "#e3f2fd", icon: PersonSearchIcon },
    { id: "ORCAMENTO", label: "Orçamento", color: "#9c27b0", bg: "#f3e5f5", icon: RequestQuoteIcon },
    { id: "NEGOCIACAO", label: "Negociação", color: "#ff9800", bg: "#fff3e0", icon: HandshakeIcon },
    { id: "APROVADO", label: "Aprovado", color: "#4caf50", bg: "#e8f5e9", icon: ThumbUpAltIcon },
    { id: "FATURADO", label: "Faturado", color: "#009688", bg: "#e0f2f1", icon: MonetizationOnIcon },
  ]
};



interface CrmKanbanViewProps {
  defaultTag?: string; // LID, DFARIAS, ELETRO
  title: string;
}

export default function CrmKanbanView({ defaultTag, title }: CrmKanbanViewProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState(defaultTag || "TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasAccess, setHasAccess] = useState(true);

  // Colunas dinâmicas baseadas na tag ativa
  const columns = useMemo(() => {
    return TAG_COLUMNS[activeTag] || TAG_COLUMNS["TODOS"];
  }, [activeTag]);

  // Modais
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [selectedLeadForLoss, setSelectedLeadForLoss] = useState<string | null>(null);
  const [motivoPerda, setMotivoPerda] = useState("");
  const [observacaoPerda, setObservacaoPerda] = useState("");

  // Estado para o Menu de cada lead
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedLeadForMenu, setSelectedLeadForMenu] = useState<any>(null);

  useEffect(() => {
    checkAccessAndLoad();
  }, [defaultTag]);

  async function checkAccessAndLoad() {
    setLoading(true);
    const token = localStorage.getItem("authToken");
    if (!token) {
        router.push("/");
        return;
    }

    try {
        // Extrair permissões do token
        const parts = token.split('.');
        const payload = JSON.parse(window.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const userRole = payload.role;
        const userTags = payload.crmTags || [];

        // Se houver uma tag específica, verifica se o usuário tem acesso (Admin/Manager sempre tem)
        if (defaultTag && userRole !== "ADMIN" && userRole !== "MANAGER") {
            if (!userTags.includes(defaultTag)) {
                setHasAccess(false);
                setLoading(false);
                return;
            }
        }

        await loadData();
    } catch (error) {
        console.error("Erro ao validar acesso:", error);
    } finally {
        setLoading(false);
    }
  }

  async function loadData() {
    try {
      const data = await crmService.listLeads();
      setLeads(data);
    } catch (error) {
      console.error("Erro ao carregar leads:", error);
    }
  }

  // Eventos de Drag and Drop
  const handleDragStart = (e: React.DragEvent<HTMLElement>, leadId: string) => {
    e.dataTransfer.setData("leadId", leadId);
    e.currentTarget.style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent<HTMLElement>) => {
    e.currentTarget.style.opacity = "1";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (!leadId) return;

    if (newStatus === "REPROVADO") {
      setSelectedLeadForLoss(leadId);
      setLossModalOpen(true);
      return;
    }

    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    try {
      await crmService.updateLeadStatus(leadId, newStatus);
    } catch (error) {
      console.error("Erro ao atualizar status do lead:", error);
      loadData();
    }
  };

  const confirmLoss = async () => {
    if (!selectedLeadForLoss || !motivoPerda) return;

    try {
      await crmService.updateLead(selectedLeadForLoss, { 
        status: "REPROVADO",
        motivoPerda: motivoPerda,
        observacaoPerda: observacaoPerda
      });
      setLossModalOpen(false);
      setMotivoPerda("");
      setObservacaoPerda("");
      setSelectedLeadForLoss(null);
      loadData();
    } catch (error) {
      console.error("Erro ao registrar perda:", error);
    }
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, lead: any) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedLeadForMenu(lead);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setSelectedLeadForMenu(null);
  };

  const handleDeleteLead = async () => {
    if (!selectedLeadForMenu) return;
    if (!window.confirm("Deseja realmente excluir este lead? Esta ação é irreversível.")) return;

    try {
      await crmService.deleteLead(selectedLeadForMenu.id);
      handleCloseMenu();
      loadData();
    } catch (error) {
      console.error("Erro ao excluir lead:", error);
      alert("Erro ao excluir lead");
    }
  };

  const handleViewLead = () => {
    if (!selectedLeadForMenu) return;
    router.push(`/crm/lead/${selectedLeadForMenu.id}`);
    handleCloseMenu();
  };

  const handleReproveLeadFromMenu = () => {
    if (!selectedLeadForMenu) return;
    setSelectedLeadForLoss(selectedLeadForMenu.id);
    setLossModalOpen(true);
    handleCloseMenu();
  };

  const handleOpenViewModal = (lead: any) => {
    router.push(`/crm/lead/${lead.id}`);
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const getSLATime = (updatedAt: string) => {
    const diff = Date.now() - new Date(updatedAt).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const isSLAExceeded = (updatedAt: string) => {
    const diff = Date.now() - new Date(updatedAt).getTime();
    return diff > 48 * 60 * 60 * 1000; // 48 horas
  };

  if (!hasAccess) {
      return (
          <DashboardLayout title="Acesso Negado">
              <Box p={4}>
                  <Alert severity="error">Você não tem permissão para acessar os leads desta empresa.</Alert>
              </Box>
          </DashboardLayout>
      );
  }

  return (
    <DashboardLayout
      title={title}
      subtitle={`Gerenciamento de leads - ${defaultTag || "Visão Geral"}`}
    >
      <Box p={4} display="flex" flexDirection="column" gap={4} sx={{ height: "calc(100vh - 80px)" }}>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          {/* Se não houver tag fixa, mostra o seletor de abas */}
          {!defaultTag ? (
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
          ) : (
            <Typography variant="h5" fontWeight="700" color="primary">
              Empresa: {defaultTag}
            </Typography>
          )}

          <Box display="flex" gap={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Pesquisar leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                width: { xs: 200, md: 300 }, 
                bgcolor: 'white',
                '& .MuiOutlinedInput-root': { 
                  borderRadius: '12px',
                  bgcolor: 'background.paper'
                }
              }}
            />
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
              onClick={() => router.push(`/crm/lead/novo?tag=${defaultTag || "LID"}`)}
              disableElevation
              sx={{ borderRadius: "8px", px: 4, textTransform: "none", fontWeight: 600 }}
            >
              Novo Lead
            </Button>
          </Box>
        </Box>

        {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1}>
                <CircularProgress />
            </Box>
        ) : (
            <Box
              display="flex"
              gap={3}
              sx={{
                overflowX: "auto",
                pb: 4,
                flexGrow: 1,
                alignItems: "flex-start", // Garante que as colunas cresçam de forma independente
                "&::-webkit-scrollbar": { height: 8 },
                "&::-webkit-scrollbar-thumb": { bgcolor: "grey.300", borderRadius: 10 },
                "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
              }}
            >
              {columns.map((col) => {
                const ColumnIcon = col.icon;
                const filteredLeads = leads.filter(l => {
                  const matchesTag = activeTag === "TODOS" || l.tag === activeTag;
                  const matchesSearch = !searchQuery || 
                    (l.titulo?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                     l.cliente?.nome?.toLowerCase().includes(searchQuery.toLowerCase()));
                  return matchesTag && matchesSearch;
                });

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
                      bgcolor: "grey.50",
                      borderRadius: "12px",
                      border: "1px solid",
                      borderColor: "grey.200",
                      borderTop: `4px solid ${col.color}`,
                      display: "flex",
                      flexDirection: "column",
                      p: 2,
                    }}
                  >
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
                        sx={{ height: 24, minWidth: 32, fontWeight: 700, bgcolor: "white", border: "1px solid", borderColor: "grey.300", color: "text.secondary" }}
                      />
                    </Box>

                    <Box display="flex" flexDirection="column" gap={2} sx={{ minHeight: "150px" }}>
                      {columnLeads.map((l) => (
                        <Card
                          key={l.id}
                          draggable={l.status !== 'REPROVADO' && l.status !== 'POS_VENDA'}
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
                            transition: "all 0.2s ease-in-out",
                            "&:hover": { boxShadow: "0 6px 16px rgba(0,0,0,0.08)", borderColor: col.color, transform: "translateY(-2px)" },
                          }}
                        >
                          <CardContent sx={{ p: "16px !important" }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                              <Box display="flex" alignItems="center" gap={1.5}>
                                <Avatar sx={{ width: 28, height: 28, fontSize: "0.8rem", fontWeight: "bold", bgcolor: col.bg, color: col.color }}>
                                  {getInitials(l.cliente?.nome)}
                                </Avatar>
                                <Box>
                                   <Box display="flex" alignItems="center" gap={1}>
                                      <Typography variant="body2" fontWeight="600" color="text.primary" sx={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                        {l.titulo || l.cliente?.nome || "Lead sem título"}
                                      </Typography>
                                      {isSLAExceeded(l.statusUpdatedAt || l.updatedAt) && (
                                        <Tooltip title={`Atrasado: ${getSLATime(l.statusUpdatedAt || l.updatedAt)} sem atualização`}>
                                          <AccessTimeIcon sx={{ fontSize: 14, color: 'error.main' }} />
                                        </Tooltip>
                                      )}
                                   </Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {l.cliente?.nome}
                                  </Typography>
                                </Box>
                              </Box>
                              <IconButton size="small" sx={{ mt: -0.5, mr: -1 }} onClick={(e) => handleOpenMenu(e, l)}>
                                <MoreVertIcon fontSize="small" color="action" />
                              </IconButton>
                            </Box>

                            <Divider sx={{ mb: 1.5, borderStyle: "dashed" }} />

                            <Box display="flex" justifyContent="space-between" alignItems="flex-end">
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Valor</Typography>
                                <Typography variant="body2" fontWeight="700" color="text.primary">
                                  {l.pedidos && l.pedidos.length > 0
                                    ? Number(l.pedidos[0].valorTotal || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                                    : "R$ 0,00"}
                                </Typography>
                              </Box>
                              <Box display="flex" gap={0.5}>
                                {l.agendas && l.agendas.length > 0 && (
                                  <Avatar sx={{ width: 20, height: 20, bgcolor: 'warning.light', color: 'warning.dark', fontSize: 10 }}>
                                    {l.agendas.length}
                                  </Avatar>
                                )}
                                {(l.anexos?.length > 0 || (l.pedidos?.[0]?.anexos?.length > 0)) && (
                                  <Tooltip title={`${(l.anexos?.length || 0) + (l.pedidos?.[0]?.anexos?.length || 0)} anexos`}>
                                    <Avatar sx={{ width: 20, height: 20, bgcolor: 'primary.light', color: 'primary.main', fontSize: 10 }}>
                                      <AttachFileIcon sx={{ fontSize: 14 }} />
                                    </Avatar>
                                  </Tooltip>
                                )}
                                <Chip label={`ID: ${l.id.substring(0, 4)}`} size="small" sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600, bgcolor: "grey.100" }} />
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
        )}
      </Box>

      <CustomerModal
        open={customerModalOpen}
        onClose={(refresh) => {
          setCustomerModalOpen(false);
          if (refresh) loadData();
        }}
      />

      {/* Modal de Motivo de Perda */}
      <Dialog open={lossModalOpen} onClose={() => setLossModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Por que este lead foi perdido?</DialogTitle>
        <DialogContent>
          <Box pt={1}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Motivo da Perda</InputLabel>
              <Select
                value={motivoPerda}
                label="Motivo da Perda"
                onChange={(e) => setMotivoPerda(e.target.value)}
              >
                <MenuItem value="Preço">Preço</MenuItem>
                <MenuItem value="Prazo">Prazo</MenuItem>
                <MenuItem value="Concorrência">Concorrência</MenuItem>
                <MenuItem value="Desistência">Desistência do Cliente</MenuItem>
                <MenuItem value="Sem Estoque">Sem Estoque</MenuItem>
                <MenuItem value="Outro">Outro</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Observações (Opcional)"
              multiline
              rows={3}
              value={observacaoPerda}
              onChange={(e) => setObservacaoPerda(e.target.value)}
              placeholder="Detalhe o motivo da perda aqui..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLossModalOpen(false)}>Cancelar</Button>
          <Button 
            onClick={confirmLoss} 
            variant="contained" 
            color="error"
            disabled={!motivoPerda}
          >
            Confirmar Perda
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu de Opções do Lead */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleViewLead} sx={{ gap: 1.5 }}>
          <VisibilityIcon fontSize="small" color="primary" />
          <Typography variant="body2">Exibir Lead</Typography>
        </MenuItem>
        <MenuItem 
          onClick={handleReproveLeadFromMenu} 
          disabled={selectedLeadForMenu?.status === 'REPROVADO' || selectedLeadForMenu?.status === 'POS_VENDA'}
          sx={{ gap: 1.5 }}
        >
          <ThumbDownAltIcon fontSize="small" color="error" />
          <Typography variant="body2">Reprovar Lead</Typography>
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={handleDeleteLead} 
          disabled={selectedLeadForMenu?.status === 'REPROVADO' || selectedLeadForMenu?.status === 'POS_VENDA'}
          sx={{ gap: 1.5, color: (selectedLeadForMenu?.status === 'REPROVADO' || selectedLeadForMenu?.status === 'POS_VENDA') ? 'text.disabled' : 'error.main' }}
        >
          <DeleteIcon fontSize="small" color="inherit" />
          <Typography variant="body2">Excluir Lead</Typography>
        </MenuItem>
      </Menu>
    </DashboardLayout>
  );
}
