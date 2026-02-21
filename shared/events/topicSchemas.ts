import { z } from 'zod';

// Keep schemas intentionally tolerant (passthrough) so producers can add fields without breaking consumers.
const isoDateTime = z.string().min(10);

const money = z.object({
  amount: z.number(),
  currency: z.string().length(3),
});

const baseEvent = z
  .object({
    eventId: z.string().min(1),
    eventType: z.string().min(1),
    aggregateId: z.string().min(1),
    occurredAt: isoDateTime,
  })
  .passthrough();

// Topics used by this repo today.
export const TopicSchemas = {
  'order.created': baseEvent
    .extend({
      customerId: z.string().optional(),
      total: money.optional(),
      items: z
        .array(
          z
            .object({
              productId: z.string(),
              quantity: z.number().int().positive(),
              unitPrice: money,
            })
            .passthrough(),
        )
        .optional(),
    })
    .passthrough(),

  'payment.processed': baseEvent
    .extend({
      orderId: z.string().optional(),
      status: z.enum(['SUCCESS', 'FAILED']).optional(),
      amount: z.number().optional(),
      currency: z.string().length(3).optional(),
    })
    .passthrough(),

  'notification.sent': baseEvent.passthrough(),
} as const;

export type KnownTopic = keyof typeof TopicSchemas;
