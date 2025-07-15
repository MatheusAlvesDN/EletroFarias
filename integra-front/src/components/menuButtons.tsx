'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import HelpIcon from '@mui/icons-material/Help';
import LogoutIcon from '@mui/icons-material/Logout';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import CategoryIcon from '@mui/icons-material/Category';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import AddBoxIcon from '@mui/icons-material/AddBox';

export default function MenuButtons() {
  const router = useRouter();
  const [openIfood, setOpenIfood] = useState(false);

  const navigate = (path: string) => {
    router.push(path);
  };

  return (
    <Box sx={{ width: '100%', bgcolor: '#121212', height: '100%', color: '#fff' }}>
      <List component="nav">
        <ListItemButton onClick={() => navigate('/inicio')}>
          <ListItemIcon><HomeIcon sx={{ color: '#fff' }} /></ListItemIcon>
          <ListItemText primary="Início" />
        </ListItemButton>

        <ListItemButton onClick={() => setOpenIfood(!openIfood)}>
          <ListItemIcon><RestaurantIcon sx={{ color: '#fff' }} /></ListItemIcon>
          <ListItemText primary="iFood" />
          {openIfood ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>

        <Collapse in={openIfood} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/consulta')}>
              <ListItemIcon><SearchIcon sx={{ color: '#fff' }} /></ListItemIcon>
              <ListItemText primary="Consultar Produtos" />
            </ListItemButton>

            <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/cadastrar')}>
              <ListItemIcon><AddBoxIcon sx={{ color: '#fff' }} /></ListItemIcon>
              <ListItemText primary="Cadastrar Grupo" />
            </ListItemButton>

            <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/excluir')}>
              <ListItemIcon><DeleteIcon sx={{ color: '#fff' }} /></ListItemIcon>
              <ListItemText primary="Excluir Grupo" />
            </ListItemButton>
          </List>
        </Collapse>

        <Divider sx={{ my: 1, borderColor: '#333' }} />

        <ListItemButton onClick={() => navigate('/ajuda')}>
          <ListItemIcon><HelpIcon sx={{ color: '#fff' }} /></ListItemIcon>
          <ListItemText primary="Ajuda" />
        </ListItemButton>

        <ListItemButton onClick={() => navigate('/')}>
          <ListItemIcon><LogoutIcon sx={{ color: '#fff' }} /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Box>
  );
}
