# Local database workflow

Use Node 24 and Docker Compose. From the repository root:

```sh
npm run db:setup
npm ci --ignore-scripts
npm run db:generate
npm run db:validate
docker compose config --quiet
npm run db:up
npm run db:deploy
npm run db:status
npm run test:db
npm run dev
```

The setup script exclusively creates an absent `.env`, with mode 0600 and a random
hexadecimal development password. It generates matching POSTGRES_USER,
POSTGRES_PASSWORD, POSTGRES_DB and host DATABASE_URL values once, plus the explicit
TEST_DATABASE_ADMIN_URL maintenance connection. `.env` is ignored by Git. Never
print it, commit it, or use these development credentials for production.

Manual alternative: copy `.env.example` only if `.env` is absent, restrict it with
`chmod 600 .env`, and replace the password in all three places. URL-encode passwords
when constructing URLs. Do not run `docker compose config` without `--quiet` when
sharing output: resolved configuration contains secrets. Shell environment variables
override Compose's `.env`; avoid stale POSTGRES_* or DATABASE_URL exports.

Compose runs pgvector 0.8.7 on PostgreSQL 17, binds port 5432 to loopback and retains
the existing database_data volume. Prisma runs on the host and connects to that
loopback service. `db:up` waits for pg_isready; migration deployment and readiness
additionally verify the application schema. An unrelated server on port 5432 must
be stopped or moved by its owner; do not change unrelated containers.

For an existing volume, use its existing credentials. Generating a new `.env` does
not reset or rotate credentials stored in PostgreSQL. If authentication fails, recover
the original credentials through the operator; never delete the volume to fix it.
`npm run db:down` stops this project's containers and keeps volumes. Never use
`docker compose down -v`. Review SQL before `db:deploy`; use `db:migrate` only to
author migrations against disposable development data and decline reset prompts.

## Integration test isolation

`npm run test:db` (equivalently `node --test tests/database.test.mjs`) loads `.env`
and requires TEST_DATABASE_ADMIN_URL. It never falls back to DATABASE_URL or pg's
OS-user/database defaults. The URL must explicitly include a loopback host, port,
credentials and `/postgres`, with no query options. Production NODE_ENV is rejected.
Use only the local development/CI PostgreSQL service, never a tunnel to production.
The maintenance role needs CREATEDB and permission to install vector (the local
Compose role is a development superuser). No shared application tables are touched.

Each run creates `retrivra_test_<random UUID>` from template0, runs the actual Prisma
`migrate deploy`, verifies the connected database name, PostgreSQL version, vector
extension and migration history, and exercises SQL constraints with synthetic data.
It checks uniqueness, account/session/document foreign keys, composite ownership for
chunks/jobs/embeddings, vector storage and dimensions, SQL checks and cascades.
Expected constraint failures use savepoints; test writes are rolled back.
Finally it drops only the exact database successfully created by this process.
An existing-name collision fails creation and cannot trigger cleanup of that database.
An interrupted process may leave its isolated test database behind; there is no
wildcard or automatic cleanup of unknown resources. Investigate ownership before
any manual removal. Failure to connect, migrate or clean up fails the test.

CI uses the same pgvector Compose service and test command on an ephemeral runner.
It separately deploys/status-checks the application database, and tests migrations
again in the disposable database. No secrets or external AI keys are required.
Security audits run in a separate job so failures cannot prevent the
verification job from exercising the application.

The suite additionally executes the actual retrieval repository against synthetic vectors,
checking ranking, threshold, model/dimension filtering and tenant isolation. Embedding
HTTP is stubbed; it does not prove live Ollama operation. Unit tests cover credentials
and authenticated owner scopes. Real authenticated API/database integration remains a
separate validation requirement; see implementation-progress.md. RLS is not implemented.

## Current authentication and Compose additions

New setup environments also receive a random AUTH_SECRET and local Ollama defaults.
Existing .env files remain untouched and need these settings added manually. Full
Compose startup includes migration/app/worker/Ollama services; db:up starts only the
database. For production use the README workflow and a least-privileged runtime role.
