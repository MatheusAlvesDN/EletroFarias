// src/config/menu.ts
import React from 'react';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';

export type Role = 'ADMIN' | 'MANAGER' | 'TRIAGEM' | 'SEPARADOR' | 'ESTOQUE' | 'CONTADOR' | 'USER';

export type MenuItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  rolesAllowed?: Role[]; // ✅ NOVO: bloqueio por botão
};

export type MenuSection = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  rolesAllowed?: Role[]; // bloqueio por setor
  items: MenuItem[];
};

// ✅ Fonte única (Sidebar e Início usam isso)
export const MENU_SECTIONS: MenuSection[] = [
  {
    id: 'triagem',
    title: 'Triagem',
    icon: <AltRouteIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'TRIAGEM'],
    items: [
      { label: 'TRIAGEM', path: '/triagem/triagemChip', icon: <AltRouteIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'TRIAGEM'] },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventario',
    icon: <Inventory2Icon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'],
    items: [
      { label: 'CONTAGEM', path: '/inventory/contagem', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'] },
      { label: 'CONTAGEM LITE', path: '/inventory/contagemLite', icon: <Inventory2Icon />, rolesAllowed: ['MANAGER'] },
      { label: 'RECONTAGEM', path: '/inventory/recontagem', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'] },
      { label: 'TERCEIRA CONTAGEM', path: '/inventory/terceira_contagem', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'] },
      { label: 'PRODUTOS NÃO LOCALIZADOS', path: '/inventory/inventorynotcount', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'] },
      { label: 'PRODUTOS CONTADOS', path: '/inventory/inventorycount', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER'] },
      { label: 'AJUSTE DE INVENTÁRIO', path: '/inventory/ajustar', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    id: 'inventoryAdmin',
    title: 'Ajustes de Inventario',
    icon: <Inventory2Icon />,
    rolesAllowed: ['ADMIN', 'MANAGER'],
    items: [
      { label: 'AJUSTE DE INVENTÁRIO', path: '/inventory/ajustar', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER'] },
      { label: 'INCLUIR NOTA DE SAIDA', path: '/inventory/notanegativa', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER'] },
      { label: 'INCLUIR NOTA DE ENTRADA', path: '/inventory/notanegativa', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    id: 'estoque',
    title: 'Estoque',
    icon: <Inventory2Icon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE'],
    items: [
      { label: 'ESTOQUE', path: '/estoque/sankhya', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE'] },
    ],
  },
  {
    id: 'admin',
    title: 'Admin',
    icon: <Inventory2Icon />,
    rolesAllowed: ['ADMIN', 'MANAGER'],
    items: [
      { label: 'CONTROLE DE ACESSOS', path: '/admin/acessos', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER'] },
      { label: 'CRIAR USUÁRIO', path: '/admin/criarUsuario', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: <PlaylistAddCheckIcon />,
    // sem rolesAllowed => todos logados podem ver o setor
    items: [
      { label: 'DASHBOARD', path: '/map', icon: <PlaylistAddCheckIcon /> }, // sem rolesAllowed => todos logados
    ],
  },
];

function canAccess(role: Role | null, rolesAllowed?: Role[]) {
  if (!rolesAllowed || rolesAllowed.length === 0) return true; // aberto
  if (!role) return false; // sem role => não entra em área restrita
  return rolesAllowed.includes(role);
}

export function filterSectionsByRole(sections: MenuSection[], role: Role | null): MenuSection[] {
  return sections
    .filter((section) => canAccess(role, section.rolesAllowed))
    .map((section) => {
      const items = section.items.filter((item) => canAccess(role, item.rolesAllowed));
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0); 
}
