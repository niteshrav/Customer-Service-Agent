# Executive Summary — Chatbot LLM/RAG Upgrade

**Project:** Customer Service Agent (`project_scaffloding`)  
**Audience:** Product, operations, and leadership stakeholders  
**Purpose:** One-page summary of the proposed chatbot upgrade roadmap

---

## Why this upgrade

The current chatbot is functional but limited.  
This upgrade introduces:

- **Two response modes:** `LLM` and `RAG`
- **Shared chat history:** better multi-turn continuity
- **Persona-aware responses:** customer/agent/management context
- **Guardrails:** strict domain-only, safe responses
- **Cost controls + caching:** lower latency and spend

The result is a chatbot that is more useful, safer, and more scalable.

---

## What users will experience

1. **Mode selection in chatbot UI**
   - User can choose between `LLM` and `RAG`.

2. **Context-aware conversations**
   - Follow-up questions remain coherent using conversation history.

3. **Persona-appropriate responses**
   - Customer, agent, and management users receive role-appropriate guidance.

4. **RAG with grounded answers**
   - In `RAG` mode, answers are backed by approved internal documentation and can include citations.

5. **Safer assistant behavior**
   - The assistant refuses out-of-domain and technical/system-detail requests using short, user-friendly responses.

---

## Architecture decision

The recommended architecture is **feature-based layered architecture** (not strict MVC) because it better supports LLM/RAG-specific concerns:

- guardrails
- retrieval pipelines
- prompt orchestration
- caching
- cost tracking

This approach improves maintainability, testability, and future extensibility.

---

## Delivery plan (high-level)

- **Sprint 1:** Foundations (mode routing, history, persona, guardrail consistency)
- **Sprint 2:** RAG core (ingestion, retrieval, citations)
- **Sprint 3:** Cost + cache + observability optimization
- **Sprint 4 (optional):** production hardening and tuning

Detailed sprint tasks and acceptance criteria are documented in:
- `chat-rag-sprint-plan.md`

---

## Business value

- **Higher quality responses** through context + grounding
- **Lower operational risk** through guardrails
- **Lower cost and faster responses** through caching and token controls
- **Better governance** through telemetry (usage, latency, cost, guardrail metrics)

---

## Success criteria

The upgrade is considered successful when:

- both modes (`LLM` and `RAG`) are available and stable
- history and persona behavior are consistent
- guardrails block disallowed content reliably
- RAG responses include usable citations
- latency/cost metrics stay within agreed targets

---

## Related documents

- `chat-rag-architecture-plan.md`
- `chat-rag-sprint-plan.md`
- `auth-navigation-flow.md`

