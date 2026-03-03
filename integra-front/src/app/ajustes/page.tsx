'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Menu, 
  Server, 
  CreditCard, 
  User, 
  Hash, 
  DollarSign, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X,
  RotateCcw,
  LogOut,
  LayoutDashboard,
  ChevronRight
} from 'lucide-react';

// --- Mock do useRouter para evitar erros de resolução de pacotes no ambiente de preview ---
const useRouter = () => ({
  replace: (path: string) => {
    if (typeof window !== 'undefined') window.location.href = path;
  },
  push: (path: string) => {
    if (typeof window !== 'undefined') window.location.href = path;
  },
});

// --- Helpers de Autenticação & Tipagem ---
type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
};

function decodeJwtEmail(token: string | null): string | null {
  if (!token || typeof window === 'undefined') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const json = window.atob(base64);
    const parsed = JSON.parse(json) as JwtPayload;
    return parsed.email ?? (parsed as any).userEmail ?? parsed.sub ?? null;
  } catch {
    return null;
  }
}

// --- Componente SidebarMenu Inlined ---
const SidebarMenu = ({ open, onClose, userEmail, onLogout }: any) => {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] transition-opacity" onClick={onClose} />
      <aside className="fixed left-0 top-0 h-full w-72 bg-white z-[110] shadow-2xl flex flex-col animate-fade-in-right">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-700 text-white">
          <div className="flex items-center gap-3">
            <Server className="w-6 h-6" />
            <span className="font-bold text-lg">Menu</span>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 py-6 overflow-y-auto px-4 space-y-2">
          <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 text-slate-600 font-medium group transition-colors">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50">
          {userEmail && (
            <div className="mb-4 px-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usuário</p>
              <p className="text-sm font-medium text-slate-700 truncate" title={userEmail}>{userEmail}</p>
            </div>
          )}
          <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
};

// --- Componente Principal ---
export default function App() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Estados do Formulário
  const [nunota, setNunota] = useState('');
  const [cpf, setCpf] = useState('');
  const [vlrnota, setVlrnota] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('authToken');
      if (t) {
        setToken(t);
        setUserEmail(decodeJwtEmail(t));
      }
    }
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ open: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, open: false })), 4000);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
    // Máscara: 000.000.000-00
    let masked = val;
    if (val.length > 3) masked = val.slice(0, 3) + '.' + val.slice(3);
    if (val.length > 6) masked = masked.slice(0, 7) + '.' + masked.slice(7);
    if (val.length > 9) masked = masked.slice(0, 11) + '-' + masked.slice(11);
    setCpf(masked);
  };

  const handleDebit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nunota || !cpf || !vlrnota) {
      showToast('Por favor, preencha todos os campos.', 'error');
      return;
    }

    setLoading(true);
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
      const cleanCpf = cpf.replace(/\D/g, '');
      const cleanVlr = vlrnota.replace(',', '.');

      // Parâmetros via Query String conforme o decorador @Query no backend
      const qs = new URLSearchParams({
        nunota,
        cpf: cleanCpf,
        vlrnota: cleanVlr
      }).toString();

      const response = await fetch(`${API_BASE}/sync/debitarConsumidor?${qs}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok) {
        showToast('Débito processado com sucesso!', 'success');
        setNunota('');
        setCpf('');
        setVlrnota('');
      } else {
        throw new Error(result.message || 'Erro ao processar débito.');
      }
    } catch (err: any) {
      showToast(err.message || 'Falha na comunicação com o servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      router.replace('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
      {/* Botão flutuante sidebar */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-emerald-800 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        title="Abrir Menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} userEmail={userEmail} onLogout={handleLogout} />

      {/* Header Emerald */}
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start pl-16 sm:pl-20">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 opacity-90 text-emerald-100" />
              <div>
                <h1 className="text-xl font-bold tracking-tight">Painel Financeiro</h1>
                <p className="text-emerald-100 text-[10px] uppercase tracking-wider font-bold opacity-80">Débito ao Consumidor</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full max-w-2xl mx-auto p-4 md:p-8 animate-fade-in-up">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-emerald-50/50 p-6 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
                <CreditCard className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-emerald-900 uppercase tracking-tight">Debitar Consumidor</h2>
            </div>
            <p className="text-sm text-slate-500 font-medium text-left">Informe os dados da nota e do cliente para processar o débito no Sankhya.</p>
          </div>

          <form onSubmit={handleDebit} className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Nro Único */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                  <Hash className="w-3 h-3 text-emerald-600" /> Número Único (NUNOTA)
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 123456"
                  value={nunota}
                  onChange={(e) => setNunota(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-lg shadow-inner"
                />
              </div>

              {/* CPF */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                  <User className="w-3 h-3 text-emerald-600" /> CPF do Consumidor
                </label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={handleCpfChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-lg shadow-inner"
                />
              </div>

              {/* Valor Nota */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                  <DollarSign className="w-3 h-3 text-emerald-600" /> Valor da Nota (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={vlrnota}
                    onChange={(e) => setVlrnota(e.target.value.replace(/[^\d,.]/g, ''))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-lg shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => { setNunota(''); setCpf(''); setVlrnota(''); }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors uppercase text-sm tracking-wider"
              >
                <RotateCcw className="w-4 h-4" /> Limpar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-700/20 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100 uppercase text-sm tracking-widest"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {loading ? 'Processando...' : 'Confirmar Débito'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Toast flutuante */}
      {toast.open && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-fade-in-up">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            <span>{toast.msg}</span>
            <button onClick={() => setToast(prev => ({ ...prev, open: false }))} className="ml-2 hover:opacity-70 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeInUp { 
          from { transform: translateY(20px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }
        .animate-fade-in-up { 
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
        @keyframes fadeInRight { 
          from { transform: translateX(-20px); opacity: 0; } 
          to { transform: translateX(0); opacity: 1; } 
        }
        .animate-fade-in-right { 
          animation: fadeInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
      `}</style>
    </div>
  );
}