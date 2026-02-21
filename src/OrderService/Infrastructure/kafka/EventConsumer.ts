import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { PaymentProcessedHandler } from '../../Application/event-handlers/PaymentProcessedHandler';

/**
 * EventConsumer subscribes to Kafka topics and routes messages
 * to the appropriate Application layer event handlers.
 */
@Injectable()
export class EventConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(EventConsumer.name);

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly paymentProcessedHandler: PaymentProcessedHandler,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.subscribeToPaymentEvents();
    this.logger.log('OrderService Kafka consumers started');
  }

  private async subscribeToPaymentEvents(): Promise<void> {
    await this.kafkaService.subscribe(
      'payment.processed',
      'order-service-payment-processed',
      async (payload) => {
        this.logger.log(`Received payment.processed for order ${payload.orderId as string}`);
        await this.paymentProcessedHandler.handle(payload as { orderId: string; paymentId: string });
      },
    );

    await this.kafkaService.subscribe(
      'payment.failed',
      'order-service-payment-failed',
      async (payload) => {
        this.logger.warn(`Received payment.failed for order ${payload.orderId as string}`);
        await this.paymentProcessedHandler.handleFailed(
          payload as { orderId: string; reason: string },
        );
      },
    );
  }
}
