import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { SitesModule } from './modules/sites/sites.module';
import { TrucksModule } from './modules/trucks/trucks.module';

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

    SitesModule,
    TrucksModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

