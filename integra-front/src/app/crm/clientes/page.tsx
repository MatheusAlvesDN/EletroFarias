"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import { crmService } from "@/lib/crmService";
import CustomerModal from "@/components/crm/CustomerModal";

export default function ClientesCrmPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    try {
      const data = await crmService.listCustomers();
      setCustomers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = customers.filter((c) =>
    [c.nome, c.email, c.documento, c.codParc].some((field) =>
      field?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <DashboardLayout title="Gestão de Clientes CRM" subtitle="Gerencie seus leads e parceiros do funil de vendas">
      <Box p={4} display="flex" flexDirection="column" gap={4}>
        
        {/* HEADER ACTIONS */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <TextField
            placeholder="Pesquisar por nome, documento, código..."
            variant="outlined"
            size="small"
            sx={{ width: 400, bgcolor: "white" }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "grey.500" }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setModalOpen(true)}
            sx={{
              bgcolor: "indigo.600",
              "&:hover": { bgcolor: "indigo.700" },
              borderRadius: "xl",
              px: 3,
            }}
          >
            Novo Cliente / Lead
          </Button>
        </Box>

        {/* TABLE */}
        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "grey.200", borderRadius: "xl" }}>
          <Table>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell><Typography variant="subtitle2" fontWeight="bold">Nome / Empresa</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight="bold">Contato</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight="bold">Documento</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight="bold">Cód. Sankhya</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Ações</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>Carregando...</TableCell></TableRow>
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">{c.nome}</Typography>
                      <Typography variant="caption" color="text.secondary">Criado em: {new Date(c.createdAt).toLocaleDateString()}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" flexDirection="column" gap={0.5}>
                        {c.email && (
                          <Box display="flex" alignItems="center" gap={1}>
                            <EmailIcon sx={{ fontSize: 14, color: "grey.500" }} />
                            <Typography variant="caption">{c.email}</Typography>
                          </Box>
                        )}
                        {c.telefone && (
                          <Box display="flex" alignItems="center" gap={1}>
                            <PhoneIcon sx={{ fontSize: 14, color: "grey.500" }} />
                            <Typography variant="caption">{c.telefone}</Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.documento || "---"}</Typography>
                    </TableCell>
                    <TableCell>
                      {c.codParc ? (
                        <Chip label={c.codParc} size="small" variant="outlined" color="primary" />
                      ) : (
                        <Chip label="Lead" size="small" color="default" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>Nenhum cliente encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <CustomerModal open={modalOpen} onClose={(refresh) => {
          setModalOpen(false);
          if (refresh) loadCustomers();
        }} />
      </Box>
    </DashboardLayout>
  );
}
