import { Injectable, Logger } from '@nestjs/common';
import { SendGridAdapter } from '../../Infrastructure/email/SendGridAdapter';

@Injectable()
export class OrderCancelledHandler {
  private readonly logger = new Logger(OrderCancelledHandler.name);
  constructor(private readonly email: SendGridAdapter) {}

  async handle(payload: { orderId: string; customerId: string; reason: string }): Promise<void> {
    this.logger.log(`Sending cancellation for order ${payload.orderId}`);
    await this.email.send({
      to: `customer-${payload.customerId}@example.com`,
      subject: '❌ Your order has been cancelled',
      html: `<h1>Order Cancelled</h1><p>Order <strong>${payload.orderId}</strong> was cancelled. Reason: ${payload.reason}</p><p>Any payment has been refunded.</p>`,
    });
  }
}
