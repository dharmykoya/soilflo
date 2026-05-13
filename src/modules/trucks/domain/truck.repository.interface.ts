import { GetTrucksQueryDto } from '../application/get-trucks-query.dto';
import { Truck } from './truck.entity';

export abstract class TruckRepository {
  abstract findAll(query: GetTrucksQueryDto): Promise<[Truck[], number]>;
  abstract findById(id: number): Promise<Truck | null>;
}
