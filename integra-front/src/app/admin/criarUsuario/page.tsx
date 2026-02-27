'use client';

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Server,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  UserPlus,
  Mail,
  KeyRound,
  Plus
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

// --- Helpers ---
type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
  roles?: string[];
  exp?: number;
  iat?: number;
};

function decodeJwt(token: string | null): JwtPayload | null {
  if (!token || typeof window === 'undefined') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const json = window.atob(base64);
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === 'object') return parsed as JwtPayload;
    return null;
  } catch {
    return null;
  }
}

function decodeJwtEmail(token: string | null) {
  const jwtEmail = decodeJwt(token);
  return jwtEmail?.email ?? jwtEmail?.sub ?? null;
}

export default function Page() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // auth
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // form
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ui feedback
  const [erro, setErro] = useState<string | null>(null);
  
  // Toast Customizado
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    setToken(t);
    setUserEmail(decodeJwtEmail(t));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.replace('/');
  };

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const CREATE_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/criarUsuario` : `/sync/criarUsuario`),
    [API_BASE]
  );

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, open: false }));
    }, 4000);
  }, []);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); // Regex aprimorado para validação básica

  const handleCreate = async () => {
    const e = email.trim();
    const s = senha;

    setErro(null);

    if (!e) {
      setErro('Informe o e-mail.');
      return;
    }
    if (!isValidEmail(e)) {
      setErro('E-mail inválido.');
      return;
    }
    if (!s) {
      setErro('Informe a senha.');
      return;
    }
    if (s.length < 4) {
      setErro('A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const resp = await fetch(CREATE_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify({ email: e, senha: s }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao criar usuário (status ${resp.status})`);
      }

      toast('Usuário criado com sucesso!', 'success');
      setEmail('');
      setSenha('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar usuário';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') handleCreate();
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

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} userEmail={userEmail} onLogout={handleLogout} />

      {/* Header Padronizado */}
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 opacity-90 text-emerald-100" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Painel Gerencial</h1>
                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                  Criação de Usuários
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <img
                src="/eletro_farias2.png"
                alt="Logo 1"
                className="h-16 w-auto object-contain bg-green/10 rounded px-2"                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <img
                src="/lid-verde-branco.png"
                alt="Logo 2"
                className="h-12 w-auto object-contain hidden md:block"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8 animate-fade-in-up">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Cabeçalho do Card */}
          <div className="p-6 border-b border-slate-100 bg-emerald-50/30 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <UserPlus className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-emerald-900">Criar Usuário</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Informe e-mail e senha para criar um novo usuário no sistema.
              </p>
            </div>
          </div>

          {/* Corpo do Formulário */}
          <div className="p-6 sm:p-8 bg-slate-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {/* Campo E-mail */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 block">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="usuario@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 block">Senha</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Mínimo de 4 caracteres"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                  />
                </div>
              </div>
            </div>

            {erro && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium flex items-center gap-3 animate-fade-in-up">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {erro}
              </div>
            )}

            {/* Ações */}
            <div className="flex justify-end pt-4 border-t border-slate-200 mt-2">
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {submitting ? 'CRIANDO...' : 'CRIAR USUÁRIO'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Snackbar / Toast Customizado */}
      <div 
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-in-out ${
          toastState.open ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
      >
        <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm ${
          toastState.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'
        }`}>
          {toastState.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toastState.msg}
          <button 
            type="button"
            onClick={() => setToastState(s => ({ ...s, open: false }))} 
            className="ml-2 hover:opacity-75 transition-opacity focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

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