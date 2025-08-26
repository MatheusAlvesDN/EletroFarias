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
import MenuButtons from './menuButtons';

export const DRAWER_WIDTH = 300;

export type SidebarMenuProps = {
  open: boolean;
  onClose: () => void;
};

export default function SidebarMenu({ open, onClose }: SidebarMenuProps) {
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

          /* 🔽 Custom Scrollbar (Webkit + Firefox) */
          '&::-webkit-scrollbar': { width: 0 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,.25)',
            borderRadius: 8,
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(255,255,255,.4)',
          },
          scrollbarWidth: 'thin', // Firefox
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
          height: 64, // altura do AppBar
        }}
      >
        <IconButton onClick={onClose} sx={{ color: '#fff' }} aria-label="Fechar menu">
          <ChevronLeftIcon />
        </IconButton>
      </Box>

      <Divider sx={{ backgroundColor: '#444' }} />

      <List>
        <ListItem sx={{ justifyContent: 'center' }}>
          <Box
            component="img"
            src="/logo.png"
            alt="Logo"
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
        <ListItem sx={{ justifyContent: 'center' }}>
          <Typography variant="h6" sx={{ color: 'grey.400' }}>
            EletroFarias
          </Typography>
        </ListItem>

        <Divider sx={{ backgroundColor: '#444' }} />

        <MenuButtons />
      </List>
    </Drawer>
  );
}