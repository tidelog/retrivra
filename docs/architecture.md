# Architecture

Retrivra is a modular monolith with two processes: Next.js handles authenticated HTTP/UI requests; a Node worker claims durable PostgreSQL jobs. No queue broker, paid service or remote AI provider is required.

## Request and trust boundaries

Auth.js credentials use scrypt with random salts and constant-time comparison. Only administrators create accounts. Auth.js provides CSRF protection on authentication; document and search mutations also require an exact same Origin. All data endpoints derive ownerId from the signed session, never from user-supplied identity. API errors redact infrastructure details. Password attempts and authenticated inference/upload requests are rate limited through atomic PostgreSQL upserts.

Documents, chunks, jobs and embeddings use composite tenant foreign keys. Retrieval additionally filters all joined tables by owner and READY status, materializes compatible model/dimension candidates, and performs exact cosine ranking over that set. Tagged SQL parameterizes vectors and identities. No row-level security is configured: database credentials are trusted server credentials and must remain private.

## Storage and lifecycle

Uploads are streamed with a hard body cap before multipart parsing. PDF MIME/extension/signature and UTF-8 TXT content are checked; PDF structure is validated later by extraction. Random UUID storage keys prevent path traversal; bytes are outside public assets, written exclusively with 0600 permissions inside a 0700 directory. Original filenames are presentation metadata and never paths. Downloads require ownership and use attachment disposition.

Metadata and initial job are created together. Filesystem and PostgreSQL cannot share a transaction: immediate metadata errors remove bytes, but a process crash between storing bytes and metadata may leave orphan files. Offline reconciliation against storageKey is an operator responsibility; do not delete files while uploads are running. Deletion first marks DELETING so sources stop appearing in search, removes bytes idempotently, and deletes metadata with cascades. The worker resumes interrupted deletion.

## Processing

Jobs use FOR UPDATE SKIP LOCKED claims, 15-minute leases and three attempts. Expired claims can be reclaimed; final expired attempts become FAILED. Local inference errors use delayed retries. Manual retry resets failed jobs. PDF extraction has a separate bounded child process; TXT decoding and configurable overlapping character chunking run in the worker. PDFs retain page numbers; TXT passages use ordinals.

Embeddings are generated in batches of eight through local Ollama. Publication locks the document and conditionally completes the current lease before replacing chunks and writing vectors in a single transaction. Deleting documents or stale workers cannot publish READY data. A crash before commit leaves no partial READY document. The worker can run alongside additional workers; database claiming and publication provide coordination. This concurrency behavior still requires live database validation.

## Models and grounding

`EmbeddingProvider` and `AnswerProvider` contracts live in src/modules/ai/contracts.ts. Ollama is the only implementation. The allowlist accepts loopback hosts and the Compose `ollama` service; no cloud credentials are supported. Requests prohibit redirects and time out after 60 seconds. Provider output must match configured dimensionality, be finite and nonzero. Database checks enforce vector_dims=dimensions.

Exact search returns six passages at cosine similarity >=0.35, including immutable document IDs, current chunk IDs, filename, page/ordinal and score. Chunk IDs are replaced on successful reprocessing; old answer links are not durable across deletion/reprocessing. There is no conversation history or saved-answer store.

Question answering sends retrieved evidence as explicitly untrusted data to local generation. The model must return JSON and exact evidence IDs; unknown or absent IDs produce insufficient evidence. With no retrieved evidence generation is skipped. The UI renders plain React text, source snippets separately, and source membership links. Citation membership does not prove factual support; hallucination and prompt injection remain model limitations.

## Deployment and quality

Compose defines database, one-shot migration, app, worker and local Ollama with private persistent volumes. Model weights are explicitly pulled by the operator. TLS for public access belongs at the reverse proxy; external production PostgreSQL requires verify-full. The narrowly scoped internal database exception is explicit. There is no GPU requirement or GPU device mount by default.

CI validates Prisma, migrations/constraints/real SQL retrieval, types, lint, unit tests, production build, browser anonymous-access checks and dependency audits. PostgreSQL and Ollama runtime checks blocked in this development container are documented in implementation-progress.md. Readiness currently verifies configuration, vector and ORM tables; it does not verify Ollama health or available models.
