'use client';
import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorBox, Loading, Pager, useResource } from '../ui';
import type { Page, Role, User } from '../types';
export function Admin() {
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState('');
  const resource = useResource(`users:${page}`, () => api<Page<User>>('/admin/users?page=' + page));
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">COMMUNITY CARE</p>
        <h1>People & permissions</h1>
        <p>
          Grant organizer access and manage accounts. Changes apply to existing sessions
          immediately.
        </p>
      </div>
      <ErrorBox error={resource.error} />
      {notice && (
        <p role="status" className="banner success">
          {notice}
        </p>
      )}
      {resource.loading && <Loading />}
      {resource.data && (
        <>
          <div className="stack">
            {resource.data.content.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                onSaved={() => {
                  setNotice('User permissions updated.');
                  resource.reload();
                }}
              />
            ))}
          </div>
          {resource.data.content.length === 0 && <p className="empty">No users found.</p>}
          <Pager data={resource.data} onPage={setPage} />
        </>
      )}
    </>
  );
}
function UserRow({ user, onSaved }: { user: User; onSaved: () => void }) {
  const { user: current } = useAuth();
  const [role, setRole] = useState<Role>(user.role);
  const [enabled, setEnabled] = useState(user.enabled);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api('/admin/users/' + user.id, {
        method: 'PATCH',
        body: JSON.stringify({ role, enabled }),
      });
      onSaved();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="panel user-card">
      <form onSubmit={(e) => void save(e)}>
        <div>
          <h2>
            {user.displayName}
            {user.id === current?.id && ' (you)'}
          </h2>
          <p className="muted">{user.email}</p>
        </div>
        <label>
          Role for {user.displayName}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={user.id === current?.id}
          >
            <option value="ATTENDEE">Attendee</option>
            <option value="ORGANIZER">Organizer</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={enabled}
            disabled={user.id === current?.id}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Account enabled
        </label>
        <button disabled={busy || (role === user.role && enabled === user.enabled)}>
          {busy ? 'Saving…' : 'Save user'}
        </button>
      </form>
      <ErrorBox error={error} />
    </article>
  );
}
