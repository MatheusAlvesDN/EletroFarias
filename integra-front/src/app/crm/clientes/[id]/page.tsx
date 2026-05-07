"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Avatar,
  Paper,
  Button,
  Chip,
  Stack,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HistoryIcon from "@mui/icons-material/History";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PersonIcon from "@mui/icons-material/Person";
import { crmService } from "@/lib/crmService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CustomerHistoryPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (id) loadHistory();
  }, [id]);

  async function loadHistory() {
    try {
      const history = await crmService.getCustomerHistory(id as string);
      setData(history);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Histórico do Cliente">
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  // Consolidar todos os eventos em uma única lista ordenada por data
  const events = [
    ...data.leads.map((l: any) => ({ ...l, type: 'lead', date: new Date(l.createdAt) })),
    ...data.pedidos.map((p: any) => ({ ...p, type: 'pedido', date: new Date(p.createdAt) })),
    ...data.comentarios.map((c: any) => ({ ...c, type: 'comentario', date: new Date(c.createdAt) }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <DashboardLayout title="Histórico do Cliente" subtitle="Linha do tempo de interações e pedidos">
      <Box p={4}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => router.back()} 
          sx={{ mb: 4 }}
        >
          Voltar
        </Button>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' }, gap: 4 }}>
          {/* Perfil Rápido */}
          <Box>
            <Card variant="outlined" sx={{ borderRadius: 4, position: 'sticky', top: 20 }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                  <PersonIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" fontWeight="bold">{data.leads[0]?.cliente?.nome || "Cliente"}</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {data.leads[0]?.cliente?.email || "Sem e-mail cadastrado"}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" justifyContent="space-around">
                  <Box>
                    <Typography variant="h6" fontWeight="bold">{data.leads.length}</Typography>
                    <Typography variant="caption" color="text.secondary">Leads</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">{data.pedidos.length}</Typography>
                    <Typography variant="caption" color="text.secondary">Pedidos</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>

          {/* Timeline */}
          <Box>
            <Typography variant="h6" fontWeight="bold" mb={3} display="flex" alignItems="center" gap={1}>
              <HistoryIcon color="primary" /> Linha do Tempo
            </Typography>

            <Box sx={{ position: 'relative', '&::before': { content: '""', position: 'absolute', left: '20px', top: 0, bottom: 0, width: '2px', bgcolor: 'grey.200' } }}>
              {events.map((event, index) => (
                <Box key={index} sx={{ mb: 4, pl: 6, position: 'relative' }}>
                  {/* Ponto da Timeline */}
                  <Box sx={{ 
                    position: 'absolute', 
                    left: '10px', 
                    top: '5px', 
                    width: '22px', 
                    height: '22px', 
                    borderRadius: '50%', 
                    bgcolor: 'white', 
                    border: '4px solid', 
                    borderColor: event.type === 'pedido' ? 'success.main' : event.type === 'lead' ? 'primary.main' : 'warning.main',
                    zIndex: 2
                  }} />
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">
                      {format(event.date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </Typography>
                    
                    <Paper variant="outlined" sx={{ p: 3, mt: 1, borderRadius: 3, borderLeft: '4px solid', borderLeftColor: event.type === 'pedido' ? 'success.main' : event.type === 'lead' ? 'primary.main' : 'warning.main' }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold" display="flex" alignItems="center" gap={1}>
                            {event.type === 'pedido' && <ShoppingBagIcon fontSize="small" color="success" />}
                            {event.type === 'lead' && <HistoryIcon fontSize="small" color="primary" />}
                            {event.type === 'comentario' && <ChatBubbleOutlineIcon fontSize="small" color="warning" />}
                            {event.type === 'pedido' ? `Pedido #${event.numero}` : event.type === 'lead' ? `Lead: ${event.titulo}` : 'Novo Comentário'}
                          </Typography>
                          
                          {event.type === 'pedido' && (
                            <Box mt={1}>
                              <Typography variant="body2">Valor Total: <b>{Number(event.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b></Typography>
                              <Typography variant="caption" color="text.secondary">Itens: {event.itens?.map((i: any) => i.descricao).join(', ')}</Typography>
                            </Box>
                          )}

                          {event.type === 'lead' && (
                            <Box mt={1} display="flex" gap={1}>
                              <Chip label={event.status} size="small" color="primary" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                              <Typography variant="body2" color="text.secondary">Iniciado por {event.vendedor?.email?.split('@')[0]}</Typography>
                            </Box>
                          )}

                          {event.type === 'comentario' && (
                            <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                              "{event.texto}" — <b>{event.usuario?.email?.split('@')[0]}</b>
                            </Typography>
                          )}
                        </Box>
                        
                        <Button size="small" onClick={() => {
                          if (event.type === 'lead') router.push(`/crm/lead/${event.id}`);
                          if (event.type === 'pedido') router.push(`/crm/pedido/${event.id}`);
                        }}>
                          Ver Detalhes
                        </Button>
                      </Box>
                    </Paper>
                  </Box>
                </Box>
              ))}
              {events.length === 0 && (
                <Box textAlign="center" py={8}>
                  <Typography color="text.secondary">Nenhuma atividade registrada para este cliente.</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </DashboardLayout>
  );
}
