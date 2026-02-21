import { Injectable, Logger } from '@nestjs/common';
import { SendGridAdapter } from '../../Infrastructure/email/SendGridAdapter';
import { TwilioAdapter } from '../../Infrastructure/sms/TwilioAdapter';

@Injectable()
export class OrderConfirmedHandler {
  private readonly logger = new Logger(OrderConfirmedHandler.name);
  constructor(private readonly email: SendGridAdapter, private readonly sms: TwilioAdapter) {}

  async handle(payload: { orderId: string; customerId: string; total: { amount: number; currency: string } }): Promise<void> {
    this.logger.log(`Sending confirmation for order ${payload.orderId}`);
    await this.email.send({
      to: `customer-${payload.customerId}@example.com`,
      subject: '✅ Your order is confirmed!',
      html: `<h1>Order Confirmed</h1><p>Order <strong>${payload.orderId}</strong> — ${payload.total.currency} ${payload.total.amount}</p>`,
    });
  }
}
