import { ILike } from 'typeorm';
import { TypeOrmSiteRepository } from './typeorm-site.repository';
import { GetSitesQueryDto } from '../application/get-sites-query.dto';
import { Site } from '../domain/site.entity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeRepo = (result: [Site[], number] = [[], 0]) => ({
  findAndCount: jest.fn().mockResolvedValue(result),
  findOneBy: jest.fn().mockResolvedValue(null),
});

const buildRepository = (repoOverrides?: Partial<ReturnType<typeof makeRepo>>) => {
  const repo = { ...makeRepo(), ...repoOverrides };
  return { repository: new TypeOrmSiteRepository(repo as any), repo };
};

const baseQuery = (): GetSitesQueryDto => ({ page: 1, limit: 10 });

// ---------------------------------------------------------------------------
// findAll
// ---------------------------------------------------------------------------

describe('TypeOrmSiteRepository — findAll', () => {
  it('applies pagination skip/take', async () => {
    const { repository, repo } = buildRepository();
    await repository.findAll({ page: 3, limit: 15 });

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 30, take: 15 }),
    );
  });

  it('passes empty where when no search term provided', async () => {
    const { repository, repo } = buildRepository();
    await repository.findAll(baseQuery());

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('searches name AND address with ILike when search is provided', async () => {
    const { repository, repo } = buildRepository();
    await repository.findAll({ ...baseQuery(), search: 'Oak' });

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [{ name: ILike('%Oak%') }, { address: ILike('%Oak%') }],
      }),
    );
  });

  it('returns the result from findAndCount', async () => {
    const site = new Site();
    const { repository } = buildRepository({
      findAndCount: jest.fn().mockResolvedValue([[site], 1]),
    });

    const result = await repository.findAll(baseQuery());

    expect(result).toEqual([[site], 1]);
  });
});

// ---------------------------------------------------------------------------
// findById
// ---------------------------------------------------------------------------

describe('TypeOrmSiteRepository — findById', () => {
  it('returns the site when found', async () => {
    const site = new Site();
    site.id = 5;
    const { repository } = buildRepository({
      findOneBy: jest.fn().mockResolvedValue(site),
    });

    const result = await repository.findById(5);

    expect(result).toBe(site);
  });

  it('returns null when site does not exist', async () => {
    const { repository } = buildRepository({
      findOneBy: jest.fn().mockResolvedValue(null),
    });

    const result = await repository.findById(999);

    expect(result).toBeNull();
  });
});
