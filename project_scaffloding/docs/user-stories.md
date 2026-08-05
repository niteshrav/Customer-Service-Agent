# User Stories — Customer Service Agent

**Source:** Derived from `business-requirements.md`  
**Stack context:** React (static frontend) → Node.js (HTTP APIs) → PostgreSQL (data persistence)

---

## Traceability

| User story | BRD functional requirement |
|------------|------------------------------|
| US-1 | FR-1 — Handle customer inquiries |
| US-2 | FR-2 — Access CRM (customer/account context) |
| US-3 | FR-3 — Use CRM context while responding |
| US-4 | FR-4 — Support issue resolution |
| US-5 | FR-5 — Metrics and visibility |

---

## US-1: Handle customer inquiries (support agent)

**As a** customer support agent,  
**I want** to open a customer inquiry and send responses through the web app,  
**So that** I can address customer needs during support interactions efficiently and consistently.

### Acceptance criteria

1. **Open and view inquiry**  
   - **Given** I am an authorized agent and an inquiry exists in the system,  
   - **When** I open the inquiry from the UI,  
   - **Then** the React app calls the backend API and I see inquiry attributes needed to handle it (e.g., identifier, status, linked customer reference, flags as defined in PRD).

2. **Send a valid response**  
   - **Given** an inquiry is open in my session,  
   - **When** I enter a non-empty response and submit,  
   - **Then** the frontend sends an API request to the backend, the backend persists the message in PostgreSQL, and the UI shows the updated message history.

3. **Reject invalid response**  
   - **Given** an inquiry is open,  
   - **When** I attempt to send an empty or whitespace-only response,  
   - **Then** the backend rejects the request with a clear error and the inquiry is not updated with an invalid message.

4. **Inquiry not openable**  
   - **Given** an inquiry exists but is not openable per business rules (e.g., not accessible),  
   - **When** I attempt to open it,  
   - **Then** the API returns an appropriate error and I cannot send responses for that inquiry in that state.

---

## US-2: Retrieve CRM context needed for handling (support agent)

**As a** customer support agent,  
**I want** to request customer/account information for the inquiry from the backend (backed by PostgreSQL CRM-like data),  
**So that** I can respond accurately and efficiently.

### Acceptance criteria

1. **Successful CRM retrieval**  
   - **Given** an inquiry is open and is linked to a customer identifier that exists in PostgreSQL,  
   - **When** I request CRM context via the UI (API call),  
   - **Then** the backend reads from PostgreSQL and returns the customer/account fields needed to address the inquiry.

2. **No matching customer/account**  
   - **Given** an inquiry is open but no matching customer/account record exists for the linked identifier,  
   - **When** I request CRM context,  
   - **Then** the API indicates that no CRM information is available (distinct from a technical failure), and the UI shows that state clearly.

3. **CRM retrieval failure**  
   - **Given** an inquiry is open and the database operation fails (e.g., connectivity or server error),  
   - **When** I request CRM context,  
   - **Then** the API indicates retrieval failed and the UI shows an error; no CRM data is presented as successfully retrieved.

4. **Session-scoped availability**  
   - **Given** CRM context was successfully retrieved earlier in the same inquiry-handling session,  
   - **When** I navigate within the inquiry view and return,  
   - **Then** the context remains available for that session without requiring a new retrieval unless the product defines otherwise.

5. **New session boundary**  
   - **Given** CRM context was retrieved in a prior inquiry-handling session,  
   - **When** I start a new session and open the same inquiry without requesting CRM again,  
   - **Then** CRM context is not assumed available until I request it again in that session (or the system clearly shows current-session availability per PRD).

---

## US-3: Use CRM context while responding (support agent)

**As a** customer support agent,  
**I want** to use CRM-retrieved information while composing my response,  
**So that** my handling is informed by customer context and remains consistent.

### Acceptance criteria

1. **Respond with CRM context available**  
   - **Given** CRM context is loaded and visible for the current inquiry session,  
   - **When** I compose and send a response that references that context,  
   - **Then** the response is accepted, persisted via the backend to PostgreSQL, and appears in the message history.

2. **Respond without CRM context**  
   - **Given** no CRM context is available in the current session,  
   - **When** I send a valid non-empty response,  
   - **Then** the response succeeds and the UI still reflects that CRM context is not available.

3. **Request CRM again during handling**  
   - **Given** I need to refresh or re-fetch context during the same session,  
   - **When** I request CRM information again,  
   - **Then** the backend returns current data from PostgreSQL and the UI updates accordingly.

---

## US-4: Support issue resolution (support agent)

**As a** customer support agent,  
**I want** the application to support progressing the interaction toward resolution and concluding it when appropriate,  
**So that** I can resolve issues efficiently and in compliance with business rules.

### Acceptance criteria

1. **Progress toward resolution**  
   - **Given** an inquiry is open and the issue is identified per inquiry data,  
   - **When** I handle the inquiry using inquiry details and CRM context when available,  
   - **Then** I can record progress (e.g., messages sent) and the system reflects the current inquiry state from PostgreSQL.

2. **Conclude as resolved only after customer approval**  
   - **Given** the business condition “issue addressed” is true for the inquiry,  
   - **When** the customer explicitly approves the resolution,  
   - **Then** the backend updates PostgreSQL so the inquiry is marked resolved/closed per defined status model.
  
3. **Block conclude when approval or issue addressed is missing**  
   - **Given** either the issue is not addressed or the customer approval is missing,  
   - **When** the system attempts to conclude as resolved/closed,  
   - **Then** the API rejects the request with a clear error and the inquiry status remains unchanged.

---

## US-5: View operational metrics (support agent / lead)

**As a** support agent or lead,  
**I want** to see basic operational metrics on a dashboard,  
**So that** I have data-driven visibility into inquiry volume and outcomes.

### Acceptance criteria

1. **Dashboard metrics from database**  
   - **Given** inquiries and related data exist in PostgreSQL,  
   - **When** I load the dashboard in the React app,  
   - **Then** the frontend calls a metrics API and displays counts that match the current database state (exact metrics to be enumerated in PRD, e.g., total inquiries, by status, CRM match indicators).

2. **Navigate to inquiry handling**  
   - **Given** I am on the dashboard,  
   - **When** I select an inquiry,  
   - **Then** I am taken to the inquiry detail flow that supports US-1 through US-4.

---

## Out of scope (per BRD)

- External CRM vendor integration (MVP uses PostgreSQL as CRM-like source of truth unless otherwise specified).
- AI/RAG chat bot and automated sending of AI-generated replies (future enhancement).

---

## Related documents

- `business-requirements.md` — BRD
- *(To add)* `product-requirements.md` — API contracts, data model fields, exact metrics list, auth model

**Version:** 1.0  
**Status:** Draft for product review  
