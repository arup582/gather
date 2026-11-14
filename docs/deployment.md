# Deployment

```sh
# Build the Java image; Java compilation happens inside Docker:
docker build -t gather-api:local backend
# Build the Next.js server for Linux and package it as an unprivileged Node process:
docker build --build-arg GATHER_API_HOST=backend -t gather-web:local frontend
```

Docker is optional for the native workflow. Existing Compose database volumes use PostgreSQL 17; do not point PostgreSQL 16 at those files or change their image version in place.

The API image runs as UID 10001 on port 8080; the web image runs unprivileged on port 3000. Put both on a private network with the API reachable as `backend`. Next.js serves application routes and proxies `/api/` on the same public origin. The backend URL is embedded in rewrites at build time, so set `GATHER_API_HOST` before building for the deployment network. Supply production `DB_URL`, `DB_USER`, and `DB_PASSWORD` externally; set **no `dev` profile**. Default session cookies are `Secure`, `HttpOnly`, `SameSite=Lax`, with a 30-minute idle timeout. The `dev` profile alone permits cookies over local HTTP. Keep a production deployment behind HTTPS, with trusted TLS termination in front of Next.js. No production deployment or TLS service is provisioned by this repository.

To provision the first real administrator, first sign up the intended account through the application, then use an authorized database operator's SQL session to promote that exact account:

```sql
-- psql prompts rather than storing a real account email in source:
\prompt 'Existing account email: ' bootstrap_email
UPDATE app_user SET role = 'ADMIN'
WHERE email = lower(trim(:'bootstrap_email')) AND enabled = true
RETURNING id, email, role;
```

Verify exactly one intended account was updated. All later role changes are available in the administrator UI. Existing sessions read current permissions on each request.

The development Compose file is not production configuration. The default application configuration contains no fallback database credentials or seed data. Flyway runs on startup; JPA validates schema and never creates or updates it. Add new numbered SQL migrations rather than altering applied migrations. Back up production data and review migrations before deploying.

For native production mode, run `npm run build`, then `npm start` in `frontend/`. The frontend listens on 3000 and proxies the API on 8080. The build copies static assets into the standalone server. Production HTML uses a per-request CSP nonce for Next.js hydration scripts; pages render dynamically to keep the nonce and response consistent.
