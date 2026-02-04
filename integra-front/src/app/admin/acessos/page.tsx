'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Snackbar,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LockResetIcon from '@mui/icons-material/LockReset';
import SidebarMenu from '@/components/SidebarMenu';
import { useRouter } from 'next/navigation';

type Role = 'TRIAGEM' | 'SEPARADOR' | 'ESTOQUE' | 'CONTADOR' | 'SUPERVISOR' | 'AUDITOR';

type Usuario = {
  userEmail: string;
  role: Role | string; // tolerante caso venha diferente
};

const ROLE_OPTIONS: Role[] = ['TRIAGEM', 'SEPARADOR', 'ESTOQUE', 'CONTADOR', 'SUPERVISOR'];

function normalizeRole(r: unknown): string {
  const s = String(r ?? '').trim().toUpperCase();
  return s || 'SEM ROLE';
}

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // auth
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

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
  }, [router]);

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getUsuarios` : `/sync/getUsuarios`), [API_BASE]);

  const CHANGE_ROLE_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/changeRole` : `/sync/changeRole`), [API_BASE]);

  const EXCLUIR_USUARIO_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/excluirUsuario` : `/sync/excluirUsuario`),
    [API_BASE]
  );

  const RESETAR_SENHA_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/resetarSenha` : `/sync/resetarSenha`),
    [API_BASE]
  );

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const toast = useCallback((msg: string, severity: 'success' | 'error' = 'success') => {
    setSnackbarMsg(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
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

  const CARD_SX = {
    maxWidth: 1200,
    mx: 'auto',
    mt: 6,
    borderRadius: 2,
    boxShadow: 0,
    border: 1,
    backgroundColor: 'background.paper',
  } as const;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Floating button: sidebar */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          left: 16,
          width: 56,
          height: 56,
          borderRadius: '50%',
          bgcolor: 'background.paper',
          boxShadow: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: (t) => t.zIndex.appBar,
        }}
      >
        <IconButton onClick={() => setSidebarOpen((v) => !v)} aria-label="menu" size="large">
          <MenuIcon />
        </IconButton>
      </Box>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: 0,
          backgroundColor: '#f0f4f8',
          height: '100vh',
          overflowY: 'auto',
          p: { xs: 2, sm: 5 },
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          lineHeight: '1.8',
          color: '#333',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Card sx={CARD_SX}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                mb: 2,
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Usuários
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lista de usuários, alteração de role, reset de senha e exclusão.
                </Typography>
              </Box>

              <Button variant="outlined" onClick={fetchUsers} disabled={loading}>
                {loading ? <CircularProgress size={18} /> : 'Atualizar'}
              </Button>
            </Box>

            {/* ✅ Abas por role */}
            <Paper
              elevation={0}
              sx={{
                border: (t) => `1px solid ${t.palette.divider}`,
                borderRadius: 2,
                overflow: 'hidden',
                mb: 2,
              }}
            >
              <Tabs value={roleTab} onChange={(_, v) => setRoleTab(v)} variant="scrollable" scrollButtons="auto">
                {roleTabs.map((r) => (
                  <Tab
                    key={r}
                    value={r}
                    label={
                      r === 'TODOS'
                        ? `TODOS (${users.length})`
                        : `${r} (${(usersByRole.get(r)?.length ?? 0).toString()})`
                    }
                  />
                ))}
              </Tabs>
            </Paper>

            {erro && (
              <Typography color="error" sx={{ mb: 2 }}>
                {erro}
              </Typography>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Divider sx={{ my: 2 }} />

                {filteredUsers.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>Nenhum usuário nesta aba.</Typography>
                ) : (
                  <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                      border: (t) => `1px solid ${t.palette.divider}`,
                      borderRadius: 2,
                      overflowX: 'auto',
                      backgroundColor: 'background.paper',
                    }}
                  >
                    <Table size="small" stickyHeader aria-label="usuarios" sx={{ minWidth: 1050 }}>
                      <TableHead>
                        <TableRow
                          sx={{
                            '& th': {
                              backgroundColor: (t) => t.palette.grey[50],
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            },
                          }}
                        >
                          <TableCell>E-mail</TableCell>
                          <TableCell>Role atual</TableCell>
                          <TableCell>Nova role</TableCell>
                          <TableCell align="center">Alterar</TableCell>
                          <TableCell align="center">Resetar senha</TableCell>
                          <TableCell align="center">Excluir</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {filteredUsers.map((u) => {
                          const currentRole = normalizeRole(u.role);
                          const draft = roleDraftByEmail[u.userEmail] ?? 'CONTADOR';
                          const changed = String(draft) !== currentRole;

                          return (
                            <TableRow key={u.userEmail} sx={{ '&:hover': { backgroundColor: 'rgba(0,0,0,0.03)' } }}>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{u.userEmail}</TableCell>
                              <TableCell>{currentRole}</TableCell>

                              <TableCell sx={{ minWidth: 220 }}>
                                <FormControl size="small" fullWidth>
                                  <InputLabel id={`role-label-${u.userEmail}`}>Role</InputLabel>
                                  <Select
                                    labelId={`role-label-${u.userEmail}`}
                                    label="Role"
                                    value={draft}
                                    onChange={(e) => handleChangeDraft(u.userEmail, e.target.value as Role)}
                                  >
                                    {ROLE_OPTIONS.map((r) => (
                                      <MenuItem key={r} value={r}>
                                        {r}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>

                              <TableCell align="center" sx={{ p: 0.5 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => handleSaveRole(u)}
                                  disabled={!changed || savingEmail === u.userEmail}
                                  sx={{ minWidth: 92, textTransform: 'none' }}
                                >
                                  {savingEmail === u.userEmail ? <CircularProgress size={16} /> : 'Alterar'}
                                </Button>
                              </TableCell>

                              <TableCell align="center" sx={{ p: 0.5 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<LockResetIcon />}
                                  onClick={() => handleResetarSenha(u.userEmail)}
                                  disabled={resetLoadingEmail === u.userEmail}
                                  sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                                >
                                  {resetLoadingEmail === u.userEmail ? <CircularProgress size={16} /> : 'RESETAR SENHA'}
                                </Button>
                              </TableCell>

                              <TableCell align="center" sx={{ p: 0.5 }}>
                                <Tooltip title="Excluir usuário">
                                  <span>
                                    <IconButton
                                      aria-label="excluir"
                                      onClick={() => openDelete(u.userEmail)}
                                      sx={{
                                        color: 'error.main',
                                      }}
                                    >
                                      <CloseIcon />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ✅ Modal excluir */}
        <Dialog open={!!deleteEmail} onClose={closeDelete} fullWidth maxWidth="xs">
          <DialogTitle>Excluir usuário</DialogTitle>
          <DialogContent dividers>
            <Typography>
              Deseja excluir o usuário <b>{deleteEmail ?? '-'}</b>?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={closeDelete} disabled={deleteLoading}>
              NÃO
            </Button>
            <Button variant="contained" color="error" onClick={handleExcluirUsuario} disabled={deleteLoading}>
              {deleteLoading ? <CircularProgress size={18} /> : 'SIM'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3500}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbarMsg}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
