import { ILike } from 'typeorm';
import { TypeOrmTruckRepository } from './typeorm-truck.repository';
import { GetTrucksQueryDto } from '../application/get-trucks-query.dto';
import { Truck } from '../domain/truck.entity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeRepo = (result: [Truck[], number] = [[], 0]) => ({
  findAndCount: jest.fn().mockResolvedValue(result),
  findOneBy: jest.fn().mockResolvedValue(null),
});

const buildRepository = (repoOverrides?: Partial<ReturnType<typeof makeRepo>>) => {
  const repo = { ...makeRepo(), ...repoOverrides };
  return { repository: new TypeOrmTruckRepository(repo as any), repo };
};

const baseQuery = (): GetTrucksQueryDto => ({ page: 1, limit: 10 });

// ---------------------------------------------------------------------------
// findAll
// ---------------------------------------------------------------------------

describe('TypeOrmTruckRepository — findAll', () => {
  it('applies pagination skip/take', async () => {
    const { repository, repo } = buildRepository();
    await repository.findAll({ page: 3, limit: 20 });

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
  });

  it('passes no where condition when neither siteId nor search is provided', async () => {
    const { repository, repo } = buildRepository();
    await repository.findAll(baseQuery());

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('filters by siteId when provided', async () => {
    const { repository, repo } = buildRepository();
    await repository.findAll({ ...baseQuery(), siteId: 7 });

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { siteId: 7 } }),
    );
  });

  it('applies ILike search on license when search is provided', async () => {
    const { repository, repo } = buildRepository();
    await repository.findAll({ ...baseQuery(), search: 'ABC' });

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [{ license: ILike('%ABC%') }],
      }),
    );
  });

  it('combines siteId and search filters', async () => {
    const { repository, repo } = buildRepository();
    await repository.findAll({ ...baseQuery(), siteId: 2, search: 'XY' });

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [{ siteId: 2, license: ILike('%XY%') }],
      }),
    );
  });

  it('returns the result from findAndCount', async () => {
    const truck = new Truck();
    const { repository } = buildRepository({ findAndCount: jest.fn().mockResolvedValue([[truck], 1]) });

    const result = await repository.findAll(baseQuery());

    expect(result).toEqual([[truck], 1]);
  });
});

// ---------------------------------------------------------------------------
// findById
// ---------------------------------------------------------------------------

describe('TypeOrmTruckRepository — findById', () => {
  it('returns the truck when found', async () => {
    const truck = new Truck();
    truck.id = 42;
    const { repository } = buildRepository({ findOneBy: jest.fn().mockResolvedValue(truck) });

    const result = await repository.findById(42);

    expect(result).toBe(truck);
  });

  it('returns null when truck does not exist', async () => {
    const { repository } = buildRepository({ findOneBy: jest.fn().mockResolvedValue(null) });

    const result = await repository.findById(999);

    expect(result).toBeNull();
  });
});
