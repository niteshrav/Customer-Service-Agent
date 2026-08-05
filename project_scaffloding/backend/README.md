# Backend — PostgreSQL (TDD)

## What was built (TDD)

1. **Tests first** (`tests/db/schema.test.cjs`): define the database contract (tables, columns, inserts, FK and CHECK constraints).
2. **Migration** (`migrations/001_initial.sql`): minimal schema to satisfy those tests.

## Tables

| Table | Purpose |
|-------|---------|
| `customers` | CRM-like customer/account records |
| `inquiries` | Customer inquiries linked to `customers.customer_id` |
| `inquiry_messages` | Agent (or future bot) messages; `body` must be non-empty |
| `rag_document_chunks` | RAG: text chunks + JSON embeddings + `visible_roles` for retrieval |
| `chat_conversations` / `chat_messages` | Chatbot history + `meta_json` (usage, citations, flags) |

## Prerequisites

- Node.js **18+**
- **PostgreSQL server binaries** (Homebrew): `brew install postgresql@16` — provides `initdb`, `pg_ctl`, etc.

### Quick start (no Docker)

From `backend/`:

```bash
npm install
npm run db:up
```

This starts a **dedicated** cluster in `backend/pgdata` on port **5434** (your system Postgres on 5432 is untouched), user `csa`, then applies migrations.

- **Stop:** `npm run db:stop-local`
- **Start again later:** `npm run db:start-local` (data persists in `pgdata/`)

`backend/.env` points at `127.0.0.1:5434` (local dev only).

## HTTP API (Node.js + Express, TDD)

