import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IOrderRepository, ORDER_REPOSITORY } from '../../Domain/repositories/IOrderRepository';
import { OrderId } from '../../Domain/value-objects/OrderId';
import { CustomerId } from '../../Domain/value-objects/CustomerId';
import { Order } from '../../Domain/aggregates/Order.aggregate';

export class GetOrderByIdQuery { constructor(readonly orderId: string) {} }
export class GetOrdersByCustomerQuery { constructor(readonly customerId: string) {} }

@Injectable()
export class GetOrderByIdHandler {
  constructor(@Inject(ORDER_REPOSITORY) private readonly repo: IOrderRepository) {}
  async execute(query: GetOrderByIdQuery): Promise<Order> {
    const order = await this.repo.findById(OrderId.from(query.orderId));
    if (!order) throw new NotFoundException(`Order ${query.orderId} not found`);
    return order;
  }
}

@Injectable()
export class GetOrdersByCustomerHandler {
  constructor(@Inject(ORDER_REPOSITORY) private readonly repo: IOrderRepository) {}
  async execute(query: GetOrdersByCustomerQuery): Promise<Order[]> {
    return this.repo.findByCustomerId(CustomerId.from(query.customerId));
  }
}
