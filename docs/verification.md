# Verification

Last review run: **13 November 2026 (Asia/Kolkata)**.

| Check | Command | Result |
| --- | --- | --- |
| Installed native tools | `sh scripts/local.sh doctor` | Node 22.21.0, Java 21, Maven 3.8.7, PostgreSQL 16.15 detected |
| Backend and PostgreSQL integration | `sh scripts/local.sh test:backend` | 10 unit/architecture tests and 16 integration tests passed; JAR packaged |
| Frontend interactions | `cd frontend && npm test` after `nvm use` | 10 passed |
| TypeScript and frontend bundle | `cd frontend && npm run build` after `nvm use` | Passed |
| Browser workflows | `sh scripts/local.sh test:browser` | 5 passed using installed Chrome |

Integration tests run against a separate native PostgreSQL database and include real transactions, constraints, authentication, CSRF, ownership, cancellation, check-in, and concurrent requests. No H2 substitute was used. Browser tests exercise the running development service and create synthetic development records.

The new backend regression cases run in the integration-test application context. The existing development process was not restarted during review. Docker images were not rebuilt during this review. No public deployment, external HTTPS setup, load test, or additional browser certification is claimed. Dependency availability in a private package mirror has not been verified.

See [review findings](review.md) and [startup commands](../README.md).

## Next.js migration — 14 November 2026

Migrated to Next.js 16.4.3 App Router and removed React Router and the Vite application entry point. Vite remains a Vitest dependency. Native verification used Node 22.21, PostgreSQL 16, and installed Chrome on macOS:

- Clean `sh scripts/local.sh install:frontend`: passed; npm reported zero vulnerabilities.
- `sh scripts/local.sh test:frontend`: 10 component tests, TypeScript route checks, and the standalone production build passed.
- `PLAYWRIGHT_PRODUCTION=1 sh scripts/local.sh test:browser`: all 6 workflows passed against the real Spring Boot API. Coverage includes signup, registration/cancellation, organizer editing and check-in, administrator role changes, mobile layout, search history, protected redirects, reload/session persistence, and HTTP 404 handling.
- The routing regression runs in America/New_York to check hydration with a browser timezone different from the build machine.

Linux installation, private package registry availability, and the updated Docker image have not been verified. Browser tests create synthetic records in the local development database. Temporary frontend/backend test processes were stopped afterward; PostgreSQL was left running.

### Fixed ports and one environment file

Standardized the API on 8080 and the frontend on 3000 across native commands, Docker configuration, IntelliJ debug configuration and browser tests. Removed the old application port overrides and consolidated local configuration into the root `.env`; `.env.example` remains a template. Native setup is now the primary README workflow.

Verified the existing API on 8080 returned HTTP 200 from `/api/auth/csrf`. Tool detection, 10 component tests, TypeScript checking, the production build and all 6 production browser workflows passed with the frontend on 3000. The existing backend was left running; the temporary frontend test server was stopped. Docker and private package registries were not tested.
