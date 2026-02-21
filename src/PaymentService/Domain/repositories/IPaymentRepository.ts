import { Payment } from '../aggregates/Payment.aggregate';
import { PaymentId, OrderId } from '../value-objects/PaymentId';

export interface IPaymentRepository {
  saveWithOutbox(payment: Payment): Promise<void>;
  findById(paymentId: PaymentId): Promise<Payment | null>;
  findByOrderId(orderId: OrderId): Promise<Payment | null>;
}
export const PAYMENT_REPOSITORY = Symbol('IPaymentRepository');
