import { DomainError } from '../../../../shared/kernel/DomainError';

export class Money {
  private constructor(readonly amount: number, readonly currency: string) {
    if (amount < 0) throw new DomainError(`Money amount cannot be negative, got: ${amount}`);
    Object.freeze(this);
  }
  static of(amount: number, currency: string): Money {
    return new Money(Math.round(amount * 100) / 100, currency);
  }
  multiply(factor: number): Money {
    return new Money(Math.round(this.amount * factor * 100) / 100, this.currency);
  }
  equals(other: Money): boolean { return this.amount === other.amount && this.currency === other.currency; }
  toString(): string { return `${this.currency} ${this.amount.toFixed(2)}`; }
}
