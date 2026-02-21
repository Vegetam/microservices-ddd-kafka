import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// API
import { OrdersController } from './controllers/orders.controller';
import { HealthController } from './controllers/health.controller';

// Application
import { PlaceOrderHandler } from '../Application/commands/PlaceOrderCommand';
import { CancelOrderHandler } from '../Application/commands/CancelOrderCommand';
import { GetOrderByIdHandler, GetOrdersByCustomerHandler } from '../Application/queries/GetOrderQueries';
import { PaymentProcessedHandler } from '../Application/event-handlers/PaymentProcessedHandler';

// Domain
import { OrderPricingService } from '../Domain/services/OrderPricingService';
import { ORDER_REPOSITORY } from '../Domain/repositories/IOrderRepository';

// Infrastructure
import { OrderRepository } from '../Infrastructure/persistence/OrderRepository';
import { KafkaService } from '../Infrastructure/kafka/kafka.service';
import { EventConsumer } from '../Infrastructure/kafka/EventConsumer';
import { OutboxWorker } from '../Infrastructure/kafka/OutboxWorker';
import { OrderCacheService } from '../Infrastructure/cache/OrderCacheService';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ??
        process.env.ORDER_DATABASE_URL ??
        process.env.ORDER_DB_URL ??
        'postgresql://orders_user:orders_pass@localhost:5432/orders_db',
      synchronize: false,
      logging: false,
      entities: [],
    }),
  ],
  controllers: [OrdersController, HealthController],
  providers: [
    PlaceOrderHandler,
    CancelOrderHandler,
    GetOrderByIdHandler,
    GetOrdersByCustomerHandler,
    PaymentProcessedHandler,
    OrderPricingService,
    { provide: ORDER_REPOSITORY, useClass: OrderRepository },
    OrderRepository,
    KafkaService,
    EventConsumer,
    OutboxWorker,
    OrderCacheService,
  ],
})
export class OrdersModule {}
