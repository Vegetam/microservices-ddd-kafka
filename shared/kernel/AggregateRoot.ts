import { DomainEvent } from './DomainEvent';

/**
 * Base class for all Aggregate Roots.
 * Collects domain events raised during a business operation.
 * Events are cleared after being persisted to the Outbox table.
 */
export abstract class AggregateRoot<TId> {
  private _domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  hasUnpublishedEvents(): boolean {
    return this._domainEvents.length > 0;
  }
}
