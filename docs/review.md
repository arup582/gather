# Code review — 13 November 2026

Reviewed the business modules, controllers and security configuration, schema and migrations, React routes and forms, HTTP client, test suites, native scripts, Compose configuration, Dockerfiles, and documentation. This is a source review plus local automated verification, not a penetration test or an authorship assessment.

## Findings addressed

| Priority | Finding | Resolution and regression coverage |
| --- | --- | --- |
| P2 | Two administrators could each disable the other using already-resolved actors, leaving no enabled administrator. The self-demotion check did not prevent this race. | Administrator updates now lock administrator rows in a stable order and recheck the acting user's current enabled status and role inside that transaction. A two-thread PostgreSQL regression test verifies that one administrator remains enabled. |
| P2 | The registration CHECK used `cancellation_reason IN (...)`; SQL NULL evaluates to UNKNOWN and satisfies a CHECK. A cancelled row with no reason could bypass the intended database invariant. | Added Flyway V2 with an explicit non-null check for cancelled registrations. A PostgreSQL test attempts that invalid write and verifies rejection. |
| P2 | After an initial connection failure, retrying `/auth/me` and receiving an expected anonymous 401 left the old error banner visible. | Clear the connection error for reachable anonymous sessions; interaction test covers outage and recovery. |
| P2 | Search results followed URL changes on Back/Forward, but the search input retained the previous query. | Synchronize the input with the URL query; interaction test covers browser history navigation. |

## Documentation

Reworked README around supported features, actual versions, Docker/native startup, configuration, tests, and business rules. Moved production setup to `deployment.md`. Removed machine-specific paths and environment-specific organizational details from public-facing setup instructions. No invented project age, contributors, development milestones, or historical commits were added.

## Remaining limitations

- Login and sign-up have no rate limiting; configure this before exposing the service publicly.
- Attendance listing is unpaginated, and registration DTO assembly performs additional user/event lookups per page. Review query volume before scaling up.
- Sessions are in-process and disappear on restart. Multi-instance deployment needs an explicit session strategy.
- The development seed uses the demo administrator's existence as its initialization marker. It is intended for fresh local databases, not production or partially imported demo datasets.
- Flyway V2 intentionally rejects pre-existing cancelled rows with a null reason. If such rows were inserted outside the application, inspect and correct their history before applying the migration rather than guessing a cancellation reason.
- No public deployment, external TLS setup, load test, or cross-browser certification was performed.

## Verification

`sh scripts/local.sh test:backend`: 10 unit/architecture tests and 16 PostgreSQL integration tests passed; JAR built.

Frontend under the Node release in `.nvmrc`: `npm test` passed 10 tests; `npm run build` passed TypeScript checking and the production build.

`sh scripts/local.sh test:browser`: five existing browser workflows passed against the running native development service. The new backend cases were exercised in the isolated integration-test context; the already-running development backend was not restarted by this review.
