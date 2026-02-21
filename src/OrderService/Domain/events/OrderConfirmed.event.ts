import { DomainEvent } from '../../../../shared/kernel/DomainEvent';

export class OrderConfirmedEvent extends DomainEvent {
  readonly eventType = 'OrderConfirmedEvent';
  readonly aggregateId: string;

  constructor(
    readonly payload: {
      orderId: string;
      customerId: string;
      total: { amount: number; currency: string };
      occurredAt: string;
    },
  ) {
    super();
    this.aggregateId = payload.orderId;
  }
}
