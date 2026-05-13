import { Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BulkCreateTicketsDto } from './dto/bulk-create-tickets.dto';
import { BULK_CREATE_JOB, TICKET_QUEUE_NAME } from './tickets.queue.constants';
import { CreateJobResponseDto, JobStatusResponseDto } from '../presentation/dto/job-response.dto';

/**
 * Thin wrapper around the BullMQ `tickets` queue.
 *
 * Exposes two operations:
 * - `enqueue`   — adds a bulk-create job and returns its ID (202 Accepted flow)
 * - `getStatus` — fetches live job state and result from the queue store
 *
 * When `QUEUE_ENABLED=false` the BullMQ queue is not registered, so the injected
 * `queue` will be `null` (via `@Optional()`). Both methods throw
 * `ServiceUnavailableException` in that case, surfacing a clean 503 to the client.
 */
@Injectable()
export class TicketsQueueService {
  constructor(
    // @Optional() prevents a DI error when the queue is not registered
    // (i.e. when QUEUE_ENABLED=false and BullModule.registerQueue was skipped).
    @Optional()
    @InjectQueue(TICKET_QUEUE_NAME)
    private readonly queue: Queue | null,
  ) {}

  /** Returns true when the BullMQ queue was successfully registered (QUEUE_ENABLED=true). */
  isEnabled(): boolean {
    return !!this.queue;
  }

  async enqueue(dto: BulkCreateTicketsDto): Promise<CreateJobResponseDto> {
    this.assertEnabled();
    const job = await this.queue!.add(BULK_CREATE_JOB, dto);
    return { jobId: String(job.id) };
  }

  async getStatus(jobId: string): Promise<JobStatusResponseDto> {
    this.assertEnabled();
    const job = await this.queue!.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const state = await job.getState();

    return {
      jobId,
      status: state,
      result: state === 'completed' ? job.returnvalue : undefined,
      failedReason: state === 'failed' ? job.failedReason : undefined,
    };
  }

  private assertEnabled(): void {
    if (!this.queue) {
      throw new ServiceUnavailableException(
        'Queue is disabled. Set QUEUE_ENABLED=true and ensure Redis is reachable.',
      );
    }
  }
}
