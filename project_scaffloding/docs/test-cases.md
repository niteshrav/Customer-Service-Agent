# Test Cases — Customer Service Agent

**Source:** Derived from `user-stories.md` and `business-requirements.md`  
**Stack context:** React (UI) → Node.js (APIs) → PostgreSQL  
**Status:** Document only — implementation and automated tests to follow in `tests/` and application code.

---

## Document control

| Item | Value |
|------|--------|
| Related BRD | `business-requirements.md` |
| Related stories | `user-stories.md` |
| Test levels | API (backend contract), UI (E2E/manual), DB (data state) — as noted per case |

---

## Traceability

| Test ID | User story | Brief description |
|---------|------------|-------------------|
| TC-1.1 – TC-1.4 | US-1 | Handle customer inquiries |
| TC-2.1 – TC-2.5 | US-2 | Retrieve CRM context |
| TC-3.1 – TC-3.3 | US-3 | Use CRM while responding |
| TC-4.1 – TC-4.3 | US-4 | Issue resolution |
| TC-5.1 – TC-5.2 | US-5 | Dashboard metrics and navigation |

---

## US-1: Handle customer inquiries

### TC-1.1 — Open inquiry and view details (success)

**Type:** Positive  
**Preconditions:** Authorized agent; inquiry exists in PostgreSQL and is openable per business rules.

**Steps:**
1. Call or trigger the API (or UI action) to open/load the inquiry by identifier.
2. Observe response payload or inquiry detail screen.

**Expected result:**
- HTTP/API success (or equivalent UI success).
- Response includes attributes required for handling (per PRD: e.g., inquiry id, status, linked customer id, accessibility/issue flags).
- No error message indicating the inquiry cannot be opened.

---

### TC-1.2 — Send a valid response (success)

**Type:** Positive  
**Preconditions:** Inquiry is open in the agent’s current handling context; agent is authorized.

**Steps:**
1. Submit a non-empty response message via API (or UI).
2. Reload inquiry detail or fetch message list.

**Expected result:**
- API accepts the request; message is persisted in PostgreSQL.
- Subsequent read shows the new message in history (order and content as defined in PRD).

---

### TC-1.3 — Attempt to send empty or whitespace-only response (failure)

**Type:** Negative / edge  
**Preconditions:** Inquiry is open; agent is authorized.

**Steps:**
1. Attempt to submit a response that is empty or only whitespace.
2. Fetch message list for the inquiry.

**Expected result:**
- API returns an error (e.g., 4xx) with a clear validation message; **or** UI blocks submit without calling API.
- Message count and content in PostgreSQL are unchanged (no empty message stored).

---

### TC-1.4 — Attempt to open or respond when inquiry is not openable (failure)

**Type:** Negative / edge  
**Preconditions:** Inquiry record exists but is not openable (e.g., not accessible flag per PRD).

**Steps:**
1. Attempt to open/load the inquiry.
2. If open is blocked, attempt to send a response anyway (if UI/API allows the call).

**Expected result:**
- Open/load fails with appropriate API error; user sees a clear message.
- Response send is not allowed for that inquiry in that state, or API rejects with appropriate error.

---

## US-2: Retrieve CRM context needed for handling

### TC-2.1 — Retrieve CRM info when customer exists in PostgreSQL (success)

**Type:** Positive  
**Preconditions:** Inquiry is open; `customer_id` (or equivalent) matches a row in customer/account table.

**Steps:**
1. Request CRM context for the open inquiry (API or UI “Load CRM”).
2. Observe API response and UI panel.

**Expected result:**
- API returns customer/account fields required by PRD.
- UI displays retrieved context.
- Data matches the row in PostgreSQL for that customer identifier.

---

### TC-2.2 — CRM returns no matching customer/account (edge)

**Type:** Edge  
**Preconditions:** Inquiry is open; linked customer identifier has **no** matching row in PostgreSQL.

**Steps:**
1. Request CRM context.

**Expected result:**
- API response explicitly indicates **no CRM data available** (not the same as a 5xx/connection error).
- UI shows “no CRM information” (or equivalent); no fabricated customer data.

---

### TC-2.3 — CRM retrieval fails due to database or server error (failure)

**Type:** Negative  
**Preconditions:** Inquiry is open; simulate DB unavailable, timeout, or backend error handling path per test plan.

**Steps:**
1. Request CRM context while failure condition is active.

**Expected result:**
- API returns an error indicating retrieval **failed** (distinct from “not found”).
- UI shows error state; CRM panel does not show a successful retrieval.
- After recovery, a new request can succeed (regression check optional).

---

### TC-2.4 — CRM context remains available within same inquiry session (success)

**Type:** Positive  
**Preconditions:** CRM context was successfully retrieved once in the current session.

