'use client';
import {
  GatherHeading,
  GatherText,
  GatherCard,
  GatherAlert,
  GatherButton,
  GatherInput,
  GatherLabel,
  GatherForm,
  GatherLink,
  GatherBadge,
  GatherError,
  GatherLoading,
  GatherPagination,
} from '../components/ui';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { api, post } from '../api';
import { useAuth } from '../auth';
import { EventCard } from '../components/events/EventCard';
import { GatherScene } from '../components/brand/GatherScene';
import { useResource } from '../hooks/useResource';
import { dateTime, useTimezone } from '../lib/dates';
import type { Event, Page, Registration } from '../types';
export function Browse() {
  const timezone = useTimezone();
  const params = useSearchParams();
  const router = useRouter();
  const setParams = (values: Record<string, string>) => {
    const query = new URLSearchParams(values).toString();
    router.push(query ? '/?' + query : '/', { scroll: false });
  };
  const q = params.get('q') || '';
  const rawPage = Number(params.get('page') || 0);
  const page = Number.isInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const requestedSize = Number(params.get('size') || 12);
  const pageSize = [12, 24, 48, 96].includes(requestedSize) ? requestedSize : 12;
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  const resource = useResource(`events:${q}:${page}:${pageSize}`, () =>
    api<Page<Event>>(`/events?q=${encodeURIComponent(q)}&page=${page}&size=${pageSize}`),
  );
  return (
    <>
      <section className="hero discovery-hero" aria-labelledby="discovery-heading">
        <div className="hero-content">
          <div className="discovery-intro">
            <GatherText className="small">Out there, together</GatherText>
            <GatherHeading level={1} id="discovery-heading">
              Good things happen
              <br />
              when we <em>gather.</em>
            </GatherHeading>
            <GatherText>
              Find your next experience. Meet your people.
              <br />
              Be part of something close to home.
            </GatherText>
            <GatherLink variant="primary" href="#discover">
              Explore events <span>↘</span>
            </GatherLink>
          </div>
          <GatherScene />
        </div>
      </section>
      <section id="discover">
        <div className="section-heading">
          <div>
            <GatherHeading level={2}>Find your next gathering</GatherHeading>
          </div>
          <span className="muted">Upcoming · General admission</span>
        </div>
        <GatherForm
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ q: search, size: String(pageSize) });
          }}
        >
          <GatherLabel htmlFor="search">Search events</GatherLabel>
          <GatherInput
            id="search"
            type="search"
            maxLength={200}
            placeholder="An idea, an event, a place…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <GatherButton>Search</GatherButton>
        </GatherForm>
        <GatherText className="small muted">All times shown in {timezone}.</GatherText>
        <GatherError error={resource.error} />
        {Boolean(resource.error) && (
          <GatherButton variant="secondary" onClick={resource.reload}>
            Try again
          </GatherButton>
        )}
        {resource.loading && <GatherLoading />}
        {resource.data && (
          <>
            {resource.data.content.length ? (
              <div className="event-grid">
                {resource.data.content.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="card card-border panel empty">
                <GatherHeading level={3}>No upcoming events found</GatherHeading>
                <GatherText>
                  {q
                    ? 'Try a different search or clear your filters.'
                    : 'New gatherings will appear here once organizers publish them.'}
                </GatherText>
                {q && (
                  <GatherButton
                    onClick={() => {
                      setSearch('');
                      setParams({ size: String(pageSize) });
                    }}
                  >
                    Clear search
                  </GatherButton>
                )}
              </div>
            )}
            <GatherPagination
              data={resource.data}
              pageSize={pageSize}
              sizes={[12, 24, 48, 96]}
              sizeLabel="Events per page"
              onPage={(p) => setParams({ q, page: String(p), size: String(pageSize) })}
              onPageSize={(size) => setParams({ q, size: String(size) })}
            />
          </>
        )}
      </section>
    </>
  );
}
export function EventDetails() {
  const timezone = useTimezone();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const resource = useResource(`event:${id}:${user?.id}`, () => api<Event>('/events/' + id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [registered, setRegistered] = useState(false);
  async function register() {
    setBusy(true);
    setError(undefined);
    try {
      await post<Registration>(`/events/${id}/registrations`);
      setRegistered(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const event = resource.data;
  return (
    <>
      <GatherLink variant="ghost" className="btn-sm" href="/">
        ← All events
      </GatherLink>
      <GatherError error={resource.error} />
      {resource.loading && <GatherLoading />}
      {event && (
        <div className="detail-grid">
          <article>
            <GatherBadge status={event.status} />
            <GatherHeading level={1}>{event.title}</GatherHeading>
            <GatherText className="muted">Hosted by {event.organizerName}</GatherText>
            <GatherHeading level={2}>About this gathering</GatherHeading>
            <GatherText className="event-description">{event.description}</GatherText>
          </article>
          <GatherCard as="aside" className="panel">
            <GatherHeading level={2}>The details</GatherHeading>
            <dl>
              <dt>When</dt>
              <dd>
                {dateTime(event.startsAt)}
                <br />
                to {dateTime(event.endsAt)}
              </dd>
              <dt>Timezone</dt>
              <dd>{timezone}</dd>
              <dt>Where</dt>
              <dd>{event.venue}</dd>
              <dt>Admission</dt>
              <dd>General admission · No seat limit</dd>
            </dl>
            <GatherError error={error} />
            {registered ? (
              <GatherAlert role="status" tone="success">
                You’re registered.{' '}
                <GatherLink href="/registrations">View your registrations →</GatherLink>
              </GatherAlert>
            ) : event.status !== 'PUBLISHED' ? (
              <GatherAlert>
                Registration is unavailable for this {event.status.toLowerCase()} event.
              </GatherAlert>
            ) : new Date(event.startsAt).getTime() <= Date.now() ? (
              <GatherAlert>Registration has closed. This event has already started.</GatherAlert>
            ) : user ? (
              <GatherButton className="btn-block" disabled={busy} onClick={() => void register()}>
                {busy ? 'Registering…' : 'Register for this event'}
              </GatherButton>
            ) : (
              <GatherLink
                variant="primary"
                className="btn-block"
                href={'/signin?next=' + encodeURIComponent('/events/' + id)}
              >
                Sign in to register
              </GatherLink>
            )}
            <GatherText className="small muted">You can cancel before the event begins.</GatherText>
            {user &&
              (user.role === 'ADMIN' ||
                (user.role === 'ORGANIZER' && user.id === event.organizerId)) && (
                <GatherLink href={'/manage/events/' + id}>Manage event →</GatherLink>
              )}
          </GatherCard>
        </div>
      )}
    </>
  );
}
