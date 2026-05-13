import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaginatedResultDto } from '../../../shared/pagination/paginated-result.dto';
import { TrucksService } from './trucks.service';
import { GetTrucksQueryDto } from './get-trucks-query.dto';
import { Truck } from '../domain/truck.entity';
import { TruckRepository } from '../domain/truck.repository.interface';

const makeTruck = (id: number, siteId = 1): Truck => {
  const t = new Truck();
  t.id = id;
  t.license = `LIC${id}`;
  t.siteId = siteId;
  return t;
};

describe('TrucksService', () => {
  let service: TrucksService;
  let repository: jest.Mocked<TruckRepository>;

  beforeEach(async () => {
    const mockRepo: jest.Mocked<TruckRepository> = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrucksService,
        { provide: TruckRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(TrucksService);
    repository = module.get(TruckRepository);
  });

  describe('findAll', () => {
    it('returns a paginated result', async () => {
      const trucks = [makeTruck(1), makeTruck(2)];
      repository.findAll.mockResolvedValue([trucks, 2]);

      const query: GetTrucksQueryDto = { page: 1, limit: 10 };
      const result = await service.findAll(query);

      expect(result).toBeInstanceOf(PaginatedResultDto);
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('calculates totalPages correctly', async () => {
      const trucks = Array.from({ length: 10 }, (_, i) => makeTruck(i + 1));
      repository.findAll.mockResolvedValue([trucks, 25]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });

    it('passes siteId filter through to repository', async () => {
      const trucks = [makeTruck(1, 5)];
      repository.findAll.mockResolvedValue([trucks, 1]);

      const query: GetTrucksQueryDto = { page: 1, limit: 10, siteId: 5 };
      await service.findAll(query);

      expect(repository.findAll).toHaveBeenCalledWith(query);
    });

    it('passes search term through to repository', async () => {
      const trucks = [makeTruck(1)];
      repository.findAll.mockResolvedValue([trucks, 1]);

      const query: GetTrucksQueryDto = { page: 1, limit: 10, search: 'LIC' };
      const result = await service.findAll(query);

      expect(repository.findAll).toHaveBeenCalledWith(query);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('returns the truck when found', async () => {
      const truck = makeTruck(1);
      repository.findById.mockResolvedValue(truck);

      const result = await service.findById(1);

      expect(result).toBe(truck);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('throws NotFoundException when truck does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(9999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(9999)).rejects.toThrow(
        'Truck with id 9999 not found',
      );
    });
  });
});
