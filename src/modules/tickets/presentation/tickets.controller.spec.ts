import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { TicketsController } from './tickets.controller';
import { TicketsService } from '../application/tickets.service';
import { TicketsQueueService } from '../application/tickets.queue.service';
import { PaginatedResultDto } from '../../../shared/pagination/paginated-result.dto';
import { Ticket } from '../domain/ticket.entity';
import { Site } from '../../sites/domain/site.entity';
import { Truck } from '../../trucks/domain/truck.entity';
import { Material } from '../domain/material.enum';
import { TicketStatus } from '../domain/ticket-status.enum';
import { GetTicketsQueryDto } from '../application/get-tickets-query.dto';
import { BulkCreateTicketsDto } from '../application/dto/bulk-create-tickets.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeTicket = (): Ticket => {
  const site = new Site();
  site.id = 10;
  site.name = 'Main Site';

  const truck = new Truck();
  truck.id = 1;
  truck.license = 'ABC-001';

  const t = new Ticket();
  t.id = 'uuid-1';
  t.siteId = 10;
  t.truckId = 1;
  t.ticketNumber = 1;
  t.material = Material.Soil;
  t.status = TicketStatus.Active;
  t.dispatchedAt = new Date('2026-01-10T08:00:00Z');
  t.site = site;
  t.truck = truck;
  return t;
};

const makeDto = (): BulkCreateTicketsDto => ({
  tickets: [{ truckId: 1, dispatchedAt: '2026-01-10T08:00:00Z', material: Material.Soil }],
});

const mockRes = () =>
  ({ status: jest.fn().mockReturnThis() }) as unknown as jest.Mocked<Response>;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TicketsController', () => {
  let controller: TicketsController;
  let ticketsService: jest.Mocked<Pick<TicketsService, 'bulkCreate' | 'findAll'>>;
  let queueService: jest.Mocked<Pick<TicketsQueueService, 'isEnabled' | 'enqueue' | 'getStatus'>>;

  beforeEach(async () => {
    ticketsService = { bulkCreate: jest.fn(), findAll: jest.fn() };
    queueService = { isEnabled: jest.fn(), enqueue: jest.fn(), getStatus: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        { provide: TicketsService, useValue: ticketsService },
        { provide: TicketsQueueService, useValue: queueService },
      ],
    }).compile();

    controller = module.get(TicketsController);
  });

  // -------------------------------------------------------------------------
  // POST / — sync path
  // -------------------------------------------------------------------------

  describe('bulkCreate — sync path (queue disabled)', () => {
    beforeEach(() => queueService.isEnabled.mockReturnValue(false));

    it('calls TicketsService.bulkCreate and sets 201', async () => {
      const ticket = makeTicket();
      ticketsService.bulkCreate.mockResolvedValue([ticket]);
      const res = mockRes();

      await controller.bulkCreate(makeDto(), res);

      expect(ticketsService.bulkCreate).toHaveBeenCalledWith(makeDto());
      expect(res.status).toHaveBeenCalledWith(HttpStatus.CREATED);
    });

    it('returns mapped TicketResponseDtos', async () => {
      const ticket = makeTicket();
      ticketsService.bulkCreate.mockResolvedValue([ticket]);

      const result = await controller.bulkCreate(makeDto(), mockRes());

      expect(Array.isArray(result)).toBe(true);
      const dtos = result as Array<{ siteName: string; truckLicense: string }>;
      expect(dtos[0].siteName).toBe('Main Site');
      expect(dtos[0].truckLicense).toBe('ABC-001');
    });
  });

  // -------------------------------------------------------------------------
  // POST / — queue path
  // -------------------------------------------------------------------------

  describe('bulkCreate — queue path (queue enabled)', () => {
    beforeEach(() => queueService.isEnabled.mockReturnValue(true));

    it('calls TicketsQueueService.enqueue and returns jobId', async () => {
      queueService.enqueue.mockResolvedValue({ jobId: '42' });
      const res = mockRes();

      const result = await controller.bulkCreate(makeDto(), res);

      expect(queueService.enqueue).toHaveBeenCalledWith(makeDto());
      expect(result).toEqual({ jobId: '42' });
    });

    it('does not call TicketsService.bulkCreate when queue is enabled', async () => {
      queueService.enqueue.mockResolvedValue({ jobId: '1' });

      await controller.bulkCreate(makeDto(), mockRes());

      expect(ticketsService.bulkCreate).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // GET /jobs/:jobId
  // -------------------------------------------------------------------------

  describe('getJobStatus', () => {
    it('delegates to TicketsQueueService.getStatus', async () => {
      const status = { jobId: '7', status: 'completed', result: [] };
      queueService.getStatus.mockResolvedValue(status);

      const result = await controller.getJobStatus('7');

      expect(queueService.getStatus).toHaveBeenCalledWith('7');
      expect(result).toBe(status);
    });
  });

  // -------------------------------------------------------------------------
  // GET /
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    it('returns paginated TicketResponseDtos', async () => {
      const ticket = makeTicket();
      ticketsService.findAll.mockResolvedValue(new PaginatedResultDto([ticket], 1, 1, 10));

      const query: GetTicketsQueryDto = { page: 1, limit: 10 };
      const result = await controller.findAll(query);

      expect(ticketsService.findAll).toHaveBeenCalledWith(query);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].siteName).toBe('Main Site');
      expect(result.data[0].truckLicense).toBe('ABC-001');
      expect(result.meta.total).toBe(1);
    });
  });
});
