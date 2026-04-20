"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { crmService } from "@/lib/crmService";
import { useAuth } from "@/hooks/useAuth";

interface OrderModalProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
}

export default function OrderModal({ open, onClose }: OrderModalProps) {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<any[]>([]);

  // Carregar dados ao abrir
  useEffect(() => {
    if (open) {
      crmService.listCustomers().then(setCustomers).catch(console.error);
      crmService.listCrmProducts().then(setProducts).catch(console.error);
    }
  }, [open]);

  // Busca produtos do Sankhya (Opcional: se desejar manter busca live)
  // useEffect(() => { ... }, [productSearch]);

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
      if (!userId) {
        alert("Erro: ID do vendedor não encontrado. Refaça o login.");
        setLoading(false);
        return;
      }

      await crmService.createOrder({
        clienteId: selectedCustomer.id,
        userId,
        observacoes,
        itens,
      });
      onClose(true);
      resetForm();
    } catch (error) {
      console.error(error);
      alert("Erro ao criar negociação");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedCustomer(null);
    setObservacoes("");
    setItens([]);
  }

  return (
    <Dialog open={open} onClose={() => onClose()} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="bold">Nova Negociação / Orçamento</Typography>
          <IconButton onClick={() => onClose()} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={3}>
          {/* CLIENTE */}
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => `${option.nome} ${option.documento ? `(${option.documento})` : ""}`}
            value={selectedCustomer}
            onChange={(_, val) => setSelectedCustomer(val)}
            renderInput={(params) => <TextField {...params} label="Selecione o Cliente *" required />}
          />

          {/* BUSCA PRODUTOS DO CRM */}
          <Autocomplete
            options={products}
            getOptionLabel={(option) => `${option.codProd} - ${option.descricao}`}
            onChange={(_, val) => addItem(val)}
            renderInput={(params) => (
              <TextField {...params} label="Adicionar produto do catálogo..." placeholder="Selecione um produto do CRM" />
            )}
          />

          {/* TABELA DE ITENS */}
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: "grey.50" }}>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell width={100}>Qtd</TableCell>
                  <TableCell width={140}>Preço Unit.</TableCell>
                  <TableCell width={140}>Total</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {itens.map((item, index) => (
                  <TableRow key={item.codProd}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">{item.codProd}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.descricao}</Typography>
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={item.quantidade}
                        onChange={(e) => updateItem(index, "quantidade", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={item.precoUnitario}
                        onChange={(e) => updateItem(index, "precoUnitario", Number(e.target.value))}
                        InputProps={{ startAdornment: <Typography variant="caption" sx={{ mr: 1 }}>R$</Typography> }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
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
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      Nenhum item adicionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TextField
            label="Observações Internas"
            multiline
            rows={3}
            fullWidth
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />

          <Box display="flex" justifyContent="flex-end" alignItems="center" gap={2}>
            <Typography variant="h6" fontWeight="bold">Total: {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={() => onClose()} color="inherit">Cancelar</Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={loading || itens.length === 0}
          sx={{ px: 4 }}
        >
          {loading ? "Criando..." : "Criar Negociação"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
