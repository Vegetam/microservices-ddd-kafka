import { Order } from '../aggregates/Order.aggregate';
import { OrderId } from '../value-objects/OrderId';
import { CustomerId } from '../value-objects/CustomerId';
import { OrderStatus } from '../enums/OrderStatus';

/**
 * Repository interface — lives in Domain, implemented in Infrastructure.
 * Domain never depends on TypeORM, Postgres, or any persistence framework.
 */
export interface IOrderRepository {
  /** Persist a new or updated Order AND write its domain events to the outbox — in one transaction */
  saveWithOutbox(order: Order): Promise<void>;

  findById(orderId: OrderId): Promise<Order | null>;

  findByCustomerId(customerId: CustomerId): Promise<Order[]>;

  findByStatus(status: OrderStatus): Promise<Order[]>;

  exists(orderId: OrderId): Promise<boolean>;
}

export const ORDER_REPOSITORY = Symbol('IOrderRepository');
