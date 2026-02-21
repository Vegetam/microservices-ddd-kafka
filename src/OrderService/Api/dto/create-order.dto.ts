import { IsUUID, IsArray, ValidateNested, IsInt, Min, IsNumber, IsString, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UnitPriceDto {
  @ApiProperty({ example: 49.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @Length(3, 3)
  currency!: string;
}

export class OrderItemDto {
  @ApiProperty({ example: '8f14e45f-ea1c-4a54-9c6c-4f3d9a0c7f01' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ type: UnitPriceDto })
  @ValidateNested()
  @Type(() => UnitPriceDto)
  unitPrice!: UnitPriceDto;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'c56a4180-65aa-42ec-a945-5fd21dec0538' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
