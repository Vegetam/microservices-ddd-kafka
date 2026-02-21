import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class StripeAdapter {
  private readonly logger = new Logger(StripeAdapter.name);

  async charge(amount: number, currency: string, paymentMethodId: string): Promise<string> {
    // Replace with: const charge = await stripe.paymentIntents.create({...})
    this.logger.log(`Charging ${currency} ${amount} via method ${paymentMethodId}`);
    return `ch_simulated_${Date.now()}`;
  }

  async refund(chargeId: string): Promise<void> {
    // Replace with: await stripe.refunds.create({ charge: chargeId })
    this.logger.log(`Refunding charge ${chargeId}`);
  }
}
