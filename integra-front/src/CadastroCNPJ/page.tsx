'use client';

import React, { useEffect, useState } from 'react';
import { useCategoryStore } from '@/stores/useCategoryStore';
import SidebarMenu, { DRAWER_WIDTH } from '@/components/SidebarMenu';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Collapse,
  AppBar,
  Toolbar,
  IconButton,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';

interface Item {
  id: string;
  name: string;
  externalCode: string;
  quantity: number;
  price: { value: number };
}

export default function Page() {
  const { categories, fetchCategories } = useCategoryStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* AppBar com toggle */}
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={() => setSidebarOpen(v => !v)} aria-label="menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="h6">Categorias / Itens</Typography>
        </Toolbar>
      </AppBar>

      {/* Espaçador do AppBar */}
      <Toolbar />

      {/* Sidebar controlado (temporary no mobile, persistent no desktop) */}
      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main com scroll e margem quando o menu está aberto no desktop */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: '#f0f4f8',
          p: 3,
          overflowY: 'auto',
          height: 'calc(100vh - 64px)',
          ml: { md: sidebarOpen && !isMobile ? `${DRAWER_WIDTH}px` : 0 },
          transition: (t) =>
            t.transitions.create('margin', {
              easing: t.transitions.easing.sharp,
              duration: t.transitions.duration.leavingScreen,
            }),
        }}
      >
        {categories.map((cat) => (
          <Card
            key={cat.id}
            sx={{ mb: 2, cursor: 'pointer' }}
            onClick={() =>
              setSelectedCategoryId((prev) => (prev === cat.id ? null : cat.id))
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
                  {cat.items.map((item: Item) => (
                    <Typography key={item.id} variant="body2" sx={{ mb: 1 }}>
                      <strong>{item.name}</strong> — Código: {item.externalCode} — Estoque: {item.quantity} — Preço: {item.price.value}
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