import { v4 as uuidv4 } from 'uuid';
import { NotificationStatus, NotificationChannel } from '../enums/NotificationStatus';

export class Notification {
  readonly id: string;
  readonly recipientId: string;
  readonly channel: NotificationChannel;
  readonly subject: string;
  readonly body: string;
  status: NotificationStatus;
  readonly createdAt: Date;
  sentAt: Date | null;

  constructor(props: { recipientId: string; channel: NotificationChannel; subject: string; body: string }) {
    this.id = uuidv4();
    this.recipientId = props.recipientId;
    this.channel = props.channel;
    this.subject = props.subject;
    this.body = props.body;
    this.status = NotificationStatus.PENDING;
    this.createdAt = new Date();
    this.sentAt = null;
  }

  markSent(): void { this.status = NotificationStatus.SENT; this.sentAt = new Date(); }
  markFailed(): void { this.status = NotificationStatus.FAILED; }
}