**Steps:**
1. Navigate away from CRM panel or refresh inquiry sub-view (per PRD).
2. Return and view CRM context without a new request (if session cache is used).

**Expected result:**
- Context remains visible/available for that session per PRD (or re-fetch is explicit and documented).
- No loss of session-scoped state unless session expires per PRD.

---

### TC-2.5 — CRM context not assumed in a new session without re-request (edge)

**Type:** Edge / boundary  
**Preconditions:** CRM was retrieved in session A; start new session B (new auth/session token or explicit “new handling session” per PRD).

**Steps:**
1. Open the same inquiry in session B without calling CRM retrieval.
2. Observe CRM panel / API for “current context”.

**Expected result:**
- CRM context is **not** shown as loaded until retrieval is requested again in session B (or system clearly labels stale vs current-session state per PRD).

---

## US-3: Use CRM context while responding

### TC-3.1 — Send response while CRM context is loaded (success)

**Type:** Positive  
**Preconditions:** Inquiry open; CRM context successfully loaded and visible.

**Steps:**
1. Compose a response that references CRM fields (e.g., account status) and submit.
2. Verify message list.

**Expected result:**
- Response is accepted and stored.
- Message appears in history; CRM context remains consistent with PostgreSQL.

---

### TC-3.2 — Send response when CRM context is not available (success)

**Type:** Positive / edge  
**Preconditions:** Inquiry open; CRM never loaded or “not found” state.

**Steps:**
1. Send a valid non-empty response without loading CRM.

**Expected result:**
- Response succeeds.
- UI continues to show that CRM context is not available.

---

### TC-3.3 — Request CRM context again during same session (success)

**Type:** Positive  
**Preconditions:** Inquiry open; CRM was already retrieved once.

**Steps:**
1. Invoke CRM retrieval again (explicit refresh if offered).

**Expected result:**
- API succeeds; returned data is consistent with PostgreSQL (same or updated row if data changed).
- UI updates to reflect latest retrieval result.

---

## US-4: Support issue resolution

### TC-4.1 — Progress interaction using inquiry details and optional CRM (success)

**Type:** Positive  
**Preconditions:** Inquiry open; issue identified per inquiry data; CRM optional.

**Steps:**
1. Optionally load CRM context.
2. Send at least one valid response representing progress toward resolution.

**Expected result:**
- Inquiry state and message history in PostgreSQL reflect progress (per PRD state model).
- No premature transition to resolved without meeting “issue addressed” rule.

---

### TC-4.2 — Conclude interaction as resolved only after customer approval (success)

**Type:** Positive  
**Preconditions:** Inquiry open; business flag “issue addressed” is true; customer approval has not yet been recorded.

**Steps:**
1. Customer approves the resolution via the customer approval UI/API.

**Expected result:**
- Inquiry status in PostgreSQL updates to resolved/closed (per defined status values).
- Customer approval is recorded (e.g., `customer_approved=true`).
- API returns success; UI shows resolved state.

---

### TC-4.3 — Attempt to conclude without customer approval or without issue addressed (failure)

**Type:** Negative  
**Preconditions:** Inquiry open; either issue addressed is false OR customer approval is not recorded.

**Steps:**
1. Attempt to conclude/resolve via customer approval while business gate conditions are not met.

**Expected result:**
- API rejects with clear error; status unchanged in PostgreSQL.
- UI shows error; inquiry remains not resolved (status stays `open`).

---

## US-5: View operational metrics

### TC-5.1 — Dashboard metrics match PostgreSQL state (success)

**Type:** Positive  
**Preconditions:** Known seed or controlled data in PostgreSQL for inquiries and customers.

**Steps:**
1. Query PostgreSQL (or use a reference script) to compute expected metric values per PRD.
2. Load dashboard via React app (metrics API).
3. Compare displayed numbers to expected values.

**Expected result:**
- Each displayed metric matches the independently computed counts (total inquiries, by status, CRM match indicators, etc., as defined in PRD).

---

### TC-5.2 — Navigate from dashboard to inquiry handling (success)

**Type:** Positive  
**Preconditions:** Dashboard lists at least one inquiry.

**Steps:**
1. From dashboard, select an inquiry (link or row action).
2. Verify inquiry detail view loads.

**Expected result:**
- Navigation succeeds; inquiry detail supports opening, messaging, CRM, and resolution flows (US-1–US-4).

---

## Out of scope (no test cases required in MVP doc)

- External CRM vendor APIs (unless added to scope).
- AI/RAG chat bot drafts and automated sends (future).

---

## Related documents

- `business-requirements.md`
- `user-stories.md`
- *(Future)* `product-requirements.md` — exact API paths, status codes, field names, and metric definitions for automation

**Version:** 1.0  
**Status:** Draft for QA / product alignment  
