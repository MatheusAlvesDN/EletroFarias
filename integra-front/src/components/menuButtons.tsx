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
import SyncAltIcon from '@mui/icons-material/SyncAlt'; // Ícone para "status"
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'; // Ícone para erro
import LocalShippingIcon from '@mui/icons-material/LocalShipping'; // Ícone para transporte
import TodayIcon from '@mui/icons-material/Today'; // Ícone para pedidos do dia

export default function MenuButtons() {
  const router = useRouter();

  const [openIfood, setOpenIfood] = useState(false);
  const [openFidelimax, setOpenFidelimax] = useState(false);
  const [openTransporte, setOpenTransporte] = useState(false);

  const navigate = (path: string) => {
    router.push(path);
  };

  return (
    <Box sx={{ width: '100%', bgcolor: '#121212', height: '100%', color: '#fff' }}>
      <List component="nav">

        {/* Início */}
        <ListItemButton onClick={() => navigate('/inicio')}>
          <ListItemIcon><HomeIcon sx={{ color: '#fff' }} /></ListItemIcon>
          <ListItemText primary="Início" />
        </ListItemButton>

        {/* Sankhya */}
        <ListItemButton onClick={() => navigate('/sankhya')}>
          <ListItemIcon><HomeIcon sx={{ color: '#fff' }} /></ListItemIcon>
          <ListItemText primary="sankhya" />
        </ListItemButton>

        {/* iFood */}
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

        {/* Fidelimax */}
        <ListItemButton onClick={() => setOpenFidelimax(!openFidelimax)}>
          <ListItemIcon><CategoryIcon sx={{ color: '#fff' }} /></ListItemIcon>
          <ListItemText primary="Fidelimax" />
          {openFidelimax ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>

        <Collapse in={openFidelimax} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/fidelimax/status')}>
              <ListItemIcon><SyncAltIcon sx={{ color: '#fff' }} /></ListItemIcon>
              <ListItemText primary="Status" />
            </ListItemButton>

            <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/fidelimax/erro-devolucao')}>
              <ListItemIcon><ErrorOutlineIcon sx={{ color: '#fff' }} /></ListItemIcon>
              <ListItemText primary="Erro Devol." />
            </ListItemButton>
          </List>
        </Collapse>

        {/* Transporte+ */}
        <ListItemButton onClick={() => setOpenTransporte(!openTransporte)}>
          <ListItemIcon><LocalShippingIcon sx={{ color: '#fff' }} /></ListItemIcon>
          <ListItemText primary="Transporte+" />
          {openTransporte ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>

        <Collapse in={openTransporte} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/transporte/status')}>
              <ListItemIcon><SyncAltIcon sx={{ color: '#fff' }} /></ListItemIcon>
              <ListItemText primary="Status" />
            </ListItemButton>

            <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/transporte/pedidos-hoje')}>
              <ListItemIcon><TodayIcon sx={{ color: '#fff' }} /></ListItemIcon>
              <ListItemText primary="Pedidos Atualizados no Dia" />
            </ListItemButton>
          </List>
        </Collapse>

        <Divider sx={{ my: 1, borderColor: '#333' }} />

        {/* Relatórios */}
        <ListItemButton onClick={() => navigate('/relatorios/notas-venda')}>
          <ListItemIcon><TodayIcon sx={{ color: '#fff' }} /></ListItemIcon>
          <ListItemText primary="Notas de Venda (Custo)" />
        </ListItemButton>

        {/* Ajuda */}
        <ListItemButton onClick={() => navigate('/ajuda')}>
          <ListItemIcon><HelpIcon sx={{ color: '#fff' }} /></ListItemIcon>
          <ListItemText primary="Ajuda" />
        </ListItemButton>

        {/* Logout */}
        <ListItemButton onClick={() => navigate('/')}>
          <ListItemIcon><LogoutIcon sx={{ color: '#fff' }} /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Box>
  );
}
