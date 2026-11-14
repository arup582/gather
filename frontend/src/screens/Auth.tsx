'use client';
import {
  GatherHeading,
  GatherText,
  GatherCard,
  GatherButton,
  GatherInput,
  GatherLabel,
  GatherForm,
  GatherLink,
  GatherError,
} from '../components/ui';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, post } from '../api';
import { useAuth } from '../auth';
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
      <div>
        <GatherHeading level={1}>
          {signup ? 'Your people are out there.' : 'Welcome back to your community.'}
        </GatherHeading>
        <GatherText>
          Make plans. Share experiences.
          <br />
          Create something worth showing up for.
        </GatherText>
      </div>
      <GatherCard as="section">
        <GatherHeading level={2}>{signup ? 'Create an account' : 'Sign in'}</GatherHeading>
        <GatherText className="muted">
          {signup ? 'Start with an attendee account. It’s free to join.' : 'Good to see you again.'}
        </GatherText>
        <GatherError error={error} />
        <GatherForm onSubmit={(e) => void submit(e)}>
          {signup && (
            <GatherLabel>
              Your name
              <GatherInput name="displayName" autoComplete="name" required maxLength={100} />
            </GatherLabel>
          )}
          <GatherLabel>
            Email address
            <GatherInput type="email" name="email" autoComplete="email" required maxLength={254} />
          </GatherLabel>
          <GatherLabel>
            Password
            <GatherInput
              type="password"
              name="password"
              autoComplete={signup ? 'new-password' : 'current-password'}
              required
              minLength={signup ? 12 : undefined}
              maxLength={72}
              aria-describedby={signup ? 'password-help' : undefined}
            />
          </GatherLabel>
          {signup && (
            <GatherText id="password-help" className="small muted">
              At least 12 characters; no more than 72 UTF-8 bytes.
            </GatherText>
          )}
          <GatherButton className="btn-block" disabled={busy}>
            {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
          </GatherButton>
        </GatherForm>
        <GatherText className="small">
          {signup ? 'Already part of the community? ' : 'New to Gather? '}
          <GatherLink href={(signup ? '/signin' : '/signup') + '?next=' + encodeURIComponent(next)}>
            {signup ? 'Sign in' : 'Create an account'}
          </GatherLink>
        </GatherText>
      </GatherCard>
    </div>
  );
}
