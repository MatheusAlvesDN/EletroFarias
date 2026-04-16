'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  Autocomplete,
} from '@mui/material';
import { DataGrid, GridRowSelectionModel } from '@mui/x-data-grid';

type MarcaOption = {
  id: number;
  nome: string;
};

type ProdutoRow = {
  CODPROD: number;
  DESCRPROD: string | null;
  CODBARRA?: string | null;
  CODBARRAS?: string[];
  CODGRUPOPROD?: number | null;
  DESCRGRUPOPROD?: string | null;
  MARCA?: string | null;
  CODFAB?: number | null;
  ATIVO?: string | null;
  USOPROD?: string | null;
};

type ProdutosResponse = {
  items: ProdutoRow[];
  total: number;
};

export default function MercadoLivrePage() {
  const [marcas, setMarcas] = useState<MarcaOption[]>([]);
  const [marcasLoading, setMarcasLoading] = useState(false);
  const [marcaSearch, setMarcaSearch] = useState('');
  const [selectedMarcas, setSelectedMarcas] = useState<MarcaOption[]>([]);

  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<ProdutoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);

  const carregarMarcas = useCallback(async (term?: string) => {
    setMarcasLoading(true);
    try {
      const { data } = await axios.get<MarcaOption[]>('/api/sync/marcas', {
        params: {
          search: term || undefined,
        },
      });
      setMarcas(data || []);
    } catch (error) {
      console.error('Erro ao carregar marcas:', error);
      setMarcas([]);
    } finally {
      setMarcasLoading(false);
    }
  }, []);

  const carregarProdutos = useCallback(async () => {
    setLoading(true);
    try {
      const manufacturerIds = selectedMarcas.map((m) => m.id).join(',');

      const { data } = await axios.get<ProdutosResponse>('/api/sync/produtos', {
        params: {
          manufacturerIds: manufacturerIds || undefined,
          search: search.trim() || undefined,
          limit: pageSize,
          offset: page * pageSize,
        },
      });

      setRows(data?.items || []);
      setTotal(data?.total || 0);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedMarcas, search, page, pageSize]);

  useEffect(() => {
    carregarMarcas();
  }, [carregarMarcas]);

  useEffect(() => {
    const t = setTimeout(() => {
      carregarMarcas(marcaSearch);
    }, 400);

    return () => clearTimeout(t);
  }, [marcaSearch, carregarMarcas]);

  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  const produtosSelecionados = useMemo(() => {
    const ids = new Set(rowSelectionModel.map(Number));
    return rows.filter((r) => ids.has(Number(r.CODPROD)));
  }, [rowSelectionModel, rows]);

  const cadastrarSelecionados = async () => {
    try {
      await axios.post('/api/sync/cadastrarProdutosIfood', {
        produtos: produtosSelecionados,
      });

      alert(`Produtos enviados: ${produtosSelecionados.length}`);
    } catch (error) {
      console.error('Erro ao cadastrar produtos:', error);
      alert('Erro ao cadastrar produtos');
    }
  };

  const columns = [
    { field: 'CODPROD', headerName: 'Cód. Produto', width: 120 },
    { field: 'DESCRPROD', headerName: 'Descrição', flex: 1, minWidth: 250 },
    { field: 'MARCA', headerName: 'Marca', width: 180 },
    { field: 'DESCRGRUPOPROD', headerName: 'Grupo', width: 220 },
    { field: 'CODBARRA', headerName: 'Cód. Barra Principal', width: 180 },
    {
      field: 'CODBARRAS',
      headerName: 'Todos os Cód. Barras',
      width: 260,
      renderCell: (params: any) => (params.value || []).join(', '),
    },
    { field: 'ATIVO', headerName: 'Ativo', width: 90 },
    { field: 'USOPROD', headerName: 'Uso', width: 90 },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h5">Mercado Livre</Typography>

        <Autocomplete
          multiple
          options={marcas}
          value={selectedMarcas}
          loading={marcasLoading}
          onChange={(_, value) => {
            setSelectedMarcas(value);
            setPage(0);
          }}
          onInputChange={(_, value) => {
            setMarcaSearch(value);
          }}
          getOptionLabel={(option) => option.nome}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          filterOptions={(x) => x}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Marcas"
              placeholder="Pesquise e selecione marcas"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {marcasLoading ? <CircularProgress size={18} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />

        <TextField
          label="Pesquisar produto"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Descrição, código ou código de barras"
        />

        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={carregarProdutos} disabled={loading}>
            Buscar produtos
          </Button>

          <Button
            variant="outlined"
            onClick={cadastrarSelecionados}
            disabled={produtosSelecionados.length === 0}
          >
            Cadastrar selecionados
          </Button>
        </Stack>

        <Box sx={{ height: 650, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.CODPROD}
            checkboxSelection
            disableRowSelectionOnClick
            loading={loading}
            rowCount={total}
            paginationMode="server"
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              setPage(model.page);
              setPageSize(model.pageSize);
            }}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={(newSelection) => {
              setRowSelectionModel(newSelection);
            }}
            pageSizeOptions={[25, 50, 100]}
          />
        </Box>
      </Stack>
    </Box>
  );
}