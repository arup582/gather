'use client';
import {
  GatherHeading,
  GatherText,
  GatherAlert,
  GatherButton,
  GatherLink,
  GatherBadge,
  GatherError,
  GatherLoading,
  GatherPagination,
} from '../components/ui';
import { usePagination } from '../hooks/usePagination';
import { useState } from 'react';

import { api, post } from '../api';
import { useResource } from '../hooks/useResource';
import { dateTime, useTimezone } from '../lib/dates';
import type { Page, Registration } from '../types';
export function MyRegistrations() {
  const timezone = useTimezone();
  const { page, setPage, pageSize, changePageSize } = usePagination();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState('');
  const resource = useResource(`mine:${page}:${pageSize}`, () =>
    api<Page<Registration>>(`/registrations?page=${page}&size=${pageSize}`),
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
        <GatherHeading level={1}>My registrations</GatherHeading>
        <GatherText>Upcoming plans and a record of your past registrations.</GatherText>
      </div>
      <GatherText className="small muted">All times shown in {timezone}.</GatherText>
      <GatherError error={error || resource.error} />
      {notice && (
        <GatherAlert role="status" tone="success">
          {notice}
        </GatherAlert>
      )}
      {resource.loading && <GatherLoading />}
      {resource.data && (
        <>
          {resource.data.content.length ? (
            <div className="stack">
              {resource.data.content.map((r) => (
                <article className="card card-border panel registration-card" key={r.id}>
                  <div>
                    <GatherBadge status={r.status} />
                    <GatherHeading level={2}>
                      <GatherLink href={'/events/' + r.event.id}>{r.event.title}</GatherLink>
                    </GatherHeading>
                    <GatherText>
                      {dateTime(r.event.startsAt)} · {r.event.venue}
                    </GatherText>
                    <GatherText className="small muted">
                      Registered {dateTime(r.registeredAt)}
                      {r.cancelledAt && (
                        <>
                          {' '}
                          · Cancelled {dateTime(r.cancelledAt)}
                          {r.cancellationReason === 'EVENT_CANCELLED' && ' by the event organizer'}
                        </>
                      )}
                    </GatherText>
                    {r.event.status === 'CANCELLED' && (
                      <GatherText className="small">This event was cancelled.</GatherText>
                    )}
                  </div>
                  {r.status === 'ACTIVE' && new Date(r.event.startsAt).getTime() > Date.now() && (
                    <GatherButton
                      variant="secondary"
                      disabled={!!busy}
                      onClick={() => void cancel(r.id)}
                    >
                      {busy === r.id ? 'Cancelling…' : 'Cancel registration'}
                    </GatherButton>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="card card-border panel empty">
              <GatherHeading level={2}>Your next experience is waiting</GatherHeading>
              <GatherText>You haven’t registered for an event yet.</GatherText>
              <GatherLink variant="primary" href="/">
                Explore events
              </GatherLink>
            </div>
          )}
          <GatherPagination
            data={resource.data}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={changePageSize}
          />
        </>
      )}
    </>
  );
}
