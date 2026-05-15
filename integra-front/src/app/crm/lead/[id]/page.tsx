"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  TextField,
  Grid,
  CircularProgress,
  Breadcrumbs,
  Link,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete
} from "@mui/material";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Package,
  Trash2,
  RefreshCw,
  Search,
  Plus,
  Send,
  MessageSquare,
  User,
  Paperclip,
  Upload,
  FileIcon
} from "lucide-react";
import { crmService } from "@/lib/crmService";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Comentários do Lead
  const [leadComments, setLeadComments] = useState<any[]>([]);
  const [newLeadComment, setNewLeadComment] = useState("");

  // Comentários do Orçamento (se houver)
  const [orderComments, setOrderComments] = useState<any[]>([]);
  const [newOrderComment, setNewOrderComment] = useState("");

  const [agenda, setAgenda] = useState<any[]>([]);
  const [newAgenda, setNewAgenda] = useState({ titulo: "", dataAgendada: "" });

  const [attachments, setAttachments] = useState<any[]>([]);
  const [orderAttachments, setOrderAttachments] = useState<any[]>([]); // Separado para clareza
  const [uploading, setUploading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempDesc, setTempDesc] = useState("");

  useEffect(() => {
    if (leadId) {
      loadLead();
    }
  }, [leadId]);

  async function loadLead() {
    setLoading(true);
    try {
      const found = await crmService.getLeadById(leadId);
      if (found) {
        setLead(found);
        setTempDesc(found.descricao || "");
        loadSecondaryData(found);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSecondaryData(foundLead: any) {
    try {
      const [leadComs, agendaData, leadAnexos] = await Promise.all([
        crmService.listComments({ leadId: foundLead.id }),
        crmService.listAgenda(foundLead.id),
        crmService.listLeadAttachments(foundLead.id)
      ]);
      setLeadComments(leadComs);
      setAgenda(agendaData);
      setAttachments(leadAnexos);

      if (foundLead.tag === 'DFARIAS') {
        const projs = await crmService.listProjects(foundLead.id);
        setProjects(projs);
      }

      if (foundLead.pedidos && foundLead.pedidos.length > 0) {
        const [orderComs, attachmentsData] = await Promise.all([
          crmService.listComments({ pedidoId: foundLead.pedidos[0].id }),
          crmService.listAttachments(foundLead.pedidos[0].id)
        ]);
        setOrderComments(orderComs);
        setOrderAttachments(attachmentsData);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const handleAddComment = async () => {
    if (!newLeadComment.trim()) return;
    try {
      await crmService.addComment({ leadId, texto: newLeadComment });
      setNewLeadComment("");
      const updated = await crmService.listComments({ leadId });
      setLeadComments(updated);
    } catch (e) { 
      console.error(e);
      alert("Erro ao adicionar comentário"); 
    }
  };

  const handleAddOrderComment = async () => {
    if (!newOrderComment.trim() || !activePedido) return;
    try {
      await crmService.addComment({ pedidoId: activePedido.id, texto: newOrderComment });
      setNewOrderComment("");
      const updated = await crmService.listComments({ pedidoId: activePedido.id });
      setOrderComments(updated);
    } catch (e) { 
      console.error(e);
      alert("Erro ao adicionar comentário no orçamento"); 
    }
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Faz upload direto no LEAD (liberado em todos os níveis)
      await crmService.uploadLeadAttachment(leadId, file);
      const updated = await crmService.listLeadAttachments(leadId);
      setAttachments(updated);
    } catch (e) {
      alert("Erro ao enviar anexo");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (id: string, isOrderAttachment: boolean = false) => {
    if (!window.confirm("Tem certeza que deseja excluir este anexo?")) return;
    try {
      if (isOrderAttachment) {
        await crmService.deleteAttachment(id);
        setOrderAttachments(orderAttachments.filter(a => a.id !== id));
      } else {
        await crmService.deleteLeadAttachment(id);
        setAttachments(attachments.filter(a => a.id !== id));
      }
    } catch (e) {
      alert("Erro ao excluir anexo");
    }
  };
  const activePedido = lead?.pedidos?.[0];

  const handleAddAgenda = async () => {
    if (!newAgenda.titulo || !newAgenda.dataAgendada) return;
    try {
      await crmService.createAgenda({ ...newAgenda, leadId });
      setNewAgenda({ titulo: "", dataAgendada: "" });
      loadSecondaryData(lead);
    } catch (e) {
      alert("Erro ao agendar");
    }
  };

  const handleSyncSankhya = async () => {
    if (!activePedido && lead.tag !== 'DFARIAS') return;
    
    setLoading(true);
    try {
      if (lead.tag === 'DFARIAS') {
        const latestProject = projects[0];
        if (!latestProject) throw new Error("Nenhum projeto encontrado para sincronizar.");
        await crmService.syncProjectToSankhya(latestProject.id);
        alert("Projeto sincronizado com sucesso no Sankhya (TOP 379)!");
      } else {
        await crmService.syncToSankhya(activePedido.id);
        alert("Orçamento sincronizado com sucesso no Sankhya (TOP 379)!");
      }
      loadLead();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [motivoPerda, setMotivoPerda] = useState("");
  const [observacaoPerda, setObservacaoPerda] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const handleStatusChange = async (event: any) => {
    const status = event.target.value;
    if (status === 'REPROVADO') {
      setNewStatus(status);
      setLossModalOpen(true);
    } else {
      try {
        await crmService.updateLead(leadId, { status });
        setLead({ ...lead, status });
      } catch (e) {
        console.error(e);
        alert("Erro ao alterar status");
      }
    }
  };

  const handleSaveDescription = async () => {
    try {
      await crmService.updateLead(leadId, { descricao: tempDesc });
      setLead({ ...lead, descricao: tempDesc });
      setIsEditingDesc(false);
    } catch (e) {
      alert("Erro ao salvar descrição");
    }
  };

  const confirmLoss = async () => {
    try {
      await crmService.updateLead(leadId, { 
        status: 'REPROVADO',
        motivoPerda,
        observacaoPerda
      });
      setLead({ ...lead, status: 'REPROVADO', motivoPerda, observacaoPerda });
      setLossModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Erro ao registrar perda");
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!window.confirm("Deseja realmente excluir este projeto?")) return;
    try {
      const res = await fetch(`/api/dfarias/orcamentos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erro ao excluir");
      setProjects(projects.filter(p => p.id !== id));
    } catch (e) {
      alert("Erro ao excluir projeto");
    }
  };

  const statusOptions = [
    "PROSPECCAO", "ORCAMENTO", "NEGOCIACAO", "PLANTA_CODIFICADA", 
    "MEMORIAL_DESCRITIVO", "APROVADO", "FATURADO", "POS_VENDA", "REPROVADO"
  ];

  if (loading) return <DashboardLayout><Box p={4} textAlign="center"><CircularProgress /></Box></DashboardLayout>;
  if (!lead) return <DashboardLayout><Box p={4} textAlign="center"><Typography>Lead não encontrado</Typography></Box></DashboardLayout>;

  const totalValue = lead.tag === 'DFARIAS'
    ? projects.reduce((acc, proj) => {
        const estruturado = proj.orcamentoEstruturado || {};
        return acc + (Number(estruturado.valorTotal) || 0);
      }, 0)
    : (activePedido?.valorTotal ? Number(activePedido.valorTotal) : 0);

  const tabs = [
    { label: "Informações", value: 0 },
    ...(lead.tag !== 'DFARIAS' ? [{ label: "Orçamento", value: 1 }] : []),
    ...(lead.tag === 'DFARIAS' ? [{ label: "Projetos", value: 2 }] : []),
    { label: "Histórico", value: 3 },
    { label: "Arquivos", value: 4 },
  ];

  return (
    <DashboardLayout 
      title={lead.cliente?.nome}
      subtitle={`Lead: ${lead.titulo || "Negociação"} | Valor Total: ${totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
    >
      <Box p={3}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <IconButton onClick={() => router.back()}><ArrowLeft /></IconButton>
          <Breadcrumbs>
            <Link 
              component="button" 
              onClick={() => router.push(`/crm/${lead.tag.toLowerCase()}`)} 
              underline="hover" 
              color="inherit"
              sx={{ p: 0, verticalAlign: 'baseline', textTransform: 'none', fontWeight: 'inherit', fontSize: 'inherit' }}
            >
              CRM
            </Link>
            <Typography color="text.primary">Detalhes</Typography>
          </Breadcrumbs>
        </Box>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }} elevation={0}>
              <CardContent>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                  {tabs.map((tab) => (
                    <Tab key={tab.value} label={tab.label} value={tab.value} />
                  ))}
                </Tabs>

                {activeTab === 0 && (
                  <Box>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>{lead.titulo}</Typography>
                    <Box display="flex" gap={2} mb={2} alignItems="center">
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={lead.status}
                          label="Status"
                          onChange={handleStatusChange}
                          disabled={lead.status === 'POS_VENDA'}
                          sx={{ borderRadius: 2 }}
                        >
                          {statusOptions.map(s => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Chip label={lead.tag} color="secondary" size="small" />
                      {(lead.numnota || lead.nunota) && (
                        <Chip 
                          label={lead.numnota ? `Nota: ${lead.numnota} (SNK: ${lead.nunota})` : `Sankhya: ${lead.nunota}`} 
                          color="success" 
                          size="small" 
                          sx={{ fontWeight: 'bold' }} 
                        />
                      )}
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary" fontWeight="bold">Descrição / Observações do Lead:</Typography>
                      {!isEditingDesc && (
                        <Button size="small" onClick={() => setIsEditingDesc(true)}>Editar</Button>
                      )}
                    </Box>

                    {isEditingDesc ? (
                      <Box>
                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          variant="outlined"
                          value={tempDesc}
                          onChange={(e) => setTempDesc(e.target.value)}
                          sx={{ mb: 1, bgcolor: 'white' }}
                        />
                        <Box display="flex" gap={1}>
                          <Button variant="contained" size="small" color="primary" onClick={handleSaveDescription}>Salvar</Button>
                          <Button variant="outlined" size="small" onClick={() => setIsEditingDesc(false)}>Cancelar</Button>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.primary" sx={{ mb: 2, whiteSpace: 'pre-wrap', bgcolor: 'grey.50', p: 2, borderRadius: 2 }}>
                        {lead.descricao || "Nenhuma descrição detalhada registrada."}
                      </Typography>
                    )}
                    
                    {lead.status === 'REPROVADO' && (
                      <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 2, color: 'error.contrastText', mt: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">Lead Perdido</Typography>
                        <Typography variant="body2"><strong>Motivo:</strong> {lead.motivoPerda}</Typography>
                        {lead.observacaoPerda && (
                          <Typography variant="body2"><strong>Observação:</strong> {lead.observacaoPerda}</Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                )}

                {activeTab === 1 && (
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle2" fontWeight="bold" display="flex" alignItems="center" gap={1}>
                          {activePedido ? `Orçamento #${activePedido.numero || activePedido.id.slice(-6)}` : "Nenhum orçamento criado"}
                          {activePedido?.numnota && (
                            <Chip label={`Nota: ${activePedido.numnota}`} size="small" color="success" sx={{ fontWeight: 'bold' }} />
                          )}
                        </Typography>
                       {activePedido && (
                         <Button 
                           variant="outlined" 
                           size="small" 
                           disabled={lead.status === 'REPROVADO'}
                           onClick={() => router.push(`/crm/pedido/${activePedido.id}`)}
                           sx={{ borderRadius: 2 }}
                         >
                           {lead.status === 'REPROVADO' ? "Orçamento Bloqueado" : "Ver Detalhes / Editar"}
                         </Button>
                       )}
                    </Box>
                    
                    {activePedido ? (
                      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                        <Table size="small">
                          <TableHead sx={{ bgcolor: "grey.50" }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>Produto</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Qtd</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {activePedido.itens?.map((item: any) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="bold">{item.codProd}</Typography>
                                  <Typography variant="caption" color="text.secondary">{item.descricao}</Typography>
                                </TableCell>
                                <TableCell align="center">{item.quantidade}</TableCell>
                                <TableCell align="right">R$ {Number(item.precoTotal).toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow>
                              <TableCell colSpan={2} align="right" sx={{ fontWeight: 'bold' }}>Total:</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                R$ {Number(activePedido.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Box textAlign="center" py={4} bgcolor="grey.50" borderRadius={4}>
                        <Package size={32} color="#ccc" style={{ marginBottom: 8 }} />
                        <Typography variant="body2" color="text.secondary">Ainda não há um orçamento para este lead.</Typography>
                        <Button 
                          variant="contained" 
                          size="small" 
                          onClick={() => router.push(`/crm/orcamento/novo?leadId=${leadId}&clienteId=${lead.clienteId}&tag=${lead.tag}`)}
                          sx={{ mt: 2, borderRadius: 2 }}
                        >
                           Criar Agora
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}

                {lead.tag === 'DFARIAS' && activeTab === 2 && (
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                      <Typography variant="h6" fontWeight="bold">Projetos Técnicos</Typography>
                      <Button 
                        variant="contained" 
                        size="small" 
                        startIcon={<Plus />} 
                        onClick={() => router.push(`/crm/projeto?leadId=${leadId}&clienteId=${lead.clienteId}`)}
                        disabled={lead.status === 'REPROVADO'}
                      >
                        Novo Projeto
                      </Button>
                    </Box>

                    {projects.length > 0 ? (
                      <Grid container spacing={2}>
                        {projects.map((p) => (
                          <Grid size={{ xs: 12, md: 6 }} key={p.id}>
                            <Card variant="outlined" sx={{ borderRadius: 3 }}>
                              <CardContent>
                                <Typography variant="subtitle1" fontWeight="bold">{p.nome}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Criado em: {new Date(p.criadoEm).toLocaleDateString()}
                                </Typography>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                                  <Typography variant="body2" color="primary" fontWeight="bold">
                                    {p.totalQuadros} {p.totalQuadros === 1 ? 'Quadro' : 'Quadros'}
                                  </Typography>
                                  <Box display="flex" gap={1}>
                                    <Button 
                                      size="small" 
                                      variant="outlined"
                                      onClick={() => router.push(`/crm/projeto?id=${p.id}&leadId=${leadId}`)}
                                    >
                                      Ver / Editar
                                    </Button>
                                    <IconButton 
                                      size="small" 
                                      color="error" 
                                      onClick={() => handleDeleteProject(p.id)}
                                      sx={{ border: '1px solid', borderColor: 'error.light', borderRadius: 2 }}
                                    >
                                      <Trash2 size={16} />
                                    </IconButton>
                                  </Box>
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Box textAlign="center" py={4} bgcolor="grey.50" borderRadius={4}>
                        <Typography color="text.secondary" gutterBottom>Nenhum projeto associado a este lead.</Typography>
                        <Button 
                          variant="outlined" 
                          onClick={() => router.push(`/crm/projeto?leadId=${leadId}&clienteId=${lead.clienteId}`)}
                          sx={{ mt: 1 }}
                          disabled={lead.status === 'REPROVADO'}
                        >
                          Criar Primeiro Projeto
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}

                {activeTab === (lead.tag === 'DFARIAS' ? 3 : 2) && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom fontWeight="bold">Histórico de Comentários</Typography>
                    
                    <Box sx={{ maxHeight: 400, overflowY: 'auto', mb: 3, pr: 1 }}>
                      {leadComments.length === 0 && orderComments.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 2 }}>
                          Nenhum comentário registrado ainda.
                        </Typography>
                      ) : (
                        <List sx={{ p: 0 }}>
                          {[...leadComments, ...orderComments]
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map((c, idx) => (
                              <ListItem key={idx} alignItems="flex-start" sx={{ px: 0, py: 1.5, borderBottom: '1px solid', borderColor: 'grey.100' }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: c.leadId ? 'primary.light' : 'success.light', color: c.leadId ? 'primary.main' : 'success.main', fontSize: 12, mr: 1.5 }}>
                                  {c.usuario?.email?.charAt(0).toUpperCase() || "U"}
                                </Avatar>
                                <ListItemText
                                  primary={
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                      <Typography variant="caption" fontWeight="bold">{c.usuario?.email || "Sistema"}</Typography>
                                      <Box display="flex" alignItems="center" gap={1}>
                                        {c.pedidoId && <Chip label="Orçamento" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} color="success" />}
                                        <Typography variant="caption" color="text.secondary">{new Date(c.createdAt).toLocaleString()}</Typography>
                                      </Box>
                                    </Box>
                                  }
                                  secondary={
                                    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                                      {c.texto}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            ))}
                        </List>
                      )}
                    </Box>

                    <Box display="flex" gap={1} alignItems="flex-start">
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                        placeholder="Escreva um comentário sobre o lead..."
                        value={newLeadComment}
                        onChange={(e) => setNewLeadComment(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                        sx={{ bgcolor: 'white' }}
                      />
                      <IconButton 
                        color="primary" 
                        onClick={handleAddComment}
                        disabled={!newLeadComment.trim()}
                        sx={{ mt: 0.5, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                      >
                        <Send size={18} />
                      </IconButton>
                    </Box>
                  </Box>
                )}

                {activeTab === (lead.tag === 'DFARIAS' ? 4 : 3) && (
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                      <Typography variant="subtitle2" fontWeight="700">Documentos e Anexos (Geral + Orçamento)</Typography>
                      <Button
                        component="label"
                        variant="outlined"
                        startIcon={uploading ? <CircularProgress size={16} /> : <Upload size={16} />}
                        disabled={uploading || lead.status === 'REPROVADO' || lead.status === 'POS_VENDA'}
                        size="small"
                        sx={{ borderRadius: 2 }}
                      >
                        {uploading ? "Enviando..." : "Enviar para o Lead"}
                        <input type="file" hidden onChange={handleUploadAttachment} />
                      </Button>
                    </Box>

                    <Grid container spacing={2}>
                      {attachments.length === 0 && orderAttachments.length === 0 ? (
                        <Grid size={{ xs: 12 }}>
                          <Box textAlign="center" py={4} bgcolor="grey.50" borderRadius={4}>
                            <Paperclip size={32} color="#ccc" style={{ marginBottom: 8 }} />
                            <Typography variant="caption" color="text.secondary" display="block">Nenhum anexo encontrado.</Typography>
                          </Box>
                        </Grid>
                      ) : (
                        <>
                          {/* Anexos do LEAD */}
                          {attachments.map((file) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={file.id}>
                              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #2196f3' }}>
                                <Box sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 2, color: 'primary.main' }}>
                                  <FileIcon size={20} />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight="bold" noWrap>{file.nome}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {(file.tamanho / 1024).toFixed(1)} KB • Lead
                                  </Typography>
                                </Box>
                                <Box display="flex" gap={0.5}>
                                  <IconButton size="small" color="primary" onClick={() => window.open(file.url, '_blank')}>
                                    <Send size={16} />
                                  </IconButton>
                                  <IconButton size="small" color="error" onClick={() => handleDeleteAttachment(file.id, false)}>
                                    <Trash2 size={16} />
                                  </IconButton>
                                </Box>
                              </Paper>
                            </Grid>
                          ))}
                          
                          {/* Anexos do PEDIDO */}
                          {orderAttachments.map((file) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={file.id}>
                              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #4caf50' }}>
                                <Box sx={{ p: 1, bgcolor: 'success.light', borderRadius: 2, color: 'success.main' }}>
                                  <FileIcon size={20} />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight="bold" noWrap>{file.nome}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {(file.tamanho / 1024).toFixed(1)} KB • Orçamento
                                  </Typography>
                                </Box>
                                <Box display="flex" gap={0.5}>
                                  <IconButton size="small" color="primary" onClick={() => window.open(file.url, '_blank')}>
                                    <Send size={16} />
                                  </IconButton>
                                  <IconButton size="small" color="error" onClick={() => handleDeleteAttachment(file.id, true)}>
                                    <Trash2 size={16} />
                                  </IconButton>
                                </Box>
                              </Paper>
                            </Grid>
                          ))}
                        </>
                      )}
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Box display="flex" flexDirection="column" gap={3}>
              {lead.tag === 'DFARIAS' ? (
                projects.length > 0 ? (
                  <Button 
                    variant="contained" 
                    fullWidth 
                    size="large" 
                    startIcon={<RefreshCw />} 
                    color="success" 
                    disabled={lead.status === 'REPROVADO' || lead.status === 'POS_VENDA'}
                    onClick={handleSyncSankhya} 
                    sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold' }}
                  >
                    Sincronizar Projeto com Sankhya
                  </Button>
                ) : (
                  <Button 
                    variant="contained" 
                    fullWidth 
                    size="large" 
                    startIcon={<Plus />} 
                    color="primary" 
                    disabled={lead.status === 'REPROVADO' || lead.status === 'POS_VENDA'}
                    onClick={() => router.push(`/crm/projeto?leadId=${leadId}&clienteId=${lead.clienteId}`)} 
                    sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold' }}
                  >
                    Novo Projeto
                  </Button>
                )
              ) : activePedido ? (
                <Button 
                   variant="contained" 
                   fullWidth 
                   size="large" 
                   startIcon={<RefreshCw />} 
                   color="success" 
                   disabled={lead.status === 'REPROVADO' || lead.status === 'POS_VENDA'}
                   onClick={handleSyncSankhya} 
                   sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold' }}
                >
                  Sincronizar com Sankhya
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  fullWidth 
                  size="large" 
                  startIcon={<Plus />} 
                  color="primary" 
                  disabled={lead.status === 'REPROVADO' || lead.status === 'POS_VENDA'}
                  onClick={() => router.push(`/crm/orcamento/novo?leadId=${leadId}&clienteId=${lead.clienteId}&tag=${lead.tag}`)} 
                  sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold' }}
                >
                  Criar Orçamento
                </Button>
              )}

              <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }} elevation={0}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" display="flex" alignItems="center" gap={1} mb={2}>
                    <Calendar size={18} color="#10b981" /> Próximos Passos (Agenda)
                  </Typography>
                  <Box sx={{ maxHeight: 250, overflowY: 'auto', mb: 2 }}>
                    {agenda.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">Sem atividades pendentes.</Typography>
                    ) : (
                      agenda.map((a, idx) => (
                        <Box key={idx} sx={{ p: 1.5, mb: 1, bgcolor: a.concluido ? 'grey.100' : 'success.light', borderRadius: 2 }}>
                          <Typography variant="body2" fontWeight="bold">{a.titulo}</Typography>
                          <Typography variant="caption" display="flex" alignItems="center" gap={0.5}><Clock size={12} /> {new Date(a.dataAgendada).toLocaleString()}</Typography>
                        </Box>
                      ))
                    )}
                  </Box>
                  <Box display="flex" flexDirection="column" gap={1.5}>
                    <TextField fullWidth size="small" label="O que fazer?" value={newAgenda.titulo} onChange={(e) => setNewAgenda({ ...newAgenda, titulo: e.target.value })} />
                    <TextField type="datetime-local" fullWidth size="small" value={newAgenda.dataAgendada} onChange={(e) => setNewAgenda({ ...newAgenda, dataAgendada: e.target.value })} />
                    <Button variant="outlined" color="success" fullWidth onClick={handleAddAgenda}>Agendar</Button>
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 4, bgcolor: 'grey.50', mb: 3 }} elevation={0}>
                 <CardContent>
                    <Typography variant="subtitle2" gutterBottom fontWeight="bold">Informações do Cliente</Typography>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Avatar sx={{ bgcolor: 'grey.300' }}><User size={20} /></Avatar>
                        <Box>
                            <Typography variant="body2" fontWeight="bold">{lead.cliente?.nome}</Typography>
                            <Typography variant="caption" color="text.secondary">{lead.cliente?.documento || "Sem documento"}</Typography>
                        </Box>
                    </Box>
                    <Typography variant="caption" display="block">Telefone: {lead.cliente?.telefone || "N/A"}</Typography>
                    <Typography variant="caption" display="block">Email: {lead.cliente?.email || "N/A"}</Typography>
                 </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Modal de Perda */}
      <Dialog open={lossModalOpen} onClose={() => setLossModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold' }}>Por que esta negociação foi perdida?</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Motivo da Perda</InputLabel>
              <Select
                value={motivoPerda}
                label="Motivo da Perda"
                onChange={(e) => setMotivoPerda(e.target.value)}
              >
                <MenuItem value="PRECO">Preço Alto</MenuItem>
                <MenuItem value="CONCORRENCIA">Perdeu para Concorrência</MenuItem>
                <MenuItem value="PRAZO">Prazo de Entrega</MenuItem>
                <MenuItem value="PRODUTO">Não temos o produto</MenuItem>
                <MenuItem value="DESISTENCIA">Desistência do Cliente</MenuItem>
                <MenuItem value="OUTROS">Outros</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Observação Adicional"
              value={observacaoPerda}
              onChange={(e) => setObservacaoPerda(e.target.value)}
              placeholder="Detalhe o motivo da perda aqui..."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setLossModalOpen(false)}>Cancelar</Button>
          <Button onClick={confirmLoss} variant="contained" color="error" disabled={!motivoPerda}>Confirmar Reprovação</Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
