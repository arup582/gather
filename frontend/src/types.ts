export type Role = 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  enabled: boolean;
}
export interface Event {
  id: string;
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  organizerId: string;
  organizerName: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
}
export type EventInput = Pick<Event, 'title' | 'description' | 'venue' | 'startsAt' | 'endsAt'>;
export interface Registration {
  id: string;
  event: Event;
  attendeeId: string;
  attendeeName: string;
  attendeeEmail: string;
  status: 'ACTIVE' | 'CANCELLED';
  registeredAt: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
}
export interface Attendance {
  id: string;
  registrationId: string;
  checkedInBy: string;
  checkedInAt: string;
}
export interface Page<T> {
  content: T[];
  page: number;
  totalPages: number;
  totalElements: number;
}
