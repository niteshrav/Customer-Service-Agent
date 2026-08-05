# Manual test case guide — Customer Service Agent

Use this checklist for exploratory and release testing. Record **Pass / Fail / Blocked** and notes per run.

---

## 1. Prerequisites

| Item | Notes |
|------|--------|
| PostgreSQL | Running; `DATABASE_URL` set (see `backend/.env.example`). |
| Migrations | `cd backend && npm run db:migrate` |
| Optional demo data | `npm run db:seed-demo` (demo users for UI login). |
| Backend | `cd backend && npm start` (default `http://127.0.0.1:3101`). |
| Frontend | `cd frontend && npm run dev` (or `build` + `preview`) pointing API at the same backend. |
| Chat (real LLM) | `OPENAI_API_KEY` in `backend/.env`. |
| RAG | After migrate: `npm run rag:ingest` in `backend/`. |
| Chat metrics | Optional: `CHAT_METRICS_TOKEN` in `backend/.env`. |
| Redis (Sprint 4) | Optional: `REDIS_URL`; without it, caches stay in-memory. |

---

## 2. Automated tests (regression)

Run these before/after manual passes. All should be green for a clean baseline.

### 2.1 Backend (Node test runner)

```bash
cd project_scaffloding/backend
npm test
```

**API checklist (automated Supertest pass over guide §3 core cases):**

```bash
cd project_scaffloding/backend
npm run verify:manual
```

Requires `DATABASE_URL` (same as `npm test`). Uses a mock LLM so `OPENAI_API_KEY` is not required for this script.

| Result | Meaning |
|--------|---------|
| **pass** | All non-skipped tests succeeded. |
| **skipped: 1** | Expected when `REDIS_URL` is unset: Redis JSON cache integration is skipped. To run it: `REDIS_URL=redis://127.0.0.1:6379 npm test`. |

**Last verification (document update):** backend reported **78 passed**, **0 failed**, **1 skipped** (Redis), **exit code 0**.

### 2.2 Frontend (Vitest)

```bash
cd project_scaffloding/frontend
npm test
```

**Last verification:** **15 test files**, **46 tests passed**, **exit code 0**. (Console may show React Router v7 future-flag warnings; they do not fail the run.)

---

## 3. Manual test cases — API (curl or REST client)

Assume `BASE=http://127.0.0.1:3101` unless you changed `PORT`.

| ID | Case | Steps | Expected | Result |
|----|------|--------|----------|--------|
| H-1 | Health | `GET $BASE/api/health` | `200`, JSON `{ "ok": true }` | |
| A-1 | Register | `POST $BASE/api/auth/register` with `full_name`, `email`, strong `password` | `201` | |
| A-2 | Register weak password | Same with short or simple password | `400`, validation message | |
| A-3 | Login | `POST $BASE/api/auth/login` with valid `email` / `password` | `200`, `token` + `user` | |
| A-4 | Me | `GET $BASE/api/auth/me` with `Authorization: Bearer <token>` | `200`, user object | |
| A-5 | Me unauthorized | Same without header or bad token | `401` | |
| I-1 | List inquiries | `GET $BASE/api/inquiries` with customer/agent/lead token | `200`, `inquiries` array (may be empty) | |
| I-2 | Inquiry detail | `GET $BASE/api/inquiries/<inquiryId>` with token that may access it | `200` or `404` per role rules | |
| I-3 | CRM snippet | `GET $BASE/api/inquiries/<inquiryId>/crm` | `200` with `customer` when allowed | |
| I-4 | Post message (agent) | `POST $BASE/api/inquiries/<id>/messages` with non-empty `body` | `201` when allowed | |
| I-5 | Empty message | `POST` with empty/whitespace `body` | `400` | |
| C-1 | Customer approve | `POST $BASE/api/inquiries/<id>/approve` as customer when inquiry is ready | `200` or business error per state | |
| C-2 | Approve when not ready | Approve when `issue_addressed` is false | `400` with clear message | |

### 3.1 Chat — guardrails and modes

