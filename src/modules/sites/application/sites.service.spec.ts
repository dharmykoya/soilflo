import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaginatedResultDto } from '../../../shared/pagination/paginated-result.dto';
import { SitesService } from '../application/sites.service';
import { GetSitesQueryDto } from '../application/get-sites-query.dto';
import { Site } from '../domain/site.entity';
import { SiteRepository } from '../domain/site.repository.interface';

const makeSite = (id: number): Site => {
  const s = new Site();
  s.id = id;
  s.name = `Site ${id}`;
  s.address = `${id} Main St`;
  s.description = 'Test site';
  return s;
};

describe('SitesService', () => {
  let service: SitesService;
  let repository: jest.Mocked<SiteRepository>;

  beforeEach(async () => {
    const mockRepo: jest.Mocked<SiteRepository> = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SitesService,
        { provide: SiteRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(SitesService);
    repository = module.get(SiteRepository);
  });

  describe('findAll', () => {
    it('returns a paginated result', async () => {
      const sites = [makeSite(1), makeSite(2)];
      repository.findAll.mockResolvedValue([sites, 2]);

      const query: GetSitesQueryDto = { page: 1, limit: 10 };
      const result = await service.findAll(query);

      expect(result).toBeInstanceOf(PaginatedResultDto);
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('calculates totalPages correctly', async () => {
      const sites = Array.from({ length: 10 }, (_, i) => makeSite(i + 1));
      repository.findAll.mockResolvedValue([sites, 25]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });

    it('passes search term through to repository', async () => {
      const sites = [makeSite(1)];
      repository.findAll.mockResolvedValue([sites, 1]);

      const query: GetSitesQueryDto = { page: 1, limit: 10, search: 'Oakland' };
      const result = await service.findAll(query);

      expect(repository.findAll).toHaveBeenCalledWith(query);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('returns the site when found', async () => {
      const site = makeSite(1);
      repository.findById.mockResolvedValue(site);

      const result = await service.findById(1);

      expect(result).toBe(site);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('throws NotFoundException when site does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(9999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(9999)).rejects.toThrow(
        'Site with id 9999 not found',
      );
    });
  });
});
