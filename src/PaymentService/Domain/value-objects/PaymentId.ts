import { v4 as uuidv4, validate } from 'uuid';
import { DomainError } from '../../../../shared/kernel/DomainError';

export class PaymentId {
  private constructor(readonly value: string) {
    if (!validate(value)) throw new DomainError(`Invalid PaymentId: "${value}"`);
    Object.freeze(this);
  }
  static generate(): PaymentId { return new PaymentId(uuidv4()); }
  static from(id: string): PaymentId { return new PaymentId(id); }
  equals(other: PaymentId): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}

export class OrderId {
  private constructor(readonly value: string) {
    if (!validate(value)) throw new DomainError(`Invalid OrderId: "${value}"`);
    Object.freeze(this);
  }
  static from(id: string): OrderId { return new OrderId(id); }
  equals(other: OrderId): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}

export class CustomerId {
  private constructor(readonly value: string) {
    if (!validate(value)) throw new DomainError(`Invalid CustomerId: "${value}"`);
    Object.freeze(this);
  }
  static from(id: string): CustomerId { return new CustomerId(id); }
  toString(): string { return this.value; }
}

export class StripeChargeId {
  private constructor(readonly value: string) {
    if (!value || value.trim().length === 0) throw new DomainError('StripeChargeId cannot be empty');
    Object.freeze(this);
  }
  static from(id: string): StripeChargeId { return new StripeChargeId(id); }
  toString(): string { return this.value; }
}
