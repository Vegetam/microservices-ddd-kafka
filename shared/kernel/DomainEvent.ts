import { v4 as uuidv4 } from 'uuid';

/**
 * Base class for all Domain Events.
 * Every event carries a unique ID, aggregate ID, and timestamp.
 */
export abstract class DomainEvent {
  readonly eventId: string;
  readonly occurredAt: string;
  abstract readonly eventType: string;
  abstract readonly aggregateId: string;

  constructor() {
    this.eventId = uuidv4();
    this.occurredAt = new Date().toISOString();
  }
}
