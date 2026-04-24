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
  TablePagination,
  TableSortLabel,
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

  const [crmPage, setCrmPage] = useState(0);
  const [crmRowsPerPage, setCrmRowsPerPage] = useState(10);
  const [crmOrder, setCrmOrder] = useState<"asc" | "desc">("asc");
  const [crmOrderBy, setCrmOrderBy] = useState<string>("descricao");

  const [sankhyaPage, setSankhyaPage] = useState(0);
  const [sankhyaRowsPerPage, setSankhyaRowsPerPage] = useState(10);
  const [sankhyaOrder, setSankhyaOrder] = useState<"asc" | "desc">("asc");
  const [sankhyaOrderBy, setSankhyaOrderBy] = useState<string>("DESCRPROD");

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

  const handleCrmSort = (property: string) => {
    const isAsc = crmOrderBy === property && crmOrder === "asc";
    setCrmOrder(isAsc ? "desc" : "asc");
    setCrmOrderBy(property);
  };

  const sortedCrmProducts = [...crmProducts].sort((a, b) => {
    let aVal = a[crmOrderBy] ?? "";
    let bVal = b[crmOrderBy] ?? "";

    if (crmOrderBy === "codProd" || crmOrderBy === "estoque" || crmOrderBy === "precoVenda") {
      const numA = Number(aVal) || 0;
      const numB = Number(bVal) || 0;
      if (numA < numB) return crmOrder === "asc" ? -1 : 1;
      if (numA > numB) return crmOrder === "asc" ? 1 : -1;
      return 0;
    }

    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();

    if (aVal < bVal) return crmOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return crmOrder === "asc" ? 1 : -1;
    return 0;
  });

  const paginatedCrmProducts = sortedCrmProducts.slice(
    crmPage * crmRowsPerPage,
    crmPage * crmRowsPerPage + crmRowsPerPage
  );

  const handleSankhyaSort = (property: string) => {
    const isAsc = sankhyaOrderBy === property && sankhyaOrder === "asc";
    setSankhyaOrder(isAsc ? "desc" : "asc");
    setSankhyaOrderBy(property);
  };

  const sortedSankhyaResults = [...sankhyaResults].sort((a, b) => {
    let aVal = a[sankhyaOrderBy] ?? "";
    let bVal = b[sankhyaOrderBy] ?? "";

    if (sankhyaOrderBy === "CODPROD") {
      const numA = Number(aVal) || 0;
      const numB = Number(bVal) || 0;
      if (numA < numB) return sankhyaOrder === "asc" ? -1 : 1;
      if (numA > numB) return sankhyaOrder === "asc" ? 1 : -1;
      return 0;
    }

    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();

    if (aVal < bVal) return sankhyaOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sankhyaOrder === "asc" ? 1 : -1;
    return 0;
  });

  const paginatedSankhyaResults = sortedSankhyaResults.slice(
    sankhyaPage * sankhyaRowsPerPage,
    sankhyaPage * sankhyaRowsPerPage + sankhyaRowsPerPage
  );

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
                  <Box display="flex" gap={2}>
                    <Button 
                      startIcon={<CloudDownloadIcon />} 
                      variant="contained" 
                      color="secondary"
                      size="small" 
                      onClick={async () => {
                        setLoadingCrm(true);
                        try {
                          await crmService.syncProductsSankhya();
                          showSnack("Produtos sincronizados com sucesso!");
                          loadCrmProducts();
                        } catch(e) {
                          showSnack("Erro ao sincronizar produtos", "error");
                        } finally {
                          setLoadingCrm(false);
                        }
                      }}
                      disabled={loadingCrm}
                    >
                      Sincronizar Sankhya
                    </Button>
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
                </Box>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "lg" }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "grey.50" }}>
                      <TableRow>
                        <TableCell>
                          <TableSortLabel
                            active={crmOrderBy === "codProd"}
                            direction={crmOrderBy === "codProd" ? crmOrder : "asc"}
                            onClick={() => handleCrmSort("codProd")}
                          >
                            <Typography variant="subtitle2" fontWeight="bold">Cód. Prod</Typography>
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={crmOrderBy === "descricao"}
                            direction={crmOrderBy === "descricao" ? crmOrder : "asc"}
                            onClick={() => handleCrmSort("descricao")}
                          >
                            <Typography variant="subtitle2" fontWeight="bold">Descrição</Typography>
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={crmOrderBy === "precoVenda"}
                            direction={crmOrderBy === "precoVenda" ? crmOrder : "asc"}
                            onClick={() => handleCrmSort("precoVenda")}
                          >
                            <Typography variant="subtitle2" fontWeight="bold">Preço (Tabela 0)</Typography>
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={crmOrderBy === "estoque"}
                            direction={crmOrderBy === "estoque" ? crmOrder : "asc"}
                            onClick={() => handleCrmSort("estoque")}
                          >
                            <Typography variant="subtitle2" fontWeight="bold">Estoque (1100)</Typography>
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={crmOrderBy === "categoria"}
                            direction={crmOrderBy === "categoria" ? crmOrder : "asc"}
                            onClick={() => handleCrmSort("categoria")}
                          >
                            <Typography variant="subtitle2" fontWeight="bold">Categoria</Typography>
                          </TableSortLabel>
                        </TableCell>
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
                      ) : paginatedCrmProducts.length > 0 ? (
                        paginatedCrmProducts.map((p) => (
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
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    component="div"
                    count={crmProducts.length}
                    rowsPerPage={crmRowsPerPage}
                    page={crmPage}
                    onPageChange={(e, newPage) => setCrmPage(newPage)}
                    onRowsPerPageChange={(e) => {
                      setCrmRowsPerPage(parseInt(e.target.value, 10));
                      setCrmPage(0);
                    }}
                    labelRowsPerPage="Linhas por página:"
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`}
                  />
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
                        <TableCell>
                          <TableSortLabel
                            active={sankhyaOrderBy === "CODPROD"}
                            direction={sankhyaOrderBy === "CODPROD" ? sankhyaOrder : "asc"}
                            onClick={() => handleSankhyaSort("CODPROD")}
                          >
                            <Typography variant="subtitle2" fontWeight="bold">Cód. Prod</Typography>
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sankhyaOrderBy === "DESCRPROD"}
                            direction={sankhyaOrderBy === "DESCRPROD" ? sankhyaOrder : "asc"}
                            onClick={() => handleSankhyaSort("DESCRPROD")}
                          >
                            <Typography variant="subtitle2" fontWeight="bold">Descrição</Typography>
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sankhyaOrderBy === "MARCA"}
                            direction={sankhyaOrderBy === "MARCA" ? sankhyaOrder : "asc"}
                            onClick={() => handleSankhyaSort("MARCA")}
                          >
                            <Typography variant="subtitle2" fontWeight="bold">Marca / Grupo</Typography>
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }} align="right">Ação</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loadingSankhya ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell>
                        </TableRow>
                      ) : paginatedSankhyaResults.length > 0 ? (
                        paginatedSankhyaResults.map((r) => (
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
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    component="div"
                    count={sankhyaResults.length}
                    rowsPerPage={sankhyaRowsPerPage}
                    page={sankhyaPage}
                    onPageChange={(e, newPage) => setSankhyaPage(newPage)}
                    onRowsPerPageChange={(e) => {
                      setSankhyaRowsPerPage(parseInt(e.target.value, 10));
                      setSankhyaPage(0);
                    }}
                    labelRowsPerPage="Linhas por página:"
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`}
                  />
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
