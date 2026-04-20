export type JwtPayload = {
  email?: string;
  userEmail?: string;
  role?: string;
  roles?: string[];
  sub?: string;
  userId?: string;
  exp?: number;
  iat?: number;
};

export function decodeJwt(token: string | null): JwtPayload | null {
  if (!token || typeof window === 'undefined') return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';

    const json = window.atob(base64);
    const parsed = JSON.parse(json) as unknown;

    if (parsed && typeof parsed === 'object') return parsed as JwtPayload;
    return null;
  } catch {
    return null;
  }
}

export function getEmailFromToken(token: string | null): string | null {
  const p = decodeJwt(token);
  const raw = p?.email ?? p?.userEmail ?? null;
  return raw ? String(raw).trim() : null;
}

export function getRoleFromToken(token: string | null): string | null {
  const p = decodeJwt(token);
  const raw = p?.role ?? null;
  return raw ? String(raw).toUpperCase().trim() : null;
}

export function getUserIdFromToken(token: string | null): string | null {
  const p = decodeJwt(token);
  return p?.sub ?? p?.userId ?? null;
}
