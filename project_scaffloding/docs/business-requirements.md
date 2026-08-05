# Business Requirements — Customer Service Agent

**Document type:** Business Requirements Document (BRD)  
**Use case:** Handle customer inquiries, access CRM, and resolve issues  
**Target stack:** React (static frontend), Node.js (backend API), PostgreSQL (database)

---

## 1. Executive summary

The organization needs a **Customer Service Agent** web application so support staff can handle inbound customer inquiries with timely access to **customer/account context** (CRM-like data), respond consistently, and **resolve or close** interactions according to business rules. The solution will use a **React** frontend that calls a **Node.js** backend via **HTTP APIs**; the backend **queries and updates PostgreSQL** and returns results to the frontend through those same APIs.

> **Note on architecture wording:** The frontend communicates with the backend using **REST (or similar) API calls**. The backend communicates with PostgreSQL using a **database client** (SQL / ORM), not an HTTP “API” to the database itself. Data still flows **frontend → backend → database → backend → frontend**.

---

## 2. Background and business need

Support performance suffers when agents lack customer context during live handling, leading to slower responses and inconsistent outcomes. The business requires a single application that supports inquiry handling, CRM-context retrieval, and controlled resolution so teams can improve **first response time**, **time to resolution**, and **quality/consistency** of support.

---

## 3. Problem statement

Agents need a reliable way to open inquiries, pull the right customer/account information, send responses, and progress resolution—while the interaction is only concluded as resolved after the issue is addressed and the customer explicitly approves.

---

## 4. Goals and objectives (measurable)

| Objective | KPI / measure |
|-----------|----------------|
| Faster first response | First Response Time (FRT) |
| Faster resolution | Time to Resolution (TTR) / Average Handle Time (AHT) |
| Consistent handling | QA score and/or customer satisfaction proxy |
| Correct closure | % of inquiries resolved/closed only when issue is addressed AND customer approval is recorded |

---

## 5. Scope

### 5.1 In scope (MVP)

- **Handle customer inquiries:** open/view inquiry, send validated responses, maintain message history.
- **Access CRM (represented in PostgreSQL):** retrieve customer/account data needed to address the inquiry; handle missing data and retrieval failures.
- **Resolve issues:** progress handling using inquiry details and CRM context when available; mark inquiry resolved/closed only when business rules allow (e.g., issue addressed and customer approval).
- **Agent-facing UI:** React static site calling backend APIs.
- **Backend:** Node.js services exposing APIs and persisting state in PostgreSQL.
- **Basic metrics/dashboard:** counts reflecting current database state (e.g., inquiries by status, CRM match indicators as defined in PRD).

### 5.2 Out of scope (MVP)

- Full integration with an external CRM vendor (unless later phased in; MVP may use PostgreSQL as system of record for “CRM” data).
- AI/RAG chat bot and automated response sending (may be added later behind feature flags).
- Omnichannel beyond the defined inquiry channel(s) unless specified later.

---

## 6. Stakeholders

| Role | Interest |
|------|----------|
| Customer support agents | Daily inquiry handling |
| Support leads / operations | Metrics, quality, SLAs |
| Engineering / platform | Build, operate, secure the system |
| Data / CRM owners | Data accuracy and access policies |

---

## 7. High-level solution architecture

1. **React (static website)** — Served as static assets; uses **HTTP APIs** to the Node.js backend.
2. **Node.js backend** — Implements business logic, validation, and authorization; **reads/writes PostgreSQL** via database access layer.
3. **PostgreSQL** — Stores customers (CRM-like), inquiries, messages, sessions/context cache (as designed), and audit data as needed.

**Data flow (conceptual):**

- User action in UI → **API request** → Backend → **SQL/query** → PostgreSQL → Backend shapes response → **API response** → UI update.

---

## 8. Functional requirements

### FR-1 — Handle customer inquiries

- The system shall allow an authorized agent to **open** and **view** an inquiry and its attributes required for handling.
- The system shall allow the agent to **send a response** associated with the inquiry.
- The system shall **reject** invalid responses (e.g., empty or whitespace-only), per product rules.

### FR-2 — Access CRM (customer/account context)

- The system shall provide a way to **request** customer/account information for the inquiry’s linked customer identifier.
- Retrieved context shall be **available for use** during the same inquiry-handling session as defined in product requirements.
- The system shall represent **no matching record** and **retrieval failure** distinctly so the UI can inform the agent.

### FR-3 — Use CRM context while responding

- When CRM context is available, the agent workflow shall support responses that **reference** that context (manual composition in MVP).
- When CRM context is **not** available, the system shall still allow sending a valid response, subject to the same validation rules.

### FR-4 — Support issue resolution

- The system shall support progressing the interaction using **inquiry details** and **CRM context when available**.
- The system shall allow **progressing** the interaction by allowing agents to mark an inquiry as **issue addressed** (progress gate).
- The system shall allow **concluding** the interaction as **resolved/closed** only when **issue addressed is true AND the customer explicitly approves** the resolution (or equivalent business gate defined in PRD).
- Attempting to conclude when the customer approval is missing (or when the issue is **not** addressed) shall **fail** with a clear error.

### FR-5 — Metrics and visibility

- The system shall expose APIs (and UI) for **basic operational metrics** derived from PostgreSQL (exact metrics to be listed in PRD/dashboard spec).

---

## 9. Non-functional requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-1 | Reliability | Core inquiry APIs available during support operations windows (target uptime defined in SLO). |
| NFR-2 | Performance | CRM context retrieval completes within a latency suitable for live handling (target defined in PRD). |
| NFR-3 | Security | HTTPS in production; authentication and **role-based access**; least-privilege DB credentials; PII handling per policy. |
| NFR-4 | Auditability | Significant actions (open, CRM request, send message, conclude) are auditable (scope detailed in PRD). |
| NFR-5 | Maintainability | Clear separation: UI → API contracts → domain logic → data access → PostgreSQL. |

---

## 10. Assumptions and dependencies

**Assumptions**

- PostgreSQL holds sufficient **customer/account** and **inquiry** data for MVP “CRM” behavior.
- Agents authenticate through a mechanism agreed in security/PRD (e.g., SSO or app auth).

**Dependencies**

- Hosting for static frontend, Node.js runtime for API, managed or self-hosted PostgreSQL.
- Network connectivity from backend to database; secrets management for DB credentials.

---

## 11. Success criteria (acceptance at business level)

- Agents can complete the **end-to-end workflow**: open inquiry → (optional) load CRM context → send valid response → conclude only when allowed.
- Dashboard/metrics **match** underlying database facts for defined measures.
- CRM unavailable / no-match paths are **handled without** silent failure or incorrect closure.

---

## 12. Related documents (to be maintained alongside this BRD)

- Product Requirements Document (PRD) — user stories, acceptance criteria, API contracts.
- Data model / ERD — PostgreSQL tables and relationships.
- Security & compliance brief — PII, retention, access.
- Test strategy — mapping requirements to automated and UAT tests.

---

**Version:** 1.0  
**Status:** Draft for stakeholder review  
