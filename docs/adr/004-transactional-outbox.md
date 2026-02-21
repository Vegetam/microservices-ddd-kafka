# ADR-004: Transactional Outbox Pattern for Event Publishing

**Status:** Accepted  
**Date:** 2024-01-15

## Context

Domain events (OrderCreated, PaymentProcessed, etc.) must be published to Kafka **reliably** — if the app crashes after saving domain data but before publishing to Kafka, the event is lost forever. Direct Kafka publish inside the DB transaction is not possible (two different systems).

## Decision

Use the **Transactional Outbox Pattern**: write events to an `outbox_events` table inside the same DB transaction as the domain aggregate. A separate OutboxWorker polls and publishes events to Kafka.

## Implementation

```
DB Transaction:
  1. INSERT INTO orders ...
  2. INSERT INTO outbox_events (event_type, payload) ...
  COMMIT ← atomic

OutboxWorker (every 500ms):
  3. SELECT ... FROM outbox_events WHERE published_at IS NULL FOR UPDATE SKIP LOCKED
  4. kafka.publish(topic, payload)
  5. UPDATE outbox_events SET published_at = NOW()
```

`FOR UPDATE SKIP LOCKED` enables safe parallel workers without duplicate publishing.

## Consequences

- **Positive:** Zero event loss — events survive app crashes, DB is source of truth.
- **Positive:** At-least-once delivery — OutboxWorker retries up to MAX_RETRY_COUNT.
- **Negative:** Small latency (up to 500ms polling delay) — mitigated by polling interval tuning.
- **Negative:** `outbox_events` table grows — mitigated by archival job after 7 days.
