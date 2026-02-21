import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { Order } from '../../Domain/aggregates/Order.aggregate';

const ORDER_CACHE_TTL_SECONDS = 300; // 5 minutes
const CACHE_PREFIX = 'order:';

@Injectable()
export class OrderCacheService {
  private readonly logger = new Logger(OrderCacheService.name);
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD ?? undefined,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
    });
    this.redis.on('error', (err: unknown) => this.logger.error('Redis error', err));
  }

  async set(order: Order): Promise<void> {
    try {
      const key = `${CACHE_PREFIX}${order.id.value}`;
      const value = JSON.stringify({
        id: order.id.value,
        customerId: order.customerId.value,
        status: order.status,
        total: { amount: order.total.amount, currency: order.total.currency },
        itemCount: order.items.length,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      });
      await this.redis.set(key, value, 'EX', ORDER_CACHE_TTL_SECONDS);
    } catch (err) {
      // Cache failures are non-fatal — log and continue
      this.logger.warn(`Cache write failed for order ${order.id.value}`, err);
    }
  }

  async get(orderId: string): Promise<Record<string, unknown> | null> {
    try {
      const value = await this.redis.get(`${CACHE_PREFIX}${orderId}`);
      return value ? (JSON.parse(value) as Record<string, unknown>) : null;
    } catch (err) {
      this.logger.warn(`Cache read failed for order ${orderId}`, err);
      return null;
    }
  }

  async invalidate(orderId: string): Promise<void> {
    try {
      await this.redis.del(`${CACHE_PREFIX}${orderId}`);
    } catch (err) {
      this.logger.warn(`Cache invalidation failed for order ${orderId}`, err);
    }
  }
}
