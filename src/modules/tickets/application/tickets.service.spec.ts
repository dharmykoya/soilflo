import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { TicketsService } from './tickets.service';
import { TicketRepository } from '../domain/ticket.repository.interface';
import { Ticket } from '../domain/ticket.entity';
import { Truck } from '../../trucks/domain/truck.entity';
import { Site } from '../../sites/domain/site.entity';
import { Material } from '../domain/material.enum';
import { TicketStatus } from '../domain/ticket-status.enum';
import { BulkCreateTicketsDto } from './dto/bulk-create-tickets.dto';
import { CreateTicketItemDto } from './dto/create-ticket-item.dto';
import { GetTicketsQueryDto } from './get-tickets-query.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pastDate = (offsetMs = -60_000) =>
  new Date(Date.now() + offsetMs).toISOString();

const makeTruck = (id: number, siteId: number): Truck => {
  const t = new Truck();
  t.id = id;
  t.siteId = siteId;
  t.license = `LIC${id}`;
  return t;
};

const makeSite = (id: number, name: string): Site => {
  const s = new Site();
  s.id = id;
  s.name = name;
  return s;
};

const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => {
  const t = new Ticket();
  t.id = 'uuid-1';
  t.siteId = 10;
  t.truckId = 1;
  t.ticketNumber = 1;
  t.material = Material.Soil;
  t.status = TicketStatus.Active;
  t.dispatchedAt = new Date(pastDate());
  t.site = makeSite(10, 'Test Site');
  t.truck = makeTruck(1, 10);
  return Object.assign(t, overrides);
};

const makeItem = (
  truckId: number,
  dispatchedAt = pastDate(),
  material = Material.Soil,
): CreateTicketItemDto => ({ truckId, dispatchedAt, material });

// ---------------------------------------------------------------------------
// Shared mock builder
// ---------------------------------------------------------------------------

const buildMockManager = (overrides: Partial<EntityManager> = {}): EntityManager => {
  const qb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const ticketRepo = {
    create: jest.fn().mockImplementation((data: Partial<Ticket>) => ({ ...data } as Ticket)),
    save: jest.fn().mockImplementation((entities: Ticket[]) => Promise.resolve(entities)),
    find: jest.fn().mockImplementation((entities: Ticket[]) => Promise.resolve(entities)),
  };

  return {
    query: jest.fn().mockResolvedValue([{ first_ticket_number: 1 }]),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    getRepository: jest.fn().mockReturnValue(ticketRepo),
    ...overrides,
  } as unknown as EntityManager;
};

// ---------------------------------------------------------------------------
// findAll
// ---------------------------------------------------------------------------

describe('TicketsService — findAll', () => {
  let service: TicketsService;
  let ticketRepository: { findAll: jest.Mock };

  beforeEach(async () => {
    ticketRepository = { findAll: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: TicketRepository, useValue: ticketRepository },
        { provide: DataSource, useValue: { getRepository: jest.fn(), transaction: jest.fn() } },
      ],
    }).compile();

    service = module.get(TicketsService);
  });

  it('returns a paginated result wrapping the repository response', async () => {
    const ticket = makeTicket();
    ticketRepository.findAll.mockResolvedValue([[ticket], 1]);

    const query: GetTicketsQueryDto = { page: 1, limit: 10 };
    const result = await service.findAll(query);

    expect(result.data).toEqual([ticket]);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(10);
  });

  it('returns empty data when there are no tickets', async () => {
    ticketRepository.findAll.mockResolvedValue([[], 0]);

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });

  it('forwards filter params to the repository', async () => {
    ticketRepository.findAll.mockResolvedValue([[], 0]);

    const query: GetTicketsQueryDto = {
      page: 2,
      limit: 5,
      siteId: 10,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };
    await service.findAll(query);

    expect(ticketRepository.findAll).toHaveBeenCalledWith(query);
  });

  it('calculates totalPages correctly for a partial last page', async () => {
    ticketRepository.findAll.mockResolvedValue([Array(5).fill(makeTicket()), 12]);

    const result = await service.findAll({ page: 3, limit: 5 });

    expect(result.meta.totalPages).toBe(3); // ceil(12/5) = 3
  });
});

