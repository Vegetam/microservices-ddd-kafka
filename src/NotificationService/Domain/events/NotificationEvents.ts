import { DomainEvent } from '../../../../shared/kernel/DomainEvent';

export class NotificationSentEvent extends DomainEvent {
  readonly eventType = 'NotificationSentEvent';
  readonly aggregateId: string;
  constructor(readonly payload: { notificationId: string; recipientId: string; channel: string; occurredAt: string }) {
    super(); this.aggregateId = payload.notificationId;
  }
}
export class NotificationFailedEvent extends DomainEvent {
  readonly eventType = 'NotificationFailedEvent';
  readonly aggregateId: string;
  constructor(readonly payload: { notificationId: string; recipientId: string; reason: string; occurredAt: string }) {
    super(); this.aggregateId = payload.notificationId;
  }
}
