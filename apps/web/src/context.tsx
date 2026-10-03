import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, type AppData } from './api';
import type { User } from '../../../packages/shared/model';
import { toast } from 'sonner';
type Store = {
  user: User | null;
  data: AppData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  authenticate: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [data, setData] = useState<AppData | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const result = await api<AppData>('/data');
      setData(result);
      setUser(result.user);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        setData(null);
        setError(null);
      } else setError(e instanceof Error ? e.message : 'Could not load your data.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const authenticate = async (user: User) => {
    setUser(user);
    setLoading(true);
    await refresh();
  };
  const signOut = async () => {
    try {
      await api('/auth/logout', { method: 'POST', body: {} });
      setUser(null);
      setData(null);
      toast.success('You are signed out.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not sign out.');
    }
  };
  useEffect(() => {
    const theme = user?.theme ?? 'system';
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      document.documentElement.setAttribute(
        'data-theme',
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme,
      );
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [user?.theme]);
  return (
    <Context.Provider value={{ user, data, loading, error, refresh, authenticate, signOut }}>
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const store = useContext(Context);
  if (!store) throw new Error('Missing Provider');
  return store;
}
