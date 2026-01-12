// src/hooks/useRequireAuth.ts
'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { canAccessPath } from '@/config/menu';
import type { Role } from '@/config/menu';
import { useAuth } from '@/hooks/useAuth';

type Options = {
  // se quiser sobrescrever roles, ex: página fora do menu
  rolesAllowed?: Role[];
  // se quiser liberar mesmo sem estar no MENU_SECTIONS (default true)
  allowIfNotInMenu?: boolean;
  redirectTo?: string | null;
};


export function useRequireAuth(options?: Options) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, role, ready } = useAuth();

  const allowIfNotInMenu = options?.allowIfNotInMenu ?? true;

  const hasAccess = useMemo(() => {
    if (!ready) return true; // ainda carregando
    if (!token) return false;

    // se página define roles manualmente, usa isso
    if (options?.rolesAllowed && options.rolesAllowed.length > 0) {
      return role ? options.rolesAllowed.includes(role) : false;
    }

    // caso padrão: usa menu.ts
    // se o path não estiver no menu e allowIfNotInMenu=true, libera
    const ok = canAccessPath(pathname, role);
    if (!ok && allowIfNotInMenu) {
      // se não estiver no menu, canAccessPath pode retornar false dependendo do role null;
      // aqui a regra é: se não mapeado, não bloqueia por permissão (mas bloqueia se sem token).
      // Para isso, a decisão final de permissão real fica no menu.
      // Como canAccessPath usa getAllowedRolesForPath, se path não existir, allowed=null => true.
      // então aqui geralmente já fica ok.
      return ok;
    }
    return ok;
  }, [ready, token, role, pathname, options?.rolesAllowed, allowIfNotInMenu]);

  useEffect(() => {
    if (!ready) return;

    // deslogado ou sem permissão -> volta pro início
    if (!token || !hasAccess) {
      router.replace('/inicio');
    }
  }, [ready, token, hasAccess, router]);

  return { token, role, ready, hasAccess };
}
