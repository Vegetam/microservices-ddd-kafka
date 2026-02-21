import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PaymentServiceModule } from './Api/payment.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    PaymentServiceModule,
    new FastifyAdapter({ logger: false }),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  const config = new DocumentBuilder()
    .setTitle('PaymentService').setDescription('Payment processing — DDD + Outbox + Kafka').setVersion('1.0').build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 PaymentService running on port ${port}`, 'Bootstrap');
}
bootstrap().catch((err) => { console.error(err); process.exit(1); });
