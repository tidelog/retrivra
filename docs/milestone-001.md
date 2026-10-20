# Milestone 001 engineering report

Implementation is present and production compilation passes. Live browser rendering,
database migration execution and database integrity remain unverified because this
sandbox prohibits local networking and Docker daemon access. This milestone should
not be signed off as fully verified until those checks pass in an unrestricted local
development environment or CI. No commit, push, deployment or external AI call occurred.

## Implementation and architecture

Next.js App Router, React, strict TypeScript, Tailwind, accessible responsive shell,
loading/error boundaries, separate liveness/readiness endpoints, Zod server environment
validation, server-only Prisma client, pgvector Compose development database,
versioned SQL migration, AI provider contracts, unit/browser/database tests and CI.

Architecture is a modular monolith. Actual modules contain configuration, database,
health and AI contracts. Future authentication, documents, storage, processing,
retrieval and answers boundaries are documented without empty implementations.
Processing will use a separate Node worker with PostgreSQL claims, bounded retries,
leases and idempotency, rather than synchronous request parsing.

## Dependency versions

Next.js 16.4.2; React/React DOM 19.3.0; TypeScript 5.9.3; Tailwind/PostCSS integration
4.3.3; Prisma client/CLI/pg adapter 7.10.0; pg 8.23.1; Zod 4.6.7; Vitest 5.0.5;
Vite 7.3.7; Playwright 1.64.1; ESLint 9.39.5; eslint-config-next 16.4.2.
Exact direct versions and all resolved dependencies are retained in package-lock.json.
Node used for verification: 24.5.0; npm 11.5.1. .nvmrc selects Node 24.
Vite is explicitly pinned within Vitest's supported peer range for reproducibility.

Registry DNS failed (ENOTFOUND). Installation was completed from a repository-local
copy of the existing npm cache. No global npm configuration or packages were changed.
Lifecycle scripts were disabled; Prisma generation was explicitly run.
The offline audit output is not evidence of a current online vulnerability audit.
ESLint 9 is deprecated/unsupported according to npm. Upgrade to ESLint 10 and verify
Next lint integration when registry access is available; its tarball was not cached.

## Database and security

Selected Docker image: pgvector/pgvector:0.8.7-pg17, an upstream documented tag.
PostgreSQL 17 remains the selected database major; pgvector 0.8.7 is version pinned.
The image was not pulled or started. A named volume persists data and port 5432 binds
only to 127.0.0.1. No production credentials exist in configuration.

Prisma uses the official pg driver adapter and Unsupported("vector"). Initial SQL
enables vector and applies generated tables, indexes and foreign keys plus controlled
SQL checks for dimensions, sizes, ordinals, page numbers and attempts.
Users, accounts, hashed sessions, documents, jobs, chunks and embeddings are modeled.
Composite ownership foreign keys reject mismatched derived owners; cascades remove
relational derivatives. Filesystem deletion remains a future coordinated workflow.

Environment files/private storage/secrets/build products/dependencies are ignored.
Server configuration is not exposed to client bundles. Validation errors contain
variable names only. Health failures return generic uncached 503 responses.
Production config requires verified database TLS, non-example credentials and
absolute private storage. There are no document access or authentication endpoints.
Authorization and production operations are still future work.

## Executed checks

Unless noted, commands below exited zero. In this sandbox Prisma commands required
PRISMA_SCHEMA_ENGINE_BINARY="$PWD/.cache/schema-engine", a copy of the pre-existing
cached engine placed inside the repository. The default Prisma command initially
failed EPERM while touching its external cache; no sandbox escalation was requested.

| Command/check | Result |
| --- | --- |
| pwd; git status; git branch; git remote -v; git log | PASS: expected repository, clean initial main, one initialization commit |
| npm install --ignore-scripts --prefer-offline --fetch-retries=0 --fetch-timeout=15000 | FAIL: registry DNS ENOTFOUND |
| npm install --offline --ignore-scripts --cache .cache/npm | PASS after selecting compatible cached packages |
| npm ci --offline --ignore-scripts --cache .cache/npm | PASS: lockfile reinstall, 660 packages |
| npm run db:validate (engine override) | PASS: Prisma schema valid |
| npm run db:generate (engine override) | PASS |
| prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script | PASS: generated base migration; vector extension and SQL invariants added under version control |
| npm run typecheck (engine override) | PASS: includes Next route type generation |
| npm run lint | PASS: zero errors or warnings |
| npm test | PASS: 18 tests across three files |
| initial Turbopack production build | FAIL: CSS processing tried to bind a prohibited IPC port |
| npm run build (engine override, telemetry disabled) | PASS: supported webpack build; routes compiled and static shell prerendered |
| generated HTML assertions | PASS: semantic main, shell heading and accurate capability status present |
| docker compose --env-file .env.example config --quiet | PASS |
| docker info; docker image ls | FAIL: Docker socket access denied |
| npm run db:deploy (synthetic DATABASE_URL, engine override) | FAIL: P1001 database unreachable |
| npm run test:db (synthetic DATABASE_URL) | FAIL: sandbox EPERM connecting to localhost:5432; test assertions did not execute |
| npm run start | FAIL: sandbox EPERM binding localhost:3000 |
| npm run test:e2e | FAIL: web server could not bind localhost:3000; browser assertions did not execute |
| git diff --check and final status/history inspection | PASS: expected changes only; initialization commit unchanged |

