"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Autocomplete,
  CircularProgress,
  Breadcrumbs,
  Link,
  Divider,
  Chip
} from "@mui/material";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { crmService } from "@/lib/crmService";

import { Suspense } from "react";

function NewLeadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tagFromUrl = searchParams.get("tag");
  const clienteIdFromUrl = searchParams.get("clienteId");

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [formData, setFormData] = useState({
    clienteId: "",
    titulo: "",
    tag: tagFromUrl || "LID",
  });

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  useEffect(() => {
    if (tagFromUrl) {
      setFormData(prev => ({ ...prev, tag: tagFromUrl }));
    }
    if (clienteIdFromUrl) {
      crmService.listCustomers().then((list) => {
        const found = list.find((c: any) => c.id === clienteIdFromUrl);
        if (found) {
          setSelectedCustomer(found);
          setFormData(prev => ({ ...prev, clienteId: found.id }));
        }
      });
    }
  }, [tagFromUrl, clienteIdFromUrl]);

  async function handleSearch(query: string) {
    if (query.length < 3) return;
    setLoadingCustomers(true);
    try {
      const data = await crmService.searchCustomersSankhya(query);
      setCustomers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) {
      alert("Selecione um cliente");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        titulo: formData.titulo || `Negociação - ${selectedCustomer.nome}`,
        tag: formData.tag,
      };

      // Se o cliente já tem ID (veio do Prisma), manda clienteId
      // Se veio do Sankhya (não tem id, mas tem codParc), manda o objeto cliente
      if (selectedCustomer.id) {
        payload.clienteId = selectedCustomer.id;
      } else {
        payload.cliente = selectedCustomer;
      }

      const lead = await crmService.createLead(payload);
      router.push(`/crm/lead/${lead.id}`);
    } catch (error) {
      console.error(error);
      alert("Erro ao criar oportunidade");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title="Novo Lead" subtitle="Inicie uma nova jornada de venda">
      <Box p={4}>
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link 
            component="button" 
            onClick={() => router.push(`/crm/${formData.tag.toLowerCase()}`)} 
            underline="hover" 
            color="inherit"
            sx={{ p: 0, verticalAlign: 'baseline', textTransform: 'none', fontWeight: 'inherit', fontSize: 'inherit' }}
          >
            CRM
          </Link>
          <Typography color="text.primary">Novo Lead</Typography>
        </Breadcrumbs>

        <Card sx={{ maxWidth: 800, mx: "auto", borderRadius: 4, border: '1px solid', borderColor: 'divider' }} elevation={0}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight="800" gutterBottom>Detalhes do Lead</Typography>
            <Typography variant="body2" color="text.secondary" mb={4}>
              Selecione o cliente e dê um título para identificar este lead no funil.
            </Typography>

            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <Autocomplete
                    filterOptions={(x) => x} // Desativa filtro interno para usar busca do backend
                    options={customers}
                    getOptionLabel={(option) => `${option.nome} ${option.documento ? `(${option.documento})` : ""} ${option.codParc ? `[${option.codParc}]` : ""}`}
                    loading={loadingCustomers}
                    value={selectedCustomer}
                    onInputChange={(_, value) => handleSearch(value)}
                    onChange={(_, value) => {
                      setSelectedCustomer(value);
                      setFormData({ ...formData, clienteId: value?.id || "" });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Pesquisar Cliente (Nome, CPF/CNPJ ou Cód. Parc) *"
                        required
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <React.Fragment>
                              {loadingCustomers ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </React.Fragment>
                          ),
                        }}
                      />
                    )}
                  />
                  <Button
                    variant="text"
                    size="small"
                    sx={{ mt: 1, textTransform: 'none' }}
                    onClick={() => router.push('/crm/clientes')}
                  >
                    Não encontrou o cliente? Cadastre-o aqui.
                  </Button>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Título da Negociação (Opcional)"
                    placeholder="Ex: Reforma da Cozinha, Venda de Motores..."
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight="bold">Empresa</Typography>
                  <Box display="flex" gap={1}>
                    {['LID', 'DFARIAS', 'ELETRO'].map((t) => (
                      <Chip
                        key={t}
                        label={t}
                        onClick={() => setFormData({ ...formData, tag: t })}
                        color={formData.tag === t ? "primary" : "default"}
                        variant={formData.tag === t ? "filled" : "outlined"}
                        sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 2 }} />
                  <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button onClick={() => router.back()}>Cancelar</Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="success"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle size={20} />}
                      sx={{ borderRadius: 3, px: 4 }}
                    >
                      Criar Lead
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>
      </Box>
    </DashboardLayout>
  );
}

export default function NewLeadPage() {
  return (
    <Suspense fallback={<DashboardLayout title="Carregando..."><Box p={4} textAlign="center"><CircularProgress /></Box></DashboardLayout>}>
      <NewLeadContent />
    </Suspense>
  );
}
