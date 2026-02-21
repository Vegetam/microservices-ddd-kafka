import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NotificationServiceModule } from './Api/notification.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    NotificationServiceModule,
    new FastifyAdapter({ logger: false }),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 NotificationService running on port ${port}`, 'Bootstrap');
}
bootstrap().catch((err) => { console.error(err); process.exit(1); });