| ID | Case | Steps | Expected | Result |
|----|------|--------|----------|--------|
| CH-1 | Empty question | `POST $BASE/api/chat` body `{"question":"","pathname":"/"}` | `200`, short “enter a question” style reply | |
| CH-2 | Guest “show my inquiries” | No `Authorization`; question about listing inquiries | `200`, sign-in style refusal (no real LLM answer) | |
| CH-3 | Off-domain | Question unrelated to CS workflow (e.g. sports trivia) | `200`, domain refusal one-liner | |
| CH-4 | Login/API detail | Question about Authorization header / API | `200`, refusal | |
| CH-5 | In-domain LLM | Valid CS question, `"mode":"llm"` | `200`, `reply`; with real key, coherent answer; optional `usage` | |
| CH-6 | RAG no corpus match | `"mode":"rag"` with question unlikely to match chunks | `200`, safe empty-RAG message; `citations: []` | |
| CH-7 | RAG with corpus | After `rag:ingest`, question matching corpus | `200`, `reply` + `citations` array | |
| CH-8 | Conversation continuity | Send `conversation_id` from prior response; second question | Same `conversation_id` behavior; history sensible | |
| CH-9 | Mode switch | Same `conversation_id`, switch `llm` then `rag` | Still same conversation id | |
| CH-10 | Metrics disabled | `GET $BASE/api/chat/metrics` when `CHAT_METRICS_TOKEN` unset | `503` | |
| CH-11 | Metrics authorized | Set token in env; `GET` with `X-Chat-Metrics-Token: <same>` | `200`, `metrics` object | |
| CH-12 | Authenticated budget key | Logged-in user chat (optional: tight `CHAT_DAILY_TOKEN_BUDGET_PER_KEY`) | After cap, budget message + `budget_blocked` | |

### 3.2 Optional — Redis

| ID | Case | Steps | Expected | Result |
|----|------|--------|----------|--------|
| R-1 | Redis caches | Set `REDIS_URL`, restart backend; repeat identical chat/RAG queries | Lower latency or repeated behavior; no errors in logs | |

### 3.3 Optional — resilience (hard to trigger manually)

| ID | Case | Steps | Expected | Result |
|----|------|--------|----------|--------|
| RES-1 | Provider outage | Simulate blocked API key or network to OpenAI | User-visible fallback message; HTTP `200` with degraded reply; metrics `circuit_*` / `llm_retries` may move | |

---

## 4. Manual test cases — UI (browser)

Use demo accounts from `backend/README.md` after `npm run db:seed-demo` (password `Demo1!csa` unless overridden).

| ID | Case | Steps | Expected | Result |
|----|------|--------|----------|--------|
| UI-1 | Home | Open `/` | Hero and features render | |
| UI-2 | Login | Login as customer / agent / management | Dashboard or role-appropriate landing | |
| UI-3 | Register | Weak password | Inline validation before or after API | |
| UI-4 | Inquiry list | Customer vs agent dashboard | Lists match role | |
| UI-5 | Inquiry detail | Open one inquiry | Messages and actions match role (e.g. customer sees Approve when appropriate) | |
| UI-6 | Chatbot panel | Open widget; ask in-domain question | Reply appears; no crash | |
| UI-7 | LLM / RAG toggle | Switch mode; send messages | Same conversation behavior as API tests | |
| UI-8 | Citations (RAG) | RAG mode with ingested corpus | Citation chips or list under reply | |
| UI-9 | Legal | Footer links to Terms / Privacy | Pages render | |

---

## 5. Golden scenarios (automated reference)

Automated golden cases live in:

- `backend/tests/fixtures/chat-golden.json`

They cover off-domain refusal, guest protected intent, and a happy-path in-domain reply (with a mock LLM in CI). Extend that file when you add new locked behaviors.

---

## 6. Sign-off template

| Date | Tester | Backend `npm test` | Frontend `npm test` | Manual scope (API / UI / both) | Notes |
|------|--------|--------------------|---------------------|----------------------------------|-------|
| | | pass / fail | pass / fail | | |

---

## 7. Related docs

- `docs/user-stories.md` — product acceptance themes  
- `docs/chat-rag-sprint-plan.md` — sprint scope  
- `backend/README.md` — env vars and API table  
