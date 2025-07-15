'use client';

import React, { useEffect, useState } from 'react';
import { useCategoryStore } from '@/stores/useCategoryStore';
import SidebarMenu from '@/components/SidebarMenu';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Collapse,
} from '@mui/material';

export default function Page() {
  const { categories, fetchCategories } = useCategoryStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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
          p: 3,
          overflowY: 'auto',
        }}
      >
        {categories.map((cat) => (
          <Card
            key={cat.id}
            sx={{ marginBottom: 2, cursor: 'pointer' }}
            onClick={() =>
              setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)
            }
          >
            <CardContent>
              <Typography variant="h6">
                {cat.name} — Código: {cat.externalCode}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {cat.items.length} itens cadastrados
              </Typography>

              <Collapse in={selectedCategoryId === cat.id} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 2, pl: 2 }}>
                  {cat.items.map((item: any) => (
                    <Typography key={item.id} variant="body2" sx={{ mb: 1 }}>
                      <strong>{item.name}</strong> — Código: {item.externalCode}
                    </Typography>
                  ))}
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
