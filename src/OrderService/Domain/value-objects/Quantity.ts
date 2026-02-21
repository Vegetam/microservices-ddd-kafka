import { DomainError } from '../../../../shared/kernel/DomainError';

export class Quantity {
  private constructor(readonly value: number) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new DomainError(`Quantity must be a positive integer, got: ${value}`);
    }
    Object.freeze(this);
  }

  static of(value: number): Quantity { return new Quantity(value); }

  add(other: Quantity): Quantity { return new Quantity(this.value + other.value); }

  subtract(other: Quantity): Quantity {
    const result = this.value - other.value;
    if (result <= 0) throw new DomainError(`Quantity subtraction would result in non-positive value: ${result}`);
    return new Quantity(result);
  }

  equals(other: Quantity): boolean { return this.value === other.value; }

  toString(): string { return String(this.value); }
}
