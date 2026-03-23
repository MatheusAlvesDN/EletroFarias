import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  Card,
  CardContent,
  Snackbar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  Inventory as InventoryIcon,
  Map as MapIcon,
} from '@mui/icons-material';
import api from '../../services/api';

type EstoqueItem = {
  CODLOCAL: number | string;
  ESTOQUE: number | string | null;
  RESERVADO: number | string | null;
  DISPONIVEL: number | string | null;
  LocalFinanceiro_DESCRLOCAL?: string | null;
};

type Produto = {
  CODPROD?: string | number | null;
  DESCRPROD?: string | null;
  MARCA?: string | null;
  LOCALIZACAO?: string | null;
  AD_LOCALIZACAO?: string | null;
  estoque?: EstoqueItem[];
};

const Contagem = () => {
  const [cod, setCod] = useState('');
  const [produto, setProduto] = useState<Produto | null>(null);
  const [contagem, setContagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const inputRef = useRef<HTMLInputElement>(null);

  const reservadoTotal = useMemo(() => {
    if (!produto?.estoque) return 0;
    return produto.estoque.reduce((acc, item) => {
        const val = typeof item.RESERVADO === 'string' ? parseFloat(item.RESERVADO.replace(',', '.')) : (item.RESERVADO || 0);
        return acc + val;
    }, 0);
  }, [produto]);

  const handleBuscar = async () => {
    if (!cod.trim()) return;
    setLoading(true);
    setError('');
    setProduto(null);
    setContagem('');

    try {
      const response = await api.get(`/sync/getProductLocation?id=${cod}`);
      if (!response.data || (!response.data.CODPROD && !response.data.DESCRPROD)) {
        setError('Produto não encontrado.');
      } else {
        setProduto(response.data);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.response?.data?.message || 'Erro ao buscar produto.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnviar = async () => {
    if (!produto?.CODPROD || !contagem.trim()) return;

    setIsSaving(true);
    try {
      await api.post('/sync/addCount', {
        codProd: Number(produto.CODPROD),
        contagem: Number(contagem.replace(',', '.')),
        descricao: produto.DESCRPROD ?? '',
        localizacao: produto.LOCALIZACAO?.toString() ?? '',
        ad_localizacao: produto.AD_LOCALIZACAO?.toString() ?? '',
        reservado: reservadoTotal,
      });

      setSnackbar({ open: true, message: 'Contagem enviada com sucesso!', severity: 'success' });
      setCod('');
      setProduto(null);
      setContagem('');
    } catch (err: any) {
      console.error('Save error:', err);
      setSnackbar({ open: true, message: 'Erro ao enviar contagem.', severity: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setCod('');
    setProduto(null);
    setContagem('');
    setError('');
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom color="primary">
        Contagem de Estoque
      </Typography>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            label="Código do Produto"
            variant="outlined"
            size="small"
            value={cod}
            onChange={(e) => setCod(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleBuscar()}
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
            inputRef={inputRef}
          />
          <Button
            variant="contained"
            onClick={handleBuscar}
            disabled={loading}
            sx={{ minWidth: '100px' }}
          >
            {loading ? <CircularProgress size={24} /> : <SearchIcon />}
          </Button>
          <IconButton onClick={handleClear} disabled={loading && !cod}>
            <ClearIcon />
          </IconButton>
        </Box>
        {error && <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>{error}</Typography>}
      </Paper>

      {produto && (
        <Box sx={{ animation: 'fadeIn 0.5s' }}>
          <Card sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', p: 2, bgcolor: 'grey.50', alignItems: 'center' }}>
                <InventoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="subtitle1" fontWeight="bold">Detalhes do Produto</Typography>
            </Box>
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                    <Box 
                        component="img"
                        src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${produto.CODPROD}.dbimage`}
                        sx={{ width: '100%', height: 200, objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}
                        onError={(e: any) => {
                            e.target.src = 'https://via.placeholder.com/200?text=Sem+Foto';
                        }}
                    />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Descrição</Typography>
                  <Typography variant="body1" fontWeight="medium" gutterBottom>{produto.DESCRPROD}</Typography>
                  
                  <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    <Box>
                        <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Código</Typography>
                        <Typography variant="body2">{produto.CODPROD}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Marca</Typography>
                        <Typography variant="body2">{produto.MARCA || '-'}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'primary.50', borderRadius: 1, border: '1px dashed', borderColor: 'primary.200' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <MapIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} />
                        <Typography variant="caption" fontWeight="bold">Localizações</Typography>
                    </Box>
                    <Typography variant="body2">Principal: <strong>{produto.LOCALIZACAO || '-'}</strong></Typography>
                    <Typography variant="body2">Alternativa: <strong>{produto.AD_LOCALIZACAO || '-'}</strong></Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Lançar Contagem</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', mt: 1 }}>
              <TextField
                fullWidth
                label="Quantidade Contada"
                variant="filled"
                value={contagem}
                onChange={(e) => setContagem(e.target.value)}
                inputProps={{ inputMode: 'numeric' }}
              />
              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={<SaveIcon />}
                onClick={handleEnviar}
                disabled={isSaving || !contagem.trim()}
                sx={{ height: 56, px: 4 }}
              >
                {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Salvar'}
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Box>
  );
};

export default Contagem;
