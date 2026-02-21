import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IOrderRepository } from '../../Domain/repositories/IOrderRepository';
import { Order } from '../../Domain/aggregates/Order.aggregate';
import { OrderId } from '../../Domain/value-objects/OrderId';
import { CustomerId } from '../../Domain/value-objects/CustomerId';
import { OrderStatus } from '../../Domain/enums/OrderStatus';
import { OrderMapper } from './OrderMapper';
import { DomainEvent } from '../../../../shared/kernel/DomainEvent';

@Injectable()
export class OrderRepository implements IOrderRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Persist Order + domain events in ONE transaction — outbox guarantee */
  async saveWithOutbox(order: Order): Promise<void> {
    const raw = OrderMapper.toPersistence(order);
    const events = order.getDomainEvents();

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO orders (id, customer_id, status, items, total_amount, total_currency, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status, items = EXCLUDED.items, updated_at = EXCLUDED.updated_at`,
        [raw.id, raw.customerId, raw.status, JSON.stringify(raw.items),
         raw.totalAmount, raw.totalCurrency, raw.createdAt, raw.updatedAt],
      );
      for (const event of events) {
        await manager.query(
          `INSERT INTO outbox_events (aggregate_id, aggregate_type, event_type, payload, occurred_at)
           VALUES ($1, 'Order', $2, $3, $4)`,
          [order.id.value, event.eventType, JSON.stringify((event as any).payload ?? event), new Date()],
        );
      }
    });

    order.clearDomainEvents();
  }

  async findById(orderId: OrderId): Promise<Order | null> {
    const rows = await this.dataSource.query('SELECT * FROM orders WHERE id = $1', [orderId.value]);
    return rows.length === 0 ? null : OrderMapper.toDomain(rows[0]);
  }

  async findByCustomerId(customerId: CustomerId): Promise<Order[]> {
    const rows = await this.dataSource.query(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC', [customerId.value]);
    return rows.map(OrderMapper.toDomain);
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    const rows = await this.dataSource.query(
      'SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC', [status]);
    return rows.map(OrderMapper.toDomain);
  }

  async exists(orderId: OrderId): Promise<boolean> {
    const rows = await this.dataSource.query('SELECT 1 FROM orders WHERE id = $1', [orderId.value]);
    return rows.length > 0;
  }
}
