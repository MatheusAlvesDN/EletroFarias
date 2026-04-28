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

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [formData, setFormData] = useState({
    clienteId: "",
    titulo: "",
    tag: "LID",
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoadingCustomers(true);
    try {
      const data = await crmService.listCustomers();
      setCustomers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.clienteId) {
      alert("Selecione um cliente");
      return;
    }

    setLoading(true);
    try {
      const lead = await crmService.createLead({
        clienteId: formData.clienteId,
        titulo: formData.titulo || `Negociação - ${customers.find(c => c.id === formData.clienteId)?.nome}`,
        tag: formData.tag,
      });
      
      // Opcionalmente podemos já criar um pedido vazio aqui se quisermos, 
      // mas vamos deixar para a tela de detalhes.
      
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
          <Link component="button" onClick={() => router.push("/crm")} underline="hover" color="inherit">CRM</Link>
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
                    options={customers}
                    getOptionLabel={(option) => `${option.nome} ${option.documento ? `(${option.documento})` : ""}`}
                    loading={loadingCustomers}
                    onChange={(_, value) => setFormData({ ...formData, clienteId: value?.id || "" })}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Selecionar Cliente *"
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
                  <Typography variant="subtitle2" gutterBottom fontWeight="bold">Setor / Canal *</Typography>
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
