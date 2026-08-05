-- Customer approval closes the inquiry (status -> resolved).
-- Management maps to lead/admin; customers are first-class users.

-- 1) Add customer role to users
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('agent', 'lead', 'admin', 'customer'));

-- Link a customer user to the CRM-like customer record in `customers`.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS customer_id TEXT
  REFERENCES customers (customer_id)
  ON DELETE SET NULL;

-- 2) Support assignment + approval semantics on inquiries
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS assigned_agent_id UUID
    REFERENCES users (id)
    ON DELETE SET NULL;

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS resolved_by_agent_id UUID
    REFERENCES users (id)
    ON DELETE SET NULL;

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS customer_approved BOOLEAN NOT NULL DEFAULT false;

-- Closed means resolved only. If status is resolved, customer_approved must be true.
ALTER TABLE inquiries
  DROP CONSTRAINT IF EXISTS inquiries_closed_requires_customer_approved;

ALTER TABLE inquiries
  ADD CONSTRAINT inquiries_closed_requires_customer_approved
  CHECK (
    status <> 'resolved'
    OR customer_approved = true
  );

-- Helpful indexes for role-based filtering
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_agent_id ON inquiries (assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_resolved_by_agent_id ON inquiries (resolved_by_agent_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_customer_approved ON inquiries (customer_approved);

