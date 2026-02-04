'use client';
import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  GitBranch, 
  Package, 
  Warehouse, 
  UserCog, 
  ShieldCheck, 
  ClipboardList,
  PlusCircle,
  Search,
  MapPin,
  QrCode,
  Key,
  UserPlus,
  BarChart3,
  FileText,
  FileDown,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Settings,
  LogOut,
  Bell
} from 'lucide-react';

// --- Tipagens e Configurações ---

export type Role =
  | 'ADMIN'
  | 'MANAGER'
  | 'TRIAGEM'
  | 'SEPARADOR'
  | 'ESTOQUE'
  | 'CONTADOR'
  | 'SUPERVISOR'
  | 'USER'
  | 'AUDITOR';

export interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  rolesAllowed?: Role[];
}

export interface MenuSection {
  id: string;
  title: string;
  icon?: React.ReactNode;
  rolesAllowed?: Role[];
  items: MenuItem[];
}

interface ActiveItem {
  label: string;
  sectionTitle: string;
  icon: React.ReactNode;
  path?: string;
}

const ROLES: Role[] = [
  'ADMIN', 'MANAGER', 'TRIAGEM', 'SEPARADOR', 'ESTOQUE', 'CONTADOR', 'SUPERVISOR', 'USER', 'AUDITOR'
];

// Mapeamento de Ícones
const iconMap = {
  DashboardIcon: <LayoutDashboard size={20} />,
  AltRouteIcon: <GitBranch size={20} />,
  Inventory2Icon: <Package size={20} />,
  WarehouseIcon: <Warehouse size={20} />,
  ManageAccountsIcon: <UserCog size={20} />,
  RuleIcon: <ShieldCheck size={20} />,
  AssignmentIcon: <ClipboardList size={20} />,
  PlaylistAddIcon: <PlusCircle size={20} />,
  TrackChangesIcon: <Search size={20} />,
  FactCheckIcon: <ShieldCheck size={20} />,
  FormatListNumberedIcon: <ClipboardList size={20} />,
  RestartAltIcon: <PlusCircle size={20} />,
  Looks3Icon: <BarChart3 size={20} />,
  ReportProblemIcon: <Bell size={20} />,
  DoneAllIcon: <ShieldCheck size={20} />,
  TuneIcon: <Settings size={20} />,
  ReceiptLongIcon: <FileText size={20} />,
  FileDownloadIcon: <FileDown size={20} />,
  SearchIcon: <Search size={20} />,
  EditLocationAltIcon: <MapPin size={20} />,
  QrCode2Icon: <QrCode size={20} />,
  KeyIcon: <Key size={20} />,
  PersonAddRoundedIcon: <UserPlus size={20} />,
  AdminPanelSettingsIcon: <ShieldCheck size={20} />,
  ReceiptIcon: <FileText size={20} />,
};

