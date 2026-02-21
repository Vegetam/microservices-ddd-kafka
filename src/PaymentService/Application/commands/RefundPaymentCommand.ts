import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPaymentRepository, PAYMENT_REPOSITORY } from '../../Domain/repositories/IPaymentRepository';
import { PaymentId } from '../../Domain/value-objects/PaymentId';
import { StripeAdapter } from '../../Infrastructure/stripe/StripeAdapter';

export class RefundPaymentCommand { constructor(readonly paymentId: string) {} }

@Injectable()
export class RefundPaymentHandler {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly repo: IPaymentRepository,
    private readonly stripe: StripeAdapter,
  ) {}
  async execute(cmd: RefundPaymentCommand): Promise<void> {
    const payment = await this.repo.findById(PaymentId.from(cmd.paymentId));
    if (!payment) throw new NotFoundException(`Payment ${cmd.paymentId} not found`);
    if (payment.stripeChargeId) await this.stripe.refund(payment.stripeChargeId.value);
    payment.refund();
    await this.repo.saveWithOutbox(payment);
  }
}
