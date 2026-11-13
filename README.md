# Gather

Gather manages general-admission events, attendee registrations, and organizer check-in. It has a Spring Boot API, a React frontend, and a PostgreSQL database.

## Features

- Browse and search published upcoming events.
- Create an attendee account, sign in, register, and cancel a registration.
- Create drafts, edit event details, publish events, and view attendee lists.
- Check attendees in during an event; duplicate check-ins return the original record.
- Manage users and roles as an administrator, with access to all events.

Authorization and event ownership are enforced by the API. Sign-up creates attendee accounts only. Authentication uses hashed passwords and same-origin sessions with CSRF protection.

## Requirements

| Component | Version |
| --- | --- |
| Java | 21 |
| Spring Boot | 4.1.2 |
| Node | 22.21.0, selected by `.nvmrc` |
| PostgreSQL | 16 for the native scripts; 17 for Docker Compose |
| Maven | Installed 3.8.x or 3.9.x for native scripts; wrapper included for Docker |

The frontend uses React 19, TypeScript 5, and Vite 8. Exact dependency versions are recorded in `frontend/package-lock.json`.

Choose either Docker or installed local tools. The database volumes are separate; never open a PostgreSQL 17 data directory with PostgreSQL 16.

## Run with Docker

Docker Desktop must be running. From the repository root:

```sh
nvm use
node scripts/init-env.mjs
docker compose up -d db backend
docker compose logs -f backend
```

The initializer creates `.env` with random local passwords and leaves an existing file unchanged. Wait for `Started GatherApplication`, then start the frontend in a second terminal:

```sh
nvm use
cd frontend
npm ci
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Vite proxies `/api` to the backend on port 8080. Stop Vite before reinstalling dependencies; if its cache becomes stale, restart with `npm run dev -- --force`.

Use `docker compose restart backend` after backend edits. `docker compose down` stops services while retaining database volumes. Avoid `down -v` unless you intend to delete local data.

## Run with installed tools

Install the versions listed above and put their executables on PATH. These scripts do not install software or download runtimes. Set `JAVA_HOME` and `MVN` if your tools are elsewhere.

```sh
sh scripts/local.sh doctor
sh scripts/local.sh db:start
sh scripts/local.sh install:frontend
sh scripts/local.sh backend
```

In a second terminal, from the same repository:

```sh
sh scripts/local.sh frontend
```

Defaults are frontend port 5173, API port 8080, and database port 55432. Optional `GATHER_WEB_PORT`, `GATHER_API_PORT`, and `GATHER_PG_PORT` can be set in a gitignored `.env.local`. Use the same configuration in both terminals. Shell environment variables take precedence over `.env.local`, which takes precedence over `.env`.

The native workflow stores its database under `.local-runtime/`. Stop the API with Ctrl+C, then run `sh scripts/local.sh db:stop` to stop that database without deleting it. Native scripts require a non-root OS user, or a provisioned `postgres` OS account when invoked as root.

## Development accounts

The `dev` profile seeds these accounts on the first startup of an empty database. They all use `DEV_SEED_PASSWORD` from your local `.env`.

| Account | Role |
| --- | --- |
| `attendee@example.test` | Attendee |
| `organizer@example.test` | Organizer |
| `other-organizer@example.test` | Organizer with no initial events |
| `admin@example.test` | Administrator |

The seed creates sample events and one attendee registration. Restarting does not change account passwords or event dates. Changing `.env` after seeding does not reset existing passwords. Keep `.env`, `.env.local`, `.local-runtime`, and database backups out of source control.

## Tests

Backend tests include lifecycle rules, architecture boundaries, authentication, ownership, registration uniqueness, cancellation, check-in, database constraints, rollback, and concurrent requests.

```sh
# Docker PostgreSQL integration tests and JAR build
# Uses a separate temporary test database.
docker compose --profile test run --rm backend-test

# Alternatively, installed Maven and native PostgreSQL
sh scripts/local.sh test:backend

# Frontend interactions, TypeScript, and production bundle
sh scripts/local.sh test:frontend

# Browser workflows; start the development backend first
sh scripts/local.sh test:browser
```

Browser tests use an installed Chrome or Chromium. Set `PLAYWRIGHT_EXECUTABLE_PATH` if autodetection cannot find it. They create synthetic records in the development database; run them only against a local development instance. Integration tests truncate their dedicated test database, never the development database. Do not run concurrent suites against the same test database.

## Business rules

Events move from draft to published, or to cancelled. Cancellation is terminal. Published event times cannot be changed; cancel and create a new event to reschedule. Started events cannot be edited.

An attendee can have one active registration per event. Repeated registration returns that record; cancelling retains it in history, and registering again creates a new record. Registration and attendee cancellation close at the start time. Cancelling an event cancels its active registrations in the same transaction.

Check-in requires an active registration and an event in progress. Only its organizer or an administrator can check attendees in. Repeated check-in preserves the original timestamp and operator.

Times are stored as UTC instants and displayed in the browser's timezone, which is shown in the interface. Public browsing includes only upcoming published events; past or cancelled published events retain their detail pages. Unpublished events remain private.

## Project structure

```text
backend/                 Spring Boot application and Maven Wrapper
  src/main/java/com/acme/gather/
    identity/            Accounts, roles, and authentication
    events/              Event details, ownership, and publication
    registrations/       Registration attempts and cancellation
    attendance/          Check-in records
  src/main/resources/db/migration/
frontend/                React application, component tests, browser tests
scripts/                 Local configuration and runtime commands
docs/                    API, architecture, deployment, and verification notes
```

The backend is a modular monolith. Modules expose services and DTOs; repositories and entities live in their internal packages. ArchUnit checks dependencies. Flyway owns schema changes; Hibernate validates the schema at startup.

## Documentation and scope

- [API reference](docs/api.md)
- [Architecture](docs/architecture.md)
- [Deployment and administrator provisioning](docs/deployment.md)
- [Verification record](docs/verification.md)
- [Code review](docs/review.md)

There are no capacity limits, waitlists, payments, recurring events, email delivery, password recovery, or file uploads. Sessions live in one backend process and expire on restart. Search uses substring matching, and attendance lists are not paginated. Public deployment requires HTTPS and operational controls such as login rate limiting; these are not supplied by the local development setup.
