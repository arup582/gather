import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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
        <div role="alert" className="banner error">
          {error}{' '}
          <button onClick={() => void refresh().catch((e) => setError(message(e)))}>
            Retry connection
          </button>
        </div>
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
  const location = useLocation();
  if (loading) return <p role="status">Loading your account…</p>;
  if (!user)
    return <Navigate to={'/signin?next=' + encodeURIComponent(location.pathname)} replace />;
  if ((manager && user.role === 'ATTENDEE') || (admin && user.role !== 'ADMIN'))
    return (
      <section className="empty">
        <h1>Access restricted</h1>
        <p>Your account does not have access to this page.</p>
        <a href="/">Browse events</a>
      </section>
    );
  return children;
}
