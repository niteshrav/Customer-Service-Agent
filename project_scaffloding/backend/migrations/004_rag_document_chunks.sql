-- RAG: document chunks with JSON embeddings (cosine similarity in application layer; no pgvector required).

CREATE TABLE IF NOT EXISTS rag_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  section_label TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  embedding JSONB NOT NULL,
  corpus_version TEXT NOT NULL DEFAULT 'v1',
  visible_roles TEXT[] NOT NULL DEFAULT ARRAY['guest', 'customer', 'agent', 'lead', 'admin']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rag_document_chunks_body_nonempty CHECK (length(trim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_source ON rag_document_chunks (source_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_corpus ON rag_document_chunks (corpus_version);
