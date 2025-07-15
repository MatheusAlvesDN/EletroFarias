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
        <h1 style={{ color: '#006400', marginBottom: '30px' }}></h1>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '5px' }}>Aplicativo para realizar a integração do estoque da EletroFarias,
do Sankhya para outras plataformas.</h2>
        </div>

      </Box>
    </Box>
  );
}
