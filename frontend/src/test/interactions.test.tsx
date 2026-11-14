import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { vi } from 'vitest';
import { AuthProvider } from '../auth';
import { AuthPage } from '../screens/Auth';
import { Admin } from '../screens/Admin';
import { Browse } from '../screens/Public';
import { MyRegistrations } from '../screens/Registrations';
import { EventForm } from '../screens/Manage';
import { api, ApiError } from '../api';
import type { Event } from '../types';

const navigation = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const state = {
    url: '/',
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    replace: (url: string) => {
      state.url = url;
      listeners.forEach((listener) => listener());
    },
    push: (url: string) => {
      state.replace(url);
    },
  };
  return state;
});
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  const useURL = () => useSyncExternalStore(navigation.subscribe, () => navigation.url);
  return {
    useRouter: () => navigation,
    usePathname: () => new URL(useURL(), 'http://localhost').pathname,
    useSearchParams: () => new URL(useURL(), 'http://localhost').searchParams,
    useParams: () => ({}),
  };
});
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
beforeEach(() => {
  navigation.url = '/';
});
const user = {
  id: 'u1',
  email: 'user@example.test',
  displayName: 'Taylor',
  role: 'ATTENDEE',
  enabled: true,
};
const event: Event = {
  id: 'e1',
  title: 'Community night',
  description: 'Bring a friend',
  venue: 'Studio',
  startsAt: '2035-01-01T10:00:00Z',
  endsAt: '2035-01-01T12:00:00Z',
  organizerId: 'h1',
  organizerName: 'Sam',
  status: 'PUBLISHED',
};
const response = (value: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
function fetchMock(handler: (path: string, init?: RequestInit) => Response) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = String(input);
    return path === '/api/auth/csrf'
      ? response({ token: 'fresh-token', headerName: 'X-CSRF-TOKEN' })
      : handler(path, init);
  });
}
function wrap(node: React.ReactNode) {
  return render(<AuthProvider>{node}</AuthProvider>);
}
test('signup submits attendee data and signs in through the actual API client', async () => {
  let signedIn = false;
  const fetch = fetchMock((path) => {
    if (path === '/api/auth/me')
      return signedIn ? response(user) : response({ message: 'Sign in' }, 401);
    if (path === '/api/auth/signup') return response(user, 201);
    if (path === '/api/auth/login') {
      signedIn = true;
      return response(null, 204);
    }
    return response({});
  });
  wrap(<AuthPage signup />);
  const actor = userEvent.setup();
  await actor.type(screen.getByLabelText('Your name'), 'Taylor');
  await actor.type(screen.getByLabelText('Email address'), user.email);
  await actor.type(screen.getByLabelText('Password'), 'a-unique-test-password');
  await actor.click(screen.getByRole('button', { name: 'Create account' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.anything()));
  const signup = fetch.mock.calls.find(([url]) => url === '/api/auth/signup')!;
  expect(JSON.parse(signup[1]!.body as string)).toEqual({
    displayName: 'Taylor',
    email: user.email,
    password: 'a-unique-test-password',
  });
  expect(new Headers(signup[1]!.headers).get('X-CSRF-TOKEN')).toBe('fresh-token');
});
test('sign-in displays authentication failure', async () => {
  fetchMock(() => response({ message: 'Email or password is incorrect' }, 401));
  wrap(<AuthPage />);
  const actor = userEvent.setup();
  await actor.type(screen.getByLabelText('Email address'), user.email);
  await actor.type(screen.getByLabelText('Password'), 'wrong');
  await actor.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect');
});
test('browsing exposes loading then empty search feedback', async () => {
  const fetch = fetchMock((path) =>
    path === '/api/auth/me'
      ? response(user)
      : response({ content: [], page: 0, totalPages: 0, totalElements: 0 }),
  );
  wrap(<Browse />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading');
  expect(await screen.findByText('No upcoming events found')).toBeInTheDocument();
  const actor = userEvent.setup();
  await actor.type(screen.getByLabelText('Search events'), 'music & art');
  await actor.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/events?q=music%20%26%20art&page=0&size=12',
      expect.anything(),
    ),
  );
});
test('browsing displays network failure and supports retry', async () => {
  let fail = true;
  fetchMock((path) =>
    path === '/api/auth/me'
      ? response(user)
      : fail
        ? response({ message: 'Please retry' }, 503)
        : response({ content: [event], page: 0, totalPages: 1, totalElements: 1 }),
  );
  wrap(<Browse />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Please retry');
  fail = false;
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('link', { name: 'Community night' })).toBeInTheDocument();
});
test('event form validates date ranges before sending a mutation', async () => {
  const fetch = fetchMock(() => response({}));
  render(<EventForm event={{ ...event, status: 'DRAFT' }} onSaved={vi.fn()} />);
  const actor = userEvent.setup();
  const ends = screen.getByLabelText('Ends at');
  await actor.clear(ends);
  await actor.type(ends, '2034-01-01T10:00');
  await actor.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('end must be after');
  expect(fetch).not.toHaveBeenCalled();
});
test('attendee can confirm cancellation and sees persisted status', async () => {
  let cancelled = false;
  const fetch = fetchMock((path) => {
    if (path === '/api/auth/me') return response(user);
    if (path.endsWith('/cancel')) {
      cancelled = true;
      return response({});
    }
    return response({
      content: [
        {
          id: 'r1',
          event,
          status: cancelled ? 'CANCELLED' : 'ACTIVE',
          registeredAt: '2034-01-01T10:00:00Z',
          cancelledAt: null,
        },
      ],
      page: 0,
      totalPages: 1,
      totalElements: 1,
    });
  });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  wrap(<MyRegistrations />);
  await userEvent.click(await screen.findByRole('button', { name: 'Cancel registration' }));
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith('/api/registrations/r1/cancel', expect.anything()),
  );
  expect(await screen.findByText('Your registration has been cancelled.')).toBeInTheDocument();
  expect(await screen.findByText('cancelled', { selector: '.badge' })).toBeInTheDocument();
});
test('API errors preserve validation fields and do not silently retry mutations', async () => {
  const fetch = fetchMock(() =>
    response({ message: 'Invalid event', fields: { title: 'must not be blank' } }, 400),
  );
  await expect(api('/manage/events', { method: 'POST', body: '{}' })).rejects.toEqual(
    new ApiError('Invalid event', 400, { title: 'must not be blank' }),
  );
  expect(fetch).toHaveBeenCalledTimes(2);
});
test('protected page redirects anonymous visitors to sign-in', async () => {
  const { Protected } = await import('../auth');
  fetchMock(() => response({ message: 'Please sign in' }, 401));
  act(() => navigation.replace('/private'));
  function PrivateRoute() {
    const path = usePathname();
    return path === '/private' ? (
      <Protected>
        <p>Private details</p>
      </Protected>
    ) : (
      <p>Sign in screen</p>
    );
  }
  render(
    <AuthProvider>
      <PrivateRoute />
    </AuthProvider>,
  );
  await waitFor(() => expect(navigation.url).toBe('/signin?next=%2Fprivate'));
  expect(screen.queryByText('Private details')).not.toBeInTheDocument();
});

