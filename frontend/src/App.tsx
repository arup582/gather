'use client';
import { GatherText, GatherButton, GatherLink, GatherError } from './components/ui';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GatherThemePicker } from './theme/GatherThemePicker';
import { defaultAppearance, type Appearance } from './theme/config';
import { useAuth } from './auth';
import { GatherBrand } from './components/brand/GatherBrand';
import { GatherTickets } from './components/brand/GatherTickets';
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
    <li>
      <GatherLink
        href={href}
        className={active ? 'menu-active' : undefined}
        aria-current={active ? 'page' : undefined}
      >
        {children}
      </GatherLink>
    </li>
  );
}
export default function App({
  children,
  initialAppearance = defaultAppearance,
}: {
  children: ReactNode;
  initialAppearance?: Appearance;
}) {
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
      <header className="navbar site-header">
        <GatherBrand />
        <nav aria-label="Main navigation">
          <ul className="menu menu-horizontal">
            <NavLink href="/" end>
              Discover
            </NavLink>
            {user && <NavLink href="/registrations">My registrations</NavLink>}
            {user && user.role !== 'ATTENDEE' && <NavLink href="/manage">Manage events</NavLink>}
            {user?.role === 'ADMIN' && <NavLink href="/admin">People</NavLink>}
          </ul>
        </nav>
        <div className="account">
          <GatherThemePicker initialAppearance={initialAppearance} />
          {loading ? (
            <span role="status">Loading…</span>
          ) : user ? (
            <>
              <span className="account-name">{user.displayName}</span>
              <GatherButton variant="secondary" disabled={busy} onClick={() => void signOut()}>
                {busy ? 'Signing out…' : 'Sign out'}
              </GatherButton>
            </>
          ) : (
            <>
              <GatherLink href="/signin">Sign in</GatherLink>
              <GatherLink variant="primary" className="btn-sm" href="/signup">
                Join Gather ↗
              </GatherLink>
            </>
          )}
        </div>
      </header>
      <main id="main" className="container">
        <GatherError error={error} />
        {children}
      </main>
      <footer className="footer site-footer">
        <div>
          <GatherBrand />
          <GatherText>Small gatherings. Lasting connections.</GatherText>
        </div>
        <GatherTickets />
        <GatherLink href="/#discover">Find your next experience ↗</GatherLink>
      </footer>
    </>
  );
}
