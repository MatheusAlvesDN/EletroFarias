'use client';

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';

const PageShell = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #f7f8fa 0%, #eef2f7 100%);
  padding: 32px 0 48px;
`;

const HeroCard = styled(Card)`
  border-radius: 20px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(15, 23, 42, 0.08);
`;

const ProductCard = styled(Card)`
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.08);
  height: 100%;
`;

type GadgetProduct = {
  codprod: number;
  produto: string;
  marca: string;
  referencia: string;
  estoque: number;
  preco: number;
  dtvigor: string;
  qtd_saidas_12m: number;
};

const MOCK_PRODUCTS: GadgetProduct[] = [
  {
    codprod: 10342,
    produto: 'Furadeira de Impacto 650W',
    marca: 'Vonder',
    referencia: 'FI-650',
    estoque: 8,
    preco: 289.9,
    dtvigor: '2026-03-10',
    qtd_saidas_12m: 1,
  },
  {
    codprod: 20911,
    produto: 'Esmerilhadeira Angular 4 1/2',
    marca: 'Bosch',
    referencia: 'GWS-850',
    estoque: 5,
    preco: 359.0,
    dtvigor: '2026-02-14',
    qtd_saidas_12m: 0,
  },
  {
    codprod: 31177,
    produto: 'Serra Mármore 1450W',
    marca: 'Makita',
    referencia: 'SM-1450',
    estoque: 3,
    preco: 499.9,
    dtvigor: '2026-01-26',
    qtd_saidas_12m: 1,
  },
];

function currencyBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(value: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T00:00:00`));
}

function buildAnnouncement(products: GadgetProduct[]) {
  const lines = [
    '📢 *Oportunidades com baixo giro*',
    '',
    'Segue seleção de produtos com estoque disponível e no máximo 1 saída nas TOPs definidas:',
    '',
  ];

  products.forEach((item, index) => {
    lines.push(
      `${index + 1}. *${item.produto}*`,
      `   • Cód.: ${item.codprod}`,
      `   • Marca: ${item.marca || '-'}`,
      `   • Ref.: ${item.referencia || '-'}`,
      `   • Estoque: ${item.estoque}`,
      `   • Preço: ${currencyBRL(item.preco)}`,
      `   • Saídas 12m: ${item.qtd_saidas_12m}`,
      `   • Vigência: ${formatDate(item.dtvigor)}`,
      ''
    );
  });

  lines.push('Interessados, falar com a equipe comercial.');

  return lines.join('\n');
}

export default function GadgetAnuncioWhatsappPage() {
  const [products] = useState<GadgetProduct[]>(MOCK_PRODUCTS);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>(products.map((item) => item.codprod));
  const [openDialog, setOpenDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((item) => {
      return [
        String(item.codprod),
        item.produto,
        item.marca,
        item.referencia,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [products, search]);

  const selectedProducts = useMemo(() => {
    return filteredProducts.filter((item) => selectedIds.includes(item.codprod));
  }, [filteredProducts, selectedIds]);

  const announcementText = useMemo(() => {
    return buildAnnouncement(selectedProducts);
  }, [selectedProducts]);

  const toggleProduct = (codprod: number) => {
    setSelectedIds((current) =>
      current.includes(codprod)
        ? current.filter((id) => id !== codprod)
        : [...current, codprod]
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(announcementText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <PageShell>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <HeroCard>
            <CardContent sx={{ p: 4 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={3}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
              >
                <Box>
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                    <AutoAwesomeRoundedIcon color="primary" />
                    <Typography variant="overline" sx={{ letterSpacing: 1.2 }}>
                      GADGET DE ANÚNCIO
                    </Typography>
                  </Stack>
                  <Typography variant="h4" fontWeight={700} gutterBottom>
                    Produtos com baixo giro para anunciar no WhatsApp
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Tela pensada para consumir o resultado do gadget com estoque diferente de zero e no máximo 1 saída nas TOPs informadas.
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Chip icon={<Inventory2RoundedIcon />} label={`${filteredProducts.length} produtos`} color="primary" variant="outlined" />
                  <Chip icon={<SellRoundedIcon />} label={`${selectedProducts.length} selecionados`} color="success" variant="outlined" />
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<CampaignRoundedIcon />}
                    onClick={() => setOpenDialog(true)}
                    disabled={selectedProducts.length === 0}
                  >
                    Anunciar
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </HeroCard>

          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                <TextField
                  fullWidth
                  label="Buscar produto, marca, referência ou código"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button
                  variant="outlined"
                  onClick={() => setSelectedIds(filteredProducts.map((item) => item.codprod))}
                >
                  Selecionar filtrados
                </Button>
                <Button
                  variant="text"
                  onClick={() => setSelectedIds([])}
                >
                  Limpar seleção
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            {filteredProducts.map((item) => {
              const selected = selectedIds.includes(item.codprod);

              return (
                <ProductCard key={item.codprod}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {item.produto}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Cód. {item.codprod} • Ref. {item.referencia || '-'}
                          </Typography>
                        </Box>
                        <Chip label={selected ? 'Selecionado' : 'Disponível'} color={selected ? 'success' : 'default'} />
                      </Stack>

                      <Divider />

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip size="small" label={`Marca: ${item.marca || '-'}`} />
                        <Chip size="small" label={`Estoque: ${item.estoque}`} color="primary" variant="outlined" />
                        <Chip size="small" label={`Saídas 12m: ${item.qtd_saidas_12m}`} color="warning" variant="outlined" />
                        <Chip size="small" label={`Vigência: ${formatDate(item.dtvigor)}`} variant="outlined" />
                      </Stack>

                      <Typography variant="h5" fontWeight={800}>
                        {currencyBRL(item.preco)}
                      </Typography>

                      <Button
                        variant={selected ? 'contained' : 'outlined'}
                        onClick={() => toggleProduct(item.codprod)}
                      >
                        {selected ? 'Remover do anúncio' : 'Adicionar ao anúncio'}
                      </Button>
                    </Stack>
                  </CardContent>
                </ProductCard>
              );
            })}
          </Box>
        </Stack>
      </Container>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <WhatsAppIcon color="success" />
            <span>Mensagem pronta para o grupo do WhatsApp</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              Clique em copiar, cole no WhatsApp e envie para o grupo.
            </Alert>

            <TextField
              multiline
              minRows={16}
              fullWidth
              value={announcementText}
              InputProps={{ readOnly: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenDialog(false)}>Fechar</Button>
          <Button
            variant="contained"
            startIcon={<ContentCopyRoundedIcon />}
            onClick={handleCopy}
          >
            Copiar mensagem
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={copied}
        autoHideDuration={2500}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setCopied(false)} severity="success" sx={{ width: '100%' }}>
          Mensagem copiada para a área de transferência.
        </Alert>
      </Snackbar>
    </PageShell>
  );
}
