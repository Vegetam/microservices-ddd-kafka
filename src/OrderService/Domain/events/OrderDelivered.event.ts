import { DomainEvent } from '../../../../shared/kernel/DomainEvent';

export class OrderDeliveredEvent extends DomainEvent {
  readonly eventType = 'OrderDeliveredEvent';
  readonly aggregateId: string;

  constructor(
    readonly payload: {
      orderId: string;
      customerId: string;
      occurredAt: string;
    },
  ) {
    super();
    this.aggregateId = payload.orderId;
  }
}
