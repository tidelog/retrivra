# Milestone 001.2 engineering report

Corrections implemented; milestone acceptance remains incomplete. Docker socket and
local TCP access are denied, browser server binding is denied, and the online npm
audit endpoint fails DNS. No commit, push, deployment or volume deletion occurred.
The existing architecture, schema and initial migration are preserved.

## A. Root cause analysis

1. Compose intentionally requires POSTGRES_DB/USER/PASSWORD but no local `.env`
   existed. `.env.example` is not automatically loaded as `.env`. Setup depended on
   manually copying and editing matching credentials.
2. The test passed undefined DATABASE_URL to pg.Client. pg then used implicit
   PostgreSQL defaults, including the OS username as the database name. It also
   targeted the application database instead of provisioning isolated resources.
3. Prisma 7.10.0 brings mysql2 3.15.3 and @prisma/config 7.10.0 brings deepmerge-ts
   7.1.5. Prisma is a direct development dependency but is also a peer of the direct
   runtime @prisma/client, so the CLI chain can appear in a production-only tree.
   The prior four-high report is supplied evidence; its exact current npm advisory
   count cannot be reproduced while the audit endpoint is unreachable. Four npm
   findings need not mean four independent vulnerabilities: parent packages can
   inherit vulnerability findings.

## B. Implemented corrections

- Added `npm run db:setup`: exclusive creation, random 256-bit hex password, mode
  0600, consistent Compose/Prisma URLs, no credential logging or existing overwrite.
- Created absent ignored `.env`; checked permissions and ignore status, and reran
  setup to confirm the existing-file path. No existing credentials were overwritten.
- Required TEST_DATABASE_ADMIN_URL; reject missing credentials/host/port/database,
  remote hosts, non-maintenance databases, URL options and production NODE_ENV.
- Each integration run creates a random database from template0, applies committed
  migrations through Prisma, verifies database identity, vector and migration history,
  and drops only the exact successfully created resource. No shared application
  database writes, wildcard drops, database resets or volume deletions.
- Added real SQL checks for all model uniqueness keys, account/session/document
  foreign keys, chunk/job/embedding ownership, vector round-trip/null/dimension
  rejection, nonnegative/positive checks, document and account/session cascades.
- Added 11 unit cases for test-target safeguards; total unit coverage is 29 tests.
- Scoped mysql2 override to Prisma, version 3.24.6; regenerated lockfile through npm
  and verified a fresh offline npm ci. No node_modules hand edits or global installs.
- CI retains pgvector Compose and application migration checks, uses the same isolated
  database test, and adds separate production/full security audit checks. No secrets
  or AI services are required. GitHub execution is not verified.
- Updated setup/environment instructions and added docs/database.md.

## C. Files created or modified in this correction

Modified existing Milestone 001 work:

- `.env.example`
- `.github/workflows/ci.yml`
- `README.md`
- `package.json`
- `package-lock.json`
- `tests/database.test.mjs`

Created:

- `scripts/setup-env.mjs`
- `tests/database-target.mjs`
- `tests/unit/database-target.test.ts`
- `docs/database.md`
- `docs/milestone-001.2.md`
- `.env` (local ignored artifact, mode 0600; never include in a commit)

Generated/ignored artifacts: Prisma Client, Next build/type output, TypeScript cache,
Playwright result metadata and repository-local npm cache. Existing .gitignore and
all other Milestone 001 files were preserved. Most foundation files were already
untracked at the start; Git status alone cannot distinguish these from new work.

## D. Database verification

Configured image: pgvector/pgvector:0.8.7-pg17. Actual PostgreSQL version and installed
pgvector version: NOT VERIFIED. Compose interpolation: PASS. Service readiness:
NOT VERIFIED, Docker socket permission denied. Migration execution and all real SQL
assertions: NOT VERIFIED, connection EPERM 127.0.0.1:5432 before resource creation.
No test database was created or dropped during this run. No existing database or
volume was modified. Schema validation passes; that does not prove migration execution.

