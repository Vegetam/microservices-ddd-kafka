import { DomainError } from '../../../../shared/kernel/DomainError';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF'] as const;
type Currency = typeof SUPPORTED_CURRENCIES[number];

export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: string,
  ) {
    if (amount < 0) throw new DomainError(`Money amount cannot be negative, got: ${amount}`);
    if (!SUPPORTED_CURRENCIES.includes(currency as Currency)) {
      throw new DomainError(`Unsupported currency: "${currency}". Supported: ${SUPPORTED_CURRENCIES.join(', ')}`);
    }
    Object.freeze(this);
  }

  static of(amount: number, currency: string): Money {
    return new Money(Math.round(amount * 100) / 100, currency);
  }

  static sum(moneys: Money[]): Money {
    if (moneys.length === 0) throw new DomainError('Cannot sum an empty list of Money');
    const currency = moneys[0].currency;
    if (!moneys.every(m => m.currency === currency)) {
      throw new DomainError('Cannot sum Money values with different currencies');
    }
    const total = moneys.reduce((acc, m) => acc + m.amount, 0);
    return new Money(Math.round(total * 100) / 100, currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) throw new DomainError(`Cannot multiply Money by negative factor: ${factor}`);
    return new Money(Math.round(this.amount * factor * 100) / 100, this.currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new DomainError(`Currency mismatch on add: ${this.currency} vs ${other.currency}`);
    }
    return new Money(Math.round((this.amount + other.amount) * 100) / 100, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new DomainError(`Currency mismatch on subtract: ${this.currency} vs ${other.currency}`);
    }
    const result = Math.round((this.amount - other.amount) * 100) / 100;
    if (result < 0) throw new DomainError('Money subtraction would result in a negative amount');
    return new Money(result, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    if (this.currency !== other.currency) throw new DomainError('Cannot compare Money with different currencies');
    return this.amount > other.amount;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toString(): string { return `${this.currency} ${this.amount.toFixed(2)}`; }
}
