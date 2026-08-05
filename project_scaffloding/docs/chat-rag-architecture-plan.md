# Chat + RAG Architecture Plan (No-Code Blueprint)

**Project:** Customer Service Agent (`project_scaffloding`)  
**Scope:** Planning document only (no implementation in this step)  
**Goal:** Introduce dual-mode chatbot (`LLM` / `RAG`) with shared history, persona behavior, guardrails, cache, and cost optimization.

---

## 1) Current Architecture (As-Is)

Current system is a **layered/modular architecture** (not strict MVC):

- **Frontend (React/Vite):** component-driven UI + API client layer.
- **Backend (Express):** route/controller logic + modular chat services (`chatPolicy`, `promptBuilder`, etc.).
- **Data (PostgreSQL):** migration-driven schema + API-backed business flows.

This is already close to a clean service-layer pattern and can be extended safely.

---

## 2) Recommended Architecture (To-Be)

Use a **feature-based layered architecture** with strong SRP boundaries:

- **Controller layer:** HTTP request/response only.
- **Application layer:** chat orchestration and mode routing.
- **Domain layer:** guardrails, persona resolver, history strategy, retrieval logic.
- **Infrastructure layer:** OpenAI provider, embedding provider, cache provider, DB repositories.

### Why this over strict MVC

For LLM/RAG systems, strict MVC becomes awkward because retrieval, prompting, caching, and cost controls do not map cleanly to Model/View/Controller.  
Feature-based layering gives better testability, flexibility, and maintainability for AI features.

---

## 3) Target Module Blueprint (Backend)

Create/organize a `chat` feature module with SRP:

- `chatController`  
  Validates API payload, resolves auth/role, returns response DTO.

- `chatService` (orchestrator)  
  Runs guardrails, history, persona, mode-router, post-checks, persistence.

- `chatGuardrails`  
  Domain-only gate + no login/API/internal details + short refusal messages.

- `chatPersonaResolver`  
  Role-based persona rules for `guest/customer/agent/lead/admin`.

- `chatHistoryService`  
  Loads recent messages, appends turns, summary windowing.

- `chatModeRouter`  
  Routes to `llmEngine` or `ragEngine`.

- `llmEngine`  
  Persona + history + question -> model response.

- `ragEngine`  
  Retrieval pipeline + grounded answer + citations.

- `chatCacheService`  
  Response cache + retrieval cache.

- `chatCostService`  
  Tracks token usage/cost and enforces budget controls.

- `chatTelemetryService`  
  Emits guardrail/cache/latency/cost/retrieval events.

---

## 4) API Contract Blueprint

Single endpoint with mode-aware behavior:

- `POST /api/chat`

### Request shape (concept)

- `mode`: `llm | rag`
- `conversation_id`: optional (create when absent)
- `question`: required
- `pathname`: required
- `persona_override`: optional (future)

### Response shape (concept)

- `conversation_id`
- `reply`
- `mode_used`
- `persona_used`
- `citations` (RAG only)
- `guardrail`: block reason if short-circuited
- `usage`: token/cost metadata
- `cache_hit`: boolean

---

## 5) Chat History Design

History should be conversation-based and shared across both modes.

### Data model (conceptual tables)

- `chat_conversations`
  - `id`, `user_id`, `mode`, `persona`, timestamps
- `chat_messages`
  - `id`, `conversation_id`, `role`, `content`, `meta_json`, timestamps

### Runtime rules

- Fetch last N turns (e.g., 8-12).
- Trim/summarize older context to control token usage.
- Persist all user + assistant messages for traceability.

### Mode switch behavior

Recommended: start a **new conversation** when user switches mode (`LLM` <-> `RAG`) to avoid context pollution.

---

## 6) Persona Strategy (Both LLM and RAG)

Personas are resolved on backend from authenticated role:

- **Customer:** plain-language support on inquiry/approval lifecycle.
- **Agent:** operational handling guidance.
- **Lead/Admin:** management-level explanation including timeline concept.
- **Guest:** limited domain-safe guidance only.

Persona applies to both engines:

- `LLM`: persona + history + question.
- `RAG`: persona + retrieved context + history + question.

---

## 7) RAG Blueprint

### 7.1 Knowledge corpus

Start with curated internal documents from `project_scaffloding/docs/` and approved support knowledge.

### 7.2 Ingestion pipeline

1. Load source docs.
2. Chunk text with overlap.
3. Create embeddings.
4. Store vectors + metadata (source path, section, visibility tags).

### 7.3 Query pipeline

1. Embed user question.
2. Retrieve top-k chunks.
3. Apply role visibility filters.
4. Build grounded prompt.
5. Generate response + citations.

### 7.4 Fallback policy

If retrieval confidence/context quality is low, return safe uncertainty response instead of hallucination.

---

## 8) Guardrails Strategy

Guardrails wrap both modes and run before model invocation.

### 8.1 Pre-model short-circuit

- Reject off-domain questions.
- Reject login/auth/API/internal implementation detail requests.
- Reject protected/internals requests.
- Return short one-liner refusal.

### 8.2 Prompt constraints

- Domain-only instruction.
- No technical implementation/login/API details.
- Persona-constrained tone.

### 8.3 Post-response validation

- Scan generated output for forbidden technical/internal details.
- Replace unsafe output with refusal response if needed.

---

## 9) Cache + Memory Plan

Two cache layers:

- **Response cache (LLM + RAG):**  
  Keyed by normalized `{mode, role, persona, question, context_signature}`.

- **Retrieval cache (RAG):**  
  Keyed by normalized query + corpus version; stores retrieved chunk refs.

Memory strategy:

- Hot recent conversation turns in memory/fast cache.
- Durable history in PostgreSQL.

---

## 10) Cost Optimization Plan

- Keep default generation model `gpt-4o-mini`.
- Cap max input history turns and output tokens.
- Limit RAG top-k and chunk size.
- Use cache-first strategy before model calls.
- Add usage tracking per message/conversation.
- Introduce optional budget thresholds (per user/day or per conversation).

---

## 11) Observability Plan

Track:

- `llm` vs `rag` usage split
- latency p50/p95
- token/cost per request
- cache hit rate
- guardrail block reasons
- citation coverage and retrieval confidence (RAG)

Use these metrics to tune quality vs cost.

---

## 12) TDD Implementation Plan

Implement in this sequence:

1. API contract tests (`/api/chat` mode + conversation handling).
2. Guardrail short-circuit tests (assert no engine call).
3. History continuity tests.
4. Persona resolver tests.
5. Mode-router tests (`llm` vs `rag`).
6. RAG retrieval + citation tests.
7. Cache hit/miss behavior tests.
8. Cost accounting tests.
9. Frontend tests for mode selector + conversation continuity + citation UI.

---

## 13) Delivery Phases

1. Conversation/history persistence foundations.
2. Mode selector + mode router (LLM first).
3. Persona resolver for both modes.
4. RAG ingestion/retrieval with citations.
5. Cache + cost controls.
6. Observability and tuning.

---

## 14) Final Recommendation

Adopt **feature-based layered architecture** for this AI roadmap.  
It is a better fit than strict MVC for mixed concerns like retrieval, guardrails, prompting, caching, and cost governance, while still staying simple and maintainable in your existing codebase.

