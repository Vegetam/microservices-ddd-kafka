import { ProductId } from '../value-objects/ProductId';
import { Money } from '../value-objects/Money';
import { Quantity } from '../value-objects/Quantity';

export class OrderItem {
  private constructor(
    readonly productId: ProductId,
    readonly quantity: Quantity,
    readonly unitPrice: Money,
  ) {
    Object.freeze(this);
  }

  static create(productId: ProductId, quantity: Quantity, unitPrice: Money): OrderItem {
    return new OrderItem(productId, quantity, unitPrice);
  }

  get lineTotal(): Money {
    return this.unitPrice.multiply(this.quantity.value);
  }

  equals(other: OrderItem): boolean {
    return this.productId.equals(other.productId);
  }
}
