"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { crmService } from "@/lib/crmService";
import { useAuth } from "@/hooks/useAuth";

export default function NewOrderPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<any[]>([]);

  useEffect(() => {
    crmService.listCustomers().then(setCustomers).catch(console.error);
    crmService.listCrmProducts().then(setProducts).catch(console.error);
  }, []);

  function addItem(product: any) {
    if (!product) return;
    const exists = itens.find((i) => i.codProd === product.codProd);
    if (exists) return;

    setItens([
      ...itens,
      {
        codProd: product.codProd,
        descricao: product.descricao,
        quantidade: 1,
        precoUnitario: Number(product.precoVenda || 0),
      },
    ]);
  }

  function removeItem(index: number) {
    setItens(itens.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: any) {
    const newItens = [...itens];
    newItens[index][field] = value;
    setItens(newItens);
  }

  const total = itens.reduce((acc, i) => acc + i.quantidade * i.precoUnitario, 0);

  async function handleSubmit() {
    if (!selectedCustomer) return alert("Selecione um cliente");
    if (itens.length === 0) return alert("Adicione ao menos um item");

    setLoading(true);
    try {
      if (!userId) throw new Error("Vendedor não identificado.");

      await crmService.createOrder({
        clienteId: selectedCustomer.id,
        userId,
        observacoes,
        itens,
      });
      
      router.push("/crm");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Erro ao criar orçamento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout
      title="Novo Orçamento"
      subtitle="Monte orçamentos detalhados com produtos do catálogo"
    >
      <Box p={4} display="flex" flexDirection="column" gap={3}>
        <Breadcrumbs sx={{ mb: 1 }}>
          <Link underline="hover" color="inherit" href="/crm" onClick={(e) => { e.preventDefault(); router.push("/crm"); }} sx={{ cursor: "pointer" }}>
            CRM
          </Link>
          <Typography color="text.primary">Novo Orçamento</Typography>
        </Breadcrumbs>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push("/crm")}>
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
                <Typography variant="h6" fontWeight="bold" mb={3}>Dados da Oportunidade</Typography>
                
                <Box display="flex" flexDirection="column" gap={3}>
                  <Autocomplete
                    options={customers}
                    getOptionLabel={(option) => `${option.nome} ${option.documento ? `(${option.documento})` : ""}`}
                    value={selectedCustomer}
                    onChange={(_, val) => setSelectedCustomer(val)}
                    renderInput={(params) => <TextField {...params} label="Cliente *" required variant="filled" />}
                  />

                  <Autocomplete
                    options={products}
                    getOptionLabel={(option) => `${option.codProd} - ${option.descricao}`}
                    onChange={(_, val) => val && addItem(val)}
                    renderInput={(params) => (
                      <TextField {...params} label="Adicionar Produto do Catálogo" placeholder="Pesquisar por código ou descrição..." variant="outlined" />
                    )}
                  />
                </Box>
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
                  {itens.map((item, index) => (
                    <TableRow key={item.codProd}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">{item.codProd}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.descricao}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={item.quantidade}
                          onChange={(e) => updateItem(index, "quantidade", Number(e.target.value))}
                          inputProps={{ style: { textAlign: 'center' } }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.precoUnitario}
                          onChange={(e) => updateItem(index, "precoUnitario", Number(e.target.value))}
                          InputProps={{ startAdornment: <Typography variant="caption" sx={{ mr: 1 }}>R$</Typography> }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {(item.quantidade * item.precoUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton color="error" size="small" onClick={() => removeItem(index)}>
                          <DeleteIcon fontSize="inherit" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
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
      </Box>
    </DashboardLayout>
  );
}
