import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResultDto } from '../../../shared/pagination/paginated-result.dto';
import { TruckRepository } from '../domain/truck.repository.interface';
import { Truck } from '../domain/truck.entity';
import { GetTrucksQueryDto } from './get-trucks-query.dto';

@Injectable()
export class TrucksService {
  constructor(private readonly truckRepository: TruckRepository) {}

  async findAll(query: GetTrucksQueryDto): Promise<PaginatedResultDto<Truck>> {
    const [trucks, total] = await this.truckRepository.findAll(query);
    return new PaginatedResultDto(trucks, total, query.page, query.limit);
  }

  async findById(id: number): Promise<Truck> {
    const truck = await this.truckRepository.findById(id);
    if (!truck) {
      throw new NotFoundException(`Truck with id ${id} not found`);
    }
    return truck;
  }
}
