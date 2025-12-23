// src/hooks/useAuth.ts
'use client';

import { useEffect, useMemo, useState } from 'react';
import { decodeJwt, getEmailFromToken, getRoleFromToken } from '@/utils/jwt';
import type { Role } from '@/config/menu';

export type AuthState = {
  token: string | null;
  email: string | null;
  role: Role | null;
  ready: boolean;
};

export function useAuth(): AuthState {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('authToken');
    setToken(t);
    setReady(true);
  }, []);

  const email = useMemo(() => getEmailFromToken(token), [token]);

  const role = useMemo(() => {
    const raw = getRoleFromToken(token);
    if (!raw) return null;
    // garante que vira Role (se vier algo fora, vira null)
    const upper = raw.toUpperCase().trim();
    const allowed: Role[] = ['ADMIN', 'MANAGER', 'TRIAGEM', 'SEPARADOR', 'ESTOQUE', 'CONTADOR', 'USER'];
    return (allowed.includes(upper as Role) ? (upper as Role) : null);
  }, [token]);

  // se token inválido, limpa (evita ficar preso)
  useEffect(() => {
    if (!ready) return;
    if (!token) return;
    const p = decodeJwt(token);
    if (!p) {
      try {
        localStorage.removeItem('authToken');
      } catch {}
      setToken(null);
    }
  }, [ready, token]);

  return { token, email, role, ready };
}
