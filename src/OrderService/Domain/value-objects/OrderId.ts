import { v4 as uuidv4, validate } from 'uuid';
import { DomainError } from '../../../../shared/kernel/DomainError';

export class OrderId {
  private constructor(readonly value: string) {
    if (!validate(value)) throw new DomainError(`Invalid OrderId: "${value}"`);
    Object.freeze(this);
  }

  static generate(): OrderId { return new OrderId(uuidv4()); }
  static from(id: string): OrderId { return new OrderId(id); }
  equals(other: OrderId): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}
