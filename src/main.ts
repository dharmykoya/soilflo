import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe — strip unknown fields, transform payload types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter — uniform { statusCode, message, error } envelope
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response transform — wraps successful responses in { data, meta? }
  app.useGlobalInterceptors(new TransformInterceptor());

  // OpenAPI / Swagger
  const config = new DocumentBuilder()
    .setTitle('SoilFLO API')
    .setDescription(
      'Construction site dispatch ticket management API.\n\n' +
        '**Production note:** Bulk ticket creation uses PostgreSQL advisory locks ' +
        'and serializable transactions for concurrency safety. In a high-throughput ' +
        'environment this would be backed by a BullMQ + Redis job queue (see TicketsProcessor stub).',
    )
    .setVersion('1.0')
    .addTag('Sites', 'Construction site management')
    .addTag('Trucks', 'Truck management')
    .addTag('Tickets', 'Dispatch ticket management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  console.log(`Application running on: http://localhost:${port}`);
  console.log(`Swagger UI:             http://localhost:${port}/api/docs`);
}

bootstrap();

