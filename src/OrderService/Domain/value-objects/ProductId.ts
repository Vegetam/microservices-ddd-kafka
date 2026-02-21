import { v4 as uuidv4, validate } from 'uuid';
import { DomainError } from '../../../../shared/kernel/DomainError';

export class ProductId {
  private constructor(readonly value: string) {
    if (!validate(value)) throw new DomainError(`Invalid ProductId: "${value}"`);
    Object.freeze(this);
  }

  static generate(): ProductId { return new ProductId(uuidv4()); }
  static from(id: string): ProductId { return new ProductId(id); }
  equals(other: ProductId): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}
