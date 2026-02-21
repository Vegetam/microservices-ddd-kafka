import { v4 as uuidv4, validate } from 'uuid';
import { DomainError } from '../../../../shared/kernel/DomainError';

export class CustomerId {
  private constructor(readonly value: string) {
    if (!validate(value)) throw new DomainError(`Invalid CustomerId: "${value}"`);
    Object.freeze(this);
  }

  static generate(): CustomerId { return new CustomerId(uuidv4()); }
  static from(id: string): CustomerId { return new CustomerId(id); }
  equals(other: CustomerId): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}
