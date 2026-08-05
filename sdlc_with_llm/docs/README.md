# SDLC with LLM — Synthetic Data + Test Harness

This folder includes:
- Business requirements, user stories, and test cases (text files)
- Synthetic data to simulate CRM + inquiries
- Minimal Python code to simulate the user-story flows and run the test cases

## Run the tests

From the repository root:

```bash
python3 -m unittest -v sdlc_with_llm.tests.test_cases
```

## What’s included

- `sdlc_with_llm/synthetic_data/crm_customers.json`: synthetic CRM customer records
- `sdlc_with_llm/synthetic_data/inquiries.json`: synthetic inquiries covering normal + edge cases
- `sdlc_with_llm/sim/agent_sim.py`: minimal simulator for:
  - open inquiry
  - send response
  - request/view CRM info (session-scoped)
  - conclude interaction as resolved/closed
- `sdlc_with_llm/tests/test_cases.py`: unit tests mapped to TC-1.1 … TC-4.3

