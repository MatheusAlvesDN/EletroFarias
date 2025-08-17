'use client'

import React, { useEffect, useState } from 'react';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useDeleteStore } from '@/stores/useDeleteStore';
import SidebarMenu from '@/components/SidebarMenu';
import { Box } from '@mui/material';

export default function Page() {
  const { sendDeleteRequest, isLoading } = useDeleteStore();
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = () => {
    if (inputValue.trim()) {
      sendDeleteRequest(inputValue.trim());
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#fff',
        padding: '0px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
      }}
    >
      {/* Menu lateral */}
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <SidebarMenu />
        <Box component="main" sx={{ flexGrow: 1, padding: 3 }}>
          {/* Conteúdo da página */}
        </Box>
      </Box>
      {/* Conteúdo */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          right: 0,
          backgroundColor: '#f0f4f8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '20px',
          color: 'black',
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          lineHeight: '1.5',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div>Excluir:</div>

        <label style={{ fontSize: '18px' }}>
          Insira o cod do produto como aparece no Sankhya:
        </label>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ex: 7101103"
          style={{
            padding: '10px',
            fontSize: '16px',
            width: '250px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
        <button
          onClick={handleSubmit}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: 'green',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Enviar
        </button>
      </div>

      {/* Overlay de loading */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          Carregando...
        </div>
      )}
    </Box>
  );
}
