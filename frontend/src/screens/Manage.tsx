'use client';
import {
  GatherHeading,
  GatherText,
  GatherAlert,
  GatherTableHead,
  GatherTableBody,
  GatherTableRow,
  GatherTableHeader,
  GatherTableCell,
  GatherTable,
  GatherButton,
  GatherInput,
  GatherTextarea,
  GatherLabel,
  GatherForm,
  GatherFieldset,
  GatherLink,
  GatherBadge,
  GatherError,
  GatherLoading,
  GatherPagination,
} from '../components/ui';
import { usePagination } from '../hooks/usePagination';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, post } from '../api';
import { useAuth } from '../auth';
import { useResource } from '../hooks/useResource';
import { dateTime, localInput, useTimezone } from '../lib/dates';
import type { Attendance, Event, EventInput, Page, Registration } from '../types';
export function ManageEvents() {
  const timezone = useTimezone();
  const { page, setPage, pageSize, changePageSize } = usePagination();
  const { user } = useAuth();
  const resource = useResource(`manage:${page}:${pageSize}`, () =>
    api<Page<Event>>(`/manage/events?page=${page}&size=${pageSize}`),
  );
  return (
    <>
      <div className="section-heading page-heading">
        <div>
          <GatherHeading level={1}>
            {user?.role === 'ADMIN' ? 'All events' : 'Your events'}
          </GatherHeading>
          <GatherText>Create a gathering, welcome your attendees, and make it happen.</GatherText>
        </div>
        <GatherLink variant="primary" href="/manage/events/new">
          + Create event
        </GatherLink>
      </div>
      <GatherError error={resource.error} />
      {resource.loading && <GatherLoading />}
      {resource.data && (
        <>
          {resource.data.content.length ? (
            <GatherTable caption="Managed events">
              <GatherTableHead>
                <GatherTableRow>
                  <GatherTableHeader>Event</GatherTableHeader>
                  <GatherTableHeader>When · {timezone}</GatherTableHeader>
                  <GatherTableHeader>Status</GatherTableHeader>
                  <GatherTableHeader>
                    <span className="sr-only">Actions</span>
                  </GatherTableHeader>
                </GatherTableRow>
              </GatherTableHead>
              <GatherTableBody>
                {resource.data.content.map((e) => (
                  <GatherTableRow key={e.id}>
                    <GatherTableCell>
                      <strong>{e.title}</strong>
                      <span className="cell-sub">
                        {e.venue} · {e.organizerName}
                      </span>
                    </GatherTableCell>
                    <GatherTableCell>{dateTime(e.startsAt)}</GatherTableCell>
                    <GatherTableCell>
                      <GatherBadge status={e.status} />
                    </GatherTableCell>
                    <GatherTableCell>
                      <GatherLink href={'/manage/events/' + e.id}>Manage →</GatherLink>
                    </GatherTableCell>
                  </GatherTableRow>
                ))}
              </GatherTableBody>
            </GatherTable>
          ) : (
            <div className="card card-border panel empty">
              <GatherHeading level={2}>Start with an idea</GatherHeading>
              <GatherText>Create your first draft, then publish when you’re ready.</GatherText>
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
export function EventForm({ event, onSaved }: { event?: Event; onSaved: (event: Event) => void }) {
  const timezone = useTimezone();
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
    <GatherForm panel className="event-form" onSubmit={(e) => void submit(e)}>
      <GatherHeading level={2}>{event ? 'Event details' : 'Make it a gathering'}</GatherHeading>
      <GatherError error={error} />
      {validation && (
        <GatherAlert tone="error" role="alert">
          {validation}
        </GatherAlert>
      )}
      {locked && <GatherAlert>Cancelled or started events cannot be edited.</GatherAlert>}
      <GatherFieldset disabled={locked || busy}>
        <GatherLabel>
          Title
          <GatherInput name="title" required maxLength={160} defaultValue={event?.title} />
        </GatherLabel>
        <GatherLabel>
          Description
          <GatherTextarea
            name="description"
            required
            maxLength={10000}
            rows={6}
            defaultValue={event?.description}
          />
        </GatherLabel>
        <GatherLabel>
          Venue
          <GatherInput name="venue" required maxLength={240} defaultValue={event?.venue} />
        </GatherLabel>
        <div className="form-row">
          <GatherLabel>
            Starts at
            <GatherInput
              type="datetime-local"
              name="startsAt"
              required
              defaultValue={event && localInput(event.startsAt)}
              readOnly={event?.status === 'PUBLISHED'}
            />
          </GatherLabel>
          <GatherLabel>
            Ends at
            <GatherInput
              type="datetime-local"
              name="endsAt"
              required
              defaultValue={event && localInput(event.endsAt)}
              readOnly={event?.status === 'PUBLISHED'}
            />
          </GatherLabel>
        </div>
        <GatherText className="small muted">
          Enter dates in {timezone}.{' '}
          {event?.status === 'PUBLISHED' &&
            'Published dates are fixed. Cancel and create a new event to reschedule.'}
        </GatherText>
        <GatherButton disabled={busy}>
          {busy ? 'Saving…' : event ? 'Save changes' : 'Create draft'}
        </GatherButton>
      </GatherFieldset>
    </GatherForm>
  );
}
export function NewEvent() {
  const router = useRouter();
  return (
    <>
      <GatherLink variant="ghost" className="btn-sm" href="/manage">
        ← Your events
      </GatherLink>
      <GatherHeading level={1}>Create an event</GatherHeading>
      <GatherText className="muted">
        Start with a draft. Only published events appear publicly.
      </GatherText>
      <EventForm onSaved={(e) => router.push('/manage/events/' + e.id)} />
    </>
  );
}
export function ManageEvent() {
  const { id } = useParams<{ id: string }>();
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
      <div className="card card-border panel empty">
        <GatherHeading level={1}>Access restricted</GatherHeading>
        <GatherText>You can manage only your own events.</GatherText>
      </div>
    );
  return (
    <>
      <GatherLink variant="ghost" className="btn-sm" href="/manage">
        ← Your events
      </GatherLink>
      <GatherError error={error || resource.error} />
      {notice && (
        <GatherAlert tone="success" role="status">
          {notice}
        </GatherAlert>
      )}
      {resource.loading && <GatherLoading />}
      {event && (
        <>
          <div className="section-heading">
            <div>
              <GatherBadge status={event.status} />
              <GatherHeading level={1}>{event.title}</GatherHeading>
            </div>
            <div className="card-actions">
              {event.status === 'DRAFT' && (
                <GatherButton disabled={busy} onClick={() => void transition('publish')}>
                  Publish event
                </GatherButton>
              )}
              {event.status !== 'CANCELLED' && (
                <GatherButton
                  variant="danger"
                  disabled={busy}
                  onClick={() => void transition('cancel')}
                >
                  Cancel event
                </GatherButton>
              )}
              <GatherLink href={'/events/' + id}>View event ↗</GatherLink>
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
  const timezone = useTimezone();
  const { page, setPage, pageSize, changePageSize } = usePagination();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState('');
  const resource = useResource(
    `attendees:${event.id}:${page}:${pageSize}:${event.status}`,
    async () => {
      const [registrations, attendance] = await Promise.all([
        api<Page<Registration>>(
          `/manage/events/${event.id}/registrations?page=${page}&size=${pageSize}`,
        ),
        api<Attendance[]>(`/manage/events/${event.id}/attendance`),
      ]);
      return { registrations, attendance };
    },
  );
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
          <GatherHeading level={2}>Registrations & check-in</GatherHeading>
        </div>
        <GatherButton variant="secondary" onClick={resource.reload}>
          Refresh attendees
        </GatherButton>
      </div>
      <GatherText className="muted">
        Check-in opens at the event start and closes at the end. Refresh to update availability.
      </GatherText>
      <GatherError error={error || resource.error} />
      {notice && (
        <GatherAlert role="status" tone="success">
          {notice}
        </GatherAlert>
      )}
      {resource.loading && <GatherLoading />}
      {resource.data && (
        <>
          {resource.data.registrations.content.length ? (
            <GatherTable caption="Event registrations">
              <GatherTableHead>
                <GatherTableRow>
                  <GatherTableHeader>Attendee</GatherTableHeader>
                  <GatherTableHeader>Registered · {timezone}</GatherTableHeader>
                  <GatherTableHeader>Status</GatherTableHeader>
                  <GatherTableHeader>Attendance</GatherTableHeader>
                </GatherTableRow>
              </GatherTableHead>
              <GatherTableBody>
                {resource.data.registrations.content.map((r) => {
                  const check = resource.data?.attendance.find((a) => a.registrationId === r.id);
                  return (
                    <GatherTableRow key={r.id}>
                      <GatherTableCell>
                        <strong>{r.attendeeName}</strong>
                        <span className="cell-sub">{r.attendeeEmail}</span>
                      </GatherTableCell>
                      <GatherTableCell>{dateTime(r.registeredAt)}</GatherTableCell>
                      <GatherTableCell>
                        <GatherBadge status={r.status} />
                      </GatherTableCell>
                      <GatherTableCell>
                        {check ? (
                          <span>
                            ✓ Checked in
                            <span className="cell-sub">{dateTime(check.checkedInAt)}</span>
                          </span>
                        ) : r.status === 'ACTIVE' ? (
                          <GatherButton
                            disabled={!canCheckIn || !!busy}
                            onClick={() => void checkIn(r.id)}
                          >
                            {busy === r.id ? 'Checking in…' : 'Check in'}
                          </GatherButton>
                        ) : (
                          'Not eligible'
                        )}
                      </GatherTableCell>
                    </GatherTableRow>
                  );
                })}
              </GatherTableBody>
            </GatherTable>
          ) : (
            <div className="card card-border panel empty">
              <GatherHeading level={3}>No registrations yet</GatherHeading>
              <GatherText>Share your published event to start bringing people together.</GatherText>
            </div>
          )}
          <GatherPagination
            data={resource.data.registrations}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={changePageSize}
          />
        </>
      )}
    </section>
  );
}
