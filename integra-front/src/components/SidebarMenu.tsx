'use client';

import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  Typography,
  Divider,
  Box,
} from '@mui/material';
import MenuButtons from './menuButtons';

export default function SidebarMenu() {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          backgroundColor: '#1e1e2f',
          color: '#fff',
        },
      }}
    >
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
          <Typography variant="h6" color="primary">EletroFarias</Typography>
        </ListItem>
        <Divider sx={{ backgroundColor: '#444' }} />
        <MenuButtons />
      </List>
    </Drawer>
  );
}
