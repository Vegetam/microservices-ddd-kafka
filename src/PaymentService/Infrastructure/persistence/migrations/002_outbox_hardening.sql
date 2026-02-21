-- Migration: Harden outbox processing with locks, scheduling and DLQ metadata

ALTER TABLE outbox_events
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dead_lettered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dead_letter_topic TEXT;

CREATE INDEX IF NOT EXISTS idx_outbox_next_attempt
  ON outbox_events (next_attempt_at)
  WHERE published_at IS NULL AND dead_lettered_at IS NULL;
