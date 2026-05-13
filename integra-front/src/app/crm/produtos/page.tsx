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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import { crmService } from "@/lib/crmService";
import { databaseService } from "@/lib/databaseService";

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

  const [internalQuery, setInternalQuery] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCodProd, setSelectedCodProd] = useState<string | null>(null);

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
      const data = await databaseService.searchProducts(query);
      setSankhyaResults(Array.isArray(data) ? data : []);
      setSankhyaPage(0);
    } catch (error) {
      console.error(error);
      showSnack("Erro ao pesquisar no Oracle", "error");
    } finally {
      setLoadingSankhya(false);
    }
  }

  const handleOpenDetails = (codProd: string | number) => {
    setSelectedCodProd(String(codProd));
    setDetailModalOpen(true);
  };

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

  const filteredCrmProducts = crmProducts.filter((p) => {
    const query = internalQuery.toLowerCase();
    return (
      p.codProd.toLowerCase().includes(query) ||
      p.descricao.toLowerCase().includes(query) ||
      (p.marca && p.marca.toLowerCase().includes(query))
    );
  });

  const sortedCrmProducts = [...filteredCrmProducts].sort((a, b) => {
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
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                  <Box display="flex" gap={2} alignItems="center" flex={1}>
                    <Typography variant="h6" fontWeight="bold" sx={{ whiteSpace: "nowrap" }}>Base de Produtos do CRM</Typography>
                    <TextField
                      placeholder="Pesquisar no catálogo interno..."
                      value={internalQuery}
                      onChange={(e) => setInternalQuery(e.target.value)}
                      size="small"
                      sx={{ maxWidth: 400, flex: 1 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
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
                        } catch (e) {
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
                              <Box display="flex" gap={1}>
                                <Tooltip title="Ver Detalhes">
                                  <IconButton size="small" onClick={() => handleOpenDetails(p.codProd)} color="primary">
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Button
                                  size="small"
                                  startIcon={<RefreshIcon />}
                                  onClick={() => handleImport({ CODPROD: String(p.codProd) })}
                                  disabled={importingId === String(p.codProd)}
                                >
                                  Sincronizar
                                </Button>
                              </Box>
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
                      onClick={() => handleSankhyaSearch()}
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
                                {r.MARCA && <Chip label={r.MARCA} size="small" variant="outlined" />}
                                {r.REFERENCIA && <Chip label={r.REFERENCIA} size="small" variant="outlined" />}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Box display="flex" gap={1} justifyContent="flex-end">
                                <Tooltip title="Ver Detalhes">
                                  <IconButton size="small" onClick={() => handleOpenDetails(r.CODPROD)} color="primary">
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
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
                              </Box>
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
                    rowsPerPageOptions={[10, 25, 50, 100]}
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

      <ProductDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        codProd={selectedCodProd}
      />
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
                        {Number(produto.precoVenda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">ESTOQUE (1100)</Typography>
                      <Box sx={{ bgcolor: "white", p: 1, borderRadius: 2, border: 1, borderColor: "divider", fontWeight: "bold", color: produto.estoque > 0 ? "success.main" : "error.main" }}>
                        {produto.estoque} un
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
