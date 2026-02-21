-- Migration: Create orders and outbox_events tables
-- Run: psql $DATABASE_URL -f migrations/001_initial.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL,
  status           VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  items            JSONB NOT NULL DEFAULT '[]',
  total_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_currency   VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS outbox_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id     UUID NOT NULL,
  aggregate_type   VARCHAR(100) NOT NULL,
  event_type       VARCHAR(200) NOT NULL,
  payload          JSONB NOT NULL,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at     TIMESTAMPTZ,
  retry_count      INT NOT NULL DEFAULT 0,
  error            TEXT
);

-- Partial index: only unpublished events — makes OutboxWorker poll fast
CREATE INDEX IF NOT EXISTS idx_outbox_unpublished
  ON outbox_events(occurred_at)
  WHERE published_at IS NULL;
