import React from 'react';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';

export type Role = 'ADMIN' | 'MANAGER' | 'TRIAGEM' | 'SEPARADOR' | 'ESTOQUE' | 'CONTADOR' | 'USER';

export type MenuItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

export type MenuSection = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  rolesAllowed?: Role[]; // se não tiver => qualquer role logada pode ver o setor
  items: MenuItem[];
};

// ✅ Fonte única (Sidebar e Início usam isso)
export const MENU_SECTIONS: MenuSection[] = [
  {
    id: 'triagem',
    title: 'Triagem',
    icon: <AltRouteIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'TRIAGEM'],
    items: [{ label: 'TRIAGEM', path: '/triagem/triagemChip', icon: <AltRouteIcon /> }],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: <Inventory2Icon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'],
    items: [
      { label: 'CONTAGEM', path: '/inventory/contagem', icon: <Inventory2Icon /> },
      { label: 'RECONTAGEM', path: '/inventory/recontagem', icon: <Inventory2Icon /> },
      { label: 'TERCEIRA CONTAGEM', path: '/inventory/terceira_contagem', icon: <Inventory2Icon /> },
    ],
  },
  {
    id: 'ajustes',
    title: 'Inventory',
    icon: <Inventory2Icon />,
    rolesAllowed: ['ADMIN', 'MANAGER'],
    items: [
      { label: 'AJUSTE DE INVENTÁRIO', path: '/inventory/contagens', icon: <Inventory2Icon /> },
    ],
  },
  {
    id: 'estoque',
    title: 'Estoque',
    icon: <Inventory2Icon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE'],
    items: [{ label: 'ESTOQUE', path: '/estoque/sankhya', icon: <Inventory2Icon /> }],
  },
  {
    id: 'admin',
    title: 'Admin',
    icon: <Inventory2Icon />,
    rolesAllowed: ['ADMIN', 'MANAGER'],
    items: [
      { label: 'CONTROLE DE ACESSOS', path: '/admin/acessos', icon: <Inventory2Icon /> },
      { label: 'CRIAR USUÁRIO', path: '/admin/criarUsuario', icon: <Inventory2Icon /> },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: <PlaylistAddCheckIcon />,
    // sem rolesAllowed => todos logados
    items: [{ label: 'DASHBOARD', path: '/mapBeta', icon: <PlaylistAddCheckIcon /> }],
  },
];

export function filterSectionsByRole(sections: MenuSection[], role: Role | null) {
  if (!role) return sections.filter((s) => !s.rolesAllowed || s.rolesAllowed.length === 0);
  return sections.filter((s) => {
    if (!s.rolesAllowed || s.rolesAllowed.length === 0) return true;
    return s.rolesAllowed.includes(role);
  });
}
