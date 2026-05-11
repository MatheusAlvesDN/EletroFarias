"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Divider,
  Breadcrumbs,
  Link,
  CircularProgress,
  Tabs,
  Tab,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Select,
  MenuItem,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { crmService } from "@/lib/crmService";
import { useAuth } from "@/hooks/useAuth";
import { generateOrderPdf } from "@/utils/pdfGenerator";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DownloadIcon from "@mui/icons-material/Download";
import DashboardIcon from "@mui/icons-material/Dashboard";

function NewOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const clienteId = searchParams.get("clienteId");
  
  const { userId, email, ready } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [internalQuery, setInternalQuery] = useState("");
  const [leadTag, setLeadTag] = useState<string | null>(null);
  
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<any[]>([]);
  const [savedOrder, setSavedOrder] = useState<any>(null);
  const [currentArea, setCurrentArea] = useState("Geral");
  const [availableAreas, setAvailableAreas] = useState<string[]>(["Geral"]);
  
  // Detalhes
  const [selectedCodProd, setSelectedCodProd] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    crmService.listCustomers().then(data => {
      setCustomers(data);
      if (clienteId) {
        const found = data.find((c: any) => c.id === clienteId);
        if (found) setSelectedCustomer(found);
      }
    }).catch(console.error);
    
    crmService.listCrmProducts().then(setProducts).catch(console.error);

    if (leadId) {
      crmService.getLeadById(leadId).then(l => setLeadTag(l.tag)).catch(console.error);
    }
  }, [clienteId, leadId]);

  const isLid = leadTag === 'LID';

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

  function addItem(product: any) {
    if (!product) return;
    const code = String(product.codProd || product.CODPROD);
    const exists = itens.find((i) => i.codProd === code && i.area === (currentArea || 'Geral'));
    if (exists) return;

    setItens([
      ...itens,
      {
        codProd: code,
        descricao: product.descricao || product.DESCRPROD,
        quantidade: 1,
        precoUnitario: Number(product.precoVenda || product.PRECO || 0),
        marca: product.marca || product.MARCA,
        area: currentArea || 'Geral',
      },
    ]);
  }

  const handleOpenDetails = (codProd: string | number) => {
    setSelectedCodProd(String(codProd));
    setDetailModalOpen(true);
  };

  const filteredProducts = products.filter(p => {
    const q = internalQuery.toLowerCase();
    return (
      p.codProd.toLowerCase().includes(q) ||
      p.descricao.toLowerCase().includes(q) ||
      (p.marca && p.marca.toLowerCase().includes(q))
    );
  }).slice(0, 50); // Limita exibição para performance

  function removeItem(index: number) {
    setItens(itens.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: any) {
    const newItens = [...itens];
    newItens[index][field] = value;
    setItens(newItens);
  }

  const total = itens.reduce((acc, i) => acc + i.quantidade * i.precoUnitario, 0);

  const groupedItems = itens.reduce((acc, item, index) => {
    const area = item.area || 'Geral';
    if (!acc[area]) acc[area] = [];
    acc[area].push({ ...item, originalIndex: index });
    return acc;
  }, {} as Record<string, any[]>);

  async function handleSubmit() {
    if (!selectedCustomer) return alert("Selecione um cliente");
    if (itens.length === 0) return alert("Adicione ao menos um item");

    setLoading(true);
    try {
      if (!userId) throw new Error("Vendedor não identificado.");

      const response = await crmService.createOrder({
        clienteId: selectedCustomer.id,
        leadId: leadId || undefined,
        userId,
        observacoes,
        itens,
      });
      
      setSavedOrder(response);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Erro ao criar orçamento");
    } finally {
      setLoading(false);
    }
  }

  const handleGeneratePdf = () => {
    if (!savedOrder) return;
    
    generateOrderPdf({
      orderNumber: savedOrder.id.slice(-6).toUpperCase(),
      date: new Date().toLocaleDateString('pt-BR'),
      customerName: selectedCustomer.nome,
      customerDocument: selectedCustomer.documento,
      sellerName: email?.split('@')[0] || "Vendedor",
      items: itens,
      total: total,
      observacoes: observacoes,
      tag: leadTag || searchParams.get("tag") || undefined
    });
  };

  if (savedOrder) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="70vh" gap={4}>
        <CheckCircleIcon sx={{ fontSize: 100, color: "success.main" }} />
        <Box textAlign="center">
          <Typography variant="h4" fontWeight="900" gutterBottom>Orçamento Salvo!</Typography>
          <Typography variant="body1" color="text.secondary">O orçamento foi registrado com sucesso no sistema.</Typography>
        </Box>
        
        <Box display="flex" gap={2}>
          <Button 
            variant="contained" 
            size="large" 
            startIcon={<DownloadIcon />} 
            onClick={handleGeneratePdf}
            sx={{ borderRadius: 4, px: 4 }}
          >
            Baixar Proposta (PDF)
          </Button>
          <Button 
            variant="outlined" 
            size="large" 
            startIcon={<DashboardIcon />} 
            onClick={() => {
              if (leadId) router.push(`/crm/lead/${leadId}`);
              else router.push(`/crm/${searchParams.get("tag")?.toLowerCase() || "lid"}`);
            }}
            sx={{ borderRadius: 4, px: 4 }}
          >
            Ir para o Funil
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box p={4} display="flex" flexDirection="column" gap={3}>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link underline="hover" color="inherit" onClick={(e) => { e.preventDefault(); router.push(`/crm/${searchParams.get("tag")?.toLowerCase() || "lid"}`); }} sx={{ cursor: "pointer" }}>
          CRM
        </Link>
        <Typography color="text.primary">Novo Orçamento</Typography>
      </Breadcrumbs>

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(`/crm/${searchParams.get("tag")?.toLowerCase() || "lid"}`)}>
          Voltar ao Funil
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSubmit}
          disabled={loading || itens.length === 0}
          sx={{ px: 4, borderRadius: "xl" }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Salvar Orçamento"}
        </Button>
      </Box>

      <Box display="flex" gap={3}>
        {/* LADO ESQUERDO: INFOS E ITENS */}
        <Box flex={2} display="flex" flexDirection="column" gap={3}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" mb={3}>Dados do Cliente</Typography>
              <Autocomplete
                options={customers}
                getOptionLabel={(option) => `${option.nome} ${option.documento ? `(${option.documento})` : ""}`}
                value={selectedCustomer}
                onChange={(_, val) => setSelectedCustomer(val)}
                renderInput={(params) => <TextField {...params} label="Cliente *" required variant="filled" />}
              />
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
                <Typography variant="h6" fontWeight="bold">Adicionar Produtos</Typography>
                {isLid && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color="text.secondary">Área Atual:</Typography>
                    <Select
                      size="small"
                      value={currentArea}
                      onChange={(e) => setCurrentArea(e.target.value)}
                      sx={{ height: 36, minWidth: 150, bgcolor: 'grey.50', borderRadius: 2 }}
                    >
                      {availableAreas.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                    </Select>
                    <Button size="small" variant="outlined" onClick={handleAddArea} sx={{ borderRadius: 2 }}>
                      + Nova
                    </Button>
                  </Box>
                )}
              </Box>
              <Box display="flex" gap={1} mb={2}>
                <TextField 
                  fullWidth 
                  size="small" 
                  placeholder="Pesquisar por código, descrição ou marca no catálogo..." 
                  value={internalQuery}
                  onChange={(e) => setInternalQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              
              <TableContainer sx={{ maxHeight: 350 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: 'grey.50', fontWeight: 'bold' }}>Cód</TableCell>
                      <TableCell sx={{ bgcolor: 'grey.50', fontWeight: 'bold' }}>Descrição</TableCell>
                      <TableCell sx={{ bgcolor: 'grey.50', fontWeight: 'bold' }} align="right">Ação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredProducts.map(p => (
                      <TableRow key={p.codProd} hover>
                        <TableCell>{p.codProd}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{p.descricao}</Typography>
                          {p.marca && <Typography variant="caption" color="text.secondary">{p.marca}</Typography>}
                        </TableCell>
                        <TableCell align="right">
                          <Box display="flex" gap={1} justifyContent="flex-end">
                            <Tooltip title="Ver Detalhes">
                              <IconButton size="small" color="primary" onClick={() => handleOpenDetails(p.codProd)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              onClick={() => addItem(p)}
                              disabled={itens.some(i => i.codProd === p.codProd && i.area === (currentArea || 'Geral'))}
                            >
                              {itens.some(i => i.codProd === p.codProd && i.area === (currentArea || 'Geral')) ? "Adicionado" : "Add"}
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredProducts.length === 0 && internalQuery && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                          Nenhum produto encontrado para "{internalQuery}"
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead sx={{ bgcolor: "grey.50" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Produto</TableCell>
                  <TableCell width={120} align="center" sx={{ fontWeight: "bold" }}>Quantidade</TableCell>
                  <TableCell width={160} align="right" sx={{ fontWeight: "bold" }}>Preço Unitário</TableCell>
                  <TableCell width={160} align="right" sx={{ fontWeight: "bold" }}>Subtotal</TableCell>
                  <TableCell width={60}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(Object.entries(groupedItems) as [string, any[]][]).map(([areaName, itemsInArea]) => (
                  <React.Fragment key={areaName}>
                    {isLid && (
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell colSpan={5}>
                          <Typography variant="subtitle2" fontWeight="bold" color="primary">
                            {areaName.toUpperCase()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {itemsInArea.map((item) => (
                      <TableRow key={`${item.codProd}-${item.area}`}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <IconButton size="small" onClick={() => handleOpenDetails(item.codProd)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">{item.codProd}</Typography>
                              <Typography variant="caption" color="text.secondary">{item.descricao}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={item.quantidade}
                            onChange={(e) => updateItem(item.originalIndex, "quantidade", Number(e.target.value))}
                            inputProps={{ style: { textAlign: 'center' } }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={item.precoUnitario}
                            onChange={(e) => updateItem(item.originalIndex, "precoUnitario", Number(e.target.value))}
                            InputProps={{ startAdornment: <Typography variant="caption" sx={{ mr: 1 }}>R$</Typography> }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {(item.quantidade * item.precoUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton color="error" size="small" onClick={() => removeItem(item.originalIndex)}>
                            <DeleteIcon fontSize="inherit" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
                {itens.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <Typography color="text.secondary">Nenhum item adicionado ao orçamento.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* LADO DIREITO: RESUMO E OBS */}
        <Box flex={1} display="flex" flexDirection="column" gap={3}>
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: "slate.50" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" mb={2}>Resumo Financeiro</Typography>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Total de Itens</Typography>
                <Typography fontWeight="medium">{itens.length}</Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography color="text.secondary">Subtotal</Typography>
                <Typography fontWeight="medium">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Typography>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight="bold">Total</Typography>
                <Typography variant="h5" fontWeight="900" color="primary">
                  {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" mb={1}>Observações Internas</Typography>
              <TextField
                multiline
                rows={4}
                fullWidth
                placeholder="Instruções de entrega, detalhes da negociação, etc..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      <ProductDetailModal 
        open={detailModalOpen} 
        onClose={() => setDetailModalOpen(false)} 
        codProd={selectedCodProd} 
      />
    </Box>
  );
}

export default function NewOrderPage() {
  return (
    <DashboardLayout
      title="Novo Orçamento"
      subtitle="Monte orçamentos detalhados com produtos do catálogo"
    >
      <Suspense fallback={
        <Box p={4} display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress color="success" />
        </Box>
      }>
        <NewOrderContent />
      </Suspense>
    </DashboardLayout>
  );
}

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
      const data = await crmService.getProduct(codProd!);
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
        <Typography variant="h6" fontWeight="bold">Detalhes do Produto</Typography>
        <IconButton onClick={onClose} sx={{ color: "white" }}><CloseIcon /></IconButton>
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
                        {Number(produto.precoVenda || produto.PRECO).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">ESTOQUE (1100)</Typography>
                      <Box sx={{ bgcolor: "white", p: 1, borderRadius: 2, border: 1, borderColor: "divider", fontWeight: "bold", color: (produto.estoque || produto.ESTOQUE) > 0 ? "success.main" : "error.main" }}>
                        {produto.estoque || produto.ESTOQUE} un
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
