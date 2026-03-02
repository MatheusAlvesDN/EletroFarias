// src/config/menu.ts
import React from 'react';

// Seções / Navegação
import DashboardIcon from '@mui/icons-material/Dashboard';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import RuleIcon from '@mui/icons-material/Rule';
import AssignmentIcon from '@mui/icons-material/Assignment';

// Itens
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import FactCheckIcon from '@mui/icons-material/FactCheck';

import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Looks3Icon from '@mui/icons-material/Looks3';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import DoneAllIcon from '@mui/icons-material/DoneAll';

import TuneIcon from '@mui/icons-material/Tune';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import SearchIcon from '@mui/icons-material/Search';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import QrCode2Icon from '@mui/icons-material/QrCode2';

import KeyIcon from '@mui/icons-material/Key';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';

// Manager
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { MapIcon } from 'lucide-react';

export type Role =
  | 'ADMIN'
  | 'MANAGER'
  | 'TRIAGEM'
  | 'SEPARADOR'
  | 'ESTOQUE'
  | 'CONTADOR'
  | 'SUPERVISOR'
  | 'AUDITOR'
  | 'USER';

export type MenuItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  rolesAllowed?: Role[];
};

export type MenuSection = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  rolesAllowed?: Role[];
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
    icon: <AssignmentIcon />,
    items: [
      { label: 'SOLICITAR ITEM', path: '/ajustes/requisicao', icon: <PlaylistAddIcon /> },
      { label: 'ACOMPANHAR SOLICITAÇÃO', path: '/ajustes/acompanhar', icon: <TrackChangesIcon /> },
    ],
  },
  {
    id: 'aprove',
    title: 'Aprovar Item',
    icon: <RuleIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'],
    items: [
      { label: 'APROVAR ITEM', path: '/ajustes/baixa', icon: <FactCheckIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventário',
    icon: <Inventory2Icon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'],
    items: [
      { label: 'CONTAGEM', path: '/inventory/contagem', icon: <FormatListNumberedIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR', 'SUPERVISOR'] },
      { label: 'RECONTAGEM', path: '/inventory/recontagem', icon: <RestartAltIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR', 'SUPERVISOR'] },
      { label: 'TERCEIRA CONTAGEM', path: '/inventory/terceira_contagem', icon: <Looks3Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR', 'SUPERVISOR'] },
      { label: 'PRODUTOS NÃO LOCALIZADOS', path: '/inventory/inventorynotcount', icon: <ReportProblemIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR', 'SUPERVISOR'] },
      { label: 'PRODUTOS CONTADOS', path: '/inventory/inventorycount', icon: <DoneAllIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
    ],
  },
  {
    id: 'inventoryAdmin',
    title: 'Ajustes de Inventário',
    icon: <TuneIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER'],
    items: [
      { label: 'CONTAGENS REALIZADAS', path: '/inventory/contagens', icon: <ReceiptLongIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
      { label: 'AJUSTE DE INVENTÁRIO', path: '/inventory/ajustar', icon: <TuneIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
      { label: 'INCLUIR NOTA DE VENDA', path: '/inventory/notanegativa', icon: <ReceiptIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
      { label: 'INCLUIR NOTA DE COMPRA', path: '/inventory/notapositiva', icon: <ReceiptIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
      { label: 'EXPORTAR .CSV DO INVENTÁRIO', path: '/inventory/auditoria', icon: <FileDownloadIcon />, rolesAllowed: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    id: 'estoque',
    title: 'Estoque',
    icon: <WarehouseIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE', 'AUDITOR', 'SUPERVISOR'],
    items: [
      { label: 'CONSULTA DE PRODUTOS', path: '/estoque/sankhya', icon: <SearchIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE', 'AUDITOR', 'SUPERVISOR'] },
      { label: 'ATUALIZAÇÃO DE LOCALIZAÇÃO', path: '/estoque/estoque', icon: <EditLocationAltIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE', 'SUPERVISOR'] },
      { label: 'ATUALIZAÇÃO DE CÓDIGO DE BARRAS', path: '/estoque/codBarras', icon: <QrCode2Icon />, rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE', 'SUPERVISOR'] },
      { label: 'AUDITORIA', path: '/estoque/erroEstoque/beta', icon: <ReceiptIcon />, rolesAllowed: ['MANAGER', 'ADMIN', 'AUDITOR', 'SUPERVISOR'] },
      { label: 'ACOMPANHAR AUDITORIA', path: '/estoque/acompanharAuditoria', icon: <ReceiptIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'AUDITOR', 'SUPERVISOR'] },

    ],
  },
  {
    id: 'admin',
    title: 'Admin',
    icon: <ManageAccountsIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'],
    items: [
      { label: 'CONTROLE DE ACESSOS', path: '/admin/acessos', icon: <KeyIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
      { label: 'CRIAR USUÁRIO', path: '/admin/criarUsuario', icon: <PersonAddRoundedIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
    ],
  },
  {
    id: 'manager',
    title: 'Manager',
    icon: <AdminPanelSettingsIcon />,
    rolesAllowed: ['MANAGER'],
    items: [
      { label: 'CONTAGEM LITE', path: '/inventory/contagemLite', icon: <FormatListNumberedIcon />, rolesAllowed: ['MANAGER'] },
      { label: 'INCLUIR NOTA DE SAÍDA', path: '/manager/notanegativa', icon: <ReceiptIcon />, rolesAllowed: ['MANAGER'] },
      { label: 'INCLUIR NOTA DE ENTRADA', path: '/manager/notapositiva', icon: <ReceiptIcon />, rolesAllowed: ['MANAGER'] },
      { label: 'IFOOD', path: '/cadastrar', icon: <ReceiptIcon />, rolesAllowed: ['MANAGER'] },
      { label: 'TRIGGERS', path: '/dashboard/triggers/beta', icon: <ReceiptIcon />, rolesAllowed: ['MANAGER'] },            
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: <DashboardIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'],
    items: [
      { label: 'DASHBOARD', path: '/map/mapBeta', icon: <DashboardIcon /> },
          { label: 'EXPEDIÇÃO', path: '/map/expedicao', icon: <DashboardIcon /> },
    ],
  },
   {
    id: 'map',
    title: 'Mapa',
    icon: <MapIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'],
    items: [
      { label: 'DASHBOARD', path: '/map/mapBeta', icon: <MapIcon /> },
      { label: 'LOCALIZAÇÕES WMS', path: '/map/localizacoes', icon: <MapIcon /> },
      { label: 'EXPEDIÇÃO', path: '/map/expedicao', icon: <MapIcon /> },
      { label: 'EXPEDIÇÃO BETA', path: '/map/expedicao/beta', icon: <MapIcon /> },
      { label: 'SEPARAÇÃO', path: '/map/separacao', icon: <MapIcon /> },
      { label: 'SEPARAÇÃO BETA', path: '/map/separacao/beta', icon: <MapIcon /> },
      { label: 'CABOS', path: '/map/cabos', icon: <MapIcon /> },
      { label: 'CABOS BETA', path: '/map/cabos/beta', icon: <MapIcon /> },
    ],
  },
     {
    id: 'gerencia',
    title: 'Gerência',
    icon: <AdminPanelSettingsIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER'],
    items: [
      { label: 'Relatório de Incentivos', path: '/dashboard/relatorioIncentivoSaida/beta2', icon: <AdminPanelSettingsIcon /> },
      { label: 'Relatório CFOP', path: '/dashboard/relatorioCFOP/beta', icon: <AdminPanelSettingsIcon /> },
      { label: 'Relatório CFOP', path: '/dashboard/relatorioDetalhado', icon: <AdminPanelSettingsIcon /> },

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

export function getAllowedRolesForPath(pathname: string): Role[] | null {
  for (const s of MENU_SECTIONS) {
    for (const it of s.items) {
      if (it.path === pathname) {
        const sectionRoles = s.rolesAllowed ?? null;
        const itemRoles = it.rolesAllowed ?? null;

        if (!sectionRoles && !itemRoles) return null;

        if (sectionRoles && itemRoles) {
          return sectionRoles.filter((r) => itemRoles.includes(r));
        }

        return (itemRoles ?? sectionRoles) ?? null;
      }
    }
  }
  return null;
}

export function canAccessPath(pathname: string, role: Role | null): boolean {
  const allowed = getAllowedRolesForPath(pathname);
  if (!allowed || allowed.length === 0) return true;
  if (!role) return false;
  return allowed.includes(role);
}

export function filterMenuByRole(sections: MenuSection[], role: Role | null) {
  const normalizedRole = (role ? String(role).trim().toUpperCase() : null) as Role | null;

  const allowedSections = filterSectionsByRole(sections, normalizedRole);

  return allowedSections
    .map((s) => {
      const allowedItems = filterItemsByRole(s.items, normalizedRole);
      return { ...s, items: allowedItems };
    })
    .filter((s) => s.items.length > 0);
}
