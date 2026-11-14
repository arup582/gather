# HTTP API

Base URL in development: `http://127.0.0.1:3000/api` through the frontend proxy, or `http://127.0.0.1:8080/api` for a direct HTTP client. Do not mix hosts or cookie jars. Content type is JSON except form login. IDs are UUIDs; timestamps are ISO-8601 with an explicit offset.

## Session and CSRF sequence

1. `GET /auth/csrf` with cookies enabled. Save the response cookie and `{ "token": "…", "headerName": "X-CSRF-TOKEN" }`.
2. Send that header and cookies on the next unsafe request. `POST /auth/login` accepts URL-encoded `email` and `password`; success is `204`. Failures are `401` with a generic message.
3. Fetch a new CSRF token after login or logout because the previous token is cleared. The frontend simply fetches one before every mutation. Keep the rotated session cookie returned by login.
4. `GET /auth/me` returns the current enabled user; `POST /auth/logout` invalidates the session and returns `204`.

Do not disable CSRF to make an API client work. Spring's [CSRF documentation](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html) describes the session-token and rotation behavior.

## Endpoints

All routes below are relative to `/api`.

| Method | Route | Access / result |
| --- | --- | --- |
| GET | `/auth/csrf` | Anyone; session-bound token |
| POST | `/auth/signup` | Anyone + CSRF; `{email, displayName, password}` → attendee, `201` |
| POST | `/auth/login` | Anyone + CSRF; form fields `email`, `password` → `204` |
| GET | `/auth/me` | Current user, or `401` |
| POST | `/auth/logout` | CSRF; session invalidation, `204` |
| GET | `/events?q=&page=0&size=12` | Published upcoming event page |
| GET | `/events/{id}` | Published/past/previously published cancelled details; unpublished details require owner/admin |
| GET | `/manage/events?page=0&size=20` | Organizer's events; admin sees all |
| POST | `/manage/events` | Organizer/admin; creates owned draft, `201` |
| PUT | `/manage/events/{id}` | Owner/admin; update event fields |
| POST | `/manage/events/{id}/publish` | Owner/admin; publish draft; repeated publish returns current event |
| POST | `/manage/events/{id}/cancel` | Owner/admin; terminal cancellation and active registration cancellation |
| POST | `/events/{id}/registrations` | Any signed-in enabled account; active registration, `200` (including duplicate) |
| GET | `/registrations?page=0&size=20` | Current account's private registration history |
| POST | `/registrations/{id}/cancel` | Attendee who owns the registration; `200`, including duplicate cancellation |
| GET | `/manage/events/{id}/registrations?page=0&size=20` | Event owner/admin; attendee names/emails and history |
| POST | `/manage/events/{eventId}/registrations/{registrationId}/check-in` | Event owner/admin, active registration, event in progress; attendance record, `200` |
| GET | `/manage/events/{id}/attendance` | Event owner/admin; attendance array |
| GET | `/admin/users?page=0&size=20` | Admin; user page |
| POST | `/admin/users` | Admin + CSRF; `{email, displayName, password, role}` → enabled user, `201` |
| PATCH | `/admin/users/{id}` | Admin; `{role, enabled}` → updated user |

Other than the explicit `201`/`204` cases, successful operations return `200`. Public browsing defaults to 12 rows; other lists default to 20. All pages accept size 1–100, use zero-based page numbers, and return `{content, page, totalPages, totalElements}`. Event browsing sorts by start then ID; management by start descending then ID; registration history by registration time descending then ID; users by email. Search accepts at most 200 characters, matches title/venue literally and case-insensitively, and escapes SQL wildcard characters.

## Event body

Create and update accept the same complete body; status and ownership cannot be assigned in it:

```json
{
  "title": "Community makers evening",
  "description": "Bring an idea and meet local makers.",
  "venue": "Community studio",
  "startsAt": "2030-05-20T12:00:00Z",
  "endsAt": "2030-05-20T14:00:00Z"
}
```

Use future dates when executing the request. Title (160), description (10,000), and venue (240) are required, with limits in characters. Start must be future and end strictly later. Updates to a published event must preserve its original timestamps exactly. Returned events add `id`, `organizerId`, `organizerName`, and `status`.

## Users, registrations, attendance

Users expose `{id, email, displayName, role, enabled}`. Roles are `ATTENDEE`, `ORGANIZER`, or `ADMIN`. Sign-up ignores extra fields and never grants organizer/admin access. Display names are required (100 characters); emails are validated (254 characters). Passwords require at least 12 characters and at most 72 UTF-8 bytes; passwords/hashes are never returned.

Administrators can create users with any of the three roles through `POST /admin/users`. The role is required. New accounts are enabled; creating one does not sign in as that user or change the administrator's session. Duplicate emails return `409`, including differences in letter case. Use `PATCH /admin/users/{id}` to change role or enabled status; administrators cannot revoke their own access.

Accounts are persisted in PostgreSQL's `app_user` table through Spring Data JPA. Each account has one role, stored as a string in its row; the allowed roles are defined in code and constrained by the database. Passwords are stored as BCrypt hashes with cost 12. Login loads the account from the database, and authenticated operations reload its role and enabled status so permission changes apply to existing sessions immediately. The admin list reads a paginated database query sorted by email.

Registrations expose `{id, event, attendeeId, attendeeName, attendeeEmail, status, registeredAt, cancelledAt, cancellationReason}`. Status is `ACTIVE` or `CANCELLED`; reason is `ATTENDEE`, `EVENT_CANCELLED`, or null. A cancellation creates no new row. Re-registration creates a new row and retains prior history. Repeating registration after the event starts is `409`, even if an earlier active registration exists.

Attendance exposes `{id, registrationId, checkedInBy, checkedInAt}`. New check-ins require `start <= now < end`. Repeats for an active registration return the original record, even after end; cancelled registrations always receive `409`. A registration ID belonging to a different event receives `404`.

## Errors

```json
{
  "message": "Please correct the highlighted fields",
  "fields": { "title": "must not be blank" }
}
```

`400` means malformed input, validation, or invalid pagination. `401` means absent/disabled/expired authentication. `403` means insufficient role/ownership or invalid/missing CSRF; a CSRF error tells the client to refresh. `404` covers missing resources and concealed private records. `409` means a lifecycle/uniqueness conflict. The client displays these messages and never automatically retries mutations. Database errors are mapped to a generic conflict message without exposing SQL details.
