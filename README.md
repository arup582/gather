# Gather

Gather manages general-admission events, attendee registrations, and organizer check-in. It has a Spring Boot API, a Next.js frontend, and a PostgreSQL database.

## Features

- Browse and search published upcoming events.
- Create an attendee account, sign in, register, and cancel a registration.
- Create drafts, edit event details, publish events, and view attendee lists.
- Check attendees in during an event; duplicate check-ins return the original record.
- Create users and manage their roles and account status in a paginated administrator table.
- Access all events as an administrator.

Authorization and event ownership are enforced by the API. Sign-up creates attendee accounts only. Authentication uses hashed passwords and same-origin sessions with CSRF protection.

## Requirements

| Component   | Version                                                                  |
| ----------- | ------------------------------------------------------------------------ |
| Java        | 21                                                                       |
| Spring Boot | 4.1.2                                                                    |
| Node        | 22.21.0, selected by `.nvmrc`                                            |
| PostgreSQL  | 16 for the native scripts; 17 for Docker Compose                         |
| Maven       | Installed 3.8.x or 3.9.x for native scripts; wrapper included for Docker |

The frontend uses Next.js 16.4.3 App Router, React 19, and TypeScript 5. Exact dependency versions are recorded in `frontend/package-lock.json`.

Shared Gather components use daisyUI for tables, pagination controls, dropdowns, forms, and account toggles, with one component per file. daisyUI is the only UI package beyond Next.js and React; controls use native browser interactions. The header’s palette icon opens appearance settings for themes, accent colors, fonts, text size, line height, density, corners, content width, and reduced motion. Preferences persist across reloads. See [frontend structure and theming](docs/frontend.md) for customization.

Use installed tools for native development; Docker is an optional local alternative. The database volumes are separate; never open a PostgreSQL 17 data directory with PostgreSQL 16.

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

The frontend always uses port 3000 and the API uses port 8080, for both native and Docker workflows. The native database uses port 55432. The root `.env` is the only environment file; it holds credentials and optional tool paths such as `MVN` or `JAVA_HOME`. Shell environment variables take precedence over `.env`.

The native workflow stores its database under `.local-runtime/`. Stop the API with Ctrl+C, then run `sh scripts/local.sh db:stop` to stop that database without deleting it. Native scripts require a non-root OS user, or a provisioned `postgres` OS account when invoked as root.

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

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Next.js proxies `/api` to the backend on port 8080. Run `npm run build` followed by `npm start` in `frontend/` for production mode.

Use `docker compose restart backend` after backend edits. `docker compose down` stops services while retaining database volumes. Avoid `down -v` unless you intend to delete local data.

## Development accounts

The `dev` profile seeds these accounts on the first startup of an empty database. They all use `DEV_SEED_PASSWORD` from your local `.env`.

| Account                        | Role                             |
| ------------------------------ | -------------------------------- |
| `attendee@example.test`        | Attendee                         |
| `organizer@example.test`       | Organizer                        |
| `other-organizer@example.test` | Organizer with no initial events |
| `admin@example.test`           | Administrator                    |

The seed creates sample events and one attendee registration. Restarting does not change account passwords or event dates. Changing `.env` after seeding does not reset existing passwords. Keep `.env`, `.local-runtime`, and database backups out of source control.

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
frontend/                Next.js App Router application, component tests, browser tests
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

Next.js uses the installed Node runtime. Vite remains only as tooling for Vitest component tests. If you use a private npm registry, verify that it provides Next.js and its platform-specific native packages.
