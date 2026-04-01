// src/config/menu.ts
import React from 'react';

// ==========================================
// IMPORTS DE ÍCONES (MUI)
// ==========================================
// Seções / Navegação Base
import DashboardIcon from '@mui/icons-material/Dashboard';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import RuleIcon from '@mui/icons-material/Rule';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AssessmentIcon from '@mui/icons-material/Assessment'; // Gerência / Relatórios
import ConstructionIcon from '@mui/icons-material/Construction'; // Em desenvolvimento

// Triagem
import CallSplitIcon from '@mui/icons-material/CallSplit';

// Solicitar / Aprovar
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import FactCheckIcon from '@mui/icons-material/FactCheck';

// Inventário
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Looks3Icon from '@mui/icons-material/Looks3';
import SearchOffIcon from '@mui/icons-material/SearchOff'; // Produtos não localizados
import TaskAltIcon from '@mui/icons-material/TaskAlt'; // Produtos contados
import ListAltIcon from '@mui/icons-material/ListAlt'; // Contagens realizadas
import TuneIcon from '@mui/icons-material/Tune';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

// Notas / Entradas e Saídas
import OutputIcon from '@mui/icons-material/Output'; // Nota de Saída/Venda
import InputIcon from '@mui/icons-material/Input'; // Nota de Entrada/Compra
import OutboundIcon from '@mui/icons-material/Outbound';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';

// Estoque
import ContentPasteSearchIcon from '@mui/icons-material/ContentPasteSearch'; // Consulta detalhada
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'; // Código de barras
import PolicyIcon from '@mui/icons-material/Policy'; // Auditoria
import QueryStatsIcon from '@mui/icons-material/QueryStats'; // Acompanhar auditoria

// Admin / Usuários
import KeyIcon from '@mui/icons-material/Key';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';

// Manager / Integrações / Triggers
import SpeedIcon from '@mui/icons-material/Speed'; // Contagem Lite (Rápida)
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining'; // iFood
import BoltIcon from '@mui/icons-material/Bolt'; // Triggers
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'; // Compras

// Mapa / Operacional
import ExploreIcon from '@mui/icons-material/Explore'; // Mapa Dashboard
import LocationOnIcon from '@mui/icons-material/LocationOn'; // Localizações
import LocalShippingIcon from '@mui/icons-material/LocalShipping'; // Expedição
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'; // Expedição Beta
import ViewInArIcon from '@mui/icons-material/ViewInAr'; // Separação (Caixas 3D)
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed'; // Separação Beta
import CableIcon from '@mui/icons-material/Cable'; // Cabos
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent'; // Cabos Beta

// Relatórios
import SavingsIcon from '@mui/icons-material/Savings'; // Incentivos
import DescriptionIcon from '@mui/icons-material/Description'; // CFOP
import FindInPageIcon from '@mui/icons-material/FindInPage'; // Detalhamento
import TimelineIcon from '@mui/icons-material/Timeline'; // Acompanhamento de notas

// Lucide
import { MapIcon } from 'lucide-react';

// ==========================================
// TIPAGENS
// ==========================================
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

