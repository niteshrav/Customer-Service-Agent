---
marp: true
theme: default
paginate: true
header: 'Customer Service Agent — Engineering deep dive'
footer: '60 min · Engineers'
style: |
  section { font-size: 28px; }
  table { font-size: 22px; }
---

# Customer Service Agent

### Engineering deep dive (60 minutes)

**Audience:** Engineers  
**Repo:** `project_scaffloding/` — `frontend/`, `backend/`, `docs/`

**Goal today:** map **requirements → architecture → implementation → tests → ops**, with enough detail to onboard or extend the system.

---

## Session agenda (suggested timing)

| Block | Minutes | Focus |
|-------|---------|--------|
| **1. Context** | 0–10 | Problem, user stories, demo scope |
| **2. System design** | 10–25 | FE/BE boundaries, data model, auth & RBAC |
| **3. Core APIs** | 25–40 | Inquiry lifecycle, CRM, metrics, approval rules |
| **4. Chat & RAG** | 40–52 | Pipeline, guardrails, prompts, failure modes |
| **5. Quality & runbook** | 52–58 | Tests, env, caches, observability |
| **6. Live demo + Q&A** | 58–60+ | Walk the app; buffer spills into discussion |

_Adjust if your group wants more live coding or longer Q&A._

---

## 1. What problem does this solve?

- **Support workflow in one UI:** list work, open a thread, record **CRM-like context**, send responses.
- **Enforced business rule:** moving to **resolved/closed** requires **customer approval** once the issue is **addressed** (see DB constraints + API).
- **Assistant layer:** in-product help for **product + workflow** language; **not** a substitute for reading **API docs / stack** in chat (guardrails).

**Source of truth for PM traceability:** `docs/user-stories.md` (US-1 … US-5).

---

## User stories → engineering surfaces (quick map)

| Story | You’ll see it in code as… |
|-------|---------------------------|
| **US-1** Open inquiry, send messages | `GET/POST /api/inquiries*`, inquiry UI |
| **US-2 / US-3** CRM context | `GET /api/inquiries/:id/crm`, detail page panel |
| **US-4** Resolution + approval | `issue_addressed`, `POST .../approve`, status rules |
| **US-5** Operational metrics | `GET /api/metrics/inquiries`, dashboard cards |

---

## 2. Repository layout (where to look)

```
project_scaffloding/
  frontend/src/          # React pages, AppLayout, ChatbotWidget, api client
  backend/src/
    app.cjs              # Express app factory (Supertest targets this)
    server.cjs           # listen + graceful shutdown
    chat/                # chat service, domain gate, RAG retriever, prompts
  backend/migrations/    # SQL schema
  backend/tests/         # db, api, auth, chat (TDD)
  backend/rag/corpus/    # Markdown corpus for ingest
  docs/                  # user-stories, this deck, architecture notes
```

**Convention:** tests live **next to** or under `tests/`; API behavior is asserted via **`createApp(pool)`** without binding a port.

---

## Runtime topology

```
Vite dev server :5173
  └─ proxy /api → http://127.0.0.1:3101

Express :3101
  ├─ pg pool → PostgreSQL (local often :5434 via npm run db:up)
  ├─ optional Redis (response + RAG cache)
  └─ LangChain / OpenAI (chat + embeddings)
```

**Why split ports:** API-only server; static UI dev experience; production would be CDN + API or combined behind nginx.

---

## Frontend: routing & auth (implementation)

- **Router:** React Router — public vs protected routes (see `ProtectedRoute`, `PublicOnlyRoute`).
- **Session:** JWT stored client-side; API calls attach **`Authorization: Bearer`** where required.
- **Global chat:** `ChatbotWidget` in `AppLayout.jsx` → same assistant on **every page**.
- **Context to backend:** each `POST /api/chat` includes **`pathname`** (e.g. `/dashboard`, `/inquiries/xyz`) → folded into **system + user** prompt as page context.

**Tests:** Vitest + Testing Library — `*.test.jsx` beside components/pages.

---

## Backend: `createApp(pool)` pattern

- **`createApp(pool, options?)`** exports the Express app **without** `listen()`.
- **Tests** pass a **real test pool** (migrations, truncate between cases).
- **Injection seams:** e.g. `chatService`, `buildChatBundleOptions` for mocking LLM / retriever.

This keeps **integration tests** honest while avoiding flaky open ports.

---

## 3. Data model (PostgreSQL) — engineer-relevant bits

| Table | Notes |
|-------|--------|
| **users** | Auth identity + role; links to org/customer semantics as implemented |
| **customers** | CRM-like row; inquiries reference `customer_id` |
| **inquiries** | Status, assignment, **`issue_addressed`**, **`customer_approved`** |
| **inquiry_messages** | Thread; **CHECK** on non-empty `body` |
| **rag_document_chunks** | `body`, **embedding** (jsonb), **visible_roles**, corpus version |
| **chat_conversations / chat_messages** | Thread id; **`meta_json`** for usage, citations, flags |

**Schema contract:** driven by TDD in `backend/tests/db/schema.test.cjs` + `migrations/`.

---

## Inquiry state — mental model (for APIs & UI)

- Agents/customers interact via **messages**; leads see broader lists/metrics.
- **“Addressed”** vs **“resolved”** are distinct: workflow facts are also **injected into chat prompts** so the assistant speaks consistently with the product.
- **Approve** endpoint encodes the **customer** closing path when rules allow; failures return **clear HTTP errors** (tests lock this in).

---

## Role-scoped metrics (`GET /api/metrics/inquiries`)

