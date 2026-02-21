import { IsUUID, IsNumber, IsString, Length } from 'class-validator';

export class ProcessPaymentDto {
  @IsUUID()
  orderId!: string;

  @IsUUID()
  customerId!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsString()
  paymentMethodId!: string;
}
