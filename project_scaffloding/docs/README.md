# SaaS Project Scaffold (production-grade placeholders)

This folder contains a **production-grade SaaS application scaffold** with
**placeholder folders/files only** (no implementation code).

## Key areas

- `business-requirements.md`: BRD for the Customer Service Agent (React + Node.js + PostgreSQL)
- `user-stories.md`: User stories and acceptance criteria derived from the BRD
- `test-cases.md`: Test cases mapped to user stories (document only; no implementation yet)
- `auth-navigation-flow.md`: Formal auth route guards, redirects, password policy, and chatbot-on-all-pages behavior
- `chat-rag-architecture-plan.md`: Detailed no-code blueprint for LLM/RAG mode menu, shared history, personas, guardrails, cache, and cost optimization
- `chat-rag-sprint-plan.md`: Sprint-wise execution plan with tasks, dependencies, acceptance criteria, and rollout sequence
- `chat-rag-executive-summary.md`: One-page non-technical summary for stakeholders (scope, value, delivery, and success criteria)
- `../backend/README.md`: PostgreSQL + Express API + TDD (`tests/db/`, `tests/auth/`, `tests/api/`)
- `../frontend/README.md`: React UI + Vitest TDD (`src/**/*.test.js(x)`)
- `database-tdd.md`: How the DB was specified with TDD (tests → migration)
- `postgres-setup-steps.md`: Four steps — `.env`, create DB, `npm run db:migrate`
- `../frontend/`: React + Vite UI (auth, dashboard, inquiry detail; tests colocated)
- `backend/`: API/service scaffold (placeholders)
- `shared/`: shared contracts/schemas (placeholders)
- `infra/`: deployment + IaC placeholders (k8s/helm/terraform)
- `observability/`: logs/metrics/tracing placeholders
- `security/`: security artifacts placeholders
- `docs/`: architecture/ADR/runbooks placeholders
- `scripts/`: automation placeholders
- `tests/`: unit/integration/e2e placeholders

