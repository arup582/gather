'use client';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './auth';
import { ErrorBox } from './ui';
function NavLink({
  href,
  children,
  end = false,
}: {
  href: string;
  children: ReactNode;
  end?: boolean;
}) {
  const path = usePathname();
  const active = end ? path === href : path === href || path.startsWith(href + '/');
  return (
    <Link
      href={href}
      className={active ? 'active' : undefined}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}
export default function App({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
    setError(undefined);
  }, [pathname]);
  async function signOut() {
    setBusy(true);
    try {
      await logout();
      router.push('/');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Gather home">
          <span aria-hidden="true">✳</span> gather<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink href="/" end>
            Discover
          </NavLink>
          {user && <NavLink href="/registrations">My registrations</NavLink>}
          {user && user.role !== 'ATTENDEE' && <NavLink href="/manage">Manage events</NavLink>}
          {user?.role === 'ADMIN' && <NavLink href="/admin">People</NavLink>}
        </nav>
        <div className="account">
          {loading ? (
            <span role="status">Loading…</span>
          ) : user ? (
            <>
              <span className="account-name">{user.displayName}</span>
              <button className="secondary" disabled={busy} onClick={() => void signOut()}>
                {busy ? 'Signing out…' : 'Sign out'}
              </button>
            </>
          ) : (
            <>
              <Link href="/signin">Sign in</Link>
              <Link className="button small-button" href="/signup">
                Join Gather ↗
              </Link>
            </>
          )}
        </div>
      </header>
      <main id="main" className="container">
        <ErrorBox error={error} />
        {children}
      </main>
      <footer>
        <Link href="/" className="brand">
          ✳ gather.
        </Link>
        <p>Small gatherings. Lasting connections.</p>
        <span>Made for showing up.</span>
      </footer>
    </>
  );
}
