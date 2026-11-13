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