// ==========================================
// CONFIGURAÇÃO DO MENU
// ==========================================
export const MENU_SECTIONS: MenuSection[] = [
  {
    id: 'triagem',
    title: 'Triagem',
    icon: <AltRouteIcon />,
    rolesAllowed: ['MANAGER'],
    items: [
      { label: 'TRIAGEM ALPHA', path: '/triagem/triagemAlpha', icon: <CallSplitIcon />, rolesAllowed: ['MANAGER'] },
      { label: 'TRIAGEM BETA', path: '/triagem/triagemBeta', icon: <CallSplitIcon />, rolesAllowed: ['MANAGER'] },
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
      { label: 'PRODUTOS NÃO LOCALIZADOS', path: '/inventory/inventorynotcount', icon: <SearchOffIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR', 'SUPERVISOR'] },
      { label: 'PRODUTOS CONTADOS', path: '/inventory/inventorycount', icon: <TaskAltIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
    ],
  },
  {
    id: 'inventoryAdmin',
    title: 'Ajustes de Inventário',
    icon: <TuneIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER'],
    items: [
      { label: 'CONTAGENS REALIZADAS', path: '/inventory/contagens', icon: <ListAltIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
      { label: 'AJUSTE DE INVENTÁRIO', path: '/inventory/ajustar', icon: <TuneIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
      { label: 'INCLUIR NOTA DE VENDA', path: '/inventory/notanegativa', icon: <OutputIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
      { label: 'INCLUIR NOTA DE COMPRA', path: '/inventory/notapositiva', icon: <InputIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
      { label: 'EXPORTAR .CSV DO INVENTÁRIO', path: '/inventory/auditoria', icon: <FileDownloadIcon />, rolesAllowed: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    id: 'estoque',
    title: 'Estoque',
    icon: <WarehouseIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE', 'AUDITOR', 'SUPERVISOR'],
    items: [
      { label: 'CONSULTA DE PRODUTOS', path: '/estoque/sankhya', icon: <ContentPasteSearchIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE', 'AUDITOR', 'SUPERVISOR'] },
      { label: 'ATUALIZAÇÃO DE LOCALIZAÇÃO', path: '/estoque/estoque', icon: <EditLocationAltIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE', 'SUPERVISOR'] },
      { label: 'ATUALIZAÇÃO DE CÓDIGO DE BARRAS', path: '/estoque/codBarras', icon: <QrCodeScannerIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE', 'SUPERVISOR'] },
      { label: 'AUDITORIA', path: '/estoque/erroEstoque/beta', icon: <PolicyIcon />, rolesAllowed: ['MANAGER', 'ADMIN', 'AUDITOR', 'SUPERVISOR'] },
      { label: 'ACOMPANHAR AUDITORIA', path: '/estoque/acompanharAuditoria', icon: <QueryStatsIcon />, rolesAllowed: ['ADMIN', 'MANAGER', 'AUDITOR', 'SUPERVISOR'] },
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
      { label: 'CONTAGEM LITE', path: '/inventory/contagemLite', icon: <SpeedIcon />, rolesAllowed: ['MANAGER'] },
      { label: 'INCLUIR NOTA DE SAÍDA', path: '/manager/notanegativa', icon: <OutboundIcon />, rolesAllowed: ['MANAGER'] },
      { label: 'INCLUIR NOTA DE ENTRADA', path: '/manager/notapositiva', icon: <MoveToInboxIcon />, rolesAllowed: ['MANAGER'] },
      { label: 'IFOOD', path: '/cadastrar', icon: <DeliveryDiningIcon />, rolesAllowed: ['MANAGER'] },
      { label: 'TRIGGERS', path: '/dashboard/triggers/beta', icon: <BoltIcon />, rolesAllowed: ['MANAGER'] },
      { label: 'EXPEDIÇÃO BETA', path: '/map/expedicao/beta', rolesAllowed: ['MANAGER'], icon: <RocketLaunchIcon /> },
      { label: 'CABOS BETA', path: '/map/cabos/beta', rolesAllowed: ['MANAGER'], icon: <SettingsInputComponentIcon /> },
      { label: 'SEPARAÇÃO BETA', path: '/map/separacao/beta', rolesAllowed: ['MANAGER'], icon: <DynamicFeedIcon /> },
    ],
  },
  {
    id: 'todo',
    title: 'Em Desenvolvimento',
    icon: <ConstructionIcon />,
    rolesAllowed: ['MANAGER', 'ADMIN'],
    items: [
      { label: 'COMPRAS - Tela Monitoramento Entrada', path: '/compras/pagina1', icon: <ShoppingCartIcon />, rolesAllowed: ['MANAGER', 'ADMIN'] },
      { label: 'COMPRAS - Tela Auditoria Entrada', path: '/compras/pagina2', icon: <ShoppingCartIcon />, rolesAllowed: ['MANAGER', 'ADMIN'] },
      { label: 'COMPRAS - Monitoramento de Produtos', path: '/compras/compras', icon: <ShoppingCartIcon />, rolesAllowed: ['MANAGER', 'ADMIN'] },
      { label: 'NCM - Cadastro e Listagem', path: '/ncm', icon: <FormatListNumberedIcon />, rolesAllowed: ['MANAGER', 'ADMIN'] },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: <DashboardIcon />,
    rolesAllowed: ['MANAGER'],
    items: [
      { label: 'DASHBOARD', path: '/map/mapBeta', rolesAllowed: ['MANAGER'], icon: <ExploreIcon /> },
      { label: 'EXPEDIÇÃO', path: '/map/expedicao', rolesAllowed: ['MANAGER'], icon: <LocalShippingIcon /> },
    ],
  },
  {
    id: 'map',
    title: 'Mapa',
    icon: <MapIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'],
    items: [
      { label: 'DASHBOARD', path: '/map/mapBeta', rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'], icon: <ExploreIcon /> },
      { label: 'LOCALIZAÇÕES WMS', path: '/map/localizacoes', rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'], icon: <LocationOnIcon /> },
      { label: 'EXPEDIÇÃO', path: '/map/expedicao', rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'], icon: <LocalShippingIcon /> },
      { label: 'SEPARAÇÃO', path: '/map/separacao', rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'], icon: <ViewInArIcon /> },
      { label: 'CABOS', path: '/map/cabos', rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'], icon: <CableIcon /> },
    ],
  },
  {
    id: 'gerencia',
    title: 'Gerência',
    icon: <AssessmentIcon />,
    rolesAllowed: ['ADMIN', 'MANAGER'],
    items: [
      { label: 'Relatório de Incentivos', path: '/dashboard/relatorioIncentivoSaida/beta', rolesAllowed: ['ADMIN', 'MANAGER'], icon: <SavingsIcon /> },
      { label: 'Relatório CFOP', path: '/dashboard/relatorioCFOPTare', rolesAllowed: ['ADMIN', 'MANAGER'], icon: <DescriptionIcon /> },
      { label: 'Detalhamento de notas por CFOP ', path: '/dashboard/relatorioDetalhado', rolesAllowed: ['ADMIN', 'MANAGER'], icon: <FindInPageIcon /> },
      { label: 'Acompanhamento Notas', path: '/dashboard/acompanhamentoNotas', rolesAllowed: ['ADMIN', 'MANAGER'], icon: <TimelineIcon /> },
      { label: 'Auditoria de Notas', path: '/dashboard/auditoriaNotas', rolesAllowed: ['ADMIN', 'MANAGER'], icon: <TimelineIcon /> },
      { label: 'Relatório de Vendas e Custos', path: '/dashboard/notas-venda', rolesAllowed: ['ADMIN', 'MANAGER'], icon: <TimelineIcon /> },

    ],
  },
];

// ==========================================
// FUNÇÕES DE FILTRO E ACESSO
// ==========================================
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

export function filterMenuByRoleAndAccess(
  sections: MenuSection[],
  role: Role | null,
  customAccesses: string[] = [] // O array 'acessos' do banco
) {
  const normalizedRole = (role ? String(role).trim().toUpperCase() : null) as Role | null;

  return sections
    .map((section) => {
      // Filtra os itens da seção
      const allowedItems = section.items.filter((item) => {
        // 1. Verifica se a Role permite
        const roleAllowed = !item.rolesAllowed || (normalizedRole && item.rolesAllowed.includes(normalizedRole));

        // 2. Verifica se o path específico está liberado no array 'acessos'
        const pathAllowed = customAccesses.includes(item.path);

        return roleAllowed || pathAllowed;
      });

      return { ...section, items: allowedItems };
    })
    // Mantém a seção se ela tiver itens ou se a própria seção for liberada pela role
    .filter((section) => {
      const sectionRoleAllowed = !section.rolesAllowed || (normalizedRole && section.rolesAllowed.includes(normalizedRole));
      return section.items.length > 0 || sectionRoleAllowed;
    });
}

export function canAccessPath(pathname: string, role: Role | null, customAccesses: string[] = []): boolean {
  if (customAccesses.includes(pathname)) return true; // Liberação explícita

  const allowed = getAllowedRolesForPath(pathname);
  if (!allowed || allowed.length === 0) return true;
  if (!role) return false;
  return allowed.includes(role);
}