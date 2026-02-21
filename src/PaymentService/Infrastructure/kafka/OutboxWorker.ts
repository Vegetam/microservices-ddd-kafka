import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { KafkaService } from '../../../OrderService/Infrastructure/kafka/kafka.service';
import * as os from 'os';

type JsonRecord = Record<string, unknown>;

interface OutboxRow {
  id: string;
  aggregate_id: string;
  aggregate_type: string;
  event_type: string;
  payload: JsonRecord;
  occurred_at: string;
  retry_count: number;
}

const TOPIC_MAP: Record<string, string> = {
  'Order.OrderCreatedEvent': 'order.created',
  'Payment.PaymentProcessedEvent': 'payment.processed',
  'Notification.NotificationSentEvent': 'notification.sent',
};

function backoffSeconds(retry: number, base = 2, max = 60): number {
  const exp = Math.min(max, base * 2 ** Math.max(0, retry - 1));
  const jitter = Math.floor(Math.random() * 3);
  return exp + jitter;
}

@Injectable()
export class OutboxWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxWorker.name);
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;
  private readonly workerId = `${process.env.POD_NAME || os.hostname()}-${process.pid}`;

  private readonly pollIntervalMs = Number(process.env.OUTBOX_POLL_INTERVAL_MS || 500);
  private readonly batchSize = Number(process.env.OUTBOX_BATCH_SIZE || 100);
  private readonly maxRetries = Number(process.env.OUTBOX_MAX_RETRIES || 5);
  private readonly staleLockSeconds = Number(process.env.OUTBOX_STALE_LOCK_SECONDS || 60);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly kafkaService: KafkaService,
  ) {}

  onApplicationBootstrap() {
    this.intervalId = setInterval(() => this.processOutbox().catch((err) => this.logger.error(err)), this.pollIntervalMs);
    this.logger.log(`OutboxWorker started (every ${this.pollIntervalMs}ms)`);
  }

  onApplicationShutdown() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async claimBatch(): Promise<OutboxRow[]> {
    const rows = await this.dataSource.transaction(async (manager) => {
      const res = await manager.query(
        `
        WITH cte AS (
          SELECT id
          FROM outbox_events
          WHERE published_at IS NULL
            AND dead_lettered_at IS NULL
            AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
            AND (locked_at IS NULL OR locked_at < NOW() - ($2::int || ' seconds')::interval)
          ORDER BY occurred_at ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE outbox_events o
        SET locked_at = NOW(),
            locked_by = $3,
            last_attempt_at = NOW()
        FROM cte
        WHERE o.id = cte.id
        RETURNING o.id, o.aggregate_id, o.aggregate_type, o.event_type, o.payload, o.occurred_at, o.retry_count;
        `,
        [this.batchSize, this.staleLockSeconds, this.workerId],
      );
      return res as OutboxRow[];
    });
    return rows;
  }

  private async processOutbox(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const events = await this.claimBatch();
      if (events.length === 0) return;

      const results: Array<
        | { id: string; type: 'published' }
        | { id: string; type: 'retry'; nextAttemptAt: Date; error: string }
        | { id: string; type: 'dead_lettered'; deadLetterTopic: string; error: string }
      > = [];

      for (const e of events) {
        const key = `${e.aggregate_type}.${e.event_type}`;
        const topic = TOPIC_MAP[key];
        if (!topic) {
          results.push({
            id: e.id,
            type: 'dead_lettered',
            deadLetterTopic: 'outbox.unknown-topic',
            error: `No topic mapping for ${key}`,
          });
          continue;
        }

        const payload: JsonRecord = {
          eventId: e.id,
          aggregateId: e.aggregate_id,
          eventType: e.event_type,
          occurredAt: e.occurred_at,
          ...e.payload,
        };

        try {
          await this.kafkaService.publish(topic, payload, e.aggregate_id);
          results.push({ id: e.id, type: 'published' });
        } catch (err) {
          const errorMsg = String(err);
          const nextRetry = (e.retry_count || 0) + 1;

          if (nextRetry >= this.maxRetries) {
            const dlqTopic = `${topic}.outbox.dlq`;
            try {
              await this.kafkaService.publish(dlqTopic, {
                originalTopic: topic,
                outboxId: e.id,
                aggregateId: e.aggregate_id,
                error: errorMsg,
                payload,
                attempts: nextRetry,
                deadLetteredAt: new Date().toISOString(),
              });
              results.push({ id: e.id, type: 'dead_lettered', deadLetterTopic: dlqTopic, error: errorMsg });
            } catch (dlqErr) {
              // If DLQ publish fails, schedule a retry.
              const seconds = backoffSeconds(nextRetry);
              results.push({
                id: e.id,
                type: 'retry',
                nextAttemptAt: new Date(Date.now() + seconds * 1000),
                error: `DLQ publish failed: ${String(dlqErr)}; original error: ${errorMsg}`,
              });
            }
          } else {
            const seconds = backoffSeconds(nextRetry);
            results.push({
              id: e.id,
              type: 'retry',
              nextAttemptAt: new Date(Date.now() + seconds * 1000),
              error: errorMsg,
            });
          }
        }
      }

      await this.dataSource.transaction(async (manager) => {
        for (const r of results) {
          if (r.type === 'published') {
            await manager.query(
              `
              UPDATE outbox_events
              SET published_at = NOW(),
                  locked_at = NULL,
                  locked_by = NULL,
                  error = NULL
              WHERE id = $1;
              `,
              [r.id],
            );
          } else if (r.type === 'retry') {
            await manager.query(
              `
              UPDATE outbox_events
              SET retry_count = retry_count + 1,
                  error = $2,
                  next_attempt_at = $3,
                  locked_at = NULL,
                  locked_by = NULL
              WHERE id = $1;
              `,
              [r.id, r.error, r.nextAttemptAt.toISOString()],
            );
          } else {
            await manager.query(
              `
              UPDATE outbox_events
              SET dead_lettered_at = NOW(),
                  dead_letter_topic = $2,
                  published_at = NOW(),
                  error = $3,
                  locked_at = NULL,
                  locked_by = NULL
              WHERE id = $1;
              `,
              [r.id, r.deadLetterTopic, r.error],
            );
          }
        }
      });

      this.logger.log(`Processed outbox batch: ${events.length}`);
    } finally {
      this.isRunning = false;
    }
  }
}
