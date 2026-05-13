import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SitesController } from './sites.controller';
import { SitesService } from '../application/sites.service';
import { PaginatedResultDto } from '../../../shared/pagination/paginated-result.dto';
import { Site } from '../domain/site.entity';
import { GetSitesQueryDto } from '../application/get-sites-query.dto';

const makeSite = (id: number): Site => {
  const s = new Site();
  s.id = id;
  s.name = `Site ${id}`;
  s.address = `${id} Test St`;
  s.description = 'Test description';
  return s;
};

describe('SitesController', () => {
  let controller: SitesController;
  let service: jest.Mocked<Pick<SitesService, 'findAll' | 'findById'>>;

  beforeEach(async () => {
    service = { findAll: jest.fn(), findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SitesController],
      providers: [{ provide: SitesService, useValue: service }],
    }).compile();

    controller = module.get(SitesController);
  });

  describe('findAll', () => {
    it('returns paginated SiteResponseDtos', async () => {
      const sites = [makeSite(1), makeSite(2)];
      service.findAll.mockResolvedValue(new PaginatedResultDto(sites, 2, 1, 10));

      const query: GetSitesQueryDto = { page: 1, limit: 10 };
      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Site 1');
      expect(result.meta.total).toBe(2);
    });
  });

  describe('findOne', () => {
    it('returns a SiteResponseDto for a valid id', async () => {
      const site = makeSite(7);
      service.findById.mockResolvedValue(site);

      const result = await controller.findOne(7);

      expect(service.findById).toHaveBeenCalledWith(7);
      expect(result.id).toBe(7);
      expect(result.name).toBe('Site 7');
      expect(result.address).toBe('7 Test St');
    });

    it('propagates NotFoundException from service', async () => {
      service.findById.mockRejectedValue(new NotFoundException('Site with id 99 not found'));

      await expect(controller.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });
});