Isolation safeguards are implemented and target validation is unit-tested. Loopback
restrictions cannot detect an operator forwarding a local port to production; use
only the documented local Compose service. Interrupted processes can leave uniquely
named test databases; no unknown-resource cleanup is automated. Milestone 002 must
supply authentication, session security, authenticated ownership checks on every
operation, cross-user authorization tests and least-privileged runtime roles. Foreign
keys do not enforce authenticated isolation. No RLS is implemented.

## E. Dependency security

Independently inspected upstream advisories:

- [deepmerge-ts stack exhaustion, GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx):
  HIGH, versions below 8.0.0 affected. Installed 7.1.5 remains affected through
  @prisma/config 7.10.0. Local Prisma configuration is trusted and static; no request
  input is passed into config merges. This reduces exposure but does not clear the
  advisory. No arbitrary major-version override was introduced.
- [mysql2 authentication downgrade, GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr):
  HIGH, fixed in 3.22.0. Installed 3.15.3 was affected; changed to 3.24.6.
- [mysql2 decompression DoS, GHSA-rgwj-5xj2-c3m3](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3):
  MODERATE, fixed in 3.23.1; also covered by 3.24.6. This moderate advisory is separate
  from the supplied report's four high package findings. Application uses PostgreSQL,
  not MySQL; Prisma carries the unused MySQL driver transitively.

