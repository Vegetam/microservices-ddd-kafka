CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE IF NOT EXISTS payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL,
  customer_id      UUID NOT NULL,
  status           VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  amount           NUMERIC(12,2) NOT NULL,
  currency         VARCHAR(3) NOT NULL DEFAULT 'USD',
  stripe_charge_id VARCHAR(200),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

CREATE TABLE IF NOT EXISTS outbox_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id   UUID NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  event_type     VARCHAR(200) NOT NULL,
  payload        JSONB NOT NULL,
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at   TIMESTAMPTZ,
  retry_count    INT NOT NULL DEFAULT 0,
  error          TEXT
);
CREATE INDEX IF NOT EXISTS idx_outbox_unpublished ON outbox_events(occurred_at) WHERE published_at IS NULL;
