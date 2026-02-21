import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPaymentRepository, PAYMENT_REPOSITORY } from '../../Domain/repositories/IPaymentRepository';
import { Payment } from '../../Domain/aggregates/Payment.aggregate';
import { PaymentId, OrderId } from '../../Domain/value-objects/PaymentId';

export class GetPaymentByIdQuery { constructor(readonly paymentId: string) {} }
export class GetPaymentByOrderIdQuery { constructor(readonly orderId: string) {} }

@Injectable()
export class GetPaymentByIdHandler {
  constructor(@Inject(PAYMENT_REPOSITORY) private readonly repo: IPaymentRepository) {}
  async execute(q: GetPaymentByIdQuery): Promise<Payment> {
    const p = await this.repo.findById(PaymentId.from(q.paymentId));
    if (!p) throw new NotFoundException(`Payment ${q.paymentId} not found`);
    return p;
  }
}

@Injectable()
export class GetPaymentByOrderIdHandler {
  constructor(@Inject(PAYMENT_REPOSITORY) private readonly repo: IPaymentRepository) {}
  async execute(q: GetPaymentByOrderIdQuery): Promise<Payment | null> {
    return this.repo.findByOrderId(OrderId.from(q.orderId));
  }
}
