import { Inject, Injectable, Logger } from '@nestjs/common';
import { IPaymentRepository, PAYMENT_REPOSITORY } from '../../Domain/repositories/IPaymentRepository';
import { OrderId } from '../../Domain/value-objects/PaymentId';
import { StripeAdapter } from '../../Infrastructure/stripe/StripeAdapter';

@Injectable()
export class OrderCancelledHandler {
  private readonly logger = new Logger(OrderCancelledHandler.name);
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly repo: IPaymentRepository,
    private readonly stripe: StripeAdapter,
  ) {}
  async handle(payload: { orderId: string; reason: string }): Promise<void> {
    const payment = await this.repo.findByOrderId(OrderId.from(payload.orderId));
    if (!payment) { this.logger.warn(`No payment for order ${payload.orderId}`); return; }
    if (payment.stripeChargeId) await this.stripe.refund(payment.stripeChargeId.value);
    payment.refund();
    await this.repo.saveWithOutbox(payment);
    this.logger.log(`↩️ Auto-refunded payment for cancelled order ${payload.orderId}`);
  }
}
