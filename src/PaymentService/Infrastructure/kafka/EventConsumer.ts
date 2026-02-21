import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { KafkaService } from '../../../OrderService/Infrastructure/kafka/kafka.service';
import { OrderCancelledHandler } from '../../Application/event-handlers/OrderCancelledHandler';
import { ProcessPaymentHandler, ProcessPaymentCommand } from '../../Application/commands/ProcessPaymentCommand';

@Injectable()
export class EventConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(EventConsumer.name);

  constructor(
    private readonly kafka: KafkaService,
    private readonly processPaymentHandler: ProcessPaymentHandler,
    private readonly orderCancelledHandler: OrderCancelledHandler,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.kafka.subscribe('order.created', 'payment-service-order-created', async (p) => {
      const orderId = p.orderId as string | undefined;
      const customerId = p.customerId as string | undefined;
      const total = p.total as { amount: number; currency: string } | undefined;

      if (!orderId || !customerId || !total) {
        this.logger.warn('Received order.created but payload is missing fields');
        return;
      }

      const paymentMethodId = process.env.DEFAULT_PAYMENT_METHOD_ID ?? 'pm_simulated';

      this.logger.log(`Processing payment for order ${orderId} (${total.currency} ${total.amount})`);

      await this.processPaymentHandler.execute(
        new ProcessPaymentCommand(orderId, customerId, total.amount, total.currency, paymentMethodId),
      );
    });

    await this.kafka.subscribe('order.cancelled', 'payment-service-order-cancelled', async (p) => {
      await this.orderCancelledHandler.handle(p as { orderId: string; reason: string });
    });

    this.logger.log('PaymentService consumers started');
  }
}
