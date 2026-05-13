import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { TicketsQueueService } from './tickets.queue.service';
import { TICKET_QUEUE_NAME } from './tickets.queue.constants';
import { BulkCreateTicketsDto } from './dto/bulk-create-tickets.dto';
import { Material } from '../domain/material.enum';

const makeDto = (): BulkCreateTicketsDto => ({
  tickets: [{ truckId: 1, dispatchedAt: '2026-01-10T08:00:00Z', material: Material.Soil }],
});

const buildService = async (queue: unknown): Promise<TicketsQueueService> => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      TicketsQueueService,
      { provide: getQueueToken(TICKET_QUEUE_NAME), useValue: queue },
    ],
  }).compile();
  return module.get(TicketsQueueService);
};

describe('TicketsQueueService', () => {
  describe('isEnabled()', () => {
    it('returns false when queue is null (QUEUE_ENABLED=false)', async () => {
      const service = await buildService(null);
      expect(service.isEnabled()).toBe(false);
    });

    it('returns false when queue is undefined (token not registered)', async () => {
      const service = await buildService(undefined);
      expect(service.isEnabled()).toBe(false);
    });

    it('returns true when a queue instance is injected', async () => {
      const service = await buildService({ add: jest.fn() });
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('enqueue()', () => {
    it('throws ServiceUnavailableException when queue is disabled', async () => {
      const service = await buildService(null);
      await expect(service.enqueue(makeDto())).rejects.toThrow(ServiceUnavailableException);
    });

    it('adds a job and returns the jobId as a string', async () => {
      const mockQueue = { add: jest.fn().mockResolvedValue({ id: 99 }) };
      const service = await buildService(mockQueue);

      const result = await service.enqueue(makeDto());

      expect(mockQueue.add).toHaveBeenCalled();
      expect(result).toEqual({ jobId: '99' });
    });
  });

  describe('getStatus()', () => {
    it('throws ServiceUnavailableException when queue is disabled', async () => {
      const service = await buildService(null);
      await expect(service.getStatus('1')).rejects.toThrow(ServiceUnavailableException);
    });

    it('throws NotFoundException when job does not exist', async () => {
      const mockQueue = { getJob: jest.fn().mockResolvedValue(null) };
      const service = await buildService(mockQueue);

      await expect(service.getStatus('999')).rejects.toThrow(NotFoundException);
    });

    it('returns completed status with result', async () => {
      const mockJob = {
        getState: jest.fn().mockResolvedValue('completed'),
        returnvalue: [{ id: 'ticket-1' }],
        failedReason: undefined,
      };
      const service = await buildService({ getJob: jest.fn().mockResolvedValue(mockJob) });

      const result = await service.getStatus('1');

      expect(result).toEqual({
        jobId: '1',
        status: 'completed',
        result: [{ id: 'ticket-1' }],
        failedReason: undefined,
      });
    });

    it('returns failed status with failedReason', async () => {
      const mockJob = {
        getState: jest.fn().mockResolvedValue('failed'),
        returnvalue: undefined,
        failedReason: 'Ticket already exists',
      };
      const service = await buildService({ getJob: jest.fn().mockResolvedValue(mockJob) });

      const result = await service.getStatus('2');

      expect(result.status).toBe('failed');
      expect(result.failedReason).toBe('Ticket already exists');
      expect(result.result).toBeUndefined();
    });

    it('returns waiting status without result or failedReason', async () => {
      const mockJob = {
        getState: jest.fn().mockResolvedValue('waiting'),
        returnvalue: undefined,
        failedReason: undefined,
      };
      const service = await buildService({ getJob: jest.fn().mockResolvedValue(mockJob) });

      const result = await service.getStatus('3');

      expect(result.status).toBe('waiting');
      expect(result.result).toBeUndefined();
      expect(result.failedReason).toBeUndefined();
    });
  });
});
