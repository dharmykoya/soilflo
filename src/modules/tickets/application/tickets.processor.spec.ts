import { Test, TestingModule } from '@nestjs/testing';
import { TicketsProcessor } from './tickets.processor';

jest.mock('../../../shared/utils/error-log', () => ({ appendErrorLog: jest.fn() }));
import { appendErrorLog } from '../../../shared/utils/error-log';
import { TicketsService } from './tickets.service';
import { BulkCreateTicketsDto } from './dto/bulk-create-tickets.dto';
import { Ticket } from '../domain/ticket.entity';
import { Material } from '../domain/material.enum';
import { TicketStatus } from '../domain/ticket-status.enum';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeDto = (): BulkCreateTicketsDto => ({
  tickets: [{ truckId: 1, dispatchedAt: '2026-01-10T08:00:00Z', material: Material.Soil }],
});

// Minimal Job shape expected by the processor
const makeJob = (name: string, data: BulkCreateTicketsDto) =>
  ({ id: '1', name, data }) as Parameters<TicketsProcessor['process']>[0];

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TicketsProcessor', () => {
  let processor: TicketsProcessor;
  let ticketsService: jest.Mocked<Pick<TicketsService, 'bulkCreate'>>;

  beforeEach(async () => {
    ticketsService = { bulkCreate: jest.fn() };

    // Compile WITHOUT calling module.init() so WorkerHost.onModuleInit
    // (which would attempt a Redis connection) is never triggered.
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsProcessor,
        { provide: TicketsService, useValue: ticketsService },
      ],
    }).compile();

    processor = module.get(TicketsProcessor);
  });

  it('processes a bulk-create job and returns the created tickets', async () => {
    const ticket = Object.assign(new Ticket(), {
      id: 'uuid-1',
      ticketNumber: 1,
      material: Material.Soil,
      status: TicketStatus.Active,
    });
    ticketsService.bulkCreate.mockResolvedValue([ticket]);

    const result = await processor.process(makeJob('bulk-create', makeDto()));

    expect(ticketsService.bulkCreate).toHaveBeenCalledWith(makeDto());
    expect(result).toEqual([ticket]);
  });

  it('throws an error for unknown job names', async () => {
    await expect(processor.process(makeJob('unknown-job', makeDto()))).rejects.toThrow(
      'Unknown job: unknown-job',
    );
    expect(ticketsService.bulkCreate).not.toHaveBeenCalled();
  });

  it('rethrows errors from TicketsService', async () => {
    ticketsService.bulkCreate.mockRejectedValue(new Error('Conflict'));

    await expect(processor.process(makeJob('bulk-create', makeDto()))).rejects.toThrow('Conflict');
  });

  it('still rethrows the original error when the log write itself fails (best-effort logging)', async () => {
    ticketsService.bulkCreate.mockRejectedValue(new Error('DB timeout'));
    (appendErrorLog as jest.Mock).mockImplementationOnce(() => { throw new Error('disk full'); });

    await expect(processor.process(makeJob('bulk-create', makeDto()))).rejects.toThrow('DB timeout');
  });
});
