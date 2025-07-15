'use client'

import React, { useEffect } from 'react';
import { useCategoryStore } from '@/stores/useCategoryStore';
import SidebarMenu from '@/components/SidebarMenu';
import { Box } from '@mui/material';

export default function Page() {
  const { fetchCategories } = useCategoryStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <SidebarMenu />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: '#f0f4f8',
          overflowY: 'auto',
          p: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          lineHeight: '1.8',
          color: '#333',
        }}
      > 
        <h1 style={{ color: '#006400', marginBottom: '30px' }}>📘 Ajuda</h1>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '5px' }}>🔍 Consulta de Produtos Cadastrados</h2>
          <p>Mostra os grupos de produtos cadastrados.</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '5px' }}>➕ Cadastrar Grupo de Produtos</h2>
          <p>
            Recebe um código de produto, cria a categoria dele no iFood e cadastra todos os produtos desse mesmo grupo no iFood.
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '5px' }}>❌ Excluir Grupo de Produtos</h2>
          <p>
            Recebe um código de produto, exclui a categoria dele no iFood e apaga todos os produtos desse mesmo grupo do iFood.
          </p>
        </div>
      </Box>
    </Box>
  );
}
