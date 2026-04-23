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
  Link
} from "@mui/material";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Package,
  Trash2,
  RefreshCw,
  Search,
  Plus,
  Send
} from "lucide-react";
import { crmService } from "@/lib/crmService";

export default function PedidoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pedidoId = params.id as string;

  const [pedido, setPedido] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Comentários
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  const [agenda, setAgenda] = useState<any[]>([]);
  const [newAgenda, setNewAgenda] = useState({ titulo: "", dataAgendada: "" });

  // Busca de Produtos para Adicionar
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

  useEffect(() => {
    if (pedidoId) {
      loadPedido();
    }
  }, [pedidoId]);

  async function loadPedido() {
    setLoading(true);
    try {
      // Como não temos um endpoint de "detalhes" único, buscamos o funil e filtramos
      // Ou melhor, implementamos um endpoint de detalhe no backend depois.
      // Por enquanto, vamos buscar todos e filtrar (temporário)
      const all = await crmService.listFunnel();
      const found = all.find((p: any) => p.id === pedidoId);
      if (found) {
        setPedido(found);
        loadSecondaryData(found.id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSecondaryData(id: string) {
    try {
      const [commentsData, agendaData] = await Promise.all([
        crmService.listComments(id),
        crmService.listAgenda(id)
      ]);
      setComments(commentsData);
      setAgenda(agendaData);
    } catch (e) {
      console.error(e);
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await crmService.addComment(pedidoId, newComment);
      setNewComment("");
      const updated = await crmService.listComments(pedidoId);
      setComments(updated);
    } catch (e) { alert("Erro ao adicionar comentário"); }
  };

  const handleAddAgenda = async () => {
    if (!newAgenda.titulo || !newAgenda.dataAgendada) return;
    try {
      await crmService.addAgenda(pedidoId, {
        titulo: newAgenda.titulo,
        dataAgendada: new Date(newAgenda.dataAgendada).toISOString()
      });
      setNewAgenda({ titulo: "", dataAgendada: "" });
      const updated = await crmService.listAgenda(pedidoId);
      setAgenda(updated);
    } catch (e) { alert("Erro ao agendar"); }
  };

  const handleSyncSankhya = async () => {
    try {
      await crmService.syncToSankhya(pedidoId);
      alert("Sincronizado com sucesso com o Sankhya!");
      loadPedido();
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
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const onSelectItem = async (prod: any) => {
    const qtd = window.prompt(`Digite a quantidade para ${prod.DESCRPROD}:`, "1");
    if (!qtd || isNaN(Number(qtd))) return;

    try {
      setIsAddingItem(true);
      await crmService.addItem(pedidoId, {
        codProd: prod.CODPROD,
        descricao: prod.DESCRPROD,
        quantidade: Number(qtd),
        precoUnitario: Number(prod.PRECOVenda || 0)
      });
      setSearchQuery("");
      setSearchResults([]);
      loadPedido(); // Recarrega tudo (incluindo o nunota e total)
    } catch (e) {
      alert("Erro ao adicionar item");
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!window.confirm("Tem certeza que deseja remover este item? A nota no Sankhya também será atualizada.")) return;
    try {
      await crmService.removeItem(pedidoId, itemId);
      loadPedido();
    } catch (e) {
      alert("Erro ao remover item");
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Carregando...">
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
          <CircularProgress color="success" />
        </Box>
      </DashboardLayout>
    );
  }

  if (!pedido) {
    return (
      <DashboardLayout title="Pedido não encontrado">
        <Box p={4} textAlign="center">
          <Typography>O pedido solicitado não existe ou você não tem permissão para vê-lo.</Typography>
          <Button startIcon={<ArrowLeft />} onClick={() => router.back()} sx={{ mt: 2 }}>
            Voltar ao Funil
          </Button>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Pedido #${pedido.numero || pedido.id.slice(-6)}`}
      subtitle={`Cliente: ${pedido.cliente?.nome}`}
    >
      <Box p={4}>
        {/* BREADCRUMBS */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link component="button" onClick={() => router.push("/crm")} underline="hover" color="inherit">
            CRM
          </Link>
          <Typography color="text.primary">Detalhes do Pedido</Typography>
        </Breadcrumbs>

        <Grid container spacing={3}>
          {/* LADO ESQUERDO: INFORMAÇÕES PRINCIPAIS */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ borderRadius: 4, mb: 3, border: '1px solid', borderColor: 'divider' }} elevation={0}>
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
                  <Box>
                    <Typography variant="h5" fontWeight="800" gutterBottom>
                      {pedido.cliente?.nome}
                    </Typography>
                    <Box display="flex" gap={2} alignItems="center">
                      <Chip
                        label={pedido.status}
                        color="primary"
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                      <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                        <Clock size={14} /> Atualizado em {new Date(pedido.updatedAt).toLocaleDateString()}
                      </Typography>
                      {pedido.nunota && (
                        <Chip 
                          label={`Sankhya: ${pedido.nunota}`} 
                          size="small" 
                          color="success" 
                          variant="filled" 
                          sx={{ fontWeight: 'bold' }}
                        />
                      )}
                    </Box>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="h4" fontWeight="900" color="success.main">
                      R$ {Number(pedido.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Valor Total Estimado</Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ mb: 3 }}>
                  <Tab icon={<Package size={18} />} iconPosition="start" label="Itens do Pedido" />
                  <Tab icon={<FileText size={18} />} iconPosition="start" label="Observações" />
                </Tabs>

                {activeTab === 0 && (
                  <Box>
                    {/* BUSCA DE PRODUTOS */}
                    <Box sx={{ position: 'relative', mb: 3 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Pesquisar produto no Sankhya para adicionar..."
                        value={searchQuery}
                        onChange={(e) => handleSearchProducts(e.target.value)}
                        InputProps={{
                          startAdornment: <Search size={18} style={{ marginRight: 8, color: '#666' }} />
                        }}
                      />
                      
                      {searchResults.length > 0 && (
                        <Paper sx={{ 
                          position: 'absolute', 
                          top: '100%', 
                          left: 0, 
                          right: 0, 
                          zIndex: 10, 
                          maxHeight: 300, 
                          overflowY: 'auto',
                          mt: 1,
                          boxShadow: 4,
                          borderRadius: 2
                        }}>
                          <List>
                            {searchResults.map((prod) => (
                              <ListItem 
                                key={prod.CODPROD} 
                                component="button"
                                onClick={() => onSelectItem(prod)}
                                sx={{ textAlign: 'left', borderBottom: '1px solid #eee' }}
                              >
                                <ListItemText 
                                  primary={prod.DESCRPROD} 
                                  secondary={`Cód: ${prod.CODPROD} | Marca: ${prod.MARCA} | Preço: R$ ${prod.PRECOVenda || 0}`} 
                                />
                                <Plus size={18} color="#2e7d32" />
                              </ListItem>
                            ))}
                          </List>
                        </Paper>
                      )}
                    </Box>

                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                      <Table>
                        <TableHead sx={{ bgcolor: "grey.50" }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Produto</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Qtd</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Unitário</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pedido.itens?.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">{item.codProd}</Typography>
                                <Typography variant="caption" color="text.secondary">{item.descricao}</Typography>
                              </TableCell>
                              <TableCell align="center">{item.quantidade}</TableCell>
                              <TableCell align="right">R$ {Number(item.precoUnitario).toFixed(2)}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>R$ {Number(item.precoTotal).toFixed(2)}</TableCell>
                              <TableCell align="center">
                                <IconButton color="error" size="small" onClick={() => handleRemoveItem(item.id)}>
                                  <Trash2 size={16} />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {activeTab === 1 && (
                  <Box p={2} bgcolor="grey.50" borderRadius={2} minHeight={100}>
                    <Typography variant="body2">
                      {pedido.observacoes || "Nenhuma observação interna registrada."}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* LADO DIREITO: INTERAÇÕES (COMENTÁRIOS E AGENDA) */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Box display="flex" flexDirection="column" gap={3}>

              {/* BOTÃO SYNC */}
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<RefreshCw />}
                color="success"
                onClick={handleSyncSankhya}
                disabled={pedido.status === 'FATURADO'}
                sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold', boxShadow: 3 }}
              >
                {pedido.status === 'FATURADO' ? 'Já Sincronizado' : 'Sincronizar com Sankhya'}
              </Button>

              {/* ABA DE COMENTÁRIOS */}
              <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }} elevation={0}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" display="flex" alignItems="center" gap={1} mb={2}>
                    <Send size={18} className="text-emerald-600" /> Histórico de Comentários
                  </Typography>

                  <Box sx={{ maxHeight: 300, overflowY: 'auto', mb: 2 }}>
                    <List sx={{ p: 0 }}>
                      {comments.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">Nenhum comentário ainda.</Typography>
                      ) : (
                        comments.map((c, idx) => (
                          <ListItem key={idx} alignItems="flex-start" sx={{ px: 0, py: 1.5, borderBottom: idx < comments.length - 1 ? '1px solid' : 'none', borderColor: 'grey.100' }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'emerald.100', color: 'emerald.700', fontSize: 12, mr: 1.5 }}>
                              {c.usuario?.email?.charAt(0).toUpperCase() || "U"}
                            </Avatar>
                            <ListItemText
                              primary={
                                <Box display="flex" justifyContent="space-between">
                                  <Typography variant="caption" fontWeight="bold">{c.usuario?.email}</Typography>
                                  <Typography variant="caption" color="text.secondary">{new Date(c.createdAt).toLocaleString()}</Typography>
                                </Box>
                              }
                              secondary={<Typography variant="body2" sx={{ mt: 0.5 }}>{c.texto}</Typography>}
                            />
                          </ListItem>
                        ))
                      )}
                    </List>
                  </Box>

                  <Box display="flex" gap={1}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Adicionar comentário..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <IconButton color="success" onClick={handleAddComment}>
                      <Send size={20} />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>

              {/* ABA DE AGENDA */}
              <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }} elevation={0}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" display="flex" alignItems="center" gap={1} mb={2}>
                    <Calendar size={18} className="text-emerald-600" /> Agenda de Lembretes
                  </Typography>

                  <Box sx={{ maxHeight: 250, overflowY: 'auto', mb: 2 }}>
                    {agenda.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">Sem atividades agendadas.</Typography>
                    ) : (
                      agenda.map((a, idx) => (
                        <Box key={idx} sx={{ p: 1.5, mb: 1, bgcolor: a.concluido ? 'grey.50' : 'emerald.50', borderRadius: 2, borderLeft: '4px solid', borderColor: a.concluido ? 'grey.300' : 'emerald.500' }}>
                          <Typography variant="body2" fontWeight="bold">{a.titulo}</Typography>
                          <Typography variant="caption" display="flex" alignItems="center" gap={0.5}>
                            <Clock size={12} /> {new Date(a.dataAgendada).toLocaleString()}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Box>

                  <Box display="flex" flexDirection="column" gap={1.5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Título do Lembrete"
                      value={newAgenda.titulo}
                      onChange={(e) => setNewAgenda({ ...newAgenda, titulo: e.target.value })}
                    />
                    <Box display="flex" gap={1}>
                      <TextField
                        type="datetime-local"
                        fullWidth
                        size="small"
                        value={newAgenda.dataAgendada}
                        onChange={(e) => setNewAgenda({ ...newAgenda, dataAgendada: e.target.value })}
                      />
                      <Button variant="outlined" color="success" onClick={handleAddAgenda}>
                        Agendar
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

            </Box>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
}
