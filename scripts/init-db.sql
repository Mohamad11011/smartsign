-- SmartSign PostgreSQL Schema
-- Run this once when setting up a new database (Neon, Vercel Postgres, etc.)

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  recipients TEXT NOT NULL DEFAULT 'No recipients',
  recipients_detail JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  signed_by TEXT[],
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- Templates
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document_name TEXT NOT NULL,
  pdf_base64 TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]',
  signer_roles JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);

-- Signing sessions (tokens)
CREATE TABLE IF NOT EXISTS signing_sessions (
  token TEXT PRIMARY KEY,
  document_id UUID,
  document_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_id TEXT NOT NULL,
  pdf_base64 TEXT NOT NULL,
  coordinates JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_signing_sessions_document_id ON signing_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_signing_sessions_expires_at ON signing_sessions(expires_at);

-- Audit trail
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  document_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_name TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_events_token ON audit_events(token);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp);
