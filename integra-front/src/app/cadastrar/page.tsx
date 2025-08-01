'use client'

import MenuButtons from '@/components/menuButtons';
import React, { useEffect, useState } from 'react';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useCreateStore } from '@/stores/useCreateStore';
import SidebarMenu from '@/components/SidebarMenu';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Typography,
  Card,
  CardContent,
  Collapse,
  Divider,
} from '@mui/material';


export default function Page() {
  const { categories, fetchCategories } = useCategoryStore();
  const { sendCreateRequest, sendEANRequest, isLoading } = useCreateStore();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      sendCreateRequest(inputValue.trim());
    }
  };
  const sendEANReq = () => {
    sendEANRequest(); // ✅ correto, sem argumento
  };

return (
  <Box
    sx={{
      width: '100%',
      height: '100%',
      backgroundColor: '#f0f4f8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '0px',
      color: 'black',
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      lineHeight: '1.5',
      flexDirection: 'column',
      gap: '20px',
    }}
  >
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <SidebarMenu />
      <Box component="main" sx={{ flexGrow: 1, padding: 3 }}>
        {/* Conteúdo da página */}
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
            padding: '0px',
            color: 'black',
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            lineHeight: '1.5',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div>Cadastrar:</div>

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
          <div style={{ display: 'flex', gap: '10px' }}>
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

            <button
              onClick={sendEANReq}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Atualizar EAN<p>por tabela xlsx</p>
            </button>
          </div>
        </div>
      </Box>
    </Box>


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
