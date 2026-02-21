import { Order } from '../../Domain/aggregates/Order.aggregate';
import { OrderStatus } from '../../Domain/enums/OrderStatus';

export interface OrderRow {
  id: string;
  customer_id: string;
  status: string;
  items: string | Array<{ productId: string; quantity: number; unitPrice: { amount: number; currency: string } }>;
  total_amount: string | number;
  total_currency: string;
  created_at: Date;
  updated_at: Date;
}

export class OrderMapper {
  static toDomain(row: OrderRow): Order {
    const items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
    return Order.reconstitute({
      id: row.id,
      customerId: row.customer_id,
      status: row.status as OrderStatus,
      items: items.map((i: { productId: string; quantity: number; unitPrice: { amount: number; currency: string } }) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      total: { amount: parseFloat(String(row.total_amount)), currency: row.total_currency },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  static toPersistence(order: Order) {
    return {
      id: order.id.value,
      customerId: order.customerId.value,
      status: order.status,
      items: order.items.map(i => ({
        productId: i.productId.value,
        quantity: i.quantity.value,
        unitPrice: { amount: i.unitPrice.amount, currency: i.unitPrice.currency },
      })),
      totalAmount: order.total.amount,
      totalCurrency: order.total.currency,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}