[Prisma 7.10.1 exists upstream](https://github.com/prisma/orm/releases/tag/7.10.1).
Cached @prisma/config 7.10.1 metadata explicitly selects deepmerge-ts 8.0.2. However,
Prisma 7.10.1 metadata requests here return E404 and its tarball is not cached; the
registry audit endpoint fails ENOTFOUND. A coordinated CLI/client/adapter patch
upgrade could not be installed and verified. All three remain aligned at 7.10.0.
Do not claim the Prisma advisory resolved. Next action in a registry-enabled
environment: install matching compatible patched Prisma CLI, Client and adapter;
remove the scoped mysql2 override if upstream already supplies a fixed driver;
regenerate, validate, build and run migrations/integration before approval.

The only selected dependency version change is mysql2 3.15.3 → 3.24.6, a same-major
minor update (the fixed releases are beyond the old minor). npm also updated its
transitive lock entries. Fresh offline lockfile installation succeeds.

Production audit: NOT VERIFIED, command exits 1 (ENOTFOUND).
Full audit: NOT VERIFIED, command exits 1 (ENOTFOUND). Remaining vulnerability count
is unknown, with the deepmerge-ts HIGH known to remain. Offline install/audit output
claiming zero vulnerabilities is not a current audit. ESLint 9.39.5 is still marked
unsupported by npm; development dependency security is not established.

## F. Executed checks

Node v24.5.0, npm 11.5.1. For Prisma commands, used the existing repository-local
engine via `PRISMA_SCHEMA_ENGINE_BINARY="$PWD/.cache/schema-engine"`; no sandbox
bypass. Build also used NEXT_TELEMETRY_DISABLED=1.

| Command | Actual result |
| --- | --- |
| `node scripts/setup-env.mjs` (twice) | PASS: create absent file; preserve existing file |
| `stat -f '%Lp %N' .env`; `git check-ignore .env` | PASS: 600; ignored |
| `npm install --offline --ignore-scripts --cache .cache/npm` | PASS: updated override and lockfile |
| `npm ci --offline --ignore-scripts --cache .cache/npm` | PASS: reproducible fresh install, 658 packages |
| `npm run typecheck` (engine override) | PASS: generated client and Next types; tsc |
| `npm run lint` | PASS |
| `npm test` | PASS: 29 tests, 4 files |
| `npm run db:validate` (engine override) | PASS |
| `npm run build` (engine override, telemetry disabled) | PASS: webpack production build |
| `docker compose config --quiet` | PASS after setup |
| `docker info --format '{{.ServerVersion}}'` | FAIL: Docker socket permission denied |
| `npm run db:up` | FAIL: Docker socket permission denied |
| `node --test tests/database.test.mjs` (engine override) | FAIL: EPERM connecting to loopback; SQL assertions not executed |
| `node --check tests/database.test.mjs` | PASS: syntax |
| `npm run test:e2e` | FAIL: EPERM binding server to 127.0.0.1:3000; browser assertions not executed |
| `npm audit --omit=dev --audit-level=high --fetch-retries=0 --fetch-timeout=10000` | FAIL: ENOTFOUND, no audit verdict |
| `npm audit --audit-level=high --fetch-retries=0 --fetch-timeout=10000` | FAIL: ENOTFOUND, no audit verdict |
| `npm audit --json` (before update) | FAIL: ENOTFOUND, no advisory JSON available |
| `npm ls prisma @prisma/client @prisma/adapter-pg deepmerge-ts mysql2` | PASS: aligned Prisma 7.10.0, mysql2 3.24.6 overridden, deepmerge-ts 7.1.5 |
| `git diff --check`; `git diff`; `git status --short` | PASS: review and whitespace checks; expected files |
| Git-visible sensitive filename screening | PASS: no private environment/key filenames visible |

Prisma migration CLI is invoked by the isolated integration test only after its
CREATE DATABASE succeeds. It did not execute here; no direct application migration
was attempted against an unverified existing server.

## G. Acceptance criteria

| # | Criterion | Status |
| --- | --- | --- |
| 1 | Existing implementation preserved | PASS |
| 2 | Compose configuration validates | PASS |
| 3 | Reproducible local configuration | PASS |
| 4 | No real credentials committed | PASS |
| 5 | Explicit PostgreSQL configuration | PASS |
| 6 | Tests cannot silently select unrelated application data | PASS |
| 7 | Isolated test setup implemented | PASS |
| 8 | PostgreSQL integration tests pass | NOT VERIFIED |
| 9 | Live pgvector availability verified | NOT VERIFIED |
| 10 | Migrations execute successfully | NOT VERIFIED |
| 11 | Ownership constraints verified on PostgreSQL | NOT VERIFIED |
| 12 | Cascades verified on PostgreSQL | NOT VERIFIED |
| 13 | TypeScript | PASS |
| 14 | ESLint | PASS |
| 15 | Vitest | PASS |
| 16 | Production build | PASS |
| 17 | Playwright passes | NOT VERIFIED |
| 18 | Advisories resolved or documented | PASS: unresolved HIGH documented |
| 19 | Production dependency audit passes | NOT VERIFIED |
| 20 | Meaningful CI checks configured | PASS: workflow execution pending |
| 21 | Documentation matches workflow | PASS |
| 22 | No unexpected modified files | PASS |
| 23 | No commit created | PASS |
| 24 | No push | PASS |
| 25 | No paid infrastructure | PASS |

## H. Git status

Initial state: tracked modifications .gitignore/README.md and untracked foundation
implementation. Preserved these changes. Correction files above are expected; no
unexpected files found. No staging, commit or push. HEAD remains 7b891b9
(chore: initialize project repository). .env remains ignored.

## I. Known risks

Outstanding HIGH deepmerge-ts advisory; unknown full online audit result; unsupported
ESLint 9. Live migrations, constraints, extension availability, service readiness and
browser assertions remain blocked. CI is configured but has not run. Docker image is
version pinned, not digest pinned. Development Compose uses a superuser and is not
production infrastructure. Relational ownership integrity is not authorization.

## J. Recommended commit message (not executed)

`fix: isolate database verification and harden local setup and Prisma dependencies`

## K. Next milestone

Milestone 002: AUTHENTICATION AND SECURE USER ISOLATION is architecturally prepared,
but Milestone 001.2 is not ready for approval. First run the documented database/browser
checks with permitted local networking and Docker access, install and verify the
compatible Prisma patch, and obtain successful production/full online audit results.
