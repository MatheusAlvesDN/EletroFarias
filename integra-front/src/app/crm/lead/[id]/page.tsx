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
  Tooltip
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
  User
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

  // Busca de Produtos
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

  useEffect(() => {
    if (leadId) {
      loadLead();
    }
  }, [leadId]);

  async function loadLead() {
    setLoading(true);
    try {
      const all = await crmService.listLeads();
      const found = all.find((l: any) => l.id === leadId);
      if (found) {
        setLead(found);
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
      const [leadComs, agendaData] = await Promise.all([
        crmService.listComments({ leadId: foundLead.id }),
        crmService.listAgenda(foundLead.id)
      ]);
      setLeadComments(leadComs);
      setAgenda(agendaData);

      if (foundLead.pedidos && foundLead.pedidos.length > 0) {
        const orderComs = await crmService.listComments({ pedidoId: foundLead.pedidos[0].id });
        setOrderComments(orderComs);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const handleAddLeadComment = async () => {
    if (!newLeadComment.trim()) return;
    try {
      await crmService.addComment({ leadId, texto: newLeadComment });
      setNewLeadComment("");
      const updated = await crmService.listComments({ leadId });
      setLeadComments(updated);
    } catch (e) { alert("Erro ao adicionar comentário"); }
  };

  const handleAddOrderComment = async () => {
    if (!newOrderComment.trim() || !lead.pedidos?.[0]?.id) return;
    try {
      await crmService.addComment({ pedidoId: lead.pedidos[0].id, texto: newOrderComment });
      setNewOrderComment("");
      const updated = await crmService.listComments({ pedidoId: lead.pedidos[0].id });
      setOrderComments(updated);
    } catch (e) { alert("Erro ao adicionar comentário no orçamento"); }
  };

  const handleAddAgenda = async () => {
    if (!newAgenda.titulo || !newAgenda.dataAgendada) return;
    try {
      await crmService.addAgenda(leadId, {
        titulo: newAgenda.titulo,
        dataAgendada: new Date(newAgenda.dataAgendada).toISOString()
      });
      setNewAgenda({ titulo: "", dataAgendada: "" });
      const updated = await crmService.listAgenda(leadId);
      setAgenda(updated);
    } catch (e) { alert("Erro ao agendar"); }
  };

  const handleSyncSankhya = async () => {
    if (!lead.pedidos?.[0]?.id) return;
    try {
      await crmService.syncToSankhya(lead.pedidos[0].id);
      alert("Sincronizado com sucesso!");
      loadLead();
    } catch (e) { alert("Erro na sincronização"); }
  };

  const handleSearchProducts = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { items } = await crmService.searchSankhya(q);
      setSearchResults(items || []);
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  };

  const onSelectItem = async (prod: any) => {
    const qtd = window.prompt(`Digite a quantidade para ${prod.DESCRPROD}:`, "1");
    if (!qtd || isNaN(Number(qtd))) return;

    try {
      setIsAddingItem(true);
      
      let pedidoId = lead.pedidos?.[0]?.id;
      
      // Se não houver pedido, cria um primeiro
      if (!pedidoId) {
        const newOrder = await crmService.createOrder({
          clienteId: lead.clienteId,
          leadId: lead.id,
          itens: []
        });
        pedidoId = newOrder.id;
      }

      await crmService.addItem(pedidoId, {
        codProd: prod.CODPROD,
        descricao: prod.DESCRPROD,
        quantidade: Number(qtd),
        precoUnitario: Number(prod.PRECOVenda || 0)
      });
      
      setSearchQuery("");
      setSearchResults([]);
      loadLead();
    } catch (e) {
      alert("Erro ao adicionar item");
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const pedidoId = lead.pedidos?.[0]?.id;
    if (!pedidoId) return;
    if (!window.confirm("Remover este item?")) return;
    try {
      await crmService.removeItem(pedidoId, itemId);
      loadLead();
    } catch (e) { alert("Erro ao remover"); }
  };

  if (loading) return (
    <DashboardLayout title="Carregando...">
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
        <CircularProgress color="success" />
      </Box>
    </DashboardLayout>
  );

  if (!lead) return (
    <DashboardLayout title="Lead não encontrado">
      <Box p={4} textAlign="center">
        <Typography>O lead solicitado não existe.</Typography>
        <Button startIcon={<ArrowLeft />} onClick={() => router.push("/crm")} sx={{ mt: 2 }}>
          Voltar ao Funil
        </Button>
      </Box>
    </DashboardLayout>
  );

  const activePedido = lead.pedidos?.[0];

  return (
    <DashboardLayout
      title={lead.titulo || `Negociação: ${lead.cliente?.nome}`}
      subtitle={`Vendedor: ${lead.vendedor?.email}`}
    >
      <Box p={4}>
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link component="button" onClick={() => router.push("/crm")} underline="hover" color="inherit">CRM</Link>
          <Typography color="text.primary">Detalhes do Lead</Typography>
        </Breadcrumbs>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ borderRadius: 4, mb: 3, border: '1px solid', borderColor: 'divider' }} elevation={0}>
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
                  <Box>
                    <Typography variant="h5" fontWeight="800" gutterBottom>{lead.cliente?.nome}</Typography>
                    <Box display="flex" gap={2} alignItems="center">
                      <Chip label={lead.status} color="primary" variant="outlined" size="small" sx={{ fontWeight: 'bold' }} />
                      <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                        <Clock size={14} /> Atualizado {new Date(lead.updatedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="h4" fontWeight="900" color="success.main">
                      {Number(activePedido?.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Valor do Orçamento Ativo</Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ mb: 3 }}>
                  <Tab icon={<MessageSquare size={18} />} iconPosition="start" label="Negociação & Timeline" />
                  <Tab icon={<Package size={18} />} iconPosition="start" label="Orçamento & Itens" />
                </Tabs>

                {/* TAB 0: TIMELINE DO LEAD */}
                {activeTab === 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight="700" mb={2}>Histórico da Negociação</Typography>
                    <List sx={{ mb: 3 }}>
                      {leadComments.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">Sem comentários registrados no lead.</Typography>
                      ) : (
                        leadComments.map((c, idx) => (
                          <ListItem key={idx} alignItems="flex-start" sx={{ px: 0, py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', mr: 1.5 }}>
                              {c.usuario?.email?.charAt(0).toUpperCase()}
                            </Avatar>
                            <ListItemText
                              primary={<Box display="flex" justifyContent="space-between"><Typography variant="caption" fontWeight="bold">{c.usuario?.email}</Typography><Typography variant="caption" color="text.secondary">{new Date(c.createdAt).toLocaleString()}</Typography></Box>}
                              secondary={<Typography variant="body2">{c.texto}</Typography>}
                            />
                          </ListItem>
                        ))
                      )}
                    </List>
                    <Box display="flex" gap={1}>
                      <TextField fullWidth size="small" placeholder="Escreva algo sobre esta negociação..." value={newLeadComment} onChange={(e) => setNewLeadComment(e.target.value)} />
                      <IconButton color="primary" onClick={handleAddLeadComment}><Send size={20} /></IconButton>
                    </Box>
                  </Box>
                )}

                {/* TAB 1: ORÇAMENTO */}
                {activeTab === 1 && (
                  <Box>
                    {activePedido ? (
                      <>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                           <Typography variant="subtitle2" fontWeight="700">Itens do Orçamento #{activePedido.numero}</Typography>
                           {activePedido.nunota && <Chip label={`Sankhya: ${activePedido.nunota}`} size="small" color="success" />}
                        </Box>

                        <Box sx={{ position: 'relative', mb: 3 }}>
                          <TextField fullWidth size="small" placeholder="Adicionar produto..." value={searchQuery} onChange={(e) => handleSearchProducts(e.target.value)} InputProps={{ startAdornment: <Search size={18} style={{ marginRight: 8 }} /> }} />
                          {searchResults.length > 0 && (
                            <Paper sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxHeight: 300, overflowY: 'auto', mt: 1, boxShadow: 4, borderRadius: 2 }}>
                              <List>
                                {searchResults.map((prod) => (
                                  <ListItem key={prod.CODPROD} component="button" onClick={() => onSelectItem(prod)} sx={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                                    <ListItemText primary={prod.DESCRPROD} secondary={`Preço: R$ ${prod.PRECOVenda || 0}`} />
                                    <Plus size={18} color="green" />
                                  </ListItem>
                                ))}
                              </List>
                            </Paper>
                          )}
                        </Box>

                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, mb: 4 }}>
                          <Table size="small">
                            <TableHead sx={{ bgcolor: "grey.50" }}>
                              <TableRow>
                                <TableCell>Produto</TableCell>
                                <TableCell align="center">Qtd</TableCell>
                                <TableCell align="right">Unitário</TableCell>
                                <TableCell align="right">Total</TableCell>
                                <TableCell align="center">Ações</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {activePedido.itens?.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell><Typography variant="body2" fontWeight="bold">{item.codProd}</Typography><Typography variant="caption">{item.descricao}</Typography></TableCell>
                                  <TableCell align="center">{item.quantidade}</TableCell>
                                  <TableCell align="right">R$ {Number(item.precoUnitario).toFixed(2)}</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>R$ {Number(item.precoTotal).toFixed(2)}</TableCell>
                                  <TableCell align="center"><IconButton color="error" size="small" onClick={() => handleRemoveItem(item.id)}><Trash2 size={16} /></IconButton></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>

                        <Divider sx={{ my: 3 }} />
                        <Typography variant="subtitle2" fontWeight="700" mb={1}>Comentários Técnicos do Orçamento</Typography>
                        <List sx={{ mb: 2 }}>
                          {orderComments.map((c, idx) => (
                            <ListItem key={idx} sx={{ px: 0, py: 1 }}>
                              <ListItemText primary={<Typography variant="caption" fontWeight="bold">{c.usuario?.email}</Typography>} secondary={<Typography variant="body2">{c.texto}</Typography>} />
                            </ListItem>
                          ))}
                        </List>
                        <Box display="flex" gap={1}>
                          <TextField fullWidth size="small" label="Comentário sobre itens/preços..." value={newOrderComment} onChange={(e) => setNewOrderComment(e.target.value)} />
                          <IconButton onClick={handleAddOrderComment}><Send size={20} /></IconButton>
                        </Box>
                      </>
                    ) : (
                      <Box textAlign="center" py={5}>
                        <Package size={48} color="#ccc" style={{ marginBottom: 16 }} />
                        <Typography color="text.secondary">Esta negociação ainda não possui um orçamento vinculado.</Typography>
                        <Button variant="contained" color="success" sx={{ mt: 2 }} onClick={() => onSelectItem({ CODPROD: 0, DESCRPROD: 'Item Inicial' })}>Criar Primeiro Orçamento</Button>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Box display="flex" flexDirection="column" gap={3}>
              {activePedido && (
                <Button variant="contained" fullWidth size="large" startIcon={<RefreshCw />} color="success" onClick={handleSyncSankhya} sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold' }}>
                  Sincronizar com Sankhya
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

              <Card sx={{ borderRadius: 4, bgcolor: 'grey.50' }} elevation={0}>
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
    </DashboardLayout>
  );
}
