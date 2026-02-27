// src/hooks/usePersistedState.ts
'use client';

import { useEffect, useState } from 'react';

export function usePersistedState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) setState(JSON.parse(raw) as T);
    } catch {
      // ignore
    } finally {
      setReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [key, ready, state]);

  return [state, setState, ready] as const;
}
