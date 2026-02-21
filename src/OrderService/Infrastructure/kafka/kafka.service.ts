import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { TopicSchemas } from '../../../../shared/events/topicSchemas';

type JsonRecord = Record<string, unknown>;

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function backoffMs(attempt: number, baseMs = 200, maxMs = 10_000): number {
  const exp = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * 100);
  return exp + jitter;
}

@Injectable()
export class KafkaService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(KafkaService.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private consumer?: Consumer;

  constructor() {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);

    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'microservices-ddd-kafka',
      brokers,
      logLevel: logLevel.NOTHING,
    });

    this.producer = this.kafka.producer({
      idempotent: true,
      allowAutoTopicCreation: true,
      maxInFlightRequests: 1,
      retry: {
        retries: 8,
      },
    });
  }

  async onApplicationBootstrap() {
    await this.producer.connect();
    this.logger.log('Kafka producer connected');
  }

  async onApplicationShutdown() {
    if (this.consumer) {
      try {
        await this.consumer.disconnect();
      } catch (e) {
        this.logger.warn(`Kafka consumer disconnect error: ${String(e)}`);
      }
    }

    try {
      await this.producer.disconnect();
    } catch (e) {
      this.logger.warn(`Kafka producer disconnect error: ${String(e)}`);
    }
  }

  async publish(topic: string, payload: JsonRecord, key?: string): Promise<void> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-event-type': String(payload.eventType || ''),
      'x-event-id': String(payload.eventId || ''),
    };

    await this.producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(payload),
          headers,
        },
      ],
    });
  }

  /**
   * Robust-ish consumer:
   * - schema validation by topic (zod)
   * - retry with backoff
   * - DLQ after max retries
   * - manual commits: commit only after success (or after sending to DLQ)
   */
  async subscribe(
    topic: string,
    groupId: string,
    handler: (payload: JsonRecord) => Promise<void>,
  ): Promise<void> {
    if (this.consumer) {
      throw new Error('KafkaService currently supports a single consumer instance per process');
    }

    const maxRetries = Number(process.env.KAFKA_MAX_RETRIES || 5);
    const dlqTopic = `${topic}.dlq`;

    this.consumer = this.kafka.consumer({
      groupId,
      allowAutoTopicCreation: true,
    });

    await this.consumer.connect();
    await this.consumer.subscribe({ topic, fromBeginning: false });

    this.logger.log(`Kafka consumer connected: topic=${topic} group=${groupId}`);

    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        const offsetToCommit = (BigInt(message.offset) + 1n).toString();

        const raw = message.value?.toString('utf8') ?? '';
        if (!raw) {
          this.logger.warn(`Empty Kafka message: ${topic}@${partition}:${message.offset}`);
          await this.consumer!.commitOffsets([{ topic, partition, offset: offsetToCommit }]);
          return;
        }

        let parsed: JsonRecord;
        try {
          parsed = JSON.parse(raw) as JsonRecord;
        } catch (e) {
          await this.sendToDlq(dlqTopic, {
            originalTopic: topic,
            originalPartition: partition,
            originalOffset: message.offset,
            error: `Invalid JSON: ${String(e)}`,
            raw,
            receivedAt: new Date().toISOString(),
          });
          await this.consumer!.commitOffsets([{ topic, partition, offset: offsetToCommit }]);
          return;
        }

        // Optional schema validation by topic
        const schema = (TopicSchemas as Record<string, any>)[topic];
        if (schema) {
          try {
            schema.parse(parsed);
          } catch (e) {
            await this.sendToDlq(dlqTopic, {
              originalTopic: topic,
              originalPartition: partition,
              originalOffset: message.offset,
              error: `Schema validation failed: ${String(e)}`,
              payload: parsed,
              receivedAt: new Date().toISOString(),
            });
            await this.consumer!.commitOffsets([{ topic, partition, offset: offsetToCommit }]);
            return;
          }
        }

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            await handler(parsed);
            await this.consumer!.commitOffsets([{ topic, partition, offset: offsetToCommit }]);
            return;
          } catch (err) {
            const msg = String(err);
            const isLast = attempt >= maxRetries;
            this.logger.error(
              `Kafka handler error (attempt ${attempt}/${maxRetries}) for ${topic}@${partition}:${message.offset}: ${msg}`,
            );

            if (isLast) {
              await this.sendToDlq(dlqTopic, {
                originalTopic: topic,
                originalPartition: partition,
                originalOffset: message.offset,
                error: msg,
                payload: parsed,
                attempts: attempt,
                receivedAt: new Date().toISOString(),
              });

              await this.consumer!.commitOffsets([{ topic, partition, offset: offsetToCommit }]);
              return;
            }

            await sleep(backoffMs(attempt));
          }
        }
      },
    });
  }

  private async sendToDlq(topic: string, payload: JsonRecord): Promise<void> {
    try {
      await this.publish(topic, payload, String(payload.originalOffset || ''));
      this.logger.warn(`Sent message to DLQ: ${topic}`);
    } catch (e) {
      // If DLQ publish fails, we log and let the original consumer retry naturally.
      this.logger.error(`Failed to publish to DLQ ${topic}: ${String(e)}`);
      throw e;
    }
  }
}
