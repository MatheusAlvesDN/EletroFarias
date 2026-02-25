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
  RotateCw,
  Users,
  Trash2,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

type Role = 'TRIAGEM' | 'SEPARADOR' | 'ESTOQUE' | 'CONTADOR' | 'SUPERVISOR' | 'AUDITOR';

type Usuario = {
  userEmail: string;
  role: Role | string; // tolerante caso venha diferente
};

const ROLE_OPTIONS: Role[] = ['TRIAGEM', 'SEPARADOR', 'ESTOQUE', 'CONTADOR', 'SUPERVISOR', 'AUDITOR'];

function normalizeRole(r: unknown): string {
  const s = String(r ?? '').trim().toUpperCase();
  return s || 'SEM ROLE';
}

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

  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Toast Customizado
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  // auth
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // estado local de edição por usuário
  const [roleDraftByEmail, setRoleDraftByEmail] = useState<Record<string, Role>>({});
  const [savingEmail, setSavingEmail] = useState<string | null>(null);

  // abas por role
  const [roleTab, setRoleTab] = useState<string>('TODOS');

  // excluir usuario
  const [deleteEmail, setDeleteEmail] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // reset senha
  const [resetLoadingEmail, setResetLoadingEmail] = useState<string | null>(null);

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

  const LIST_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getUsuarios` : `/sync/getUsuarios`), [API_BASE]);
  const CHANGE_ROLE_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/changeRole` : `/sync/changeRole`), [API_BASE]);
  const EXCLUIR_USUARIO_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/excluirUsuario` : `/sync/excluirUsuario`), [API_BASE]);
  const RESETAR_SENHA_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/resetarSenha` : `/sync/resetarSenha`), [API_BASE]);

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

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const resp = await fetch(LIST_URL, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao buscar usuários (status ${resp.status})`);
      }

      const data = (await resp.json()) as unknown;

      // normaliza: aceita [{userEmail, role}] ou [{email, role}]
      const list: Usuario[] = Array.isArray(data)
        ? (data
            .map((u) => {
              const obj = u as Partial<{ userEmail: string; email: string; role: string }>;
              const email = String(obj.userEmail ?? obj.email ?? '').trim();
              const role = String(obj.role ?? '').trim();
              if (!email) return null;
              return { userEmail: email, role };
            })
            .filter(Boolean) as Usuario[])
        : [];

      // remove ADMIN/MANAGER (mantive sua regra)
      const lista = list.filter((user) => normalizeRole(user.role) !== 'ADMIN' && normalizeRole(user.role) !== 'MANAGER');
      setUsers(lista);

      // preenche drafts com role atual (quando for uma Role válida)
      setRoleDraftByEmail((prev) => {
        const next = { ...prev };
        for (const u of lista) {
          const r = normalizeRole(u.role);
          if (ROLE_OPTIONS.includes(r as Role)) {
            if (!next[u.userEmail]) next[u.userEmail] = r as Role;
          } else {
            if (!next[u.userEmail]) next[u.userEmail] = 'CONTADOR';
          }
        }
        return next;
      });

      // garante aba válida
      setRoleTab((t) => (t ? t : 'TODOS'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar usuários';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, getHeaders, toast]);

  useEffect(() => {
    if (token || API_TOKEN) fetchUsers();
  }, [fetchUsers, token, API_TOKEN]);

  const handleChangeDraft = (email: string, role: Role) => {
    setRoleDraftByEmail((prev) => ({ ...prev, [email]: role }));
  };

  const handleSaveRole = async (u: Usuario) => {
    const email = u.userEmail;
    const newRole = roleDraftByEmail[email];

    if (!newRole) {
      toast('Selecione uma role antes de alterar.', 'error');
      return;
    }

    if (savingEmail) return;
    setSavingEmail(email);

    try {
      const resp = await fetch(CHANGE_ROLE_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify({
          userEmail: email,
          role: newRole,
        }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao alterar role (status ${resp.status})`);
      }

      // atualiza visualmente
      setUsers((prev) => prev.map((x) => (x.userEmail === email ? { ...x, role: newRole } : x)));
      toast('Role alterada com sucesso!', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao alterar role';
      toast(msg, 'error');
    } finally {
      setSavingEmail(null);
    }
  };

  const openDelete = (email: string) => setDeleteEmail(email);
  const closeDelete = () => {
    if (deleteLoading) return;
    setDeleteEmail(null);
  };

  const handleExcluirUsuario = useCallback(async () => {
    if (!deleteEmail) return;

    try {
      setDeleteLoading(true);

      const resp = await fetch(EXCLUIR_USUARIO_URL, {
        method: 'POST',
        headers: getHeaders(),
        cache: 'no-store',
        body: JSON.stringify({ userEmail: deleteEmail }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao excluir usuário (status ${resp.status})`);
      }

      setUsers((prev) => prev.filter((u) => u.userEmail !== deleteEmail));
      setRoleDraftByEmail((prev) => {
        const next = { ...prev };
        delete next[deleteEmail];
        return next;
      });

      toast('Usuário excluído com sucesso!', 'success');
      setDeleteEmail(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao excluir usuário';
      toast(msg, 'error');
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteEmail, EXCLUIR_USUARIO_URL, getHeaders, toast]);

  const handleResetarSenha = useCallback(
    async (email: string) => {
      if (resetLoadingEmail) return;
      setResetLoadingEmail(email);

      try {
        const resp = await fetch(RESETAR_SENHA_URL, {
          method: 'POST',
          headers: getHeaders(),
          cache: 'no-store',
          body: JSON.stringify({ userEmail: email }),
        });

        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha ao resetar senha (status ${resp.status})`);
        }

        toast('Senha resetada com sucesso!', 'success');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao resetar senha';
        toast(msg, 'error');
      } finally {
        setResetLoadingEmail(null);
      }
    },
    [RESETAR_SENHA_URL, getHeaders, resetLoadingEmail, toast]
  );

  const usersByRole = useMemo(() => {
    const map = new Map<string, Usuario[]>();
    for (const u of users) {
      const r = normalizeRole(u.role);
      const arr = map.get(r) ?? [];
      arr.push(u);
      map.set(r, arr);
    }
    return map;
  }, [users]);

  const roleTabs = useMemo(() => {
    const present = Array.from(usersByRole.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    // prioriza as roles conhecidas, depois o resto
    const known = ROLE_OPTIONS.map((r) => r).filter((r) => present.includes(r));
    const others = present.filter((r) => !ROLE_OPTIONS.includes(r as Role));
    return ['TODOS', ...known, ...others];
  }, [usersByRole]);

  const filteredUsers = useMemo(() => {
    if (roleTab === 'TODOS') return users;
    return (usersByRole.get(roleTab) ?? []).slice();
  }, [roleTab, users, usersByRole]);

  // se a aba atual sumir, volta para TODOS
  useEffect(() => {
    if (!roleTabs.includes(roleTab)) setRoleTab('TODOS');
  }, [roleTabs, roleTab]);

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
                  Gestão de Usuários
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <img
                src="/eletro_farias2.png"
                alt="Logo 1"
                className="h-12 w-auto object-contain bg-green/10 rounded px-2"
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
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 animate-fade-in-up">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Cabeçalho do Card */}
          <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-xl font-bold text-emerald-900">Listagem de Usuários</h2>
                </div>
                <p className="text-sm text-slate-500 font-medium ml-8">
                  Altere roles, resete senhas ou exclua usuários.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchUsers}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4 text-emerald-600" />}
                Atualizar Lista
              </button>
            </div>

            {/* Abas de Permissão (Roles) */}
            <div className="flex overflow-x-auto border-b border-slate-200 mb-2 scrollbar-thin scrollbar-thumb-slate-300 pb-1">
              {roleTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRoleTab(tab)}
                  className={`px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition-all mr-1 ${
                    roleTab === tab 
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'TODOS' ? 'TODOS' : tab} 
                  <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${
                    roleTab === tab ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab === 'TODOS' ? users.length : (usersByRole.get(tab)?.length ?? 0)}
                  </span>
                </button>
              ))}
            </div>

            {erro && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {erro}
              </div>
            )}
          </div>

          {/* Tabela Principal */}
          <div className="p-0 bg-slate-50/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                <span className="text-sm font-bold">Carregando usuários...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-b border-slate-100">
                <Users className="w-12 h-12 text-slate-300 mb-3" />
                <span className="text-sm font-medium">Nenhum usuário encontrado nesta categoria.</span>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-emerald-50/80 border-b border-emerald-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        E-mail do Usuário
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Role Atual
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider w-48">
                        Nova Role
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider w-28">
                        Alterar
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider w-36">
                        Resetar Senha
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider w-24">
                        Excluir
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredUsers.map((u) => {
                      const currentRole = normalizeRole(u.role);
                      const draft = roleDraftByEmail[u.userEmail] ?? 'CONTADOR';
                      const changed = String(draft) !== currentRole;

                      return (
                        <tr key={u.userEmail} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-mono font-medium text-slate-700">
                            {u.userEmail}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {currentRole}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={draft}
                              onChange={(e) => handleChangeDraft(u.userEmail, e.target.value as Role)}
                              className="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2 outline-none transition-shadow"
                            >
                              {ROLE_OPTIONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleSaveRole(u)}
                              disabled={!changed || savingEmail === u.userEmail}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-full"
                            >
                              {savingEmail === u.userEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                              Salvar
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleResetarSenha(u.userEmail)}
                              disabled={resetLoadingEmail === u.userEmail}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 hover:border-emerald-500 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-slate-500/20 w-full whitespace-nowrap"
                            >
                              {resetLoadingEmail === u.userEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                              Resetar
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => openDelete(u.userEmail)}
                              className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors border border-transparent hover:border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 mx-auto block"
                              title="Excluir usuário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Excluir Usuário */}
      {!!deleteEmail && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-rose-50/50 flex items-center gap-3">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-full">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-rose-900 text-lg">Excluir Usuário</h3>
            </div>
            
            <div className="p-5">
              <p className="text-slate-600 mb-2">Tem certeza que deseja excluir permanentemente o usuário abaixo?</p>
              <p className="font-mono font-bold text-slate-900 bg-slate-100 p-2 rounded border border-slate-200 text-center break-all">
                {deleteEmail}
              </p>
              <p className="text-xs text-rose-500 mt-3 font-medium">Esta ação não poderá ser desfeita.</p>
            </div>
            
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={closeDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleExcluirUsuario}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

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
            className="ml-2 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
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