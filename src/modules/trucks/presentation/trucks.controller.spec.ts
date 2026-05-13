import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TrucksController } from './trucks.controller';
import { TrucksService } from '../application/trucks.service';
import { PaginatedResultDto } from '../../../shared/pagination/paginated-result.dto';
import { Truck } from '../domain/truck.entity';
import { GetTrucksQueryDto } from '../application/get-trucks-query.dto';

const makeTruck = (id: number, siteId = 1): Truck => {
  const t = new Truck();
  t.id = id;
  t.license = `LIC-${id}`;
  t.siteId = siteId;
  t.createdAt = new Date('2026-01-01');
  t.updatedAt = new Date('2026-01-01');
  return t;
};

describe('TrucksController', () => {
  let controller: TrucksController;
  let service: jest.Mocked<Pick<TrucksService, 'findAll' | 'findById'>>;

  beforeEach(async () => {
    service = { findAll: jest.fn(), findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrucksController],
      providers: [{ provide: TrucksService, useValue: service }],
    }).compile();

    controller = module.get(TrucksController);
  });

  describe('findAll', () => {
    it('returns paginated TruckResponseDtos', async () => {
      const trucks = [makeTruck(1), makeTruck(2)];
      service.findAll.mockResolvedValue(new PaginatedResultDto(trucks, 2, 1, 10));

      const query: GetTrucksQueryDto = { page: 1, limit: 10 };
      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].license).toBe('LIC-1');
      expect(result.meta.total).toBe(2);
    });
  });

  describe('findOne', () => {
    it('returns a TruckResponseDto for a valid id', async () => {
      const truck = makeTruck(5, 3);
      service.findById.mockResolvedValue(truck);

      const result = await controller.findOne(5);

      expect(service.findById).toHaveBeenCalledWith(5);
      expect(result.id).toBe(5);
      expect(result.license).toBe('LIC-5');
      expect(result.siteId).toBe(3);
    });

    it('propagates NotFoundException from service', async () => {
      service.findById.mockRejectedValue(new NotFoundException('Truck with id 99 not found'));

      await expect(controller.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });
});
