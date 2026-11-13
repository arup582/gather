import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, post } from '../api';
import { useAuth } from '../auth';
import { Badge, dateTime, ErrorBox, EventCard, Loading, Pager, timezone, useResource } from '../ui';
import type { Event, Page, Registration } from '../types';
export function Browse() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const rawPage = Number(params.get('page') || 0);
  const page = Number.isInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  const resource = useResource(`events:${q}:${page}`, () =>
    api<Page<Event>>(`/events?q=${encodeURIComponent(q)}&page=${page}`),
  );
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">MAKE ROOM FOR A LITTLE CONNECTION</p>
          <h1>
            Good things happen
            <br />
            when we <em>gather.</em>
          </h1>
          <p>
            Find your next experience. Meet your people.
            <br />
            Be part of something close to home.
          </p>
          <a className="button" href="#discover">
            Explore events <span>↘</span>
          </a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun" />
          <div className="arch arch-one" />
          <div className="arch arch-two" />
          <span className="hero-stamp">
            A place for
            <br />
            <b>everyone.</b>
          </span>
          <span className="hero-dot" />
        </div>
      </section>
      <section id="discover">
        <div className="section-heading">
          <div>
            <p className="eyebrow">OUT THERE, TOGETHER</p>
            <h2>Find your next gathering</h2>
          </div>
          <span className="muted">Upcoming · General admission</span>
        </div>
        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setParams(search ? { q: search } : {});
          }}
        >
          <label htmlFor="search">Search events</label>
          <input
            id="search"
            type="search"
            maxLength={200}
            placeholder="An idea, an event, a place…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button>Search</button>
        </form>
        <p className="timezone">All times shown in {timezone}.</p>
        <ErrorBox error={resource.error} />
        {Boolean(resource.error) && (
          <button className="secondary" onClick={resource.reload}>
            Try again
          </button>
        )}
        {resource.loading && <Loading />}
        {resource.data && (
          <>
            {resource.data.content.length ? (
              <div className="event-grid">
                {resource.data.content.map((event, i) => (
                  <EventCard key={event.id} event={event} index={i} />
                ))}
              </div>
            ) : (
              <div className="empty">
                <h3>No upcoming events found</h3>
                <p>
                  {q
                    ? 'Try a different search or clear your filters.'
                    : 'New gatherings will appear here once organizers publish them.'}
                </p>
                {q && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setParams({});
                    }}
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
            <Pager data={resource.data} onPage={(p) => setParams({ q, page: String(p) })} />
          </>
        )}
      </section>
    </>
  );
}
export function EventDetails() {
  const { id } = useParams();
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
      <Link className="back" to="/">
        ← All events
      </Link>
      <ErrorBox error={resource.error} />
      {resource.loading && <Loading />}
      {event && (
        <div className="detail-grid">
          <article>
            <Badge status={event.status} />
            <h1>{event.title}</h1>
            <p className="lead">Hosted by {event.organizerName}</p>
            <div className="detail-art" aria-hidden="true">
              <span>
                Come for the experience.
                <br />
                <em>Stay for the connection.</em>
              </span>
            </div>
            <h2>About this gathering</h2>
            <p className="prose">{event.description}</p>
          </article>
          <aside className="panel">
            <h2>The details</h2>
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
            <ErrorBox error={error} />
            {registered ? (
              <div role="status" className="banner success">
                You’re registered. <Link to="/registrations">View your registrations →</Link>
              </div>
            ) : event.status !== 'PUBLISHED' ? (
              <p className="banner">
                Registration is unavailable for this {event.status.toLowerCase()} event.
              </p>
            ) : new Date(event.startsAt).getTime() <= Date.now() ? (
              <p className="banner">Registration has closed. This event has already started.</p>
            ) : user ? (
              <button className="full" disabled={busy} onClick={() => void register()}>
                {busy ? 'Registering…' : 'Register for this event'}
              </button>
            ) : (
              <Link
                className="button full"
                to={'/signin?next=' + encodeURIComponent('/events/' + id)}
              >
                Sign in to register
              </Link>
            )}
            <p className="small muted">You can cancel before the event begins.</p>
            {user &&
              (user.role === 'ADMIN' ||
                (user.role === 'ORGANIZER' && user.id === event.organizerId)) && (
                <Link to={'/manage/events/' + id}>Manage event →</Link>
              )}
          </aside>
        </div>
      )}
    </>
  );
}
