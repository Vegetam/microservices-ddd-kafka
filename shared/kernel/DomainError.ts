/**
 * Domain-specific error — thrown when a business rule / invariant is violated.
 * NOT an infrastructure error — never wraps technical exceptions.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}
