import { Inject, Injectable, Logger } from '@nestjs/common';
import { IOrderRepository, ORDER_REPOSITORY } from '../../Domain/repositories/IOrderRepository';
import { OrderId } from '../../Domain/value-objects/OrderId';

@Injectable()
export class PaymentProcessedHandler {
  private readonly logger = new Logger(PaymentProcessedHandler.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  async handle(payload: { orderId: string; paymentId: string }): Promise<void> {
    const order = await this.orderRepository.findById(OrderId.from(payload.orderId));
    if (!order) { this.logger.warn(`Order ${payload.orderId} not found`); return; }
    order.confirm();
    await this.orderRepository.saveWithOutbox(order);
    this.logger.log(`✅ Order ${payload.orderId} confirmed after payment ${payload.paymentId}`);
  }

  async handleFailed(payload: { orderId: string; reason: string }): Promise<void> {
    const order = await this.orderRepository.findById(OrderId.from(payload.orderId));
    if (!order) return;
    order.cancel(`Payment failed: ${payload.reason}`);
    await this.orderRepository.saveWithOutbox(order);
    this.logger.warn(`❌ Order ${payload.orderId} cancelled — payment failed`);
  }
}
