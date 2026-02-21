# 🏛️ Microservices: Clean Architecture · DDD · SAGA · Outbox · Kafka

[![CI](https://github.com/Vegetam/microservices-ddd-kafka/actions/workflows/ci.yml/badge.svg)](https://github.com/Vegetam/microservices-ddd-kafka/actions/workflows/ci.yml)
![License](https://img.shields.io/github/license/Vegetam/microservices-ddd-kafka)

> Enterprise-grade microservices implementing Domain-Driven Design, CQRS, the Transactional Outbox Pattern, and Kafka-based saga choreography — built as a learning PoC.


## ✅ Run locally (Docker Compose)

```bash
docker compose up --build
```

- OrderService Swagger: http://localhost:3001/api/docs
- PaymentService Swagger: http://localhost:3002/api/docs
- NotificationService health: http://localhost:3003/api/health
- Kafka UI: http://localhost:8090

> Note: The original README mentions an API Gateway/Kubernetes/observability stack; this PoC docker-compose brings up Kafka, Postgres, Redis, and the three services.

## 🗺️ High-Level Architecture

```
                          ┌──────────────────────────────────────┐
                          │           CLIENT LAYER               │
                          │   Web App · Mobile · Third-Party     │
                          └──────────────┬───────────────────────┘
                                         │ HTTPS
                          ┌──────────────▼───────────────────────┐
                          │          API GATEWAY (Kong)          │
                          │   Auth · Rate Limit · Routing        │
                          └──┬──────────┬─────────────┬──────────┘
                             │          │             │
              ┌──────────────▼──┐  ┌────▼──────┐  ┌──▼──────────────┐
              │  Order Service  │  │  Payment  │  │  Notification   │
              │                 │  │  Service  │  │    Service      │
              │ ┌─────────────┐ │  │           │  │                 │
              │ │   Domain    │ │  │  Domain   │  │   Domain        │
              │ │ ┌─────────┐ │ │  │           │  │                 │
              │ │ │Entities │ │ │  │           │  │                 │
              │ │ │ Aggr.   │ │ │  │           │  │                 │
              │ │ │ Value   │ │ │  │           │  │                 │
              │ │ │ Objects │ │ │  │           │  │                 │
              │ │ │ Domain  │ │ │  │           │  │                 │
              │ │ │ Events  │ │ │  │           │  │                 │
              │ │ └─────────┘ │ │  │           │  │                 │
              │ └─────────────┘ │  │           │  │                 │
              │                 │  │           │  │                 │
              │  ┌───────────┐  │  │           │  │                 │
              │  │  Outbox   │  │  │           │  │                 │
              │  │  Table    │──┼──┼───────────┼──┼──► Kafka        │
              │  │(Postgres) │  │  │           │  │                 │
              │  └───────────┘  │  │           │  │                 │
              └─────────────────┘  └───────────┘  └─────────────────┘
                      │                  │                  │
              ┌───────▼──────────────────▼──────────────────▼───────┐
              │                     Apache Kafka                    │
              │                                                      │
              │  order.created   payment.processed   notification.   │
              │  order.confirmed payment.failed      sent           │
              │  order.cancelled                                     │
              └──────────────────────────────────────────────────────┘
```

## 🧅 Clean Architecture Layers (per service)

```
┌─────────────────────────────────────────────────────────┐
│                      API Layer                          │
│  Controllers · DTOs · Validators · OpenAPI decorators   │
├─────────────────────────────────────────────────────────┤
│                  Application Layer                      │
│  Commands · Queries · Handlers · Sagas · Event Handlers │
│  CQRS bus · Use Case orchestration                      │
├─────────────────────────────────────────────────────────┤
│                   Domain Layer  (PURE)                  │
│  Aggregates · Entities · Value Objects · Domain Events  │
│  Domain Services · Repository Interfaces · Specs        │
│  ⚠️  NO framework dependencies                          │
├─────────────────────────────────────────────────────────┤
│                Infrastructure Layer                     │
│  ORM Repos · Kafka Publishers · Redis Cache             │
│  Outbox Worker · External APIs · Migrations             │
└─────────────────────────────────────────────────────────┘
```

## 📦 Order Service — Domain Model

### Aggregate Root: `Order`

```typescript
Order
 ├── OrderId          (Value Object — UUID)
 ├── CustomerId       (Value Object)
 ├── OrderStatus      (Enum: PENDING|CONFIRMED|CANCELLED|DELIVERED)
 ├── Money            (Value Object — amount + currency)
 ├── OrderItems[]     (Entity collection)
 │   ├── ProductId    (Value Object)
 │   ├── Quantity     (Value Object — positive int)
 │   └── UnitPrice    (Value Object — Money)
 └── DomainEvents[]   (OrderCreated, OrderConfirmed, OrderCancelled)
```

### Domain Events (published via Outbox)

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `OrderCreated` | `order.place()` | PaymentService, InventoryService |
| `OrderConfirmed` | `order.confirm()` | NotificationService |
| `OrderCancelled` | `order.cancel()` | PaymentService (refund), NotificationService |
| `OrderDelivered` | `order.deliver()` | NotificationService, Analytics |

## 🔄 Transactional Outbox Pattern

The Outbox pattern guarantees **exactly-once event publishing** by co-locating event storage with domain data in the same transaction.

```
┌────────────────────────────────────────────────────────────────┐
│  Application Layer (single DB transaction)                     │
│                                                                │
│  1. Save Order aggregate to orders table                       │
│  2. Save domain events to outbox table                         │
│  └── COMMIT ─────────────────────────────────────────────────► │
│                                                                │
│  Outbox Worker (separate process, polling/CDC)                 │
│  3. Read unpublished events from outbox                        │
│  4. Publish to Kafka                                           │
│  5. Mark events as published                                   │
└────────────────────────────────────────────────────────────────┘
```

```sql
-- Outbox table schema
CREATE TABLE outbox_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id  UUID NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  event_type    VARCHAR(200) NOT NULL,
  payload       JSONB NOT NULL,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at  TIMESTAMPTZ,
  retry_count   INT NOT NULL DEFAULT 0,
  error         TEXT,
  
  INDEX idx_outbox_unpublished (published_at) WHERE published_at IS NULL
);
```

## 🗂️ Project Structure

```
.
├── src/
│   ├── OrderService/
│   │   ├── Api/
│   │   │   ├── controllers/
│   │   │   │   └── orders.controller.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-order.dto.ts
│   │   │   │   └── order-response.dto.ts
│   │   │   └── orders.module.ts
│   │   │
│   │   ├── Application/
│   │   │   ├── commands/
│   │   │   │   ├── PlaceOrderCommand.ts
│   │   │   │   ├── PlaceOrderHandler.ts
│   │   │   │   ├── CancelOrderCommand.ts
│   │   │   │   └── CancelOrderHandler.ts
│   │   │   ├── queries/
│   │   │   │   ├── GetOrderByIdQuery.ts
│   │   │   │   └── GetOrdersByCustomerQuery.ts
│   │   │   └── event-handlers/
│   │   │       └── PaymentProcessedHandler.ts
│   │   │
│   │   ├── Domain/
│   │   │   ├── aggregates/
│   │   │   │   └── Order.aggregate.ts      ← Pure domain logic
│   │   │   ├── entities/
│   │   │   │   └── OrderItem.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── OrderId.ts
│   │   │   │   ├── Money.ts
│   │   │   │   └── Quantity.ts
│   │   │   ├── events/
│   │   │   │   ├── OrderCreated.event.ts
│   │   │   │   └── OrderCancelled.event.ts
│   │   │   ├── repositories/
│   │   │   │   └── IOrderRepository.ts     ← Interface only
│   │   │   └── services/
│   │   │       └── OrderPricingService.ts
│   │   │
│   │   └── Infrastructure/
│   │       ├── persistence/
│   │       │   ├── OrderRepository.ts       ← Implements IOrderRepository
│   │       │   ├── OrderMapper.ts
│   │       │   └── migrations/
│   │       ├── kafka/
│   │       │   ├── OutboxWorker.ts          ← Publishes from outbox
│   │       │   └── EventConsumer.ts
│   │       └── cache/
│   │           └── OrderCacheService.ts
│   │
│   ├── PaymentService/          (same structure)
│   └── NotificationService/     (same structure)
│
├── shared/
│   ├── contracts/               ← Shared event schemas (npm package)
│   │   ├── OrderCreatedEvent.ts
│   │   └── PaymentProcessedEvent.ts
│   └── kernel/
│       ├── AggregateRoot.ts
│       ├── DomainEvent.ts
│       └── ValueObject.ts
│
├── k8s/
│   ├── order-service/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── hpa.yaml
│   └── kafka/
│       └── kafka-cluster.yaml
│
└── docker-compose.yml
```

## 🧱 Domain Implementation Examples

### Aggregate Root (base class)

```typescript
// shared/kernel/AggregateRoot.ts
export abstract class AggregateRoot<TId> {
  private _domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
```

### Order Aggregate

```typescript
// OrderService/Domain/aggregates/Order.aggregate.ts
export class Order extends AggregateRoot<OrderId> {
  private constructor(
    private readonly _id: OrderId,
    private readonly _customerId: CustomerId,
    private _status: OrderStatus,
    private _items: OrderItem[],
    private _total: Money,
  ) {
    super();
  }

  static place(
    customerId: CustomerId,
    items: { productId: ProductId; quantity: Quantity; unitPrice: Money }[],
  ): Order {
    if (items.length === 0) throw new DomainError('Order must have at least one item');

    const id = OrderId.generate();
    const total = Money.sum(items.map(i => i.unitPrice.multiply(i.quantity.value)));
    const orderItems = items.map(i => OrderItem.create(i.productId, i.quantity, i.unitPrice));
    const order = new Order(id, customerId, OrderStatus.PENDING, orderItems, total);

    order.addDomainEvent(new OrderCreatedEvent(id, customerId, orderItems, total));
    return order;
  }

  confirm(): void {
    if (this._status !== OrderStatus.PENDING) {
      throw new DomainError(`Cannot confirm order in status ${this._status}`);
    }
    this._status = OrderStatus.CONFIRMED;
    this.addDomainEvent(new OrderConfirmedEvent(this._id, this._customerId));
  }

  cancel(reason: string): void {
    if (this._status === OrderStatus.DELIVERED) {
      throw new DomainError('Cannot cancel a delivered order');
    }
    this._status = OrderStatus.CANCELLED;
    this.addDomainEvent(new OrderCancelledEvent(this._id, reason));
  }

  get id(): OrderId { return this._id; }
  get status(): OrderStatus { return this._status; }
  get total(): Money { return this._total; }
}
```

### Value Object: Money

```typescript
// OrderService/Domain/value-objects/Money.ts
export class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: string,
  ) {
    if (_amount < 0) throw new DomainError('Money amount cannot be negative');
    if (!['USD', 'EUR', 'GBP'].includes(_currency))
      throw new DomainError(`Unsupported currency: ${_currency}`);
  }

  static of(amount: number, currency: string): Money {
    return new Money(amount, currency);
  }

  static sum(moneys: Money[]): Money {
    if (moneys.length === 0) throw new DomainError('Cannot sum empty list');
    const currency = moneys[0]._currency;
    if (!moneys.every(m => m._currency === currency))
      throw new DomainError('Cannot sum Money with different currencies');
    return new Money(moneys.reduce((acc, m) => acc + m._amount, 0), currency);
  }

  multiply(factor: number): Money {
    return new Money(this._amount * factor, this._currency);
  }

  add(other: Money): Money {
    if (this._currency !== other._currency)
      throw new DomainError('Currency mismatch');
    return new Money(this._amount + other._amount, this._currency);
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  get amount(): number { return this._amount; }
  get currency(): string { return this._currency; }
}
```

## 🚀 CQRS — Command & Query Separation

```typescript
// Commands mutate state
@CommandHandler(PlaceOrderCommand)
export class PlaceOrderHandler implements ICommandHandler<PlaceOrderCommand> {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly outboxService: OutboxService,
  ) {}

  async execute(command: PlaceOrderCommand): Promise<OrderId> {
    const order = Order.place(command.customerId, command.items);

    // Single transaction: save order + outbox events
    await this.orderRepository.saveWithOutbox(order);

    return order.id;
  }
}

// Queries are read-only (separate read model)
@QueryHandler(GetOrderByIdQuery)
export class GetOrderByIdHandler implements IQueryHandler<GetOrderByIdQuery> {
  constructor(private readonly readModel: OrderReadModelRepository) {}

  async execute(query: GetOrderByIdQuery): Promise<OrderReadDto> {
    return this.readModel.findById(query.orderId);
  }
}
```

## ☸️ Kubernetes Deployment

```yaml
# k8s/order-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: ecommerce
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:latest
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: order-service-secrets
                  key: database-url
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone https://github.com/yourname/2-microservices-ddd-kafka.git
cd 2-microservices-ddd-kafka
npm install

# 2. Start infrastructure
docker-compose up -d

# 3. Run migrations
npm run migrate:all

# 4. Start all services
npm run start:all

# 5. Place an order
curl -X POST http://localhost:3010/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "items": [
      { "productId": "prod-001", "quantity": 2, "unitPrice": { "amount": 29.99, "currency": "USD" } }
    ]
  }'
```

## 🧪 Testing

```bash
# Domain unit tests (no infrastructure)
npm run test:domain

# Application tests (mocked infrastructure)
npm run test:application

# Integration tests (real DB + Kafka)
npm run test:integration

# E2E (full flow)
npm run test:e2e
```

## 🔗 Related Projects

- [1-saga-pattern-architecture](../1-saga-pattern-architecture) — Saga orchestration deep dive
- [3-terraform-multicloud](../3-terraform-multicloud) — Cloud infrastructure

## ☸️ Kubernetes (Helm + Kustomize overlays)

This repo ships a **Kustomize overlay** for `kind` and another for `prod`. Both overlays use **Bitnami Helm charts** for Kafka, Redis, and one Postgres per service.

### Prereqs

- `kubectl`
- `kind`
- `docker`
- `kustomize` (standalone) — **required** because we use `kustomize build --enable-helm`

### kind

```bash
make kind-up
make kind-deploy
```

Then map these hosts to your kind ingress:

```bash
sudo sh -c 'echo "127.0.0.1 orders.local payments.local notify.local" >> /etc/hosts'
```

Open:
- OrderService: http://orders.local:8080/api/docs
- PaymentService: http://payments.local:8080/api/docs
- NotificationService: http://notify.local:8080/api/health

### prod overlay

The prod overlay is meant as a starting point:

```bash
kustomize build --enable-helm k8s/kustomize/overlays/prod | kubectl apply -f -
```

Replace the `CHANGE_ME` secrets with your secret management (ExternalSecrets/SealedSecrets/etc).
