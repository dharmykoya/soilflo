import { TypeOrmTicketRepository } from './typeorm-ticket.repository';
import { GetTicketsQueryDto } from '../application/get-tickets-query.dto';
import { Ticket } from '../domain/ticket.entity';

// ---------------------------------------------------------------------------
// Mock query builder factory
// ---------------------------------------------------------------------------

const makeQb = (result: [Ticket[], number] = [[], 0]) => {
  const qb = {
    select: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(result),
  };
  return qb;
};

const makeRepo = (qb: ReturnType<typeof makeQb>) => ({
  createQueryBuilder: jest.fn().mockReturnValue(qb),
});

const buildRepository = (qb: ReturnType<typeof makeQb>) => {
  const repo = makeRepo(qb);
  return new TypeOrmTicketRepository(repo as any);
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TypeOrmTicketRepository — findAll', () => {
  const baseQuery = (): GetTicketsQueryDto => ({ page: 1, limit: 10 });

  it('applies pagination skip/take', async () => {
    const qb = makeQb();
    await buildRepository(qb).findAll({ page: 2, limit: 25 });

    expect(qb.skip).toHaveBeenCalledWith(25); // (2-1) * 25
    expect(qb.take).toHaveBeenCalledWith(25);
  });

  it('does not add andWhere clauses when no filters provided', async () => {
    const qb = makeQb();
    await buildRepository(qb).findAll(baseQuery());

    expect(qb.andWhere).not.toHaveBeenCalled();
  });

  it('adds siteId filter when provided', async () => {
    const qb = makeQb();
    await buildRepository(qb).findAll({ ...baseQuery(), siteId: 5 });

    expect(qb.andWhere).toHaveBeenCalledWith('ticket.siteId = :siteId', { siteId: 5 });
  });

  it('adds startDate filter when provided', async () => {
    const qb = makeQb();
    await buildRepository(qb).findAll({ ...baseQuery(), startDate: '2026-01-01' });

    expect(qb.andWhere).toHaveBeenCalledWith('ticket.dispatchedAt >= :startDate', {
      startDate: '2026-01-01',
    });
  });

  it('adds endDate filter (advanced by one day) when provided', async () => {
    const qb = makeQb();
    await buildRepository(qb).findAll({ ...baseQuery(), endDate: '2026-01-31' });

    const call = (qb.andWhere as jest.Mock).mock.calls.find((c) =>
      c[0].includes('dispatchedAt <'),
    );
    expect(call).toBeDefined();
    const passed = call[1].endDate as Date;
    // Should be midnight of 2026-02-01 UTC
    expect(passed.toISOString().startsWith('2026-02-01')).toBe(true);
  });

  it('applies all filters together', async () => {
    const qb = makeQb();
    await buildRepository(qb).findAll({
      page: 1,
      limit: 10,
      siteId: 3,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });

    expect(qb.andWhere).toHaveBeenCalledTimes(3);
  });

  it('returns the result from getManyAndCount', async () => {
    const ticket = new Ticket();
    const qb = makeQb([[ticket], 1]);

    const result = await buildRepository(qb).findAll(baseQuery());

    expect(result).toEqual([[ticket], 1]);
  });
});
