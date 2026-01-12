// src/utils/location.ts
export function parseLocationNumber(loc?: string | null): number {
  if (!loc) return Number.MAX_SAFE_INTEGER;
  const match = String(loc).match(/\d+/g);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const joined = match.join('');
  const n = Number.parseInt(joined, 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}
