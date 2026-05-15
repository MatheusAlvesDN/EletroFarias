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
  Alert,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
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
  Send,
  Paperclip,
  Download,
  X,
  ChevronRight,
  Info,
  ShoppingCart,
  Save,
  MessageSquare,
  LayoutDashboard,
  User
} from "lucide-react";
import { crmService } from "@/lib/crmService";
import { databaseService } from "@/lib/databaseService";
import { useAuth } from "@/hooks/useAuth";
import { generateOrderPdf } from "@/utils/pdfGenerator";

function ProductDetailModal({ open, onClose, codProd }: { open: boolean, onClose: () => void, codProd: string | null }) {
  const [produto, setProduto] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && codProd) {
      fetchDetails();
    } else if (!open) {
      setProduto(null);
    }
  }, [open, codProd]);

  async function fetchDetails() {
    setLoading(true);
    try {
      const data = await databaseService.getProductDetail(codProd!);
      setProduto(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "primary.main", color: "white", py: 2 }}>
        <Typography variant="h6" component="span" fontWeight="bold">Detalhes do Produto</Typography>
        <IconButton onClick={onClose} sx={{ color: "white" }}><X /></IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, bgcolor: "grey.50" }}>
        {loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={10} gap={2}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">Buscando informações no Sankhya...</Typography>
          </Box>
        ) : produto ? (
          <Box p={3}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 3 }}>
              <Box>
                <Paper variant="outlined" sx={{ p: 2, display: "flex", justifyContent: "center", bgcolor: "white", borderRadius: 2 }}>
                  <img
                    src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${produto.CODPROD}.dbimage`}
                    alt={produto.DESCRPROD}
                    style={{ width: "100%", height: "auto", maxHeight: 200, objectFit: "contain" }}
                    onError={(e) => { (e.target as any).src = "https://placehold.co/200x200?text=Sem+Imagem"; }}
                  />
                </Paper>
              </Box>
              
              <Box>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ display: "block", mb: 0.5 }}>DESCRIÇÃO</Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ bgcolor: "white", p: 1.5, borderRadius: 2, border: 1, borderColor: "divider" }}>
                      {produto.DESCRPROD}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">CÓD. PROD</Typography>
                      <Box sx={{ bgcolor: "white", p: 1, borderRadius: 2, border: 1, borderColor: "divider", fontWeight: "medium" }}>{produto.CODPROD}</Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">MARCA</Typography>
                      <Box sx={{ bgcolor: "white", p: 1, borderRadius: 2, border: 1, borderColor: "divider", fontWeight: "medium" }}>{produto.MARCA || "-"}</Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">CATEGORIA</Typography>
                      <Box sx={{ bgcolor: "white", p: 1, borderRadius: 2, border: 1, borderColor: "divider", fontWeight: "medium" }}>{produto.CODGRUPOPROD || "-"}</Box>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">PREÇO (TAB. 0)</Typography>
                      <Box sx={{ bgcolor: "white", p: 1, borderRadius: 2, border: 1, borderColor: "divider", fontWeight: "bold", color: "primary.main" }}>
                        {Number(produto.PRECO || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">ESTOQUE (1100)</Typography>
                      <Box sx={{ bgcolor: "white", p: 1, borderRadius: 2, border: 1, borderColor: "divider", fontWeight: "bold", color: (produto.ESTOQUE) > 0 ? "success.main" : "error.main" }}>
                        {produto.ESTOQUE} un
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">LOCALIZAÇÃO</Typography>
                      <Box sx={{ bgcolor: "white", p: 1, borderRadius: 2, border: 1, borderColor: "divider", fontWeight: "medium" }}>{produto.LOCALIZACAO || "-"}</Box>
                    </Box>
                  </Box>
                </Stack>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box p={5} textAlign="center">
            <Typography color="error">Erro ao carregar detalhes.</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, bgcolor: "grey.100", borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose} variant="outlined">Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function PedidoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pedidoId = params.id as string;
  const { email } = useAuth();

  const [pedido, setPedido] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Comentários
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  const [agenda, setAgenda] = useState<any[]>([]);
  const [newAgenda, setNewAgenda] = useState({ titulo: "", dataAgendada: "" });
  const [isEditingObs, setIsEditingObs] = useState(false);
  const [tempObs, setTempObs] = useState("");
  const [tempCodTipVenda, setTempCodTipVenda] = useState("11");
  
  const negotiationTypes = [
    { code: '11', label: 'À VISTA' },
    { code: '12', label: 'A PRAZO' },
    { code: '3', label: 'DINHEIRO' },
    { code: '26', label: 'CARTÃO DÉBITO' },
    { code: '27', label: 'CARTÃO CRÉDITO' },
    { code: '30', label: 'PIX' },
    { code: '1', label: 'BOLETO' },
  ];

  // Busca de Produtos
  const [internalQuery, setInternalQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [currentArea, setCurrentArea] = useState("Geral");
  const [availableAreas, setAvailableAreas] = useState<string[]>(["Geral"]);

  // Detalhes
  const [selectedCodProd, setSelectedCodProd] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    if (pedidoId) {
      loadPedido();
    }
  }, [pedidoId]);

  // Busca de Produtos
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (internalQuery.length > 2) {
        setSearchingProducts(true);
        try {
          const data = await databaseService.searchProducts(internalQuery, pedido?.lead?.tag || undefined);
          setProducts(data);
        } catch (e) {
          console.error(e);
        } finally {
          setSearchingProducts(false);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [internalQuery, pedido?.lead?.tag]);

  const isLid = pedido?.lead?.tag === 'LID';

  async function loadPedido(isSilent = false) {
    if (!isSilent) setLoading(true);
    try {
      const found = await crmService.getPedido(pedidoId);
      if (found) {
        setPedido(found);
        setTempObs(found.observacoes || "");
        setTempCodTipVenda(found.codTipVenda || "11");
        loadSecondaryData(found);

        // EXTRAIR ÁREAS JÁ EXISTENTES NOS ITENS DESSE PEDIDO (apenas se for LID)
        if (found.lead?.tag === 'LID' && found.itens && found.itens.length > 0) {
          const areasUnicas = Array.from(new Set(found.itens.map((i: any) => i.area || "Geral"))) as string[];
          setAvailableAreas(prev => Array.from(new Set([...prev, ...areasUnicas])));
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }
  async function loadSecondaryData(ped: any) {
    try {
      const [commentsData, agendaData, attachmentsData] = await Promise.all([
        crmService.listComments({ pedidoId: ped.id }),
        crmService.listAgenda(ped.leadId),
        crmService.listAttachments(ped.id)
      ]);
      setComments(commentsData);
      setAgenda(agendaData);
      setAttachments(attachmentsData);
    } catch (e) {
      console.error(e);
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await crmService.addComment({ pedidoId, texto: newComment });
      setNewComment("");
      const updated = await crmService.listComments({ pedidoId });
      setComments(updated);
    } catch (e) { alert("Erro ao adicionar comentário"); }
  };

  const handleAddAgenda = async () => {
    if (!newAgenda.titulo || !newAgenda.dataAgendada) return;
    try {
      await crmService.createAgenda({
        leadId: pedido.leadId,
        titulo: newAgenda.titulo,
        dataAgendada: new Date(newAgenda.dataAgendada).toISOString()
      });
      setNewAgenda({ titulo: "", dataAgendada: "" });
      const updated = await crmService.listAgenda(pedido.leadId);
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

  const handleAddArea = () => {
    const novaArea = window.prompt("Digite o nome da nova área (ex: Quarto do Casal):");
    if (novaArea && novaArea.trim() !== "") {
      const areaName = novaArea.trim();
      if (!availableAreas.includes(areaName)) {
        setAvailableAreas([...availableAreas, areaName]);
      }
      setCurrentArea(areaName);
    }
  };

  const addItem = async (prod: any) => {
    try {
      setIsAddingItem(true);
      await crmService.addItem(pedidoId, {
        codProd: Number(prod.codProd || prod.CODPROD),
        descricao: prod.descricao || prod.DESCRPROD,
        quantidade: 1,
        precoUnitario: Number(prod.precoVenda || prod.PRECOVENDA || prod.PRECO || 0),
        area: currentArea || 'Geral'
      });
      loadPedido(true); // Recarrega silenciosamente
    } catch (e) {
      alert("Erro ao adicionar item");
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleUpdateItem = async (itemId: string, field: "quantidade" | "precoUnitario", value: number) => {
    try {
      await crmService.updateItem(pedidoId, itemId, { [field]: value });
      loadPedido(true);
    } catch (e) {
      alert("Erro ao atualizar item");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!window.confirm("Tem certeza que deseja remover este item? A nota no Sankhya também será atualizada.")) return;
    try {
      await crmService.removeItem(pedidoId, itemId);
      loadPedido(true);
    } catch (e) {
      alert("Erro ao remover item");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await crmService.uploadAttachment(pedidoId, file);
      const updated = await crmService.listAttachments(pedidoId);
      setAttachments(updated);
    } catch (e) {
      alert("Erro ao fazer upload: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    if (!window.confirm("Deseja excluir este anexo?")) return;
    try {
      await crmService.deleteAttachment(id);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      alert("Erro ao excluir anexo");
    }
  };

  const handleGeneratePdf = () => {
    if (!pedido) return;
    
    generateOrderPdf({
      orderNumber: pedido.numero || pedido.id.slice(-6).toUpperCase(),
      date: new Date().toLocaleDateString('pt-BR'),
      customerName: pedido.cliente?.nome || "Cliente",
      customerDocument: pedido.cliente?.documento || "---",
      sellerName: email?.split('@')[0] || pedido.vendedor?.email?.split('@')[0] || "Vendedor",
      items: pedido.itens || [],
      total: pedido.valorTotal || 0,
      observacoes: pedido.observacoes || "",
      tag: pedido.lead?.tag
    });
  };

  const handleSaveObservations = async () => {
    try {
      await crmService.updateOrder(pedidoId, { 
        observacoes: tempObs,
        codTipVenda: tempCodTipVenda
      });
      setPedido({ ...pedido, observacoes: tempObs, codTipVenda: tempCodTipVenda });
      setIsEditingObs(false);
      alert("Alterações salvas com sucesso!");
    } catch (e) {
      alert("Erro ao salvar alterações");
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

  if (pedido.lead?.status === 'REPROVADO') {
    return (
      <DashboardLayout title="Orçamento Bloqueado">
        <Box p={4} textAlign="center">
          <Alert severity="error" sx={{ mb: 3 }}>
            Este orçamento não pode mais ser visualizado ou editado pois o Lead correspondente foi REPROVADO.
          </Alert>
          <Button 
            variant="contained" 
            startIcon={<ArrowLeft />} 
            onClick={() => router.push(`/crm/lead/${pedido.leadId}`)} 
            sx={{ mt: 2 }}
          >
            Voltar para o Lead
          </Button>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] bg-[#f0f2f5] overflow-hidden text-[#3e495b]">
        {/* Header Estilo Estoque */}
        <header className="bg-[#eceef1] border-b border-[#b9bfc8] p-3 shadow-sm z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => pedido.leadId ? router.push(`/crm/lead/${pedido.leadId}`) : router.push(`/crm/${pedido.lead?.tag?.toLowerCase() || 'lid'}`)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <span>CRM</span>
                  <ChevronRight size={12} />
                  <span className="text-blue-600">Edição de Orçamento</span>
                </div>
                <h1 className="text-lg font-black leading-none mt-1">PEDIDO #{pedido.numero || pedido.id.slice(-6).toUpperCase()}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <Chip 
                label={pedido.status} 
                color={pedido.status === 'FECHADO' || pedido.status === 'FATURADO' ? 'success' : 'primary'} 
                size="small" 
                sx={{ fontWeight: 'bold' }} 
              />
              {pedido.nunota && (
                <Chip 
                  label={pedido.numnota ? `Nota: ${pedido.numnota} (SNK: ${pedido.nunota})` : `Sankhya: ${pedido.nunota}`} 
                  size="small" 
                  color="success" 
                  sx={{ fontWeight: 'bold' }} 
                />
              )}
              <button
                onClick={handleGeneratePdf}
                className="flex items-center gap-2 bg-white border border-[#b9bfc8] text-gray-700 px-4 py-2 rounded font-bold hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Download size={18} /> PDF
              </button>
              <button
                onClick={handleSyncSankhya}
                disabled={pedido.status === 'FATURADO'}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={18} className={pedido.status === 'FATURADO' ? "" : "animate-spin-once"} /> {pedido.status === 'FATURADO' ? 'SINCRONIZADO' : 'SANKHYA'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="col-span-2">
              <div className="bg-white border border-[#b9bfc8] px-4 py-2 rounded shadow-sm flex items-center gap-2">
                <User size={18} className="text-blue-600" />
                <span className="font-bold text-sm truncate">{pedido.cliente?.nome}</span>
                <span className="text-xs text-gray-400">({pedido.cliente?.documento})</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs font-bold">
              <div className="bg-white border border-[#b9bfc8] px-3 py-2 rounded shadow-sm">
                TOTAL: <span className="text-blue-600 ml-1 font-black">{Number(pedido.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="bg-white border border-[#b9bfc8] px-3 py-2 rounded shadow-sm">
                ITENS: <span className="text-blue-600 ml-1">{pedido.itens?.length || 0}</span>
              </div>
            </div>
          </div>
        </header>

      {/* Main Layout com Splitter */}
      <main className="flex-1 flex overflow-hidden">
        {/* Lado Esquerdo: Busca de Produtos */}
        <section className="flex-[3] flex flex-col min-w-0 border-r border-[#b9bfc8] bg-white">
          <div className="p-3 bg-[#f8f9fa] border-b border-[#e2e4e8] flex items-center justify-between">
            <div className="flex-1 max-w-xl relative">
              <input
                type="text"
                placeholder="Pesquisar produto no catálogo Oracle..."
                className="w-full pl-10 pr-4 py-2 border border-[#c7cbd1] rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={internalQuery}
                onChange={(e) => setInternalQuery(e.target.value)}
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {searchingProducts ? <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent animate-spin rounded-full" /> : <Search size={18} />}
              </div>
            </div>
            {isLid && (
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs font-bold text-gray-400 uppercase">Área:</span>
                <select 
                  value={currentArea}
                  onChange={(e) => setCurrentArea(e.target.value)}
                  className="text-sm border border-[#c7cbd1] rounded p-1 bg-white"
                >
                  {availableAreas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <button onClick={handleAddArea} className="text-blue-600 hover:text-blue-800"><Plus size={18} /></button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-[#eceef1] border-b border-[#b9bfc8]">
                <tr>
                  <th className="p-2 text-left font-bold border-r border-[#c7cbd1] w-20">Foto</th>
                  <th className="p-2 text-left font-bold border-r border-[#c7cbd1] w-24">Cód</th>
                  <th className="p-2 text-left font-bold border-r border-[#c7cbd1]">Descrição</th>
                  <th className="p-2 text-right font-bold border-r border-[#c7cbd1] w-28">Preço</th>
                  <th className="p-2 text-left font-bold border-r border-[#c7cbd1] w-32">Marca</th>
                  <th className="p-2 text-center font-bold w-24">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {internalQuery.length < 3 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-gray-400 italic">
                      Digite ao menos 3 caracteres para buscar no catálogo...
                    </td>
                  </tr>
                ) : products.length === 0 && !searchingProducts ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-gray-400 italic">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.CODPROD || p.codProd} className="hover:bg-blue-50 transition-colors group">
                      <td className="p-1 border-r border-gray-100 text-center">
                        <div className="h-10 w-10 mx-auto rounded overflow-hidden bg-gray-50 border">
                           <img
                            src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${p.CODPROD || p.codProd}.dbimage`}
                            alt=""
                            className="h-full w-full object-contain"
                            onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/40?text=?')}
                          />
                        </div>
                      </td>
                      <td className="p-2 border-r border-gray-100 font-bold text-blue-700">{p.CODPROD || p.codProd}</td>
                      <td className="p-2 border-r border-gray-100">
                        <div className="font-medium text-gray-900">{p.DESCRPROD || p.descricao}</div>
                      </td>
                      <td className="p-2 border-r border-gray-100 text-right font-bold text-green-700">
                        {p.PRECO ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.PRECO) : 'R$ 0,00'}
                      </td>
                      <td className="p-2 border-r border-gray-100 text-gray-500">{p.MARCA || p.marca || "-"}</td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                             onClick={() => {
                              setSelectedCodProd(String(p.CODPROD || p.codProd));
                              setDetailModalOpen(true);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Info size={16} />
                          </button>
                          <button
                            onClick={() => addItem(p)}
                            disabled={isAddingItem || (pedido?.itens || []).some((i: any) => i.codProd === Number(p.codProd || p.CODPROD) && (i.area || 'Geral') === currentArea)}
                            className={`p-1 rounded shadow-sm transition-colors ${
                              (pedido?.itens || []).some((i: any) => i.codProd === Number(p.codProd || p.CODPROD) && (i.area || 'Geral') === currentArea)
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-green-500 text-white hover:bg-green-600"
                            }`}
                          >
                             {(pedido?.itens || []).some((i: any) => i.codProd === Number(p.codProd || p.CODPROD) && (i.area || 'Geral') === currentArea)
                              ? <CheckCircle size={16} /> 
                              : <Plus size={16} />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Lado Direito: Abas de Conteúdo */}
        <section className="flex-[2] flex flex-col min-w-0 bg-[#f8f9fa] shadow-inner border-l border-[#b9bfc8]">
          <div className="bg-[#eceef1] border-b border-[#b9bfc8] flex flex-wrap">
            <button 
              onClick={() => setActiveTab(0)}
              className={`flex-1 min-w-[80px] p-3 font-bold text-[10px] uppercase flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 0 ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <ShoppingCart size={14} /> Itens
            </button>
            <button 
              onClick={() => setActiveTab(1)}
              className={`flex-1 min-w-[80px] p-3 font-bold text-[10px] uppercase flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 1 ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <Paperclip size={14} /> Anexos
            </button>
            <button 
              onClick={() => setActiveTab(2)}
              className={`flex-1 min-w-[80px] p-3 font-bold text-[10px] uppercase flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 2 ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <FileText size={14} /> Obs
            </button>
            <button 
              onClick={() => setActiveTab(3)}
              className={`flex-1 min-w-[80px] p-3 font-bold text-[10px] uppercase flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 3 ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <MessageSquare size={14} /> Histórico
            </button>
            <button 
              onClick={() => setActiveTab(4)}
              className={`flex-1 min-w-[80px] p-3 font-bold text-[10px] uppercase flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 4 ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <Calendar size={14} /> Agenda
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {activeTab === 0 && (
              <div className="space-y-4">
                {(() => {
                  const groupedItems = (pedido.itens || []).reduce((acc: any, item: any) => {
                    const area = item.area || 'Geral';
                    if (!acc[area]) acc[area] = [];
                    acc[area].push(item);
                    return acc;
                  }, {});

                  return (Object.entries(groupedItems) as [string, any[]][]).map(([areaName, itemsInArea]) => (
                    <div key={areaName} className="mb-6 last:mb-0">
                      {isLid && (
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-px bg-blue-200 flex-1"></div>
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{areaName}</span>
                          <div className="h-px bg-blue-200 flex-1"></div>
                        </div>
                      )}
                      <div className="space-y-2">
                        {itemsInArea.map((item: any) => (
                          <div key={item.id} className="bg-white border border-[#d1d5db] rounded shadow-sm overflow-hidden flex transition-all hover:border-blue-300">
                             <div className="w-16 bg-gray-50 flex items-center justify-center border-r border-gray-100">
                               <img
                                src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${item.codProd}.dbimage`}
                                alt=""
                                className="h-10 w-10 object-contain"
                                onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/40?text=?')}
                              />
                            </div>
                            <div className="flex-1 p-2 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <div className="truncate">
                                  <div className="text-xs font-bold text-blue-700">{item.codProd}</div>
                                  <div className="text-sm font-medium leading-tight truncate">{item.descricao}</div>
                                </div>
                                <button 
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    className="w-12 text-center text-xs border rounded p-1"
                                    defaultValue={item.quantidade}
                                    onBlur={(e) => handleUpdateItem(item.id, "quantidade", Number(e.target.value))}
                                  />
                                  <span className="text-xs text-gray-400">x</span>
                                  <div className="relative">
                                    <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">R$</span>
                                    <input
                                      type="number"
                                      className="w-20 pl-5 text-xs border rounded p-1 font-bold text-gray-700"
                                      defaultValue={item.precoUnitario}
                                      onBlur={(e) => handleUpdateItem(item.id, "precoUnitario", Number(e.target.value))}
                                    />
                                  </div>
                                </div>
                                <div className="text-sm font-black text-gray-900">
                                  {Number(item.precoTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
                {(!pedido.itens || pedido.itens.length === 0) && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50 py-10">
                    <ShoppingCart size={48} className="mb-2" />
                    <p className="text-sm font-bold uppercase tracking-widest">Nenhum item</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 1 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-xs uppercase text-gray-400">Arquivos do Orçamento</h3>
                  <button 
                    className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Plus size={14} /> NOVO ANEXO
                  </button>
                  <input id="file-upload" type="file" hidden onChange={handleFileUpload} />
                </div>
                {attachments.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-300 rounded-lg p-10 text-center text-gray-400">
                    <Paperclip size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Sem anexos.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {attachments.map((file) => (
                      <div key={file.id} className="bg-white border border-gray-200 rounded p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-50 p-2 rounded">
                            <FileText size={18} className="text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{file.nome}</div>
                            <div className="text-[10px] text-gray-400 uppercase">{new Date(file.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a 
                            href={file.url?.startsWith('http') ? file.url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${file.url}`} 
                            target="_blank" 
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Download size={16} />
                          </a>
                          <button 
                            onClick={() => handleDeleteAttachment(file.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 2 && (
              <div className="h-full flex flex-col gap-4">
                 <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xs uppercase text-gray-400">Dados do Orçamento</h3>
                    <button 
                     onClick={() => {
                       if (isEditingObs) handleSaveObservations();
                       else setIsEditingObs(true);
                     }}
                     className={`text-xs font-bold flex items-center gap-1 ${isEditingObs ? 'text-green-600' : 'text-blue-600'}`}
                    >
                      {isEditingObs ? <><CheckCircle size={14} /> SALVAR</> : <><RefreshCw size={14} /> EDITAR</>}
                    </button>
                 </div>
                 <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Tipo de Negociação</label>
                      {isEditingObs ? (
                        <select
                          className="w-full p-2 text-sm border rounded bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                          value={tempCodTipVenda}
                          onChange={(e) => setTempCodTipVenda(e.target.value)}
                        >
                          {negotiationTypes.map((type) => (
                            <option key={type.code} value={type.code}>
                              {type.code} - {type.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-2 text-sm bg-gray-50 border rounded font-bold text-blue-600">
                          {negotiationTypes.find(t => t.code === (pedido.codTipVenda || '11'))?.label || pedido.codTipVenda} ({pedido.codTipVenda || '11'})
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Observações</label>
                      {isEditingObs ? (
                        <textarea
                          className="flex-1 w-full p-4 border rounded focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                          value={tempObs}
                          onChange={(e) => setTempObs(e.target.value)}
                          placeholder="Escreva aqui as observações..."
                        />
                      ) : (
                        <div className="flex-1 bg-white border rounded p-4 text-sm text-gray-700 whitespace-pre-wrap italic overflow-auto">
                          {pedido.observacoes || "Nenhuma observação informada."}
                        </div>
                      )}
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 3 && (
              <div className="h-full flex flex-col gap-4">
                <h3 className="font-bold text-xs uppercase text-gray-400">Histórico de Comentários</h3>
                <div className="flex-1 overflow-auto space-y-3 pr-2">
                  {comments.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Nenhum comentário registrado.</p>
                  ) : (
                    comments.map((c, idx) => (
                      <div key={idx} className="bg-white border rounded p-3 shadow-sm">
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px] font-bold text-blue-600 uppercase">{c.usuario?.email?.split('@')[0]}</span>
                          <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-700">{c.texto}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <input
                    type="text"
                    className="flex-1 text-sm border rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Novo comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <button 
                    onClick={handleAddComment}
                    className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 4 && (
              <div className="h-full flex flex-col gap-4">
                <h3 className="font-bold text-xs uppercase text-gray-400">Agenda de Atividades</h3>
                <div className="flex-1 overflow-auto space-y-2 pr-2">
                   {agenda.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Sem atividades agendadas.</p>
                  ) : (
                    agenda.map((a, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border-l-4 shadow-sm ${a.concluido ? 'bg-gray-50 border-gray-300' : 'bg-emerald-50 border-emerald-500'}`}>
                        <div className="text-sm font-bold text-gray-800">{a.titulo}</div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                          <Clock size={10} /> {new Date(a.dataAgendada).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="bg-white p-3 border rounded shadow-sm space-y-2">
                  <input
                    type="text"
                    className="w-full text-sm border rounded px-3 py-2 outline-none"
                    placeholder="Título do lembrete"
                    value={newAgenda.titulo}
                    onChange={(e) => setNewAgenda({ ...newAgenda, titulo: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      className="flex-1 text-sm border rounded px-2 py-1 outline-none"
                      value={newAgenda.dataAgendada}
                      onChange={(e) => setNewAgenda({ ...newAgenda, dataAgendada: e.target.value })}
                    />
                    <button 
                      onClick={handleAddAgenda}
                      className="bg-emerald-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-emerald-700"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <ProductDetailModal 
        open={detailModalOpen} 
        onClose={() => setDetailModalOpen(false)} 
        codProd={selectedCodProd} 
      />
      </div>
    </DashboardLayout>
  );
}
