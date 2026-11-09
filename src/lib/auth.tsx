import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setSignedOutHandler } from './api';
import { clearToken, loadToken, saveToken } from './tokenStore';
import { unregisterPush } from './push';

type Me = { id: string; email: string; coin_balance: number };
type Status = 'loading' | 'signedOut' | 'signedIn';
type Ctx = {
  status: Status;
  me: Me | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(input: Record<string, unknown>): Promise<void>;
  signOut(): Promise<void>;
  refreshMe(): Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const qc = useQueryClient();

  const loadMe = useCallback(async () => {
    setMe(await api.get<Me>('/auth/me'));
    setStatus('signedIn');
  }, []);

  const reset = useCallback(() => {
    setMe(null);
    setStatus('signedOut');
    qc.clear();
  }, [qc]);

  useEffect(() => {
    setSignedOutHandler(reset);
    (async () => {
      const t = await loadToken();
      if (!t) return setStatus('signedOut');
      try {
        await loadMe();
      } catch {
        setStatus((s) => (s === 'loading' ? 'signedOut' : s));
      }
    })();
    return () => setSignedOutHandler(null);
  }, [loadMe, reset]);

  const value = useMemo<Ctx>(
    () => ({
      status,
      me,
      async signIn(email, password) {
        const r = await api.post<{ token: string }>('/auth/login', { email, password }, { auth: false });
        await saveToken(r.token);
        await loadMe();
      },
      async signUp(input) {
        const r = await api.post<{ token: string }>('/auth/register', input, { auth: false });
        await saveToken(r.token);
        await loadMe();
      },
      async signOut() {
        await unregisterPush().catch(() => {});
        await api.post('/auth/logout').catch(() => {});
        await clearToken();
        reset();
      },
      refreshMe: loadMe,
    }),
    [status, me, loadMe, reset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Ctx {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