Initial unit testing caught an invalid-URL exception escaping sanitized environment
validation. This was fixed and all tests passed afterward. Initial Vitest dependency
resolution selected a newer Vite whose native binding was unavailable offline; pinning
compatible Vite 7.3.7 resolved the issue without weakening tests.

GitHub Actions is configured for install, schema validation, Compose, migration
deployment/status, database integrity, types, lint, unit tests, build and Chromium
smoke testing. The workflow itself has not run on GitHub. No publishing workflow exists.

## Acceptance criteria

| # | Criterion | Status |
| --- | --- | --- |
| 1 | Existing history preserved | PASS |
| 2 | Next.js application structure | PASS |
| 3 | Strict TypeScript | PASS |
| 4 | Tailwind configured | PASS |
| 5 | Application shell renders successfully in a browser | NOT VERIFIED: static prerender passed; live browser blocked |
| 6 | Health endpoint | PASS |
| 7 | PostgreSQL Docker configuration | PASS |
| 8 | pgvector development setup defined | PASS |
| 9 | Prisma schema and migration strategy | PASS |
| 10 | Environment validation | PASS |
| 11 | Sensitive files ignored | PASS |
| 12 | Module boundaries clear | PASS |
| 13 | AI provider interfaces | PASS |
| 14 | Vitest and meaningful tests | PASS |
| 15 | Playwright smoke configured | PASS |
| 16 | GitHub Actions CI exists | PASS |
| 17 | Local development instructions | PASS |
| 18 | Type checking passes | PASS |
| 19 | Linting passes | PASS |
| 20 | Unit tests pass | PASS |
| 21 | Production build succeeds | PASS |
| 22 | No unrelated modifications | PASS |
| 23 | No commit or push | PASS |
| 24 | No paid infrastructure | PASS |
| 25 | Limitations explicitly documented | PASS |

## Git status and file inventory

Branch: main. Existing tracked modifications: .gitignore and README.md.
All following created files remain untracked. No unexpected changes were found.
Ignored local artifacts include node_modules, .next, .cache, generated Prisma client,
TypeScript incremental data and Playwright test results.

- .env.example
- .github/workflows/ci.yml
- .nvmrc
- compose.yaml
- docs/architecture.md
- docs/milestone-001.md
- eslint.config.mjs
- next-env.d.ts
- next.config.ts
- package-lock.json
- package.json
- playwright.config.ts
- postcss.config.mjs
- prisma.config.ts
- prisma/migrations/20261018000100_foundation/migration.sql
- prisma/migrations/migration_lock.toml
- prisma/schema.prisma
- src/app/api/health/ready/route.ts
- src/app/api/health/route.ts
- src/app/error.tsx
- src/app/globals.css
- src/app/layout.tsx
- src/app/loading.tsx
- src/app/page.tsx
- src/config/env.ts
- src/config/server.ts
- src/modules/ai/contracts.ts
- src/server/database/client.ts
- src/server/health/status.ts
- tests/database.test.mjs
- tests/e2e/shell.spec.ts
- tests/unit/env.test.ts
- tests/unit/health-routes.test.ts
- tests/unit/health.test.ts
- tsconfig.json
- vitest.config.ts

## Limitations and next milestone

Deliberately deferred: authentication, authorization/RLS, uploads/private storage
implementation, extraction, worker execution and retries, local AI adapters, search,
answers, citation verification and coordinated file deletion. The shell states this
clearly and no mock retrieval/answering behavior exists.

Verification blockers: local network binding/connect permission, Docker socket access,
registry DNS and unavailable ESLint 10 cache. Database migration execution, database
integrity and live browser rendering must pass before milestone sign-off.
Docker tags pin pgvector and PostgreSQL major but not an immutable image digest.

Recommended commit message (not executed):
feat: establish Retrivra application architecture and development foundation

Milestone 002 preparation: first run CI and resolve any database/browser issues;
upgrade deprecated lint tooling; select an established authentication strategy;
implement hashed session lifecycle and secure cookies; enforce authenticated owner
scope for all database operations; test cross-user isolation and cascade behavior;
use a least-privileged runtime database role distinct from the migration role.
