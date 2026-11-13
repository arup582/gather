import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, post } from '../api';
import { useAuth } from '../auth';
import {
  Badge,
  dateTime,
  ErrorBox,
  Loading,
  localInput,
  Pager,
  timezone,
  useResource,
} from '../ui';
import type { Attendance, Event, EventInput, Page, Registration } from '../types';
export function ManageEvents() {
  const [page, setPage] = useState(0);
  const { user } = useAuth();
  const resource = useResource(`manage:${page}`, () =>
    api<Page<Event>>('/manage/events?page=' + page),
  );
  return (
    <>
      <div className="section-heading page-heading">
        <div>
          <p className="eyebrow">BRING PEOPLE TOGETHER</p>
          <h1>{user?.role === 'ADMIN' ? 'All events' : 'Your events'}</h1>
          <p>Create a gathering, welcome your attendees, and make it happen.</p>
        </div>
        <Link className="button" to="/manage/events/new">
          + Create event
        </Link>
      </div>
      <ErrorBox error={resource.error} />
      {resource.loading && <Loading />}
      {resource.data && (
        <>
          {resource.data.content.length ? (
            <div className="table-wrap">
              <table>
                <caption className="sr-only">Managed events</caption>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>When · {timezone}</th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.content.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <strong>{e.title}</strong>
                        <span className="cell-sub">
                          {e.venue} · {e.organizerName}
                        </span>
                      </td>
                      <td>{dateTime(e.startsAt)}</td>
                      <td>
                        <Badge status={e.status} />
                      </td>
                      <td>
                        <Link to={'/manage/events/' + e.id}>Manage →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <h2>Start with an idea</h2>
              <p>Create your first draft, then publish when you’re ready.</p>
            </div>
          )}
          <Pager data={resource.data} onPage={setPage} />
        </>
      )}
    </>
  );
}
export function EventForm({ event, onSaved }: { event?: Event; onSaved: (event: Event) => void }) {
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState('');
  const locked =
    !!event && (event.status === 'CANCELLED' || new Date(event.startsAt).getTime() <= Date.now());
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidation('');
    setError(undefined);
    const data = new FormData(e.currentTarget);
    const input: EventInput = {
      title: String(data.get('title')).trim(),
      description: String(data.get('description')).trim(),
      venue: String(data.get('venue')).trim(),
      startsAt:
        event?.status === 'PUBLISHED'
          ? event.startsAt
          : new Date(String(data.get('startsAt'))).toISOString(),
      endsAt:
        event?.status === 'PUBLISHED'
          ? event.endsAt
          : new Date(String(data.get('endsAt'))).toISOString(),
    };
    if (!input.title || !input.description || !input.venue) {
      setValidation('Title, description, and venue cannot be blank.');
      return;
    }
    if (new Date(input.startsAt).getTime() <= Date.now()) {
      setValidation('The start must be in the future.');
      return;
    }
    if (input.endsAt <= input.startsAt) {
      setValidation('The end must be after the start.');
      return;
    }
    setBusy(true);
    try {
      const result = await api<Event>('/manage/events' + (event ? '/' + event.id : ''), {
        method: event ? 'PUT' : 'POST',
        body: JSON.stringify(input),
      });
      onSaved(result);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel event-form" onSubmit={(e) => void submit(e)}>
      <h2>{event ? 'Event details' : 'Make it a gathering'}</h2>
      <ErrorBox error={error} />
      {validation && (
        <p className="banner error" role="alert">
          {validation}
        </p>
      )}
      {locked && <p className="banner">Cancelled or started events cannot be edited.</p>}
      <fieldset disabled={locked || busy}>
        <label>
          Title
          <input name="title" required maxLength={160} defaultValue={event?.title} />
        </label>
        <label>
          Description
          <textarea
            name="description"
            required
            maxLength={10000}
            rows={6}
            defaultValue={event?.description}
          />
        </label>
        <label>
          Venue
          <input name="venue" required maxLength={240} defaultValue={event?.venue} />
        </label>
        <div className="form-row">
          <label>
            Starts at
            <input
              type="datetime-local"
              name="startsAt"
              required
              defaultValue={event && localInput(event.startsAt)}
              readOnly={event?.status === 'PUBLISHED'}
            />
          </label>
          <label>
            Ends at
            <input
              type="datetime-local"
              name="endsAt"
              required
              defaultValue={event && localInput(event.endsAt)}
              readOnly={event?.status === 'PUBLISHED'}
            />
          </label>
        </div>
        <p className="small muted">
          Enter dates in {timezone}.{' '}
          {event?.status === 'PUBLISHED' &&
            'Published dates are fixed. Cancel and create a new event to reschedule.'}
        </p>
        <button disabled={busy}>
          {busy ? 'Saving…' : event ? 'Save changes' : 'Create draft'}
        </button>
      </fieldset>
    </form>
  );
}
export function NewEvent() {
  const navigate = useNavigate();
  return (
    <>
      <Link className="back" to="/manage">
        ← Your events
      </Link>
      <h1>Create an event</h1>
      <p className="lead">Start with a draft. Only published events appear publicly.</p>
      <EventForm onSaved={(e) => navigate('/manage/events/' + e.id)} />
    </>
  );
}
export function ManageEvent() {
  const { id } = useParams();
  const { user } = useAuth();
  const resource = useResource(`edit:${id}`, () => api<Event>('/events/' + id));
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function transition(action: string) {
    if (
      action === 'cancel' &&
      !window.confirm('Cancel this event and all its active registrations? This cannot be undone.')
    )
      return;
    setError(undefined);
    setBusy(true);
    try {
      await post('/manage/events/' + id + '/' + action);
      setNotice(
        action === 'publish'
          ? 'Your event is published.'
          : 'Event and active registrations cancelled.',
      );
      resource.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const event = resource.data;
  if (event && user?.role !== 'ADMIN' && event.organizerId !== user?.id)
    return (
      <div className="empty">
        <h1>Access restricted</h1>
        <p>You can manage only your own events.</p>
      </div>
    );
  return (
    <>
      <Link className="back" to="/manage">
        ← Your events
      </Link>
      <ErrorBox error={error || resource.error} />
      {notice && (
        <p className="banner success" role="status">
          {notice}
        </p>
      )}
      {resource.loading && <Loading />}
      {event && (
        <>
          <div className="section-heading">
            <div>
              <Badge status={event.status} />
              <h1>{event.title}</h1>
            </div>
            <div className="actions">
              {event.status === 'DRAFT' && (
                <button disabled={busy} onClick={() => void transition('publish')}>
                  Publish event
                </button>
              )}
              {event.status !== 'CANCELLED' && (
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => void transition('cancel')}
                >
                  Cancel event
                </button>
              )}
              <Link to={'/events/' + id}>View event ↗</Link>
            </div>
          </div>
          <EventForm
            key={event.id + event.status}
            event={event}
            onSaved={() => {
              setNotice('Event saved.');
              resource.reload();
            }}
          />
          <Attendees event={event} />
        </>
      )}
    </>
  );
}
function Attendees({ event }: { event: Event }) {
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState('');
  const resource = useResource(`attendees:${event.id}:${page}:${event.status}`, async () => {
    const [registrations, attendance] = await Promise.all([
      api<Page<Registration>>(`/manage/events/${event.id}/registrations?page=${page}`),
      api<Attendance[]>(`/manage/events/${event.id}/attendance`),
    ]);
    return { registrations, attendance };
  });
  async function checkIn(id: string) {
    setBusy(id);
    setError(undefined);
    try {
      await post(`/manage/events/${event.id}/registrations/${id}/check-in`);
      setNotice('Attendee checked in.');
      resource.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy('');
    }
  }
  const canCheckIn =
    event.status === 'PUBLISHED' &&
    new Date(event.startsAt).getTime() <= Date.now() &&
    Date.now() < new Date(event.endsAt).getTime();
  return (
    <section className="attendees">
      <div className="section-heading">
        <div>
          <p className="eyebrow">THE PEOPLE MAKE IT</p>
          <h2>Registrations & check-in</h2>
        </div>
        <button className="secondary" onClick={resource.reload}>
          Refresh attendees
        </button>
      </div>
      <p className="muted">
        Check-in opens at the event start and closes at the end. Refresh to update availability.
      </p>
      <ErrorBox error={error || resource.error} />
      {notice && (
        <p role="status" className="banner success">
          {notice}
        </p>
      )}
      {resource.loading && <Loading />}
      {resource.data && (
        <>
          {resource.data.registrations.content.length ? (
            <div className="table-wrap">
              <table>
                <caption className="sr-only">Event registrations</caption>
                <thead>
                  <tr>
                    <th>Attendee</th>
                    <th>Registered · {timezone}</th>
                    <th>Status</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.registrations.content.map((r) => {
                    const check = resource.data?.attendance.find((a) => a.registrationId === r.id);
                    return (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.attendeeName}</strong>
                          <span className="cell-sub">{r.attendeeEmail}</span>
                        </td>
                        <td>{dateTime(r.registeredAt)}</td>
                        <td>
                          <Badge status={r.status} />
                        </td>
                        <td>
                          {check ? (
                            <span className="checked">
                              ✓ Checked in
                              <span className="cell-sub">{dateTime(check.checkedInAt)}</span>
                            </span>
                          ) : r.status === 'ACTIVE' ? (
                            <button
                              disabled={!canCheckIn || !!busy}
                              onClick={() => void checkIn(r.id)}
                            >
                              {busy === r.id ? 'Checking in…' : 'Check in'}
                            </button>
                          ) : (
                            'Not eligible'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <h3>No registrations yet</h3>
              <p>Share your published event to start bringing people together.</p>
            </div>
          )}
          <Pager data={resource.data.registrations} onPage={setPage} />
        </>
      )}
    </section>
  );
}
