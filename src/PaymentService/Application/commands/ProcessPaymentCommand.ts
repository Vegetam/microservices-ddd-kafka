import { Inject, Injectable } from '@nestjs/common';
import { IPaymentRepository, PAYMENT_REPOSITORY } from '../../Domain/repositories/IPaymentRepository';
import { Payment } from '../../Domain/aggregates/Payment.aggregate';
import { OrderId, CustomerId, StripeChargeId } from '../../Domain/value-objects/PaymentId';
import { Money } from '../../Domain/value-objects/Money';
import { StripeAdapter } from '../../Infrastructure/stripe/StripeAdapter';

export class ProcessPaymentCommand {
  constructor(
    readonly orderId: string, readonly customerId: string,
    readonly amount: number, readonly currency: string, readonly paymentMethodId: string,
  ) {}
}

@Injectable()
export class ProcessPaymentHandler {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly repo: IPaymentRepository,
    private readonly stripe: StripeAdapter,
  ) {}

  async execute(cmd: ProcessPaymentCommand): Promise<string> {
    const payment = Payment.initiate(
      OrderId.from(cmd.orderId), CustomerId.from(cmd.customerId),
      Money.of(cmd.amount, cmd.currency),
    );
    try {
      const chargeId = await this.stripe.charge(cmd.amount, cmd.currency, cmd.paymentMethodId);
      payment.markProcessed(StripeChargeId.from(chargeId));
    } catch (err) {
      payment.markFailed(String(err));
    }
    await this.repo.saveWithOutbox(payment);
    return payment.id.value;
  }
}
