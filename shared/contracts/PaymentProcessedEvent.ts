import { DomainEvent } from '../kernel/DomainEvent';

export interface PaymentProcessedPayload {
  paymentId: string;
  orderId: string;
  customerId: string;
  amount: { amount: number; currency: string };
  occurredAt: string;
}

export class PaymentProcessedEvent extends DomainEvent {
  readonly eventType = 'PaymentProcessedEvent';
  readonly aggregateId: string;
  readonly payload: PaymentProcessedPayload;

  constructor(payload: PaymentProcessedPayload) {
    super();
    this.aggregateId = payload.paymentId;
    this.payload = payload;
  }
}
