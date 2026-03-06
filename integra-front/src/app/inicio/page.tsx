'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  ChevronDown,
  User,
  Shield,
  Server,
  LayoutDashboard
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';
import { MENU_SECTIONS, filterMenuByRoleAndAccess, Role } from '@/config/menu';
import { getEmailFromToken, getRoleFromToken } from '@/utils/jwt';

const ROLE_SET = new Set<Role>([
  'ADMIN',
  'MANAGER',
  'TRIAGEM',
  'SEPARADOR',
  'ESTOQUE',
  'CONTADOR',
  'SUPERVISOR',
  'AUDITOR',
]);

const normalizeRole = (value: unknown): Role | null => {
  const r = String(value ?? '').toUpperCase().trim();
  if (!r) return null;
  return ROLE_SET.has(r as Role) ? (r as Role) : null;
};

export default function Page() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  
  // Estado para armazenar os acessos customizados liberados
  const [acessos, setAcessos] = useState<string[]>([]);

  // setor expandido
  const [openSection, setOpenSection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    if (!t) {
      router.replace('/');
      return;
    }

    setEmail(getEmailFromToken(t) ?? null);
    setRole(normalizeRole(getRoleFromToken(t)));

    // Extrai o array de acessos do payload do JWT
    try {
      const parts = t.split('.');
      if (parts.length === 3) {
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4 !== 0) base64 += '=';
        const payloadJson = window.atob(base64);
        const payload = JSON.parse(payloadJson);
        
        // Verifica se 'acessos' existe no token e se é um array
        if (payload && Array.isArray(payload.acessos)) {
          setAcessos(payload.acessos);
        }
      }
    } catch (error) {
      console.error('Falha ao extrair acessos do token:', error);
    }
  }, [router]);

  // Agora passamos o estado `acessos` para a função de filtro
  const sections = useMemo(() => {
    return filterMenuByRoleAndAccess(MENU_SECTIONS, role, acessos);
  }, [role, acessos]);

  const toggleSection = (id: string) => {
    setOpenSection((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const go = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
      {/* Botão flutuante sidebar */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        title="Abrir Menu"
      >
        <Menu className="w-7 h-7" />
      </button>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 opacity-90 text-emerald-100" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Painel Gerencial</h1>
                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                  Menu Principal
                </p>
              </div>
            </div>
            {/* Logos */}
            <div className="flex gap-4 items-center">
              <img
                src="/eletro_farias2.png"
                alt="Logo 1"
                className="h-16 w-auto object-contain bg-green/10 rounded px-2"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <img
                src="/lid-verde-branco.png"
                alt="Logo 2"
                className="h-12 w-auto object-contain hidden md:block"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8 animate-fade-in-up">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Cabeçalho do Card */}
          <div className="px-6 py-5 border-b border-slate-100 bg-emerald-50/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-900">
                Início
              </h2>
            </div>

            {/* Informações do Usuário */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm text-slate-600 font-medium">
                <User className="w-4 h-4 text-emerald-600" />
                {email ? email : 'Usuário logado'}
              </div>
              {role && (
                <div className="flex items-center gap-1.5 bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full shadow-sm text-emerald-800 font-bold text-xs uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Role: {role}
                </div>
              )}
            </div>
          </div>

          {/* Conteúdo (Seções do Menu) */}
          <div className="p-6 bg-slate-50/50">
            {sections.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-xl border border-slate-200 border-dashed">
                <p className="text-slate-500 font-medium">Nenhuma opção disponível para sua role.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sections.map((section) => {
                  const isOpen = !!openSection[section.id];

                  return (
                    <div key={section.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
                      <button
                        onClick={() => toggleSection(section.id)}
                        className={`w-full flex items-center justify-between p-4 transition-colors focus:outline-none focus:bg-emerald-50/50 ${
                          isOpen ? 'bg-emerald-50/50 border-b border-emerald-100' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 text-slate-800 font-bold text-base">
                          {section.icon ? (
                            <div className={`transition-colors ${isOpen ? 'text-emerald-600' : 'text-slate-400'} [&>svg]:w-5 [&>svg]:h-5`}>
                              {section.icon}
                            </div>
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          )}
                          <span className={isOpen ? 'text-emerald-900' : ''}>{section.title}</span>
                        </div>
                        <ChevronDown 
                          className={`w-5 h-5 transition-transform duration-300 ${
                            isOpen ? 'rotate-180 text-emerald-600' : 'text-slate-400'
                          }`} 
                        />
                      </button>

                      {/* Transição Suave estilo Sanfona */}
                      <div 
                        className={`grid transition-all duration-300 ease-in-out ${
                          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="p-4 grid gap-2 sm:grid-cols-2">
                            {section.items.map((item) => (
                              <button
                                key={item.path}
                                onClick={() => go(item.path)}
                                className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:bg-emerald-600 hover:border-emerald-600 hover:shadow-md transition-all text-left w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500"
                              >
                                {item.icon && (
                                  <div className="text-emerald-600 group-hover:text-emerald-100 transition-colors [&>svg]:w-5 [&>svg]:h-5 shrink-0 bg-emerald-50 group-hover:bg-emerald-700/50 p-2 rounded-md">
                                    {item.icon}
                                  </div>
                                )}
                                <span className="font-semibold text-slate-700 group-hover:text-white transition-colors text-sm">
                                  {item.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes fadeInUp { 
          from { transform: translateY(20px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }
        .animate-fade-in-up { 
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
      `}</style>
    </div>
  );
}