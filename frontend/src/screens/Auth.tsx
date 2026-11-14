'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, post } from '../api';
import { useAuth } from '../auth';
import { ErrorBox } from '../ui';
export function AuthPage({ signup = false }: { signup?: boolean }) {
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const candidate = params.get('next') || '/';
  const next = candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/';
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(undefined);
    setBusy(true);
    const email = String(data.get('email')).trim();
    const password = String(data.get('password'));
    try {
      if (signup)
        await post('/auth/signup', { email, password, displayName: data.get('displayName') });
      await api('/auth/login', { method: 'POST', body: new URLSearchParams({ email, password }) });
      await refresh();
      router.replace(next);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <p className="eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</p>
        <h1>{signup ? 'Your people are out there.' : 'Welcome back to your community.'}</h1>
        <p>
          Make plans. Share experiences.
          <br />
          Create something worth showing up for.
        </p>
        <div className="auth-symbol" aria-hidden="true">
          ✳
        </div>
      </div>
      <section className="panel auth-panel">
        <h2>{signup ? 'Create an account' : 'Sign in'}</h2>
        <p className="muted">
          {signup ? 'Start with an attendee account. It’s free to join.' : 'Good to see you again.'}
        </p>
        <ErrorBox error={error} />
        <form onSubmit={(e) => void submit(e)}>
          {signup && (
            <label>
              Your name
              <input name="displayName" autoComplete="name" required maxLength={100} />
            </label>
          )}
          <label>
            Email address
            <input type="email" name="email" autoComplete="email" required maxLength={254} />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete={signup ? 'new-password' : 'current-password'}
              required
              minLength={signup ? 12 : undefined}
              maxLength={72}
              aria-describedby={signup ? 'password-help' : undefined}
            />
          </label>
          {signup && (
            <p id="password-help" className="small muted">
              At least 12 characters; no more than 72 UTF-8 bytes.
            </p>
          )}
          <button className="full" disabled={busy}>
            {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p className="small">
          {signup ? 'Already part of the community? ' : 'New to Gather? '}
          <Link href={(signup ? '/signin' : '/signup') + '?next=' + encodeURIComponent(next)}>
            {signup ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </section>
    </div>
  );
}
