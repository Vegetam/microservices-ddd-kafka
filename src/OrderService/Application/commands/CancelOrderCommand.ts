import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IOrderRepository, ORDER_REPOSITORY } from '../../Domain/repositories/IOrderRepository';
import { OrderId } from '../../Domain/value-objects/OrderId';

export class CancelOrderCommand {
  constructor(
    readonly orderId: string,
    readonly reason: string,
  ) {}
}

@Injectable()
export class CancelOrderHandler {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  async execute(command: CancelOrderCommand): Promise<void> {
    const order = await this.orderRepository.findById(OrderId.from(command.orderId));
    if (!order) throw new NotFoundException(`Order ${command.orderId} not found`);

    order.cancel(command.reason);
    await this.orderRepository.saveWithOutbox(order);
  }
}
