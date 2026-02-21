import { ApiProperty } from '@nestjs/swagger';

export class OrderResponseDto {
  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  totalCurrency!: string;

  @ApiProperty()
  itemCount!: number;

  @ApiProperty()
  createdAt!: string;
}
