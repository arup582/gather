export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof URLSearchParams))
    headers.set('Content-Type', 'application/json');
  if (options.method && !['GET', 'HEAD'].includes(options.method)) {
    // Session-bound, BREACH-protected token. Fetch anew after login/logout rotations.
    const csrfResponse = await fetch('/api/auth/csrf', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!csrfResponse.ok)
      throw new ApiError('Could not obtain a security token. Please refresh.', csrfResponse.status);
    const csrf = await csrfResponse.json();
    headers.set(csrf.headerName, csrf.token);
  }
  const response = await fetch('/api' + path, {
    ...options,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new ApiError(
      problem.message || 'Something went wrong. Please try again.',
      response.status,
      problem.fields || {},
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
export const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Could not connect. Please try again.';
