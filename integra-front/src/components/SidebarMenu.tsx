'use client';

import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  Typography,
  Divider,
  Box,
  IconButton,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

export const DRAWER_WIDTH = 300;

export type SidebarMenuProps = {
  open: boolean;
  onClose: () => void;
  userEmail?: string | null; // <-- NOVO (opcional)
};

export default function SidebarMenu({ open, onClose, userEmail }: SidebarMenuProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Drawer
      anchor="left"
      variant={isMobile ? 'temporary' : 'persistent'}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: '#1e1e2f',
          color: '#fff',
          overflowY: 'auto',

          '&::-webkit-scrollbar': { width: 0 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,.25)',
            borderRadius: 8,
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(255,255,255,.4)',
          },
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,.4) transparent',
        },
        ...(!isMobile && !open ? { display: 'none' } : {}),
      }}
    >
      {/* topo com botão de fechar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          px: 1,
          height: 64,
        }}
      >
        <IconButton onClick={onClose} sx={{ color: '#fff' }} aria-label="Fechar menu">
          <ChevronLeftIcon />
        </IconButton>
      </Box>

      <Divider sx={{ backgroundColor: '#444' }} />

      <List>
        {/* Avatar / logo */}
        <ListItem sx={{ justifyContent: 'center' }}>
          <Box
            component="img"
            src="/logo.png"
            alt="Avatar"
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              objectFit: 'cover',
              mt: 2,
              mb: 1,
            }}
          />
        </ListItem>

        {/* Nome do usuário (userEmail) */}
        <ListItem sx={{ justifyContent: 'center' }}>
          <Typography variant="h6" sx={{ color: 'grey.300', textAlign: 'center' }}>
            {userEmail || 'Usuário'}
          </Typography>
        </ListItem>

        <Divider sx={{ backgroundColor: '#444', mt: 2 }} />
      </List>
    </Drawer>
  );
}
