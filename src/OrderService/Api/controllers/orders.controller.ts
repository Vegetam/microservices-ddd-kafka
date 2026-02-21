import {
  Controller, Get, Post, Delete, Param, Body,
  HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PlaceOrderHandler, PlaceOrderCommand } from '../../Application/commands/PlaceOrderCommand';
import { CancelOrderHandler, CancelOrderCommand } from '../../Application/commands/CancelOrderCommand';
import { GetOrderByIdHandler, GetOrderByIdQuery, GetOrdersByCustomerHandler, GetOrdersByCustomerQuery } from '../../Application/queries/GetOrderQueries';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderResponseDto } from '../dto/order-response.dto';
import { Order } from '../../Domain/aggregates/Order.aggregate';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly placeOrderHandler: PlaceOrderHandler,
    private readonly cancelOrderHandler: CancelOrderHandler,
    private readonly getByIdHandler: GetOrderByIdHandler,
    private readonly getByCustomerHandler: GetOrdersByCustomerHandler,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place a new order' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  async placeOrder(@Body() dto: CreateOrderDto): Promise<{ orderId: string }> {
    const orderId = await this.placeOrderHandler.execute(
      new PlaceOrderCommand(dto.customerId, dto.items),
    );
    return { orderId };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async getOrder(@Param('id', ParseUUIDPipe) id: string): Promise<OrderResponseDto> {
    const order = await this.getByIdHandler.execute(new GetOrderByIdQuery(id));
    return this.toResponse(order);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get all orders for a customer' })
  async getByCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<OrderResponseDto[]> {
    const orders = await this.getByCustomerHandler.execute(new GetOrdersByCustomerQuery(customerId));
    return orders.map(o => this.toResponse(o));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel an order' })
  async cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
  ): Promise<void> {
    await this.cancelOrderHandler.execute(
      new CancelOrderCommand(id, body.reason ?? 'Cancelled by customer'),
    );
  }

  private toResponse(order: Order): OrderResponseDto {
    return {
      orderId: order.id.value,
      customerId: order.customerId.value,
      status: order.status,
      totalAmount: order.total.amount,
      totalCurrency: order.total.currency,
      itemCount: order.items.length,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