const MENU_SECTIONS: MenuSection[] = [
  {
    id: 'triagem',
    title: 'Triagem',
    icon: iconMap.AltRouteIcon,
    rolesAllowed: ['MANAGER'],
    items: [
      { label: 'TRIAGEM ALPHA', path: '/triagem/triagemAlpha', icon: iconMap.AltRouteIcon, rolesAllowed: ['MANAGER'] },
      { label: 'TRIAGEM BETA', path: '/triagem/triagemBeta', icon: iconMap.AltRouteIcon, rolesAllowed: ['MANAGER'] },
    ],
  },
  {
    id: 'request',
    title: 'Solicitar Item',
    icon: iconMap.AssignmentIcon,
    items: [
      { label: 'SOLICITAR ITEM', path: '/ajustes/requisicao', icon: iconMap.PlaylistAddIcon },
      { label: 'ACOMPANHAR SOLICITAÇÃO', path: '/ajustes/acompanhar', icon: iconMap.TrackChangesIcon },
    ],
  },
  {
    id: 'aprove',
    title: 'Aprovar Item',
    icon: iconMap.RuleIcon,
    rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'],
    items: [
      { label: 'APROVAR ITEM', path: '/ajustes/baixa', icon: iconMap.FactCheckIcon, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventário',
    icon: iconMap.Inventory2Icon,
    rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'],
    items: [
      { label: 'CONTAGEM', path: '/inventory/contagem', icon: iconMap.FormatListNumberedIcon, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'] },
      { label: 'RECONTAGEM', path: '/inventory/recontagem', icon: iconMap.RestartAltIcon, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'] },
      { label: 'TERCEIRA CONTAGEM', path: '/inventory/terceira_contagem', icon: iconMap.Looks3Icon, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'] },
      { label: 'PRODUTOS NÃO LOCALIZADOS', path: '/inventory/inventorynotcount', icon: iconMap.ReportProblemIcon, rolesAllowed: ['ADMIN', 'MANAGER', 'CONTADOR'] },
      { label: 'PRODUTOS CONTADOS', path: '/inventory/inventorycount', icon: iconMap.DoneAllIcon, rolesAllowed: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    id: 'inventoryAdmin',
    title: 'Ajustes de Inventário',
    icon: iconMap.TuneIcon,
    rolesAllowed: ['ADMIN', 'MANAGER'],
    items: [
      { label: 'CONTAGENS REALIZADAS', path: '/inventory/contagens', icon: iconMap.ReceiptLongIcon, rolesAllowed: ['ADMIN', 'MANAGER'] },
      { label: 'AJUSTE DE INVENTÁRIO', path: '/inventory/ajustar', icon: iconMap.TuneIcon, rolesAllowed: ['ADMIN', 'MANAGER'] },
      { label: 'INCLUIR NOTA DE VENDA', path: '/inventory/notanegativa', icon: iconMap.ReceiptIcon, rolesAllowed: ['ADMIN', 'MANAGER'] },
      { label: 'INCLUIR NOTA DE COMPRA', path: '/inventory/notapositiva', icon: iconMap.ReceiptIcon, rolesAllowed: ['ADMIN', 'MANAGER'] },
      { label: 'EXPORTAR .CSV DO INVENTÁRIO', path: '/inventory/auditoria', icon: iconMap.FileDownloadIcon, rolesAllowed: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    id: 'estoque',
    title: 'Estoque',
    icon: iconMap.WarehouseIcon,
    rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE'],
    items: [
      { label: 'CONSULTA DE PRODUTOS', path: '/estoque/sankhya', icon: iconMap.SearchIcon, rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE'] },
      { label: 'ATUALIZAÇÃO DE LOCALIZAÇÃO', path: '/estoque/estoque', icon: iconMap.EditLocationAltIcon, rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE'] },
      { label: 'ATUALIZAÇÃO DE CÓDIGO DE BARRAS', path: '/estoque/codBarras', icon: iconMap.QrCode2Icon, rolesAllowed: ['ADMIN', 'MANAGER', 'ESTOQUE'] },
    ],
  },
  {
    id: 'admin',
    title: 'Admin',
    icon: iconMap.ManageAccountsIcon,
    rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'],
    items: [
      { label: 'CONTROLE DE ACESSOS', path: '/admin/acessos', icon: iconMap.KeyIcon, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
      { label: 'CRIAR USUÁRIO', path: '/admin/criarUsuario', icon: iconMap.PersonAddRoundedIcon, rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
    ],
  },
  {
    id: 'manager',
    title: 'Manager',
    icon: iconMap.AdminPanelSettingsIcon,
    rolesAllowed: ['MANAGER'],
    items: [
      { label: 'CONTAGEM LITE', path: '/inventory/contagemLite', icon: iconMap.FormatListNumberedIcon, rolesAllowed: ['MANAGER'] },
      { label: 'INCLUIR NOTA DE SAÍDA', path: '/manager/notanegativa', icon: iconMap.ReceiptIcon, rolesAllowed: ['MANAGER'] },
      { label: 'INCLUIR NOTA DE ENTRADA', path: '/manager/notapositiva', icon: iconMap.ReceiptIcon, rolesAllowed: ['MANAGER'] },
      { label: 'IFOOD', path: '/cadastrar', icon: iconMap.ReceiptIcon, rolesAllowed: ['MANAGER'] },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: iconMap.DashboardIcon,
    rolesAllowed: ['ADMIN', 'MANAGER', 'SUPERVISOR'],
    items: [
      { label: 'DASHBOARD', path: '/map/mapBeta', icon: iconMap.DashboardIcon },
      { label: 'EXPEDIÇÃO', path: '/map/expedicao', icon: iconMap.DashboardIcon },
    ],
  },
];

// --- Funções de Filtro ---

function filterSectionsByRole(sections: MenuSection[], role: Role | null): MenuSection[] {
  if (!role) return sections.filter((s) => !s.rolesAllowed || s.rolesAllowed.length === 0);
  return sections.filter((s) => {
    if (!s.rolesAllowed || s.rolesAllowed.length === 0) return true;
    return s.rolesAllowed.includes(role);
  });
}

function filterItemsByRole(items: MenuItem[], role: Role | null): MenuItem[] {
  if (!role) return items.filter((i) => !i.rolesAllowed || i.rolesAllowed.length === 0);
  return items.filter((i) => {
    if (!i.rolesAllowed || i.rolesAllowed.length === 0) return true;
    return i.rolesAllowed.includes(role);
  });
}

function filterMenuByRole(sections: MenuSection[], role: Role | null): MenuSection[] {
  const normalizedRole = role ? (role.trim().toUpperCase() as Role) : null;
  const allowedSections = filterSectionsByRole(sections, normalizedRole);

  return allowedSections
    .map((s) => {
      const allowedItems = filterItemsByRole(s.items, normalizedRole);
      return { ...s, items: allowedItems };
    })
    .filter((s) => s.items.length > 0);
}

// --- Componentes de UI ---

interface SidebarItemProps {
  item: MenuItem;
  isActive: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ item, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
      isActive 
      ? 'bg-blue-600 text-white shadow-md' 
      : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <span className={isActive ? 'text-white' : 'text-slate-400'}>
      {item.icon}
    </span>
    <span className="truncate uppercase tracking-wider text-[11px]">{item.label}</span>
  </button>
);

interface SidebarSectionProps {
  section: MenuSection;
  activePath: string;
  onNavigate: (path: string) => void;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({ section, activePath, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-2 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          {section.icon && <span className="opacity-70">{section.icon}</span>}
          <span className="text-[10px] font-bold uppercase tracking-widest">{section.title}</span>
        </div>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      
      {isOpen && (
        <div className="mt-1 space-y-1 ml-2 border-l border-slate-100 pl-2">
          {section.items.map((item) => (
            <SidebarItem 
              key={item.path} 
              item={item} 
              isActive={activePath === item.path}
              onClick={() => onNavigate(item.path)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [currentRole, setCurrentRole] = useState<Role>('ADMIN');
  const [activePath, setActivePath] = useState('/map/mapBeta');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const filteredMenu = useMemo(() => {
    return filterMenuByRole(MENU_SECTIONS, currentRole);
  }, [currentRole]);

  const findActiveItem = (): ActiveItem => {
    for (const section of MENU_SECTIONS) {
      const item = section.items.find(i => i.path === activePath);
      if (item) return { 
        ...item, 
        sectionTitle: section.title,
        icon: item.icon // Garantindo que o ícone venha do item encontrado
      };
    }
    return { 
      label: 'Início', 
      sectionTitle: 'Dashboard', 
      icon: <LayoutDashboard size={20} /> 
    };
  };

  const activeItem = findActiveItem();

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        bg-white border-r border-slate-200 
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-64' : 'w-20'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <Warehouse size={18} />
            </div>
            {isSidebarOpen && <h1 className="font-bold text-slate-800 tracking-tight">LOGIX-PRO</h1>}
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:block p-1 text-slate-400 hover:bg-slate-50 rounded"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div className={`p-4 mx-4 my-4 bg-slate-900 rounded-xl text-white transition-all duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 scale-90 pointer-events-none overflow-hidden'}`}>
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 border-2 border-slate-700 flex items-center justify-center font-bold">
                {currentRole[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate">Operador Sistema</p>
                <p className="text-[10px] text-blue-300 font-mono uppercase">{currentRole}</p>
              </div>
           </div>
        </div>

        <nav className="p-4 h-[calc(100vh-160px)] overflow-y-auto scrollbar-hide">
          {filteredMenu.map((section: MenuSection) => (
            isSidebarOpen ? (
              <SidebarSection 
                key={section.id} 
                section={section} 
                activePath={activePath}
                onNavigate={(path) => {
                  setActivePath(path);
                  setMobileMenuOpen(false);
                }}
              />
            ) : (
              <div key={section.id} className="flex flex-col items-center gap-4 mb-6" title={section.title}>
                <div className="p-2 text-slate-400 bg-slate-50 rounded-lg">
                  {section.icon}
                </div>
              </div>
            )
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-500"
            >
              <Menu size={24} />
            </button>
            <div className="hidden sm:block text-sm text-slate-500">
               <span className="font-medium text-slate-400">{activeItem.sectionTitle}</span>
               <span className="mx-2">/</span>
               <span className="font-semibold text-slate-800 uppercase tracking-tight">{activeItem.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 hidden md:block">Cargo Ativo:</label>
              <select 
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as Role)}
                className="bg-transparent text-xs font-bold text-blue-600 focus:outline-none p-1 cursor-pointer"
              >
                {ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="h-8 w-[1px] bg-slate-200" />
            
            <button className="p-2 text-slate-400 hover:text-slate-600 relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">{activeItem.label}</h2>
              <p className="text-slate-500 mt-1">Painel administrativo de logística.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Package size={24} />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full uppercase">+12.5%</span>
                </div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Itens em Estoque</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">12,480</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <GitBranch size={24} />
                  </div>
                </div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Triagens Ativas</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">42</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                    <ClipboardList size={24} />
                  </div>
                </div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Solicitações</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">156</h3>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-blue-600" />
                    DETALHES DA SEÇÃO
                  </h4>
               </div>
               <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full mb-4">
                    {activeItem.icon}
                  </div>
                  <p className="text-lg font-bold text-slate-800 uppercase">{activeItem.label}</p>
                  <p className="text-slate-500 text-sm max-w-md mx-auto mt-2">
                    Acesso como <span className="text-blue-600 font-bold">{currentRole}</span>.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}