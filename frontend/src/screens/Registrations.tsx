'use client';
import { useState } from 'react';
import Link from 'next/link';

import { api, post } from '../api';
import { Badge, dateTime, ErrorBox, Loading, Pager, useTimezone, useResource } from '../ui';
import type { Page, Registration } from '../types';
export function MyRegistrations() {
  const timezone = useTimezone();
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState('');
  const resource = useResource(`mine:${page}`, () =>
    api<Page<Registration>>('/registrations?page=' + page),
  );
  async function cancel(id: string) {
    if (
      !window.confirm('Cancel this registration? You can register again before the event starts.')
    )
      return;
    setBusy(id);
    setError(undefined);
    try {
      await post('/registrations/' + id + '/cancel');
      setNotice('Your registration has been cancelled.');
      resource.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">YOUR NEXT CHAPTER</p>
        <h1>My registrations</h1>
        <p>Upcoming plans and a record of your past registrations.</p>
      </div>
      <p className="timezone">All times shown in {timezone}.</p>
      <ErrorBox error={error || resource.error} />
      {notice && (
        <p role="status" className="banner success">
          {notice}
        </p>
      )}
      {resource.loading && <Loading />}
      {resource.data && (
        <>
          {resource.data.content.length ? (
            <div className="stack">
              {resource.data.content.map((r) => (
                <article className="registration-card" key={r.id}>
                  <div>
                    <Badge status={r.status} />
                    <h2>
                      <Link href={'/events/' + r.event.id}>{r.event.title}</Link>
                    </h2>
                    <p>
                      {dateTime(r.event.startsAt)} · {r.event.venue}
                    </p>
                    <p className="small muted">
                      Registered {dateTime(r.registeredAt)}
                      {r.cancelledAt && (
                        <>
                          {' '}
                          · Cancelled {dateTime(r.cancelledAt)}
                          {r.cancellationReason === 'EVENT_CANCELLED' && ' by the event organizer'}
                        </>
                      )}
                    </p>
                    {r.event.status === 'CANCELLED' && (
                      <p className="small">This event was cancelled.</p>
                    )}
                  </div>
                  {r.status === 'ACTIVE' && new Date(r.event.startsAt).getTime() > Date.now() && (
                    <button
                      className="secondary"
                      disabled={!!busy}
                      onClick={() => void cancel(r.id)}
                    >
                      {busy === r.id ? 'Cancelling…' : 'Cancel registration'}
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>Your next experience is waiting</h2>
              <p>You haven’t registered for an event yet.</p>
              <Link className="button" href="/">
                Explore events
              </Link>
            </div>
          )}
          <Pager data={resource.data} onPage={setPage} />
        </>
      )}
    </>
  );
}
