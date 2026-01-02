// src/config/menu.ts
import React from 'react';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import CatchingPokemonTwoToneIcon from '@mui/icons-material/CatchingPokemonTwoTone';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import KeyIcon from '@mui/icons-material/Key';
import DifferenceRoundedIcon from '@mui/icons-material/DifferenceRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';

export type Role = 'ADMIN' | 'MANAGER' | 'TRIAGEM' | 'SEPARADOR' | 'ESTOQUE' | 'CONTADOR' | 'SUPERVISOR' | 'USER';

export type MenuItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  rolesAllowed?: Role[]; // ✅ agora item também pode restringir
};

export type MenuSection = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  rolesAllowed?: Role[]; // setor restringe
  items: MenuItem[];
};

export const MENU_SECTIONS: MenuSection[] = [
  {
    id: 'triagem',
    title: 'Triagem',
    icon: <AltRouteIcon />,
    rolesAllowed: ['MANAGER'],
    items: [
      { label: 'TRIAGEM ALPHA', path: '/triagem/triagemAlpha', icon: <AltRouteIcon />, rolesAllowed: ['MANAGER'] },
      { label: 'TRIAGEM BETA', path: '/triagem/triagemBeta', icon: <AltRouteIcon />, rolesAllowed: ['MANAGER'] },
    ],
  },
  {
    id: 'request',
    title: 'Solicitar Item',
    icon: <DifferenceRoundedIcon />,
    items: [
      { label: 'SOLICITAR ITEM', path: '/ajustes/requisicao', icon: <DifferenceRoundedIcon />},
      { label: 'ACOMPANHAR SOLICITAÇÃO', path: '/ajustes/acompanhar', icon: <DifferenceRoundedIcon />},
    ],
  },
  {
    id: 'aprove',
    title: 'Aprovar Item',
    icon: <DifferenceRoundedIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'],
    items: [
      { label: 'APROVAR ITEM', path: '/ajustes/baixa', icon: <DifferenceRoundedIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventário',
    icon: <Inventory2Icon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'],
    items: [
      { label: 'CONTAGEM', path: '/inventory/contagem', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'] },
      { label: 'RECONTAGEM', path: '/inventory/recontagem', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'] },
      { label: 'TERCEIRA CONTAGEM', path: '/inventory/terceira_contagem', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'] },
      { label: 'PRODUTOS NÃO LOCALIZADOS', path: '/inventory/inventorynotcount', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'] },
      { label: 'PRODUTOS CONTADOS', path: '/inventory/inventorycount', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    id: 'inventoryAdmin',
    title: 'Ajustes de Inventario',
    icon: <Inventory2Icon />,
    rolesAllowed: ['ADMIN', 'MANAGER'],
    items: [
      { label: 'CONTAGENS REALIZADAS', path: '/inventory/contagens', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER'] },
      { label: 'AJUSTE DE INVENTÁRIO', path: '/inventory/ajustar', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER'] },
      { label: 'INCLUIR NOTA DE VENDA', path: '/inventory/notanegativa', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER'] },
      { label: 'INCLUIR NOTA DE COMPRA', path: '/inventory/notapositiva', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER'] },
      { label: 'EXPORTAR .CSV DO INVENTÁRIO', path: '/inventory/auditoria', icon: <Inventory2Icon />, rolesAllowed: ['ADMIN', 'MANAGER'] },
    ],
  },  
  {
    id: 'estoque',
    title: 'Estoque',
    icon: <WarehouseIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE'],
    items: [
      { label: 'CONSULTA DE PRODUTOS', path: '/estoque/sankhya', icon: <WarehouseIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE'] },
      { label: 'ATUALIZAÇÃO DE LOCALIZAÇÃO', path: '/estoque/estoque', icon: <WarehouseIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE'] },
      { label: 'ATUALIZAÇÃO DE CODIGO DE BARRAS', path: '/estoque/codBarras', icon: <WarehouseIcon />, rolesAllowed: ['ADMIN','MANAGER', 'ESTOQUE'] },
    ],
  },
  {
    id: 'admin',
    title: 'Admin',
    icon: <ManageAccountsIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER','SUPERVISOR'],
    items: [
      { label: 'CONTROLE DE ACESSOS', path: '/admin/acessos', icon: <KeyIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
      { label: 'CRIAR USUÁRIO', path: '/admin/criarUsuario', icon: <PersonAddRoundedIcon />, rolesAllowed: ['ADMIN', 'MANAGER','SUPERVISOR'] },
    ],
  },
  {
    id: 'manager',
    title: 'Manager',
    icon: <CatchingPokemonTwoToneIcon />,
    rolesAllowed: ['MANAGER'],
    items: [
      { label: 'CONTAGEM LITE', path: '/inventory/contagemLite', icon: <CatchingPokemonTwoToneIcon />, rolesAllowed: ['MANAGER'] },
      { label: 'INCLUIR NOTA DE SAIDA', path: '/manager/notanegativa', icon: <CatchingPokemonTwoToneIcon />, rolesAllowed: ['MANAGER'] },
      { label: 'INCLUIR NOTA DE ENTRADA', path: '/manager/notapositiva', icon: <CatchingPokemonTwoToneIcon />, rolesAllowed: ['MANAGER'] },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: <PlaylistAddCheckIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER','SUPERVISOR'],
    // sem rolesAllowed => todos logados podem ver o setor
    items: [
      { label: 'DASHBOARD', path: '/map/mapBeta', icon: <PlaylistAddCheckIcon /> }, // sem rolesAllowed => todos logados
    ],
  },
];

export function filterSectionsByRole(sections: MenuSection[], role: Role | null) {
  if (!role) return sections.filter((s) => !s.rolesAllowed || s.rolesAllowed.length === 0);
  return sections.filter((s) => {
    if (!s.rolesAllowed || s.rolesAllowed.length === 0) return true;
    return s.rolesAllowed.includes(role);
  });
}

export function filterItemsByRole(items: MenuItem[], role: Role | null) {
  if (!role) return items.filter((i) => !i.rolesAllowed || i.rolesAllowed.length === 0);
  return items.filter((i) => {
    if (!i.rolesAllowed || i.rolesAllowed.length === 0) return true;
    return i.rolesAllowed.includes(role);
  });
}

// ✅ pega roles permitidas para um path (considerando setor e item)
export function getAllowedRolesForPath(pathname: string): Role[] | null {
  for (const s of MENU_SECTIONS) {
    for (const it of s.items) {
      if (it.path === pathname) {
        const sectionRoles = s.rolesAllowed ?? null;
        const itemRoles = it.rolesAllowed ?? null;

        // se nenhum define, é público para logados
        if (!sectionRoles && !itemRoles) return null;

        // interseção se ambos existirem
        if (sectionRoles && itemRoles) {
          return sectionRoles.filter((r) => itemRoles.includes(r));
        }

        return (itemRoles ?? sectionRoles) ?? null;
      }
    }
  }
  return null; // path não mapeado -> deixa o guard controlar via props
}

export function canAccessPath(pathname: string, role: Role | null): boolean {
  const allowed = getAllowedRolesForPath(pathname);
  if (!allowed || allowed.length === 0) return true; // sem restrição
  if (!role) return false;
  return allowed.includes(role);
}

export function filterMenuByRole(sections: MenuSection[], role: Role | null) {
  // normaliza role (evita 'manager', 'MANAGER ', etc)
  const normalizedRole = (role ? String(role).trim().toUpperCase() : null) as Role | null;

  const allowedSections = filterSectionsByRole(sections, normalizedRole);

  return allowedSections
    .map((s) => {
      // filtra itens também
      const allowedItems = filterItemsByRole(s.items, normalizedRole);
      return { ...s, items: allowedItems };
    })
    .filter((s) => s.items.length > 0); // remove seção vazia
}
