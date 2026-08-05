# PostgreSQL database — TDD approach

This project creates a **basic PostgreSQL schema** using **test-driven development**:

1. **Tests define the contract** — `project_scaffloding/backend/tests/db/schema.test.cjs` specifies:
   - Required tables: `customers`, `inquiries`, `inquiry_messages`, `rag_document_chunks` (RAG embeddings store; JSON embeddings, role-filtered retrieval in app code)
   - Key columns and types
   - Role/workflow columns: `users.customer_id`, `inquiries.assigned_agent_id`, `inquiries.resolved_by_agent_id`, `inquiries.customer_approved`
   - Happy-path inserts
   - Foreign key enforcement (`inquiries.customer_id` → `customers.customer_id`)
   - Check constraint enforcing workflow: `status='resolved'` requires `customer_approved=true`
   - Check constraint on non-empty message `body`

2. **Migration implements the contract** — `project_scaffloding/backend/migrations/001_initial.sql` creates those objects (idempotent `IF NOT EXISTS` for local re-runs).

3. **Run order**
   - Create an empty database in PostgreSQL.
   - Set `DATABASE_URL` in `project_scaffloding/backend/.env`.
   - `npm run db:migrate` — apply SQL migrations.
   - `npm test` — green tests confirm the schema matches the spec.

See **`../backend/README.md`** for commands and table summaries.

**Note:** `npm test` **requires** a reachable PostgreSQL instance and `DATABASE_URL`. Without it, the suite fails in `before` hooks by design.