// ---------------------------------------------------------------------------
// bulkCreate
// ---------------------------------------------------------------------------

describe('TicketsService — bulkCreate', () => {
  let service: TicketsService;
  let dataSource: jest.Mocked<DataSource>;

  const trucks = [makeTruck(1, 10)];

  beforeEach(async () => {
    const truckRepo = { findBy: jest.fn().mockResolvedValue(trucks) };

    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue(truckRepo),
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: TicketRepository, useValue: { findAll: jest.fn() } },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get(TicketsService);
    dataSource = module.get(DataSource);
  });

  // ── Duplicates ────────────────────────────────────────────────────────────

  it('rejects intra-batch duplicate (same truckId + dispatchedAt)', async () => {
    const time = pastDate();
    const dto: BulkCreateTicketsDto = {
      tickets: [makeItem(1, time), makeItem(1, time)],
    };

    await expect(service.bulkCreate(dto)).rejects.toThrow(BadRequestException);
    await expect(service.bulkCreate(dto)).rejects.toThrow(/duplicate/i);
  });

  it('allows the same truckId with different dispatch times', async () => {
    const mockManager = buildMockManager();
    (dataSource.transaction as jest.Mock).mockImplementation(
      (cb: (m: EntityManager) => Promise<unknown>) => cb(mockManager),
    );

    const dto: BulkCreateTicketsDto = {
      tickets: [makeItem(1, pastDate(-120_000)), makeItem(1, pastDate(-60_000))],
    };

    await expect(service.bulkCreate(dto)).resolves.not.toThrow();
  });

  // ── Truck resolution ──────────────────────────────────────────────────────

  it('throws NotFoundException when a truckId does not exist', async () => {
    (dataSource.getRepository as jest.Mock).mockReturnValue({
      findBy: jest.fn().mockResolvedValue([]),
    });

    const dto: BulkCreateTicketsDto = { tickets: [makeItem(999)] };

    await expect(service.bulkCreate(dto)).rejects.toThrow(NotFoundException);
    await expect(service.bulkCreate(dto)).rejects.toThrow(/not found/i);
  });

  it('includes missing IDs in the NotFoundException message', async () => {
    (dataSource.getRepository as jest.Mock).mockReturnValue({
      findBy: jest.fn().mockResolvedValue([makeTruck(1, 10)]),
    });

    const dto: BulkCreateTicketsDto = {
      tickets: [makeItem(1), makeItem(2)],
    };

    await expect(service.bulkCreate(dto)).rejects.toThrow(/2/);
  });

  // ── Site validation ───────────────────────────────────────────────────────

  it('rejects when trucks belong to different sites', async () => {
    (dataSource.getRepository as jest.Mock).mockReturnValue({
      findBy: jest.fn().mockResolvedValue([makeTruck(1, 10), makeTruck(2, 20)]),
    });

    const dto: BulkCreateTicketsDto = {
      tickets: [makeItem(1), makeItem(2)],
    };

    await expect(service.bulkCreate(dto)).rejects.toThrow(BadRequestException);
    await expect(service.bulkCreate(dto)).rejects.toThrow(/same site/i);
  });

  // ── DB conflict ───────────────────────────────────────────────────────────

  it('throws ConflictException when DB already has the same truck+dispatchedAt', async () => {
    const existingTicket = new Ticket();
    existingTicket.truckId = 1;
    existingTicket.dispatchedAt = new Date(pastDate());

    const conflictQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([existingTicket]),
    };

    const mockManager = buildMockManager({
      createQueryBuilder: jest.fn().mockReturnValue(conflictQb),
    });

    (dataSource.transaction as jest.Mock).mockImplementation(
      (cb: (m: EntityManager) => Promise<unknown>) => cb(mockManager),
    );

    const dto: BulkCreateTicketsDto = {
      tickets: [makeItem(1, existingTicket.dispatchedAt.toISOString())],
    };

    await expect(service.bulkCreate(dto)).rejects.toThrow(ConflictException);
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('creates tickets with sequential ticket numbers starting from claimed range', async () => {
    const mockManager = buildMockManager({
      query: jest.fn().mockResolvedValue([{ first_ticket_number: 5 }]),
    });

    (dataSource.transaction as jest.Mock).mockImplementation(
      (cb: (m: EntityManager) => Promise<unknown>) => cb(mockManager),
    );

    const dto: BulkCreateTicketsDto = {
      tickets: [makeItem(1, pastDate(-120_000)), makeItem(1, pastDate(-60_000))],
    };

    const result = await service.bulkCreate(dto);

    const created = (mockManager.getRepository as jest.Mock).mock.results
      .map((r: jest.MockResult<{ create: jest.Mock }>) => r.value.create.mock.calls)
      .flat();

    expect(created[0][0]).toMatchObject({ ticketNumber: 5, siteId: 10, truckId: 1, status: TicketStatus.Active });
    expect(created[1][0]).toMatchObject({ ticketNumber: 6 });
    expect(result).toBeDefined();
  });

  it('sets correct material and status on every ticket', async () => {
    const mockManager = buildMockManager();
    (dataSource.transaction as jest.Mock).mockImplementation(
      (cb: (m: EntityManager) => Promise<unknown>) => cb(mockManager),
    );

    const dto: BulkCreateTicketsDto = {
      tickets: [makeItem(1, pastDate(), Material.Soil)],
    };

    await service.bulkCreate(dto);

    const createCall = (mockManager.getRepository as jest.Mock).mock.results[0].value.create.mock.calls[0][0];
    expect(createCall.material).toBe(Material.Soil);
    expect(createCall.status).toBe(TicketStatus.Active);
  });

  it('reloads saved tickets with relations after insert', async () => {
    const mockManager = buildMockManager();
    (dataSource.transaction as jest.Mock).mockImplementation(
      (cb: (m: EntityManager) => Promise<unknown>) => cb(mockManager),
    );

    const dto: BulkCreateTicketsDto = { tickets: [makeItem(1)] };
    await service.bulkCreate(dto);

    const repoInstance = (mockManager.getRepository as jest.Mock).mock.results[0].value;
    expect(repoInstance.find).toHaveBeenCalledWith(
      expect.objectContaining({ relations: ['site', 'truck'] }),
    );
  });

  // ── Advisory lock ─────────────────────────────────────────────────────────

  it('acquires per-site advisory lock before inserting', async () => {
    const mockManager = buildMockManager();
    (dataSource.transaction as jest.Mock).mockImplementation(
      (cb: (m: EntityManager) => Promise<unknown>) => cb(mockManager),
    );

    const dto: BulkCreateTicketsDto = { tickets: [makeItem(1)] };
    await service.bulkCreate(dto);

    expect(mockManager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock($1)',
      [10],
    );
  });

  it('uses the site ID from the truck to scope the advisory lock', async () => {
    const site20Truck = [makeTruck(3, 20)];
    (dataSource.getRepository as jest.Mock).mockReturnValue({
      findBy: jest.fn().mockResolvedValue(site20Truck),
    });

    const mockManager = buildMockManager();
    (dataSource.transaction as jest.Mock).mockImplementation(
      (cb: (m: EntityManager) => Promise<unknown>) => cb(mockManager),
    );

    const dto: BulkCreateTicketsDto = { tickets: [makeItem(3)] };
    await service.bulkCreate(dto);

    expect(mockManager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock($1)',
      [20],
    );
  });
});

