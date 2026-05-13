import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Truck } from './domain/truck.entity';
import { TruckRepository } from './domain/truck.repository.interface';
import { TypeOrmTruckRepository } from './infrastructure/typeorm-truck.repository';
import { TrucksService } from './application/trucks.service';
import { TrucksController } from './presentation/trucks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Truck])],
  controllers: [TrucksController],
  providers: [
    TrucksService,
    {
      provide: TruckRepository,
      useClass: TypeOrmTruckRepository,
    },
  ],
  // Export TrucksService so the tickets module can resolve trucks
  exports: [TrucksService],
})
export class TrucksModule {}
