import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react';
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
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const requestRevision = ++revision.current;
    try {
      const result = await api<AppData>('/data');
      if (requestRevision !== revision.current) return;
      setData(result);
      setUser(result.user);
      setError(null);
    } catch (e) {
      if (requestRevision !== revision.current) return;
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        setData(null);
        setError(null);
      } else setError(e instanceof Error ? e.message : 'Could not load your data.');
    } finally {
      if (requestRevision === revision.current) setLoading(false);
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
      revision.current++;
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
