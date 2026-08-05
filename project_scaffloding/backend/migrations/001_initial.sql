-- Initial schema: customers (CRM-like), inquiries, inquiry_messages
-- Idempotent for local re-runs (IF NOT EXISTS).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  account_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers (customer_id) ON DELETE RESTRICT,
  received BOOLEAN NOT NULL DEFAULT true,
  accessible BOOLEAN NOT NULL DEFAULT true,
  issue_identified BOOLEAN NOT NULL DEFAULT false,
  issue_addressed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inquiries_status_check CHECK (status IN ('open', 'resolved'))
);

CREATE TABLE IF NOT EXISTS inquiry_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_uuid UUID NOT NULL REFERENCES inquiries (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'agent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inquiry_messages_body_not_empty CHECK (length(trim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_inquiries_customer_id ON inquiries (customer_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_messages_inquiry_uuid ON inquiry_messages (inquiry_uuid);
