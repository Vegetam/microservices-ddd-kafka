import { DomainEvent } from '../../../../shared/kernel/DomainEvent';

export class PaymentProcessedEvent extends DomainEvent {
  readonly eventType = 'PaymentProcessedEvent';
  readonly aggregateId: string;
  constructor(readonly payload: {
    paymentId: string; orderId: string; customerId: string;
    amount: { amount: number; currency: string }; occurredAt: string;
  }) { super(); this.aggregateId = payload.paymentId; }
}

export class PaymentFailedEvent extends DomainEvent {
  readonly eventType = 'PaymentFailedEvent';
  readonly aggregateId: string;
  constructor(readonly payload: {
    paymentId: string; orderId: string; reason: string; occurredAt: string;
  }) { super(); this.aggregateId = payload.paymentId; }
}

export class PaymentRefundedEvent extends DomainEvent {
  readonly eventType = 'PaymentRefundedEvent';
  readonly aggregateId: string;
  constructor(readonly payload: {
    paymentId: string; orderId: string;
    amount: { amount: number; currency: string }; occurredAt: string;
  }) { super(); this.aggregateId = payload.paymentId; }
}

export class PaymentCapturedEvent extends DomainEvent {
  readonly eventType = 'PaymentCapturedEvent';
  readonly aggregateId: string;
  constructor(readonly payload: {
    paymentId: string; orderId: string; occurredAt: string;
  }) { super(); this.aggregateId = payload.paymentId; }
}
