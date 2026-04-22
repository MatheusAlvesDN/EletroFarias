'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Server, Bell, CheckCircle, Clock } from 'lucide-react';
import SidebarMenu from '@/components/SidebarMenu';
import { crmService } from '@/lib/crmService';
import { io, Socket } from 'socket.io-client';

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function DashboardHeader({
  title = "Painel Gerencial",
  subtitle = "Módulo do Sistema",
}: DashboardHeaderProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('authToken');
    if (!t) return;

    // Extrair email e userId do JWT
    try {
      const parts = t.split('.');
      if (parts.length >= 2) {
        const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = atob(payloadBase64);
        const payload = JSON.parse(jsonPayload) as { id?: string; email?: string; userEmail?: string; sub?: string };
        const emailFromJwt = payload.email ?? payload.userEmail ?? payload.sub ?? null;
        if (emailFromJwt) setUserEmail(emailFromJwt);
        if (payload.id) setUserId(payload.id);
      }
    } catch (e) {
      console.error('Erro ao decodificar JWT no Header:', e);
    }
  }, []);

  // Notificações e Socket
  useEffect(() => {
    if (!userId) return;

    // Carregar iniciais
    crmService.listNotifications().then(setNotifications).catch(console.error);

    // Conectar WebSocket
    const s = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001", {
        query: { userId }
    });

    s.on('notificacao', (notif) => {
        setNotifications(prev => [notif, ...prev]);
        // Tocar som opcional ou mostrar toast
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [userId]);

  const toggleNotif = () => setNotifOpen(!notifOpen);

  const markAsRead = async (id: string) => {
    try {
        await crmService.markNotificationRead(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.replace('/');
  };

  return (
    <>
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        title="Abrir Menu"
      >
        <Menu className="w-7 h-7" />
      </button>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} userEmail={userEmail} onLogout={handleLogout} />

      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* LADO ESQUERDO: TÍTULO E LOGOS */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 opacity-90 text-emerald-100" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h1>
                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                  {subtitle}
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 items-center">
              <img
                src="/eletro_farias2.png"
                alt="Logo 1"
                className="h-16 w-auto object-contain bg-green/10 rounded px-2"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <img
                src="/lid-verde-branco.png"
                alt="Logo 2"
                className="h-12 w-auto object-contain hidden md:block"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>

          {/* LADO DIREITO: SINO DE NOTIFICAÇÕES */}
          <div className="relative">
            <button 
              onClick={toggleNotif}
              className="p-2 hover:bg-emerald-600 rounded-full transition-colors relative"
            >
              <Bell className="w-6 h-6" />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-emerald-700 font-bold">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* POPOVER DE NOTIFICAÇÕES */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 text-slate-800 z-50 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-sm">Notificações</h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                    {notifications.length} Novas
                  </span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <p className="text-sm">Nenhuma notificação nova</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 group">
                        <div className="mt-1">
                            <Clock className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold">{n.titulo}</p>
                          <p className="text-[11px] text-slate-500 leading-relaxed">{n.mensagem}</p>
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="mt-2 text-[10px] text-emerald-600 font-bold flex items-center gap-1 hover:underline"
                          >
                            <CheckCircle className="w-3 h-3" /> Marcar como lida
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