- **Run server:** `npm start` (default `PORT=3101` — avoids clashes with apps on 3000/3001). This process is **API-only**: opening `http://127.0.0.1:3101/` shows a short HTML hint; the React UI runs separately (`npm run dev` in `frontend/`, usually **http://localhost:5173**). Optional `PUBLIC_WEB_APP_URL` in `.env` customizes that link.
- **Demo login users:** after DB is migrated, run `npm run db:seed-demo` (idempotent).
  - Agent: `demo@csa.local` / `Demo1!csa`
  - Customer: `demo-customer@csa.local` / `Demo1!csa`
  - Management: `demo-management@csa.local` / `Demo1!csa`
  - (overridable via `DEMO_USER_*`, `DEMO_CUSTOMER_*`, `DEMO_MANAGEMENT_*` in `.env`)
- **Tests:** `npm test` runs **DB schema** (`tests/db/`), **seed** (`tests/seed/`), **auth** (`tests/auth/`), **API** (`tests/api/`), and **chat/RAG units** (`tests/chat/`) with **Supertest** against `createApp(pool)` (no listen).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness |
| GET | `/api/metrics/inquiries` | Dashboard inquiry counts from DB (scoped by role: org / agent bucket / customer) |
| GET | `/api/inquiries` | List inquiries |
| GET | `/api/inquiries/:inquiryId` | Inquiry + messages |
| POST | `/api/inquiries` | Customer creates new inquiry (`{ "body": "..." }`) |
| POST | `/api/inquiries/:inquiryId/messages` | Append message (`{ "body": "..." }`) |
| POST | `/api/inquiries/:inquiryId/approve` | Customer approves addressed inquiry (closes it as `resolved`) |
| GET | `/api/inquiries/:inquiryId/crm` | Customer row for inquiry |
| POST | `/api/chat` | Chatbot (context-aware; uses role + page context) |
| GET | `/api/chat/metrics` | Optional aggregate chat/RAG counters + latency (requires `CHAT_METRICS_TOKEN`) |

Implementation: `src/app.cjs` (`createApp`), `src/server.cjs`, `src/db/pool.cjs`.

Chatbot setup:
- Set `OPENAI_API_KEY` in `backend/.env` (required for real LLM replies and embeddings).
- **CSA Assistant** persona in `promptBuilder.cjs`: the model introduces itself, explains scope, and answers **non-technical** product questions (what the app is for, high-level features, dashboard, password *policy* wording, Sign in / Register). Routing uses `allowsNonTechnicalAppGuidance()` in `chatDomainGate.cjs` (persona + `isGeneralProductOnboardingQuestion`). True off-topic trivia and technical auth/API questions stay guardrailed. In **RAG** mode, empty retrieval still calls the model when that guidance layer matches; other empty-RAG questions keep the safe “no matching documentation” fallback.

**RAG (Sprint 2):**
- After `npm run db:migrate`, load the markdown corpus into Postgres: `npm run rag:ingest` (uses `text-embedding-3-small` and replaces rows for `RAG_CORPUS_VERSION`, default `v1`).
- Corpus files live in `rag/corpus/*.md`. Optional HTML comment at the top: `<!-- rag-meta: {"visible_roles":["agent","lead","admin"],...} -->` to restrict chunks by role; otherwise all standard roles can retrieve the chunk.
- `POST /api/chat` with `"mode":"rag"` returns `citations` (array of `{ source_id, title, section }`) when retrieval runs; empty retrieval returns a short fallback without calling the LLM.

**Cost / cache (Sprint 3):**
- Optional env vars (see `backend/.env.example`): response/embed/retrieval cache TTLs, `CHAT_CACHE_MAX_ENTRIES`, `CHAT_MAX_HISTORY_MESSAGES`, `CHAT_HISTORY_PRIOR_SUMMARY_MAX_CHARS`, `CHAT_MAX_COMPLETION_TOKENS`, per-identity daily cap `CHAT_DAILY_TOKEN_BUDGET_PER_KEY`, and `CHAT_METRICS_TOKEN` for the metrics route.
- Chat turns are stored in Postgres (`chat_conversations`, `chat_messages`); assistant rows persist `usage` / `citations` in `meta_json`. Long threads roll older turns into one truncated “earlier conversation” line before calling the model.
- After a successful model call, `POST /api/chat` may include `usage` (token counts, rough `estimated_cost_usd`, `response_cache_hit`). When the daily token budget is exceeded, the reply explains the limit and `budget_blocked` is true.
- With `CHAT_METRICS_TOKEN` set, call `GET /api/chat/metrics` with header `X-Chat-Metrics-Token` (or query `token`) matching that value. Metrics include `mode_llm_total`, `mode_rag_total`, and end-to-end `request_latency_ms_*` fields per request.

**Production hardening (Sprint 4):**
- Optional **`REDIS_URL`**: shared response + RAG embed/retrieval caches (falls back to in-memory if unset or unreachable).
- **LLM resilience**: exponential backoff retries on transient errors, then a **circuit breaker** with a **half-open** probe after `CHAT_CIRCUIT_RESET_MS`: one trial call closes the circuit on success or re-opens on failure (`circuit_half_open_failed` in degraded metadata). Telemetry adds `llm_retries`, `circuit_opens`, `circuit_rejections`.
- **Graceful shutdown**: `npm start` (`src/server.cjs`) handles **SIGTERM** / **SIGINT** by stopping new HTTP connections, calling **`closeDefaultChatBundle()`** (Redis `QUIT` when `REDIS_URL` is set), then **`pool.end()`**.
- **Test seams**: `buildChatBundle(pool, { llmFactory, embedQueryFactory })` and `createApp(pool, { buildChatBundleOptions })` avoid a real `OPENAI_API_KEY` in unit tests; `closeDefaultChatBundle()` clears the lazy singleton between tests that exercise it.
- **Prompt pack version**: set `CHAT_PROMPT_VERSION` (default `v1`); the value is appended to the system prompt for traceability when rolling out prompt changes.
- **Quality / load tests**: golden scenarios live in `tests/fixtures/chat-golden.json`; a sequential burst load smoke test lives in `tests/api/chat-load.test.cjs`. With `REDIS_URL` set, `tests/chat/chatAsyncCache.test.cjs` runs an extra Redis round-trip (otherwise skipped).

**Operations dashboard (Sprint 5, US-5):**
- **`GET /api/metrics/inquiries`** (auth required) returns database-backed counts: `total`, `open`, `resolved`, `open_unassigned` (lead/admin only; others get `0`), `awaiting_customer_approval` (open + `issue_addressed` + not yet `customer_approved`). **`scope`** is `organization` | `agent_bucket` | `customer` matching how `/api/inquiries` lists rows. The React dashboard loads this in parallel with the inquiry list.

## Setup

```bash
cd project_scaffloding/backend
cp .env.example .env
# Edit .env: set DATABASE_URL to a real Postgres URL (not USER/PASSWORD placeholders)
# Alternatively put .env in backend/config/.env — both locations are loaded.
npm install
npm run db:migrate
npm test
```

See also: **`../docs/postgres-setup-steps.md`** (four setup steps in one place).

If you see **`DATABASE_URL is not set`**, the script did not find a non-empty `DATABASE_URL`. Create **`backend/.env`** (recommended) or **`backend/config/.env`** with:

`DATABASE_URL=postgresql://myuser:mypass@localhost:5432/customer_service_agent`

Or run once without a file:

`DATABASE_URL="postgresql://..." npm run db:migrate`

`db:migrate` applies all `migrations/*.sql` in order. Migrations use `IF NOT EXISTS` so re-running is safe for local dev.

## Run tests

```bash
DATABASE_URL=postgresql://... npm test
```

Tests connect, apply migrations, **truncate `rag_document_chunks` (if present) and `users, customers CASCADE`** between cases, and assert schema + behavior.
