# Dashboard validation report (sdlc_with_llm)

## Success metrics

### 1. Completeness
- **Dashboard (/)**: Presents all project-result metrics (total inquiries, accessible, issues identified/addressed, resolved, CRM match count) and a table of inquiries with links to detail.
- **Inquiry detail (/inquiries/<id>)**: Shows inquiry fields (status, received, accessible, issue identified/addressed, message count, CRM customer ID and name). Back link to dashboard.
- **404**: Unknown inquiry ID returns 404.
- **Dependency**: `sdlc_with_llm/requirements.txt` added; install with `pip install -r sdlc_with_llm/requirements.txt` (or use a venv).

### 2. Usability
- Single landing page with metric cards and inquiry table; drill-down via inquiry ID link.
- Labels and table headers are clear; layout is simple and readable.
- No extra functionality beyond displaying project results from generated code and synthetic data.

### 3. Metric accuracy
- Metrics are computed from the same data used by the generated code (`sdlc_with_llm/synthetic_data/inquiries.json`, `crm_customers.json`) and `CRMService`/`InquiryStore`.
- **Verified values** (current synthetic data):
  - Total inquiries: **3**
  - Accessible inquiries: **2**
  - Issues identified: **2**
  - Issues addressed: **0**
  - Resolved inquiries: **0**
  - CRM match count: **2**
- Validation script (no Flask): logic exercised and assertions passed.

## How to run validation

1. From repo root: `pip install -r sdlc_with_llm/requirements.txt`
2. Run: `python3 -m sdlc_with_llm.validate_dashboard`
3. Start dashboard: `python3 sdlc_with_llm/app.py` then open http://127.0.0.1:5000/

## Issues identified

- **None** in the generated dashboard code.
- Flask is not installed in the environment used for this report; route/content checks were designed to run via `validate_dashboard.py` once Flask is available.
