"use client";

import React, { useState } from "react";
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { crmService } from "@/lib/crmService";

interface CustomerModalProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
}

export default function CustomerModal({ open, onClose }: CustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    documento: "",
    codParc: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await crmService.createCustomer(formData);
      onClose(true);
      setFormData({ nome: "", email: "", telefone: "", documento: "", codParc: "" });
    } catch (error) {
      console.error(error);
      alert("Erro ao criar cliente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="bold">Novo Cliente</Typography>
          <IconButton onClick={() => onClose()} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Nome Completo *"
              variant="outlined"
              fullWidth
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
            <TextField
              label="E-mail"
              type="email"
              variant="outlined"
              fullWidth
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Box display="flex" gap={2}>
              <TextField
                label="Telefone / WhatsApp"
                variant="outlined"
                fullWidth
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              />
              <TextField
                label="CPF / CNPJ"
                variant="outlined"
                fullWidth
                value={formData.documento}
                onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
              />
            </Box>
            <TextField
              label="Código Parceiro (Sankhya)"
              variant="outlined"
              fullWidth
              placeholder="Opcional se for um novo cliente"
              value={formData.codParc}
              onChange={(e) => setFormData({ ...formData, codParc: e.target.value })}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => onClose()} color="inherit">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" },
              px: 4,
            }}
          >
            {loading ? "Salvando..." : "Salvar Cliente"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
