import { DomainEvent } from '../../../../shared/kernel/DomainEvent';

export class OrderCreatedEvent extends DomainEvent {
  readonly eventType = 'OrderCreatedEvent';
  readonly aggregateId: string;

  constructor(
    readonly payload: {
      orderId: string;
      customerId: string;
      items: Array<{
        productId: string;
        quantity: number;
        unitPrice: { amount: number; currency: string };
      }>;
      total: { amount: number; currency: string };
      occurredAt: string;
    },
  ) {
    super();
    this.aggregateId = payload.orderId;
  }
}
