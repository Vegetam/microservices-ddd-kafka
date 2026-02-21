import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// API
import { PaymentsController } from './controllers/payments.controller';
import { HealthController } from './controllers/health.controller';

// Application
import { ProcessPaymentHandler } from '../Application/commands/ProcessPaymentCommand';
import { RefundPaymentHandler } from '../Application/commands/RefundPaymentCommand';
import { GetPaymentByIdHandler, GetPaymentByOrderIdHandler } from '../Application/queries/GetPaymentQueries';
import { OrderCancelledHandler } from '../Application/event-handlers/OrderCancelledHandler';

// Domain
import { PAYMENT_REPOSITORY } from '../Domain/repositories/IPaymentRepository';

// Infrastructure
import { PaymentRepository } from '../Infrastructure/persistence/PaymentRepository';
import { KafkaService } from '../../OrderService/Infrastructure/kafka/kafka.service';
import { EventConsumer } from '../Infrastructure/kafka/EventConsumer';
import { OutboxWorker } from '../Infrastructure/kafka/OutboxWorker';
import { StripeAdapter } from '../Infrastructure/stripe/StripeAdapter';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ??
        process.env.PAYMENT_DATABASE_URL ??
        process.env.PAYMENT_DB_URL ??
        'postgresql://payments_user:payments_pass@localhost:5433/payments_db',
      synchronize: false,
      logging: false,
      entities: [],
    }),
  ],
  controllers: [PaymentsController, HealthController],
  providers: [
    ProcessPaymentHandler,
    RefundPaymentHandler,
    GetPaymentByIdHandler,
    GetPaymentByOrderIdHandler,
    OrderCancelledHandler,
    { provide: PAYMENT_REPOSITORY, useClass: PaymentRepository },
    PaymentRepository,
    KafkaService,
    EventConsumer,
    OutboxWorker,
    StripeAdapter,
  ],
})
export class PaymentServiceModule {}
