import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { MeResponse } from '../../shared/api.ts';
import { api, ApiError } from './api.ts';
import { invalidate } from './useResource.ts';

interface SessionValue {
  me: MeResponse | null;
  error: ApiError | null;
  refresh: () => Promise<MeResponse | null>;
  setMe: (m: MeResponse) => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMeState] = useState<MeResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const refresh = useCallback(async () => {
    try {
      const m = await api.get<MeResponse>('/api/me');
      setMeState(m);
      setError(null);
      return m;
    } catch (e) {
      setError(e as ApiError);
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout').catch(() => undefined);
    invalidate('/api');
    setMeState({ user: null, profile: null });
  }, []);

  const setMe = useCallback((m: MeResponse) => {
    invalidate('/api');
    setMeState(m);
  }, []);

  return <SessionContext.Provider value={{ me, error, refresh, setMe, logout }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(SessionContext);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}
