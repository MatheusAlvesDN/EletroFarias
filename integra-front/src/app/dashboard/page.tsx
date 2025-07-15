'use client'

import MenuButtons from '@/components/menuButtons';
import React, { useEffect } from 'react';
import { useCategoryStore } from '@/stores/useCategoryStore';

export default function Page() {
  const { categories, fetchCategories } = useCategoryStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <div
      style={{
        width: '800px',
        height: '600px',
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
      <div style={{ width: '15%', height: '100%' }}>
        <MenuButtons />
      </div>
<div
  style={{
    width: '85%',
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
  }}
>
  Aplicativo para realizar a integração do estoque da EletroFarias,<p/> do Sankhya para o Ifood.
</div>
    </div>
  );
}