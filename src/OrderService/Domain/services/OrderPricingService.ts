import { Injectable } from '@nestjs/common';
import { Money } from '../value-objects/Money';
import { Quantity } from '../value-objects/Quantity';

interface PriceableItem {
  unitPrice: Money;
  quantity: Quantity;
}

@Injectable()
export class OrderPricingService {
  calculateTotal(items: PriceableItem[]): Money {
    if (items.length === 0) return Money.of(0, 'USD');
    return Money.sum(items.map(i => i.unitPrice.multiply(i.quantity.value)));
  }

  applyDiscount(total: Money, discountPercent: number): Money {
    if (discountPercent < 0 || discountPercent > 100) {
      throw new Error(`Discount percent must be between 0–100, got ${discountPercent}`);
    }
    return total.subtract(total.multiply(discountPercent / 100));
  }
}
