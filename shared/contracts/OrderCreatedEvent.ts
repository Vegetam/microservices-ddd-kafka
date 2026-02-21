import { DomainEvent } from '../kernel/DomainEvent';

export interface OrderCreatedPayload {
  orderId: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: { amount: number; currency: string };
  }>;
  total: { amount: number; currency: string };
  occurredAt: string;
}

export class OrderCreatedEvent extends DomainEvent {
  readonly eventType = 'OrderCreatedEvent';
  readonly aggregateId: string;
  readonly payload: OrderCreatedPayload;

  constructor(payload: OrderCreatedPayload) {
    super();
    this.aggregateId = payload.orderId;
    this.payload = payload;
  }
}
