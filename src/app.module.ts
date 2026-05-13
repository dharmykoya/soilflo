import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { SitesModule } from './modules/sites/sites.module';
import { TrucksModule } from './modules/trucks/trucks.module';
import { TicketsModule } from './modules/tickets/tickets.module';

const QUEUE_ENABLED = process.env['QUEUE_ENABLED'] === 'true';

@Module({
  imports: [
    // Config — loads .env, available globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env['NODE_ENV'] === 'test' ? '.env.test' : '.env',
    }),

    // TypeORM — async config so it reads from ConfigService
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('POSTGRES_HOST'),
        port: config.getOrThrow<number>('POSTGRES_PORT'),
        username: config.getOrThrow<string>('POSTGRES_USER'),
        password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
        database: config.getOrThrow<string>('POSTGRES_DB'),
        // Entities auto-loaded from all modules
        autoLoadEntities: true,
        // Migrations managed manually — never sync in production
        synchronize: false,
        migrationsRun: false,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),

    // BullMQ — Redis-backed job queue for async ticket creation.
    // Only wired when QUEUE_ENABLED=true so dev/test environments without
    // Redis remain fully functional.
    ...(QUEUE_ENABLED
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              connection: {
                host: config.getOrThrow<string>('REDIS_HOST'),
                port: config.getOrThrow<number>('REDIS_PORT'),
                db: config.get<number>('REDIS_DB') ?? 0,
              },
              prefix: '{soilflo}',
            }),
          }),
        ]
      : []),

    SitesModule,
    TrucksModule,
    TicketsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

