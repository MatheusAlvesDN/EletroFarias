"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Box,
  Typography,
  Button,
  TextField,
  Autocomplete,
  Paper,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from "@mui/material";
import { 
  Search, 
  ShoppingCart, 
  FileText, 
  X, 
  Plus, 
  Trash2, 
  User, 
  CheckCircle, 
  ChevronRight, 
  ArrowLeft,
  Save,
  Download,
  LayoutDashboard,
  Settings,
  Info
} from 'lucide-react';
import { crmService } from "@/lib/crmService";
import { databaseService } from "@/lib/databaseService";
import { useAuth } from "@/hooks/useAuth";
import { generateOrderPdf } from "@/utils/pdfGenerator";

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
  const [customerQuery, setCustomerQuery] = useState("");
  const [leadTag, setLeadTag] = useState<string | null>(null);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  
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
    if (clienteId) {
      crmService.listCustomers().then(data => {
        const found = data.find((c: any) => c.id === clienteId);
        if (found) setSelectedCustomer(found);
      }).catch(console.error);
    }
    
    if (leadId) {
      crmService.getLeadById(leadId).then(l => setLeadTag(l.tag)).catch(console.error);
    }
  }, [clienteId, leadId]);

  // Busca de Clientes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (customerQuery.length > 2) {
        setSearchingCustomers(true);
        try {
          const data = await databaseService.searchCustomers(customerQuery);
          setCustomers(data);
        } catch (e) {
          console.error(e);
        } finally {
          setSearchingCustomers(false);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [customerQuery]);

  // Busca de Produtos
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (internalQuery.length > 2) {
        setSearchingProducts(true);
        try {
          const data = await databaseService.searchProducts(internalQuery);
          setProducts(data);
        } catch (e) {
          console.error(e);
        } finally {
          setSearchingProducts(false);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [internalQuery]);

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

  const filteredProducts = products;

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
      <div className="flex flex-col items-center justify-center h-[70vh] gap-8 bg-gray-50">
        <div className="bg-green-100 p-6 rounded-full">
          <CheckCircle size={100} className="text-green-600" />
        </div>
        <div className="text-center">
          <h2 className="text-4xl font-black text-gray-900 mb-2">Orçamento Salvo!</h2>
          <p className="text-lg text-gray-500">O orçamento foi registrado com sucesso no sistema.</p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={handleGeneratePdf}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg"
          >
            <Download size={20} /> Baixar Proposta (PDF)
          </button>
          <button 
            onClick={() => {
              if (leadId) router.push(`/crm/lead/${leadId}`);
              else router.push(`/crm/${searchParams.get("tag")?.toLowerCase() || "lid"}`);
            }}
            className="flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all"
          >
            <LayoutDashboard size={20} /> Ir para o Funil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#f0f2f5] overflow-hidden text-[#3e495b]">
      {/* Header Estilo Estoque */}
      <header className="bg-[#eceef1] border-b border-[#b9bfc8] p-3 shadow-sm z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push(`/crm/${searchParams.get("tag")?.toLowerCase() || "lid"}`)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <span>CRM</span>
                <ChevronRight size={12} />
                <span className="text-blue-600">Novo Orçamento</span>
              </div>
              <h1 className="text-lg font-black leading-none mt-1">GERADOR DE ORÇAMENTOS</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading || itens.length === 0}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Save size={18} />}
              SALVAR ORÇAMENTO
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="col-span-2">
             <Autocomplete
                size="small"
                options={customers}
                getOptionLabel={(option) => `${option.nome} ${option.documento ? `(${option.documento})` : ""}`}
                value={selectedCustomer}
                onChange={(_, val) => setSelectedCustomer(val)}
                onInputChange={(_, val) => setCustomerQuery(val)}
                loading={searchingCustomers}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    placeholder="Selecione o Cliente..." 
                    variant="outlined" 
                    sx={{ bgcolor: 'white', borderRadius: 1 }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <div className="mr-2 text-gray-400"><User size={18} /></div>
                      ),
                      endAdornment: (
                        <React.Fragment>
                          {searchingCustomers ? <CircularProgress color="inherit" size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </React.Fragment>
                      ),
                    }}
                  />
                )}
              />
          </div>
          <div className="flex justify-end gap-2 text-xs font-bold">
            <div className="bg-white border border-[#b9bfc8] px-3 py-2 rounded shadow-sm">
              TOTAL: <span className="text-blue-600 ml-1">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="bg-white border border-[#b9bfc8] px-3 py-2 rounded shadow-sm">
              ITENS: <span className="text-blue-600 ml-1">{itens.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout com Splitter Estilo Estoque */}
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
                {products.length === 0 && !searchingProducts ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-gray-400 italic">
                      {internalQuery.length < 3 ? "Digite ao menos 3 caracteres para buscar..." : "Nenhum produto encontrado."}
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
                            onClick={() => handleOpenDetails(p.CODPROD || p.codProd)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Info size={16} />
                          </button>
                          <button
                            onClick={() => addItem(p)}
                            disabled={itens.some(i => i.codProd === String(p.CODPROD || p.codProd) && i.area === (currentArea || 'Geral'))}
                            className={`p-1 rounded shadow-sm transition-colors ${
                              itens.some(i => i.codProd === String(p.CODPROD || p.codProd) && i.area === (currentArea || 'Geral'))
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-green-500 text-white hover:bg-green-600"
                            }`}
                          >
                            {itens.some(i => i.codProd === String(p.CODPROD || p.codProd) && i.area === (currentArea || 'Geral')) 
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

        {/* Lado Direito: Carrinho e Itens Selecionados */}
        <section className="flex-[2] flex flex-col min-w-0 bg-[#f8f9fa] shadow-inner">
          <div className="p-3 bg-[#eceef1] border-b border-[#b9bfc8] flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2 uppercase tracking-tight">
              <ShoppingCart size={18} className="text-blue-600" /> Itens do Orçamento
            </h2>
            <div className="text-xs font-bold text-gray-400 bg-white px-2 py-1 rounded border">
              {itens.length} ITENS
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {(Object.entries(groupedItems) as [string, any[]][]).map(([areaName, itemsInArea]) => (
              <div key={areaName} className="mb-6 last:mb-0">
                {isLid && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px bg-blue-200 flex-1"></div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{areaName}</span>
                    <div className="h-px bg-blue-200 flex-1"></div>
                  </div>
                )}
                <div className="space-y-2">
                  {itemsInArea.map((item) => (
                    <div key={`${item.codProd}-${item.area}`} className="bg-white border border-[#d1d5db] rounded shadow-sm overflow-hidden flex transition-all hover:border-blue-300">
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
                            onClick={() => removeItem(item.originalIndex)}
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
                              value={item.quantidade}
                              onChange={(e) => updateItem(item.originalIndex, "quantidade", Number(e.target.value))}
                            />
                            <span className="text-xs text-gray-400">x</span>
                            <div className="relative">
                              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">R$</span>
                              <input
                                type="number"
                                className="w-20 pl-5 text-xs border rounded p-1 font-bold text-gray-700"
                                value={item.precoUnitario}
                                onChange={(e) => updateItem(item.originalIndex, "precoUnitario", Number(e.target.value))}
                              />
                            </div>
                          </div>
                          <div className="text-sm font-black text-gray-900">
                            {(item.quantidade * item.precoUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {itens.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                <ShoppingCart size={48} className="mb-2" />
                <p className="text-sm font-bold uppercase tracking-widest">Orçamento Vazio</p>
              </div>
            )}
          </div>

          {/* Footer do Lado Direito: Resumo e Obs */}
          <footer className="p-4 bg-white border-t border-[#b9bfc8] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Observações do Orçamento</label>
                <textarea
                  className="w-full p-2 text-sm border border-[#d1d5db] rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  rows={2}
                  placeholder="Instruções de entrega, detalhes..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>
              <div className="bg-[#f8f9fa] p-3 rounded-lg border border-[#e2e4e8]">
                <div className="flex justify-between items-center text-gray-500 text-xs font-bold mb-1 uppercase">
                  <span>Subtotal</span>
                  <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-black text-blue-600 uppercase">
                  <span>Total</span>
                  <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>
            </div>
          </footer>
        </section>
      </main>

      <ProductDetailModal 
        open={detailModalOpen} 
        onClose={() => setDetailModalOpen(false)} 
        codProd={selectedCodProd} 
      />
    </div>
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
        <Typography variant="h6" fontWeight="bold">Detalhes do Produto</Typography>
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
