'use client';
import { GatherHeading, GatherText, GatherLink as Link } from '../ui';
import type { Event } from '../../types';
export function EventCard({ event }: { event: Event }) {
  const startsAt = new Date(event.startsAt);
  return (
    <article className="card card-border event-card">
      <div className="event-card-banner" aria-hidden="true">
        <span className="event-date">
          <strong>{startsAt.toLocaleDateString(undefined, { day: 'numeric' })}</strong>
          {startsAt.toLocaleDateString(undefined, { month: 'short' })}
        </span>
        <svg width="220" height="88" viewBox="0 0 220 88" fill="none" focusable="false">
          <circle cx="164" cy="73" r="56" stroke="var(--color-primary)" strokeWidth="22" />
          <path
            d="M195-30v30a73 73 0 0 1-73 73H80"
            stroke="var(--color-secondary)"
            strokeWidth="22"
          />
          <path d="m52 14 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z" fill="var(--color-accent)" />
        </svg>
      </div>
      <div className="card-body">
        <time dateTime={event.startsAt}>
          {startsAt.toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
          {' · '}
          {startsAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </time>
        <GatherHeading level={2} className="card-title">
          <Link href={'/events/' + event.id}>{event.title}</Link>
        </GatherHeading>
        <GatherText>{event.venue}</GatherText>
        <GatherText className="muted">Hosted by {event.organizerName}</GatherText>
        <div className="card-actions">
          <Link aria-label={'View ' + event.title} href={'/events/' + event.id}>
            View event →
          </Link>
        </div>
      </div>
    </article>
  );
}
