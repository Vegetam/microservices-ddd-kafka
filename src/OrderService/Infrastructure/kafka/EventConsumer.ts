import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { KafkaService } from '../../../OrderService/Infrastructure/kafka/kafka.service';
import { OrderConfirmedHandler } from '../../Application/event-handlers/OrderConfirmedHandler';
import { OrderCancelledHandler } from '../../Application/event-handlers/OrderCancelledHandler';

type OrderConfirmedPayload = { orderId: string; customerId: string; total: { amount: number; currency: string } };
type OrderCancelledPayload = { orderId: string; customerId: string; reason: string };

@Injectable()
export class EventConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(EventConsumer.name);
  constructor(
    private readonly kafka: KafkaService,
    private readonly confirmedHandler: OrderConfirmedHandler,
    private readonly cancelledHandler: OrderCancelledHandler,
  ) {}
  async onApplicationBootstrap(): Promise<void> {
    await this.kafka.subscribe('order.confirmed', 'notif-order-confirmed',
      async (p) => this.confirmedHandler.handle(p as OrderConfirmedPayload));
    await this.kafka.subscribe('order.cancelled', 'notif-order-cancelled',
      async (p) => this.cancelledHandler.handle(p as OrderCancelledPayload));
    this.logger.log('NotificationService consumers started');
  }
}
