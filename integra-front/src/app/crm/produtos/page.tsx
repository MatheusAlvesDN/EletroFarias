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
  Chip,
  IconButton,
  Divider,
  Tabs,
  Tab,
  CircularProgress,
  InputAdornment,
  Alert,
  Snackbar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import { crmService } from "@/lib/crmService";

export default function CrmProdutosPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [crmProducts, setCrmProducts] = useState<any[]>([]);
  const [loadingCrm, setLoadingCrm] = useState(true);
  
  const [sankhyaQuery, setSankhyaQuery] = useState("");
  const [sankhyaResults, setSankhyaResults] = useState<any[]>([]);
  const [loadingSankhya, setLoadingSankhya] = useState(false);
  
  const [importingId, setImportingId] = useState<string | null>(null);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" as "success" | "error" });

  useEffect(() => {
    loadCrmProducts();
  }, []);

  async function loadCrmProducts() {
    setLoadingCrm(true);
    try {
      const data = await crmService.listCrmProducts();
      setCrmProducts(data);
    } catch (error) {
      console.error(error);
      showSnack("Erro ao carregar catálogo CRM", "error");
    } finally {
      setLoadingCrm(false);
    }
  }

  async function handleSankhyaSearch() {
    const query = sankhyaQuery.trim();
    if (query.length < 3) return;
    setLoadingSankhya(true);
    try {
      const isNumeric = /^\d+$/.test(query);
      
      if (isNumeric) {
        // Busca produto específico
        const product = await crmService.getProduct(query);
        setSankhyaResults(product ? [product] : []);
      } else {
        // Busca lista
        const data = await crmService.searchSankhya(query);
        setSankhyaResults(data.items ?? []);
      }
    } catch (error) {
      console.error(error);
      showSnack("Erro ao pesquisar no Sankhya", "error");
    } finally {
      setLoadingSankhya(false);
    }
  }

  async function handleImport(product: any) {
    const code = String(product.CODPROD);
    setImportingId(code);
    try {
      await crmService.createCrmProduct({
        codProd: code,
      });
      showSnack(`Produto ${code} importado/atualizado com sucesso!`);
      loadCrmProducts();
    } catch (error) {
      console.error(error);
      showSnack("Erro ao importar produto", "error");
    } finally {
      setImportingId(null);
    }
  }

  function showSnack(message: string, severity: "success" | "error" = "success") {
    setSnack({ open: true, message, severity });
  }

  return (
    <DashboardLayout title="Produtos CRM" subtitle="Gerencie os produtos disponíveis para negociações no CRM">
      <Box p={4}>
        <Paper sx={{ mb: 4, borderRadius: "xl", overflow: "hidden" }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, val) => setActiveTab(val)}
            indicatorColor="primary"
            textColor="primary"
            sx={{ borderBottom: 1, borderColor: "divider", px: 2, bgcolor: "grey.50" }}
          >
            <Tab label="Catálogo Interno (Prisma)" sx={{ fontWeight: "bold" }} />
            <Tab label="Pesquisar Sankhya" sx={{ fontWeight: "bold" }} />
          </Tabs>

          <Box p={3}>
            {activeTab === 0 ? (
              /* CRM CATALOG VIEW */
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" fontWeight="bold">Base de Produtos do CRM</Typography>
                  <Button 
                    startIcon={<RefreshIcon />} 
                    variant="outlined" 
                    size="small" 
                    onClick={loadCrmProducts}
                    disabled={loadingCrm}
                  >
                    Atualizar Lista
                  </Button>
                </Box>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "lg" }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "grey.50" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: "bold" }}>Cód. Prod</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Descrição</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Preço (Tabela 0)</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Estoque (1100)</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Categoria</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loadingCrm ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                            <CircularProgress size={24} sx={{ mr: 2 }} />
                            Carregando catálogo...
                          </TableCell>
                        </TableRow>
                      ) : crmProducts.length > 0 ? (
                        crmProducts.map((p) => (
                          <TableRow key={p.id} hover>
                            <TableCell>{p.codProd}</TableCell>
                            <TableCell sx={{ fontWeight: "medium" }}>{p.descricao}</TableCell>
                            <TableCell>
                              {Number(p.precoVenda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                            <TableCell>
                              <Chip label={`${p.estoque} un`} size="small" color={p.estoque > 0 ? "success" : "error"} variant="outlined" />
                            </TableCell>
                            <TableCell><Chip label={p.categoria || "---"} size="small" variant="outlined" /></TableCell>
                            <TableCell>
                              <Button 
                                size="small" 
                                startIcon={<RefreshIcon />} 
                                onClick={() => handleImport({ CODPROD: String(p.codProd) })}
                                disabled={importingId === String(p.codProd)}
                              >
                                Sincronizar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>Nenhum produto na base do CRM.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              /* SANKHYA SEARCH VIEW */
              <Box>
                <Box mb={4}>
                  <Typography variant="subtitle1" fontWeight="bold" mb={2}>Pesquisar no Sankhya</Typography>
                  <Box display="flex" gap={2}>
                    <TextField 
                      fullWidth 
                      placeholder="Busque por código, descrição ou marca..."
                      value={sankhyaQuery}
                      onChange={(e) => setSankhyaQuery(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSankhyaSearch()}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      size="small"
                    />
                    <Button 
                      variant="contained" 
                      onClick={handleSankhyaSearch}
                      disabled={loadingSankhya || sankhyaQuery.length < 3}
                    >
                      {loadingSankhya ? <CircularProgress size={20} /> : "Pesquisar"}
                    </Button>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    Digite pelo menos 3 caracteres para pesquisar. Use este recurso para importar novos produtos para o CRM.
                  </Typography>
                </Box>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "lg" }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "grey.50" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: "bold" }}>Cód. Prod</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Descrição</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Marca / Grupo</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }} align="right">Ação</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loadingSankhya ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell>
                        </TableRow>
                      ) : sankhyaResults.length > 0 ? (
                        sankhyaResults.map((r) => (
                          <TableRow key={r.CODPROD} hover>
                            <TableCell>{r.CODPROD}</TableCell>
                            <TableCell sx={{ fontWeight: "medium" }}>{r.DESCRPROD}</TableCell>
                            <TableCell>
                              <Box display="flex" gap={1}>
                                <Chip label={r.MARCA} size="small" variant="outlined" />
                                <Chip label={r.DESCRGRUPOPROD} size="small" variant="outlined" />
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Button 
                                startIcon={<CloudDownloadIcon />} 
                                variant="contained" 
                                size="small"
                                onClick={() => handleImport(r)}
                                disabled={importingId === String(r.CODPROD)}
                                color={crmProducts.some(p => String(p.codProd) === String(r.CODPROD)) ? "success" : "primary"}
                              >
                                {importingId === String(r.CODPROD) ? "Importando..." : 
                                 crmProducts.some(p => String(p.codProd) === String(r.CODPROD)) ? "Sincronizar" : "Importar"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                            {sankhyaQuery.length >= 3 ? "Nenhum resultado encontrado." : "Utilize a busca acima para encontrar produtos no Sankhya."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      <Snackbar 
        open={snack.open} 
        autoHideDuration={4000} 
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snack.severity} sx={{ width: '100%', borderRadius: "lg" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
