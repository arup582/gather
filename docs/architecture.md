# Architecture

One Spring Boot process, one PostgreSQL database, four business modules. HTTP controllers adapt requests to services; services own authorization and transaction boundaries; JPA repositories and entities remain internal. React accesses only JSON endpoints under `/api`.

| Module | Owns | Public boundary | Dependencies |
| --- | --- | --- | --- |
| identity | Users, password hashes, roles, sessions | `Actor`, `Role`, `IdentityService` | shared |
| events | Event details, organizer ownership, lifecycle | `EventService`, input/view records, `EventCancelled` | identity, shared |
| registrations | Registration attempts, cancellation history | `RegistrationService`, `RegistrationView` | events, identity, shared |
| attendance | Immutable check-in records | `AttendanceService`, `AttendanceView` | registrations, events, identity, shared |

`shared` contains HTTP errors, pagination, and the UTC clock. `bootstrap` wires synthetic development data using module services. These are support packages, not additional business modules. No service reaches into another module's `internal` Java package. ArchUnit tests enforce this and reject cycles. Cross-module references use UUIDs rather than JPA entity associations. The attendance repository has one explicit SQL read projection joining registration IDs to their event; it neither maps nor mutates registration entities.

## Authorization and authentication

Spring Security handles form login, session ID rotation, password comparison, and POST logout. BCrypt uses cost 12. Passwords have a 12-character minimum and 72-byte UTF-8 maximum, avoiding BCrypt truncation. Email identities are trimmed and normalized to lower case, with a database unique constraint.

Spring Security keeps CSRF protection enabled for every unsafe request, including sign-up, login, and logout. The frontend obtains a masked session-bound token from `/api/auth/csrf` immediately before each mutation. This works with default BREACH protection and token rotation after authentication/logout. Cookies carry sessions; no authentication or CSRF tokens are stored in localStorage. Next.js rewrites proxy `/api` in development and production, preserving the same-origin browser contract.

Each controller resolves an `Actor` through `IdentityService.current`. It re-reads enabled status and role on every operation, so a role stored in an old session cannot preserve revoked privileges. Services apply manager/admin and event-ownership checks; frontend visibility is only a convenience. Private registration cancellation returns 404 for another attendee's ID.

## Transaction and concurrency model

All writes involving an event take a PostgreSQL `SELECT FOR UPDATE` lock on the event first. The outer service transaction retains the lock until commit. Registration creation, attendee cancellation, lifecycle transitions, and attendance follow the same lock order. There are no JVM-only locks and correctness does not depend on one browser request at a time.

The partial unique index on `(event_id, attendee_id) WHERE status = 'ACTIVE'` is a database backstop. A successful repeated registration reads the existing row under the event lock; a cancelled registration is never reactivated. A new registration attempt receives a new ID. Check-in has a unique constraint on registration ID and preserves the original operator/timestamp on repeats.

`EventCancelled` is a synchronous in-process event, handled by registrations inside the publisher's transaction. The listener flushes the event change and cancels active registrations; failure rolls everything back. An integration test deliberately throws after cancellation to prove atomic rollback on PostgreSQL. If registration races cancellation, either it commits first and is then cancelled, or observes the cancelled event and is rejected.

Check-in starts at event start, while attendee cancellation ends there. They therefore cannot both be valid at the same instant. The event lock still serializes them with organizer cancellation. Historical check-in records are retained if the organizer cancels an event after check-in.

## Persistence and time

Flyway owns schema changes. Hibernate uses `ddl-auto: validate` with open-in-view disabled. Tables have primary keys, foreign keys, status/date checks, a partial unique registration index, and access-path indexes for browsing, ownership, and attendee history. Controllers return DTOs, never entities or password hashes.

Times are Java `Instant` values, SQL `timestamptz`, and ISO-8601 JSON. A UTC `Clock` is injected into business services; tests substitute a controllable clock to exercise exact start/end boundaries without sleeps. Browser local datetime inputs convert to UTC before posting.

## Testing boundaries

Unit tests cover event state transitions; architecture tests cover Java module dependencies. `ApplicationIT` starts the actual Spring context and security filters against native PostgreSQL 16 in the default workflow (or a separately provisioned PostgreSQL test instance), exercising real migrations, constraints, rollback, and concurrent transactions. It uses a low-cost test-only BCrypt encoder to keep tests fast. Frontend component tests isolate HTTP responses to check interactions and error states; Playwright workflows call the real backend with persisted data. The app itself contains no mock API or fallback fixtures.

## Frontend routing

Next.js App Router owns the routes in `frontend/src/app`. A shared layout supplies authentication and navigation; interactive screens live in `src/screens` as client components. Spring Boot remains responsible for data, sessions, CSRF and authorization. The frontend needs a Node server; it is not a static HTML export.
