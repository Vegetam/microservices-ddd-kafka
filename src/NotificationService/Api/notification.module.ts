import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { HealthController } from './controllers/health.controller';
import { OrderConfirmedHandler } from '../Application/event-handlers/OrderConfirmedHandler';
import { OrderCancelledHandler } from '../Application/event-handlers/OrderCancelledHandler';
import { EventConsumer } from '../Infrastructure/kafka/EventConsumer';
import { SendGridAdapter } from '../Infrastructure/email/SendGridAdapter';
import { TwilioAdapter } from '../Infrastructure/sms/TwilioAdapter';
import { KafkaService } from '../../OrderService/Infrastructure/kafka/kafka.service';

@Module({
  controllers: [NotificationsController, HealthController],
  providers: [
    OrderConfirmedHandler,
    OrderCancelledHandler,
    EventConsumer,
    SendGridAdapter,
    TwilioAdapter,
    KafkaService,
  ],
})
export class NotificationServiceModule {}
