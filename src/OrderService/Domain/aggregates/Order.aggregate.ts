import { AggregateRoot } from '../../../../shared/kernel/AggregateRoot';
import { OrderId } from '../value-objects/OrderId';
import { CustomerId } from '../value-objects/CustomerId';
import { Money } from '../value-objects/Money';
import { Quantity } from '../value-objects/Quantity';
import { ProductId } from '../value-objects/ProductId';
import { OrderItem } from '../entities/OrderItem';
import { OrderStatus } from '../enums/OrderStatus';
import { DomainError } from '../../../../shared/kernel/DomainError';
import { OrderCreatedEvent } from '../events/OrderCreated.event';
import { OrderConfirmedEvent } from '../events/OrderConfirmed.event';
import { OrderCancelledEvent } from '../events/OrderCancelled.event';
import { OrderDeliveredEvent } from '../events/OrderDelivered.event';

interface PlaceOrderItem {
  productId: ProductId;
  quantity: Quantity;
  unitPrice: Money;
}

export class Order extends AggregateRoot<OrderId> {
  private readonly _id: OrderId;
  private readonly _customerId: CustomerId;
  private _status: OrderStatus;
  private readonly _items: OrderItem[];
  private readonly _total: Money;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: OrderId,
    customerId: CustomerId,
    status: OrderStatus,
    items: OrderItem[],
    total: Money,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super();
    this._id = id;
    this._customerId = customerId;
    this._status = status;
    this._items = items;
    this._total = total;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  /**
   * Factory method — the only way to create a new Order
   * Enforces all invariants at creation time
   */
  static place(customerId: CustomerId, items: PlaceOrderItem[]): Order {
    // Invariant: at least one item
    if (!items || items.length === 0) {
      throw new DomainError('Order must contain at least one item');
    }

    // Invariant: no duplicate products
    const productIds = items.map(i => i.productId.value);
    if (new Set(productIds).size !== productIds.length) {
      throw new DomainError('Order cannot contain duplicate products');
    }

    const orderId = OrderId.generate();
    const orderItems = items.map(i =>
      OrderItem.create(i.productId, i.quantity, i.unitPrice),
    );
    const total = Money.sum(
      items.map(i => i.unitPrice.multiply(i.quantity.value)),
    );
    const now = new Date();

    const order = new Order(
      orderId,
      customerId,
      OrderStatus.PENDING,
      orderItems,
      total,
      now,
      now,
    );

    // Raise domain event — will be collected and persisted via Outbox
    order.addDomainEvent(
      new OrderCreatedEvent({
        orderId: orderId.value,
        customerId: customerId.value,
        items: orderItems.map(i => ({
          productId: i.productId.value,
          quantity: i.quantity.value,
          unitPrice: { amount: i.unitPrice.amount, currency: i.unitPrice.currency },
        })),
        total: { amount: total.amount, currency: total.currency },
        occurredAt: now.toISOString(),
      }),
    );

    return order;
  }

  /**
   * Reconstitute Order from persistence — no domain events raised
   */
  static reconstitute(props: {
    id: string;
    customerId: string;
    status: OrderStatus;
    items: Array<{ productId: string; quantity: number; unitPrice: { amount: number; currency: string } }>;
    total: { amount: number; currency: string };
    createdAt: Date;
    updatedAt: Date;
  }): Order {
    return new Order(
      OrderId.from(props.id),
      CustomerId.from(props.customerId),
      props.status,
      props.items.map(i =>
        OrderItem.create(
          ProductId.from(i.productId),
          Quantity.of(i.quantity),
          Money.of(i.unitPrice.amount, i.unitPrice.currency),
        ),
      ),
      Money.of(props.total.amount, props.total.currency),
      props.createdAt,
      props.updatedAt,
    );
  }

  confirm(): void {
    this.guardStatus(OrderStatus.PENDING, 'confirm');
    this._status = OrderStatus.CONFIRMED;
    this._updatedAt = new Date();
    this.addDomainEvent(
      new OrderConfirmedEvent({
        orderId: this._id.value,
        customerId: this._customerId.value,
        total: { amount: this._total.amount, currency: this._total.currency },
        occurredAt: this._updatedAt.toISOString(),
      }),
    );
  }

  cancel(reason: string): void {
    if (this._status === OrderStatus.DELIVERED) {
      throw new DomainError('Cannot cancel an order that has already been delivered');
    }
    if (this._status === OrderStatus.CANCELLED) {
      throw new DomainError('Order is already cancelled');
    }
    this._status = OrderStatus.CANCELLED;
    this._updatedAt = new Date();
    this.addDomainEvent(
      new OrderCancelledEvent({
        orderId: this._id.value,
        customerId: this._customerId.value,
        reason,
        occurredAt: this._updatedAt.toISOString(),
      }),
    );
  }

  deliver(): void {
    this.guardStatus(OrderStatus.CONFIRMED, 'deliver');
    this._status = OrderStatus.DELIVERED;
    this._updatedAt = new Date();
    this.addDomainEvent(
      new OrderDeliveredEvent({
        orderId: this._id.value,
        customerId: this._customerId.value,
        occurredAt: this._updatedAt.toISOString(),
      }),
    );
  }

  private guardStatus(expected: OrderStatus, action: string): void {
    if (this._status !== expected) {
      throw new DomainError(
        `Cannot ${action} order in status ${this._status}. Expected: ${expected}`,
      );
    }
  }

  // ─── Accessors ──────────────────────────────────────────
  get id(): OrderId { return this._id; }
  get customerId(): CustomerId { return this._customerId; }
  get status(): OrderStatus { return this._status; }
  get items(): ReadonlyArray<OrderItem> { return Object.freeze([...this._items]); }
  get total(): Money { return this._total; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
}
