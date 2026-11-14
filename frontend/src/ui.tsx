'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

import { ApiError, message } from './api';
import type { Page, Event } from './types';
export function useTimezone() {
  const [zone, setZone] = useState('your local timezone');
  useEffect(() => setZone(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  return zone;
}
export const dateTime = (date: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(date),
  );
export const localInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export function useResource<T>(key: string, load: () => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    setData(undefined);
    load()
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // The key contains every input to the loader; caller closures are intentionally not dependencies.
  }, [key, version]);
  return { data, error, loading, reload: () => setVersion((v) => v + 1) };
}
export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div role="alert" className="banner error">
      <strong>{message(error)}</strong>
      {error instanceof ApiError && Object.keys(error.fields).length > 0 && (
        <ul>
          {Object.entries(error.fields).map(([field, text]) => (
            <li key={field}>
              {field}: {text}
            </li>
          ))}
        </ul>
      )}
      {error instanceof ApiError && error.status === 401 && (
        <>
          {' '}
          <Link href="/signin">Sign in again</Link>
        </>
      )}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" /> Loading…
    </div>
  );
}
export function Pager({ data, onPage }: { data: Page<unknown>; onPage: (page: number) => void }) {
  if (data.totalPages < 2) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button
        className="secondary"
        disabled={data.page === 0}
        onClick={() => onPage(data.page - 1)}
      >
        ← Previous
      </button>
      <span>
        Page {data.page + 1} of {data.totalPages}
      </span>
      <button
        className="secondary"
        disabled={data.page + 1 >= data.totalPages}
        onClick={() => onPage(data.page + 1)}
      >
        Next →
      </button>
    </nav>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={'badge ' + status.toLowerCase()}>
      {status.replaceAll('_', ' ').toLowerCase()}
    </span>
  );
}
export function EventCard({ event, index = 0 }: { event: Event; index?: number }) {
  const d = new Date(event.startsAt);
  return (
    <article className="event-card">
      <div className={'event-art art-' + (index % 4)} aria-hidden="true">
        <span className="art-orbit" />
        <span className="art-orbit second" />
        <span className="date-tile">
          <b>{d.getDate()}</b>
          {d.toLocaleDateString(undefined, { month: 'short' })}
        </span>
        <span className="art-caption">GOOD PEOPLE. SHARED MOMENTS.</span>
      </div>
      <div className="event-card-body">
        <p className="eyebrow">
          {d.toLocaleDateString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}
        </p>
        <h2>
          <Link href={'/events/' + event.id}>{event.title}</Link>
        </h2>
        <p className="muted">{event.venue}</p>
        <div className="card-bottom">
          <span>Hosted by {event.organizerName}</span>
          <Link aria-label={'View ' + event.title} href={'/events/' + event.id}>
            ↗
          </Link>
        </div>
      </div>
    </article>
  );
}
