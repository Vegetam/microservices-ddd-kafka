import { AggregateRoot } from '../../../../shared/kernel/AggregateRoot';
import { DomainError } from '../../../../shared/kernel/DomainError';
import { PaymentId, OrderId, CustomerId, StripeChargeId } from '../value-objects/PaymentId';
import { Money } from '../value-objects/Money';
import { PaymentStatus } from '../enums/PaymentStatus';
import {
  PaymentProcessedEvent, PaymentFailedEvent,
  PaymentRefundedEvent,
} from '../events/PaymentEvents';

export class Payment extends AggregateRoot<PaymentId> {
  private constructor(
    private readonly _id: PaymentId,
    private readonly _orderId: OrderId,
    private readonly _customerId: CustomerId,
    private _status: PaymentStatus,
    private readonly _amount: Money,
    private _stripeChargeId: StripeChargeId | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) { super(); }

  static initiate(orderId: OrderId, customerId: CustomerId, amount: Money): Payment {
    if (amount.amount <= 0) throw new DomainError('Payment amount must be positive');
    const now = new Date();
    return new Payment(
      PaymentId.generate(), orderId, customerId,
      PaymentStatus.PENDING, amount, null, now, now,
    );
  }

  static reconstitute(props: {
    id: string; orderId: string; customerId: string; status: PaymentStatus;
    amount: { amount: number; currency: string }; stripeChargeId: string | null;
    createdAt: Date; updatedAt: Date;
  }): Payment {
    return new Payment(
      PaymentId.from(props.id), OrderId.from(props.orderId),
      CustomerId.from(props.customerId), props.status,
      Money.of(props.amount.amount, props.amount.currency),
      props.stripeChargeId ? StripeChargeId.from(props.stripeChargeId) : null,
      props.createdAt, props.updatedAt,
    );
  }

  markProcessed(stripeChargeId: StripeChargeId): void {
    if (this._status !== PaymentStatus.PENDING) {
      throw new DomainError(`Cannot process payment in status ${this._status}`);
    }
    this._status = PaymentStatus.PROCESSED;
    this._stripeChargeId = stripeChargeId;
    this._updatedAt = new Date();
    this.addDomainEvent(new PaymentProcessedEvent({
      paymentId: this._id.value, orderId: this._orderId.value,
      customerId: this._customerId.value,
      amount: { amount: this._amount.amount, currency: this._amount.currency },
      occurredAt: this._updatedAt.toISOString(),
    }));
  }

  markFailed(reason: string): void {
    if (this._status !== PaymentStatus.PENDING) {
      throw new DomainError(`Cannot fail payment in status ${this._status}`);
    }
    this._status = PaymentStatus.FAILED;
    this._updatedAt = new Date();
    this.addDomainEvent(new PaymentFailedEvent({
      paymentId: this._id.value, orderId: this._orderId.value,
      reason, occurredAt: this._updatedAt.toISOString(),
    }));
  }

  refund(): void {
    if (this._status !== PaymentStatus.PROCESSED && this._status !== PaymentStatus.CAPTURED) {
      throw new DomainError(`Cannot refund payment in status ${this._status}`);
    }
    this._status = PaymentStatus.REFUNDED;
    this._updatedAt = new Date();
    this.addDomainEvent(new PaymentRefundedEvent({
      paymentId: this._id.value, orderId: this._orderId.value,
      amount: { amount: this._amount.amount, currency: this._amount.currency },
      occurredAt: this._updatedAt.toISOString(),
    }));
  }

  get id(): PaymentId { return this._id; }
  get orderId(): OrderId { return this._orderId; }
  get customerId(): CustomerId { return this._customerId; }
  get status(): PaymentStatus { return this._status; }
  get amount(): Money { return this._amount; }
  get stripeChargeId(): StripeChargeId | null { return this._stripeChargeId; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
}
