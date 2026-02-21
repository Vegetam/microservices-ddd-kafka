import {
  Controller, Get, Post, Param, Body,
  HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProcessPaymentHandler, ProcessPaymentCommand } from '../../Application/commands/ProcessPaymentCommand';
import { RefundPaymentHandler, RefundPaymentCommand } from '../../Application/commands/RefundPaymentCommand';
import { GetPaymentByIdHandler, GetPaymentByIdQuery, GetPaymentByOrderIdHandler, GetPaymentByOrderIdQuery } from '../../Application/queries/GetPaymentQueries';
import { ProcessPaymentDto } from '../dto/process-payment.dto';
import { Payment } from '../../Domain/aggregates/Payment.aggregate';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly processHandler: ProcessPaymentHandler,
    private readonly refundHandler: RefundPaymentHandler,
    private readonly getByIdHandler: GetPaymentByIdHandler,
    private readonly getByOrderIdHandler: GetPaymentByOrderIdHandler,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Process a payment for an order' })
  async process(@Body() dto: ProcessPaymentDto): Promise<{ paymentId: string }> {
    const paymentId = await this.processHandler.execute(
      new ProcessPaymentCommand(dto.orderId, dto.customerId, dto.amount, dto.currency, dto.paymentMethodId),
    );
    return { paymentId };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<ReturnType<typeof this.toResponse>> {
    const p = await this.getByIdHandler.execute(new GetPaymentByIdQuery(id));
    return this.toResponse(p);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payment by order ID' })
  async getByOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    const p = await this.getByOrderIdHandler.execute(new GetPaymentByOrderIdQuery(orderId));
    return p ? this.toResponse(p) : null;
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Refund a payment' })
  async refund(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.refundHandler.execute(new RefundPaymentCommand(id));
  }

  private toResponse(p: Payment) {
    return {
      paymentId: p.id.value,
      orderId: p.orderId.value,
      customerId: p.customerId.value,
      status: p.status,
      amount: p.amount.amount,
      currency: p.amount.currency,
      stripeChargeId: p.stripeChargeId?.value ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
