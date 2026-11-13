CREATE TABLE app_user (
  id uuid PRIMARY KEY,
  email varchar(254) NOT NULL UNIQUE CHECK (email = lower(email)),
  display_name varchar(100) NOT NULL CHECK (length(trim(display_name)) > 0),
  password_hash varchar(100) NOT NULL,
  role varchar(20) NOT NULL CHECK (role IN ('ATTENDEE','ORGANIZER','ADMIN')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL
);
CREATE TABLE event (
  id uuid PRIMARY KEY,
  title varchar(160) NOT NULL CHECK (length(trim(title)) > 0),
  description varchar(10000) NOT NULL,
  venue varchar(240) NOT NULL CHECK (length(trim(venue)) > 0),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
  published_at timestamptz,
  organizer_id uuid NOT NULL REFERENCES app_user(id),
  status varchar(20) NOT NULL CHECK (status IN ('DRAFT','PUBLISHED','CANCELLED')),
  created_at timestamptz NOT NULL
);
CREATE INDEX event_public_browse ON event(status, starts_at, id);
CREATE INDEX event_organizer ON event(organizer_id, starts_at);
CREATE TABLE registration (
  id uuid PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES event(id),
  attendee_id uuid NOT NULL REFERENCES app_user(id),
  status varchar(20) NOT NULL CHECK (status IN ('ACTIVE','CANCELLED')),
  registered_at timestamptz NOT NULL,
  cancelled_at timestamptz,
  cancellation_reason varchar(30),
  CHECK ((status = 'ACTIVE' AND cancelled_at IS NULL AND cancellation_reason IS NULL)
    OR (status = 'CANCELLED' AND cancelled_at IS NOT NULL AND cancellation_reason IN ('ATTENDEE','EVENT_CANCELLED')))
);
CREATE UNIQUE INDEX registration_one_active ON registration(event_id, attendee_id) WHERE status = 'ACTIVE';
CREATE INDEX registration_attendee ON registration(attendee_id, registered_at DESC);
CREATE INDEX registration_event ON registration(event_id, registered_at);
CREATE TABLE attendance (
  id uuid PRIMARY KEY,
  registration_id uuid NOT NULL UNIQUE REFERENCES registration(id),
  checked_in_by uuid NOT NULL REFERENCES app_user(id),
  checked_in_at timestamptz NOT NULL
);