- **Lead/Admin:** organization-style counts (e.g. unassigned where applicable).
- **Agent:** “bucket” scoped (open assigned + resolved by them — per implemented queries).
- **Customer:** only metrics for **their** `customer_id`.

**Frontend:** dashboard loads **metrics + inquiry list** in parallel (`InquiryApi` / dashboard page).

---

## 4. Chat pipeline (request-level order)

Roughly:

1. **Validate** question / load **conversation** from store.
2. **`policyShortCircuit`** — e.g. “agent internals”, **tech stack / postgres** probes → fixed refusal, **no LLM**.
3. **`domainGate`** — greetings (fixed pivot); **persona + product + workflow UX** → allow; **forbidden auth/API tokens** → refusal; **off-topic** → refusal; **guest + protected inquiry intent** → sign-in message.
4. **Mode:** `llm` vs `rag` (RAG: embed query → vector search → optional citations).
5. **RAG empty:** if nothing retrieved, **still call LLM** for questions that already passed the gate — prompt says **no evidence**; avoid inventing precise policy numbers.
6. **Build messages:** system prompt from **`promptBuilder.cjs`** + **compressed history** + user turn.
7. **Optional:** response cache, **daily token budget**, then **`llm.invoke`**.
8. **Persist** assistant turn + usage/citations in **`chat_messages.meta_json`**.

**Key files:** `createChatService.cjs`, `chatDomainGate.cjs`, `chatPolicy.cjs`, `promptBuilder.cjs`.

---

## Guardrails — why two layers?

| Layer | Role |
|-------|------|
| **`chatPolicy.cjs`** | Blatant **extraction / internals / stack** probes — short-circuit before domain nuance. |
| **`chatDomainGate.cjs`** | **Product vs off-topic**; **workflow UX** expansions; **guest** access to inquiry **actions**. |

**Engineering takeaway:** policy is **cheap string rules**; the model still gets a **strong system prompt** so behavior stays on-brand when calls are allowed.

---

## RAG — engineer checklist

1. **Ingest:** `npm run rag:ingest` after migrate (embeddings + chunk rows).
2. **Corpus:** `backend/rag/corpus/*.md`; optional HTML comment metadata for **`visible_roles`**.
3. **Retrieval:** role-filtered search in `pgRagRetriever` (tests in `tests/chat/`).
4. **Client:** `POST /api/chat` body includes **`mode: "rag"`**; response may include **`citations`**.

**Failure modes:** empty retrieval (handled by LLM + strict prompt); embedding/API errors (wrapped by **retry + circuit breaker** when configured).

---

## 5. Testing strategy (what to run before a PR)

**Backend** (`backend/`):

```bash
npm test
```

- **Serial DB tests** with truncate between cases.
- **API suites:** auth, inquiries, approval, metrics, chat (mock LLM).

**Frontend** (`frontend/`):

```bash
npm test
```

- Page flows + **ChatbotWidget** (pathname, mode switch, citations UI).

**Golden / load (optional context):** `tests/fixtures/chat-golden.json`, `chat-load.test.cjs`.

---

## Configuration you’ll actually touch

| Area | Examples |
|------|----------|
| **DB** | `DATABASE_URL`; local `npm run db:up` → often port **5434** |
| **API port** | `PORT=3101` default |
| **OpenAI** | `OPENAI_API_KEY` for real chat + ingest |
| **Chat ops** | `CHAT_METRICS_TOKEN`, budgets, cache TTLs — see `backend/.env.example` |
| **Redis** | `REDIS_URL` optional for shared cache |
| **Frontend proxy** | `VITE_API_PROXY_TARGET` if API not on 3101 |

---

## Observability & shutdown (production-minded)

- **Chat counters / latency:** `GET /api/chat/metrics` (gated by token).
- **Graceful shutdown:** `SIGTERM`/`SIGINT` → stop accepting, **close chat bundle** (Redis), **`pool.end()`**.

---

## 6. Live demo script (keep it ~5–8 min)

1. **Show** two terminals: `backend npm start`, `frontend npm run dev`.
2. **Login** as **agent** → dashboard → metrics + table.
3. Open **inquiry** → **CRM** panel → **post message** (if role allows).
4. **Login** as **customer** (or second browser) → **approve** path when UI shows it.
5. **Chatbot:** same question on **`/`** vs **`/dashboard`** — mention **`pathname`** in payload.
6. Toggle **LLM vs RAG**; show **citations** when chunks exist.

---

## Extension ideas (discussion starters)

- Swap **OpenAI** for another provider behind the same `invoke` surface.
- **Stricter RAG:** force “no answer” when similarity below threshold (today: persona fallback after gate).
- **Audit log** for approvals / CRM reads.
- **E2E** Playwright on top of existing unit/integration tests.

---

## Summary

| Theme | Takeaway |
|-------|----------|
| **Architecture** | SPA + stateless API + Postgres; optional Redis + OpenAI |
| **Domain** | Inquiries + CRM + **approval-gated resolution** + role-scoped metrics |
| **GenAI** | Guardrailed **CSA Assistant**; RAG optional with **citations** |
| **Engineering** | **TDD** on schema and APIs; **test seams** on `createApp` and chat service |

---

# Q&A + open discussion

**Suggested if time remains:**

- Walk **`domainGate`** with a few example strings on a whiteboard.
- Trace one **`POST /api/chat`** with **mock LLM** in the debugger.
- Review **`migrations/001_initial.sql`** vs **schema tests**.

**Docs:** `docs/user-stories.md`, `backend/README.md`, `frontend/README.md`

---

# Thank you

**Customer Service Agent** — engineering deep dive  
`project_scaffloding/docs/presentation-customer-service-agent.md`
