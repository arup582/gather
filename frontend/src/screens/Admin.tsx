'use client';
import {
  GatherHeading,
  GatherText,
  GatherAlert,
  GatherCard,
  GatherTableHead,
  GatherTableBody,
  GatherTableRow,
  GatherTableHeader,
  GatherTableCell,
  GatherTable,
  GatherToggle,
  GatherButton,
  GatherInput,
  GatherSelect,
  GatherLabel,
  GatherForm,
  GatherFieldset,
  GatherError,
  GatherLoading,
  GatherPagination,
} from '../components/ui';
import { usePagination } from '../hooks/usePagination';
import { useEffect, useRef, useState } from 'react';
import { api, post } from '../api';
import { useAuth } from '../auth';
import { useResource } from '../hooks/useResource';
import type { Page, Role, User } from '../types';

const roles: { value: Role; label: string; description: string }[] = [
  {
    value: 'ATTENDEE',
    label: 'Attendee',
    description: 'Browse events and manage their registrations.',
  },
  {
    value: 'ORGANIZER',
    label: 'Organizer',
    description: 'Also create events and manage their attendees.',
  },
  {
    value: 'ADMIN',
    label: 'Administrator',
    description: 'Manage all events, users, and permissions.',
  },
];

export function Admin() {
  const { page, setPage, pageSize, changePageSize } = usePagination();
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const resource = useResource(`users:${page}:${pageSize}`, () =>
    api<Page<User>>(`/admin/users?page=${page}&size=${pageSize}`),
  );
  useEffect(() => {
    if (!creating && restoreFocus.current) {
      createButton.current?.focus();
      restoreFocus.current = false;
    }
  }, [creating]);
  function closeCreate() {
    restoreFocus.current = true;
    setCreating(false);
  }
  return (
    <>
      <div className="page-heading section-heading">
        <div>
          <GatherHeading level={1}>User management</GatherHeading>
          <GatherText>
            Create accounts and manage access. Save each row to apply role or account changes.
          </GatherText>
        </div>
        <GatherButton
          ref={createButton}
          aria-expanded={creating}
          aria-controls="create-user-panel"
          onClick={() => {
            setNotice('');
            setCreating(true);
          }}
          disabled={creating}
        >
          + Create user
        </GatherButton>
      </div>
      {notice && (
        <GatherAlert role="status" tone="success">
          {notice}
        </GatherAlert>
      )}
      {creating && (
        <CreateUserForm
          onCancel={closeCreate}
          onCreated={(user) => {
            closeCreate();
            setNotice(`${user.displayName} (${user.email}) was created successfully.`);
            if (page === 0) resource.reload();
            else setPage(0);
          }}
        />
      )}
      <section aria-labelledby="users-heading">
        <div className="section-heading">
          <GatherHeading level={2} id="users-heading">
            All users
          </GatherHeading>
          {resource.data && <span>{resource.data.totalElements} accounts</span>}
        </div>
        <GatherError error={resource.error} />
        {!!resource.error && (
          <GatherButton variant="secondary" onClick={resource.reload}>
            Try again
          </GatherButton>
        )}
        {resource.loading && <GatherLoading />}
        {resource.data && (
          <>
            {resource.data.content.length > 0 ? (
              <GatherTable caption="Users table">
                <GatherTableHead>
                  <GatherTableRow>
                    <GatherTableHeader scope="col">Name</GatherTableHeader>
                    <GatherTableHeader scope="col">Email address</GatherTableHeader>
                    <GatherTableHeader scope="col">Role</GatherTableHeader>
                    <GatherTableHeader scope="col">Status</GatherTableHeader>
                    <GatherTableHeader scope="col">Actions</GatherTableHeader>
                  </GatherTableRow>
                </GatherTableHead>
                <GatherTableBody>
                  {resource.data.content.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onSaved={() => {
                        setNotice(`Permissions updated for ${user.displayName}.`);
                        resource.reload();
                      }}
                    />
                  ))}
                </GatherTableBody>
              </GatherTable>
            ) : (
              <GatherText className="card card-border panel empty">
                No users found. Create a user to get started.
              </GatherText>
            )}
            <GatherPagination
              data={resource.data}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={changePageSize}
            />
          </>
        )}
      </section>
    </>
  );
}

function CreateUserForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (user: User) => void;
}) {
  const [role, setRole] = useState<Role>('ATTENDEE');
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(undefined);
    setBusy(true);
    try {
      const user = await post<User>('/admin/users', {
        displayName: String(data.get('displayName')).trim(),
        email: String(data.get('email')).trim(),
        password: String(data.get('password')),
        role,
      });
      onCreated(user);
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <GatherCard
      as="section"
      id="create-user-panel"
      className="create-user-panel"
      aria-labelledby="create-user-heading"
    >
      <GatherHeading level={2} id="create-user-heading">
        Create user
      </GatherHeading>
      <GatherText className="muted">
        New accounts are enabled and can sign in with the password you set.
      </GatherText>
      <GatherError error={error} />
      <GatherForm onSubmit={(event) => void submit(event)}>
        <GatherFieldset disabled={busy}>
          <div className="form-row">
            <GatherLabel>
              Full name
              <GatherInput
                name="displayName"
                required
                maxLength={100}
                autoComplete="off"
                autoFocus
              />
            </GatherLabel>
            <GatherLabel>
              Email address
              <GatherInput name="email" type="email" required maxLength={254} autoComplete="off" />
            </GatherLabel>
          </div>
          <div className="form-row">
            <div>
              <GatherLabel>
                Password
                <GatherInput
                  name="password"
                  type="password"
                  required
                  minLength={12}
                  maxLength={72}
                  autoComplete="new-password"
                  aria-describedby="create-password-help"
                />
              </GatherLabel>
              <GatherText id="create-password-help" className="small muted">
                At least 12 characters; no more than 72 UTF-8 bytes.
              </GatherText>
            </div>
            <div>
              <GatherLabel>
                Role
                <GatherSelect
                  value={role}
                  onValueChange={(value) => setRole(value as Role)}
                  aria-label="Role"
                  aria-describedby="create-role-help"
                  options={roles}
                />
              </GatherLabel>
              <GatherText id="create-role-help" className="small muted">
                {roles.find((option) => option.value === role)?.description}
              </GatherText>
            </div>
          </div>
          <div className="card-actions">
            <GatherButton>{busy ? 'Creating…' : 'Create user'}</GatherButton>
            <GatherButton type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </GatherButton>
          </div>
        </GatherFieldset>
      </GatherForm>
    </GatherCard>
  );
}

function UserRow({ user, onSaved }: { user: User; onSaved: () => void }) {
  const { user: current } = useAuth();
  const [role, setRole] = useState<Role>(user.role);
  const [enabled, setEnabled] = useState(user.enabled);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const ownAccount = user.id === current?.id;
  const formId = `user-${user.id}`;
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api('/admin/users/' + user.id, {
        method: 'PATCH',
        body: JSON.stringify({ role, enabled }),
      });
      onSaved();
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <GatherTableRow>
        <GatherTableHeader scope="row">
          {user.displayName}
          {ownAccount && <span className="cell-sub">You · access protected</span>}
        </GatherTableHeader>
        <GatherTableCell>{user.email}</GatherTableCell>
        <GatherTableCell>
          <GatherSelect
            form={formId}
            aria-label={`Role for ${user.displayName}`}
            value={role}
            onValueChange={(value) => setRole(value as Role)}
            disabled={busy || ownAccount}
            options={roles}
          />
        </GatherTableCell>
        <GatherTableCell>
          <GatherToggle
            form={formId}
            label={`Account enabled for ${user.displayName}`}
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={busy || ownAccount}
          />
        </GatherTableCell>
        <GatherTableCell>
          <GatherForm id={formId} onSubmit={(event) => void save(event)}>
            <GatherButton
              disabled={busy || ownAccount || (role === user.role && enabled === user.enabled)}
            >
              {busy ? 'Saving…' : 'Save user'}
            </GatherButton>
          </GatherForm>
        </GatherTableCell>
      </GatherTableRow>
      {!!error && (
        <GatherTableRow>
          <GatherTableCell colSpan={5}>
            <GatherError error={error} />
          </GatherTableCell>
        </GatherTableRow>
      )}
    </>
  );
}
