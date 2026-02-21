import { DomainEvent } from '../../../../shared/kernel/DomainEvent';

export class OrderCancelledEvent extends DomainEvent {
  readonly eventType = 'OrderCancelledEvent';
  readonly aggregateId: string;

  constructor(
    readonly payload: {
      orderId: string;
      customerId: string;
      reason: string;
      occurredAt: string;
    },
  ) {
    super();
    this.aggregateId = payload.orderId;
  }
}
