# Chat + RAG Sprint Execution Plan (Doc-Only)

**Project:** Customer Service Agent (`project_scaffloding`)  
**Scope:** Execution roadmap only (no code in this step)  
**Companion doc:** `chat-rag-architecture-plan.md`

---

## 1) Delivery Strategy

This plan breaks implementation into focused sprints so you can ship value incrementally:

- **Sprint 1:** Foundations (history + mode routing + guardrails consistency)
- **Sprint 2:** RAG core (ingestion + retrieval + citations)
- **Sprint 3:** Cost + cache + observability hardening
- **Sprint 4 (optional):** Quality, tuning, and production readiness

Each sprint has:
- goals
- concrete tasks
- dependencies
- acceptance criteria
- risks and mitigations

---

## 2) Sprint 1 — Foundations (LLM + History + Mode Menu)

### Goal
Deliver a stable chat experience with:
- mode selector (`LLM` / `RAG`) in UI
- conversation history persistence
- persona application
- guardrails applied consistently before any model call

### Tasks

1. **API contract upgrade**
   - Extend `/api/chat` request/response to include:
     - `mode`
     - `conversation_id`
     - usage/cost metadata envelope

2. **Conversation persistence**
   - Add `chat_conversations` and `chat_messages` tables.
   - Implement repository methods for create/get/append history.

3. **Mode menu in frontend**
   - Add mode selector in chatbot panel.
   - Send selected mode with each message.
   - On mode change, start a new conversation id (recommended).

4. **Persona resolver integration**
   - Resolve role-based persona server-side for every request.
   - Apply persona in prompt builder for both modes.

5. **Guardrail unification**
   - Keep domain-only + no login/API/system details checks as pre-model gate.
   - Standardize one-line refusal responses.

6. **TDD coverage**
   - API contract tests
   - guardrail short-circuit tests (assert no engine call)
   - history continuity tests
   - mode routing tests

### Dependencies
- Existing auth/session behavior
- existing `POST /api/chat` endpoint

### Acceptance Criteria
- User can select `LLM`/`RAG` in UI (RAG may still fallback placeholder in this sprint).
- Chat history persists by conversation id.
- Guardrails block disallowed questions with one-line refusal.
- All related backend/frontend tests pass.

### Risks / Mitigation
- **Risk:** context leakage between modes  
  **Mitigation:** new conversation on mode switch.

---

## 3) Sprint 2 — RAG Core (Knowledge + Retrieval + Grounded Answers)

### Goal
Make `RAG` mode return grounded answers with citations from approved docs.

### Tasks

1. **Knowledge corpus definition**
   - Approve source list (docs only; exclude secrets/config/internal technical files).
   - Add metadata policy (source, section, role visibility).

2. **Ingestion pipeline**
   - loader -> chunker -> embedder -> vector storage.
   - version hash each source document for invalidation.

3. **Retrieval pipeline**
   - query embedding
   - top-k retrieval
   - role-based filtering
   - optional rerank

4. **RAG prompt composition**
   - Include retrieved evidence + persona constraints.
   - Add instruction to avoid unsupported claims.

5. **Citation response contract**
   - Return source references (doc name + section/chunk id).

6. **TDD coverage**
   - retrieval returns expected docs for known queries
   - role filter blocks unauthorized context
   - citations are present in RAG response

### Dependencies
- Sprint 1 contract and history
- embedding provider setup

### Acceptance Criteria
- `RAG` mode answers with citations.
- If evidence is weak/missing, safe fallback response (no hallucination).
- Guardrails still apply before retrieval/model call.

### Risks / Mitigation
- **Risk:** noisy retrieval from poor chunking  
  **Mitigation:** tune chunk size/overlap and add reranking.

---

## 4) Sprint 3 — Cost Optimization + Cache + Telemetry

### Goal
Control spend and latency while preserving answer quality.

### Tasks

1. **Token/cost accounting**
   - capture token usage and estimated cost per response.
   - persist into message metadata.

2. **Response cache**
   - cache key by normalized `{mode, role, persona, question, context signature}`.
   - short TTL.

3. **RAG retrieval cache**
   - cache query -> retrieved chunk ids (version-aware).

4. **History window optimization**
   - trim to last N turns.
   - summary compression for long conversations.

5. **Budget guardrails**
   - max tokens per response.
   - optional per-user/day budget threshold.

6. **Telemetry**
   - mode usage, cache hit rate, guardrail blocks, latency, token/cost trends.

7. **TDD coverage**
   - cache hit/miss behavior
   - budget cap behavior
   - usage metadata presence

### Dependencies
- Stable `LLM` + `RAG` flows from previous sprints

### Acceptance Criteria
- measurable reduction in repeated-query cost and latency.
- dashboards/logs expose usage/cost/guardrail metrics.
- no regression in guardrail correctness.

### Risks / Mitigation
- **Risk:** stale cached responses  
  **Mitigation:** conservative TTL + corpus-versioned keys.

---

## 5) Sprint 4 (Optional) — Production Hardening

### Goal
Prepare for scale and reliability.

### Tasks
- move caches to Redis (if currently in-memory)
- add retry/backoff policies for model provider failures
- add circuit-breaker fallback response
- add load and soak tests on `/api/chat`
- improve prompt/version management
- add quality evaluation set (golden Q/A tests)

### Acceptance Criteria
- stable under expected load.
- graceful degradation on provider/network issues.

---

## 6) Detailed Task Backlog Template

Use this template for each ticket:

- **Title**
- **Type:** backend/frontend/data/devops/test/doc
- **Module:** chatController / guardrails / ragEngine / cache / etc.
- **Dependency**
- **Definition of Done**
- **Test Plan**
- **Risk**

---

## 7) Suggested Team Sequence (Single-Track)

If one developer:
1. backend contract + DB history
2. frontend mode menu + conversation wiring
3. persona + guardrails consistency
4. RAG ingestion/retrieval
5. citations + UI rendering
6. cache + usage tracking
7. telemetry + tuning

If parallel team:
- Engineer A: backend core orchestration/history
- Engineer B: RAG ingestion/retrieval
- Engineer C: frontend mode/citation UX
- QA: guardrail + regression suites

---

## 8) Exit Criteria (Program-Level)

You can consider rollout complete when:
- both modes (`LLM`, `RAG`) are usable in production
- history works consistently across turns
- persona behavior is role-correct
- guardrails block disallowed categories with one-line refusals
- cost and latency are monitored and within targets
- citation-backed responses are available in RAG mode

---

## 9) Notes for Architecture Governance

- Keep feature boundaries strong (no prompt logic inside controllers).
- Keep provider integrations behind adapters.
- Keep guardrails deterministic and test-first.
- Keep docs versioned with implementation changes.