test('connection retry clears the banner when an anonymous session is reachable', async () => {
  let available = false;
  fetchMock(() =>
    available
      ? response({ message: 'Please sign in' }, 401)
      : response({ message: 'Unavailable' }, 503),
  );
  wrap(<AuthPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unavailable');
  available = true;
  await userEvent.click(screen.getByRole('button', { name: 'Retry connection' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
});

test('browser back restores the search input as well as its results', async () => {
  fetchMock(() => response({ content: [], page: 0, totalPages: 0, totalElements: 0 }));
  act(() => navigation.replace('/?q=art'));
  render(<Browse />);
  expect(screen.getByLabelText('Search events')).toHaveValue('art');
  act(() => navigation.replace('/?q=music'));
  await waitFor(() => expect(screen.getByLabelText('Search events')).toHaveValue('music'));
});

test('admin creates a user and refreshes the database-backed table without changing accounts', async () => {
  const admin = { ...user, id: 'admin', displayName: 'Admin', role: 'ADMIN' };
  const created = {
    ...user,
    id: 'created',
    displayName: 'New organizer',
    email: 'new@example.test',
    role: 'ORGANIZER',
  };
  let users = [admin];
  const fetch = fetchMock((path, init) => {
    if (path === '/api/auth/me') return response(admin);
    if (path === '/api/admin/users' && init?.method === 'POST') {
      users = [admin, created];
      return response(created, 201);
    }
    return response({ content: users, page: 0, totalPages: 1, totalElements: users.length });
  });
  wrap(<Admin />);
  const table = await screen.findByRole('table');
  expect(within(table).getByRole('columnheader', { name: 'Email address' })).toBeInTheDocument();
  expect(within(table).getByLabelText('Role for Admin')).toBeDisabled();
  expect(within(table).getByRole('switch', { name: 'Account enabled for Admin' })).toBeDisabled();
  const actor = userEvent.setup();
  await actor.click(screen.getByRole('button', { name: '+ Create user' }));
  const panel = screen.getByRole('region', { name: 'Create user' });
  expect(within(panel).getByLabelText('Full name')).toHaveFocus();
  await actor.type(within(panel).getByLabelText('Full name'), created.displayName);
  await actor.type(within(panel).getByLabelText('Email address'), created.email);
  await actor.type(within(panel).getByLabelText('Password'), 'a-unique-test-password');
  await actor.selectOptions(within(panel).getByRole('combobox', { name: 'Role' }), 'ORGANIZER');
  await actor.click(within(panel).getByRole('button', { name: 'Create user' }));
  expect(await screen.findByText(created.email)).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Create user' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '+ Create user' })).toHaveFocus();
  expect(screen.getByText(/was created successfully/)).toBeInTheDocument();
  const request = fetch.mock.calls.find(
    ([path, init]) => path === '/api/admin/users' && init?.method === 'POST',
  )!;
  expect(JSON.parse(request[1]!.body as string)).toEqual({
    displayName: created.displayName,
    email: created.email,
    password: 'a-unique-test-password',
    role: 'ORGANIZER',
  });
  expect(new Headers(request[1]!.headers).get('X-CSRF-TOKEN')).toBe('fresh-token');
  expect(fetch.mock.calls.some(([path]) => path === '/api/auth/login')).toBe(false);
});

test('duplicate creation retains form values and cancel returns focus to the create button', async () => {
  fetchMock((path, init) => {
    if (path === '/api/auth/me') return response({ ...user, role: 'ADMIN' });
    if (init?.method === 'POST')
      return response({ message: 'An account with that email already exists' }, 409);
    return response({ content: [user], page: 0, totalPages: 1, totalElements: 1 });
  });
  wrap(<Admin />);
  await screen.findByRole('table');
  const actor = userEvent.setup();
  await actor.click(screen.getByRole('button', { name: '+ Create user' }));
  const panel = screen.getByRole('region', { name: 'Create user' });
  await actor.type(within(panel).getByLabelText('Full name'), 'Taylor');
  await actor.type(within(panel).getByLabelText('Email address'), user.email);
  await actor.type(within(panel).getByLabelText('Password'), 'a-unique-test-password');
  await actor.click(within(panel).getByRole('button', { name: 'Create user' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
  expect(within(panel).getByLabelText('Email address')).toHaveValue(user.email);
  await actor.click(within(panel).getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('button', { name: '+ Create user' })).toHaveFocus();
  expect(screen.queryByRole('region', { name: 'Create user' })).not.toBeInTheDocument();
});

test('table changes persist roles and disabled status, with recoverable row errors', async () => {
  let saved = { ...user };
  let reject = true;
  const fetch = fetchMock((path, init) => {
    if (path === '/api/auth/me') return response({ ...user, id: 'admin', role: 'ADMIN' });
    if (init?.method === 'PATCH') {
      if (reject) return response({ message: 'Please retry' }, 503);
      saved = { ...saved, ...JSON.parse(init.body as string) };
      return response(saved);
    }
    return response({ content: [saved], page: 0, totalPages: 1, totalElements: 1 });
  });
  wrap(<Admin />);
  await screen.findByRole('table');
  const actor = userEvent.setup();
  await actor.selectOptions(screen.getByLabelText('Role for Taylor'), 'ORGANIZER');
  await actor.click(screen.getByRole('switch', { name: 'Account enabled for Taylor' }));
  await actor.click(screen.getByRole('button', { name: 'Save user' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Please retry');
  expect(screen.getByLabelText('Role for Taylor')).toHaveValue('ORGANIZER');
  reject = false;
  await actor.click(screen.getByRole('button', { name: 'Save user' }));
  await waitFor(() =>
    expect(screen.getByRole('switch', { name: 'Account enabled for Taylor' })).not.toBeChecked(),
  );
  expect(screen.getByRole('button', { name: 'Save user' })).toBeDisabled();
  const request = fetch.mock.calls.find(([, init]) => init?.method === 'PATCH')!;
  expect(JSON.parse(request[1]!.body as string)).toEqual({ role: 'ORGANIZER', enabled: false });
});

test('user pagination requests server pages and resets to the first page when size changes', async () => {
  const users = Array.from({ length: 35 }, (_, index) => ({
    ...user,
    id: String(index),
    displayName: `Person ${index}`,
    email: `person${index}@example.test`,
  }));
  const fetch = fetchMock((path) => {
    if (path === '/api/auth/me') return response({ ...user, id: 'admin', role: 'ADMIN' });
    const query = new URL(path, 'http://localhost').searchParams;
    const page = Number(query.get('page'));
    const size = Number(query.get('size'));
    return response({
      content: users.slice(page * size, (page + 1) * size),
      page,
      totalPages: Math.ceil(users.length / size),
      totalElements: users.length,
    });
  });
  wrap(<Admin />);
  const actor = userEvent.setup();
  await screen.findByText('person0@example.test');
  expect(screen.getAllByRole('row')).toHaveLength(11);
  expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled();
  await actor.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByText('person10@example.test');
  await actor.click(screen.getByRole('button', { name: 'Last page' }));
  await screen.findByText('person30@example.test');
  expect(screen.getAllByRole('row')).toHaveLength(6);
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  await actor.clear(screen.getByLabelText('Go to page'));
  await actor.type(screen.getByLabelText('Go to page'), '2');
  await actor.click(screen.getByRole('button', { name: 'Go' }));
  await screen.findByText('person10@example.test');
  await actor.selectOptions(screen.getByLabelText('Rows per page'), '50');
  await screen.findByText('person0@example.test');
  expect(screen.getAllByRole('row')).toHaveLength(36);
  expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('1–35 of 35');
  expect(screen.getByRole('button', { name: 'Last page' })).toBeDisabled();
  expect(fetch).toHaveBeenCalledWith('/api/admin/users?page=0&size=50', expect.anything());
});

test('empty lists still expose page size and disabled navigation controls', async () => {
  fetchMock((path) =>
    path === '/api/auth/me'
      ? response({ ...user, role: 'ADMIN' })
      : response({ content: [], page: 0, totalPages: 0, totalElements: 0 }),
  );
  wrap(<Admin />);
  const pagination = await screen.findByRole('navigation', { name: 'Pagination' });
  expect(pagination).toHaveTextContent('0–0 of 0');
  expect(within(pagination).getByLabelText('Rows per page')).toHaveValue('10');
  for (const name of ['First page', 'Previous page', 'Next page', 'Last page'])
    expect(within(pagination).getByRole('button', { name })).toBeDisabled();
});
