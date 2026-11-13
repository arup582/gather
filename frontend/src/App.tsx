import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Protected, useAuth } from './auth';
import { ErrorBox } from './ui';
import { Browse, EventDetails } from './pages/Public';
import { AuthPage } from './pages/Auth';
import { MyRegistrations } from './pages/Registrations';
import { ManageEvents, ManageEvent, NewEvent } from './pages/Manage';
import { Admin } from './pages/Admin';
export default function App() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
    setError(undefined);
  }, [location.pathname]);
  async function signOut() {
    setBusy(true);
    try {
      await logout();
      navigate('/');
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
        <Link to="/" className="brand" aria-label="Gather home">
          <span aria-hidden="true">✳</span> gather<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            Discover
          </NavLink>
          {user && <NavLink to="/registrations">My registrations</NavLink>}
          {user && user.role !== 'ATTENDEE' && <NavLink to="/manage">Manage events</NavLink>}
          {user?.role === 'ADMIN' && <NavLink to="/admin">People</NavLink>}
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
              <Link to="/signin">Sign in</Link>
              <Link className="button small-button" to="/signup">
                Join Gather ↗
              </Link>
            </>
          )}
        </div>
      </header>
      <main id="main" className="container">
        <ErrorBox error={error} />
        <Routes>
          <Route path="/" element={<Browse />} />
          <Route path="/events/:id" element={<EventDetails key={location.pathname} />} />
          <Route path="/signin" element={<AuthPage key="signin" />} />
          <Route path="/signup" element={<AuthPage signup key="signup" />} />
          <Route
            path="/registrations"
            element={
              <Protected>
                <MyRegistrations />
              </Protected>
            }
          />
          <Route
            path="/manage"
            element={
              <Protected manager>
                <ManageEvents />
              </Protected>
            }
          />
          <Route
            path="/manage/events/new"
            element={
              <Protected manager>
                <NewEvent />
              </Protected>
            }
          />
          <Route
            path="/manage/events/:id"
            element={
              <Protected manager>
                <ManageEvent key={location.pathname} />
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected admin>
                <Admin />
              </Protected>
            }
          />
          <Route
            path="*"
            element={
              <div className="empty">
                <h1>Page not found</h1>
                <Link to="/">Back to Gather</Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer>
        <Link to="/" className="brand">
          ✳ gather.
        </Link>
        <p>Small gatherings. Lasting connections.</p>
        <span>Made for showing up.</span>
      </footer>
    </>
  );
}
