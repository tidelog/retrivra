# Retrivra

Self-hosted document intelligence, semantic retrieval and grounded question answering. Next.js, Auth.js, Prisma, PostgreSQL/pgvector and local Ollama. Documents stay on your infrastructure. No remote AI provider is included.

## What works

- Administrator-provisioned email/password accounts; signed eight-hour sessions.
- Private PDF and UTF-8 TXT uploads, listing, status, download, deletion and retry.
- Durable asynchronous processing with page-aware PDF extraction, overlapping chunks, three attempts and crash recovery.
- Local embeddings, exact cosine retrieval with tenant/model/dimension isolation, and traceable source passages.
- Local generated answers with validated source IDs; explicit insufficient-evidence responses.
- Responsive dashboard with loading, error and empty states.

Implementation is complete at the application level; live PostgreSQL/Ollama and full authenticated end-to-end validation remain required. See [verification record](docs/implementation-progress.md).

## Self-host with Compose

Requires Docker Compose on your own machine, several GiB of free model storage and RAM appropriate to your models (start with 8 GiB; CPU generation can be slow). These commands are for the operator; no deployment was performed during implementation.

```sh
npm run db:setup
# Existing .env is preserved. If it predates authentication, add a random AUTH_SECRET:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Put the generated value in .env; use at least 32 random bytes.
docker compose up -d --build
# Explicitly download the local models (internet required for public model weights):
docker compose exec ollama ollama pull nomic-embed-text
docker compose exec ollama ollama pull qwen2.5:3b
# Provision an account; password is entered without shell history exposure:
read -r -p 'Email: ' USER_EMAIL
read -r -s -p 'Password (12+ characters): ' USER_PASSWORD
export USER_EMAIL USER_PASSWORD
docker compose run --rm -e USER_EMAIL -e USER_PASSWORD app npm run user:create
unset USER_EMAIL USER_PASSWORD
```

Open `http://localhost:3000`. Set `AUTH_URL` to the exact browser origin. The database and app ports bind to loopback; Ollama has no published port. Place public installations behind an HTTPS reverse proxy, keep the app port private, and preserve the public Host/forwarded protocol headers. `AUTH_TRUST_HOST` assumes that trusted proxy arrangement. Never expose PostgreSQL or Ollama publicly.

Compose runs migrations before app/worker startup and persists database, documents and model weights in named volumes. The worker processes queued uploads when models become available. Failed documents can be retried from the dashboard. An interrupted deletion is resumed by the worker. Back up database and document volumes together. Do not use `down -v` on data you need.

Compose database traffic uses its isolated internal network and explicitly opts out of database TLS via `DATABASE_TLS_INTERNAL=true`, accepted only for hostname `database`. External production PostgreSQL requires `sslmode=verify-full` and a trusted CA. Use URL-safe database credentials (the setup script generates hexadecimal passwords). The Ollama image uses `latest`; pin an operator-verified digest for repeatable production deployments. Application dependencies are locked.

## Local development

Node 24 LTS, npm, PostgreSQL 17 with pgvector, and local Ollama are required for the full workflow.

```sh
npm ci --ignore-scripts
npm run db:setup
npm run db:up
npm run db:deploy
npm run db:generate
# Provision a user with USER_EMAIL and USER_PASSWORD in the environment:
npm run user:create
npm run dev
# In another terminal, from the repository:
npm run worker
```

`db:up` starts only the Compose database. For a native Ollama service set `OLLAMA_URL=http://127.0.0.1:11434` and pull the models explicitly. Existing `.env` files with `AI_PROVIDER=disabled` must be changed to `ollama` to enable local inference. `.env.example` documents all settings; no working secrets are included.

## Configuration and limits

| Variable | Default / purpose |
| --- | --- |
| DATABASE_URL | Required PostgreSQL credentials; never expose to the browser |
| AUTH_SECRET | Required random session encryption/signing secret |
| AUTH_URL | Exact browser origin, including scheme and port |
| STORAGE_ROOT | `./var/storage`; absolute in production, outside public assets |
| AI_PROVIDER | `ollama`; `disabled` makes inference unavailable |
| OLLAMA_URL | `http://127.0.0.1:11434`; only loopback or Compose `ollama` accepted |
| EMBEDDING_MODEL | `nomic-embed-text` |
| EMBEDDING_DIMENSIONS | `768`; must match the model output, 1–4096 |
| GENERATION_MODEL | `qwen2.5:3b` |
| CHUNK_SIZE / CHUNK_OVERLAP | 1400 / 200 characters; size 200–8000, overlap smaller than size |

Maximum upload: 10 MiB. Maximum extracted chunks: 500/document. Library cap: 200 documents/account (best-effort under concurrent uploads). Upload throttle: 20/hour/account; search: 30/minute/account; login: 20 attempts/15 minutes/email. Limits are stored in PostgreSQL. Deploy an edge rate limiter for distributed password guessing and connection-level denial of service protection.

PDF extraction runs in a child process with a 60-second timeout, 256 MiB JavaScript heap and bounded output. This is resource limiting, not an OS security sandbox. The worker has a 15-minute lease and bounded model calls. PDFs must contain selectable text; OCR, encrypted PDF passwords, tables/layout reconstruction, malware scanning and handwriting are not implemented. Store only documents you trust to process on your machine.

Retrieval uses exact cosine distance, a 0.35 threshold and up to six passages. There is no ANN index; this avoids invalid indexes over mixed dimensions and guarantees the tenant/model filters apply before distance evaluation. Start with small libraries (roughly 10,000 chunks per tenant) and measure latency before expanding. Changing model names/dimensions excludes old embeddings; delete/re-upload affected documents to reprocess. Do not silently replace model weights under the same name. Changing chunk settings affects future jobs only.

Citations validate membership in retrieved evidence, not semantic truth of the generated claim. Check passages against the original source. Documents can contain prompt injection; model output never runs tools or code, but answers can still be misleading. Signed sessions cannot be individually revoked before their eight-hour expiry; rotating AUTH_SECRET invalidates all sessions. There is no MFA, password reset UI, or public registration. Provisioning is an operator command.

## Validation

```sh
npm run db:validate
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:db
npm audit --omit=dev
npm audit
```

`test:db` requires `TEST_DATABASE_ADMIN_URL` pointing to a **local** `postgres` maintenance database with CREATEDB permission. It creates a disposable randomly named database, applies real migrations, checks constraints/cascades and tests actual retrieval ranking/isolation with synthetic vectors. It drops only the database it created. Embedding HTTP is stubbed in this database test; this does not validate Ollama. Never point it at a shared server. HTTP tests cover the built app, public pages and anonymous access. Browser rendering tests need Chromium system libraries. An opt-in authenticated upload-to-answer/cross-user test is available with RUN_FULL_E2E=true; it requires a disposable local database named retrivra_e2e_*, matching app/worker configuration and both Ollama models. This full flow remains unverified here.

See [architecture](docs/architecture.md), [database operations](docs/database.md), and [implementation progress](docs/implementation-progress.md). Historical milestone documents describe the earlier foundation, not the current feature set.
