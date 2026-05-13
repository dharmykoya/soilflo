import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { GetTrucksQueryDto } from '../application/get-trucks-query.dto';
import { TruckRepository } from '../domain/truck.repository.interface';
import { Truck } from '../domain/truck.entity';

@Injectable()
export class TypeOrmTruckRepository implements TruckRepository {
  constructor(
    @InjectRepository(Truck)
    private readonly repo: Repository<Truck>,
  ) {}

  findAll({ page, limit, siteId, search }: GetTrucksQueryDto): Promise<[Truck[], number]> {
    const baseWhere: FindOptionsWhere<Truck> = {};
    if (siteId !== undefined) {
      baseWhere.siteId = siteId;
    }

    const where: FindOptionsWhere<Truck> | FindOptionsWhere<Truck>[] = search
      ? [
          { ...baseWhere, license: ILike(`%${search}%`) },
        ]
      : baseWhere;

    return this.repo.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findById(id: number): Promise<Truck | null> {
    return this.repo.findOneBy({ id });
  }
}
