import { Inject, Injectable } from '@nestjs/common';
import { IOrderRepository, ORDER_REPOSITORY } from '../../Domain/repositories/IOrderRepository';
import { Order } from '../../Domain/aggregates/Order.aggregate';
import { CustomerId } from '../../Domain/value-objects/CustomerId';
import { ProductId } from '../../Domain/value-objects/ProductId';
import { Money } from '../../Domain/value-objects/Money';
import { Quantity } from '../../Domain/value-objects/Quantity';

export class PlaceOrderCommand {
  constructor(
    readonly customerId: string,
    readonly items: Array<{
      productId: string;
      quantity: number;
      unitPrice: { amount: number; currency: string };
    }>,
  ) {}
}

@Injectable()
export class PlaceOrderHandler {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  async execute(command: PlaceOrderCommand): Promise<string> {
    const order = Order.place(
      CustomerId.from(command.customerId),
      command.items.map(i => ({
        productId: ProductId.from(i.productId),
        quantity: Quantity.of(i.quantity),
        unitPrice: Money.of(i.unitPrice.amount, i.unitPrice.currency),
      })),
    );

    await this.orderRepository.saveWithOutbox(order);
    return order.id.value;
  }
}
