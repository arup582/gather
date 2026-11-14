'use client';
import { GatherHeading, GatherText, GatherAlert, GatherButton } from './components/ui';
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, ApiError, message } from './api';
import type { User } from './types';
interface Auth {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = async () => {
    try {
      setUser(await api<User>('/auth/me'));
      setError('');
    } catch (e) {
      setUser(null);
      if (!(e instanceof ApiError && e.status === 401)) throw e;
      setError('');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh().catch((e) => setError(message(e)));
  }, []);
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
  };
  return (
    <Context.Provider value={{ user, loading, refresh, logout }}>
      {error && (
        <GatherAlert role="alert" tone="error">
          {error}{' '}
          <GatherButton onClick={() => void refresh().catch((e) => setError(message(e)))}>
            Retry connection
          </GatherButton>
        </GatherAlert>
      )}
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const auth = useContext(Context);
  if (!auth) throw new Error('AuthProvider is required');
  return auth;
}
export function Protected({
  children,
  manager = false,
  admin = false,
}: {
  children: ReactNode;
  manager?: boolean;
  admin?: boolean;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace('/signin?next=' + encodeURIComponent(pathname));
  }, [loading, user, pathname, router]);
  if (loading) return <GatherText role="status">Loading your account…</GatherText>;
  if (!user) return <GatherText role="status">Redirecting to sign in…</GatherText>;
  if ((manager && user.role === 'ATTENDEE') || (admin && user.role !== 'ADMIN'))
    return (
      <section className="empty">
        <GatherHeading level={1}>Access restricted</GatherHeading>
        <GatherText>Your account does not have access to this page.</GatherText>
        <a href="/">Browse events</a>
      </section>
    );
  return children;
}
