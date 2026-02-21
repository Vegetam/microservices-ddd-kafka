import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IPaymentRepository } from '../../Domain/repositories/IPaymentRepository';
import { Payment } from '../../Domain/aggregates/Payment.aggregate';
import { PaymentId, OrderId } from '../../Domain/value-objects/PaymentId';
import { Money } from '../../Domain/value-objects/Money';
import { PaymentStatus } from '../../Domain/enums/PaymentStatus';
import { StripeChargeId } from '../../Domain/value-objects/PaymentId';

@Injectable()
export class PaymentRepository implements IPaymentRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async saveWithOutbox(payment: Payment): Promise<void> {
    const events = payment.getDomainEvents();
    await this.ds.transaction(async (m) => {
      await m.query(
        `INSERT INTO payments (id, order_id, customer_id, status, amount, currency, stripe_charge_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET
           status=EXCLUDED.status, stripe_charge_id=EXCLUDED.stripe_charge_id, updated_at=EXCLUDED.updated_at`,
        [payment.id.value, payment.orderId.value, payment.customerId.value, payment.status,
         payment.amount.amount, payment.amount.currency,
         payment.stripeChargeId?.value ?? null, payment.createdAt, payment.updatedAt],
      );
      for (const e of events) {
        await m.query(
          `INSERT INTO outbox_events (aggregate_id, aggregate_type, event_type, payload, occurred_at)
           VALUES ($1,'Payment',$2,$3,$4)`,
          [payment.id.value, e.eventType, JSON.stringify((e as any).payload ?? e), new Date()],
        );
      }
    });
    payment.clearDomainEvents();
  }

  async findById(id: PaymentId): Promise<Payment | null> {
    const rows = await this.ds.query('SELECT * FROM payments WHERE id=$1', [id.value]);
    return rows.length === 0 ? null : this.toDomain(rows[0]);
  }

  async findByOrderId(orderId: OrderId): Promise<Payment | null> {
    const rows = await this.ds.query('SELECT * FROM payments WHERE order_id=$1', [orderId.value]);
    return rows.length === 0 ? null : this.toDomain(rows[0]);
  }

  private toDomain(row: any): Payment {
    return Payment.reconstitute({
      id: row.id, orderId: row.order_id, customerId: row.customer_id,
      status: row.status as PaymentStatus,
      amount: { amount: parseFloat(row.amount), currency: row.currency },
      stripeChargeId: row.stripe_charge_id ?? null,
      createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    });
  }
}
